# ESO-722: Report Details Feature Review

Review of `src/features/report_details/` (~97 files). This document captures findings that were too large to address in the initial review PR and should be tackled as follow-up work.

## What Was Fixed (This PR)

1. **Chart.js registration consolidation** - 5 files had duplicate `ChartJS.register()` calls. Extracted to `src/utils/chartRegistration.ts`.
2. **Panel error boundaries** - Added `PanelErrorBoundary` wrapper around all 20 lazy-loaded panels in `FightDetailsView.tsx`. One failing panel no longer crashes the entire tab view.
3. **Chart annotation hook extraction** - Deduplicated phase boundary and inactive interval annotation logic into `src/hooks/useChartAnnotations.ts` (was copy-pasted in 3 files).
4. **Consistent chart imports** - `PlayerCriticalDamageDetailsView` was importing `Line` directly from `react-chartjs-2` instead of using the project's `LazyCharts` wrapper.

## Outstanding Findings

### High Priority

#### PlayerCard.tsx — 2822 lines, single component
**Location:** `src/features/report_details/insights/PlayerCard.tsx`

This is the largest single component in the feature. It handles gear display, ability lists, mundus stones, food/potions, stats, role icons, build issues, and scribing detection all in one file. Should be decomposed into focused sub-components (e.g., `PlayerCardHeader`, `PlayerCardMetrics`, `PlayerCardGear`, `PlayerCardAbilities`).

#### PlayersPanelView — 44+ props
**Location:** `src/features/report_details/insights/PlayersPanelView.tsx`

The props interface spans 44+ fields, mostly `*ByPlayer: Record<string, T>` maps that are drilled 3 levels deep (PlayersPanel -> PlayersPanelView -> PlayerCard). These per-player metric records should be moved to Redux selectors so `PlayerCard` can read them directly, eliminating ~15 props.

#### Buff/Debuff/StatusEffect panel duplication
**Locations:**
- `src/features/report_details/insights/BuffUptimesPanel.tsx`
- `src/features/report_details/insights/DebuffUptimesPanel.tsx`
- `src/features/report_details/insights/StatusEffectUptimesPanel.tsx`

These three panels share ~80% of their logic (load lookup data via worker task, merge/filter by targets, compute uptimes, pass to view + timeline modal). Should be consolidated into a generic `useEffectUptimes` hook.

### Medium Priority

#### Missing test coverage
The following components have zero test files:
- `debug/LocationHeatmapPanel.tsx` (567 lines)
- `debug/TargetEventsPanel.tsx`
- `debug/EventsPanel.tsx`
- `debug/Diagnostics.tsx`
- `debug/DiagnosticsPanel.tsx`
- `rotation/RotationAnalysisPanel.tsx`
- `rotation/RotationAnalysisPanelView.tsx`

`PlayersPanel.test.tsx` and `BossAvatar.test.tsx` contain only snapshot tests.

#### Metric pills pattern duplication
The same `<MetricPill>` layout (3 pills in a responsive Box, hidden on xs, visible on md) is repeated in 10+ accordion summary sections across:
- `PlayerCriticalDamageDetailsView.tsx`
- `PlayerDamageReductionDetails.tsx`
- `PlayerPenetrationDetailsView.tsx`

Could extract a `<MetricPillRow metrics={[...]} />` component.

### Low Priority

#### Accessibility gaps
- Chart containers (`DamageTimelineChart`, `PlayerCriticalDamageDetailsView`, etc.) lack `aria-label` and `role="img"` attributes
- No keyboard navigation for interactive chart components
- Emoji elements in `PlayerCard` lack consistent `aria-hidden` annotations
- No ARIA landmarks (`<main>`, `<section>`) in panel layouts

#### `as any` in test mocks
`DeathEventPanel.test.tsx` uses `as any` in 4 places for test mocking. Low priority but could use proper type narrowing.

## Architecture Observations

### Strengths
- **Consistent Panel/PanelView pattern** across 30+ pairs — clean container/presentational separation
- **Extensive useMemo coverage** — 60 files use useMemo for data transformations
- **Lazy panel loading** — all panels use React.lazy() with Suspense fallbacks
- **Zero `any` in production code** — only found in test files
- **Strong synergy utility tests** — `synergyUtils.test.ts` has 12 test suites with excellent edge case coverage

### Data Flow
```
Redux Store (report, playerData, eventsData, masterData)
  -> Context-aware selectors (createReportFightContextSelector)
  -> Custom hooks (useCastEvents, useReportMasterData, etc.)
  -> Panel containers (data aggregation + useMemo)
  -> PanelView components (pure presentation)
```
