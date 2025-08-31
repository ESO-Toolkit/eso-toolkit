import {
  createMockCombatantInfoEvent,
  createMockCombatantAura,
} from '../test/utils/combatLogMockFactories';
import { createMockPlayerData, createGearItem } from '../test/utils/playerMockFactories';
import { KnownAbilities, CriticalDamageValues } from '../types/abilities';
import { BuffEvent, DebuffEvent } from '../types/combatlogEvents';
import { ArmorType } from '../types/playerDetails';

import { BuffLookupData, createBuffLookup, createDebuffLookup } from './BuffLookupUtils';
import {
  isBuffActive,
  getEnabledCriticalDamageSources,
  calculateCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  getCritDamageFromAlwaysOnSource,
  isAuraActive,
  CRITICAL_DAMAGE_SOURCES,
} from './CritDamageUtils';

describe('CritDamageUtils with BuffLookup', () => {
  describe('isBuffActive', () => {
    it('should return false for empty buff lookup', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      expect(isBuffActive(emptyBuffLookup, KnownAbilities.LUCENT_ECHOES)).toBe(false);
    });

    it('should return true when buff exists in lookup', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      expect(isBuffActive(buffLookup, KnownAbilities.LUCENT_ECHOES)).toBe(true);
    });
  });

  describe('getEnabledCriticalDamageSources', () => {
    it('should return always-on sources for empty lookups', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getEnabledCriticalDamageSources(emptyBuffLookup, emptyDebuffLookup, null);

      // Should find always-on sources (Dexterity, Fighting Finesse) even with empty lookups
      expect(sources).toHaveLength(2);
      expect(sources.some((s) => s.name === 'Dexterity')).toBe(true);
      expect(sources.some((s) => s.name === 'Fighting Finesse')).toBe(true);
    });

    it('should return sources based on buff and debuff lookups', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      const debuffLookup = createDebuffLookup(debuffEvents);

      const sources = getEnabledCriticalDamageSources(buffLookup, debuffLookup, null);

      // Should find both Lucent Echoes (buff) and Minor Brittle (debuff) + always-on sources
      expect(sources).toHaveLength(4);
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.LUCENT_ECHOES)
      ).toBe(true);
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.MINOR_BRITTLE)
      ).toBe(true);
    });
  });

  describe('calculateCriticalDamageAtTimestamp', () => {
    it('should calculate base critical damage when no buffs active', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const mockCombatant = createMockCombatantInfoEvent();
      const mockPlayerData = createMockPlayerData();

      const result = calculateCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        mockCombatant,
        mockPlayerData,
        1000
      );

      // Should include base + always-on sources only
      expect(result).toBeGreaterThanOrEqual(50);
    });
  });

  describe('calculateStaticCriticalDamage', () => {
    it('should return base critical damage', () => {
      const mockCombatant = createMockCombatantInfoEvent();
      const staticCritDamage = calculateStaticCriticalDamage(mockCombatant);
      expect(staticCritDamage).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getCritDamageFromAlwaysOnSource', () => {
    it('should handle Fighting Finesse', () => {
      const fightingFinesse = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Fighting Finesse' && 'key' in s
      );

      if (fightingFinesse && 'key' in fightingFinesse && fightingFinesse.source === 'always_on') {
        const damage = getCritDamageFromAlwaysOnSource(fightingFinesse, null);
        expect(damage).toBe(CriticalDamageValues.FIGHTING_FINESSE);
      }
    });

    it('should handle Dexterity with medium armor', () => {
      const dexteritySource = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Dexterity' && 'key' in s
      );

      if (dexteritySource && 'key' in dexteritySource && dexteritySource.source === 'always_on') {
        const combatantWith3Medium = createMockCombatantInfoEvent({
          gear: [
            createGearItem(ArmorType.MEDIUM, undefined, 1),
            createGearItem(ArmorType.MEDIUM, undefined, 2),
            createGearItem(ArmorType.MEDIUM, undefined, 3),
          ],
        });

        const damage = getCritDamageFromAlwaysOnSource(dexteritySource, combatantWith3Medium);
        expect(damage).toBe(6); // 3 pieces * 2% each
      }
    });
  });

  describe('isAuraActive', () => {
    it('should return false for null combatant', () => {
      expect(isAuraActive(null, KnownAbilities.FELINE_AMBUSH)).toBe(false);
    });

    it('should return true when aura is present', () => {
      const combatantWithAura = createMockCombatantInfoEvent({
        auras: [
          createMockCombatantAura({ ability: KnownAbilities.FELINE_AMBUSH, name: 'Feline Ambush' }),
        ],
      });

      expect(isAuraActive(combatantWithAura, KnownAbilities.FELINE_AMBUSH)).toBe(true);
    });
  });
});
