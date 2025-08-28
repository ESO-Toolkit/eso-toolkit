import { KnownAbilities } from '../../types/abilities';
import {
  ApplyBuffEvent,
  RemoveBuffEvent,
  ApplyDebuffEvent,
  RemoveDebuffEvent,
} from '../../types/combatlogEvents';

import {
  createMockBuffEvent,
  createMockDamageEvent,
  createMockDebuffEvent,
  createMockCombatantInfoEvent,
  createMockRemoveBuffEvent,
  createMockRemoveDebuffEvent,
} from './combatLogMockFactories';

/**
 * Predefined mock data sets for common testing scenarios
 */

export interface MockData {
  friendlyBuffEvents: (ApplyBuffEvent | RemoveBuffEvent)[];
  damageEvents: ReturnType<typeof createMockDamageEvent>[];
  combatantInfoEvents: ReturnType<typeof createMockCombatantInfoEvent>[];
  debuffEvents: (ApplyDebuffEvent | RemoveDebuffEvent)[];
}

/**
 * Basic mock data set with minimal events
 */
export const basicMockData: MockData = {
  friendlyBuffEvents: [],
  damageEvents: [],
  combatantInfoEvents: [createMockCombatantInfoEvent()],
  debuffEvents: [],
};

/**
 * High critical damage scenario with various buff sources
 */
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

/**
 * No critical damage sources scenario for baseline testing
 */
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

/**
 * Performance test mock data with large datasets
 */
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

/**
 * Mock data for testing complex buff interactions
 */
export const complexBuffInteractionsMockData: MockData = {
  friendlyBuffEvents: [
    // Overlapping buffs
    createMockBuffEvent({ abilityGameID: KnownAbilities.MINOR_FORCE, timestamp: 1000000 }),
    createMockBuffEvent({ abilityGameID: KnownAbilities.MAJOR_FORCE, timestamp: 1005000 }),
    createMockRemoveBuffEvent({
      abilityGameID: KnownAbilities.MINOR_FORCE,
      timestamp: 1030000,
    }),
    createMockRemoveBuffEvent({
      abilityGameID: KnownAbilities.MAJOR_FORCE,
      timestamp: 1035000,
    }),
  ],
  damageEvents: [
    createMockDamageEvent({ amount: 1500, hitType: 2, timestamp: 1010000 }),
    createMockDamageEvent({ amount: 1200, hitType: 1, timestamp: 1020000 }),
    createMockDamageEvent({ amount: 1800, hitType: 2, timestamp: 1025000 }),
    createMockDamageEvent({ amount: 1000, hitType: 1, timestamp: 1040000 }),
  ],
  combatantInfoEvents: [createMockCombatantInfoEvent()],
  debuffEvents: [
    createMockDebuffEvent({ abilityGameID: KnownAbilities.HEMORRHAGE, timestamp: 1000000 }),
    createMockRemoveDebuffEvent({
      abilityGameID: KnownAbilities.HEMORRHAGE,
      timestamp: 1040000,
    }),
  ],
};

/**
 * Mock data for testing edge cases and boundary conditions
 */
export const edgeCasesMockData: MockData = {
  friendlyBuffEvents: [
    // Very short duration buff
    createMockBuffEvent({ abilityGameID: KnownAbilities.MINOR_FORCE, timestamp: 1000000 }),
    createMockRemoveBuffEvent({
      abilityGameID: KnownAbilities.MINOR_FORCE,
      timestamp: 1000100, // 100ms later
    }),
  ],
  damageEvents: [
    // Zero damage event
    createMockDamageEvent({ amount: 0, hitType: 1, timestamp: 1000050 }),
    // Maximum damage event
    createMockDamageEvent({ amount: 999999, hitType: 2, timestamp: 1000200 }),
  ],
  combatantInfoEvents: [
    createMockCombatantInfoEvent({
      auras: [], // Empty auras
      gear: [], // Empty gear
    }),
  ],
  debuffEvents: [],
};
