/**
 * Tests for role detection signal extraction
 */

import { ArmorType, GearSlot, WeaponType } from '@/types/playerDetails';
import {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  CastEvent,
  CombatantInfoEvent,
  DamageEvent,
  HealEvent,
  RemoveDebuffEvent,
} from '@/types/combatlogEvents';

import { extractSignals, FightContext, RoleDetectionEvents } from '../extractSignals';

// Test constants
const FIGHT_ID = 1;
const FIGHT_START = 1000000;
const FIGHT_END = 1060000; // 60 seconds
const BOSS_ID = 100;
const PLAYER_TANK = 1;
const PLAYER_HEALER = 2;
const PLAYER_DPS1 = 3;
const PLAYER_DPS2 = 4;

function createContext(overrides?: Partial<FightContext>): FightContext {
  const playerNames = new Map<number, string>();
  playerNames.set(PLAYER_TANK, 'Tank');
  playerNames.set(PLAYER_HEALER, 'Healer');
  playerNames.set(PLAYER_DPS1, 'DPS1');
  playerNames.set(PLAYER_DPS2, 'DPS2');

  return {
    fightId: FIGHT_ID,
    startTime: FIGHT_START,
    endTime: FIGHT_END,
    friendlyPlayerIds: [PLAYER_TANK, PLAYER_HEALER, PLAYER_DPS1, PLAYER_DPS2],
    enemyNpcIds: [BOSS_ID],
    primaryBossId: BOSS_ID,
    playerNames,
    ...overrides,
  };
}

function emptyEvents(overrides?: Partial<RoleDetectionEvents>): RoleDetectionEvents {
  return {
    damageEvents: [],
    healEvents: [],
    castEvents: [],
    applyDebuffEvents: [],
    removeDebuffEvents: [],
    applyBuffEvents: [],
    combatantInfoEvents: [],
    ...overrides,
  };
}

function makeDamageEvent(sourceID: number, amount: number, targetID = BOSS_ID): DamageEvent {
  return {
    timestamp: FIGHT_START + 1000,
    type: 'damage',
    sourceID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: false,
    abilityGameID: 1234,
    fight: FIGHT_ID,
    hitType: 1,
    amount,
    castTrackID: 0,
    sourceResources: {} as DamageEvent['sourceResources'],
    targetResources: {} as DamageEvent['targetResources'],
  };
}

function makeHealEvent(
  sourceID: number,
  amount: number,
  overheal = 0,
  targetID = PLAYER_DPS1,
): HealEvent {
  return {
    timestamp: FIGHT_START + 1000,
    type: 'heal',
    sourceID,
    sourceIsFriendly: true,
    targetID,
    targetIsFriendly: true,
    abilityGameID: 5678,
    fight: FIGHT_ID,
    hitType: 1,
    amount,
    overheal,
    castTrackID: 0,
    sourceResources: {} as HealEvent['sourceResources'],
    targetResources: {} as HealEvent['targetResources'],
  };
}

function makeDamageTakenEvent(targetID: number, amount: number, blocked = 0): DamageEvent {
  return {
    timestamp: FIGHT_START + 1000,
    type: 'damage',
    sourceID: BOSS_ID,
    sourceIsFriendly: false,
    targetID,
    targetIsFriendly: false,
    abilityGameID: 9999,
    fight: FIGHT_ID,
    hitType: 1,
    amount,
    blocked: blocked || undefined,
    castTrackID: 0,
    sourceResources: {} as DamageEvent['sourceResources'],
    targetResources: {} as DamageEvent['targetResources'],
  };
}

function makeCombatantInfo(
  sourceID: number,
  gear: Partial<CombatantInfoEvent['gear'][0]>[],
): CombatantInfoEvent {
  return {
    timestamp: FIGHT_START,
    type: 'combatantinfo',
    fight: FIGHT_ID,
    sourceID,
    gear: gear.map((g) => ({
      id: 0,
      slot: 0,
      quality: 5,
      icon: '',
      championPoints: 160,
      trait: 0,
      enchantType: 0,
      enchantQuality: 0,
      setID: 0,
      type: 1 as ArmorType,
      ...g,
    })),
    auras: [],
  };
}

