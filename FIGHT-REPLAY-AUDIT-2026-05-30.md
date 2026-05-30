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

| Area        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verified by                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tests       | Unit tests for `mapScaling`, `playerColors`, `pathUtils`, `mapMarkerConverters` (round-trips)                                                                                                                                                                                                                                                                                                                                                                                                                                               | Jest (62 new tests)                                                                                                                                                                                                                                                                              |
| Correctness | Clamp URL `?time=` to `[0, duration]` (rejects negative / beyond-duration / NaN / ±Infinity)                                                                                                                                                                                                                                                                                                                                                                                                                                                | `replayTime.test.ts`; Playwright deep-link specs                                                                                                                                                                                                                                                 |
| a11y        | `:focus-visible` outlines on TimelineSlider thumb + TimelineMarkers                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Jest render + lint                                                                                                                                                                                                                                                                               |
| a11y        | Share snackbar: `role=status` / `aria-live=polite`, 5s duration (kept bottom-anchored)                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `ShareButton.test.tsx`                                                                                                                                                                                                                                                                           |
| a11y        | `MapMarkersModal` Dialog associated to its title via `aria-labelledby`/`id` (WCAG 1.3.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Jest render                                                                                                                                                                                                                                                                                      |
| a11y        | 44×44 touch targets for playback buttons on coarse-pointer devices (scoped, no global theme change)                                                                                                                                                                                                                                                                                                                                                                                                                                         | `PlaybackButtons.test.tsx` + lint                                                                                                                                                                                                                                                                |
| UX          | Document `P` / `T` keyboard shortcuts in the help overlay                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | DOM                                                                                                                                                                                                                                                                                              |
| Quality     | Remove misleading "DISABLED" HUD comment; accurate note instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | review                                                                                                                                                                                                                                                                                           |
| Quality     | Dedupe 4× identical default camera-position fallback into one pure helper (byte-identical math)                                                                                                                                                                                                                                                                                                                                                                                                                                             | replay suite (148 tests)                                                                                                                                                                                                                                                                         |
| Robustness  | Procedural grid fallback floor texture on CDN map-texture load failure (missing zone / mapFile mismatch / 404), replacing the blank `map = null` plane                                                                                                                                                                                                                                                                                                                                                                                      | `DynamicMapTexture.test.ts` (5 tests: non-null CanvasTexture, 512², null-context guard, per-instance). Floor non-regression verified live on Dreadsail Reef (its CDN texture loads, so the fallback path isn't live-triggerable there)                                                           |
| Perf        | **Stop the 10Hz playback tick from re-rendering the 3D scene.** `setCurrentTime` (every 100ms during playback) re-rendered `FightReplay3D`, which re-reconciled the un-memoized `<Arena3D>` (entire R3F `<Canvas>` subtree — ~50 actors, HUD, markers). `React.memo(Arena3D)` + `useMemo` the `useScrubbingMode` result (was a fresh object/render → broke the memo) + `React.memo(TimelineMarkers)` with a stable `customMarkers` default. `currentTime` never reaches the scene (it reads `timeRef` in `useFrame`), so memoizing is safe. | **Playing fps on the marker-heavy Rockgrove fight: ~13 → ~75 (prod preview, draw-call/rAF instrumentation).** Bisection isolated the cost to the React commit, not `gl.render`. Live: scrub/trails(T)/list(P) still repaint, idle settles to 0, playback advances. Full jest suite green (3006). |

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

**Update — correct approach built and ✅ SHIPPED.** The non-reactive version described above is now in
this PR: the priority-999 `RenderLoop` keeps `frameloop='always'` but gates its `gl.render` behind a
render-budget _ref_ (never state — a state flag would re-render the tree every frame and reintroduce
the very cost being removed). The budget is refilled by playback/scrub (`timeRef` advancing), camera
motion (OrbitControls `'change'`), actor follow/selection (`followingActorIdRef != null`), any React
commit of the scene (markers/trails/visibility, via a deps-less effect in `Arena3DScene`), and async
map-texture swaps (`DynamicMapTexture` → `markSceneDirty`). Playing renders **every frame by
construction** (time advances every frame → budget refilled), so the prior reactive-`frameloop` fps
regression cannot recur.

**Paint-correctness audit.** A read-only subtree audit (13 scene components) surfaced two candidate
missed-paint sources while paused; one was real:

- **`DynamicMapTexture`** swaps `material.map` from `TextureLoader` promise callbacks (success +
  fallback `.catch`, in both the `useFrame` and initial-load `useEffect` paths) — outside any React
  commit / time change / camera move. **Fixed**: all four sites route through a new exported
  `applyFloorTexture(material, texture, onTextureChange)` helper; `Arena3DScene` passes
  `markSceneDirty` so the budget refills and the new floor paints while paused.
- **`AnimationFrameActor3D`** selection visuals — **not a gap**: `selectedActorRef` _is_
  `followingActorIdRef`, so while any actor is selected the `followingActorIdRef.current !== null`
  refill keeps the budget topped every frame; deselect routes through React state (commit). A
  load-bearing code comment records this so the refill isn't "optimized away."
- The other 10 components are time-driven (read `timeRef` → frozen when paused → nothing to paint) and
  safe.

**Verified.** Live on Dreadsail Reef (single-file overlay + canvas draw-call counting — `gl.info` is
unreachable through the React fiber tree): paused-static drawCalls **~9000/sec → 0** (the win); playing
renders every frame (no regression); toggle trails (T) / list (P), camera drag (settles, damping off),
and actor select→follow→unlock all repaint then settle; floor non-regressed. The
**CDN-texture-resolve-while-paused** path can't be triggered on Dreadsail (empty `mapTimeline` → no CDN
fetch), so it is verified by composition instead: `applyFloorTexture` invokes `onTextureChange`
(4 unit tests in `DynamicMapTexture.test.ts`) ∘ the live-proven "budget bump → scene paints" behavior =
texture-load → paint. Not directly observed on a CDN-texture floor; worth a confirming glance on prod,
but the contract is closed in code and test.

### Actor-loop consolidation refactor — INVESTIGATED, NOT JUSTIFIED (do not build)

A follow-up session was briefed to consolidate the ~50 per-actor `useFrame`s (+ the per-actor
`ActorNameBillboard` `useFrame`) into one orchestrator loop in `Arena3DScene`, dedupe the per-actor
`getActorPositionAtClosestTimestamp`, and hoist billboard allocations — targeting ~75 → ~120fps on
the heavy Rockgrove fight (`report/yNXakmx76QFBcpRZ/fight/4/replay`, ~50 actors). **The refactor was
not built: profiling showed it cannot deliver the target, because the per-actor `useFrame` JS is not
the bottleneck.** The remaining per-frame cost is in a different layer (DOM layout/paint) that the
briefed refactor does not touch.

**Method.** The prior "~11ms/frame, spread across the useFrames" figure was measured in dev and is
confounded — the dev React profiling build alone spends ~22% of frame time in React `measure`
(`logComponentRender` / `addObjectDiffToProperties` / `jsxDEV`), all stripped from prod. A clean
measurement requires the prod preview **with every other tab closed** (a stray `localhost:3000`
replay tab was found contaminating the first capture — 62% of its samples were the dev page's main
thread, identifiable by the Vite `?v=` query and raw `.tsx` source URLs). Captures were taken with
Chrome MCP `performance_start_trace` while playing from a dense mid-fight moment (~86s of the 215s
fight, names on — `FightReplay.tsx` hardcodes `showActorNames={true}`, so billboards are in-path),
then self-time aggregated per script chunk from the reconstructed CPU profile.

**Clean prod result (single tab, 0.00% dev contamination, ~15s playing capture):**

| Layer                                   | Per-frame self-time |
| --------------------------------------- | ------------------- |
| App `useFrame` JS (FightReplay + THREE) | **~2.45 ms/frame**  |
| React (`vendor` chunk)                  | ~1.52 ms/frame      |
| **Total scripting**                     | **~4 ms/frame**     |
| Idle                                    | **~69% of frame**   |

No single fat lever: the top app function is ~3.6% of the chunk; the THREE matrix/quaternion math the
brief suspected (`multiplyMatrices`, `updateMatrixWorld`, `compose`, `copy`, `getWorldQuaternion`) is
**0.1–0.2% each** in clean prod. The per-actor lookup is already O(1) (`hasRegularIntervals === true`
for this fight) and the dedup/alloc-hoist wins measure ~0.1–0.2% — real but invisible to fps. So the
consolidation's premise (broadly cheapen ~50 useFrames to claw back ~5ms) is moot: there is no ~5ms
of useFrame JS to claw back. Zeroing the entire actor loop would not reach 120fps.

**Measurement caveat (load-bearing).** Raw-rAF fps on the test hardware is **vsync-capped at 60Hz**
(frame interval median 16.6ms, min 8ms) — it physically cannot express 75 vs 120, so the headline
metric here is **per-frame work-time-ms**, not fps. (75fps ⇒ 13.3ms; 120fps ⇒ 8.3ms; measured prod
useFrame JS is ~2.45ms.) The prior "~75fps" baseline came from higher-refresh hardware.

**Where the real per-frame cost is: DOM layout/paint, not the 3D loop.** A paused-vs-playing trace
comparison isolates it cleanly — these events fire ~once per frame while **playing** and are
**entirely absent while paused**:

| Event (per second) | Playing       | Paused |
| ------------------ | ------------- | ------ |
| `Layout`           | 892 events    | **0**  |
| `Paint`            | 1719 events   | **0**  |
| `UpdateLayer`      | 39,400 events | **0**  |

The 3D canvas paints on the GPU; this `Layout`/`Paint` is **HTML DOM** thrash. The live DOM shows the
culprit layer: the MUI `<Slider>` track/thumb (`MuiSlider-track` / `MuiSlider-thumb`) rewrites inline
`left:` / `width:` styles and the `m:ss` time readout updates as the playhead advances (MUI was ~6%
of the playing trace; absent when paused). It is **only ~0.5ms/frame** of layout+paint, so it is not
a smoothness problem at 60Hz — but it is the _only_ playing-specific cost beyond the GPU canvas, and
therefore the sole candidate lever for any future high-refresh fps work. The throttled 500ms
`setCurrentTime` React state is **not** the driver (it commits ~2×/s, not 60×/s); the per-frame DOM
write originates from a separate path that tracks the playhead — investigating and detaching that
(e.g. driving the scrubber position off `timeRef` via a direct transform write, or `content-visibility`
/ compositor-only updates) is the recommended, scoped follow-up. **Out of scope for this PR** and
unmeasurable for fps on 60Hz hardware, so deliberately deferred rather than coded blind.

**Conclusion.** The per-actor `useFrame` consolidation is **not justified** — it optimizes a layer
(~2.45ms/frame, 69% idle) that is not the bottleneck and cannot reach 120fps. 75fps is already smooth
and shipped. The actionable lever for any future fps work is the per-frame DOM layout/paint from the
MUI timeline slider, documented above. No code change shipped from this investigation.

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

- ~~**On-demand rendering when paused**~~ ✅ **SHIPPED** (paused-static renders ~9000/sec → 0 via a
  budget-gated `RenderLoop` that coexists with the manual priority-999 loop; see the
  `frameloop=demand` section above for the full write-up and verification).
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
