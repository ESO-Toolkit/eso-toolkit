import { FightFragment } from '../../graphql/generated';
import { KnownAbilities } from '../../types/abilities';
import {
  ApplyBuffEvent,
  ApplyDebuffEvent,
  CombatantAura,
  CombatantGear,
  CombatantInfoEvent,
  DamageEvent,
  HitType,
  Resources,
} from '../../types/combatlogEvents';

// Mock data interfaces
export interface MockData {
  friendlyBuffEvents: ApplyBuffEvent[];
  damageEvents: DamageEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
  debuffEvents: ApplyDebuffEvent[];
}

// Mock data factories for combat log events
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

export const createMockCombatantGear = (type = 1): CombatantGear => ({
  id: 1,
  type,
  quality: 4,
  icon: 'test-icon.jpg',
  name: 'Mock Gear Item',
  championPoints: 160,
  trait: 1,
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

// Predefined mock data sets
export const basicMockData: MockData = {
  friendlyBuffEvents: [],
  damageEvents: [],
  combatantInfoEvents: [createMockCombatantInfoEvent()],
  debuffEvents: [],
};

// Additional mock data factories for damage events
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

export const createMockDebuffEvent = (overrides?: Partial<ApplyDebuffEvent>): ApplyDebuffEvent => ({
  timestamp: 1000000,
  type: 'applydebuff',
  fight: 1,
  sourceID: 123,
  sourceIsFriendly: true,
  targetID: 456,
  targetIsFriendly: false,
  abilityGameID: KnownAbilities.HEMORRHAGE,
  ...overrides,
});

// High critical damage scenario mock data
export const highCriticalDamageMockData: MockData = {
  friendlyBuffEvents: [
    createMockBuffEvent({ abilityGameID: KnownAbilities.MINOR_FORCE, timestamp: 1000000 }),
    createMockBuffEvent({ abilityGameID: KnownAbilities.PIERCING_SPEAR, timestamp: 1005000 }),
  ],
  damageEvents: [
    createMockDamageEvent({ amount: 2000, hitType: 2, timestamp: 1010000 }), // Critical hit
    createMockDamageEvent({ amount: 1800, hitType: 2, timestamp: 1015000 }), // Critical hit
    createMockDamageEvent({ amount: 1000, hitType: 1, timestamp: 1020000 }), // Normal hit
  ],
  combatantInfoEvents: [createMockCombatantInfoEvent()],
  debuffEvents: [
    createMockDebuffEvent({ abilityGameID: KnownAbilities.HEMORRHAGE, timestamp: 1000000 }),
  ],
};

// No critical damage sources scenario
export const noCriticalDamageSourcesMockData: MockData = {
  friendlyBuffEvents: [],
  damageEvents: [
    createMockDamageEvent({ amount: 1000, hitType: 1, timestamp: 1010000 }), // Normal hit only
    createMockDamageEvent({ amount: 1050, hitType: 1, timestamp: 1015000 }), // Normal hit only
  ],
  combatantInfoEvents: [
    createMockCombatantInfoEvent({
      auras: [], // No critical damage auras
    }),
  ],
  debuffEvents: [],
};

// Performance test mock data with large dataset
export const performanceTestMockData: MockData = {
  friendlyBuffEvents: Array.from({ length: 100 }, (_, i) =>
    createMockBuffEvent({
      timestamp: 1000000 + i * 3000, // Every 3 seconds
      abilityGameID: i % 2 === 0 ? KnownAbilities.MINOR_FORCE : KnownAbilities.PIERCING_SPEAR,
    })
  ),
  damageEvents: Array.from({ length: 500 }, (_, i) =>
    createMockDamageEvent({
      timestamp: 1000000 + i * 600, // Every 0.6 seconds
      amount: Math.floor(Math.random() * 2000) + 500,
      hitType: Math.random() > 0.7 ? 2 : 1, // 30% critical hits
      abilityGameID: Math.floor(Math.random() * 5) + 1,
    })
  ),
  combatantInfoEvents: [createMockCombatantInfoEvent()],
  debuffEvents: Array.from({ length: 50 }, (_, i) =>
    createMockDebuffEvent({
      timestamp: 1000000 + i * 6000, // Every 6 seconds
    })
  ),
};
