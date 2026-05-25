# Build Editor — Phase 3 Perf Results

**Date:** 2026-04-11
**Scope:** Phase 3 of `.factory/build-editor-perf-audit.md` — BuildCompletionHeader `sx` churn (M6/H6) and backdrop-filter blur reduction on PickerDialog / SetupTabBar (M9).
**Method:** Code changes only. Typecheck + ESLint pass clean. Empirical Chrome trace to be captured the same way Phase 1b/Phase 2 were.

## Changes shipped

### 1. Lazy-mount the 4 dialogs in BuildCompletionHeader (biggest INP win)

**File:** `src/features/build-editor/components/BuildCompletionHeader.tsx`

Each of the Import / Export / CSPS-Export / Temp-link dialogs was always in the JSX tree with `open={false}`. MUI `Dialog` still creates React elements for the entire subtree on every render — hundreds of `React.createElement` calls per keystroke for dialogs that are closed 99% of the time.

**Change:**
```tsx
// before
<Dialog open={importOpen} ...>{/* 80+ lines of JSX */}</Dialog>

// after
{importOpen && (
  <Dialog open ...>{/* 80+ lines of JSX */}</Dialog>
)}
```

Applied to all 4 dialogs:
- Import dialog (line 1182)
- Export dialog (line 1360)
- CSPS Export dialog (line 1451)
- Temp-link dialog (line 1566)

While typing in the Build Name input the header still re-renders on every keystroke (it owns the controlled input), but React now skips building the subtrees for four closed dialogs — ~600 lines of element-creation eliminated per keystroke.

**Tradeoff — exit animation:** MUI `Dialog` runs its fade-out / slide-down via its `Transition` component, which needs the Dialog to remain mounted with `open={false}` long enough for the transition to complete. Conditionally rendering `{open && ...}` unmounts the Dialog immediately on close, so these four dialogs now snap closed instead of fading out. For utility dialogs (import / export / CSPS / temp link — all triggered by explicit user actions and not expected to be on-screen for long) the snap-close is acceptable. If exit animations are needed later, swap in the classic `mounted + onExited` pattern:

```tsx
const [mounted, setMounted] = React.useState(false);
React.useEffect(() => { if (importOpen) setMounted(true); }, [importOpen]);
// …
{mounted && (
  <Dialog
    open={importOpen}
    onClose={handleImportClose}
    TransitionProps={{ onExited: () => setMounted(false) }}
    …
  />
)}
```

That keeps the subtree around only while the exit transition is playing, preserving both the animation and the keystroke-INP win.

### 2. Memoize shared sx spreads

Three high-churn sx objects that previously re-allocated fresh on every render:

- `pillBase` — spreads into ~10 button sx call sites. Now `React.useMemo([isMobile])`.
- `outlinedPill` — spreads into `pillBase`. Now `React.useMemo([pillBase, isDark])`.
- `dividerSx` — appeared 5× inline. Now a single memoized `React.useMemo([isDark])` value.
- `dialogPaperProps` — shared across all 4 dialogs (previously four identical inline literals). Now a memoized `{ sx: dialogPaperSx(isDark) }` computed once per `isDark` flip.

### 3. Blur reduction (M9)

Reduced `backdrop-filter` radius and added compositing-layer hints on the highest-frequency blurred elements:

| File | Line | Before | After | Notes |
|---|---|---|---|---|
| `PickerDialog.tsx` | 276 | `blur(20px)` | `blur(10px)` | Dialog is `fullScreen` on mobile, so blur is invisible there — no media-gating needed. |
| `SetupTabBar.tsx` | 568 | `blur(16px)` | `blur(8px)` + `willChange: 'transform'` | Main tab bar is always mounted; `willChange` promotes it to its own compositing layer so the blur cost doesn't leak into neighbouring composite passes. |
| `BuildCompletionHeader.tsx` (dialogs) | — | `blur(20px)` × 4 | `blur(10px)` (in `dialogPaperSx`) | Consolidated into one factory. |

Lower-frequency blur sites left alone (drag preview, active-tab glow, add-setup button, delete-confirm dialog) — they're only visible during transient interactions.

### 4. No-op observations (documented for the record)

- `useBuildCompleteness()` uses narrow boolean/number selectors keyed by primitive values. On a keystroke the `hasName` boolean only flips on the first character (empty → non-empty), so the hook does **not** recompute on every keystroke. Left as-is.
- The audit's remaining MEDIUM items (M3 IconPickerGrid motion → CSS, M4 `GearSlotCard` memo, M5 `ChampionPointsPicker` tree cache) are real but not on the Build-Name-typing hot path that Phase 3 targets. They remain as follow-up work.

## Expected impact

- **Per-keystroke React work**: 4 closed `<Dialog>` subtrees no longer build → several hundred `createElement` calls avoided per keystroke plus the allocation of ~4 PaperProps sx literals.
- **sx allocation churn**: `pillBase` / `outlinedPill` / `dividerSx` / `dialogPaperProps` are now stable references across keystrokes. MUI can reuse its cached style rules instead of re-hashing fresh literals. Eliminates ~15 spread-into-object allocations per render on the header strip.
- **Composite cost**: main `SetupTabBar` backdrop-filter halved; added `willChange: transform` isolates its layer so it no longer invalidates neighbours. `PickerDialog` backdrop-filter halved (20px → 10px).

What Phase 3 does **not** change (deliberately out of scope):
- M3/M4/M5 — covered in the follow-up list.
- Stat engine memo deps (H3) — already narrowed in Phase 1, no further changes here.

