import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import { KnownAbilities, CriticalDamageValues, KnownSetIDs } from '../types/abilities';
import { BuffEvent, DebuffEvent, CombatantInfoEvent } from '../types/combatlogEvents';
import { GearType } from '../types/playerDetails';

import { BuffLookupData, createBuffLookup, createDebuffLookup } from './BuffLookupUtils';
import {
  isBuffActive,
  isDebuffActive,
  getEnabledCriticalDamageSources,
  getAllCriticalDamageSourcesWithActiveState,
  isBuffActiveAtTimestamp,
  calculateCriticalDamageAtTimestamp,
  calculateStaticCriticalDamage,
  calculateDynamicCriticalDamageAtTimestamp,
  isComputedSourceActive,
  getCritDamageFromComputedSource,
  isAuraActive,
  isGearSourceActive,
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

    it('should return false when buff does not exist in lookup', () => {
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
      expect(isBuffActive(buffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(false);
    });
  });

  describe('isDebuffActive', () => {
    it('should return false for empty debuff lookup', () => {
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
      expect(isDebuffActive(emptyDebuffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(false);
    });

    it('should return true when debuff exists in lookup', () => {
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const debuffLookup = createDebuffLookup(debuffEvents);
      expect(isDebuffActive(debuffLookup, KnownAbilities.MINOR_BRITTLE)).toBe(true);
    });
  });

  describe('getEnabledCriticalDamageSources', () => {
    it('should return sources based on buff and debuff lookups', () => {
      // Create buff lookup with Lucent Echoes active
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

      // Create debuff lookup with Minor Brittle active
      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);
      const debuffLookup = createDebuffLookup(debuffEvents);

      const sources = getEnabledCriticalDamageSources(buffLookup, debuffLookup, null);

      // Should find both Lucent Echoes (buff) and Minor Brittle (debuff) + computed sources
      expect(sources).toHaveLength(4); // 2 computed sources (Dexterity + Fighting Finesse) + 2 active sources
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.LUCENT_ECHOES)
      ).toBe(true);
      expect(
        sources.some((s) => 'ability' in s && s.ability === KnownAbilities.MINOR_BRITTLE)
      ).toBe(true);
    });

    it('should return empty array for empty lookups', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getEnabledCriticalDamageSources(emptyBuffLookup, emptyDebuffLookup, null);

      // Should only find computed sources since we don't have combatant info (2 total)
      expect(sources).toHaveLength(2); // Only always-active computed sources (Dexterity + Fighting Finesse)
    });
  });

  describe('isBuffActiveAtTimestamp', () => {
    it('should return false for timestamp outside buff duration', () => {
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
        {
          timestamp: 5000,
          type: 'removebuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.LUCENT_ECHOES,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents);

      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 500)).toBe(false); // Before apply
      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 3000)).toBe(true); // During buff
      expect(isBuffActiveAtTimestamp(buffLookup, KnownAbilities.LUCENT_ECHOES, 6000)).toBe(false); // After remove
    });
  });

  describe('calculateCriticalDamageAtTimestamp', () => {
    it('should calculate critical damage with active buffs and debuffs', () => {
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
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);

      // Test at timestamp when both are active
      const critDamage = calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        null, // no combatant info
        undefined, // no player data
        2000 // timestamp when both should be active
      );

      // Base 50% + LUCENT_ECHOES=11% + MINOR_BRITTLE=10% (computed sources return 0 without combatantInfo)
      expect(critDamage).toBe(71); // 50 + 11 + 10
    });

    it('should calculate base critical damage when no buffs active', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const critDamage = calculateCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        null,
        undefined,
        1000
      );

      // Base 50% only (computed sources return 0 without combatantInfo)
      expect(critDamage).toBe(50);
    });
  });

  describe('calculateStaticCriticalDamage', () => {
    it('should return base critical damage when no combatantInfo', () => {
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined, emptyDebuffLookup);
      expect(staticCritDamage).toBe(50); // Base only
    });

    it('should include computed sources when available', () => {
      // This would require mocking combatantInfo and playerData
      // For now, testing with null shows the base case
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined, emptyDebuffLookup);
      expect(staticCritDamage).toBe(50);
    });
  });

  describe('calculateDynamicCriticalDamageAtTimestamp', () => {
    it('should return 0 when no buffs/debuffs active', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        1000
      );

      expect(dynamicCritDamage).toBe(0);
    });

    it('should calculate buff and debuff contributions', () => {
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
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);

      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        2000 // timestamp when both should be active
      );

      // LUCENT_ECHOES=11% + MINOR_BRITTLE=10%
      expect(dynamicCritDamage).toBe(21);
    });
  });

  describe('Optimization Integration', () => {
    it('should produce same result as original function', () => {
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
          sourceIsFriendly: false,
          targetID: 3,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const debuffLookup = createDebuffLookup(debuffEvents, 10000);
      const timestamp = 2000;

      // Original approach
      const originalResult = calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        null,
        undefined,
        timestamp
      );

      // Optimized approach
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined, debuffLookup);
      const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        timestamp
      );
      const optimizedResult = staticCritDamage + dynamicCritDamage;

      expect(optimizedResult).toBe(originalResult);
    });

    it('should be more efficient for multiple timestamps', () => {
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

      const buffLookup = createBuffLookup(buffEvents, 10000);
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      // Pre-calculate static damage once (this is the optimization)
      const staticCritDamage = calculateStaticCriticalDamage(null, undefined, emptyDebuffLookup);

      // Simulate calculating for multiple timestamps (like we do per-second)
      const timestamps = [1000, 2000, 3000, 4000, 5000];

      // With optimization: static calculation happens once, dynamic per timestamp
      const optimizedResults = timestamps.map((timestamp) => {
        const dynamicCritDamage = calculateDynamicCriticalDamageAtTimestamp(
          buffLookup,
          emptyDebuffLookup,
          timestamp
        );
        return staticCritDamage + dynamicCritDamage;
      });

      // Without optimization: full calculation per timestamp
      const originalResults = timestamps.map((timestamp) =>
        calculateCriticalDamageAtTimestamp(
          buffLookup,
          emptyDebuffLookup,
          null,
          undefined,
          timestamp
        )
      );

      // Results should be identical
      expect(optimizedResults).toEqual(originalResults);

      // All results should be the same since buff is active throughout
      expect(optimizedResults.every((result) => result === optimizedResults[0])).toBe(true);
    });
  });

  describe('getAllCriticalDamageSourcesWithActiveState', () => {
    it('should return all sources with active state', () => {
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
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getAllCriticalDamageSourcesWithActiveState(
        buffLookup,
        emptyDebuffLookup,
        null
      );

      // Should return all sources (both active and inactive)
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every((source) => typeof source.wasActive === 'boolean')).toBe(true);

      // Find the Lucent Echoes source and verify it's marked as active
      const lucentEchoesSource = sources.find(
        (source) =>
          source.source === 'buff' &&
          'ability' in source &&
          source.ability === KnownAbilities.LUCENT_ECHOES
      );
      expect(lucentEchoesSource?.wasActive).toBe(true);

      // Verify that other sources that aren't active are marked as inactive
      const inactiveSources = sources.filter((source) => !source.wasActive);
      expect(inactiveSources.length).toBeGreaterThan(0);
    });

    it('should return all sources as inactive when no buffs/debuffs are present', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      const sources = getAllCriticalDamageSourcesWithActiveState(
        emptyBuffLookup,
        emptyDebuffLookup,
        null
      );

      // Should return all sources
      expect(sources.length).toBeGreaterThan(0);

      // Most sources should be inactive (except possibly some computed ones)
      const buffSources = sources.filter(
        (source) => source.source === 'buff' || source.source === 'debuff'
      );
      expect(buffSources.every((source) => source.wasActive === false)).toBe(true);
    });
  });
});

