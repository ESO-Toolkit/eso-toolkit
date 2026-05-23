/* eslint-disable @typescript-eslint/no-explicit-any */
import { EsoLogsClient } from '../esologsClient';
import { FightFragment, HostilityType } from '../graphql/gql/graphql';
import {
  GET_ALL_EVENTS_TIME_BASED,
  GET_REPORT_DAMAGE_EVENTS,
  GET_REPORT_DEATH_EVENTS,
  GET_REPORT_HEALING_EVENTS,
} from '../graphql/optimizedSummaryQueries';
import { DamageEvent, DeathEvent, HealEvent, LogEvent } from '../types/combatlogEvents';
import { Logger } from '../utils/logger';

const logger = new Logger({ contextPrefix: 'ReportEventsFetcher' });

export interface ReportEventsData {
  damageEvents: DamageEvent[];
  deathEvents: DeathEvent[];
  healingEvents: HealEvent[];
}

export interface FightEventsData {
  fightId: number;
  damageEvents: DamageEvent[];
  deathEvents: DeathEvent[];
  healingEvents: HealEvent[];
}

/**
 * OPTIMIZATION STRATEGY: Report-Level Event Fetching
 *
 * This service provides multiple optimization strategies for fetching events:
 *
 * 1. **Parallel Report Fetching**: Fetch all event types for entire report in parallel
 * 2. **All Events Approach**: Use dataType: "All" to get everything in one query
 * 3. **Client-Side Filtering**: Fetch report-wide, then filter by fight on client
 *
 * Performance Benefits:
 * - Reduces API calls from (N fights × 3 event types) to just 3 calls
 * - Enables parallel processing of all data
 * - Better caching at report level
 * - Reduces server load and improves user experience
 */
export class OptimizedReportEventsFetcher {
  constructor(private client: EsoLogsClient) {}

  /**
   * STRATEGY 1: Parallel Report-Wide Fetching
   *
   * Fetches all damage, death, and healing events for the entire report
   * in parallel, then filters by fight on the client side.
   *
   * Performance: Excellent for large reports with many fights
   * Memory: Moderate (loads all events into memory)
   * Network: Minimal (only 3 API calls total)
   */
  async fetchReportEventsParallel(
    reportCode: string,
    fights: FightFragment[],
    reportStartTime: number,
    reportEndTime: number,
  ): Promise<ReportEventsData> {
    logger.info('Starting optimized parallel report event fetching');

    const startTime = performance.now();

    // TRY OPTIMIZED BATCH QUERIES FIRST
    logger.info('Trying optimized batch queries');
    const [damageData, deathData, healingData] = await Promise.all([
      this.fetchWithPagination(
        GET_REPORT_DAMAGE_EVENTS,
        {
          code: reportCode,
          startTime: reportStartTime,
          endTime: reportEndTime,
          hostilityType: HostilityType.Friendlies,
        },
        'damage',
      ),

      this.fetchWithPagination(
        GET_REPORT_DEATH_EVENTS,
        {
          code: reportCode,
          startTime: reportStartTime,
          endTime: reportEndTime,
          hostilityType: HostilityType.Friendlies,
        },
        'death',
      ),

      this.fetchWithPagination(
        GET_REPORT_HEALING_EVENTS,
        {
          code: reportCode,
          startTime: reportStartTime,
          endTime: reportEndTime,
          hostilityType: HostilityType.Friendlies,
        },
        'healing',
      ),
    ]);

    // Check if batch queries worked
    const totalEvents = damageData.length + deathData.length + healingData.length;

    if (totalEvents > 0) {
      const endTime = performance.now();
      logger.info(`Batch parallel fetching successful in ${(endTime - startTime).toFixed(2)}ms`);
      logger.info(
        `Fetched ${damageData.length} damage, ${deathData.length} death, ${healingData.length} healing events`,
      );

      return {
        damageEvents: damageData as DamageEvent[],
        deathEvents: deathData as DeathEvent[],
        healingEvents: healingData as HealEvent[],
      };
    }

    // FALLBACK: Use proven individual fight approach
    logger.warn(
      'Batch parallel queries returned 0 events - falling back to individual fight queries',
    );

    try {
      const [individualDamage, individualDeaths, individualHealing] = await Promise.all([
        this.fetchDamageEventsIndividually(reportCode, fights),
        this.fetchDeathEventsLikeWorkingSlice(reportCode, fights),
        this.fetchHealingEventsIndividually(reportCode, fights),
      ]);

      const endTime = performance.now();
      logger.info(
        `Individual parallel fetching completed in ${(endTime - startTime).toFixed(2)}ms`,
      );
      logger.info(
        `Individual approach fetched ${individualDamage.length} damage, ${individualDeaths.length} death, ${individualHealing.length} healing events`,
      );

      return {
        damageEvents: individualDamage,
        deathEvents: individualDeaths,
        healingEvents: individualHealing,
      };
    } catch (error) {
      logger.error('Individual parallel queries also failed', error instanceof Error ? error : undefined);

      // Return empty results rather than crash
      return {
        damageEvents: [],
        deathEvents: [],
        healingEvents: [],
      };
    }
  }

