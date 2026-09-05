# Handoff: fight-replay follow-ups after PR #1512

Paste the prompt below into a fresh Claude Code session (Opus orchestrator) from the
`eso-toolkit` repo. Delete this file once the follow-up PR lands.

---

## Prompt

You are the orchestrator for a small, well-scoped cleanup on the ESO Toolkit fight replay.
Use Opus for your own reasoning and delegate the independent implementation work to subagents
(`Agent` tool, `general-purpose`, model `sonnet` unless a task says otherwise). Run every git
command from the repo root. Do NOT `cd` elsewhere.

### Context you can trust (already verified — do not re-derive)

PR #1512 (`t3code/audit-fight-replay-system`) was reviewed pre-merge by two independent
reviewers. Three defects were found and fixed on that branch:

1. `FightReplay`'s route-leave teardown listed `isMobileReplay` as an effect dependency. That
   hook is a LIVE media query that flips mid-session (phone rotation — `(pointer: coarse) and
   (max-height: 600px)`), so the teardown ran while the user was still in the replay. Fixed by
   extracting `src/features/fight_replay/hooks/useReplayTeardown.ts`, which reads the flag
   through a ref and depends on `[dispatch]` only. **This is a load-bearing invariant: never
   put `useIsMobileReplay()` in a cleanup effect's dep array.**
2. `WorkerPool`'s retry path ran the full settle-cleanup, detaching the abort listener, so a
   retried task could not be cancelled and held a pool slot to completion. Fixed by splitting
   `clearTaskTimeout` out of `cleanupTask`.
3. The 120MB mobile memory budget was dead code: `isCoarsePointerDevice()` used `matchMedia`
   but was only called INSIDE the worker, where `window` does not exist, so it returned `false`
   on every device. Replaced with `isMemoryConstrainedDevice()` (WorkerNavigator
   `deviceMemory`, UA fallback). **Anything deciding behaviour inside `src/workers/**` cannot
   use `window`/`document`/`matchMedia` — a `typeof window !== 'undefined'` guard makes such
   code safe but silently always-false.**

Both reviewers cleared these categories, so do NOT re-audit them: GPU texture disposal,
effect/listener cleanup, stale closures and dep-array churn, cache-key coverage for the
content-addressed worker tasks, the signed M0R coordinate change, and the five deleted
replay components (Actor3D, ActorNameBillboard, AnimationFrameActor3D, AnimationFrameContext,
SharedActor3DGeometries — confirmed to have dropped no behaviour).

### Your task: three known nits, plus one repo-hygiene item

Each was traced to a concrete line by a reviewer. None is a crash. Land them as ONE PR
branched from current `main` (confirm #1512 merged first; if it has not, branch from
`t3code/audit-fight-replay-system` instead and say so in the PR body).

**Nit 1 — map-texture cache is FIFO, not LRU, and disposes live textures.**
`src/features/fight_replay/components/DynamicMapTexture.tsx:40-54`. `cacheMapTexture` evicts by
insertion order; `get()` never refreshes recency, so the comment claiming it "won't dispose a
live floor" is wrong — `evicted?.dispose()` runs unconditionally. three.js re-uploads a disposed
texture that is still bound (verified in 0.185 `WebGLTextures.initTexture`), so the symptom is a
wasted re-upload plus one orphan GPU texture the cache can no longer dispose, not a blank floor.
Needs 9+ distinct maps in one mounted scene, so it is currently unreachable — fix it as
correctness, not as a perf win. Make it true LRU (re-insert on read) and skip disposing a texture
that is still referenced. Add a unit test.

**Nit 2 — per-frame array allocation in the render loop.**
`src/features/fight_replay/components/Arena3DScene.tsx:455`: `lastCamPosRef.current = [camPos.x,
camPos.y, camPos.z]` allocates a new array every rAF. Reuse a `THREE.Vector3` (or mutate a fixed
tuple). Behaviour must not change — the value is only compared against the next frame. No test
needed if no behaviour changes; verify by reading every consumer of `lastCamPosRef`.

**Nit 3 — zone restore bypasses the marker cap.**
`src/features/fight_replay/hooks/useMapMarkersManager.ts:512-528`: the restore path builds
`restored` straight from `readStored()` without passing it through `enforceCanonicalCaps`. A
legacy persisted blob over 500 markers restores intact and then surfaces a confusing "Import
trimmed to 500 markers" on the first unrelated edit. Route the restore through the same cap and
add a test covering an oversized stored blob.

**Hygiene — the local `main` ref is stale.** It sat 3 days behind `origin/main`, which inflates
`git diff main...HEAD` from 121 files to 160 and misleads reviewers. Run `git fetch origin` and
fast-forward local `main` before branching. Note: ~18 files in this repo can never show clean in
`git status` due to EOL normalization debt (`.github/**`, tsconfig, schema.graphql) — do NOT run
`git add --renormalize .` to "fix" it; that stages 312 files and is deliberately not done.

### How to run this

1. First, yourself: fetch, confirm #1512's state, fast-forward `main`, create
   `fix/replay-followup-nits`.
2. Then fan out the three nits to three subagents IN PARALLEL (one message, three `Agent` calls) —
   they touch disjoint files, so there is no conflict risk. Give each the exact file:line above
   and require it to read the full surrounding file before editing.
3. Collect their diffs, review each yourself, and reconcile. Do not merge a subagent's work you
   have not read.
4. Verify: `npx tsc --noEmit`, `npx eslint <changed files>`, `npx prettier --check <changed
   files>`, and `npx jest src/features/fight_replay src/workers`. The full suite takes ~17
   minutes — run it in the background, once, at the end.
5. Commit (Conventional Commits, no AI attribution of any kind) and open a PR. Then STOP and
   report. Do not merge — that is the user's call.

### Verification standard (this matters)

A test that passes both with and without the fix is worthless. For each nit, prove the test
catches the bug: temporarily reintroduce the defect, confirm the new test FAILS, restore the fix,
confirm it PASSES. Report that evidence explicitly. If a nit genuinely cannot carry a meaningful
test (nit 2 likely cannot), say so plainly rather than writing a mock-heavy test that asserts on
its own mocks.

Known flake, ignore it: `src/graphql/graphqlQueryManifest.test.ts` fails in a full parallel local
run and passes in isolation and in CI. It is unrelated to replay work.