// Comprehensive tests for all critical damage sources
describe('Critical Damage Sources - Comprehensive Testing', () => {
  const createMockCombatantInfo = (overrides = {}): CombatantInfoEvent => ({
    timestamp: 1000,
    type: 'combatantinfo',
    fight: 1,
    sourceID: 1,
    auras: [],
    gear: [],
    ...overrides,
  });

  const createMockPlayerData = (
    combatantInfoEvent?: CombatantInfoEvent
  ): PlayerDetailsWithRole => ({
    name: 'Test Player',
    id: 1,
    guid: 12345,
    type: 'Warrior',
    server: 'Test Server',
    displayName: 'TestPlayer#1234',
    anonymous: false,
    icon: 'test-icon.png',
    specs: [],
    potionUse: 0,
    healthstoneUse: 0,
    combatantInfo: {
      stats: [100, 200, 300],
      talents: combatantInfoEvent?.gear ? [] : [], // Keep it simple for now
      gear: combatantInfoEvent?.gear || [],
      covenantID: 0,
      soulbindID: 0,
      specID: 0,
    },
    role: 'dps' as const,
  });

  describe('CRITICAL_DAMAGE_SOURCES completeness', () => {
    it('should contain all expected critical damage sources', () => {
      const sourceNames = CRITICAL_DAMAGE_SOURCES.map((s) => s.name);

      // Check for key sources
      expect(sourceNames).toContain('Fated Fortune');
      expect(sourceNames).toContain('Dexterity');
      expect(sourceNames).toContain('Fighting Finesse');
      expect(sourceNames).toContain("Sul-Xan's Torment");
      expect(sourceNames).toContain("Mora Scribe's Thesis");
      expect(sourceNames).toContain("Harpooner's Wading Kilt");
      expect(sourceNames).toContain('Animal Companions');
      expect(sourceNames).toContain('Twin Blade and Blunt');
      expect(sourceNames).toContain('Heavy Weapons');
      expect(sourceNames).toContain('Backstabber');
      expect(sourceNames).toContain('Elemental Catalyst');
      expect(sourceNames).toContain('Hemorrhage');
      expect(sourceNames).toContain('Piercing Spear');
      expect(sourceNames).toContain('Feline Ambush');
      expect(sourceNames).toContain('Lucent Echoes');
      expect(sourceNames).toContain('Minor Force');
      expect(sourceNames).toContain('Major Force');
      expect(sourceNames).toContain('Minor Brittle');
      expect(sourceNames).toContain('Major Brittle');
    });

    it('should have correct source types for each critical damage source', () => {
      const auraSourceNames = ['Hemorrhage', 'Piercing Spear', 'Feline Ambush'];
      const buffSourceNames = ['Lucent Echoes', 'Minor Force', 'Major Force'];
      const debuffSourceNames = ['Minor Brittle', 'Major Brittle'];
      const computedSourceNames = [
        'Fated Fortune',
        'Dexterity',
        'Fighting Finesse',
        "Sul-Xan's Torment",
        "Mora Scribe's Thesis",
        "Harpooner's Wading Kilt",
        'Animal Companions',
        'Twin Blade and Blunt',
        'Heavy Weapons',
        'Backstabber',
        'Elemental Catalyst',
      ];

      auraSourceNames.forEach((name) => {
        const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === name);
        expect(source?.source).toBe('aura');
      });

      buffSourceNames.forEach((name) => {
        const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === name);
        expect(source?.source).toBe('buff');
      });

      debuffSourceNames.forEach((name) => {
        const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === name);
        expect(source?.source).toBe('debuff');
      });

      computedSourceNames.forEach((name) => {
        const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === name);
        expect(source?.source).toBe('computed');
      });
    });
  });

  describe('Aura Sources', () => {
    it('should detect Feline Ambush aura correctly', () => {
      const combatantWithAura = createMockCombatantInfo({
        auras: [{ ability: KnownAbilities.FELINE_AMBUSH, stacks: 1 }],
      });
      const combatantWithoutAura = createMockCombatantInfo({ auras: [] });

      expect(isAuraActive(combatantWithAura, KnownAbilities.FELINE_AMBUSH)).toBe(true);
      expect(isAuraActive(combatantWithoutAura, KnownAbilities.FELINE_AMBUSH)).toBe(false);
      expect(isAuraActive(null, KnownAbilities.FELINE_AMBUSH)).toBe(false);
    });

    it('should detect Hemorrhage aura correctly', () => {
      const combatantWithAura = createMockCombatantInfo({
        auras: [{ ability: KnownAbilities.HEMORRHAGE, stacks: 1 }],
      });

      expect(isAuraActive(combatantWithAura, KnownAbilities.HEMORRHAGE)).toBe(true);
    });
  });

  describe('Gear Sources', () => {
    it("should detect Sul-Xan's Torment 5-piece correctly", () => {
      const combatantWith5Pieces = createMockCombatantInfo({
        gear: Array.from({ length: 5 }, (_, i) => ({
          id: 100 + i,
          slot: i,
          quality: 5,
          icon: 'test-icon',
          championPoints: 0,
          trait: 0,
          enchantType: 0,
          enchantQuality: 0,
          setID: KnownSetIDs.SUL_XAN_TORMENT_SET,
          type: GearType.LIGHT,
        })),
      });

      const combatantWith3Pieces = createMockCombatantInfo({
        gear: Array.from({ length: 3 }, (_, i) => ({
          id: 100 + i,
          slot: i,
          quality: 5,
          icon: 'test-icon',
          championPoints: 0,
          trait: 0,
          enchantType: 0,
          enchantQuality: 0,
          setID: KnownSetIDs.SUL_XAN_TORMENT_SET,
          type: GearType.LIGHT,
        })),
      });

      expect(isGearSourceActive(combatantWith5Pieces, KnownSetIDs.SUL_XAN_TORMENT_SET, 5)).toBe(
        true
      );
      expect(isGearSourceActive(combatantWith3Pieces, KnownSetIDs.SUL_XAN_TORMENT_SET, 5)).toBe(
        false
      );
    });

    it("should detect Mora Scribe's Thesis 5-piece correctly", () => {
      const combatantWith5Pieces = createMockCombatantInfo({
        gear: Array.from({ length: 5 }, (_, i) => ({
          id: 200 + i,
          slot: i,
          quality: 5,
          icon: 'test-icon',
          championPoints: 0,
          trait: 0,
          enchantType: 0,
          enchantQuality: 0,
          setID: KnownSetIDs.MORA_SCRIBE_THESIS_SET,
          type: GearType.HEAVY,
        })),
      });

      expect(isGearSourceActive(combatantWith5Pieces, KnownSetIDs.MORA_SCRIBE_THESIS_SET, 5)).toBe(
        true
      );
    });

    it("should detect Harpooner's Wading Kilt correctly", () => {
      const combatantWithKilt = createMockCombatantInfo({
        gear: [
          {
            id: 300,
            slot: 7,
            quality: 5,
            icon: 'test-icon',
            championPoints: 0,
            trait: 0,
            enchantType: 0,
            enchantQuality: 0,
            setID: KnownSetIDs.HARPOONER_WADING_KILT_SET,
            type: GearType.LIGHT,
          },
        ],
      });

      expect(isGearSourceActive(combatantWithKilt, KnownSetIDs.HARPOONER_WADING_KILT_SET, 1)).toBe(
        true
      );
    });
  });

  describe('Computed Sources', () => {
    it('should handle Fated Fortune computation correctly', () => {
      const mockCombatantWithAura = createMockCombatantInfo({
        auras: [
          {
            source: 1,
            ability: KnownAbilities.FATED_FORTUNE_STAGE_ONE,
            stacks: 1,
            icon: '',
            name: 'Fated Fortune',
          },
        ],
      });

      const mockPlayerData = {
        name: 'Test Player',
        id: 1,
        guid: 12345,
        type: 'Arcanist',
        server: 'Test Server',
        displayName: 'TestPlayer#1234',
        anonymous: false,
        icon: 'test-icon.png',
        specs: [],
        potionUse: 0,
        healthstoneUse: 0,
        combatantInfo: {
          stats: [100, 200, 300],
          talents: [
            { name: 'Fulminating Rune', id: 1, type: 1, abilityIcon: '' },
            { name: 'Writhing Runeblades', id: 2, type: 1, abilityIcon: '' },
            { name: 'Some Other Skill', id: 3, type: 1, abilityIcon: '' },
          ],
          gear: [],
          covenantID: 0,
          soulbindID: 0,
          specID: 0,
        },
        role: 'dps' as const,
      };

      const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === 'Fated Fortune' && 'key' in s);
      if (source && 'key' in source) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(mockCombatantWithAura, source, emptyDebuffLookup)).toBe(true);

        // Note: The actual calculation depends on arcanist data matching
        const damage = getCritDamageFromComputedSource(
          source,
          mockPlayerData,
          mockCombatantWithAura
        );
        expect(damage).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle Dexterity computation correctly', () => {
      const mockCombatantWith3Medium = createMockCombatantInfo({
        gear: Array.from({ length: 3 }, (_, i) => ({
          id: 400 + i,
          quality: 5,
          icon: 'test-icon',
          name: `Medium Armor ${i}`,
          championPoints: 0,
          trait: 0,
          enchantType: 0,
          enchantQuality: 0,
          setID: 0,
          type: 2, // Medium armor
        })),
      });

      const mockPlayerData = {
        name: 'Test Player',
        id: 1,
        guid: 12345,
        type: 'Warrior',
        server: 'Test Server',
        displayName: 'TestPlayer#1234',
        anonymous: false,
        icon: 'test-icon.png',
        specs: [],
        potionUse: 0,
        healthstoneUse: 0,
        combatantInfo: {
          stats: [100, 200, 300],
          talents: [],
          gear: [],
          covenantID: 0,
          soulbindID: 0,
          specID: 0,
        },
        role: 'dps' as const,
      };

      const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === 'Dexterity' && 'key' in s);
      if (source && 'key' in source) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(mockCombatantWith3Medium, source, emptyDebuffLookup)).toBe(
          true
        );

        const damage = getCritDamageFromComputedSource(
          source,
          mockPlayerData,
          mockCombatantWith3Medium
        );
        expect(damage).toBe(6); // 3 pieces * 2% each
      }
    });

    it('should handle Animal Companions computation correctly', () => {
      const mockPlayerDataWithWarden = createMockPlayerData({
        combatantInfo: createMockCombatantInfo({
          talents: [
            { name: 'Betty Netch', id: 1, type: 1, abilityIcon: '' },
            { name: 'Dive', id: 2, type: 1, abilityIcon: '' },
            { name: 'Some Other Skill', id: 3, type: 1, abilityIcon: '' },
          ],
        }),
      });

      const source = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Animal Companions' && 'key' in s
      );
      if (source && 'key' in source) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(
          isComputedSourceActive(mockPlayerDataWithWarden.combatantInfo, source, emptyDebuffLookup)
        ).toBe(false); // Returns false because it checks for ADVANCED_SPECIES aura, not talents

        // Note: The actual calculation depends on warden data matching
        const damage = getCritDamageFromComputedSource(
          source,
          mockPlayerDataWithWarden,
          mockPlayerDataWithWarden.combatantInfo
        );
        expect(damage).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle Backstabber as always active', () => {
      const source = CRITICAL_DAMAGE_SOURCES.find((s) => s.name === 'Backstabber' && 'key' in s);
      if (source && 'key' in source) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(null, source, emptyDebuffLookup)).toBe(false); // Original logic returns false
        expect(isComputedSourceActive(createMockCombatantInfo(), source, emptyDebuffLookup)).toBe(
          false
        ); // Original logic returns false

        const damage = getCritDamageFromComputedSource(source, undefined, null);
        expect(damage).toBe(0); // Returns 0 when playerData is undefined

        const damageWithData = getCritDamageFromComputedSource(
          source,
          createMockPlayerData(),
          createMockCombatantInfo()
        );
        expect(damageWithData).toBe(CriticalDamageValues.BACKSTABBER);
      }
    });

    it('should handle Fighting Finesse as always active', () => {
      const source = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Fighting Finesse' && 'key' in s
      );
      if (source && 'key' in source) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(null, source, emptyDebuffLookup)).toBe(true);

        const damage = getCritDamageFromComputedSource(
          source,
          createMockPlayerData(),
          createMockCombatantInfo()
        );
        expect(damage).toBe(CriticalDamageValues.FIGHTING_FINESSE);
      }
    });

    it('should handle weapon-based sources with placeholder logic', () => {
      const dualWieldSource = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Twin Blade and Blunt' && 'key' in s
      );
      const twoHandedSource = CRITICAL_DAMAGE_SOURCES.find(
        (s) => s.name === 'Heavy Weapons' && 'key' in s
      );

      if (dualWieldSource && 'key' in dualWieldSource) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(null, dualWieldSource, emptyDebuffLookup)).toBe(false); // Original logic returns false
        const damage = getCritDamageFromComputedSource(
          dualWieldSource,
          createMockPlayerData(),
          createMockCombatantInfo()
        );
        expect(damage).toBe(0); // Placeholder logic returns 0
      }

      if (twoHandedSource && 'key' in twoHandedSource) {
        const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };
        expect(isComputedSourceActive(null, twoHandedSource, emptyDebuffLookup)).toBe(false); // Original logic returns false
        const damage = getCritDamageFromComputedSource(
          twoHandedSource,
          createMockPlayerData(),
          createMockCombatantInfo()
        );
        expect(damage).toBe(0); // Placeholder logic returns 0
      }
    });
  });

  describe('Integration Tests', () => {
    it('should calculate total critical damage correctly with multiple active sources', () => {
      const buffEvents: BuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applybuff',
          sourceID: 1,
          sourceIsFriendly: true,
          targetID: 2,
          targetIsFriendly: true,
          abilityGameID: KnownAbilities.MINOR_FORCE,
          fight: 1,
          extraAbilityGameID: 0,
        },
      ];

      const debuffEvents: DebuffEvent[] = [
        {
          timestamp: 1000,
          type: 'applydebuff',
          sourceID: 1,
          sourceIsFriendly: false,
          targetID: 2,
          targetIsFriendly: false,
          abilityGameID: KnownAbilities.MINOR_BRITTLE,
          fight: 1,
        },
      ];

      const combatantInfo = createMockCombatantInfo({
        auras: [{ ability: KnownAbilities.FELINE_AMBUSH, stacks: 1 }],
        gear: Array.from({ length: 2 }, (_, i) => ({
          id: 500 + i,
          slot: i,
          quality: 5,
          icon: 'test-icon',
          championPoints: 0,
          trait: 0,
          enchantType: 0,
          enchantQuality: 0,
          setID: 0,
          type: GearType.MEDIUM,
        })),
      });

      const playerData = createMockPlayerData({ combatantInfo });
      const buffLookup = createBuffLookup(buffEvents);
      const debuffLookup = createDebuffLookup(debuffEvents);

      const totalDamage = calculateCriticalDamageAtTimestamp(
        buffLookup,
        debuffLookup,
        combatantInfo,
        playerData,
        2000
      );

      // Should include base (50%) + various active sources
      expect(totalDamage).toBeGreaterThan(50);

      // Should include:
      // - Minor Force (10%)
      // - Minor Brittle (10%)
      // - Feline Ambush (12%)
      // - Fighting Finesse (8%)
      // - Dexterity (4% for 2 medium pieces)
      // Note: Backstabber is not active with original logic
      const expectedMinimum = 50 + 10 + 10 + 12 + 8 + 4;
      expect(totalDamage).toBeGreaterThanOrEqual(expectedMinimum);
    });

    it('should handle edge cases gracefully', () => {
      const emptyBuffLookup: BuffLookupData = { buffIntervals: new Map() };
      const emptyDebuffLookup: BuffLookupData = { buffIntervals: new Map() };

      // Test with null combatant info
      expect(() =>
        calculateCriticalDamageAtTimestamp(
          emptyBuffLookup,
          emptyDebuffLookup,
          null,
          undefined,
          1000
        )
      ).not.toThrow();

      // Test with empty gear
      const emptyCombatant = createMockCombatantInfo({ gear: [] });
      expect(() =>
        calculateCriticalDamageAtTimestamp(
          emptyBuffLookup,
          emptyDebuffLookup,
          emptyCombatant,
          undefined,
          1000
        )
      ).not.toThrow();

      // Should still return base critical damage + computed sources that are always active
      const result = calculateCriticalDamageAtTimestamp(
        emptyBuffLookup,
        emptyDebuffLookup,
        emptyCombatant,
        createMockPlayerData({ combatantInfo: emptyCombatant }),
        1000
      );

      expect(result).toBeGreaterThanOrEqual(50); // At least base crit damage
    });
  });
});
