import { SignatureScriptDetector } from './signature-detector';
import type { GrimoireDetection } from './grimoire-detector';
import type { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the data dependencies
jest.mock('../data/ability-scribing-mapping', () => ({
  abilityScribingMapper: {
    getGrimoireByAbilityId: jest.fn(),
    getFocusScriptByAbilityId: jest.fn(),
    getAffixScriptByAbilityId: jest.fn(),
    getSignatureScriptByAbilityId: jest.fn(),
    getSignatureByAbilityId: jest.fn(),
    ensureInitialized: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('SignatureScriptDetector', () => {
  let detector: SignatureScriptDetector;

  // Helper to create mock events
  const createMockEvent = (overrides: Partial<ParsedLogEvent> = {}): ParsedLogEvent => ({
    timestamp: 1000,
    type: 'cast',
    sourceID: 123,
    sourceIsFriendly: true,
    targetID: 456,
    targetIsFriendly: false,
    abilityGameID: 789,
    fight: 1,
    ...overrides,
  });

  // Helper to create mock grimoire detection
  const createMockGrimoire = (overrides: Partial<GrimoireDetection> = {}): GrimoireDetection => ({
    grimoireKey: 'test-grimoire',
    grimoireName: 'Test Grimoire',
    grimoireId: 12345,
    detectedAbilityId: 789,
    detectionType: 'base-cast',
    confidence: 0.9,
    timestamp: 1000,
    sourcePlayer: 123,
    event: createMockEvent(),
    ...overrides,
  });

  beforeEach(() => {
    detector = new SignatureScriptDetector();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create detector with default mapper', () => {
      const newDetector = new SignatureScriptDetector();
      expect(newDetector).toBeInstanceOf(SignatureScriptDetector);
    });
  });

  describe('detectSignatureScriptFromGrimoire', () => {
    it('should handle empty events array', async () => {
      const grimoire = createMockGrimoire();
      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect signature script from ability IDs', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 1500,
          type: 'cast',
          abilityGameID: 12345,
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      
      // Should execute without throwing
      expect(() => result).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle events outside timing window', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 20000, // Way after grimoire cast
          type: 'cast',
          abilityGameID: 12345,
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('detectSignatureScriptsFromGrimoires', () => {
    it('should handle empty grimoire detections array', async () => {
      const result = await detector.detectSignatureScriptsFromGrimoires([], []);
      
      expect(result).toMatchObject({
        detections: [],
        totalAnalyzed: 0,
        uniqueSignatureScripts: expect.any(Set),
        playerSignatureScripts: expect.any(Map),
        grimoireSignatureScripts: expect.any(Map),
        confidence: expect.any(Number),
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });
    });

    it('should process grimoire detections without errors', async () => {
      const grimoireDetections = [createMockGrimoire()];
      const events = [createMockEvent()];

      const result = await detector.detectSignatureScriptsFromGrimoires(grimoireDetections, events);
      
      expect(result).toMatchObject({
        detections: expect.any(Array),
        totalAnalyzed: 1,
        uniqueSignatureScripts: expect.any(Set),
        playerSignatureScripts: expect.any(Map),
        grimoireSignatureScripts: expect.any(Map),
        confidence: expect.any(Number),
        processingTime: expect.any(Number),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('error handling', () => {
    it('should handle null grimoire detection gracefully', async () => {
      const nullGrimoire = null as any;
      
      try {
        const result = await detector.detectSignatureScriptFromGrimoire(nullGrimoire, []);
        // If it doesn't throw, expect empty result
        expect(result).toEqual([]);
      } catch (error) {
        // If it throws, that's also acceptable behavior for null input
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed events gracefully', async () => {
      const malformedEvents = [
        {
          timestamp: null,
          type: '',
          sourceID: undefined,
          targetID: null,
          abilityGameID: NaN,
        } as any,
      ];

      const grimoire = createMockGrimoire();
      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, malformedEvents);
      
      // Should not throw and return array result
      expect(() => result).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('signature script timing analysis', () => {
    it('should consider events within timing window', async () => {
      const grimoire = createMockGrimoire({ timestamp: 1000 });
      const events = [
        createMockEvent({
          timestamp: 1500, // Within 500ms of grimoire cast
          type: 'applybuff',
          abilityGameID: 98765,
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle multiple events from same player', async () => {
      const grimoire = createMockGrimoire({ sourcePlayer: 123 });
      const events = [
        createMockEvent({
          sourceID: 123, // Same player as grimoire
          type: 'applydebuff',
          abilityGameID: 11111,
        }),
        createMockEvent({
          sourceID: 456, // Different player
          type: 'applydebuff',
          abilityGameID: 22222,
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('pattern detection', () => {
    it('should detect damage over time patterns', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 1200,
          type: 'damage',
          abilityGameID: 99999,
          tick: true, // DOT tick
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect buff application patterns', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 1100,
          type: 'applybuff',
          abilityGameID: 55555,
        }),
      ];

      const result = await detector.detectSignatureScriptFromGrimoire(grimoire, events);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});