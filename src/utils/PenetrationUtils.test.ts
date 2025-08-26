import { KnownAbilities, PenetrationValues } from '../types/abilities';
import { DebuffEvent, CombatantInfoEvent, CombatantAura } from '../types/combatlogEvents';

import { createDebuffLookup } from './BuffLookupUtils';
import {
  getAllPenetrationSourcesWithActiveState,
  calculateStaticPenetration,
  calculateDynamicPenetrationAtTimestamp,
  calculatePenetrationAtTimestamp,
} from './PenetrationUtils';

describe('PenetrationUtils', () => {
  describe('getAllPenetrationSourcesWithActiveState', () => {
    it('should return all penetration sources with inactive state when no data provided', () => {
      const sources = getAllPenetrationSourcesWithActiveState(null, null, null);

      expect(sources).toBeDefined();
      expect(sources.length).toBeGreaterThan(0);

      // All sources should be inactive when no data is provided
      sources.forEach((source) => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('description');
        expect(source).toHaveProperty('value');
        expect(source).toHaveProperty('wasActive');
        expect(source.wasActive).toBe(false);
        // For non-computed sources, value shows the potential penetration even when not active
        // For computed sources, value should be 0 when not active
        if (source.name.includes('Concentration')) {
          expect(source.value).toBe(0);
        } else {
          expect(source.value).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should detect active aura sources when combatant info has auras', () => {
      const mockCombatantInfo: CombatantInfoEvent = {
        timestamp: 1000,
        type: 'combatantinfo',
        sourceID: 1,
        fight: 1,
        gear: [],
        auras: [
          {
            source: 1,
            ability: KnownAbilities.VELOTHI_UR_MAGE_BUFF,
            name: 'Velothi',
            icon: 'icon',
            stacks: 1,
          } as CombatantAura,
        ],
      };

      const sources = getAllPenetrationSourcesWithActiveState(null, null, mockCombatantInfo);

      // Find Velothi Ur-Mage amulet source
      const velothiSource = sources.find((s) => s.name.includes('Velothi'));
      expect(velothiSource).toBeDefined();
      expect(velothiSource?.wasActive).toBe(true);
      expect(velothiSource?.value).toBe(PenetrationValues.VELOTHI_UR_MAGE_AMULET);
    });
  });

  describe('calculateStaticPenetration', () => {
    it('should return 0 for null combatant info', () => {
      const result = calculateStaticPenetration(null, undefined);
      expect(result).toBe(0);
    });

    it('should calculate penetration from auras', () => {
      const mockCombatantInfo: CombatantInfoEvent = {
        timestamp: 1000,
        type: 'combatantinfo',
        sourceID: 1,
        fight: 1,
        gear: [],
        auras: [
          {
            source: 1,
            ability: KnownAbilities.VELOTHI_UR_MAGE_BUFF,
            name: 'Velothi',
            icon: 'icon',
            stacks: 1,
          } as CombatantAura,
        ],
      };

      const result = calculateStaticPenetration(mockCombatantInfo, undefined);

      // Should include Velothi Ur-Mage amulet penetration
      expect(result).toBe(PenetrationValues.VELOTHI_UR_MAGE_AMULET);
    });
  });

  describe('calculateDynamicPenetrationAtTimestamp', () => {
    it('should return 0 when no lookups provided', () => {
      const result = calculateDynamicPenetrationAtTimestamp(null, null, 1000);
      expect(result).toBe(0);
    });

    it('should calculate penetration from active debuffs', () => {
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 500,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
        {
          timestamp: 1500,
          type: 'removedebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
      ];

      const debuffLookup = createDebuffLookup(debuffEvents);

      // Test timestamp during debuff
      const resultDuringDebuff = calculateDynamicPenetrationAtTimestamp(null, debuffLookup, 1000);
      expect(resultDuringDebuff).toBe(PenetrationValues.MAJOR_BREACH);

      // Test timestamp before debuff
      const resultBeforeDebuff = calculateDynamicPenetrationAtTimestamp(null, debuffLookup, 100);
      expect(resultBeforeDebuff).toBe(0);

      // Test timestamp after debuff
      const resultAfterDebuff = calculateDynamicPenetrationAtTimestamp(null, debuffLookup, 2000);
      expect(resultAfterDebuff).toBe(0);
    });
  });

  describe('calculatePenetrationAtTimestamp', () => {
    it('should combine static and dynamic penetration', () => {
      const mockCombatantInfo: CombatantInfoEvent = {
        timestamp: 1000,
        type: 'combatantinfo',
        sourceID: 1,
        fight: 1,
        gear: [],
        auras: [
          {
            source: 1,
            ability: KnownAbilities.VELOTHI_UR_MAGE_BUFF,
            name: 'Velothi',
            icon: 'icon',
            stacks: 1,
          } as CombatantAura,
        ],
      };

      // Setup dynamic penetration from debuffs
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 500,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
      ];

      const debuffLookup = createDebuffLookup(debuffEvents);

      const staticResult = calculateStaticPenetration(mockCombatantInfo, undefined);
      const dynamicResult = calculateDynamicPenetrationAtTimestamp(null, debuffLookup, 1000);
      const totalResult = calculatePenetrationAtTimestamp(
        null,
        debuffLookup,
        mockCombatantInfo,
        undefined,
        1000
      );

      expect(totalResult).toBe(staticResult + dynamicResult);
      expect(totalResult).toBeGreaterThan(staticResult);
      expect(totalResult).toBeGreaterThan(dynamicResult);
    });

    it('should handle null inputs gracefully', () => {
      const result = calculatePenetrationAtTimestamp(null, null, null, undefined, 1000);
      expect(result).toBe(0);
    });
  });
});
