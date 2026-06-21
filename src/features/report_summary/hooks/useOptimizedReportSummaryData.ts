import React from 'react';
import { useSelector, useStore } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/gql/graphql';
import { DeathAnalysisInput, DeathAnalysisService } from '../../../services/DeathAnalysisService';
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
  ReportDeathAnalysis,
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
import {
  fetchSummaryTables,
  type SummaryDamageTotals,
  type SummaryDeathsData,
} from '../reportSummaryTables';
import { fetchResurrectionEvents, type ResurrectionEvent } from '../resurrectionEvents';
import { fetchSummaryFriendlyDamageEvents } from '../summaryDamageEvents';

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

/** Build the header/metadata block from report data + the cleaned fight list. */
function buildReportInfo(
  reportCode: string,
  cleanFights: FightFragment[],
  reportData:
    | {
        title?: string | null;
        startTime?: number | null;
        endTime?: number | null;
        zone?: { name?: string | null } | null;
        owner?: { name?: string | null } | null;
      }
    | null
    | undefined,
): ReportInfo {
  const firstFight = cleanFights[0];
  const lastFight = cleanFights[cleanFights.length - 1];
  // Prefer the report's absolute start/end (epoch ms). Fight timestamps are
  // report-relative, so using them here renders the date as 1970.
  const sessionStart = firstFight?.startTime ?? 0;
  const sessionEnd = lastFight?.endTime ?? lastFight?.startTime ?? sessionStart;
  const reportStart = reportData?.startTime ?? sessionStart;
  const reportEnd = reportData?.endTime ?? sessionEnd;
  return {
    reportId: reportCode,
    title: reportData?.title || 'Report',
    startTime: reportStart,
    endTime: reportEnd,
    // Wall-clock span of the session (not summed combat time, the DPS denominator).
    duration: Math.max(0, reportEnd - reportStart),
    zoneName: reportData?.zone?.name || 'Unknown Zone',
    ownerName: reportData?.owner?.name || undefined,
  };
}

/**
 * The Tier-1 summary committed as soon as the aggregated tables arrive: the
 * player damage table + report DPS AND the full death analysis render
 * immediately, while the per-event damage-type breakdown stays empty (its
 * section shows a skeleton) until the raw Friendlies pass fills it in.
 *
 * `deathAnalysis` is the table-derived analysis when the Deaths table returned
 * deaths, else undefined (its section keeps its skeleton — never a false
 * "Flawless Performance!"). The Tier-1 death analysis omits resurrection data
 * (it streams in behind), so A9 "Time Alive" is refined at the final commit; on
 * a report with no resurrections (the common case) the two are identical.
 */
