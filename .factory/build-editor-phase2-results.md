# Build Editor — Phase 2 Perf Results

**Date:** 2026-04-11
**Scope:** Phase 2 of `.factory/build-editor-perf-audit.md` (lazy section mounting, stagger removal, GearPicker search debounce + cache).
**Method:** Code changes only. Typecheck + ESLint pass clean. Empirical Chrome trace comparison is to be captured the same way Phase 1b was (`PORT=3002 npm run dev` → DevTools → Performance → type in Build Name).

## Changes shipped

### Lazy section mounting (H1 completion + H5)

**New files**
- `src/features/build-editor/components/primitives/LazySection.tsx` — IntersectionObserver-based wrapper. Renders a fixed-height placeholder until its target first enters the viewport (rootMargin defaults to `1200px 0px`, giving one-viewport of pre-mount buffer). Once visible, stays mounted for the rest of the session so section-local state (open picker dialogs, collapsed set groups) survives scrolling.
- `src/features/build-editor/hooks/useDebouncedValue.ts` — trivial `useDebouncedValue(value, delayMs)` hook.

**Changed**
- `src/features/build-editor/components/BuildEditorLayout.tsx`
  - Wrapped every `SectionCard` in `LazySection`.
  - Above-the-fold rows (Identity, Character, Subclassing) pass `eager` so they render on first paint.
  - On mobile (`!lazyDesktop`) every section is `eager` — the existing `<Collapse unmountOnExit>` inside `SectionCard` already handles lazy mounting for collapsed mobile cards, and rootMargin-based mounting on a single-column scroll feels worse than eager-mount-and-collapse.
  - Per-section `placeholderMinHeight` tuned by card tier: Equipment/Champion/Stats use 520–560 (they're the tall cards), Skills/Guide/Passives use 320–360, Settings/Consumables use 200–280.
  - Grid span props (`gridColumn="span 2"`, `gridRow="span 2"`) are mirrored onto the `LazySection` placeholder so the bento grid remains 11 cells across the placeholder → real-content swap.
  - **Removed the parent `motion.div` stagger wrapper** and the now-unused `staggerContainer` / `useReducedMotion` imports. The ~660 ms of first-paint stagger animation over all 11 children is gone.

### GearPicker search + grouping cost (H4)

**Changed**
- `src/features/build-editor/components/pickers/GearPicker.tsx`
  - Added `SET_GROUPS_CACHE: Partial<Record<SlotType, SetGroupResult>>` at module scope. `buildSetGroups(slot)` now runs at most once per slot per page — subsequent picker opens hit the cache. The ~500-item grouping scan is no longer repeated per open.
  - Search input is now debounced via `useDebouncedValue(search, 160)`. The `TextField` still reads the raw `search` state for instant visual feedback; only the `isSearching` gate and `searchResults` filter use the debounced value. That way the 500-item `filter(...).slice(0, 80)` runs at most once per ~160ms of typing instead of on every keystroke.

## Expected impact

Phase 2 targets the initial paint and first-keystroke-after-focus paths:

- **Initial React render**: on desktop, drops from all 11 sections to ~3 (Identity, Character, Subclassing). The remaining 8 sections render as empty placeholder `<Box minHeight=…>` elements.
- **Initial DOM element count**: expected to drop from 818 toward the <400 target in the audit.
- **Stagger animation main-thread work**: ~660 ms removed from first paint.
- **GearPicker open**: the expensive 500-item scan now happens once; subsequent opens on the same slot are effectively free.
- **Typing in GearPicker search**: 160 ms debounce cuts the per-keystroke filter cost by ~6×.

What Phase 2 does **not** change:
- **Mid-typing keystroke INP** on the Build Name input. That's still dominated by `BuildCompletionHeader.tsx` (1650 lines, dozens of inline `sx` object literals per render) re-rendering for its controlled input. Phase 3 (sx memoization + `styled()` for hot-loop children + blur reduction) targets that path.
- **First-keystroke-after-focus INP** will improve only because reconciliation now walks through 3 mounted sections instead of 11 — useful but not the dominant contributor.

## Verification

- `npx tsc --noEmit` — passes clean.
- `npx eslint src/features/build-editor` — passes clean.
- Empirical Chrome trace to be captured via the same flow documented in `build-editor-phase1-results.md`:

```bash
PORT=3002 npm run dev
# DevTools → Performance → Record → reload the page → type 5 chars in Build Name → Stop
```

Compare against `.factory/build-editor-phase1b-interact-trace.json` (INP 346 ms, processing 291 ms). Track LCP, DOM element count, and first-keystroke INP.

## What still remains (Phase 3)

- M6/H6 — `BuildCompletionHeader.tsx` inline `sx` object churn. Memoize stable sx, convert hot children to `styled()`.
- M9 — Reduce `backdrop-filter: blur(20px)` on `PickerDialog` and `blur(16px)` on `SetupTabBar`.
- M3 — Replace `motion.button` whileHover/whileTap on `IconPickerGrid` tiles with CSS.
- M4 — `GearSlotCard` memoization.
- M5 — `ChampionPointsPicker.getSlottableByTree()` module-level cache.
- Optional: `content-visibility: auto` on the bento grid children for composite-layer savings on top of the React-level lazy mounting.
