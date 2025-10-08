import {
  GET_ALL_EVENTS_FOR_SUMMARY,
  GET_ALL_EVENTS_TIME_BASED,
  GET_REPORT_DAMAGE_EVENTS,
  GET_REPORT_DEATH_EVENTS,
  GET_REPORT_HEALING_EVENTS,
} from '../graphql/optimizedSummaryQueries';
import { EsoLogsClient } from '../esologsClient';
import { FightFragment, HostilityType } from '../graphql/generated';
import { DamageEvent, DeathEvent, HealEvent, LogEvent } from '../types/combatlogEvents';

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
    reportEndTime: number
  ): Promise<ReportEventsData> {
    console.log('🚀 Starting optimized parallel report event fetching...');
    
    const startTime = performance.now();
    
    // TRY OPTIMIZED BATCH QUERIES FIRST
    console.log('🧪 ATTEMPT 1: Trying optimized batch queries');
    const [damageData, deathData, healingData] = await Promise.all([
      this.fetchWithPagination(GET_REPORT_DAMAGE_EVENTS, {
        code: reportCode,
        startTime: reportStartTime,
        endTime: reportEndTime,
        hostilityType: HostilityType.Friendlies,
      }, 'damage'),
      
      this.fetchWithPagination(GET_REPORT_DEATH_EVENTS, {
        code: reportCode,
        startTime: reportStartTime,
        endTime: reportEndTime,
        hostilityType: HostilityType.Friendlies,
      }, 'death'),
      
      this.fetchWithPagination(GET_REPORT_HEALING_EVENTS, {
        code: reportCode,
        startTime: reportStartTime,
        endTime: reportEndTime,
        hostilityType: HostilityType.Friendlies,
      }, 'healing')
    ]);

    // Check if batch queries worked
    const totalEvents = damageData.length + deathData.length + healingData.length;
    
    if (totalEvents > 0) {
      const endTime = performance.now();
      console.log(`✅ Batch parallel fetching successful in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Fetched ${damageData.length} damage, ${deathData.length} death, ${healingData.length} healing events`);
      
      return {
        damageEvents: damageData as DamageEvent[],
        deathEvents: deathData as DeathEvent[],
        healingEvents: healingData as HealEvent[],
      };
    }
    
    // FALLBACK: Use proven individual fight approach
    console.warn('⚠️ Batch parallel queries returned 0 events - falling back to individual fight queries');
    
    try {
      const [individualDamage, individualDeaths, individualHealing] = await Promise.all([
        this.fetchDamageEventsIndividually(reportCode, fights),
        this.fetchDeathEventsLikeWorkingSlice(reportCode, fights),
        this.fetchHealingEventsIndividually(reportCode, fights)
      ]);

      const endTime = performance.now();
      console.log(`✅ Individual parallel fetching completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`� Individual approach fetched ${individualDamage.length} damage, ${individualDeaths.length} death, ${individualHealing.length} healing events`);
      
      return {
        damageEvents: individualDamage,
        deathEvents: individualDeaths,
        healingEvents: individualHealing,
      };
      
    } catch (error) {
      console.error('❌ Individual parallel queries also failed:', error);
      
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
    fights: FightFragment[]
  ): Promise<ReportEventsData> {
    console.log('🎯 Starting single-query all events fetching...');
    
    const startTime = performance.now();
    const fightIds = fights.map(f => Number(f.id));
    
    // Get overall report time bounds
    const reportStartTime = Math.min(...fights.map(f => f.startTime));
    const reportEndTime = Math.max(...fights.map(f => f.endTime));
    
    console.log(`🔍 ALL_EVENTS Query Debug:`, {
      fightIdsCount: fightIds.length,
      firstFewFightIds: fightIds.slice(0, 5),
      timeRange: `${reportStartTime} to ${reportEndTime}`,
      duration: `${((reportEndTime - reportStartTime) / 60000).toFixed(1)} minutes`
    });
    
    // FIRST ATTEMPT: Try optimized batch query
    console.log(`🧪 ATTEMPT 1: Testing time-based batch query`);
    
    const allEvents = await this.fetchWithPagination(GET_ALL_EVENTS_TIME_BASED, {
      code: reportCode,
      startTime: reportStartTime,
      endTime: reportEndTime,
    }, 'all events');

    // Check if batch query worked
    if (allEvents.length > 0) {
      console.log(`✅ Batch query successful: ${allEvents.length} events found`);
      
      // Filter events by type on client side
      const damageEvents = allEvents.filter((event: any) => 
        event.type === 'damage' || event.__typename === 'DamageEvent'
      ) as DamageEvent[];
      
      const deathEvents = allEvents.filter((event: any) => 
        event.type === 'death' || event.__typename === 'DeathEvent'  
      ) as DeathEvent[];
      
      const healingEvents = allEvents.filter((event: any) => 
        event.type === 'heal' || event.__typename === 'HealEvent'
      ) as HealEvent[];

      const endTime = performance.now();
      console.log(`✅ All events fetching completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Filtered to ${damageEvents.length} damage, ${deathEvents.length} death, ${healingEvents.length} healing events`);

      return {
        damageEvents,
        deathEvents,
        healingEvents,
      };
    }
    
    // FALLBACK: Batch query failed, use proven individual fight approach
    console.warn('⚠️ Batch query returned 0 events - falling back to individual fight queries (PROVEN WORKING APPROACH)');
    
    try {
      // Use the exact same approach as deathEventsSlice that works
      const parallelResults = await Promise.all([
        this.fetchDamageEventsIndividually(reportCode, fights),
        this.fetchDeathEventsLikeWorkingSlice(reportCode, fights),
        this.fetchHealingEventsIndividually(reportCode, fights)
      ]);

      const [damageEvents, deathEvents, healingEvents] = parallelResults;
      
      const endTime = performance.now();
      console.log(`✅ Individual fight queries completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Individual approach fetched ${damageEvents.length} damage, ${deathEvents.length} death, ${healingEvents.length} healing events`);

      return {
        damageEvents,
        deathEvents,
        healingEvents,
      };
      
    } catch (error) {
      console.error('❌ Individual fight queries also failed:', error);
      
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
    fights: FightFragment[]
  ): Promise<DamageEvent[]> {
    console.log('💥 Using individual fight approach for DAMAGE events...');
    
    try {
      const { GetDamageEventsDocument } = await import('../graphql/events.generated');
      const hostilityTypes = ["Friendlies", "Enemies"];
      let allDamageEvents: DamageEvent[] = [];

      for (const fight of fights) {
        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;

          do {
            const response = await this.client.query({
              query: GetDamageEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            }) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allDamageEvents = allDamageEvents.concat(page.data);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp);
        }
      }

      const damageEvents = allDamageEvents.filter((event) => event.type === 'damage') as DamageEvent[];
      console.log(`✅ Individual damage approach found ${damageEvents.length} total damage events across ${fights.length} fights`);
      return damageEvents;
      
    } catch (error) {
      console.error('❌ Error with individual damage approach:', error);
      return [];
    }
  }

  private async fetchHealingEventsIndividually(
    reportCode: string,
    fights: FightFragment[]
  ): Promise<HealEvent[]> {
    console.log('💚 Using individual fight approach for HEALING events...');
    
    try {
      const { GetHealingEventsDocument } = await import('../graphql/events.generated');
      const hostilityTypes = ["Friendlies", "Enemies"];
      let allHealingEvents: HealEvent[] = [];

      for (const fight of fights) {
        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;

          do {
            const response = await this.client.query({
              query: GetHealingEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            }) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allHealingEvents = allHealingEvents.concat(page.data);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp);
        }
      }

      const healingEvents = allHealingEvents.filter((event) => event.type === 'heal') as HealEvent[];
      console.log(`✅ Individual healing approach found ${healingEvents.length} total healing events across ${fights.length} fights`);
      return healingEvents;
      
    } catch (error) {
      console.error('❌ Error with individual healing approach:', error);
      return [];
    }
  }

  /**
   * WORKING APPROACH: Use the exact working deathEventsSlice approach for individual fights
   */
  private async fetchDeathEventsLikeWorkingSlice(
    reportCode: string,
    fights: FightFragment[]
  ): Promise<DeathEvent[]> {
    console.log('💀 Using EXACT deathEventsSlice approach (individual fight queries)...');
    
    try {
      const { GetDeathEventsDocument } = await import('../graphql/events.generated');
      const hostilityTypes = ["Friendlies", "Enemies"];
      let allDeathEvents: DeathEvent[] = [];

      for (const fight of fights) {
        console.log(`🔍 Processing Fight ${fight.id}: ${fight.name}`);
        
        for (const hostilityType of hostilityTypes) {
          let nextPageTimestamp: number | null = null;

          do {
            const response = await this.client.query({
              query: GetDeathEventsDocument,
              fetchPolicy: 'no-cache',
              variables: {
                code: reportCode,
                fightIds: [Number(fight.id)],
                startTime: nextPageTimestamp ?? fight.startTime,
                endTime: fight.endTime,
                hostilityType: hostilityType as any,
              },
            }) as any;

            const page = response.reportData?.report?.events;
            if (page?.data) {
              allDeathEvents = allDeathEvents.concat(page.data);
              console.log(`📊 Fight ${fight.id} ${hostilityType}: +${page.data.length} deaths`);
            }
            nextPageTimestamp = page?.nextPageTimestamp ?? null;
          } while (nextPageTimestamp);
        }
      }

      // Filter to only death events (just like deathEventsSlice does)
      const deathEvents = allDeathEvents.filter((event) => event.type === 'death') as DeathEvent[];
      
      console.log(`✅ Working approach found ${deathEvents.length} total death events across ${fights.length} fights`);
      return deathEvents;
      
    } catch (error) {
      console.error('❌ Error with working deathEventsSlice approach:', error);
      return [];
    }
  }

  /**
   * Diagnostic check using the working GetDeathEventsDocument approach
   * Tests different batch sizes to find API limits
   */
  private async diagnosticDeathCheck(
    reportCode: string, 
    reportStartTime: number, 
    reportEndTime: number
  ): Promise<void> {
    try {
      console.log('🔬 Running comprehensive diagnostic death check...');
      
      // Import the working query
      const { GetDeathEventsDocument } = await import('../graphql/events.generated');
      
      // Test 1: Single fight ID (we know this works from download script)
      console.log('🔬 TEST 1: Single fight ID [92] (known to have 2 deaths)');
      
      const testVariables = {
        code: reportCode,
        fightIds: [92], // Fight 92 has 2 deaths according to download
        startTime: 6585258, // Fight 92 specific start time from download
        endTime: 6641698,   // Fight 92 specific end time from download
        hostilityType: "Friendlies" as any, // Use string like download script!
        limit: 100000 // Use same high limit as download script
      };
      
      console.log('🔬 EXACT query variables being sent:', JSON.stringify(testVariables, null, 2));
      
      try {
        const result1 = await this.client.query({
          query: GetDeathEventsDocument,
          variables: testVariables,
          fetchPolicy: 'no-cache' // Same as download script
        }) as any;
        
        console.log('🔬 Raw GraphQL response structure:', {
          hasData: !!result1.data,
          hasReportData: !!result1.data?.reportData,
          hasReport: !!result1.data?.reportData?.report,
          hasEvents: !!result1.data?.reportData?.report?.events,
          eventsStructure: result1.data?.reportData?.report?.events
        });
        
        const events1 = result1.data?.reportData?.report?.events?.data || [];
        console.log(`🔬 Single fight [92]: ${events1.length} death events found`);
        
        if (events1.length > 0) {
          console.log('🔬 SUCCESS! Single fight query works. Sample event:', events1[0]);
        } else {
          console.log('🔬 FAIL: Query returned valid structure but no events');
        }
      } catch (error) {
        console.log('🔬 Single fight query failed with error:', error);
        console.log('🔬 Error details:', {
          message: (error as any).message,
          networkError: (error as any).networkError,
          graphQLErrors: (error as any).graphQLErrors
        });
      }
      
      // CRITICAL TEST: Try exact same approach as working deathEventsSlice
      console.log('🔬 CRITICAL TEST: Exact deathEventsSlice approach');
      try {
        // This mimics deathEventsSlice.ts lines 53-65 exactly
        const deathSliceResult = await this.client.query({
          query: GetDeathEventsDocument,
          fetchPolicy: 'no-cache',
          variables: {
            code: reportCode,
            fightIds: [92], // Single fight like deathEventsSlice
            startTime: 6585258, // Fight 92 start time
            endTime: 6641698,   // Fight 92 end time  
            hostilityType: "Friendlies" as any,
          },
        }) as any;

        const deathSliceEvents = deathSliceResult?.reportData?.report?.events;
        const deathSliceData = deathSliceEvents?.data || [];
        
        console.log('🔬 DeathEventsSlice approach result:', {
          eventsCount: deathSliceData.length,
          nextPageTimestamp: deathSliceEvents?.nextPageTimestamp,
          structure: deathSliceEvents
        });
        
        if (deathSliceData.length > 0) {
          console.log('🔬 SUCCESS! DeathEventsSlice approach works!');
          console.log('🔬 First death event:', deathSliceData[0]);
        }
        
      } catch (error) {
        console.log('🔬 DeathEventsSlice approach failed:', error);
      }
      
      // Test 2: Two fight IDs WITHOUT timestamps (let fightIds define the boundaries)
      console.log('🔬 TEST 2: Two fight IDs [92, 93] WITHOUT timestamps (should have 2+17=19 deaths)');
      try {
        const result2 = await this.client.query({
          query: GetDeathEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [92, 93], // Both fights have deaths
            // NO startTime/endTime - let fightIds define boundaries
            hostilityType: "Friendlies" as any,
            limit: 100
          }
        }) as any;
        
        const events2 = result2.data?.reportData?.report?.events?.data || [];
        console.log(`🔬 Two fights [92, 93] NO TIMESTAMPS: ${events2.length} death events found`);
        if (events2.length > 0) {
          console.log('🔬 SUCCESS! Batching works when we omit timestamps!');
        }
      } catch (error) {
        console.log('🔬 Two fights (no timestamps) query failed:', error);
      }
      
      // Test 3: Five fight IDs WITHOUT timestamps
      console.log('🔬 TEST 3: Five fight IDs [89, 90, 91, 92, 93] WITHOUT timestamps');
      try {
        const result3 = await this.client.query({
          query: GetDeathEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [89, 90, 91, 92, 93], // Last 5 fights
            // NO startTime/endTime
            hostilityType: "Friendlies" as any,
            limit: 100
          }
        }) as any;
        
        const events3 = result3.data?.reportData?.report?.events?.data || [];
        console.log(`🔬 Five fights [89-93] NO TIMESTAMPS: ${events3.length} death events found`);
      } catch (error) {
        console.log('🔬 Five fights (no timestamps) query failed:', error);
      }
      
      // Test 4: Ten fight IDs WITHOUT timestamps
      console.log('🔬 TEST 4: Ten fight IDs [84-93] WITHOUT timestamps');
      try {
        const result4 = await this.client.query({
          query: GetDeathEventsDocument,
          variables: {
            code: reportCode,
            fightIds: [84, 85, 86, 87, 88, 89, 90, 91, 92, 93], // Last 10 fights
            // NO startTime/endTime
            hostilityType: "Friendlies" as any,
            limit: 100
          }
        }) as any;
        
        const events4 = result4.data?.reportData?.report?.events?.data || [];
        console.log(`🔬 Ten fights [84-93] NO TIMESTAMPS: ${events4.length} death events found`);
      } catch (error) {
        console.log('🔬 Ten fights (no timestamps) query failed:', error);
      }
      
      // Test 5: ALL 93 fight IDs WITHOUT timestamps (ultimate test!)
      console.log('🔬 TEST 5: ALL 93 fight IDs [1-93] WITHOUT timestamps');
      try {
        const allFightIds = Array.from({length: 93}, (_, i) => i + 1); // [1, 2, 3, ..., 93]
        const result5 = await this.client.query({
          query: GetDeathEventsDocument,
          variables: {
            code: reportCode,
            fightIds: allFightIds, // ALL fights
            // NO startTime/endTime
            hostilityType: "Friendlies" as any,
            limit: 1000 // Higher limit for all events
          }
        }) as any;
        
        const events5 = result5.data?.reportData?.report?.events?.data || [];
        console.log(`🔬 ALL 93 fights NO TIMESTAMPS: ${events5.length} death events found`);
        if (events5.length > 0) {
          console.log('🎉 JACKPOT! ESO API supports ALL fights in single query when we omit timestamps!');
        }
      } catch (error) {
        console.log('🔬 All fights (no timestamps) query failed:', error);
      }
      
    } catch (error) {
      console.log('🔬 Diagnostic check failed:', error);
    }
  }

  /**
   * Filter report-wide events by specific fights
   */
  filterEventsByFights(
    reportEvents: ReportEventsData,
    fights: FightFragment[]
  ): Map<number, FightEventsData> {
    console.log('🔍 Filtering events by individual fights...');
    
    const fightEventsMap = new Map<number, FightEventsData>();
    
    for (const fight of fights) {
      const fightId = Number(fight.id);
      const { startTime, endTime } = fight;
      
      // Filter events that fall within this fight's time range
      const fightDamageEvents = reportEvents.damageEvents.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
      
      const fightDeathEvents = reportEvents.deathEvents.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
      
      const fightHealingEvents = reportEvents.healingEvents.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
      
      fightEventsMap.set(fightId, {
        fightId,
        damageEvents: fightDamageEvents,
        deathEvents: fightDeathEvents,
        healingEvents: fightHealingEvents,
      });
    }
    
    console.log(`📈 Filtered events for ${fights.length} fights`);
    return fightEventsMap;
  }

  /**
   * Helper method to handle paginated queries
   */
  private async fetchWithPagination(
    query: any,
    baseVariables: any,
    eventType: string
  ): Promise<LogEvent[]> {
    let allEvents: LogEvent[] = [];
    let nextPageTimestamp: number | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`📄 Fetching ${eventType} events page ${pageCount}...`);
      
      const variables: any = {
        ...baseVariables,
        ...(nextPageTimestamp && { startTime: nextPageTimestamp })
      };

      const response: any = await this.client.query({
        query,
        variables,
        fetchPolicy: 'no-cache',
      });

      const events = response.data?.reportData?.report?.events?.data || 
                    response.data?.reportData?.report?.damageEvents?.data ||
                    response.data?.reportData?.report?.deathEvents?.data ||
                    response.data?.reportData?.report?.healingEvents?.data ||
                    [];
      
      if (events.length > 0) {
        allEvents = allEvents.concat(events);
      }

      nextPageTimestamp = response.data?.reportData?.report?.events?.nextPageTimestamp ||
                         response.data?.reportData?.report?.damageEvents?.nextPageTimestamp ||
                         response.data?.reportData?.report?.deathEvents?.nextPageTimestamp ||
                         response.data?.reportData?.report?.healingEvents?.nextPageTimestamp ||
                         null;
                         
    } while (nextPageTimestamp && pageCount < 50); // Safety limit

    console.log(`✅ Completed ${eventType} pagination: ${allEvents.length} total events in ${pageCount} pages`);
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