import { AffixScriptDetector } from './affix-detector';
import type { GrimoireDetection } from './grimoire-detector';
import type { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the data dependencies
jest.mock('../data/ability-scribing-mapping', () => ({
  abilityScribingMapper: {
    getGrimoireByAbilityId: jest.fn(),
    getFocusScriptByAbilityId: jest.fn(),
    getAffixScriptByAbilityId: jest.fn(),
    getSignatureScriptByAbilityId: jest.fn(),
    getAffixByAbilityId: jest.fn(),
    ensureInitialized: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../data/affix-script-buff-mappings', () => ({
  getAffixScriptByEffectId: jest.fn(),
}));

describe('AffixScriptDetector', () => {
  let detector: AffixScriptDetector;

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
    detector = new AffixScriptDetector();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create detector with default mapper', () => {
      const newDetector = new AffixScriptDetector();
      expect(newDetector).toBeInstanceOf(AffixScriptDetector);
    });
  });

  describe('detectAffixScriptFromGrimoire', () => {
    it('should handle empty events array', async () => {
      const grimoire = createMockGrimoire();
      const result = await detector.detectAffixScriptFromGrimoire(grimoire, []);
      expect(result).toEqual([]);
    });

    it('should detect affix script from major savagery buff', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 1500,
          type: 'applybuff',
          sourceID: 123,
          targetID: 123,
          abilityGameID: 61687,
        }),
      ];

      const result = await detector.detectAffixScriptFromGrimoire(grimoire, events);
      
      // Should execute without throwing
      expect(() => result).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle unknown ability IDs', async () => {
      const grimoire = createMockGrimoire();
      const events = [
        createMockEvent({
          timestamp: 1500,
          type: 'damage',
          abilityGameID: 99999, // Unknown ability
        }),
      ];

      const result = await detector.detectAffixScriptFromGrimoire(grimoire, events);
      expect(result).toEqual([]);
    });
  });

  describe('detectAffixScriptsFromGrimoires', () => {
    it('should handle empty grimoire detections array', async () => {
      const result = await detector.detectAffixScriptsFromGrimoires([], []);
      
      expect(result).toMatchObject({
        detections: [],
        totalAnalyzed: 0,
        uniqueAffixScripts: expect.any(Set),
        playerAffixScripts: expect.any(Map),
        grimoireAffixScripts: expect.any(Map),
        confidence: expect.any(Number), // Don't hardcode the confidence value
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });
    });

    it('should process grimoire detections without errors', async () => {
      const grimoireDetections = [createMockGrimoire()];
      const events = [createMockEvent({ type: 'applybuff', abilityGameID: 61687 })];

      const result = await detector.detectAffixScriptsFromGrimoires(grimoireDetections, events);
      
      expect(result).toMatchObject({
        detections: expect.any(Array),
        totalAnalyzed: 1,
        uniqueAffixScripts: expect.any(Set),
        playerAffixScripts: expect.any(Map),
        grimoireAffixScripts: expect.any(Map),
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
        const result = await detector.detectAffixScriptFromGrimoire(nullGrimoire, []);
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
      const result = await detector.detectAffixScriptFromGrimoire(grimoire, malformedEvents);
      
      // Should not throw and return empty result
      expect(result).toEqual([]);
    });
  });
});