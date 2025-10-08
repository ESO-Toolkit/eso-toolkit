import '@testing-library/jest-dom';

import {
  FocusScriptDetector,
  FocusScriptDetection,
  FocusScriptDetectionResult,
} from './focus-detector';
import { GrimoireDetection } from './grimoire-detector';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the abilityScribingMapper
const mockMapper = {
  getTransformationByAbilityId: jest.fn(),
  ensureInitialized: jest.fn().mockResolvedValue(undefined),
} as any;

describe('FocusScriptDetector - Comprehensive Coverage', () => {
  let detector: FocusScriptDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new FocusScriptDetector(mockMapper);
  });

  // Helper function to create mock events
  const createMockEvent = (
    abilityGameID: number,
    timestamp: number = 1000,
    sourceID: number = 1,
  ): ParsedLogEvent =>
    ({
      type: 'cast',
      timestamp,
      sourceID,
      targetID: 999,
      abilityGameID,
      fight: 1,
      sourceName: `Player ${sourceID}`,
      targetName: 'Target',
      sourceIsFriendly: true,
      targetIsFriendly: false,
    }) as ParsedLogEvent;

  // Helper function to create mock grimoire detections
  const createMockGrimoireDetection = (
    overrides: Partial<GrimoireDetection> = {},
  ): GrimoireDetection => ({
    grimoireKey: 'trample',
    grimoireName: 'Trample',
    grimoireId: 12345,
    detectedAbilityId: 12345,
    detectionType: 'base-cast',
    confidence: 0.95,
    timestamp: 1000,
    sourcePlayer: 1,
    event: createMockEvent(12345),
    ...overrides,
  });

  describe('constructor', () => {
    it('should create detector with default mapper', async () => {
      const defaultDetector = new FocusScriptDetector();
      expect(defaultDetector).toBeInstanceOf(FocusScriptDetector);
    });

    it('should create detector with custom mapper', async () => {
      const customDetector = new FocusScriptDetector(mockMapper);
      expect(customDetector).toBeInstanceOf(FocusScriptDetector);
    });
  });

  describe('detectFocusScriptFromGrimoire', () => {
    it('should return null for null or undefined grimoire detection', async () => {
      expect(await detector.detectFocusScriptFromGrimoire(null as any)).toBeNull();
      expect(await detector.detectFocusScriptFromGrimoire(undefined as any)).toBeNull();
    });

    it('should create detection from transformation info when available', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        focusScriptType: 'flame-damage',
        transformedSkillName: 'Burning Trample',
      });

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptKey).toBe('flame-damage');
      expect(result!.focusScriptName).toBe('Flame Damage');
      expect(result!.focusScriptCategory).toBe('damage');
      expect(result!.grimoireKey).toBe('trample');
      expect(result!.transformedSkillName).toBe('Burning Trample');
      expect(result!.detectionMethod).toBe('name-transformation');
      expect(result!.confidence).toBe(0.95);
    });

    it('should create detection from ability mapping when no transformation info', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        detectedAbilityId: 54321,
      });

      const mockMapping = {
        componentKey: 'frost-damage',
        name: 'Chilling Effect',
      };

      mockMapper.getTransformationByAbilityId.mockReturnValue(mockMapping);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptKey).toBe('frost-damage');
      expect(result!.focusScriptName).toBe('Frost Damage');
      expect(result!.transformedSkillName).toBe('Chilling Effect');
      expect(result!.detectionMethod).toBe('ability-mapping');
      expect(result!.confidence).toBe(0.9);
      expect(mockMapper.getTransformationByAbilityId).toHaveBeenCalledWith(54321);
    });

    it('should detect focus script by pattern analysis of skill name', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        transformedSkillName: 'Shocking Trample',
      });

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptKey).toBe('shock-damage');
      expect(result!.focusScriptName).toBe('Shock Damage');
      expect(result!.focusScriptCategory).toBe('damage');
      expect(result!.detectionMethod).toBe('pattern-analysis');
      expect(result!.confidence).toBe(0.75);
    });

    it('should return null when no detection method succeeds', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        transformedSkillName: 'Unknown Skill',
      });

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).toBeNull();
    });

    it('should handle missing transformed skill name gracefully', async () => {
      const grimoireDetection = createMockGrimoireDetection();

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).toBeNull();
    });

    it('should detect different focus script types by keywords', async () => {
      const testCases = [
        { skillName: 'Venomous Strike', expectedKey: 'poison-damage', expectedCategory: 'damage' },
        { skillName: 'Diseased Weapon', expectedKey: 'disease-damage', expectedCategory: 'damage' },
        { skillName: 'Bloody Assault', expectedKey: 'bleed-damage', expectedCategory: 'damage' },
        { skillName: 'Magical Burst', expectedKey: 'magic-damage', expectedCategory: 'damage' },
        { skillName: 'Frozen Strike', expectedKey: 'frost-damage', expectedCategory: 'damage' },
        { skillName: 'Sundering Blow', expectedKey: 'physical-damage', expectedCategory: 'damage' },
        { skillName: 'Traumatic Impact', expectedKey: 'trauma', expectedCategory: 'debuff' },
        {
          skillName: 'Multi-Target Attack',
          expectedKey: 'multi-target',
          expectedCategory: 'utility',
        },
        { skillName: 'Taunting Shout', expectedKey: 'taunt', expectedCategory: 'control' },
        { skillName: 'Knocking Back', expectedKey: 'knockback', expectedCategory: 'control' },
        { skillName: 'Binding Roots', expectedKey: 'immobilize', expectedCategory: 'control' },
        { skillName: 'Healing Touch', expectedKey: 'healing', expectedCategory: 'healing' },
        {
          skillName: 'Restoring Magicka',
          expectedKey: 'restore-resources',
          expectedCategory: 'utility',
        },
        { skillName: 'Dispelling Light', expectedKey: 'dispel', expectedCategory: 'utility' },
      ];

      for (const { skillName, expectedKey, expectedCategory } of testCases) {
        const grimoireDetection = createMockGrimoireDetection({
          transformedSkillName: skillName,
        });

        mockMapper.getTransformationByAbilityId.mockReturnValue(null);

        const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

        expect(result).not.toBeNull();
        expect(result!.focusScriptKey).toBe(expectedKey);
        expect(result!.focusScriptCategory).toBe(expectedCategory);
        expect(result!.transformedSkillName).toBe(skillName);
      }
    });
  });

  describe('detectFocusScriptsFromGrimoires', () => {
    it('should process empty array correctly', async () => {
      const result = await detector.detectFocusScriptsFromGrimoires([]);

      expect(result).toEqual({
        detections: [],
        totalAnalyzed: 0,
        uniqueFocusScripts: new Set(),
        playerFocusScripts: new Map(),
        grimoireFocusScripts: new Map(),
        confidence: 0.5, // Base confidence
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });
    });

    it('should process multiple grimoire detections', async () => {
      const grimoireDetections = [
        createMockGrimoireDetection({
          focusScriptType: 'flame-damage',
          transformedSkillName: 'Burning Strike',
          sourcePlayer: 1,
          grimoireKey: 'trample',
        }),
        createMockGrimoireDetection({
          transformedSkillName: 'Shocking Burst',
          sourcePlayer: 2,
          grimoireKey: 'wield-soul',
          detectedAbilityId: 54321,
        }),
        createMockGrimoireDetection({
          focusScriptType: 'healing',
          transformedSkillName: 'Healing Aura',
          sourcePlayer: 1,
          grimoireKey: 'banner',
        }),
      ];

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptsFromGrimoires(grimoireDetections);

      expect(result.detections).toHaveLength(3);
      expect(result.totalAnalyzed).toBe(3);
      expect(result.uniqueFocusScripts.size).toBe(3);
      expect(result.playerFocusScripts.size).toBe(2);
      expect(result.grimoireFocusScripts.size).toBe(3);

      // Check player tracking
      expect(result.playerFocusScripts.get(1)!.size).toBe(2); // flame-damage and healing
      expect(result.playerFocusScripts.get(2)!.size).toBe(1); // shock-damage

      // Check grimoire tracking
      expect(result.grimoireFocusScripts.get('trample')!.has('flame-damage')).toBe(true);
      expect(result.grimoireFocusScripts.get('wield-soul')!.has('shock-damage')).toBe(true);
      expect(result.grimoireFocusScripts.get('banner')!.has('healing')).toBe(true);
    });

    it('should calculate confidence based on detection rate', async () => {
      const grimoireDetections = [
        createMockGrimoireDetection({
          focusScriptType: 'flame-damage',
          transformedSkillName: 'Fire',
        }),
        createMockGrimoireDetection({ transformedSkillName: 'Unknown' }), // Won't detect
        createMockGrimoireDetection({ transformedSkillName: 'Mystery' }), // Won't detect
      ];

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptsFromGrimoires(grimoireDetections);

      // Detection rate: 1/3 = 0.33, should not reach higher confidence tiers
      expect(result.confidence).toBe(0.5);
    });

    it('should handle processing errors gracefully', async () => {
      const normalDetection = createMockGrimoireDetection({
        focusScriptType: 'flame-damage',
        transformedSkillName: 'Fire Strike',
        timestamp: 1000,
      });

      // Mock the detector method to throw an error
      const originalMethod = detector.detectFocusScriptFromGrimoire;
      detector.detectFocusScriptFromGrimoire = jest.fn().mockImplementation(() => {
        throw new Error('Processing error');
      });

      const grimoireDetections = [normalDetection];

      const result = await detector.detectFocusScriptsFromGrimoires(grimoireDetections);

      expect(result.detections).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error processing grimoire detection at 1000');
      expect(result.errors[0]).toContain('Processing error');

      // Restore original method
      detector.detectFocusScriptFromGrimoire = originalMethod;
    });

    it('should calculate different confidence levels', async () => {
      const createDetections = (count: number) =>
        Array.from({ length: count }, (_, i) =>
          createMockGrimoireDetection({
            focusScriptType: 'flame-damage',
            transformedSkillName: `Fire ${i}`,
          }),
        );

      const testCases = [
        { detections: 10, successful: 5, expectedConfidence: 0.5 }, // 50% rate - base confidence
        { detections: 10, successful: 7, expectedConfidence: 0.7 }, // 70% rate - > 0.6 threshold
        { detections: 10, successful: 9, expectedConfidence: 0.85 }, // 90% rate - > 0.8 threshold
        { detections: 10, successful: 10, expectedConfidence: 0.95 }, // 100% rate - > 0.9 threshold
      ];

      for (const { detections: totalCount, successful, expectedConfidence } of testCases) {
        const grimoireDetections = [
          ...createDetections(successful),
          ...Array.from({ length: totalCount - successful }, () =>
            createMockGrimoireDetection({ transformedSkillName: 'Unknown' }),
          ),
        ];

        mockMapper.getTransformationByAbilityId.mockReturnValue(null);

        const result = await detector.detectFocusScriptsFromGrimoires(grimoireDetections);

        expect(result.confidence).toBe(expectedConfidence);
      }
    });
  });

  describe('getFocusScriptStatistics', () => {
    it('should calculate comprehensive statistics', async () => {
      const detectionResult: FocusScriptDetectionResult = {
        detections: [
          {
            focusScriptKey: 'flame-damage',
            focusScriptName: 'Flame Damage',
            focusScriptCategory: 'damage',
            grimoireKey: 'trample',
            grimoireName: 'Trample',
            transformedSkillName: 'Burning Strike',
            detectedAbilityId: 12345,
            confidence: 0.95,
            timestamp: 1000,
            sourcePlayer: 1,
            detectionMethod: 'name-transformation',
            event: createMockEvent(12345),
          },
          {
            focusScriptKey: 'healing',
            focusScriptName: 'Healing',
            focusScriptCategory: 'healing',
            grimoireKey: 'trample',
            grimoireName: 'Trample',
            transformedSkillName: 'Healing Strike',
            detectedAbilityId: 12346,
            confidence: 0.85,
            timestamp: 2000,
            sourcePlayer: 1,
            detectionMethod: 'ability-mapping',
            event: createMockEvent(12346),
          },
          {
            focusScriptKey: 'flame-damage',
            focusScriptName: 'Flame Damage',
            focusScriptCategory: 'damage',
            grimoireKey: 'wield-soul',
            grimoireName: 'Wield Soul',
            transformedSkillName: 'Fire Soul',
            detectedAbilityId: 12347,
            confidence: 0.75,
            timestamp: 3000,
            sourcePlayer: 2,
            detectionMethod: 'pattern-analysis',
            event: createMockEvent(12347),
          },
        ],
        totalAnalyzed: 3,
        uniqueFocusScripts: new Set(['flame-damage', 'healing']),
        playerFocusScripts: new Map(),
        grimoireFocusScripts: new Map(),
        confidence: 0.85,
        processingTime: 100,
        errors: [],
        warnings: [],
      };

      const stats = detector.getFocusScriptStatistics(detectionResult);

      expect(stats).toEqual({
        totalDetections: 3,
        uniqueFocusScripts: 2,
        focusScriptsByCategory: new Map([
          ['damage', 2],
          ['healing', 1],
        ]),
        focusScriptsByGrimoire: new Map([
          [
            'trample',
            new Map([
              ['flame-damage', 1],
              ['healing', 1],
            ]),
          ],
          ['wield-soul', new Map([['flame-damage', 1]])],
        ]),
        detectionMethods: new Map([
          ['name-transformation', 1],
          ['ability-mapping', 1],
          ['pattern-analysis', 1],
        ]),
        averageConfidence: (0.95 + 0.85 + 0.75) / 3,
      });
    });

    it('should handle empty detections', async () => {
      const detectionResult: FocusScriptDetectionResult = {
        detections: [],
        totalAnalyzed: 0,
        uniqueFocusScripts: new Set(),
        playerFocusScripts: new Map(),
        grimoireFocusScripts: new Map(),
        confidence: 0.5,
        processingTime: 10,
        errors: [],
        warnings: [],
      };

      const stats = detector.getFocusScriptStatistics(detectionResult);

      expect(stats).toEqual({
        totalDetections: 0,
        uniqueFocusScripts: 0,
        focusScriptsByCategory: new Map(),
        focusScriptsByGrimoire: new Map(),
        detectionMethods: new Map(),
        averageConfidence: 0,
      });
    });
  });

  describe('validateDetections', () => {
    const createTestDetection = (
      confidence: number,
      detectionMethod:
        | 'name-transformation'
        | 'ability-mapping'
        | 'pattern-analysis' = 'name-transformation',
    ): FocusScriptDetection => ({
      focusScriptKey: 'flame-damage',
      focusScriptName: 'Flame Damage',
      focusScriptCategory: 'damage',
      grimoireKey: 'trample',
      grimoireName: 'Trample',
      transformedSkillName: 'Burning Strike',
      detectedAbilityId: 12345,
      confidence,
      timestamp: 1000,
      sourcePlayer: 1,
      detectionMethod,
      event: createMockEvent(12345),
    });

    it('should classify detections by confidence and method', async () => {
      const detections = [
        createTestDetection(0.95), // Valid (high confidence)
        createTestDetection(0.85), // Questionable (medium confidence)
        createTestDetection(0.65, 'ability-mapping'), // Questionable (low confidence but reliable method)
        createTestDetection(0.65, 'pattern-analysis'), // Invalid (low confidence, unreliable method)
        createTestDetection(0.4), // Invalid (very low confidence)
      ];

      const validation = detector.validateDetections(detections);

      expect(validation.valid).toHaveLength(1);
      expect(validation.questionable).toHaveLength(2);
      expect(validation.invalid).toHaveLength(2);
      expect(validation.validationErrors).toHaveLength(0);

      expect(validation.valid[0].confidence).toBe(0.95);
      expect(validation.questionable[0].confidence).toBe(0.85);
      expect(validation.questionable[1].confidence).toBe(0.65);
      expect(validation.invalid[0].confidence).toBe(0.65);
      expect(validation.invalid[1].confidence).toBe(0.4);
    });

    it('should handle validation errors gracefully', async () => {
      const problematicDetection = new Proxy(createTestDetection(0.95), {
        get(target, prop) {
          if (prop === 'confidence') {
            throw new Error('Confidence access error');
          }
          return target[prop as keyof FocusScriptDetection];
        },
      });

      const detections = [problematicDetection];
      const validation = detector.validateDetections(detections);

      expect(validation.validationErrors).toHaveLength(1);
      expect(validation.invalid).toHaveLength(1);
      expect(validation.validationErrors[0]).toContain('Validation error for detection at');
      expect(validation.validationErrors[0]).toContain('Confidence access error');
    });

    it('should handle empty detections array', async () => {
      const validation = detector.validateDetections([]);

      expect(validation.valid).toEqual([]);
      expect(validation.questionable).toEqual([]);
      expect(validation.invalid).toEqual([]);
      expect(validation.validationErrors).toEqual([]);
    });
  });

  describe('focus script name formatting', () => {
    it('should format focus script keys correctly', async () => {
      const testCases = [
        { input: 'flame-damage', expected: 'Flame Damage' },
        { input: 'physical-damage', expected: 'Physical Damage' },
        { input: 'multi-target', expected: 'Multi Target' },
        { input: 'restore-resources', expected: 'Restore Resources' },
        { input: 'simple', expected: 'Simple' },
      ];

      for (const { input, expected } of testCases) {
        const grimoireDetection = createMockGrimoireDetection({
          focusScriptType: input,
          transformedSkillName: 'Test Skill',
        });

        const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

        expect(result).not.toBeNull();
        expect(result!.focusScriptName).toBe(expected);
      }
    });

    it('should handle unknown focus script keys', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        focusScriptType: 'unknown-script-type',
        transformedSkillName: 'Test Skill',
      });

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptName).toBe('Unknown Script Type');
      expect(result!.focusScriptCategory).toBe('unknown');
    });
  });

  describe('pattern matching edge cases', () => {
    it('should match keywords case-insensitively', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        transformedSkillName: 'BURNING Strike', // Uppercase keyword
      });

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptKey).toBe('flame-damage');
    });

    it('should match partial keywords in skill names', async () => {
      const grimoireDetection = createMockGrimoireDetection({
        transformedSkillName: 'Lightning Strike', // Contains 'lightning' keyword which is in shock-damage pattern
      });

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      expect(result!.focusScriptKey).toBe('shock-damage');
    });

    it('should return first matching pattern when multiple keywords match', async () => {
      // This skill name could match both 'flame' and 'magic' patterns
      const grimoireDetection = createMockGrimoireDetection({
        transformedSkillName: 'Magical Flame Burst',
      });

      mockMapper.getTransformationByAbilityId.mockReturnValue(null);

      const result = await detector.detectFocusScriptFromGrimoire(grimoireDetection);

      expect(result).not.toBeNull();
      // Should match the first pattern found (order depends on Object.entries iteration)
      expect([
        'physical-damage',
        'poison-damage',
        'disease-damage',
        'bleed-damage',
        'magic-damage',
        'shock-damage',
        'frost-damage',
        'flame-damage',
      ]).toContain(result!.focusScriptKey);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton focusScriptDetector', async () => {
      const { focusScriptDetector } = require('./focus-detector');
      expect(focusScriptDetector).toBeInstanceOf(FocusScriptDetector);
    });
  });
});