function buildTier1Summary(
  reportInfo: ReportInfo,
  cleanFights: FightFragment[],
  tier1: SummaryDamageTotals,
  deathAnalysis: ReportDeathAnalysis | undefined,
): ReportSummaryData {
  return {
    reportInfo,
    fights: cleanFights,
    damageBreakdown: {
      totalDamage: tier1.totalDamage,
      dps: tier1.dps,
      playerBreakdown: tier1.playerBreakdown,
      abilityTypeBreakdown: [],
      deliveryBreakdown: [],
      schoolBreakdown: [],
      targetBreakdown: [],
    },
    deathAnalysis,
    loadingStates: {
      isLoading: true,
      fightDataLoading: {},
      damageEventsLoading: false,
      deathEventsLoading: false,
      playerDataLoading: false,
      masterDataLoading: false,
    },
    errors: { generalErrors: [], fightErrors: {}, fetchErrors: {} },
  };
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

        // Summed active fight time — the denominator for active-combat DPS. Shared
        // by the Tier-1 leaderboard and the raw-event fallback so both agree.
        const totalActiveDuration = cleanFights.reduce(
          (sum, fight) => sum + ((fight.endTime ?? fight.startTime) - fight.startTime),
          0,
        );
        // Report metadata is available immediately (no event data needed), so the
        // header + Tier-1 leaderboard can render before the raw-event passes finish.
        const reportInfo = buildReportInfo(reportCode, cleanFights, store.getState().report.data);

        if (isCurrent()) {
          setProgress({
            current: 0,
            total: totalTasks,
            currentTask: 'Starting data fetch...',
          });
        }

        // Reads the report-wide master data (actors/abilities) fresh. It is not
        // loaded on the /summary route at first paint, so the table-derived maps
        // below fill the gaps; once it is warm, the real records take precedence.
        const readMasterData = (): {
          realActors: ReturnType<typeof selectActorsByIdForContext>;
          realAbilities: ReturnType<typeof selectAbilitiesByIdForContext>;
        } => {
          const s = store.getState();
          const ff = cleanFights[0];
          return {
            realActors: ff ? selectActorsByIdForContext(s, { reportCode, fightId: ff.id }) : {},
            realAbilities: ff
              ? selectAbilitiesByIdForContext(s, { reportCode, fightId: ff.id })
              : {},
          };
        };

        // Builds the death analysis from the aggregated Deaths table. The service's
        // analysis logic is the unchanged source of truth; only its inputs are
        // adapted from the table — synthesized death events plus each death's recap
        // damage (the A8 killing-blow join). Resurrection casts (A9) are layered in
        // as they arrive; the table maps are overlaid by real master data.
        const buildTableDeathAnalysis = (
          deaths: SummaryDeathsData,
          rezByFight: Map<number, ResurrectionEvent[]>,
        ): ReportDeathAnalysis => {
          const { realActors, realAbilities } = readMasterData();
          const actors = { ...deaths.tableActors, ...realActors };
          const abilities = { ...deaths.tableAbilities, ...realAbilities };
          const fightDeathData: DeathAnalysisInput[] = cleanFights.map((fight) => ({
            deathEvents: deaths.deathEventsByFight.get(fight.id) ?? [],
            damageEvents: deaths.recapDamageByFight.get(fight.id) ?? [],
            resurrectEvents: rezByFight.get(fight.id) ?? [],
            fightId: fight.id,
            fightName: fight.name,
            fightStartTime: fight.startTime,
            fightEndTime: fight.endTime ?? fight.startTime,
            actors,
            abilities,
            kill: wasKill(fight),
            isBoss: isBossFight(fight),
          }));
          return DeathAnalysisService.analyzeReportDeaths(fightDeathData);
        };

        // ---- Tier-1: one server-side aggregated request (damage + deaths tables) ----
        // Renders the player damage leaderboard + report DPS AND the full death
        // analysis almost immediately, while only the per-event damage-type
        // breakdown streams in behind it. Best-effort: on failure/timeout the
        // raw-event passes below are the authoritative fallback. Timed out so a
        // hung request can't delay the rest of the summary.
        let tier1: SummaryDamageTotals | null = null;
        let tableDeaths: SummaryDeathsData | null = null;
        const fightIds = cleanFights.map((fight) => Number(fight.id));
        if (fightIds.length > 0) {
          const tables = await withTimeout(
            fetchSummaryTables({ reportCode, client, fightIds, totalActiveDuration }),
            PER_FIGHT_EVENT_TIMEOUT_MS,
            'summary tables',
          ).catch(() => null);
          tier1 = tables?.damage && tables.damage.playerBreakdown.length > 0 ? tables.damage : null;
          tableDeaths = tables?.deaths ?? null;

          // Only commit a Tier-1 death analysis when the table actually returned
          // deaths — never synthesize a 0-death "Flawless Performance!" from an
          // empty/unparseable payload (the section keeps its skeleton instead).
          const tier1DeathAnalysis =
            tableDeaths && tableDeaths.deathCount > 0
              ? buildTableDeathAnalysis(tableDeaths, new Map())
              : undefined;

          if (isCurrent() && tier1) {
            setReportSummaryData(
              buildTier1Summary(reportInfo, cleanFights, tier1, tier1DeathAnalysis),
            );
          }
        }

        // When the Deaths table is unavailable, fall back to the raw per-fight
        // death-events fetch (cheap — it carries no damage payload). The Enemies
        // damage crawl stays dropped, so A8 hit size degrades to 0 in that
        // fallback; death counts / causes / patterns stay correct.
        const needRawDeaths = tableDeaths == null;

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
              // Friendlies-only damage (for the per-event damage-type breakdown) +
              // best-effort resurrections (for A9 time alive). The Enemies damage
              // crawl is dropped (A8 now comes from the Deaths table recap), and the
              // raw death fetch runs ONLY when the Deaths table was unavailable.
              const [damageRes, deathRes, rezRes] = await Promise.allSettled([
                withTimeout(
                  fetchSummaryFriendlyDamageEvents({ reportCode, fight, client }),
                  PER_FIGHT_EVENT_TIMEOUT_MS,
                  `damage events for ${fight.name}`,
                ),
                needRawDeaths
                  ? withTimeout(
                      dispatch(fetchDeathEvents({ reportCode, fight, client })).unwrap(),
                      PER_FIGHT_EVENT_TIMEOUT_MS,
                      `death events for ${fight.name}`,
                    )
                  : Promise.resolve<DeathEvent[]>([]),
                withTimeout(
                  fetchResurrectionEvents({ reportCode, fight, client }),
                  PER_FIGHT_EVENT_TIMEOUT_MS,
                  `resurrection events for ${fight.name}`,
                ),
              ]);

              if (damageRes.status === 'fulfilled') {
                damageByFight.set(fight.id, damageRes.value as DamageEvent[]);
              }
              if (needRawDeaths && deathRes.status === 'fulfilled') {
                deathByFight.set(fight.id, deathRes.value as DeathEvent[]);
              }
              // Resurrects are best-effort — a failure here never fails the fight.
              if (rezRes.status === 'fulfilled') {
                resurrectByFight.set(fight.id, rezRes.value as ResurrectionEvent[]);
              }
              // A fight "succeeded" if its Friendlies damage loaded (the kept
              // crawl); in the raw-death fallback a death-only success also counts.
              if (
                damageRes.status === 'fulfilled' ||
                (needRawDeaths && deathRes.status === 'fulfilled')
              ) {
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

        // If literally every fight failed to load AND no Tier-1 table data is
        // available, there's nothing to show.
        const haveTier1Data = Boolean(tier1) || Boolean(tableDeaths);
        if (cleanFights.length > 0 && successfulFights === 0 && !haveTier1Data) {
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

        // ---- Death analysis ----
        // Prefer the aggregated Deaths table (A8 hit size from each death's recap,
        // A9 from the resurrection casts just fetched). Fall back to the raw
        // per-fight death events when the table was unavailable — A8 degrades to 0
        // there (the Enemies damage crawl is dropped), counts/causes stay correct.
        const deathAnalysis: ReportDeathAnalysis = tableDeaths
          ? buildTableDeathAnalysis(tableDeaths, resurrectByFight)
          : DeathAnalysisService.analyzeReportDeaths(
              cleanFights.map((fight) => ({
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
              })),
            );

        // ---- Damage breakdown (raw-event fallback for when Tier-1 is absent) ----
        // `totalActiveDuration` was computed up-front (shared with the Tier-1 DPS).
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

        // ---- Final commit ----
        // Prefer the Tier-1 aggregated leaderboard (already on screen) so the
        // player table doesn't re-flicker; fall back to the raw-event totals when
        // Tier-1 was unavailable. Per-fight `fightBreakdown` is not rendered, so
        // Tier-1's empty value is fine.
        const t1 = tier1 && tier1.playerBreakdown.length > 0 ? tier1 : null;
        const summaryData: ReportSummaryData = {
          reportInfo,
          fights: cleanFights,
          damageBreakdown: {
            totalDamage: t1 ? t1.totalDamage : totalDamage,
            dps: t1 ? t1.dps : dps,
            playerBreakdown: t1 ? t1.playerBreakdown : playerBreakdown,
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

  // Drop the previous report's committed data the moment the report changes.
  // The sections now render as soon as their data is present (the death section
  // no longer gates on isLoading, so the Tier-1 commit can paint fast); without
  // this reset, navigating from one report's summary to another would briefly
  // show the PRIOR report's death analysis / leaderboard during the new report's
  // load. Keyed on reportCode ONLY (not the fetch deps) so same-report effect
  // re-fires — e.g. the `fights` selector reference churning — never wipe a valid
  // in-progress commit.
  //
  // Bump the run id here too: the auto-fetch below is deferred until the new
  // report's fights load, so without superseding the old run its still-in-flight
  // request would pass `isCurrent()` and re-commit the previous report's data
  // right after this reset. The old run's setState calls are now all fenced off.
  React.useEffect(() => {
    runIdRef.current += 1;
    setReportSummaryData(null);
    setProgress(null);
    setError(null);
    setIsLoading(false);
  }, [reportCode]);

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
