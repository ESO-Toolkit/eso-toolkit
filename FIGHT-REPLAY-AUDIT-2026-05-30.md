# Fight Replay System Audit — May 2026

**Date:** 2026-05-30
**Scope:** `src/features/fight_replay/` (the 3D fight replay in the report insights/logs area)
**Branch:** `feat/fight-replay-audit-improvements`
**Method:** Multi-dimension read-only audit (7 dimensions) + version-pinned research + adversarial
verification (each finding re-checked against the source by a skeptic) → 54 raw → **46 confirmed,
8 rejected** as false positives.

## Verification constraint (read first)

The 3D arena **cannot render real actor data on localhost**: actor positions are derived from
worker-processed log events, and the worker CORS-blocks `localhost`. The existing replay E2E
specs (`tests/replay.spec.ts`, `replay-smoke.spec.ts`) are **defensive-only by design** for the
same reason. Consequently this PR ships only changes that are verifiable **without** a live 3D
render — via `tsc`, `eslint`, Jest (jsdom) unit/component tests, the defensive Playwright specs,
and DOM-level inspection. Everything whose correctness depends on the visual 3D result is
**deferred for visual QA on prod (esotk.com)**, where the arena renders with real data. This is a
deliberate scoping decision, not a coverage gap.

Overall the system is well-engineered: strong `useFrame` priority discipline, shared geometries
with disposal, a thorough `ReplayErrorBoundary` (WebGL detection + fallback UI), and ~1600 LOC of
existing tests. The findings below are targeted, not a rewrite.

---

## Shipped in this PR (verifiable locally)