describe('extractSignals', () => {
  it('should initialize signals for all players', () => {
    const context = createContext();
    const result = extractSignals(emptyEvents(), context);

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.playerId).sort()).toEqual([1, 2, 3, 4]);
  });

  it('should set player names from context', () => {
    const context = createContext();
    const result = extractSignals(emptyEvents(), context);

    const tank = result.find((s) => s.playerId === PLAYER_TANK);
    expect(tank?.playerName).toBe('Tank');
  });

  describe('damage signals', () => {
    it('should sum damage per player', () => {
      const events = emptyEvents({
        damageEvents: [
          makeDamageEvent(PLAYER_DPS1, 10000),
          makeDamageEvent(PLAYER_DPS1, 5000),
          makeDamageEvent(PLAYER_DPS2, 8000),
        ],
      });

      const result = extractSignals(events, createContext());

      const dps1 = result.find((s) => s.playerId === PLAYER_DPS1)!;
      expect(dps1.totalDamage).toBe(15000);
      expect(dps1.dps).toBe(250); // 15000 / 60s
    });

    it('should compute damage share of group', () => {
      const events = emptyEvents({
        damageEvents: [makeDamageEvent(PLAYER_DPS1, 75000), makeDamageEvent(PLAYER_DPS2, 25000)],
      });

      const result = extractSignals(events, createContext());

      const dps1 = result.find((s) => s.playerId === PLAYER_DPS1)!;
      expect(dps1.damageShareOfGroup).toBeCloseTo(0.75);
    });
  });

  describe('healing signals', () => {
    it('should sum healing per player', () => {
      const events = emptyEvents({
        healEvents: [makeHealEvent(PLAYER_HEALER, 20000), makeHealEvent(PLAYER_HEALER, 10000)],
      });

      const result = extractSignals(events, createContext());

      const healer = result.find((s) => s.playerId === PLAYER_HEALER)!;
      expect(healer.totalHealing).toBe(30000);
      expect(healer.hps).toBe(500); // 30000 / 60s
    });

    it('should compute overheal ratio', () => {
      const events = emptyEvents({
        healEvents: [
          makeHealEvent(PLAYER_HEALER, 7000, 3000), // 7000 effective + 3000 overheal = 70% effective
        ],
      });

      const result = extractSignals(events, createContext());

      const healer = result.find((s) => s.playerId === PLAYER_HEALER)!;
      expect(healer.overhealRatio).toBeCloseTo(0.3); // 30% overheal
    });
  });

  describe('damage taken signals', () => {
    it('should track damage taken per player', () => {
      const events = emptyEvents({
        damageEvents: [
          makeDamageTakenEvent(PLAYER_TANK, 50000),
          makeDamageTakenEvent(PLAYER_DPS1, 5000),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.damageTaken).toBe(50000);
      expect(tank.totalHitsTaken).toBe(1);
    });

    it('should count blocked hits', () => {
      const events = emptyEvents({
        damageEvents: [
          makeDamageTakenEvent(PLAYER_TANK, 5000, 3000),
          makeDamageTakenEvent(PLAYER_TANK, 5000, 0),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.blockedHitCount).toBe(1);
      expect(tank.totalHitsTaken).toBe(2);
    });
  });

  describe('gear signals', () => {
    it('should detect shield weapon', () => {
      const events = emptyEvents({
        combatantInfoEvents: [
          makeCombatantInfo(PLAYER_TANK, [{ slot: GearSlot.OFF_HAND, type: WeaponType.SHIELD }]),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.hasShieldWeapon).toBe(true);
    });

    it('should detect frost staff', () => {
      const events = emptyEvents({
        combatantInfoEvents: [
          makeCombatantInfo(PLAYER_TANK, [
            { slot: GearSlot.BACKUP_MAIN_HAND, type: WeaponType.FROST_STAFF },
          ]),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.hasFrostStaff).toBe(true);
    });

    it('should count heavy armor pieces', () => {
      const events = emptyEvents({
        combatantInfoEvents: [
          makeCombatantInfo(PLAYER_TANK, [
            { slot: GearSlot.HEAD, type: ArmorType.HEAVY },
            { slot: GearSlot.CHEST, type: ArmorType.HEAVY },
            { slot: GearSlot.SHOULDERS, type: ArmorType.HEAVY },
            { slot: GearSlot.WAIST, type: ArmorType.HEAVY },
            { slot: GearSlot.HANDS, type: ArmorType.HEAVY },
            { slot: GearSlot.LEGS, type: ArmorType.LIGHT },
            { slot: GearSlot.FEET, type: ArmorType.LIGHT },
          ]),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.heavyArmorCount).toBe(5);
    });

    it('should classify known set IDs', () => {
      const events = emptyEvents({
        combatantInfoEvents: [
          makeCombatantInfo(PLAYER_TANK, [
            { slot: GearSlot.HEAD, setID: 446 }, // CLAW_OF_YOLNAHKRIIN (tank set)
            { slot: GearSlot.CHEST, setID: 446 },
            { slot: GearSlot.SHOULDERS, setID: 276 }, // TREMORSCALE (tank monster)
          ]),
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.tankSetIds).toContain(446);
      expect(tank.tankSetIds).toContain(276);
    });
  });

  describe('taunt signals', () => {
    it('should count taunt ability casts', () => {
      const events = emptyEvents({
        castEvents: [
          {
            timestamp: FIGHT_START + 1000,
            type: 'cast',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: BOSS_ID,
            targetIsFriendly: false,
            abilityGameID: 28306, // Puncture
            fight: FIGHT_ID,
          },
          {
            timestamp: FIGHT_START + 16000,
            type: 'cast',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: BOSS_ID,
            targetIsFriendly: false,
            abilityGameID: 38250, // Pierce Armor
            fight: FIGHT_ID,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.tauntCastCount).toBe(2);
    });

    it('should compute taunt uptime on boss from debuff events', () => {
      const events = emptyEvents({
        applyDebuffEvents: [
          {
            timestamp: FIGHT_START + 1000,
            type: 'applydebuff',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: BOSS_ID,
            targetIsFriendly: false,
            abilityGameID: 38254, // TAUNT debuff
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
        ],
        removeDebuffEvents: [
          {
            timestamp: FIGHT_START + 16000, // 15 seconds of taunt
            type: 'removedebuff',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: BOSS_ID,
            targetIsFriendly: false,
            abilityGameID: 38254,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.tauntUptimeOnBossMs).toBe(15000);
    });

    it('should track unique enemies taunted', () => {
      const ADD_1 = 101;
      const ADD_2 = 102;
      const events = emptyEvents({
        applyDebuffEvents: [
          {
            timestamp: FIGHT_START + 1000,
            type: 'applydebuff',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: BOSS_ID,
            targetIsFriendly: false,
            abilityGameID: 38254,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
          {
            timestamp: FIGHT_START + 2000,
            type: 'applydebuff',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: ADD_1,
            targetIsFriendly: false,
            abilityGameID: 38254,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
          {
            timestamp: FIGHT_START + 3000,
            type: 'applydebuff',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: ADD_2,
            targetIsFriendly: false,
            abilityGameID: 38254,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
        ],
        removeDebuffEvents: [],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.tauntedUniqueEnemies).toBe(3);
    });
  });

  describe('ultimate and buff signals', () => {
    it('should count horn casts', () => {
      const events = emptyEvents({
        castEvents: [
          {
            timestamp: FIGHT_START + 5000,
            type: 'cast',
            sourceID: PLAYER_TANK,
            sourceIsFriendly: true,
            targetID: PLAYER_TANK,
            targetIsFriendly: true,
            abilityGameID: 40223, // Aggressive Horn
            fight: FIGHT_ID,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const tank = result.find((s) => s.playerId === PLAYER_TANK)!;
      expect(tank.hornCasts).toBe(1);
    });

    it('should count barrier casts', () => {
      const events = emptyEvents({
        castEvents: [
          {
            timestamp: FIGHT_START + 5000,
            type: 'cast',
            sourceID: PLAYER_HEALER,
            sourceIsFriendly: true,
            targetID: PLAYER_HEALER,
            targetIsFriendly: true,
            abilityGameID: 40237, // Reviving Barrier
            fight: FIGHT_ID,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const healer = result.find((s) => s.playerId === PLAYER_HEALER)!;
      expect(healer.barrierCasts).toBe(1);
    });

    it('should count unique Major Courage targets', () => {
      const events = emptyEvents({
        applyBuffEvents: [
          {
            timestamp: FIGHT_START + 1000,
            type: 'applybuff',
            sourceID: PLAYER_HEALER,
            sourceIsFriendly: true,
            targetID: PLAYER_DPS1,
            targetIsFriendly: true,
            abilityGameID: 109966, // Major Courage
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
          {
            timestamp: FIGHT_START + 2000,
            type: 'applybuff',
            sourceID: PLAYER_HEALER,
            sourceIsFriendly: true,
            targetID: PLAYER_DPS2,
            targetIsFriendly: true,
            abilityGameID: 109966,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
          // Same target again — should not double-count
          {
            timestamp: FIGHT_START + 3000,
            type: 'applybuff',
            sourceID: PLAYER_HEALER,
            sourceIsFriendly: true,
            targetID: PLAYER_DPS1,
            targetIsFriendly: true,
            abilityGameID: 109966,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const healer = result.find((s) => s.playerId === PLAYER_HEALER)!;
      expect(healer.majorCourageTargets).toBe(2);
    });

    it('should not count self-applied Major Courage', () => {
      const events = emptyEvents({
        applyBuffEvents: [
          {
            timestamp: FIGHT_START + 1000,
            type: 'applybuff',
            sourceID: PLAYER_HEALER,
            sourceIsFriendly: true,
            targetID: PLAYER_HEALER, // self
            targetIsFriendly: true,
            abilityGameID: 109966,
            fight: FIGHT_ID,
            extraAbilityGameID: 0,
          },
        ],
      });

      const result = extractSignals(events, createContext());

      const healer = result.find((s) => s.playerId === PLAYER_HEALER)!;
      expect(healer.majorCourageTargets).toBe(0);
    });
  });
});
