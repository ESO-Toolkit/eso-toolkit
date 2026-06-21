/**
 * Integration test for the new scribing architecture
 * Tests the basic flow from data loading through simulation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { JsonScribingDataRepository } from '../../infrastructure/data/JsonScribingDataRepository';
import { AbilityMappingService } from '../../core/services/AbilityMappingService';
import { ScribingSimulatorService } from '../../application/simulators/ScribingSimulatorService';
import { ScribingDetectionService } from '../../application/services/ScribingDetectionService';

// Real-data fixtures from the bundled data/scribing-complete.json. The
// repository now imports + adapts that dataset directly (no runtime fetch).
const GRIMOIRE_SLUG = 'traveling-knife';
const GRIMOIRE_NAME = 'Traveling Knife';
const FOCUS_SLUG = 'physical-damage'; // -> grimoire name "Sundering Knife"
const SIGNATURE_SLUG = 'lingering-torment';
const AFFIX_SLUG = 'off-balance';
const GRIMOIRE_WITH_ABILITY_ID = { ability: 217699, name: 'Banner Bearer' }; // banner-bearer

describe('Scribing Architecture Integration', () => {
  let repository: JsonScribingDataRepository;
  let mappingService: AbilityMappingService;
  let simulatorService: ScribingSimulatorService;
  let detectionService: ScribingDetectionService;

  beforeEach(() => {
    repository = new JsonScribingDataRepository();
    mappingService = new AbilityMappingService(repository);
    simulatorService = new ScribingSimulatorService(repository);
    detectionService = new ScribingDetectionService(mappingService);
  });

  describe('Data Repository', () => {
    it('should load scribing data successfully', async () => {
      const data = await repository.loadScribingData();

      expect(data).toBeDefined();
      expect(data.version).toBeTruthy();
      expect(Object.keys(data.grimoires).length).toBeGreaterThan(0);
    });

    it('should get grimoire by id', async () => {
      const grimoire = await repository.getGrimoire(GRIMOIRE_SLUG);

      expect(grimoire).toBeDefined();
      expect(grimoire?.name).toBe(GRIMOIRE_NAME);
    });

    it('should validate valid combination', async () => {
      const isValid = await repository.validateCombination(
        GRIMOIRE_SLUG,
        FOCUS_SLUG,
        SIGNATURE_SLUG,
        AFFIX_SLUG,
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid combination', async () => {
      const isValid = await repository.validateCombination(
        'non-existent',
        FOCUS_SLUG,
        SIGNATURE_SLUG,
        AFFIX_SLUG,
      );

      expect(isValid).toBe(false);
    });

    it('accepts a partial selection but rejects an unknown script (one contract)', async () => {
      // Empty slots are allowed (in-progress build).
      await expect(repository.validateCombination(GRIMOIRE_SLUG, FOCUS_SLUG, '', '')).resolves.toBe(
        true,
      );
      // A provided-but-unknown script id is invalid.
      await expect(
        repository.validateCombination(GRIMOIRE_SLUG, 'not-a-real-focus', '', ''),
      ).resolves.toBe(false);
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
      const isScribing = mappingService.isScribingAbility(GRIMOIRE_WITH_ABILITY_ID.ability);
      expect(isScribing).toBe(true);

      const isNotScribing = mappingService.isScribingAbility(99999999);
      expect(isNotScribing).toBe(false);
    });

    it('should get grimoire by ability id', () => {
      const grimoire = mappingService.getGrimoireByAbilityId(GRIMOIRE_WITH_ABILITY_ID.ability);

      expect(grimoire).toBeDefined();
      expect(grimoire?.name).toBe(GRIMOIRE_WITH_ABILITY_ID.name);
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
        grimoireId: GRIMOIRE_SLUG,
        focusScriptId: FOCUS_SLUG,
        signatureScriptId: SIGNATURE_SLUG,
        affixScriptId: AFFIX_SLUG,
      });

      expect(result.isValid).toBe(true);
      expect(result.calculatedSkill.name).toBeDefined();
      expect(result.combination.grimoire).toBe(GRIMOIRE_NAME);
      // The physical focus transforms "Traveling Knife" -> "Sundering Knife".
      expect(result.calculatedSkill.name).toBe('Sundering Knife');
      // Resource comes from the grimoire's dataset entry (stamina here).
      expect(result.calculatedSkill.resourceType).toBe('stamina');
    });

    it('should reject invalid grimoire', async () => {
      const result = await simulatorService.simulate({
        grimoireId: 'non-existent',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should reject an unknown script id instead of silently dropping it', async () => {
      const result = await simulatorService.simulate({
        grimoireId: GRIMOIRE_SLUG,
        focusScriptId: 'not-a-real-focus',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors?.some((e) => /Unknown script/i.test(e))).toBe(true);
    });

    it('validateCombination agrees with simulate for partial + bad selections', async () => {
      // Partial but valid (grimoire + one compatible focus).
      await expect(simulatorService.validateCombination(GRIMOIRE_SLUG, FOCUS_SLUG)).resolves.toBe(
        true,
      );
      // Unknown script id is invalid.
      await expect(
        simulatorService.validateCombination(GRIMOIRE_SLUG, 'not-a-real-focus'),
      ).resolves.toBe(false);
    });

    it('should get available combinations', async () => {
      const combinations = await simulatorService.getAvailableCombinations(GRIMOIRE_SLUG);

      expect(combinations.focusScripts.length).toBeGreaterThan(0);
      expect(combinations.signatureScripts.length).toBeGreaterThan(0);
      expect(combinations.affixScripts.length).toBeGreaterThan(0);
      expect(
        combinations.signatureScripts.some((s) => s.id === SIGNATURE_SLUG || s.name.length > 0),
      ).toBe(true);
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
    it('loads + validates the bundled dataset without throwing', async () => {
      // The dataset is bundled and adapted at import time, so the previous
      // network-failure path no longer exists; instead guarantee the bundled
      // data passes adapter + schema validation.
      const newRepository = new JsonScribingDataRepository();
      await expect(newRepository.loadScribingData()).resolves.toBeDefined();
    });

    it('should handle uninitialized mapping service', () => {
      const newMappingService = new AbilityMappingService(repository);

      expect(newMappingService.isReady()).toBe(false);
      expect(newMappingService.getScribingComponent(12345)).toEqual([]);
    });
  });
});
