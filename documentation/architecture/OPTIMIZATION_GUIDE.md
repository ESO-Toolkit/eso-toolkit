# Report Summary — Data-Fetching Architecture

This document describes how the Report Summary page (`/report/:reportId/summary`)
loads and aggregates combat-log data. It reflects the **live** implementation in
`src/features/report_summary/hooks/useOptimizedReportSummaryData.ts`.

> History: earlier drafts of this guide proposed an alternate
> "report-wide single query" fetcher (`OptimizedReportEventsFetcher`,
> `optimizedSummaryQueries`, `useOptimizedReportSummaryFetching`). That path was
> never wired into the page and was removed in June 2026. The shared Redux event
> slices below are the canonical approach used across the app.

## Overview

The summary page reuses the app-wide **Redux event slices** rather than issuing
its own bespoke GraphQL queries. This means the damage/death/healing events it
fetches are cached and shared with every other surface (insights, replay, parse
analysis, etc.), so revisiting a fight is free.

```
useOptimizedReportSummaryData(reportCode)
  └─ for each fight (batched):
       dispatch(fetchDamageEvents  { reportCode, fight, client })
       dispatch(fetchDeathEvents   { reportCode, fight, client })
       dispatch(fetchHealingEvents { reportCode, fight, client })
  └─ aggregate the unwrapped results in-memory:
       • DamageBreakdown  (player totals, DPS, damage-by-type)
       • DeathAnalysis    (DeathAnalysisService)
```

## Key design points

1. **Fetch from the shared slices.** `fetchDamageEvents` / `fetchDeathEvents` /
   `fetchHealingEvents` (`src/store/events_data/*`) own caching, pagination, and
   in-flight de-duplication (their `condition` guards skip a fetch when fresh
   cached data already exists). The summary never talks to Apollo directly.

2. **Aggregate from the in-scope `unwrap()` results — do not re-read the cache.**
   Each `dispatch(...).unwrap()` resolves to the fight's full event array. The
   hook aggregates from those resolved values directly. This is deliberate: the
   event slices trim their cache to `EVENT_CACHE_MAX_ENTRIES`
   (`src/store/events_data/constants.ts`), so a report with more fights than that
   limit would have its earliest fights evicted before a second read-back pass
   could see them. Consuming the `unwrap()` results avoids that entirely.

3. **One pass per fight.** Damage events are swept once per fight to build both
   the per-player totals and the damage-type breakdown.

4. **Friendly-outgoing filter.** The event stream contains both friendly and
   enemy hostility (damage dealt *and* damage taken). Aggregation counts only
   `sourceIsFriendly === true && !targetIsFriendly` so totals, DPS, and
   percentages describe player-outgoing damage — matching the insights panels.

5. **Resilient batching.** Fights are fetched in small concurrent batches using
   `Promise.allSettled`, so a single failed fight does not blank the whole page;
   failures are recorded and surfaced as a non-fatal warning while the rest of
   the summary renders.

6. **Authoritative fight outcome.** Kill/wipe and boss/trash classification come
   from the API via the shared helpers in
   `src/features/report_details/fightGrouping.ts` (`wasKill`, `isBossFight`),
   not from death-rate heuristics.

## Where the logic lives

| Concern | File |
|---------|------|
| Orchestration / aggregation | `src/features/report_summary/hooks/useOptimizedReportSummaryData.ts` |
| Damage-type categorization | `src/features/report_details/insights/damageTypeCategorization.ts` |
| Death analysis | `src/services/DeathAnalysisService.ts` |
| Shared event fetching/cache | `src/store/events_data/*` |
| Kill / boss detection | `src/features/report_details/fightGrouping.ts` |
| Types | `src/types/reportSummaryTypes.ts` |
