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

// Mock console.warn to capture warnings in batch parsing
const mockConsoleWarn = jest.fn();
global.console.warn = mockConsoleWarn;

describe('EsoLogParser - Advanced Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  // Helper function to create mock log data
  const createMockLogData = (events: Partial<ParsedLogEvent>[] = []): LogFileData => ({
    reportData: {
      report: {
        events: {
          data: events.map(event => ({
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

  describe('parseFightDirectory', () => {
    it('should parse a complete fight directory successfully', async () => {
      // Mock responses for all event file types
      const mockResponses = {
        'cast-events.json': createMockLogData([
          { type: 'cast', abilityGameID: 123, timestamp: 1000 },
          { type: 'cast', abilityGameID: 456, timestamp: 2000 },
        ]),
        'buff-events.json': createMockLogData([
          { type: 'applybuff', abilityGameID: 789, timestamp: 1500 },
          { type: 'removebuff', abilityGameID: 101112, timestamp: 2500 },
        ]),
        'debuff-events.json': createMockLogData([
          { type: 'applydebuff', abilityGameID: 131415, timestamp: 1200 },
          { type: 'removedebuff', abilityGameID: 161718, timestamp: 2200 },
        ]),
        'damage-events.json': createMockLogData([
          { type: 'damage', abilityGameID: 192021, timestamp: 1800, amount: 1000 },
          { type: 'damage', abilityGameID: 222324, timestamp: 2800, amount: 1500 },
        ]),
        'healing-events.json': createMockLogData([
          { type: 'heal', abilityGameID: 252627, timestamp: 1300, amount: 500 },
          { type: 'heal', abilityGameID: 282930, timestamp: 2300, amount: 750 },
        ]),
      };

      // Set up fetch mock to return appropriate responses based on URL
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        const fileName = url.split('/').pop();
        const mockData = mockResponses[fileName as keyof typeof mockResponses];
        if (mockData) {
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(mockData),
          };
        }
        throw new Error(`No mock data for ${fileName}`);
      });

      const result = await EsoLogParser.parseFightDirectory('/test/reports', 1);

      // Verify structure
      expect(result.fightNumber).toBe(1);
      expect(result.castEvents).toHaveLength(2);
      expect(result.buffEvents).toHaveLength(2);
      expect(result.debuffEvents).toHaveLength(2);
      expect(result.damageEvents).toHaveLength(2);
      expect(result.healingEvents).toHaveLength(2);
      expect(result.allEvents).toHaveLength(10);

      // Verify events are sorted by timestamp
      const timestamps = result.allEvents.map(e => e.timestamp);
      expect(timestamps).toEqual([1000, 1200, 1300, 1500, 1800, 2000, 2200, 2300, 2500, 2800]);

      // Verify duration calculation
      expect(result.startTime).toBe(1000);
      expect(result.endTime).toBe(2800);
      expect(result.duration).toBe(1800);

      // Verify categorization
      expect(result.castEvents.every(e => e.type === 'cast')).toBe(true);
      expect(result.buffEvents.every(e => e.type === 'applybuff' || e.type === 'removebuff')).toBe(true);
      expect(result.debuffEvents.every(e => e.type === 'applydebuff' || e.type === 'removedebuff')).toBe(true);
      expect(result.damageEvents.every(e => e.type === 'damage')).toBe(true);
      expect(result.healingEvents.every(e => e.type === 'heal')).toBe(true);
    });

    it('should handle empty fight directory', async () => {
      // Mock empty responses for all event files
      (fetch as jest.Mock).mockImplementation(async () => ({
        ok: true,
        json: jest.fn().mockResolvedValue(createMockLogData([])),
      }));

      const result = await EsoLogParser.parseFightDirectory('/test/empty', 2);

      expect(result.fightNumber).toBe(2);
      expect(result.castEvents).toHaveLength(0);
      expect(result.buffEvents).toHaveLength(0);
      expect(result.debuffEvents).toHaveLength(0);
      expect(result.damageEvents).toHaveLength(0);
      expect(result.healingEvents).toHaveLength(0);
      expect(result.allEvents).toHaveLength(0);
      expect(result.startTime).toBe(0);
      expect(result.endTime).toBe(0);
      expect(result.duration).toBe(0);
    });

    it('should handle file parsing errors gracefully', async () => {
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          // First file succeeds
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([
              { type: 'cast', abilityGameID: 123, timestamp: 1000 },
            ])),
          };
        } else if (callCount === 2) {
          // Second file fails
          return {
            ok: false,
            statusText: 'Not Found',
          };
        } else {
          // Remaining files succeed but empty
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([])),
          };
        }
      });

      const result = await EsoLogParser.parseFightDirectory('/test/partial', 3);

      // Should still return result with successful files
      expect(result.fightNumber).toBe(3);
      expect(result.castEvents).toHaveLength(1);
      expect(result.allEvents).toHaveLength(1);
      // The parseEventFile method should handle the error and return an error in the result
    });

    it('should handle event categorization from mixed files', async () => {
      // Test the categorization logic in parseFightDirectory
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes('debuff-events.json')) {
          // Focus on debuff events to test the filtering
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([
              { 
                type: 'applydebuff', 
                abilityGameID: 321, 
                timestamp: 1200,
                sourceID: 1,
                sourceIsFriendly: true,
                targetID: 2,
                targetIsFriendly: false,
                fight: 4
              },
              { 
                type: 'removedebuff', 
                abilityGameID: 654, 
                timestamp: 2200,
                sourceID: 1,
                sourceIsFriendly: true,
                targetID: 2,
                targetIsFriendly: false,
                fight: 4
              }
            ])),
          };
        } else {
          // Other files return empty to focus on debuff test
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([])),
          };
        }
      });

      const result = await EsoLogParser.parseFightDirectory('/test/debuff-test', 4);

      // Should have parsed debuff events correctly
      expect(result.debuffEvents).toHaveLength(2);
      expect(result.debuffEvents[0].type).toBe('applydebuff');
      expect(result.debuffEvents[1].type).toBe('removedebuff');
      expect(result.allEvents).toHaveLength(2);
    });

    it('should handle individual file parsing errors and continue processing', async () => {
      // Test the try-catch inside the for loop that catches individual file errors
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        callCount++;
        if (callCount === 2) { // Second file (buff-events.json) fails
          return {
            ok: false,
            statusText: 'File not found',
          };
        }
        // Other files succeed
        return {
          ok: true,
          json: jest.fn().mockResolvedValue(createMockLogData([
            { type: 'cast', abilityGameID: 123, timestamp: 1000 },
          ])),
        };
      });

      const result = await EsoLogParser.parseFightDirectory('/test/partial-fail', 5);

      // Should still process and return results from successful files
      expect(result.fightNumber).toBe(5);
      expect(result.allEvents.length).toBeGreaterThan(0); // Should have events from successful files
      // The parseEventFile method will handle the fetch error and return it in result.errors
    });
  });

  describe('parseBatchFights', () => {
    it('should parse multiple fights successfully', async () => {
      // Mock successful responses for multiple fights
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        const fightNumber = url.includes('fight-1') ? 1 : 2;
        return {
          ok: true,
          json: jest.fn().mockResolvedValue(createMockLogData([
            { type: 'cast', abilityGameID: fightNumber * 100, timestamp: fightNumber * 1000, fight: fightNumber },
          ])),
        };
      });

      const results = await EsoLogParser.parseBatchFights('/test/batch', [1, 2]);

      expect(results).toHaveLength(2);
      expect(results[0].fightNumber).toBe(1);
      expect(results[1].fightNumber).toBe(2);
      expect(results[0].allEvents[0].abilityGameID).toBe(100);
      expect(results[1].allEvents[0].abilityGameID).toBe(200);
    });

    it('should handle partial failures in batch processing', async () => {
      // Mock parseFightDirectory to simulate one success and one failure
      const originalParseFightDirectory = EsoLogParser.parseFightDirectory;
      
      // Create a mock that throws for fight 2
      (EsoLogParser.parseFightDirectory as jest.Mock) = jest.fn().mockImplementation(
        async (basePath: string, fightNumber: number) => {
          if (fightNumber === 2) {
            throw new Error('Fight 2 simulation error');
          }
          // Fight 1 succeeds - call the original with mocked fetch
          (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([
              { type: 'cast', abilityGameID: 100, timestamp: 1000, fight: 1 },
            ])),
          });
          return originalParseFightDirectory(basePath, fightNumber);
        }
      );

      const results = await EsoLogParser.parseBatchFights('/test/batch', [1, 2]);

      // Should return only successful fights
      expect(results).toHaveLength(1);
      expect(results[0].fightNumber).toBe(1);
      
      // Should log warnings for failed fights
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Batch parsing completed with errors:', 
        expect.arrayContaining([expect.stringContaining('Failed to parse fight 2')])
      );

      // Restore the original method
      EsoLogParser.parseFightDirectory = originalParseFightDirectory;
    });

    it('should handle empty fight numbers array', async () => {
      const results = await EsoLogParser.parseBatchFights('/test/empty', []);
      
      expect(results).toHaveLength(0);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should handle all fights failing', async () => {
      // Mock parseFightDirectory to always throw
      const originalParseFightDirectory = EsoLogParser.parseFightDirectory;
      (EsoLogParser.parseFightDirectory as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Simulated fight parsing error')
      );

      const results = await EsoLogParser.parseBatchFights('/test/all-fail', [1, 2, 3]);

      expect(results).toHaveLength(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Batch parsing completed with errors:',
        expect.arrayContaining([
          expect.stringContaining('Failed to parse fight 1'),
          expect.stringContaining('Failed to parse fight 2'),
          expect.stringContaining('Failed to parse fight 3'),
        ])
      );

      // Restore the original method
      EsoLogParser.parseFightDirectory = originalParseFightDirectory;
    });
  });

  describe('parseEventFile - irrelevant event type filtering', () => {
    it('should filter out irrelevant event types', async () => {
      const mockData = {
        reportData: {
          report: {
            events: {
              data: [
                // Relevant events
                createMockEvent({ type: 'cast', abilityGameID: 123 }),
                createMockEvent({ type: 'damage', abilityGameID: 456 }),
                createMockEvent({ type: 'heal', abilityGameID: 789 }),
                // Irrelevant events (should be filtered out) - these should trigger line 272
                createMockEvent({ type: 'irrelevant_type_1', abilityGameID: 999 } as any),
                createMockEvent({ type: 'irrelevant_type_2', abilityGameID: 888 } as any),
                createMockEvent({ type: 'unknown_event', abilityGameID: 777 } as any),
              ] as ParsedLogEvent[],
            },
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/mixed-relevance.json');

      // Should only include relevant event types
      expect(result.events).toHaveLength(3);
      expect(result.events.every(e => 
        ['cast', 'applybuff', 'removebuff', 'applydebuff', 'removedebuff', 'damage', 'heal'].includes(e.type)
      )).toBe(true);
      expect(result.totalEvents).toBe(3);
    });

    it('should handle case where no events pass relevance filter', async () => {
      const mockData = {
        reportData: {
          report: {
            events: {
              data: [
                // All irrelevant events
                createMockEvent({ type: 'irrelevant_type_1', abilityGameID: 999 } as any),
                createMockEvent({ type: 'irrelevant_type_2', abilityGameID: 888 } as any),
                createMockEvent({ type: 'unknown_event', abilityGameID: 777 } as any),
              ] as ParsedLogEvent[],
            },
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseAllEvents('/test/all-irrelevant.json');

      expect(result.events).toHaveLength(0);
      expect(result.totalEvents).toBe(0);
      expect(result.eventsByType).toEqual({});
      expect(result.fightNumber).toBe(0);
    });
  });

  describe('event file categorization edge cases', () => {
    it('should handle mixed event types in categorized parsing', async () => {
      // Test that parseEventFile with allowedTypes parameter filters correctly
      const mockData = createMockLogData([
        { type: 'cast', abilityGameID: 123 },
        { type: 'damage', abilityGameID: 456 }, // Should be filtered out for cast-only parsing
        { type: 'cast', abilityGameID: 789 },
        { type: 'heal', abilityGameID: 101112 }, // Should be filtered out for cast-only parsing
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await EsoLogParser.parseCastEvents('/test/mixed-for-cast.json');

      // Should only include cast events
      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.type === 'cast')).toBe(true);
      expect(result.totalEvents).toBe(2);
      expect(result.eventsByType['cast']).toBe(2);
      expect(result.eventsByType['damage']).toBeUndefined();
      expect(result.eventsByType['heal']).toBeUndefined();
    });
  });

  describe('fight duration calculation edge cases', () => {
    it('should handle single event fight duration', async () => {
      (fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes('cast-events.json')) {
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([
              { type: 'cast', abilityGameID: 123, timestamp: 5000 },
            ])),
          };
        } else {
          return {
            ok: true,
            json: jest.fn().mockResolvedValue(createMockLogData([])),
          };
        }
      });

      const result = await EsoLogParser.parseFightDirectory('/test/single-event', 1);

      expect(result.startTime).toBe(5000);
      expect(result.endTime).toBe(5000);
      expect(result.duration).toBe(0);
      expect(result.allEvents).toHaveLength(1);
    });
  });
});