  /**
   * STRATEGY 2: All Events Single Query
   *
   * Uses the "All" dataType to fetch all events in a single query,
   * then filters by event type on the client side.
   *
   * Performance: Excellent (single API call)
   * Memory: High (all events in memory)
   * Network: Minimal (1 API call)
   */
  async fetchAllEventsOptimized(
    reportCode: string,
    fights: FightFragment[],
  ): Promise<ReportEventsData> {
    logger.info('Starting single-query all events fetching');

    const startTime = performance.now();
    const fightIds = fights.map((f) => Number(f.id));

    // Get overall report time bounds
    const reportStartTime = Math.min(...fights.map((f) => f.startTime));
    const reportEndTime = Math.max(...fights.map((f) => f.endTime));

    logger.info('ALL_EVENTS Query Debug', {
      fightIdsCount: fightIds.length,
      firstFewFightIds: fightIds.slice(0, 5),
      timeRange: `${reportStartTime} to ${reportEndTime}`,
      duration: `${((reportEndTime - reportStartTime) / 60000).toFixed(1)} minutes`,
    });

    // FIRST ATTEMPT: Try optimized batch query
    logger.info('Testing time-based batch query');

    const allEvents = await this.fetchWithPagination(
      GET_ALL_EVENTS_TIME_BASED,
      {
        code: reportCode,
        startTime: reportStartTime,
        endTime: reportEndTime,
      },
      'all events',
    );

    // Check if batch query worked
    if (allEvents.length > 0) {
      logger.info(`Batch query successful: ${allEvents.length} events found`);

      // Filter events by type on client side
      const damageEvents = allEvents.filter(
        (event: any) => event.type === 'damage' || event.__typename === 'DamageEvent',
      ) as DamageEvent[];

      const deathEvents = allEvents.filter(
        (event: any) => event.type === 'death' || event.__typename === 'DeathEvent',
      ) as DeathEvent[];

      const healingEvents = allEvents.filter(
        (event: any) => event.type === 'heal' || event.__typename === 'HealEvent',
      ) as HealEvent[];

      const endTime = performance.now();
      logger.info(`All events fetching completed in ${(endTime - startTime).toFixed(2)}ms`);
      logger.info(
        `Filtered to ${damageEvents.length} damage, ${deathEvents.length} death, ${healingEvents.length} healing events`,
      );

      return {
        damageEvents,
        deathEvents,
        healingEvents,
      };
    }

    // FALLBACK: Batch query failed, use proven individual fight approach
    logger.warn(
      'Batch query returned 0 events - falling back to individual fight queries',
    );

    try {
      // Use the exact same approach as deathEventsSlice that works
      const parallelResults = await Promise.all([
        this.fetchDamageEventsIndividually(reportCode, fights),
        this.fetchDeathEventsLikeWorkingSlice(reportCode, fights),
        this.fetchHealingEventsIndividually(reportCode, fights),
      ]);

      const [damageEvents, deathEvents, healingEvents] = parallelResults;

      const endTime = performance.now();
      logger.info(`Individual fight queries completed in ${(endTime - startTime).toFixed(2)}ms`);
      logger.info(
        `Individual approach fetched ${damageEvents.length} damage, ${deathEvents.length} death, ${healingEvents.length} healing events`,
      );

      return {
        damageEvents,
        deathEvents,
        healingEvents,
      };
    } catch (error) {
      logger.error('Individual fight queries also failed', error instanceof Error ? error : undefined);

      // Return empty results rather than crash
      return {
        damageEvents: [],
        deathEvents: [],
        healingEvents: [],
      };
    }
  }

