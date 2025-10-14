import '@testing-library/jest-dom';
import {
  EsoLogParser,
  type ParsedLogEvent,
  type LogFileData,
  type ParseResult,
  type FightEventData,
} from './eso-log-parser';

// Mock fetch for testing file parsing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('EsoLogParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock log data
  const createMockLogData = (events: Partial<ParsedLogEvent>[] = []): LogFileData => ({
    reportData: {
      report: {
        events: {
          data: events.map((event) => ({
            timestamp: 1000,
            type: 'cast',
            sourceID: 1,
            sourceIsFriendly: true,
            targetID: 2,
            targetIsFriendly: false,
            abilityGameID: 12345,
            fight: 1,
            ...event,
          })) as ParsedLogEvent[],
        },
      },
    },
  });

  // Helper function to create mock events
  const createMockEvent = (overrides: Partial<ParsedLogEvent> = {}): ParsedLogEvent => ({
    timestamp: 1000,
    type: 'cast',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 2,
    targetIsFriendly: false,
    abilityGameID: 12345,
    fight: 1,
    ...overrides,
  });

  describe('parseCastEvents', () => {
    it('should parse cast events successfully', async () => {
      const mockData = createMockLogData([
        { type: 'cast', abilityGameID: 123 },
        { type: 'cast', abilityGameID: 456 },
        { type: 'damage', abilityGameID: 789 }, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseCastEvents('/test/cast-events.json');

      expect(result.events).toHaveLength(2);
      expect(result.events.every((e) => e.type === 'cast')).toBe(true);
      expect(result.totalEvents).toBe(2);
      expect(result.eventsByType['cast']).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle fetch errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await EsoLogParser.parseCastEvents('/test/missing-file.json');

      expect(result.events).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to fetch');
    });

    it('should handle invalid JSON structure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ invalidStructure: true }),
      });

      const result = await EsoLogParser.parseCastEvents('/test/invalid.json');

      expect(result.events).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid log file structure');
    });
  });

  describe('parseBuffEvents', () => {
    it('should parse buff events successfully', async () => {
      const mockData = createMockLogData([
        { type: 'applybuff', abilityGameID: 123 },
        { type: 'removebuff', abilityGameID: 456 },
        { type: 'cast', abilityGameID: 789 }, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseBuffEvents('/test/buff-events.json');

      expect(result.events).toHaveLength(2);
      expect(result.events.every((e) => e.type === 'applybuff' || e.type === 'removebuff')).toBe(
        true,
      );
    });
  });

  describe('parseDebuffEvents', () => {
    it('should parse debuff events successfully', async () => {
      const mockData = createMockLogData([
        { type: 'applydebuff', abilityGameID: 123 },
        { type: 'removedebuff', abilityGameID: 456 },
        { type: 'damage', abilityGameID: 789 }, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseDebuffEvents('/test/debuff-events.json');

      expect(result.events).toHaveLength(2);
      expect(
        result.events.every((e) => e.type === 'applydebuff' || e.type === 'removedebuff'),
      ).toBe(true);
    });
  });

  describe('parseDamageEvents', () => {
    it('should parse damage events successfully', async () => {
      const mockData = createMockLogData([
        { type: 'damage', abilityGameID: 123, amount: 1000 },
        { type: 'damage', abilityGameID: 456, amount: 2000 },
        { type: 'heal', abilityGameID: 789 }, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseDamageEvents('/test/damage-events.json');

      expect(result.events).toHaveLength(2);
      expect(result.events.every((e) => e.type === 'damage')).toBe(true);
    });
  });

  describe('parseHealingEvents', () => {
    it('should parse healing events successfully', async () => {
      const mockData = createMockLogData([
        { type: 'heal', abilityGameID: 123, amount: 500 },
        { type: 'heal', abilityGameID: 456, amount: 750 },
        { type: 'damage', abilityGameID: 789 }, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseHealingEvents('/test/healing-events.json');

      expect(result.events).toHaveLength(2);
      expect(result.events.every((e) => e.type === 'heal')).toBe(true);
    });
  });

  describe('parseAllEvents', () => {
    it('should parse all relevant event types', async () => {
      const mockData = createMockLogData([
        { type: 'cast', abilityGameID: 123 },
        { type: 'applybuff', abilityGameID: 456 },
        { type: 'damage', abilityGameID: 789 },
        { type: 'heal', abilityGameID: 101112 },
        { type: 'irrelevant', abilityGameID: 131415 } as any, // Should be filtered out
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/all-events.json');

      expect(result.events).toHaveLength(4);
      expect(result.events.map((e) => e.type)).toContain('cast');
      expect(result.events.map((e) => e.type)).toContain('applybuff');
      expect(result.events.map((e) => e.type)).toContain('damage');
      expect(result.events.map((e) => e.type)).toContain('heal');
    });
  });

  describe('event validation', () => {
    it('should validate events and filter invalid ones', async () => {
      const validEvent = createMockEvent({ abilityGameID: 123 });

      const mockData = {
        reportData: {
          report: {
            events: {
              data: [
                // Valid event with all required fields
                validEvent,
                // Invalid events - missing required fields
                { timestamp: 1000, type: 'cast', abilityGameID: 456 }, // Missing sourceID, targetID, etc.
                {
                  sourceID: 1,
                  targetID: 2,
                  timestamp: 2000,
                  type: 'damage',
                  abilityGameID: 999,
                  fight: 1,
                }, // Missing sourceIsFriendly, targetIsFriendly
                { timestamp: 3000, sourceID: 1, targetID: 2 }, // Missing type, fight, etc.
              ],
            },
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/mixed-events.json');

      // Should have 1 valid event, and warnings for invalid ones
      expect(result.events).toHaveLength(1);
      expect(result.events[0].abilityGameID).toBe(123);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should sort events by timestamp', async () => {
      const mockData = createMockLogData([
        { timestamp: 3000, abilityGameID: 123 },
        { timestamp: 1000, abilityGameID: 456 },
        { timestamp: 2000, abilityGameID: 789 },
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/unsorted-events.json');

      expect(result.events).toHaveLength(3);
      expect(result.events[0].timestamp).toBe(1000);
      expect(result.events[1].timestamp).toBe(2000);
      expect(result.events[2].timestamp).toBe(3000);
    });
  });

  describe('utility methods', () => {
    const testEvents = [
      createMockEvent({ sourceID: 1, targetID: 2, abilityGameID: 123, timestamp: 1000 }),
      createMockEvent({ sourceID: 2, targetID: 3, abilityGameID: 456, timestamp: 2000 }),
      createMockEvent({ sourceID: 1, targetID: 3, abilityGameID: 789, timestamp: 3000 }),
      createMockEvent({
        sourceID: 3,
        targetID: 1,
        abilityGameID: 123,
        timestamp: 4000,
        extraAbilityGameID: 999,
      }),
    ];

    describe('filterEventsByPlayer', () => {
      it('should filter events by source or target player ID', () => {
        const filtered = EsoLogParser.filterEventsByPlayer(testEvents, 1);
        expect(filtered).toHaveLength(3);
        expect(filtered.every((e) => e.sourceID === 1 || e.targetID === 1)).toBe(true);
      });

      it('should return empty array for non-existent player', () => {
        const filtered = EsoLogParser.filterEventsByPlayer(testEvents, 999);
        expect(filtered).toHaveLength(0);
      });
    });

    describe('filterEventsByAbility', () => {
      it('should filter events by ability ID', () => {
        const filtered = EsoLogParser.filterEventsByAbility(testEvents, 123);
        expect(filtered).toHaveLength(2);
        expect(filtered.every((e) => e.abilityGameID === 123 || e.extraAbilityGameID === 123)).toBe(
          true,
        );
      });

      it('should filter by extraAbilityGameID', () => {
        const filtered = EsoLogParser.filterEventsByAbility(testEvents, 999);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].extraAbilityGameID).toBe(999);
      });

      it('should return empty array for non-existent ability', () => {
        const filtered = EsoLogParser.filterEventsByAbility(testEvents, 404);
        expect(filtered).toHaveLength(0);
      });
    });

    describe('filterEventsByTimeWindow', () => {
      it('should filter events by time window', () => {
        const filtered = EsoLogParser.filterEventsByTimeWindow(testEvents, 1500, 3500);
        expect(filtered).toHaveLength(2);
        expect(filtered[0].timestamp).toBe(2000);
        expect(filtered[1].timestamp).toBe(3000);
      });

      it('should return empty array for window with no events', () => {
        const filtered = EsoLogParser.filterEventsByTimeWindow(testEvents, 5000, 6000);
        expect(filtered).toHaveLength(0);
      });
    });

    describe('groupEventsByTimeWindow', () => {
      it('should group events by time windows', () => {
        const events = [
          createMockEvent({ timestamp: 1000 }),
          createMockEvent({ timestamp: 1500 }),
          createMockEvent({ timestamp: 4000 }),
          createMockEvent({ timestamp: 4500 }),
        ];

        const groups = EsoLogParser.groupEventsByTimeWindow(events, 2000);
        expect(groups).toHaveLength(2);
        expect(groups[0]).toHaveLength(2);
        expect(groups[1]).toHaveLength(2);
      });

      it('should handle empty events array', () => {
        const groups = EsoLogParser.groupEventsByTimeWindow([]);
        expect(groups).toHaveLength(0);
      });

      it('should handle single event', () => {
        const groups = EsoLogParser.groupEventsByTimeWindow([createMockEvent()]);
        expect(groups).toHaveLength(1);
        expect(groups[0]).toHaveLength(1);
      });
    });

    describe('getEventsNearTimestamp', () => {
      it('should get events within time range of timestamp', () => {
        const nearEvents = EsoLogParser.getEventsNearTimestamp(testEvents, 2000, 1000);
        expect(nearEvents).toHaveLength(3);
        expect(nearEvents.map((e) => e.timestamp)).toEqual(
          expect.arrayContaining([1000, 2000, 3000]),
        );
      });

      it('should handle exact timestamp match', () => {
        const nearEvents = EsoLogParser.getEventsNearTimestamp(testEvents, 2000, 0);
        expect(nearEvents).toHaveLength(1);
        expect(nearEvents[0].timestamp).toBe(2000);
      });

      it('should return empty array when no events in range', () => {
        const nearEvents = EsoLogParser.getEventsNearTimestamp(testEvents, 10000, 100);
        expect(nearEvents).toHaveLength(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const result = await EsoLogParser.parseAllEvents('/test/invalid-json.json');

      expect(result.events).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await EsoLogParser.parseAllEvents('/test/network-error.json');

      expect(result.events).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include parse time in results', async () => {
      const mockData = createMockLogData([createMockEvent()]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/timing.json');

      expect(result.parseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.parseTime).toBe('number');
    });
  });

  describe('event counting and statistics', () => {
    it('should count events by type', async () => {
      const mockData = createMockLogData([
        { type: 'cast' },
        { type: 'cast' },
        { type: 'damage' },
        { type: 'heal' },
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/statistics.json');

      expect(result.eventsByType['cast']).toBe(2);
      expect(result.eventsByType['damage']).toBe(1);
      expect(result.eventsByType['heal']).toBe(1);
      expect(result.totalEvents).toBe(4);
    });
  });
});
