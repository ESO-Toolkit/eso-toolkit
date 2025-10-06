/**
 * ESO Log Event Parser
 * 
 * This module provides functionality to parse and extract relevant events
 * from ESO combat log data files for scribing recipe analysis.
 */

export interface ParsedLogEvent {
  timestamp: number;
  type: 'cast' | 'applybuff' | 'removebuff' | 'applydebuff' | 'removedebuff' | 'damage' | 'heal';
  sourceID: number;
  sourceIsFriendly: boolean;
  targetID: number;
  targetIsFriendly: boolean;
  abilityGameID: number;
  fight: number;
  castTrackID?: number;
  extraAbilityGameID?: number;
  sourceResources?: {
    hitPoints: number;
    maxHitPoints: number;
    magicka: number;
    maxMagicka: number;
    stamina: number;
    maxStamina: number;
  };
  // Additional fields for different event types
  amount?: number;
  hitType?: number;
  absorbed?: number;
  overkill?: number;
  mitigated?: number;
  blocked?: number;
  glanced?: boolean;
  crushing?: boolean;
  multistrike?: boolean;
  tick?: boolean;
}

export interface LogFileData {
  reportData: {
    report: {
      events: {
        data: ParsedLogEvent[];
      };
    };
  };
}

export interface ParseResult {
  events: ParsedLogEvent[];
  totalEvents: number;
  eventsByType: Record<string, number>;
  fightNumber: number;
  parseTime: number;
  errors: string[];
  warnings: string[];
}

export interface FightEventData {
  fightNumber: number;
  castEvents: ParsedLogEvent[];
  buffEvents: ParsedLogEvent[];
  debuffEvents: ParsedLogEvent[];
  damageEvents: ParsedLogEvent[];
  healingEvents: ParsedLogEvent[];
  allEvents: ParsedLogEvent[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Parser for ESO log event data
 */
export class EsoLogParser {
  private static readonly RELEVANT_EVENT_TYPES = [
    'cast',
    'applybuff',
    'removebuff',
    'applydebuff',
    'removedebuff',
    'damage',
    'heal',
  ];

  /**
   * Parse cast events from a cast-events.json file
   */
  public static async parseCastEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, ['cast']);
  }

