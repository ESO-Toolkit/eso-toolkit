/**
 * Tests for Buff Checklist Utilities
 */

import { BuffEvent, CombatantInfoEvent } from '../../../types/combatlogEvents';
import type { AbilityData } from '../../../contexts/AbilityIdMapperContext';
import { analyzeBuffChecklist } from './buffChecklistUtils';

// Mock ability mapper
const mockAbilityMapper = {
  getAbilityById: (_id: number): AbilityData | null => null, // Returns null by default (tests don't use it)
};

describe('analyzeBuffChecklist', () => {
  const PLAYER_ID = 1;
  const DUMMY_ID = 3;
  const FIGHT_START = 1000000;
  const FIGHT_END = 1060000;

  // Empty combatant info events for most tests
  const emptyCombatantInfo: CombatantInfoEvent[] = [];

  it('should detect buffs provided by dummy only', () => {
    const majorSlayerId = 93109;
    const buffEvents: BuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true, // Dummy buffs still show as friendly
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      emptyCombatantInfo,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    const majorSlayerBuff = result.majorBuffs.find((b) => b.buffName === 'Major Slayer');
    expect(majorSlayerBuff).toBeDefined();
    expect(majorSlayerBuff?.isProvidedByDummy).toBe(true);
    expect(majorSlayerBuff?.isProvidedByPlayer).toBe(false);
    expect(majorSlayerBuff?.isRedundant).toBe(false);
  });

  it('should detect buffs provided by player only', () => {
    const majorSlayerId = 93109;
    const buffEvents: BuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      emptyCombatantInfo,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    const majorSlayerBuff = result.majorBuffs.find((b) => b.buffName === 'Major Slayer');
    expect(majorSlayerBuff).toBeDefined();
    expect(majorSlayerBuff?.isProvidedByDummy).toBe(false);
    expect(majorSlayerBuff?.isProvidedByPlayer).toBe(true);
    expect(majorSlayerBuff?.isRedundant).toBe(false);
  });

  it('should detect redundant buffs (provided by both dummy and player)', () => {
    const majorSlayerId = 93109;
    const buffEvents: BuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true, // Dummy buffs show as friendly
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
      {
        timestamp: FIGHT_START + 2000,
        type: 'applybuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      emptyCombatantInfo,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    const majorSlayerBuff = result.majorBuffs.find((b) => b.buffName === 'Major Slayer');
    expect(majorSlayerBuff).toBeDefined();
    expect(majorSlayerBuff?.isProvidedByDummy).toBe(true);
    expect(majorSlayerBuff?.isProvidedByPlayer).toBe(true);
    expect(majorSlayerBuff?.isRedundant).toBe(true);
    expect(result.redundantBuffs).toContain('Major Slayer');
    expect(result.summary.totalRedundantBuffs).toBeGreaterThan(0);
  });

  it('should categorize buffs correctly', () => {
    const majorSlayerId = 93109; // Major buff
    const minorBerserkId = 61744; // Minor buff

    const buffEvents: BuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: minorBerserkId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      emptyCombatantInfo,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    expect(result.majorBuffs.length).toBeGreaterThan(0);
    expect(result.minorBuffs.length).toBeGreaterThan(0);
    expect(result.majorBuffs.every((b) => b.category === 'major')).toBe(true);
    expect(result.minorBuffs.every((b) => b.category === 'minor')).toBe(true);
  });

  it('should calculate summary statistics correctly', () => {
    const majorSlayerId = 93109;
    const minorBerserkId = 61744;

    const buffEvents: BuffEvent[] = [
      // Dummy provides Major Slayer
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true, // Dummy buffs show as friendly
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
      // Player also provides Major Slayer (redundant)
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: majorSlayerId,
        fight: 1,
        extraAbilityGameID: 0,
      },
      // Dummy provides Minor Berserk
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true, // Dummy buffs show as friendly
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: minorBerserkId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      emptyCombatantInfo,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    expect(result.summary.totalDummyBuffs).toBe(2); // Major Slayer + Minor Berserk
    expect(result.summary.totalPlayerBuffs).toBe(1); // Only Major Slayer
    expect(result.summary.totalRedundantBuffs).toBe(1); // Major Slayer is redundant
  });

  it('should detect player buffs from combatant info auras', () => {
    const majorSlayerId = 93109;
    const minorBerserkId = 61744;

    // No buff events, but player has buffs in auras
    const buffEvents: BuffEvent[] = [];

    const combatantInfoEvents: CombatantInfoEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'combatantinfo',
        fight: 1,
        sourceID: PLAYER_ID,
        gear: [],
        auras: [
          {
            source: PLAYER_ID,
            ability: majorSlayerId,
            stacks: 1,
            icon: 'ability_buff_major_slayer.dds',
            name: 'Major Slayer',
          },
          {
            source: PLAYER_ID,
            ability: minorBerserkId,
            stacks: 1,
            icon: 'ability_buff_minor_berserk.dds',
            name: 'Minor Berserk',
          },
        ],
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      combatantInfoEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    const majorSlayerBuff = result.majorBuffs.find((b) => b.buffName === 'Major Slayer');
    const minorBerserkBuff = result.minorBuffs.find((b) => b.buffName === 'Minor Berserk');

    expect(majorSlayerBuff).toBeDefined();
    expect(majorSlayerBuff?.isProvidedByPlayer).toBe(true);
    expect(majorSlayerBuff?.isProvidedByDummy).toBe(false);

    expect(minorBerserkBuff).toBeDefined();
    expect(minorBerserkBuff?.isProvidedByPlayer).toBe(true);
    expect(minorBerserkBuff?.isProvidedByDummy).toBe(false);
  });

  it('should treat known trial dummy support buffs in auras as dummy provided', () => {
    const hircineId = 120026;

    const buffEvents: BuffEvent[] = [];

    const combatantInfoEvents: CombatantInfoEvent[] = [
      {
        timestamp: FIGHT_START + 1200,
        type: 'combatantinfo',
        fight: 1,
        sourceID: PLAYER_ID,
        gear: [],
        auras: [
          {
            source: PLAYER_ID,
            ability: hircineId,
            stacks: 1,
            icon: 'gear_artifactsaviorhidemd_head_a',
            name: "Hircine's Veneer",
          },
        ],
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      combatantInfoEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    const hircineBuff = result.supportBuffs.find((b) => b.buffName === "Hircine's Veneer");
    expect(hircineBuff).toBeDefined();
    expect(hircineBuff?.isProvidedByDummy).toBe(true);
    expect(hircineBuff?.isProvidedByPlayer).toBe(false);
    expect(hircineBuff?.isRedundant).toBe(false);
  });

  it('should detect buffs not in the hardcoded list', () => {
    const unknownBuffId = 999999; // Not in hardcoded list

    const buffEvents: BuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applybuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: PLAYER_ID,
        targetIsFriendly: true,
        abilityGameID: unknownBuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const combatantInfoEvents: CombatantInfoEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'combatantinfo',
        fight: 1,
        sourceID: PLAYER_ID,
        gear: [],
        auras: [
          {
            source: PLAYER_ID,
            ability: unknownBuffId,
            stacks: 1,
            icon: 'unknown_buff.dds',
            name: 'Custom Player Buff',
          },
        ],
      },
    ];

    const result = analyzeBuffChecklist(
      buffEvents,
      combatantInfoEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      mockAbilityMapper,
    );

    // Should find the unknown buff with name from aura
    const customBuff = result.supportBuffs.find((b) => b.buffName === 'Custom Player Buff');
    expect(customBuff).toBeDefined();
    expect(customBuff?.isProvidedByPlayer).toBe(true);
    expect(customBuff?.isProvidedByDummy).toBe(false);
    expect(customBuff?.abilityIds).toContain(unknownBuffId);
  });
});