| Area        | Change                                                                                                                                                 | Verified by                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests       | Unit tests for `mapScaling`, `playerColors`, `pathUtils`, `mapMarkerConverters` (round-trips)                                                          | Jest (62 new tests)                                                                                                                                                                                                                    |
| Correctness | Clamp URL `?time=` to `[0, duration]` (rejects negative / beyond-duration / NaN / ±Infinity)                                                           | `replayTime.test.ts`; Playwright deep-link specs                                                                                                                                                                                       |
| a11y        | `:focus-visible` outlines on TimelineSlider thumb + TimelineMarkers                                                                                    | Jest render + lint                                                                                                                                                                                                                     |
| a11y        | Share snackbar: `role=status` / `aria-live=polite`, 5s duration (kept bottom-anchored)                                                                 | `ShareButton.test.tsx`                                                                                                                                                                                                                 |
| a11y        | `MapMarkersModal` Dialog associated to its title via `aria-labelledby`/`id` (WCAG 1.3.1)                                                               | Jest render                                                                                                                                                                                                                            |
| a11y        | 44×44 touch targets for playback buttons on coarse-pointer devices (scoped, no global theme change)                                                    | `PlaybackButtons.test.tsx` + lint                                                                                                                                                                                                      |
| UX          | Document `P` / `T` keyboard shortcuts in the help overlay                                                                                              | DOM                                                                                                                                                                                                                                    |
| Quality     | Remove misleading "DISABLED" HUD comment; accurate note instead                                                                                        | review                                                                                                                                                                                                                                 |
| Quality     | Dedupe 4× identical default camera-position fallback into one pure helper (byte-identical math)                                                        | replay suite (148 tests)                                                                                                                                                                                                               |
| Robustness  | Procedural grid fallback floor texture on CDN map-texture load failure (missing zone / mapFile mismatch / 404), replacing the blank `map = null` plane | `DynamicMapTexture.test.ts` (5 tests: non-null CanvasTexture, 512², null-context guard, per-instance). Floor non-regression verified live on Dreadsail Reef (its CDN texture loads, so the fallback path isn't live-triggerable there) |

Net test delta: **+73 tests** in the replay area (81 → 154), all green. Full `tsc` clean, full
`eslint --max-warnings 0` clean, and all 18 defensive Playwright replay specs pass.

## Live-verified follow-up (report F4f2bMwWtgVKxjB9 fight 2 — Dreadsail Reef)

A user-supplied report turned out to render the 3D arena locally (its event data wasn't
CORS-blocked), which unblocked items previously deferred for prod-only QA. Verified directly with
Chrome MCP + `gl.info.render.frame`:

| Area    | Change                                                                                                                                                                                                                                                                                     | Verified by                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Bug     | **Unique React keys** for coincident death markers (`death-<ts>-<targetID>` collided) — was a runtime-only bug the static audit missed                                                                                                                                                     | Live: `death-990503-54` console error eliminated                                                                          |
| Quality | Non-deprecated `PCFShadowMap` (`shadows="percentage"`)                                                                                                                                                                                                                                     | Live: deprecation warning gone                                                                                            |
| UX/a11y | Replace blocking share `alert()` with a snackbar; treat share-sheet cancel (AbortError) as a silent no-op                                                                                                                                                                                  | `ShareButton.test.tsx` (cancel + failure paths)                                                                           |
| a11y    | `prefers-reduced-motion` snaps the follow camera instead of lerping; new `usePrefersReducedMotion` hook                                                                                                                                                                                    | `usePrefersReducedMotion.test.ts`; live                                                                                   |
| Quality | Replace `setInterval(checkRefChanges, 100)` ref-polling in `Arena3D` with a state/callback. `followingActorId` now lives in `FightReplay3D` as the single source of truth (`setFollowingActor` writes ref + state in lockstep); the "Following:" chip re-renders on change without polling | Live: clicked an actor → "Following: @Brassmoose" chip appeared instantly; unlock cleared it. 183 replay jest tests green |

### `frameloop=demand` — TRIED AND REVERTED

`frameloop={isPlaying ? 'always' : 'demand'}` correctly dropped paused renders ~73→0/sec, but it
**regressed playback from ~40fps to ~24fps** (measured via `gl.info.render.frame`): the reactive
`frameloop` switch fights the manual priority-999 render loop and drops frames while playing.
Playback smoothness outweighs the paused-GPU savings, so it was reverted. A correct version needs a
non-reactive approach that coexists with the manual render loop (e.g. drive renders via a single
owned loop rather than toggling R3F's mode) — left as future work. The paused-render waste is real
(~73/sec doing nothing) but is **not** worth a playback regression.

**Update — correct approach built, PARTIALLY VERIFIED, still PARKED (verification PR #1160).** The
non-reactive version described above was implemented on `wip/fight-replay-ondemand-render` (NOT
merged): the existing priority-999 `RenderLoop` keeps `frameloop='always'` but gates its `gl.render`
behind a render-budget _ref_ (never state) refilled by playback/scrub (`timeRef` advancing), camera
motion (OrbitControls `'change'`), actor-follow (`followingActorIdRef != null`), and any React commit
of the scene (markers/trails/visibility/HUD, via a deps-less effect in `Arena3DScene`).

Live-measured on the Dreadsail Reef fight (single-file overlay onto the running dev server, draw-call
counting on the canvas WebGL2 context — `gl.info` is unreachable through the React fiber tree):

- ✅ **The win**: paused + static drawCalls **~9000/sec → 0/sec**.
- ✅ Playing renders **every frame** (drawCalls present every tick on both `feat` and the D branch);
  the prior fps regression does not recur (by construction — time changes every frame while playing).
- ✅ Repaint edges all fire then settle back to 0: toggle trails (T) / player list (P) (React commit),
  camera drag (OrbitControls `'change'`, settles since damping is off), actor-follow lerp
  (continuous while following; clears on unlock).

**Why still PARKED — the main path is UNVERIFIED, not passing.** The risk is _paint-correctness_, and
the one fight that renders locally (Dreadsail) made **zero `assets.rpglogs.com` requests** all session —
its `mapTimeline` is empty, so `DynamicMapTexture`'s `useFrame` early-returns and the floor comes from
the Suspense/grid fallback (which paints inside the initial budget). So the **CDN-map-texture path was
never exercised** — and that is the _designed-normal_ path for most fights. The hazard: a CDN texture
resolves from a network promise _after_ the ~4-frame budget drains, sets `material.needsUpdate` with
budget already 0, and the floor stays on the fallback until the user interacts. D's dirty-tracking is
**heuristic** (it enumerates dirty sources); this is one async, non-React-commit source found by code
reading, and the subtree was not audited for others.

**To make D shippable** (more than a one-liner): (a) thread the `renderBudgetRef` into
`DynamicMapTexture` and bump it in **both** the load-success and the catch (Task-B fallback)
callbacks; (b) unit-test that contract (awkward — R3F-in-jsdom limits component tests, same wall hit
for Task B); (c) **audit the scene subtree for other async dirty sources** that mutate materials while
paused. Then verify on a **CDN-texture fight** (prod, where real data renders) that paused→texture-load
repaints, before rebasing onto `feat`/merging. Until then the paused-render waste (~73–150/sec) stays —
it is not worth a possibly-blank floor on the common load path.

### Latent bugs found while writing tests

- **`extractPlayerPaths` drops the frame at timestamp 0.** ✅ **FIXED.** `lastSampleTime` initialized
  to `0`, so the first frame failed `timestamp - lastSampleTime < minSampleInterval` (`0 - 0 = 0 <
100`) and a path whose data started exactly at `t=0` lost its first point. Now initializes to
  `-config.minSampleInterval`, so the first frame always passes the guard (`0 - (-100) = 100 >=
100`). The test that documented the drop was flipped to assert the t=0 frame is kept
  (`pathUtils.test.ts`). Verified by Jest (21 pathUtils tests green).
- **ELMS decode→encode is not Y-identical.** The decoder offsets Y by `50 * size`
  (`elmsMarkersDecoder.ts`), which the encoder does not subtract; round-tripping a marker shifts its
  Y. Documented in `mapMarkerConverters.test.ts` as intended-current behavior.

---

## Deferred — require visual QA on prod (esotk.com)

These are confirmed and worth doing, but their correctness depends on the live 3D render and so
cannot be safely verified locally. Grouped by theme.

### Performance

- **On-demand rendering when paused** — tried via `frameloop={isPlaying ? 'always' : 'demand'}` and
  **reverted** (regressed playback ~40→24fps; see the Live-verified section). A correct version needs
  a non-reactive render-control approach that coexists with the manual priority-999 render loop.
- **Selection-ring geometry shared across actors** (`AnimationFrameActor3D.tsx`) — memory cleanup,
  not a runtime stall (the verifier corrected the original "GPU stall" claim).
- ~~`setInterval(checkRefChanges, 100)` ref-polling in `Arena3D` → replace with state/callback.~~
  ✅ **SHIPPED** (see Live-verified follow-up table).

### Asset robustness (CDN map textures, `assets.rpglogs.com`)

- Retry with backoff on 404/timeout; explicit load timeout (~5s) → faster degraded fallback.
- ~~Bundle a local procedural fallback texture for missing zones / mapFile mismatches.~~
  ✅ **SHIPPED** — `DynamicMapTexture` now applies a procedurally-generated grid `CanvasTexture`
  (lazy, per-instance, null-context-guarded) on CDN load failure instead of `map = null` (which
  left a featureless solid-color floor). See the Shipped table.
- Marker text-sprite DPR scaling + anti-aliasing (`Marker3D.createTextTexture`).
- (Rejected: `crossOrigin` — three.js `TextureLoader` already defaults to `anonymous`.)

### Accessibility (canvas-rendered, can't axe-test locally)

- Canvas wrapper `role="img"` + static label → live region announcing playback state/time.
- `prefers-reduced-motion` handling for playback + camera animation.
- HUD canvas text contrast (BossHealthHUD / PlayerListHUD) to WCAG 4.5:1.

### Mobile / touch

- Touch camera-control guidance (OrbitControls supports touch; no UI hint exists). WASD is useless on touch.
- Long-press alternative to right-click for adding markers.
- Responsive / fullscreen arena height (currently fixed 400px); landscape layout.
- DPR clamping in canvas HUDs.

### UX

- Help overlay auto-hides after 8s → make shortcuts more discoverable.
- Frame-step controls + precise current-time display.
- Player-list HUD emoji affordances/tooltips; camera-unlock chip styling.

### Correctness (camera math — can't see the result locally)

- **#23 Coordinate-transform mismatch** between `arenaDimensions` and `cameraSettings`. Marked
  "safe" by the workflow but its fix _rewrites camera coordinate math_; deferred until the camera
  result can be visually confirmed (the two transforms may be intentionally different spaces).
- Health interpolation when one sampled position lacks health data (rare edge case).

---

## Rejected as false positives (adversarial pass, 8)

Surfaced by auditors, refuted on closer reading — recorded so they aren't re-raised:

1. HUD `useFrame` "missing priority" — both already pass `RenderPriority.HUD`.
2. `DynamicMapTexture` unmount texture leak — `key={canvas-${fight.id}}` + cleanup already dispose.
3. ShareButton "uses stale state time" — already `timeRef?.current ?? currentTime`.
4. Missing `crossOrigin` — three.js `TextureLoader` defaults to `anonymous`.
5. `MapTexture` lacks error handling — it's **dead code**; `DynamicMapTexture` (with `.catch`) is used.
6. zoneScaleData "missing mapFile" coverage — conflates two independent data sources.
7. `DynamicMapTexture` unbounded cache — cleared on fight switch via Canvas remount.
8. `MarkerShape` eslint-disable scope — already minimal/justified.

---

_Workflow run: 63 agents, ~28 min, 7 audit dimensions + 2 research topics + adversarial verification._
