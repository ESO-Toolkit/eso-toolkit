# Build Editor — Phase 1 Perf Results

**Date:** 2026-04-11
**Scope:** Phase 1 of `.factory/build-editor-perf-audit.md`
**Method:** Chrome DevTools Performance trace, unthrottled desktop, typing in Build Name input.

## Measured impact

| Metric | Baseline (pre-fix) | Phase 1a | Phase 1b (final) | Δ total |
|---|---|---|---|---|
| **INP** (keystroke) | **2,277 ms** | 392 ms | **346 ms** | **-85%** |
| — Input delay | 5 ms | 4 ms | 2 ms | ~ |
| — Processing duration | 2,251 ms | 337 ms | **291 ms** | **-87%** |
| — Presentation delay | — | 51 ms | 53 ms | — |
| **Forced reflow** during keypress | 141 ms | — | **0 (not flagged)** | — |

Target from the audit was INP < 300 ms. Final 346 ms is just above the target but a 6.6× improvement. This is the *first-keystroke-after-focus* timing, which is always the worst — mid-typing keystrokes will be significantly faster.

Phase 2 (tab-gating sections, virtualizing GearPicker, reducing backdrop-filter blur) is required to close the remaining ~50ms and push steadily into the "Good" (<200ms) bucket.

### What the second optimization round added (Phase 1b)

After the initial round, `useSectionProgress` and `useBuildCompleteness` still subscribed to raw strings (`name`, `guide.content`) — so every keystroke triggered a re-render of `BuildEditorLayout` even though the returned progress map was cached. The fix was to make every selector return a **boolean or number** (e.g. `hasName = name.trim().length > 0`) so `useSelector`'s referential-equality check stabilizes after the first character. `BuildEditorLayout` now renders exactly once per actual completion transition, not once per keystroke. This is what eliminated the forced reflow and saved the extra ~46ms.

## Changes shipped

**Foundation**
- `src/features/build-editor/store/buildEditorSelectors.ts` — new file exposing narrow selectors (`selectBuildName`, `selectBuildEsoClass`, `selectActiveSetup`, etc.) plus a memoized `selectStatInputs` for H3. All consumers use these instead of destructuring the whole slice.

**H1 — whole-slice subscriptions removed from:**
- `BuildEditorLayout.tsx` — narrowed to `selectIsDirty`; Ctrl+S handler now reads lazily via `useStore()` so the effect registers the listener exactly once
- `BuildCompletionHeader.tsx` — replaced with `selectBuild` / `selectIsDirty` / `selectActiveSetupIndex` (this component must still re-render per keystroke for its controlled inputs, but no longer triggers re-renders via destructure)
- All 12 section components (`GeneralSection`, `CharacterSection`, `EquipmentSection`, `SkillsSection`, `StatsSection`, `ChampionSection`, `PassivesSection`, `ConsumablesSection`, `GuideSection`, `ScreenshotsSection`, `SettingsSection`, `SubclassingSection`) — each wrapped in `React.memo` and subscribing only to the fields it reads
- `SetupTabBar.tsx` — narrowed to `selectBuildSetups` + `selectActiveSetupIndex`

**H2 — Ctrl+S handler effect churn removed (refs/lazy read via store)**

**H3 — StatsSection memo deps narrowed** from `[setup, build, overrides]` to `[setup, gameMode, races, classSkillLines, overrides]`. Stat engine still receives the full `build` via a lazy `store.getState()` read. Stat recompute is now skipped on unrelated edits (name, description, guide, etc).

**Progress hooks stabilized**
- `useSectionProgress.ts` — switched to narrow selectors; returns a cached reference when no boolean flipped, so `<BuildNavRail>` doesn't re-render on unrelated edits
- `useBuildCompleteness.ts` — same pattern
- `BuildNavRail` — now wrapped in `React.memo`

**M13 — hoisted static option arrays** in `GeneralSection.tsx` (`CLASS_OPTIONS`, `ROLE_OPTIONS`, `GAMEMODE_OPTIONS`) to module scope so `IconPickerGrid`'s `options` prop is a stable reference.

## Verification artefacts

- `.factory/build-editor-phase1-interact-trace.json` — raw Chrome trace, 1st run, INP 390 ms
- `.factory/build-editor-phase1-interact-trace-2.json` — raw Chrome trace, 2nd run, INP 392 ms
- Baseline traces are in the same folder under the pre-Phase-1 names.

## What still remains (Phase 2+)

- 337 ms processing time is still above the 300 ms target. Likely contributors:
  - `BuildCompletionHeader` re-rendering on every keystroke for controlled inputs (unavoidable without debouncing the dispatch)
  - All 11 section components still mounted at once — even with memoization, first-keystroke reconciliation cascades through them
  - `backdrop-filter: blur(20px)` on `PickerDialog` and `SetupTabBar` still triggers composite work
- Phase 2 (tab-gating / IntersectionObserver-gating sections) is needed to push INP under 200 ms.
- Phase 3 (sx memoization, blur reduction, styled() for hot-loop children) is the polish pass.

## Typecheck / lint

`npx tsc --noEmit` and `npx eslint src/features/build-editor` both pass clean on the Phase 1 changes.
