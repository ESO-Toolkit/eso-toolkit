import React from 'react';
import { useSelector, useStore } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/gql/graphql';
import { DeathAnalysisInput, DeathAnalysisService } from '../../../services/DeathAnalysisService';
import { fetchDamageEvents } from '../../../store/events_data/damageEventsSlice';
import { fetchDeathEvents } from '../../../store/events_data/deathEventsSlice';
import {
  selectAbilitiesByIdForContext,
  selectActorsByIdForContext,
} from '../../../store/master_data/masterDataSelectors';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { RootState } from '../../../store/storeWithHistory';
import { useAppDispatch } from '../../../store/useAppDispatch';
import { DamageEvent, DeathEvent } from '../../../types/combatlogEvents';
import {
  ReportSummaryData,
  FetchReportSummaryParams,
  ReportInfo,
  PlayerDamageBreakdown,
  AbilityTypeDamageBreakdown,
  FightDamageBreakdown,
} from '../../../types/reportSummaryTypes';
import { isBossFight, wasKill } from '../../report_details/fightGrouping';
import {
  categorizeDamageEvents,
  partitionDamageEvents,
  type DamageCategoryKey,
  type DamagePartition,
} from '../../report_details/insights/damageTypeCategorization';
import { fetchResurrectionEvents, type ResurrectionEvent } from '../resurrectionEvents';

interface UseOptimizedReportSummaryDataReturn {
  reportSummaryData: ReportSummaryData | null;
  isLoading: boolean;
  progress: { current: number; total: number; currentTask: string } | null;
  error: string | null;
  fetchData: (params: FetchReportSummaryParams) => Promise<void>;
}

/** Damage-type buckets, in default render order, mapped to display labels. */
const CATEGORY_LABELS: ReadonlyArray<{ key: DamageCategoryKey; label: string }> = [
  { key: 'magic', label: 'Magic' },
  { key: 'martial', label: 'Martial' },
  { key: 'direct', label: 'Direct' },
  { key: 'poison', label: 'Poison' },
  { key: 'dot', label: 'Damage over Time' },
  { key: 'aoe', label: 'Area of Effect' },
  { key: 'statusEffects', label: 'Status Effects' },
  { key: 'fire', label: 'Fire' },
];

/**
 * A fight that contributes to the summary: present, with a valid, positive-
 * duration window. Shared so the header's pre-aggregation fight count matches
 * the count the aggregation ultimately reports (no count flicker on resolve).
 * Uses `!= null` (not truthiness) so a fight whose startTime is 0 isn't dropped.
 */
export function isUsableFight(fight: FightFragment | null): fight is FightFragment {
  return (
    fight != null &&
    fight.startTime != null &&
    fight.endTime != null &&
    fight.endTime > fight.startTime
  );
}

/**
 * Per-fight event fetches are raced against this bound so a single hung request
 * can never freeze the whole summary. The batch loop `await`s a
 * `Promise.allSettled` over each fight's fetches; without a timeout, one stuck
 * request would block every later batch indefinitely (observed live as a
 * permanently stalled progress bar). It is deliberately generous — it only
 * trips on a genuinely stalled request, not a slow-but-progressing one.
 */
const PER_FIGHT_EVENT_TIMEOUT_MS = 60_000;

/**
 * Rejects if `promise` has not settled within `ms`. The underlying thunk keeps
 * running; we simply stop waiting and let this fight's data count as failed
 * (recorded in `fightErrors`), exactly like any other per-fight fetch failure.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out fetching ${label} after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Fetches every fight's damage/death events (plus best-effort resurrections) in
 * small concurrent batches, reusing the shared Redux event slices, and
 * aggregates them into the report-wide damage breakdown + death analysis.
 *
 * Events are consumed directly from each `dispatch(...).unwrap()` result rather
 * than re-read from Redux afterwards: the event slices trim their cache to
 * EVENT_CACHE_MAX_ENTRIES, so a read-back pass would miss the earliest fights of
 * any report larger than that cap.
 */
