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
