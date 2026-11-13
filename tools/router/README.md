# router

Agentic model router with a TUI, device-based auth, and runtime escalation.

Classifies each task by complexity, dispatches it to the right model tier,
and escalates to a deeper tier mid-run if the worker gets stuck. Prioritization
is driven entirely by `router.config.ts` so behavior can be tuned without
touching code.

## Quick start

```bash
cd tools/router
npm install

# First-time auth
npm run dev -- auth login --provider anthropic

# Check every tier is reachable
npm run dev -- auth doctor

# Interactive TUI
npm run dev

# One-shot prompt
npm run dev -- run "explain what WorkerPool does"
```

## Configuration

Copy `router.config.example.ts` to your repo root as `router.config.ts` and
edit. The schema is validated on load; bad config fails fast with a precise
error message pointing at the offending field.

Key sections:

- **`providers`** — where models are hosted (Anthropic API, OAuth device flow, …)
- **`tiers`** — named tiers mapping to a `(provider, model)` pair
- **`heuristics`** — fast, deterministic rules that can skip LLM triage
- **`triage`** — LLM triage fallback (cheap model, editable rubric)
- **`escalation`** — mid-run tier bumps on self-doubt, loops, or validation failures
- **`budgets`** — hard caps on tool calls, tokens, and USD per task/session

## Architecture

```
CLI (commander)
  ↓
TUI (Ink)                 auth commands (auth login/status/doctor)
  ↓                                 ↓
Dispatcher  ←  Triage  ←  Config loader (cosmiconfig + Zod)
  ↓              ↓
Providers ←  Credential store (@napi-rs/keyring)
```

All cross-module contracts live in `src/types.ts`. Every dispatch goes
through the **`TaskEnvelope`** — a serialized handoff contract that survives
across model boundaries when escalation mints a fresh worker at a higher tier.

## Auth

Credentials live in the **native system keychain** via `@napi-rs/keyring`
(Rust-based N-API bindings to macOS Keychain, Windows Credential Manager,
and Linux Secret Service). Router never writes plaintext secrets to disk.
A small plaintext index file at `~/.config/eso-router/accounts.json` tracks
which providers have credentials stored (no secrets, just provider ids).

Each provider declares an **auth strategy**:

- `api-key` — paste an API key, validated against the provider before storing
- `oauth-device` — RFC 8628 device authorization grant (user code + polling)

The TUI renders the same event stream for both strategies, so adding a new
auth type is just implementing the `Provider.login()` async iterator.

## Escalation

Mid-run, workers can request escalation by emitting a self-doubt signal.
The dispatcher also auto-escalates on:

- repeated validation failures (test/validate tool returning `ok: false`)
- tool loops (same tool + same args called N times in a row)
- budget exceeded (token/USD/tool-call caps)

On trigger, the current worker is cancelled, a new envelope is minted at the
next tier up with the prior attempt's digest attached, and a fresh worker is
dispatched. The old session is NOT resumed on a new model — cold-start with a
digest is the only safe handoff.

## Consultation and delegation (cheap-shell pattern)

In addition to escalation (bottom-up handoff), the router supports two
top-down decomposition primitives that let cheaper models stay in the driver's
seat while borrowing expensive reasoning surgically:

- **`consult_expert(question, tier?)`** — A tool the worker can call to ask a
  one-shot question of a higher-tier model. The expert runs as a child
  envelope with NO tools and NO further escalation — pure reasoning. The
  digest comes back as a tool result and the cheap shell stays in control.
  Use for: architectural decisions, naming, "is this safe?" questions.

- **`delegate_subtask(prompt, tier?)`** — A tool that spawns a fully
  autonomous sub-worker (typically at a lower tier) to handle a focused
  sub-task. The sub-worker has its own tool loop and runs to completion.
  Use for: planner→executor patterns where an expensive planner parcels out
  mechanical work.

Both patterns roll their cost into the parent task's budget. Consultation is
capped per task by `maxConsultationsPerTask` (default 5) to keep over-eager
shells from running away with cost.

The system prompt instructs cheap-shell workers: *consult before any
architectural, naming, or refactoring decision you're not confident about*.
The contract distinction:

| Verb | Direction | Loses control? | Has tools? | Use case |
|---|---|---|---|---|
| escalation | up | yes | yes | "I'm out of my depth, take over" |
| consultation | up | no | no | "Hold on, I need a second opinion" |
| delegation | down | no (parent waits) | yes | "You handle this, report back" |

## Cost analysis

```bash
router cost                      # last 30 days, table output
router cost --since 2026-04-01   # filter by date
router cost --top 20             # top N most expensive envelopes
router cost --json               # machine-readable
```

`router cost` reads `.router/logs/*.jsonl` and produces:

- **Realized spend** broken down by tier, provider, and day
- **Counterfactual baselines** — what your tasks would have cost at every
  configured tier (e.g. "always-deep would have cost $X, you saved $Y")
- **Top N most expensive envelopes** for rubric-tuning targets
- **Consultation overhead** — fraction of total cost spent on `consult_expert`
  vs main worker turns

The counterfactual is the headline. It tells you what the router actually
saved — without it you can't tell whether the routing rules are pulling
their weight.

## Adding a provider

1. Create `src/providers/my-provider.ts`.
2. Implement the `Provider` interface from `src/types.ts`.
3. Call `registerProvider("my-kind", (opts) => new MyProvider(opts))` at module scope.
4. Add the import to `src/providers/index.ts`.
5. Reference it in `router.config.ts` via `providers: { myprov: { kind: "my-kind" } }`.

## Environment variables

- `ROUTER_NO_KEYRING=1` — use in-memory credential store (tests, CI)
- `ROUTER_DEBUG=1` — print full stack traces on errors
- `ROUTER_NO_PROMPT=1` — fail fast on interactive prompts (CI mode)

## Exit codes

| Code | Meaning |
|------|---------|
| 0    | success |
| 1    | generic error |
| 2    | config error |
| 3    | router runtime error (see `code` field) |