export function useOptimizedReportSummaryData(
  reportCode: string,
): UseOptimizedReportSummaryDataReturn {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const fights = useSelector(selectReportFights);
  const store = useStore<RootState>();

  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    current: number;
    total: number;
    currentTask: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reportSummaryData, setReportSummaryData] = React.useState<ReportSummaryData | null>(null);
  // Identifies the latest fetch so a superseded run (reportCode change, or the
  // `fights` selector reference churning and re-firing the effect) can't commit
  // stale results or race the newer run's state updates.
  const runIdRef = React.useRef(0);

  const fetchData = React.useCallback(
    async (_params: FetchReportSummaryParams) => {
      if (!client || !fights) return;

      const runId = ++runIdRef.current;
      const isCurrent = (): boolean => runId === runIdRef.current;

      try {
        setIsLoading(true);
        setError(null);

        // Filter fights same as the report fight selector / fightGrouping —
        // exclude null entries and invalid/zero-duration windows. Use `!= null`
        // (not truthiness) so a fight whose startTime is 0 isn't dropped.
        const cleanFights = fights.filter(isUsableFight);
        const totalTasks = cleanFights.length * 2 + 2; // 2 consumed event types per fight + analysis tasks

        if (isCurrent()) {
          setProgress({
            current: 0,
            total: totalTasks,
            currentTask: 'Starting data fetch...',
          });
        }

        // Per-fight events captured straight from the thunk results (see note
        // above re: cache eviction). Failures are recorded per-fight rather than
        // aborting the whole summary.
        const damageByFight = new Map<number, DamageEvent[]>();
        const deathByFight = new Map<number, DeathEvent[]>();
        const resurrectByFight = new Map<number, ResurrectionEvent[]>();
        const fightErrors: Record<number, string> = {};
        let successfulFights = 0;
        let completedTasks = 0;

        // **CONCURRENCY-LIMITED BATCH PROCESSING**
        // Fetch a few fights at a time so we never fire dozens of requests at
        // once; the Apollo RetryLink already backs off on real rate limits.
        const BATCH_SIZE = 3;

        for (let i = 0; i < cleanFights.length; i += BATCH_SIZE) {
          const batch = cleanFights.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(cleanFights.length / BATCH_SIZE);

          if (isCurrent()) {
            setProgress({
              current: completedTasks,
              total: totalTasks,
              currentTask: `Processing batch ${batchNum}/${totalBatches} (${batch.length} fights)...`,
            });
          }

          await Promise.all(
            batch.map(async (fight) => {
              // Healing events are intentionally NOT fetched here: the summary
              // aggregation only consumes damage, death and resurrection data.
              // Fetching healing (a paginated, multi-MB per-fight query) was pure
              // waste — its result was never stored or read.
              const [damageRes, deathRes, rezRes] = await Promise.allSettled([
                withTimeout(
                  dispatch(fetchDamageEvents({ reportCode, fight, client })).unwrap(),
                  PER_FIGHT_EVENT_TIMEOUT_MS,
                  `damage events for ${fight.name}`,
                ),
                withTimeout(
                  dispatch(fetchDeathEvents({ reportCode, fight, client })).unwrap(),
                  PER_FIGHT_EVENT_TIMEOUT_MS,
                  `death events for ${fight.name}`,
                ),
                withTimeout(
                  fetchResurrectionEvents({ reportCode, fight, client }),
                  PER_FIGHT_EVENT_TIMEOUT_MS,
                  `resurrection events for ${fight.name}`,
                ),
              ]);

              if (damageRes.status === 'fulfilled') {
                damageByFight.set(fight.id, damageRes.value as DamageEvent[]);
              }
              if (deathRes.status === 'fulfilled') {
                deathByFight.set(fight.id, deathRes.value as DeathEvent[]);
              }
              // Resurrects are best-effort — a failure here never fails the fight.
              if (rezRes.status === 'fulfilled') {
                resurrectByFight.set(fight.id, rezRes.value as ResurrectionEvent[]);
              }
              if (damageRes.status === 'fulfilled' || deathRes.status === 'fulfilled') {
                successfulFights += 1;
              }

              const failure = [damageRes, deathRes].find(
                (r): r is PromiseRejectedResult => r.status === 'rejected',
              );
              if (failure) {
                fightErrors[fight.id] =
                  failure.reason instanceof Error
                    ? failure.reason.message
                    : 'Failed to load some events';
              }

              completedTasks += 2;
              if (isCurrent()) {
                setProgress({
                  current: completedTasks,
                  total: totalTasks,
                  currentTask: `Loaded events for ${fight.name}`,
                });
              }
            }),
          );
        }

        // If literally every fight failed to load, there's nothing to show.
        if (cleanFights.length > 0 && successfulFights === 0) {
          throw new Error('Failed to load event data for any fight in this report.');
        }

        if (isCurrent()) {
          setProgress({
            current: totalTasks - 1,
            total: totalTasks,
            currentTask: 'Analyzing damage and death patterns...',
          });
        }

        // Master data (actors/abilities) is report-wide and not subject to the
        // event-cache eviction, so a single lookup is correct for every fight.
        const state = store.getState();
        const firstFight = cleanFights[0];
        const actorsById = firstFight
          ? selectActorsByIdForContext(state, { reportCode, fightId: firstFight.id })
          : {};
        const abilitiesById = firstFight
          ? selectAbilitiesByIdForContext(state, { reportCode, fightId: firstFight.id })
          : {};

        // ---- Death analysis (over the deaths we actually loaded) ----
        const fightDeathData: DeathAnalysisInput[] = cleanFights.map((fight) => ({
          deathEvents: deathByFight.get(fight.id) ?? [],
          damageEvents: damageByFight.get(fight.id) ?? [],
          resurrectEvents: resurrectByFight.get(fight.id) ?? [],
          fightId: fight.id,
          fightName: fight.name,
          fightStartTime: fight.startTime,
          fightEndTime: fight.endTime ?? fight.startTime,
          actors: actorsById,
          abilities: abilitiesById,
          // Authoritative outcome / classification from the API (not heuristics).
          kill: wasKill(fight),
          isBoss: isBossFight(fight),
        }));
        const deathAnalysis = DeathAnalysisService.analyzeReportDeaths(fightDeathData);

        // ---- Damage breakdown ----
        // Summed active fight time — the denominator for active-combat DPS.
        const totalActiveDuration = cleanFights.reduce(
          (sum, fight) => sum + ((fight.endTime ?? fight.startTime) - fight.startTime),
          0,
        );

        // Per-player totals + per-fight breakdown (player-outgoing damage only).
        const playerDamageMap = new Map<
          number,
          {
            name: string;
            totalDamage: number;
            fightData: Map<number, { damage: number; duration: number; fightName: string }>;
          }
        >();

        for (const fight of cleanFights) {
          const damageEvents = damageByFight.get(fight.id) ?? [];
          const fightDuration = (fight.endTime ?? fight.startTime) - fight.startTime;

          for (const event of damageEvents) {
            // Count player-outgoing damage only (excludes damage taken / friendly
            // fire), so totals and percentages describe damage *done*.
            if (event.sourceIsFriendly !== true || event.targetIsFriendly) continue;

            const sourceId = event.sourceID;
            const actor = actorsById[sourceId];
            const actorName = actor?.name || `Actor ${sourceId}`;

            let playerData = playerDamageMap.get(sourceId);
            if (!playerData) {
              playerData = { name: actorName, totalDamage: 0, fightData: new Map() };
              playerDamageMap.set(sourceId, playerData);
            }
            playerData.totalDamage += event.amount || 0;

            let fightData = playerData.fightData.get(fight.id);
            if (!fightData) {
              fightData = { damage: 0, duration: fightDuration, fightName: fight.name };
              playerData.fightData.set(fight.id, fightData);
            }
            fightData.damage += event.amount || 0;
          }
        }

        const totalDamage = Array.from(playerDamageMap.values()).reduce(
          (sum, player) => sum + player.totalDamage,
          0,
        );
        const dps = totalActiveDuration > 0 ? (totalDamage / totalActiveDuration) * 1000 : 0;

        const playerBreakdown: PlayerDamageBreakdown[] = Array.from(playerDamageMap.entries())
          // Only include actual players (exclude NPCs and pets/atronachs).
          .filter(([playerId]) => actorsById[playerId]?.type?.toLowerCase() === 'player')
          .map(([playerId, data]) => {
            const playerDps =
              totalActiveDuration > 0 ? (data.totalDamage / totalActiveDuration) * 1000 : 0;
            const damagePercentage = totalDamage > 0 ? (data.totalDamage / totalDamage) * 100 : 0;

            const fightBreakdown: FightDamageBreakdown[] = Array.from(data.fightData.entries()).map(
              ([fightId, fightData]) => ({
                fightId,
                fightName: fightData.fightName,
                damage: fightData.damage,
                dps: fightData.duration > 0 ? (fightData.damage / fightData.duration) * 1000 : 0,
                duration: fightData.duration,
              }),
            );

            return {
              playerId: playerId.toString(),
              playerName: data.name,
              totalDamage: data.totalDamage,
              dps: playerDps,
              damagePercentage,
              fightBreakdown,
            };
          })
          .sort((a, b) => b.totalDamage - a.totalDamage);

        // Damage-by-type via the shared categorization. `categorized.totalDamage`
        // equals the player-outgoing `totalDamage` above (same filtered
        // population), so percentages here are comparable to the player table.
        const allDamageEvents = cleanFights.flatMap((fight) => damageByFight.get(fight.id) ?? []);
        const categorized = categorizeDamageEvents(allDamageEvents, abilitiesById);
        const denominator = categorized.totalDamage;

        const abilityTypeBreakdown: AbilityTypeDamageBreakdown[] = CATEGORY_LABELS.filter(
          ({ key }) => categorized[key].totalDamage > 0,
        )
          .map(({ key, label }) => ({
            abilityType: label,
            totalDamage: categorized[key].totalDamage,
            percentage: denominator > 0 ? (categorized[key].totalDamage / denominator) * 100 : 0,
            hitCount: categorized[key].hitCount,
          }))
          .sort((a, b) => b.totalDamage - a.totalDamage);

        // Exclusive partitions (each sums to 100%) — the alternate presentation.
        const partitions = partitionDamageEvents(allDamageEvents, abilitiesById);
        const toBreakdown = (partition: DamagePartition): AbilityTypeDamageBreakdown[] =>
          partition.buckets
            .filter((bucket) => bucket.totalDamage > 0)
            .map((bucket) => ({
              abilityType: bucket.label,
              totalDamage: bucket.totalDamage,
              percentage:
                partition.totalDamage > 0 ? (bucket.totalDamage / partition.totalDamage) * 100 : 0,
              hitCount: bucket.hitCount,
            }))
            .sort((a, b) => b.totalDamage - a.totalDamage);
        const deliveryBreakdown = toBreakdown(partitions.byDelivery);
        const schoolBreakdown = toBreakdown(partitions.bySchool);

        // ---- Report metadata ----
        const lastFight = cleanFights[cleanFights.length - 1];
        const reportData = state.report.data;
        // Prefer the report's absolute start/end (epoch ms). Fight timestamps are
        // report-relative, so using them here renders the date as 1970.
        const sessionStart = firstFight?.startTime ?? 0;
        const sessionEnd = lastFight?.endTime ?? lastFight?.startTime ?? sessionStart;
        const reportStart = reportData?.startTime ?? sessionStart;
        const reportEnd = reportData?.endTime ?? sessionEnd;
        const reportInfo: ReportInfo = {
          reportId: reportCode,
          title: reportData?.title || 'Report',
          startTime: reportStart,
          endTime: reportEnd,
          // Wall-clock span of the session (not summed combat time, which is the
          // DPS denominator above).
          duration: Math.max(0, reportEnd - reportStart),
          zoneName: reportData?.zone?.name || 'Unknown Zone',
          ownerName: reportData?.owner?.name || undefined,
        };

        const summaryData: ReportSummaryData = {
          reportInfo,
          fights: cleanFights,
          damageBreakdown: {
            totalDamage,
            dps,
            playerBreakdown,
            abilityTypeBreakdown,
            deliveryBreakdown,
            schoolBreakdown,
            targetBreakdown: [],
          },
          deathAnalysis,
          loadingStates: {
            isLoading: false,
            fightDataLoading: {},
            damageEventsLoading: false,
            deathEventsLoading: false,
            playerDataLoading: false,
            masterDataLoading: false,
          },
          errors: {
            generalErrors: [],
            fightErrors,
            fetchErrors: {},
          },
        };

        if (!isCurrent()) return; // superseded by a newer fetch
        setReportSummaryData(summaryData);
        setProgress({
          current: totalTasks,
          total: totalTasks,
          currentTask: 'Complete!',
        });
      } catch (err) {
        if (!isCurrent()) return; // superseded by a newer fetch
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        // Only the latest run owns the loading flag.
        if (isCurrent()) setIsLoading(false);
      }
    },
    [dispatch, client, fights, reportCode, store],
  );

  // Auto-fetch data when dependencies are ready
  React.useEffect(() => {
    if (reportCode && client && fights && fights.length > 0) {
      fetchData({ reportCode });
    }
  }, [reportCode, client, fights, fetchData]);

  return {
    reportSummaryData,
    isLoading,
    progress,
    error,
    fetchData,
  };
}
