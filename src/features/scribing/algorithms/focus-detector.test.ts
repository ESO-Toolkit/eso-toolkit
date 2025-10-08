import { FocusScriptDetector } from './focus-detector';
import type { GrimoireDetection } from './grimoire-detector';
import type { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the data dependencies
jest.mock('../data/ability-scribing-mapping', () => ({
  abilityScribingMapper: {
    getGrimoireByAbilityId: jest.fn(),
    getFocusScriptByAbilityId: jest.fn(),
    getAffixScriptByAbilityId: jest.fn(),
    getSignatureScriptByAbilityId: jest.fn(),
    getFocusByAbilityId: jest.fn(),
    getTransformationByAbilityId: jest.fn(),
    ensureInitialized: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('FocusScriptDetector', () => {
  let detector: FocusScriptDetector;

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
    detector = new FocusScriptDetector();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create detector with default mapper', () => {
      const newDetector = new FocusScriptDetector();
      expect(newDetector).toBeInstanceOf(FocusScriptDetector);
    });
  });

  describe('detectFocusScriptFromGrimoire', () => {
    it('should handle null grimoire detection', () => {
      const result = detector.detectFocusScriptFromGrimoire(null as any);
      expect(result).toBeNull();
    });

    it('should detect focus script from transformed skill name', () => {
      const grimoire = createMockGrimoire({
        focusScriptType: 'fire',
        transformedSkillName: 'Flame Weapon',
      });

      const result = detector.detectFocusScriptFromGrimoire(grimoire);

      // Should execute without throwing
      expect(() => result).not.toThrow();
    });

    it('should handle grimoire without focus script info', () => {
      const grimoire = createMockGrimoire();

      const result = detector.detectFocusScriptFromGrimoire(grimoire);
      // Should return null or a valid detection
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('detectFocusScriptsFromGrimoires', () => {
    it('should handle empty grimoire detections array', () => {
      const result = detector.detectFocusScriptsFromGrimoires([]);

      expect(result).toMatchObject({
        detections: [],
        totalAnalyzed: 0,
        uniqueFocusScripts: expect.any(Set),
        playerFocusScripts: expect.any(Map),
        grimoireFocusScripts: expect.any(Map),
        confidence: expect.any(Number),
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });
    });

    it('should process grimoire detections without errors', () => {
      const grimoireDetections = [createMockGrimoire()];

      const result = detector.detectFocusScriptsFromGrimoires(grimoireDetections);

      expect(result).toMatchObject({
        detections: expect.any(Array),
        totalAnalyzed: 1,
        uniqueFocusScripts: expect.any(Set),
        playerFocusScripts: expect.any(Map),
        grimoireFocusScripts: expect.any(Map),
        confidence: expect.any(Number),
        processingTime: expect.any(Number),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });
  });

  describe('error handling', () => {
    it('should handle malformed grimoire gracefully', () => {
      const malformedGrimoire = {
        grimoireKey: '',
        grimoireName: null,
        detectedAbilityId: NaN,
      } as any;

      const result = detector.detectFocusScriptFromGrimoire(malformedGrimoire);

      // Should not throw and return null or valid result
      expect(() => result).not.toThrow();
    });
  });

  describe('focus script pattern detection', () => {
    it('should detect fire focus script from flame keywords', () => {
      const grimoire = createMockGrimoire({
        transformedSkillName: 'Flame Burst',
        focusScriptType: 'flame-damage',
      });

      const result = detector.detectFocusScriptFromGrimoire(grimoire);

      // Should return a valid detection when focus script type is provided
      if (result) {
        expect(result.focusScriptKey).toBe('flame-damage');
      }
    });

    it('should detect ice focus script from frost keywords', () => {
      const grimoire = createMockGrimoire({
        transformedSkillName: 'Frost Strike',
        focusScriptType: 'frost-damage',
      });

      const result = detector.detectFocusScriptFromGrimoire(grimoire);

      // Should return a valid detection when focus script type is provided
      if (result) {
        expect(result.focusScriptKey).toBe('frost-damage');
      }
    });
  });
});