  /**
   * NEW INDIVIDUAL APPROACHES: Use the exact working individual fight approach for each event type
   */
  private async fetchDamageEventsIndividually(
    reportCode: string,
    fights: FightFragment[],
  ): Promise<DamageEvent[]> {
    logger.info('Using individual fight approach for DAMAGE events');

    try {
      const { GetDamageEventsDocument } = await import('../graphql/gql/graphql');
      const hostilityTypes = ['Friendlies', 'Enemies'];
      let allDamageEvents: DamageEvent[] = [];

      for (const fight of fights) {
        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;
          let pageCount = 0;

          do {
            pageCount++;
            const response = (await this.client.query({
              query: GetDamageEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            })) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allDamageEvents = allDamageEvents.concat(page.data);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp && pageCount < 50);
        }
      }

      const damageEvents = allDamageEvents.filter(
        (event) => event.type === 'damage',
      ) as DamageEvent[];
      logger.info(
        `Individual damage approach found ${damageEvents.length} total damage events across ${fights.length} fights`,
      );
      return damageEvents;
    } catch (error) {
      logger.error('Error with individual damage approach', error instanceof Error ? error : undefined);
      return [];
    }
  }

  private async fetchHealingEventsIndividually(
    reportCode: string,
    fights: FightFragment[],
  ): Promise<HealEvent[]> {
    logger.info('Using individual fight approach for HEALING events');

    try {
      const { GetHealingEventsDocument } = await import('../graphql/gql/graphql');
      const hostilityTypes = ['Friendlies', 'Enemies'];
      let allHealingEvents: HealEvent[] = [];

      for (const fight of fights) {
        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;
          let pageCount = 0;

          do {
            pageCount++;
            const response = (await this.client.query({
              query: GetHealingEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            })) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allHealingEvents = allHealingEvents.concat(page.data);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp && pageCount < 50);
        }
      }

      const healingEvents = allHealingEvents.filter(
        (event) => event.type === 'heal',
      ) as HealEvent[];
      logger.info(
        `Individual healing approach found ${healingEvents.length} total healing events across ${fights.length} fights`,
      );
      return healingEvents;
    } catch (error) {
      logger.error('Error with individual healing approach', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * WORKING APPROACH: Use the exact working deathEventsSlice approach for individual fights
   */
  private async fetchDeathEventsLikeWorkingSlice(
    reportCode: string,
    fights: FightFragment[],
  ): Promise<DeathEvent[]> {
    logger.info('Using deathEventsSlice approach (individual fight queries)');

    try {
      const { GetDeathEventsDocument } = await import('../graphql/gql/graphql');
      const hostilityTypes = ['Friendlies', 'Enemies'];
      let allDeathEvents: DeathEvent[] = [];

      for (const fight of fights) {
        logger.info(`Processing Fight ${fight.id}: ${fight.name}`);

        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;
          let pageCount = 0;

          do {
            pageCount++;
            const response = (await this.client.query({
              query: GetDeathEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            })) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allDeathEvents = allDeathEvents.concat(page.data);
              logger.info(`Fight ${fight.id} ${hostilityType}: +${page.data.length} deaths`);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp && pageCount < 50);
        }
      }

      // Filter to only death events (just like deathEventsSlice does)
      const deathEvents = allDeathEvents.filter((event) => event.type === 'death') as DeathEvent[];

      logger.info(
        `Working approach found ${deathEvents.length} total death events across ${fights.length} fights`,
      );
      return deathEvents;
    } catch (error) {
      logger.error('Error with working deathEventsSlice approach', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Filter report-wide events by specific fights
   */
  filterEventsByFights(
    reportEvents: ReportEventsData,
    fights: FightFragment[],
  ): Map<number, FightEventsData> {
    logger.info('Filtering events by individual fights');

    const fightEventsMap = new Map<number, FightEventsData>();

    for (const fight of fights) {
      const fightId = Number(fight.id);
      const { startTime, endTime } = fight;

      // Filter events that fall within this fight's time range
      const fightDamageEvents = reportEvents.damageEvents.filter(
        (event) => event.timestamp >= startTime && event.timestamp <= endTime,
      );

      const fightDeathEvents = reportEvents.deathEvents.filter(
        (event) => event.timestamp >= startTime && event.timestamp <= endTime,
      );

      const fightHealingEvents = reportEvents.healingEvents.filter(
        (event) => event.timestamp >= startTime && event.timestamp <= endTime,
      );

      fightEventsMap.set(fightId, {
        fightId,
        damageEvents: fightDamageEvents,
        deathEvents: fightDeathEvents,
        healingEvents: fightHealingEvents,
      });
    }

    logger.info(`Filtered events for ${fights.length} fights`);
    return fightEventsMap;
  }

  /**
   * Helper method to handle paginated queries
   */
  private async fetchWithPagination(
    query: any,
    baseVariables: any,
    eventType: string,
  ): Promise<LogEvent[]> {
    let allEvents: LogEvent[] = [];
    let nextPageTimestamp: number | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      logger.info(`Fetching ${eventType} events page ${pageCount}`);

      const variables: any = {
        ...baseVariables,
        ...(nextPageTimestamp && { startTime: nextPageTimestamp }),
      };

      const response: any = await this.client.query({
        query,
        variables,
        fetchPolicy: 'no-cache',
      });

      const events =
        response.data?.reportData?.report?.events?.data ||
        response.data?.reportData?.report?.damageEvents?.data ||
        response.data?.reportData?.report?.deathEvents?.data ||
        response.data?.reportData?.report?.healingEvents?.data ||
        [];

      if (events.length > 0) {
        allEvents = allEvents.concat(events);
      }

      nextPageTimestamp =
        response.data?.reportData?.report?.events?.nextPageTimestamp ||
        response.data?.reportData?.report?.damageEvents?.nextPageTimestamp ||
        response.data?.reportData?.report?.deathEvents?.nextPageTimestamp ||
        response.data?.reportData?.report?.healingEvents?.nextPageTimestamp ||
        null;
    } while (nextPageTimestamp && pageCount < 50); // Safety limit

    logger.info(
      `Completed ${eventType} pagination: ${allEvents.length} total events in ${pageCount} pages`,
    );
    return allEvents;
  }
}

/**
 * Usage Examples:
 *
 * // Strategy 1: Parallel report-wide fetching
 * const fetcher = new OptimizedReportEventsFetcher(client);
 * const reportEvents = await fetcher.fetchReportEventsParallel(reportCode, fights, startTime, endTime);
 * const fightEventsMap = fetcher.filterEventsByFights(reportEvents, fights);
 *
 * // Strategy 2: Single "All Events" query
 * const reportEvents = await fetcher.fetchAllEventsOptimized(reportCode, fights);
 * const fightEventsMap = fetcher.filterEventsByFights(reportEvents, fights);
 *
 * Performance Comparison:
 * - Current Approach: N fights × 3 event types = 30+ API calls for 10 fights
 * - Strategy 1: 3 API calls total (90% reduction)
 * - Strategy 2: 1 API call total (97% reduction)
 */
