import {
  DamageType,
  SCRIBING_BLACKLIST,
  Grimoire,
  GRIMOIRE_NAME_PATTERNS,
  getAbilityDisplayName,
  getDamageTypeForEvent,
  getAllGrimoires,
  isValidGrimoire,
  analyzeScribingSkillEffects,
  analyzeAllPlayersScribingSkills,
  Effect,
  ScribingSkillAnalysis,
} from './Scribing';
import { ReportAbility } from '../graphql/generated';
import {
  BuffEvent,
  CastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '../types/combatlogEvents';
import { PlayerTalent } from '../types/playerDetails';

describe('Scribing utilities', () => {
  describe('DamageType enum', () => {
    it('should contain all expected damage types', () => {
      expect(DamageType.PHYSICAL).toBe('physical');
      expect(DamageType.MAGIC).toBe('magic');
      expect(DamageType.FIRE).toBe('fire');
      expect(DamageType.FROST).toBe('frost');
      expect(DamageType.SHOCK).toBe('shock');
      expect(DamageType.POISON).toBe('poison');
      expect(DamageType.DISEASE).toBe('disease');
      expect(DamageType.BLEED).toBe('bleed');
      expect(DamageType.GENERIC).toBe('generic');
    });
  });

  describe('SCRIBING_BLACKLIST', () => {
    it('should contain known non-scribing abilities', () => {
      expect(SCRIBING_BLACKLIST.has('Swallow Soul')).toBe(true);
    });

    it('should be a Set instance', () => {
      expect(SCRIBING_BLACKLIST).toBeInstanceOf(Set);
    });
  });

  describe('Grimoire enum', () => {
    it('should contain all expected grimoires', () => {
      expect(Grimoire.BANNER_BEARER).toBe('Banner Bearer');
      expect(Grimoire.ELEMENTAL_EXPLOSION).toBe('Elemental Explosion');
      expect(Grimoire.MENDERS_BOND).toBe("Mender's Bond");
      expect(Grimoire.SHIELD_THROW).toBe('Shield Throw');
      expect(Grimoire.SMASH).toBe('Smash');
      expect(Grimoire.SOUL_BURST).toBe('Soul Burst');
      expect(Grimoire.TORCHBEARER).toBe('Torchbearer');
      expect(Grimoire.TRAMPLE).toBe('Trample');
      expect(Grimoire.TRAVELING_KNIFE).toBe('Traveling Knife');
      expect(Grimoire.ULFSILD_CONTINGENCY).toBe("Ulfsild's Contingency");
      expect(Grimoire.VAULT).toBe('Vault');
      expect(Grimoire.WIELD_SOUL).toBe('Wield Soul');
    });
  });

  describe('GRIMOIRE_NAME_PATTERNS', () => {
    it('should have patterns for all grimoires', () => {
      const allGrimoires = Object.values(Grimoire);
      const patternKeys = Object.keys(GRIMOIRE_NAME_PATTERNS);

      expect(patternKeys.length).toBe(allGrimoires.length);
      allGrimoires.forEach((grimoire) => {
        expect(GRIMOIRE_NAME_PATTERNS[grimoire]).toBeDefined();
        expect(GRIMOIRE_NAME_PATTERNS[grimoire]).toBeInstanceOf(RegExp);
      });
    });

    it('should match expected ability names', () => {
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.BANNER_BEARER].test('Fire Banner')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.ELEMENTAL_EXPLOSION].test('Frost Explosion')).toBe(
        true,
      );
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.MENDERS_BOND].test('Healing Bond')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.SHIELD_THROW].test('Lightning Throw')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.SMASH].test('Earth Smash')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.SOUL_BURST].test('Fire Burst')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.TORCHBEARER].test('Ice Torchbearer')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.TRAMPLE].test('Shock Trample')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.TRAVELING_KNIFE].test('Poison Knife')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.ULFSILD_CONTINGENCY].test('Fire Contingency')).toBe(
        true,
      );
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.VAULT].test('Lightning Vault')).toBe(true);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.WIELD_SOUL].test('Dark Soul')).toBe(true);
    });

    it('should not match non-grimoire abilities', () => {
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.BANNER_BEARER].test('Swallow Soul')).toBe(false);
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.ELEMENTAL_EXPLOSION].test('Crystal Shard')).toBe(
        false,
      );
      expect(GRIMOIRE_NAME_PATTERNS[Grimoire.SHIELD_THROW].test('Pierce Armor')).toBe(false);
    });
  });

  describe('getAbilityDisplayName', () => {
    it('should return basic ability name for non-damage events', () => {
      const ability = { name: 'Test Ability', gameID: 12345, type: 4 };

      expect(getAbilityDisplayName(ability, 'buff')).toBe('Test Ability');
      expect(getAbilityDisplayName(ability, 'debuff')).toBe('Test Ability');
      expect(getAbilityDisplayName(ability, 'resource')).toBe('Test Ability');
    });

    it('should return damage type name for high ID damage abilities', () => {
      const ability = { name: 'Test Ability', gameID: 250000, type: 4 };

      expect(getAbilityDisplayName(ability, 'damage')).toBe('Fire Damage');
    });

    it('should return basic name for low ID damage abilities', () => {
      const ability = { name: 'Test Ability', gameID: 12345, type: 4 };

      expect(getAbilityDisplayName(ability, 'damage')).toBe('Test Ability');
    });

    it('should handle unknown ability gracefully', () => {
      const ability = {};

      expect(getAbilityDisplayName(ability, 'damage')).toBe('Unknown Ability');
    });

    it('should add hit type information when provided', () => {
      const ability = { name: 'Test Ability', gameID: 12345 };

      expect(getAbilityDisplayName(ability, 'damage', 'Critical')).toBe('Test Ability [Critical]');
    });

    it('should handle different damage types for high ID abilities', () => {
      const fireAbility = { name: 'Test', gameID: 250000, type: 4 };
      const frostAbility = { name: 'Test', gameID: 250000, type: 16 };
      const shockAbility = { name: 'Test', gameID: 250000, type: 512 };

      expect(getAbilityDisplayName(fireAbility, 'damage')).toBe('Fire Damage');
      expect(getAbilityDisplayName(frostAbility, 'damage')).toBe('Frost Damage');
      expect(getAbilityDisplayName(shockAbility, 'damage')).toBe('Shock Damage');
    });
  });

  describe('getDamageTypeForEvent', () => {
    it('should return correct damage types for known flags', () => {
      expect(getDamageTypeForEvent(1)).toBe(DamageType.PHYSICAL);
      expect(getDamageTypeForEvent(2)).toBe(DamageType.BLEED);
      expect(getDamageTypeForEvent(4)).toBe(DamageType.FIRE);
      expect(getDamageTypeForEvent(8)).toBe(DamageType.POISON);
      expect(getDamageTypeForEvent(16)).toBe(DamageType.FROST);
      expect(getDamageTypeForEvent(64)).toBe(DamageType.MAGIC);
      expect(getDamageTypeForEvent(128)).toBe(DamageType.GENERIC);
      expect(getDamageTypeForEvent(256)).toBe(DamageType.DISEASE);
      expect(getDamageTypeForEvent(512)).toBe(DamageType.SHOCK);
    });

    it('should return null for unknown damage type flags', () => {
      expect(getDamageTypeForEvent(999)).toBeNull();
      expect(getDamageTypeForEvent(0)).toBeNull();
      expect(getDamageTypeForEvent(-1)).toBeNull();
    });
  });

  describe('getAllGrimoires', () => {
    it('should return all grimoire values', () => {
      const grimoires = getAllGrimoires();

      expect(grimoires).toHaveLength(12);
      expect(grimoires).toContain(Grimoire.BANNER_BEARER);
      expect(grimoires).toContain(Grimoire.ELEMENTAL_EXPLOSION);
      expect(grimoires).toContain(Grimoire.MENDERS_BOND);
      expect(grimoires).toContain(Grimoire.SHIELD_THROW);
      expect(grimoires).toContain(Grimoire.SMASH);
      expect(grimoires).toContain(Grimoire.SOUL_BURST);
      expect(grimoires).toContain(Grimoire.TORCHBEARER);
      expect(grimoires).toContain(Grimoire.TRAMPLE);
      expect(grimoires).toContain(Grimoire.TRAVELING_KNIFE);
      expect(grimoires).toContain(Grimoire.ULFSILD_CONTINGENCY);
      expect(grimoires).toContain(Grimoire.VAULT);
      expect(grimoires).toContain(Grimoire.WIELD_SOUL);
    });
  });

  describe('isValidGrimoire', () => {
    it('should return true for valid grimoire names', () => {
      expect(isValidGrimoire('Banner Bearer')).toBe(true);
      expect(isValidGrimoire('Elemental Explosion')).toBe(true);
      expect(isValidGrimoire("Mender's Bond")).toBe(true);
    });

    it('should return false for invalid grimoire names', () => {
      expect(isValidGrimoire('Invalid Grimoire')).toBe(false);
      expect(isValidGrimoire('')).toBe(false);
      expect(isValidGrimoire('banner bearer')).toBe(false); // case sensitive
    });
  });

  describe('analyzeScribingSkillEffects', () => {
    const mockAbilities: ReportAbility[] = [
      { gameID: 12345, name: 'Fire Banner' },
      { gameID: 23456, name: 'Frost Explosion' },
      { gameID: 34567, name: 'Lightning Throw' },
    ];

    const mockTalent: PlayerTalent = {
      name: 'Fire Banner',
      guid: 12345,
      type: 1,
      abilityIcon: 'icon.png',
      flags: 0,
    };

    const mockCastEvent: CastEvent = {
      timestamp: 1000,
      type: 'cast',
      sourceID: 1,
      targetID: 2,
      abilityGameID: 12345,
      fight: 1,
      castTrackID: 'cast123',
    } as any;

    const mockDamageEvent: DamageEvent = {
      timestamp: 1100,
      type: 'damage',
      sourceID: 1,
      targetID: 2,
      abilityGameID: 12345,
      amount: 1000,
      fight: 1,
      castTrackID: 'cast123',
      damageTypeFlags: 4, // Fire damage
    } as any;

    it('should return null for non-scribing abilities', () => {
      const nonScribingTalent: PlayerTalent = {
        name: 'Crystal Shard',
        guid: 99999,
        type: 1,
        abilityIcon: 'icon.png',
        flags: 0,
      };

      const result = analyzeScribingSkillEffects(
        nonScribingTalent,
        mockAbilities,
        [],
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).toBeNull();
    });

    it('should return null for blacklisted abilities', () => {
      const blacklistedTalent: PlayerTalent = {
        name: 'Swallow Soul',
        guid: 88888,
        type: 1,
        abilityIcon: 'icon.png',
        flags: 0,
      };

      const result = analyzeScribingSkillEffects(
        blacklistedTalent,
        mockAbilities,
        [],
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).toBeNull();
    });

    it('should analyze scribing skill with damage events', () => {
      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [],
        [],
        [],
        [mockDamageEvent],
        [mockCastEvent],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.grimoire).toBe(Grimoire.BANNER_BEARER);
      expect(result!.effects).toHaveLength(1);
      expect(result!.effects[0].abilityName).toBe('Fire Damage');
      expect(result!.effects[0].damageType).toBe(DamageType.FIRE);
      expect(result!.effects[0].events).toHaveLength(1);
    });

    it('should handle debuff events', () => {
      const mockDebuffEvent: DebuffEvent = {
        timestamp: 1200,
        type: 'applydebuff',
        sourceID: 1,
        targetID: 2,
        abilityGameID: 54321,
        fight: 1,
        extraAbilityGameID: 12345,
      } as any;

      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [mockDebuffEvent],
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.effects.length).toBeGreaterThan(0);
      expect(
        result!.effects.some((effect) =>
          effect.events.some(
            (event) =>
              event.timestamp === mockDebuffEvent.timestamp && event.type === mockDebuffEvent.type,
          ),
        ),
      ).toBe(true);
    });

    it('should handle buff events', () => {
      const mockBuffEvent: BuffEvent = {
        timestamp: 1300,
        type: 'applybuff',
        sourceID: 1,
        targetID: 2,
        abilityGameID: 65432,
        fight: 1,
        extraAbilityGameID: 12345,
      } as any;

      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [],
        [mockBuffEvent],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.effects.length).toBeGreaterThan(0);
      expect(
        result!.effects.some((effect) =>
          effect.events.some(
            (event) =>
              event.timestamp === mockBuffEvent.timestamp && event.type === mockBuffEvent.type,
          ),
        ),
      ).toBe(true);
    });

    it('should handle resource events', () => {
      const mockResourceEvent: ResourceChangeEvent = {
        timestamp: 1400,
        type: 'resourcechange',
        sourceID: 1,
        targetID: 1,
        abilityGameID: 76543,
        fight: 1,
        extraAbilityGameID: 12345,
      } as any;

      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [],
        [],
        [mockResourceEvent],
        [],
        [],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.effects.length).toBeGreaterThan(0);
      expect(
        result!.effects.some((effect) =>
          effect.events.some(
            (event) =>
              event.timestamp === mockResourceEvent.timestamp &&
              event.type === mockResourceEvent.type,
          ),
        ),
      ).toBe(true);
    });

    it('should handle healing events', () => {
      const mockHealEvent: HealEvent = {
        timestamp: 1500,
        type: 'heal',
        sourceID: 1,
        targetID: 2,
        abilityGameID: 87654,
        amount: 500,
        fight: 1,
        castTrackID: 'cast123',
      } as any;

      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [],
        [],
        [],
        [],
        [mockCastEvent],
        [mockHealEvent],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.effects.length).toBeGreaterThan(0);
      expect(
        result!.effects.some(
          (effect) =>
            effect.abilityName === 'Healing' &&
            effect.events.some(
              (event) =>
                event.timestamp === mockHealEvent.timestamp && event.type === mockHealEvent.type,
            ),
        ),
      ).toBe(true);
    });

    it('should filter events by player ID', () => {
      const otherPlayerDamage: DamageEvent = {
        ...mockDamageEvent,
        sourceID: 999, // Different player
      };

      const result = analyzeScribingSkillEffects(
        mockTalent,
        mockAbilities,
        [],
        [],
        [],
        [mockDamageEvent, otherPlayerDamage],
        [mockCastEvent],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.effects[0].events).toHaveLength(1);
      // Check that the event has the expected properties (the function adds extra properties)
      expect(result!.effects[0].events[0].timestamp).toBe(mockDamageEvent.timestamp);
      expect(result!.effects[0].events[0].sourceID).toBe(mockDamageEvent.sourceID);
      expect(result!.effects[0].events[0].amount).toBe(mockDamageEvent.amount);
    });
  });

  describe('analyzeAllPlayersScribingSkills', () => {
    const mockPlayerDetails = {
      data: {
        playerDetails: {
          tanks: [
            {
              id: 1,
              name: 'Tank Player',
              combatantInfo: {
                talents: [
                  {
                    name: 'Fire Banner',
                    guid: 12345,
                    type: 1,
                    abilityIcon: 'icon.png',
                    flags: 0,
                  },
                ],
              },
            },
          ],
          dps: [
            {
              id: 2,
              name: 'DPS Player',
              combatantInfo: {
                talents: [
                  {
                    name: 'Frost Explosion',
                    guid: 23456,
                    type: 1,
                    abilityIcon: 'icon.png',
                    flags: 0,
                  },
                ],
              },
            },
          ],
          healers: [
            {
              id: 3,
              name: 'Healer Player',
              combatantInfo: {
                talents: [
                  {
                    name: 'Crystal Shard', // Non-scribing ability
                    guid: 99999,
                    type: 1,
                    abilityIcon: 'icon.png',
                    flags: 0,
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const mockMasterData = {
      reportData: {
        report: {
          masterData: {
            abilities: [
              { gameID: 12345, name: 'Fire Banner' },
              { gameID: 23456, name: 'Frost Explosion' },
            ],
          },
        },
      },
    };

    it('should analyze all players with scribing skills', () => {
      const result = analyzeAllPlayersScribingSkills(
        mockPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(2);
      expect(result[1]).toBeDefined(); // Tank player
      expect(result[2]).toBeDefined(); // DPS player
      expect(result[3]).toBeUndefined(); // Healer player (no scribing skills)
    });

    it('should handle empty player data', () => {
      const emptyPlayerDetails = {
        data: {
          playerDetails: {
            tanks: [],
            dps: [],
            healers: [],
          },
        },
      };

      const result = analyzeAllPlayersScribingSkills(
        emptyPlayerDetails,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle missing master data', () => {
      const emptyMasterData = {
        reportData: {
          report: {
            masterData: {
              abilities: [],
            },
          },
        },
      };

      const result = analyzeAllPlayersScribingSkills(
        mockPlayerDetails,
        emptyMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(2);
      // Should still process scribing skills even without detailed ability data
    });

    it('should handle players without talents', () => {
      const playersWithoutTalents = {
        data: {
          playerDetails: {
            tanks: [
              {
                id: 1,
                name: 'Tank Player',
                combatantInfo: {
                  talents: [],
                },
              },
            ],
            dps: [],
            healers: [],
          },
        },
      };

      const result = analyzeAllPlayersScribingSkills(
        playersWithoutTalents,
        mockMasterData,
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined or null values gracefully', () => {
      expect(getDamageTypeForEvent(undefined as any)).toBeNull();
      expect(getAbilityDisplayName(null as any, 'damage')).toBe('Unknown Ability');
      expect(isValidGrimoire(null as any)).toBe(false);
      expect(isValidGrimoire(undefined as any)).toBe(false);
    });

    it('should handle empty arrays in analyzeScribingSkillEffects', () => {
      const mockTalent: PlayerTalent = {
        name: 'Fire Banner',
        guid: 12345,
        type: 1,
        abilityIcon: 'icon.png',
        flags: 0,
      };

      const result = analyzeScribingSkillEffects(
        mockTalent,
        [], // Empty abilities
        [],
        [],
        [],
        [],
        [],
        [],
        1,
      );

      expect(result).not.toBeNull();
      expect(result!.grimoire).toBe(Grimoire.BANNER_BEARER);
      expect(result!.effects).toHaveLength(0);
    });
  });
});
