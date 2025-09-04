import { FightFragment } from '../../graphql/generated';
import { KnownAbilities } from '../../types/abilities';
import {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  RemoveBuffEvent,
  RemoveDebuffEvent,
  CombatantAura,
  CombatantInfoEvent,
  DamageEvent,
  DeathEvent,
  BeginCastEvent,
  CastEvent,
  HitType,
  Resources,
} from '../../types/combatlogEvents';
import { PlayerGear, GearTrait } from '../../types/playerDetails';

/**
 * Factory functions for creating mock combat log events
 */

export const createMockResources = (overrides?: Partial<Resources>): Resources => ({
  hitPoints: 30000,
  maxHitPoints: 30000,
  magicka: 15000,
  maxMagicka: 15000,
  stamina: 12000,
  maxStamina: 12000,
  ultimate: 50,
  maxUltimate: 500,
  werewolf: 0,
  maxWerewolf: 0,
  absorb: 0,
  championPoints: 810,
  x: 100,
  y: 200,
  facing: 0,
  ...overrides,
});

export const createMockFight = (overrides?: Partial<FightFragment>): FightFragment =>
  ({
    id: '1',
    startTime: 1000000,
    endTime: 1060000, // 60 second fight
    name: 'Mock Boss Fight',
    ...overrides,
  }) as FightFragment;

export const createMockCombatantGear = (type = 1): PlayerGear => ({
  id: 1,
  slot: 1,
  type,
  quality: 4,
  icon: 'test-icon.jpg',
  name: 'Mock Gear Item',
  championPoints: 160,
  trait: GearTrait.SHARPENED,
  enchantType: 1,
  enchantQuality: 4,
  setID: 123,
});

export const createMockCombatantAura = (overrides?: Partial<CombatantAura>): CombatantAura =>
  ({
    ability: KnownAbilities.HEMORRHAGE,
    name: 'Hemorrhage',
    stacks: 1,
    source: 123,
    icon: 'hemorrhage.jpg',
    ...overrides,
  }) as CombatantAura;

export const createMockCombatantInfoEvent = (
  overrides?: Partial<CombatantInfoEvent>
): CombatantInfoEvent => ({
  timestamp: 1000000,
  type: 'combatantinfo',
  fight: 1,
  sourceID: 123,
  auras: [
    createMockCombatantAura({ ability: KnownAbilities.MINOR_FORCE, name: 'Minor Force' }),
    createMockCombatantAura({ ability: KnownAbilities.PIERCING_SPEAR, name: 'Piercing Spear' }),
    createMockCombatantAura({ ability: KnownAbilities.DEXTERITY, name: 'Dexterity' }),
  ],
  gear: [
    createMockCombatantGear(1), // Heavy armor
    createMockCombatantGear(2), // Medium armor
    createMockCombatantGear(2), // Medium armor
    createMockCombatantGear(2), // Medium armor
    createMockCombatantGear(3), // Light armor
  ],
  ...overrides,
});

export const createMockDamageEvent = (overrides?: Partial<DamageEvent>): DamageEvent => ({
  timestamp: 1000000,
  type: 'damage',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.HEMORRHAGE,
  amount: 1000,
  hitType: HitType.Normal,
  castTrackID: 1,
  sourceResources: createMockResources(),
  targetResources: createMockResources({ hitPoints: 25000 }),
  ...overrides,
});

export const createMockBuffEvent = (overrides?: Partial<ApplyBuffEvent>): ApplyBuffEvent => ({
  timestamp: 1000000,
  type: 'applybuff',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 123,
  targetIsFriendly: true,
  abilityGameID: KnownAbilities.MINOR_FORCE,
  extraAbilityGameID: 0,
  ...overrides,
});

export const createMockRemoveBuffEvent = (
  overrides?: Partial<RemoveBuffEvent>
): RemoveBuffEvent => ({
  timestamp: 1000000,
  type: 'removebuff',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 123,
  targetIsFriendly: true,
  abilityGameID: KnownAbilities.MINOR_FORCE,
  extraAbilityGameID: 0,
  ...overrides,
});

export const createMockDebuffEvent = (overrides?: Partial<ApplyDebuffEvent>): ApplyDebuffEvent => ({
  timestamp: 1000000,
  type: 'applydebuff',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.HEMORRHAGE,
  extraAbilityGameID: 0,
  ...overrides,
});

export const createMockRemoveDebuffEvent = (
  overrides?: Partial<RemoveDebuffEvent>
): RemoveDebuffEvent => ({
  timestamp: 1000000,
  type: 'removedebuff',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.HEMORRHAGE,
  extraAbilityGameID: 0,
  ...overrides,
});

export const createMockDeathEvent = (overrides?: Partial<DeathEvent>): DeathEvent => ({
  timestamp: 1000000,
  type: 'death',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: false,
  targetID: 456,
  targetInstance: 1,
  targetIsFriendly: true,
  abilityGameID: KnownAbilities.HURRICANE,
  castTrackID: 1,
  sourceResources: createMockResources(),
  targetResources: createMockResources(),
  amount: 5000,
  ...overrides,
});

export const createMockBeginCastEvent = (overrides?: Partial<BeginCastEvent>): BeginCastEvent => ({
  timestamp: 1000000,
  type: 'begincast',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.RESURRECT,
  castTrackID: 1,
  sourceResources: createMockResources(),
  targetResources: createMockResources(),
  fake: false,
  ...overrides,
});

export const createMockCastEvent = (overrides?: Partial<CastEvent>): CastEvent => ({
  timestamp: 1000000,
  type: 'cast',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.HURRICANE,
  fake: false,
  ...overrides,
});
