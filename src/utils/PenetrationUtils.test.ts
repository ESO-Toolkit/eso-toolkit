import { KnownAbilities, PenetrationValues } from '../types/abilities';
import { DebuffEvent, CombatantInfoEvent, CombatantAura } from '../types/combatlogEvents';

import { createDebuffLookup, createBuffLookup } from './BuffLookupUtils';
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
      const result = calculateDynamicPenetrationAtTimestamp(null, null, 1000, null, null);
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
      const resultDuringDebuff = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        null
      );
      expect(resultDuringDebuff).toBe(PenetrationValues.MAJOR_BREACH);

      // Test timestamp before debuff
      const resultBeforeDebuff = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        100,
        null,
        null
      );
      expect(resultBeforeDebuff).toBe(0);

      // Test timestamp after debuff
      const resultAfterDebuff = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        2000,
        null,
        null
      );
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
      const dynamicResult = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        null
      );
      const totalResult = calculatePenetrationAtTimestamp(
        null,
        debuffLookup,
        mockCombatantInfo,
        undefined,
        1000,
        null,
        null
      );

      expect(totalResult).toBe(staticResult + dynamicResult);
      expect(totalResult).toBeGreaterThan(staticResult);
      expect(totalResult).toBeGreaterThan(dynamicResult);
    });

    it('should handle null inputs gracefully', () => {
      const result = calculatePenetrationAtTimestamp(null, null, null, undefined, 1000, null, null);
      expect(result).toBe(0);
    });

    it('should filter buffs by player and debuffs by target correctly', () => {
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 500,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2, // Target 2
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
        {
          timestamp: 500,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 3, // Target 3
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
        {
          timestamp: 1500,
          type: 'removedebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2, // Remove from Target 2
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
        // Target 3 keeps the debuff
      ];

      const debuffLookup = createDebuffLookup(debuffEvents);

      // Test timestamp during debuff - should be target-specific
      const resultForTarget2 = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        2
      );
      const resultForTarget3 = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        3
      );
      const resultForTarget4 = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        4
      );
      const resultWithoutTarget = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        1000,
        null,
        null
      );

      // Target 2 should have the debuff at timestamp 1000
      expect(resultForTarget2).toBe(PenetrationValues.MAJOR_BREACH);

      // Target 3 should have the debuff at timestamp 1000
      expect(resultForTarget3).toBe(PenetrationValues.MAJOR_BREACH);

      // Target 4 should not have the debuff
      expect(resultForTarget4).toBe(0);

      // Without target should check any target (should find the debuff)
      expect(resultWithoutTarget).toBe(PenetrationValues.MAJOR_BREACH);

      // Test after target 2's debuff is removed
      const resultForTarget2After = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        2000,
        null,
        2
      );
      const resultForTarget3After = calculateDynamicPenetrationAtTimestamp(
        null,
        debuffLookup,
        2000,
        null,
        3
      );

      // Target 2 should no longer have the debuff
      expect(resultForTarget2After).toBe(0);

      // Target 3 should still have the debuff (no remove event for target 3)
      expect(resultForTarget3After).toBe(PenetrationValues.MAJOR_BREACH);
    });

    it('should correctly handle buff and debuff lookups with player and target IDs', () => {
      // Create debuff events for debuffs on different targets
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 500,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 10, // Enemy target 10 gets debuff
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
        {
          timestamp: 1500,
          type: 'removedebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 10, // Remove debuff from Enemy target 10
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MAJOR_BREACH,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup([]); // Empty buff lookup
      const debuffLookup = createDebuffLookup(debuffEvents);

      // Test during active period - debuff should be found on specific target
      const resultTarget10 = calculateDynamicPenetrationAtTimestamp(
        buffLookup,
        debuffLookup,
        1000,
        1,
        10
      );

      // Different target should not have the debuff
      const resultTarget11 = calculateDynamicPenetrationAtTimestamp(
        buffLookup,
        debuffLookup,
        1000,
        1,
        11
      );

      // Same target with different player should still get the debuff (debuff is on the target, not dependent on player)
      const resultDifferentPlayer = calculateDynamicPenetrationAtTimestamp(
        buffLookup,
        debuffLookup,
        1000,
        2,
        10
      );

      // Target 10 should have the debuff penetration
      expect(resultTarget10).toBe(PenetrationValues.MAJOR_BREACH);

      // Target 11 should not have any debuff penetration
      expect(resultTarget11).toBe(0);

      // Different player attacking target 10 should still get the debuff penetration
      expect(resultDifferentPlayer).toBe(PenetrationValues.MAJOR_BREACH);

      // Test after debuff expires
      const resultAfterExpiry = calculateDynamicPenetrationAtTimestamp(
        buffLookup,
        debuffLookup,
        2000,
        1,
        10
      );
      expect(resultAfterExpiry).toBe(0);
    });
  });
});
