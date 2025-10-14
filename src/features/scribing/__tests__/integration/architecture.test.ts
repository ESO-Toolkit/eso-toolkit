/**
 * Integration test for the new scribing architecture
 * Tests the basic flow from data loading through simulation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { JsonScribingDataRepository } from '../../infrastructure/data/JsonScribingDataRepository';
import { AbilityMappingService } from '../../core/services/AbilityMappingService';
import { ScribingSimulatorService } from '../../application/simulators/ScribingSimulatorService';
import { ScribingDetectionService } from '../../application/services/ScribingDetectionService';

// Mock fetch for testing
global.fetch = jest.fn();

const mockScribingData = {
  version: '1.0.0',
  description: 'Test data',
  lastUpdated: '2025-01-01',
  grimoires: {
    'test-grimoire': {
      id: 'test-grimoire',
      name: 'Test Grimoire',
      skillLine: 'Support',
      requirements: null,
      cost: { first: 100, additional: 50 },
      description: 'A test grimoire',
      abilityIds: [12345],
    },
  },
  focusScripts: {
    'test-focus': {
      id: 'test-focus',
      name: 'Test Focus',
      type: 'Focus',
      icon: 'test-icon',
      compatibleGrimoires: ['test-grimoire'],
      description: 'A test focus script',
      damageType: 'physical',
    },
  },
  signatureScripts: {
    'test-signature': {
      id: 'test-signature',
      name: 'Test Signature',
      type: 'Signature',
      icon: 'test-icon',
      compatibleGrimoires: ['test-grimoire'],
      description: 'A test signature script',
    },
  },
  affixScripts: {
    'test-affix': {
      id: 'test-affix',
      name: 'Test Affix',
      type: 'Affix',
      icon: 'test-icon',
      compatibleGrimoires: ['test-grimoire'],
      description: 'A test affix script',
    },
  },
  questRewards: {},
  freeScriptLocations: {},
  dailyScriptSources: {
    'focus-scripts': [],
    'signature-scripts': [],
    'affix-scripts': [],
  },
  scriptVendors: {},
  luminousInk: {
    description: 'Test ink',
    costs: { newSkill: 1, modifySkill: 1 },
    sources: [],
    storage: 'Test storage',
  },
  system: {
    totalPossibleSkills: 1000,
    grimoireRange: { min: 1, max: 12 },
    requirements: {
      chapter: 'Test Chapter',
      characterLevel: 1,
      tutorialQuest: 'Test Quest',
    },
  },
};

describe('Scribing Architecture Integration', () => {
  let repository: JsonScribingDataRepository;
  let mappingService: AbilityMappingService;
  let simulatorService: ScribingSimulatorService;
  let detectionService: ScribingDetectionService;

  beforeEach(() => {
    // Mock successful fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockScribingData,
    });

    // Initialize services
    repository = new JsonScribingDataRepository();
    mappingService = new AbilityMappingService(repository);
    simulatorService = new ScribingSimulatorService(repository);
    detectionService = new ScribingDetectionService(mappingService);
  });

  describe('Data Repository', () => {
    it('should load scribing data successfully', async () => {
      const data = await repository.loadScribingData();

      expect(data).toBeDefined();
      expect(data.version).toBe('1.0.0');
      expect(Object.keys(data.grimoires)).toHaveLength(1);
    });

    it('should get grimoire by id', async () => {
      const grimoire = await repository.getGrimoire('test-grimoire');

      expect(grimoire).toBeDefined();
      expect(grimoire?.name).toBe('Test Grimoire');
    });

    it('should validate valid combination', async () => {
      const isValid = await repository.validateCombination(
        'test-grimoire',
        'test-focus',
        'test-signature',
        'test-affix',
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid combination', async () => {
      const isValid = await repository.validateCombination(
        'non-existent',
        'test-focus',
        'test-signature',
        'test-affix',
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Ability Mapping Service', () => {
    beforeEach(async () => {
      await mappingService.initialize();
    });

    it('should initialize successfully', () => {
      expect(mappingService.isReady()).toBe(true);
    });

    it('should detect scribing abilities', () => {
      const isScribing = mappingService.isScribingAbility(12345);
      expect(isScribing).toBe(true);

      const isNotScribing = mappingService.isScribingAbility(99999);
      expect(isNotScribing).toBe(false);
    });

    it('should get grimoire by ability id', () => {
      const grimoire = mappingService.getGrimoireByAbilityId(12345);

      expect(grimoire).toBeDefined();
      expect(grimoire?.name).toBe('Test Grimoire');
      expect(grimoire?.type).toBe('grimoire');
    });

    it('should provide mapping statistics', () => {
      const stats = mappingService.getStats();

      expect(stats.totalGrimoires).toBeGreaterThan(0);
      expect(stats.totalMappings).toBeGreaterThan(0);
    });
  });

  describe('Simulator Service', () => {
    it('should simulate valid combination', async () => {
      const result = await simulatorService.simulate({
        grimoireId: 'test-grimoire',
        focusScriptId: 'test-focus',
        signatureScriptId: 'test-signature',
        affixScriptId: 'test-affix',
      });

      expect(result.isValid).toBe(true);
      expect(result.calculatedSkill.name).toBeDefined();
      expect(result.calculatedSkill.cost).toBeGreaterThan(0);
      expect(result.combination.grimoire).toBe('Test Grimoire');
    });

    it('should reject invalid grimoire', async () => {
      const result = await simulatorService.simulate({
        grimoireId: 'non-existent',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should get available combinations', async () => {
      const combinations = await simulatorService.getAvailableCombinations('test-grimoire');

      expect(combinations.focusScripts).toHaveLength(1);
      expect(combinations.signatureScripts).toHaveLength(1);
      expect(combinations.affixScripts).toHaveLength(1);
      expect(combinations.focusScripts[0].name).toBe('Test Focus');
    });
  });

  describe('Detection Service', () => {
    beforeEach(async () => {
      await mappingService.initialize();
    });

    it('should detect scribing combinations', async () => {
      const context = {
        playerId: 1,
        playerName: 'Test Player',
        fightData: {
          castEvents: [
            { sourceID: 1, abilityGameID: 12345, timestamp: 1000 },
            { sourceID: 1, abilityGameID: 12345, timestamp: 2000 },
          ],
          damageEvents: [{ sourceID: 1, abilityGameID: 12345, timestamp: 1500 }],
        },
      };

      const result = await detectionService.detectScribingCombinations(context);

      expect(result.playerId).toBe(1);
      expect(result.playerName).toBe('Test Player');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.analysisTimestamp).toBeDefined();
    });

    it('should handle empty fight data', async () => {
      const context = {
        playerId: 1,
        playerName: 'Test Player',
        fightData: {
          castEvents: [],
          damageEvents: [],
        },
      };

      const result = await detectionService.detectScribingCombinations(context);

      expect(result.detectedCombinations).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should provide detection statistics', () => {
      const stats = detectionService.getDetectionStats();

      expect(stats.totalStrategies).toBeGreaterThan(0);
      expect(stats.strategyNames).toContain('GrimoireDetection');
      expect(stats.averageConfidenceThreshold).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock fetch failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    });

    it('should handle data loading failures gracefully', async () => {
      const newRepository = new JsonScribingDataRepository();

      await expect(newRepository.loadScribingData()).rejects.toThrow(
        'Failed to load scribing data',
      );
    });

    it('should handle uninitialized mapping service', () => {
      const newMappingService = new AbilityMappingService(repository);

      expect(newMappingService.isReady()).toBe(false);
      expect(newMappingService.getScribingComponent(12345)).toEqual([]);
    });
  });
});