  /**
   * Parse buff events from a buff-events.json file
   */
  public static async parseBuffEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, ['applybuff', 'removebuff']);
  }

  /**
   * Parse debuff events from a debuff-events.json file
   */
  public static async parseDebuffEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, ['applydebuff', 'removedebuff']);
  }

  /**
   * Parse damage events from a damage-events.json file
   */
  public static async parseDamageEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, ['damage']);
  }

  /**
   * Parse healing events from a healing-events.json file
   */
  public static async parseHealingEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, ['heal']);
  }

  /**
   * Parse all events from an all-events.json file
   */
  public static async parseAllEvents(filePath: string): Promise<ParseResult> {
    return this.parseEventFile(filePath, this.RELEVANT_EVENT_TYPES);
  }

  /**
   * Parse a complete fight directory containing all event files
   */
  public static async parseFightDirectory(basePath: string, fightNumber: number): Promise<FightEventData> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse all event types for the fight
      const eventFiles = [
        { path: `${basePath}/fight-${fightNumber}/events/cast-events.json`, type: 'cast' },
        { path: `${basePath}/fight-${fightNumber}/events/buff-events.json`, type: 'buff' },
        { path: `${basePath}/fight-${fightNumber}/events/debuff-events.json`, type: 'debuff' },
        { path: `${basePath}/fight-${fightNumber}/events/damage-events.json`, type: 'damage' },
        { path: `${basePath}/fight-${fightNumber}/events/healing-events.json`, type: 'healing' },
      ];

      const allEvents: ParsedLogEvent[] = [];
      const castEvents: ParsedLogEvent[] = [];
      const buffEvents: ParsedLogEvent[] = [];
      const debuffEvents: ParsedLogEvent[] = [];
      const damageEvents: ParsedLogEvent[] = [];
      const healingEvents: ParsedLogEvent[] = [];

      // Parse each event file
      for (const file of eventFiles) {
        try {
          const result = await this.parseEventFile(file.path);
          allEvents.push(...result.events);
          errors.push(...result.errors);
          warnings.push(...result.warnings);

          // Categorize events
          switch (file.type) {
            case 'cast':
              castEvents.push(...result.events);
              break;
            case 'buff':
              buffEvents.push(...result.events.filter(e => e.type === 'applybuff' || e.type === 'removebuff'));
              break;
            case 'debuff':
              debuffEvents.push(...result.events.filter(e => e.type === 'applydebuff' || e.type === 'removedebuff'));
              break;
            case 'damage':
              damageEvents.push(...result.events);
              break;
            case 'healing':
              healingEvents.push(...result.events);
              break;
          }
        } catch (error) {
          errors.push(`Failed to parse ${file.path}: ${error}`);
        }
      }

      // Sort all events by timestamp
      allEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Calculate fight duration
      const startTime = allEvents.length > 0 ? allEvents[0].timestamp : 0;
      const endTime = allEvents.length > 0 ? allEvents[allEvents.length - 1].timestamp : 0;
      const duration = endTime - startTime;

      return {
        fightNumber,
        castEvents,
        buffEvents,
        debuffEvents,
        damageEvents,
        healingEvents,
        allEvents,
        startTime,
        endTime,
        duration,
      };

    } catch (error) {
      throw new Error(`Failed to parse fight directory: ${error}`);
    }
  }

  /**
   * Parse batch of fights from a report directory
   */
  public static async parseBatchFights(basePath: string, fightNumbers: number[]): Promise<FightEventData[]> {
    const results: FightEventData[] = [];
    const errors: string[] = [];

    for (const fightNumber of fightNumbers) {
      try {
        const fightData = await this.parseFightDirectory(basePath, fightNumber);
        results.push(fightData);
      } catch (error) {
        errors.push(`Failed to parse fight ${fightNumber}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Batch parsing completed with errors:', errors);
    }

    return results;
  }

  /**
   * Generic event file parser
   */
  private static async parseEventFile(filePath: string, allowedTypes?: string[]): Promise<ParseResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Read the file (this would be replaced with actual file reading in Node.js)
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }

      const data: LogFileData = await response.json();
      
      if (!data.reportData?.report?.events?.data) {
        throw new Error('Invalid log file structure');
      }

      const rawEvents = data.reportData.report.events.data;
      let events: ParsedLogEvent[] = [];

      // Filter and validate events
      for (const rawEvent of rawEvents) {
        if (!this.validateEvent(rawEvent)) {
          warnings.push(`Invalid event structure at timestamp ${rawEvent.timestamp || 'unknown'}`);
          continue;
        }

        // Filter by allowed event types if specified
        if (allowedTypes && !allowedTypes.includes(rawEvent.type)) {
          continue;
        }

        // Filter to only relevant event types
        if (!this.RELEVANT_EVENT_TYPES.includes(rawEvent.type)) {
          continue;
        }

        events.push(rawEvent as ParsedLogEvent);
      }

      // Sort events by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);

      // Count events by type
      const eventsByType: Record<string, number> = {};
      for (const event of events) {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      }

      const parseTime = Date.now() - startTime;
      const fightNumber = events.length > 0 ? events[0].fight : 0;

      return {
        events,
        totalEvents: events.length,
        eventsByType,
        fightNumber,
        parseTime,
        errors,
        warnings,
      };

    } catch (error) {
      errors.push(`Parse error: ${error}`);
      return {
        events: [],
        totalEvents: 0,
        eventsByType: {},
        fightNumber: 0,
        parseTime: Date.now() - startTime,
        errors,
        warnings,
      };
    }
  }

  /**
   * Validate event structure
   */
  private static validateEvent(event: any): boolean {
    return (
      typeof event === 'object' &&
      typeof event.timestamp === 'number' &&
      typeof event.type === 'string' &&
      typeof event.sourceID === 'number' &&
      typeof event.targetID === 'number' &&
      typeof event.abilityGameID === 'number' &&
      typeof event.fight === 'number' &&
      typeof event.sourceIsFriendly === 'boolean' &&
      typeof event.targetIsFriendly === 'boolean'
    );
  }

  /**
   * Filter events by player ID
   */
  public static filterEventsByPlayer(events: ParsedLogEvent[], playerId: number): ParsedLogEvent[] {
    return events.filter(event => event.sourceID === playerId || event.targetID === playerId);
  }

  /**
   * Filter events by ability ID
   */
  public static filterEventsByAbility(events: ParsedLogEvent[], abilityId: number): ParsedLogEvent[] {
    return events.filter(event => 
      event.abilityGameID === abilityId || 
      event.extraAbilityGameID === abilityId,
    );
  }

  /**
   * Filter events by time window
   */
  public static filterEventsByTimeWindow(
    events: ParsedLogEvent[], 
    startTime: number, 
    endTime: number,
  ): ParsedLogEvent[] {
    return events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime,
    );
  }

  /**
   * Group events by time windows for analysis
   */
  public static groupEventsByTimeWindow(
    events: ParsedLogEvent[], 
    windowSizeMs: number = 2000,
  ): ParsedLogEvent[][] {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const groups: ParsedLogEvent[][] = [];
    let currentGroup: ParsedLogEvent[] = [sorted[0]];
    let groupStartTime = sorted[0].timestamp;

    for (let i = 1; i < sorted.length; i++) {
      const event = sorted[i];
      
      if (event.timestamp - groupStartTime <= windowSizeMs) {
        currentGroup.push(event);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [event];
        groupStartTime = event.timestamp;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Get events within time range of a specific event
   */
  public static getEventsNearTimestamp(
    events: ParsedLogEvent[], 
    timestamp: number, 
    windowMs: number = 2000,
  ): ParsedLogEvent[] {
    return events.filter(event => 
      Math.abs(event.timestamp - timestamp) <= windowMs,
    );
  }
}

export default EsoLogParser;