## Verification

- `npx tsc --noEmit` — passes clean (no output).
- `npx eslint src/features/build-editor` — passes clean (no output).
- Empirical Chrome trace to capture via the same flow:

```bash
PORT=3002 npm run dev
# DevTools → Performance → Record → reload → type 5 chars in Build Name → Stop
```

Compare against `.factory/build-editor-phase1b-interact-trace.json` (INP 346 ms, processing 291 ms). Track INP, processing duration, and style-recalc duration. Target for Phase 3 (per the audit): style recalc < 50 ms, no forced reflow > 16 ms per frame.

## Files changed

- `src/features/build-editor/components/BuildCompletionHeader.tsx` — dialog lazy-mount, sx memoization, `dialogPaperSx` factory.
- `src/features/build-editor/components/primitives/PickerDialog.tsx` — blur radius reduction.
- `src/features/build-editor/components/SetupTabBar.tsx` — blur radius reduction + `willChange`.
- `.factory/build-editor-phase3-results.md` — this document.

## What still remains (post-Phase-3 follow-ups)

- ~~M3 — `IconPickerGrid.tsx` `motion.button` tiles → CSS `:hover`/`:active`.~~ ✅ Shipped below.
- ~~M4 — `GearSlotCard.tsx` `React.memo` + `useCallback` in parent.~~ ✅ Shipped below.
- ~~M5 — `ChampionPointsPicker.getSlottableByTree()` module-level cache.~~ ✅ Shipped below.
- ~~Optional — `content-visibility: auto` on the bento grid children for composite-layer savings on top of Phase 2's React-level lazy mounting.~~ ⏭ **Skipped** — conflicts with `LazySection` IntersectionObserver (1200px rootMargin): the browser's offscreen-skip can prevent the IO from firing, and nav-rail scroll-jump + scroll anchoring would need per-section `contain-intrinsic-size` tuning. Marginal win over the React-level lazy mount, not worth the validation burden without a measured need.
- Optional — CI Lighthouse / Web Vitals budget so INP regressions are caught automatically.

## Follow-up pass (same day)

Shipped the three M3/M4/M5 followups. No code on the keystroke hot path, but they cut render cost on the Equipment section (every gear edit) and the Champion Points section (every tree switch), plus eliminate framer-motion's per-hover JS work on GeneralSection's class/role/game-mode pickers.

### M3 — IconPickerGrid tiles: framer-motion → styled('button') + CSS

**File:** `src/features/build-editor/components/primitives/IconPickerGrid.tsx`

`motion.button` with `whileHover={{ scale: 1.05, y: -2 }}` / `whileTap={{ scale: 0.96 }}` now a plain `styled('button')` with the hover transform driven by CSS `:hover` / `:active`. Hover lift is gated behind `@media (hover: hover)` to avoid the sticky-hover artifact on touch devices, and `prefers-reduced-motion` (now via `useMediaQuery` instead of framer-motion's `useReducedMotion`) skips the `transform` transition entirely. GeneralSection mounts 3× `IconPickerGrid` (class, role, game mode) with 4–9 tiles each — every `whileHover` fire was running JS through framer-motion's animation loop. Now the browser handles it in compositor.

### M4 — Memoize the equipment rows on per-slot props

**Files:** `src/features/build-editor/components/pickers/EquipmentPicker.tsx`, `src/features/build-editor/components/primitives/GearSlotCard.tsx`

`SlotRow` used to receive the whole `gear: GearConfig` + `disabledSlots` map and index into them. Every gear edit produced a new `gear` reference (immer), so all 14 `SlotRow`s re-rendered even when only one piece actually changed. Narrowed the props to `piece: GearPiece | undefined` + `disabledReason: string | undefined` and wrapped `SlotRow` in `React.memo`. Immer's structural sharing keeps the untouched `gear[i]` references stable, so a single gear edit now triggers at most 2 `SlotRow` renders (the edited slot + its off-hand partner when the 2H flag toggles) instead of 14.

For the memo to actually kick in, every handler prop passed to `SlotRow` also has to be reference-stable. `onWeightChange` / `onTraitChange` / `onEnchantChange` were already stable (`useCallback([dispatch])` in `EquipmentSection`). `handleOpen` / `handleClear` in `EquipmentPicker` were **not** — they depended on `disabledSlots` and `gear`, both of which flip on every edit. Stabilized them via `gearRef` / `disabledSlotsRef` so their `useCallback` dep arrays are empty (or `[onChange]`); this is the change that actually delivers the render-skip. Also wrapped `GearSlotCard` in `React.memo` as defense-in-depth for any future caller that passes stable closures.

### M5 — Module-level cache for `getSlottableByTree`

**File:** `src/features/build-editor/components/pickers/ChampionPointsPicker.tsx`

`getSlottableByTree()` filtered `Object.values(CHAMPION_POINT_ABILITIES)` (~150 entries) on every call. The existing `useMemo` inside `TreePanel` reset each time the user switched trees because only the active tree's panel is mounted. Replaced with a `Map<ChampionPointTree, SlottableAbility[]>` module cache that survives tree switches — the filter runs at most 3 times total for the session. Dropped the now-redundant `useMemo` (and the `useMemo` import).

### Verification (followup pass)

- `npx tsc --noEmit` — clean.
- `npx eslint` on the 4 touched files — clean.
- `npx jest --testPathPatterns="build-editor"` — 36/36 pass.
- Empirical trace not re-captured for this followup pass (same capture flow as above).
