# Fight Replay — Device-Tier Gating (Deferred Work)

Context note for a future pass. The app now exposes a `'low' | 'medium' | 'high'`
performance tier via `usePerfTier()` (see `src/hooks/usePerfTier.ts`) and the
Redux `uiSlice.perfTier` field. The fight replay (`src/features/fight_replay/`)
was intentionally **not** gated in the initial rollout — this doc records the
exact knobs a follow-up should flip, so a later agent doesn't have to re-survey.

## Why defer

Fight replay geometry is already well-shared (`SharedActor3DGeometries`,
`SharedBillboardGeometry`), Chart.js animations are off, and the 2020-Moto
FPS problem is dominated by the 218 `backdrop-filter` instances across the
UI chrome. The UI fixes are cheaper and catch more surface area. The 3D
knobs below are a second pass with its own validation window.

## Knobs to gate (file:line, current literal values)

### 1. Canvas renderer — `src/features/fight_replay/components/Arena3D.tsx`

- **`antialias: true`** at line 588 — 2–4× fillrate cost on Adreno 610.
  Set `antialias: tier === 'high'`.
- **`powerPreference: 'high-performance'`** at line 587 — consider
  `'default'` on `tier === 'low'` to avoid forcing the perf GPU on a
  dual-GPU laptop when the user opted into low-power mode.
- **`preserveDrawingBuffer: true`** at line 586 — forces an extra copy each
  frame. Only needed if we actually read-back pixels; audit the call-sites
  before flipping.
- **`shadows: true`** at line 606 — gate to `tier !== 'low'`.
- **No `dpr` prop on `<Canvas>`** — add
  `dpr={tier === 'low' ? 1 : tier === 'medium' ? 1.5 : Math.min(window.devicePixelRatio, 2)}`.
- **No `frameloop` setting** (defaults to `'always'`) — consider
  `frameloop="demand"` while the timeline isn't playing.

### 2. Directional-light shadows — `Arena3DScene.tsx`

- **`shadow-mapSize-width={2048}` / `shadow-mapSize-height={2048}`** at
  lines 388–389 — 2048² is aggressive. On `tier === 'medium'` drop to 1024,
  on `tier === 'low'` the shadow is already gated off at the Canvas level.

### 3. Billboards — `ActorNameBillboard.tsx`

- **DPR cap** at line 74: `Math.min(window.devicePixelRatio || 1, 3)`.
  Drop the cap with tier:
  - `'low'` → 1
  - `'medium'` → 1.5
  - `'high'` → 2 (lowering from 3 is safe; 3 only matters on Apple XDR)
- **Canvas dims** at lines 78–79: `1024 × 256` logical, multiplied by the
  DPR cap above. The DPR change is sufficient — don't shrink the logical
  size (hurts text legibility).
- **`anisotropy = 4`** at line 102 — drop to 1 on `'low'`.
- **`minFilter = LinearMipmapLinearFilter`** at line 100 — the mipmap chain
  is pointless on `'low'` since we're not scaling down far; switching to
  `LinearFilter` saves a bit of VRAM + upload time.

### 4. Per-actor materials — `AnimationFrameActor3D.tsx`

Each actor owns its own puck / vision-cone / taunt-ring material (refs:
`puckMaterialRef`, `visionConeMaterialRef`, `tauntRingMeshRef`). With 20+
actors that's 60+ draw calls. Consider an `InstancedMesh` pass on
`'low'` or a shared material with per-instance attributes. This is the
largest shape change of the bunch — worth a dedicated ticket.

### 5. Per-frame hooks — `useFrame` call-sites (11 total)

1. `ActorNameBillboard.tsx:190` — billboard transform
2. `AnimationFrameActor3D.tsx:178` — actor transform (`RenderPriority.ACTORS`)
3. `Arena3DScene.tsx:133` — manual render (`RenderPriority.RENDER = 999`)
4. `CameraFollower.tsx:38` — camera follow
5. `BossHealthHUD.tsx:179` — HUD screen-space position
6. `DynamicMapTexture.tsx:85` — phase map texture switching
7. `KeyboardCameraControls.tsx:136` — WASD camera
8. `PlayerPathTrail3D.tsx:95` — trail animation
9. `PlayerListHUD.tsx:572` — HUD 3D-canvas position
10. `FPSCounter` / `MemoryTracker` / `SlowFrameLogger` — monitoring

On `'low'`, the HUD + trail hooks (5, 6, 8, 9) can be skipped entirely —
they're cosmetic. Hook #3 (manual render) must keep running. Hooks 1 and 2
are already modulated by `useScrubbingMode` (see below); extend that
pattern to honour the tier even when not scrubbing.

### 6. Extend existing `useScrubbingMode` — `src/hooks/useScrubbingMode.ts`

Already returns `renderQuality`, `shouldUpdatePositions`, `shouldRenderEffects`,
`frameSkipRate`. Today these only vary during timeline drag. On `'low'`:

- `frameSkipRate` → 2 permanently (30 fps target beats a janky 45)
- `shouldRenderEffects` → false (billboards hide; see
  `Arena3DScene.tsx:96`)
- `renderQuality` → `'low'` always

This keeps the existing plumbing — no new prop drilling through
`FightReplay3D → Arena3D → Arena3DScene`.

### 7. Actor count cap

`Arena3DScene.tsx:77–93` (`AnimationFrameSceneActors`) pulls all actor IDs
from every timestamp in `lookup.positionsByTimestamp`. No cap. On
`'low'`, consider capping to the top-N actors by recent activity (visible
in current camera frustum, or the player's own group). A hard cap of 12
at `'low'` covers the common raid case without dropping the player's team.

## Validation plan for the follow-up

- Baseline FPS on Moto G Power emulation (Snapdragon 665, 4× CPU throttle)
  on a 20-actor fight — should be compared to the pre-tier-gate number
  captured for the UI-chrome pass.
- Desktop high-tier should be **bit-for-bit identical** — guard with a
  visual-regression screenshot of Arena3D at a fixed timestamp.
- Keep `useScrubbingMode` behaviour unchanged for the desktop/high path.

## Prerequisites that are already in place

- `usePerfTier()` hook and `uiSlice.perfTier` field (added in the UI-chrome
  pass). Reading the tier in R3F components is just `useAppSelector(selectPerfTier)`.
- `document.documentElement.dataset.perf` is set globally, so any CSS
  surrounding the Canvas (e.g. the ReplayControls overlay) already
  degrades without per-component work.
- User-facing override at **Settings → Performance mode** (auto / low /
  medium / high). Respect the override — don't ignore a user who picked
  `'low'` to save battery on a high-end phone.
