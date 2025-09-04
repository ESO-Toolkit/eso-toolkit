# Test Utilities Documentation

This directory contains organized testing utilities for mock data creation, test helpers, and common testing patterns used throughout the ESO Log Aggregator project.

## Directory Structure

```
src/test/utils/
├── index.ts                          # Main export file
├── combatLogMockFactories.ts        # Combat log event mock factories
├── playerMockFactories.ts           # Player and combatant mock factories
├── reduxMockFactories.ts            # Redux state mock factories
├── testUtilities.ts                 # General test utilities and helpers
├── mockDataSets.ts                  # Predefined mock data sets for common scenarios
└── README.md                        # This documentation file
```

## Combat Log Mock Factories (`combatLogMockFactories.ts`)

Factory functions for creating mock combat log events:

### Basic Factories

- `createMockResources(overrides?)` - Creates mock resource state
- `createMockFight(overrides?)` - Creates mock fight data
- `createMockCombatantGear(type?)` - Creates mock gear items
- `createMockCombatantAura(overrides?)` - Creates mock aura/buff data

### Event Factories

- `createMockCombatantInfoEvent(overrides?)` - Creates mock combatant info events
- `createMockDamageEvent(overrides?)` - Creates mock damage events
- `createMockBuffEvent(overrides?)` - Creates mock buff application events
- `createMockRemoveBuffEvent(overrides?)` - Creates mock buff removal events
- `createMockDebuffEvent(overrides?)` - Creates mock debuff application events
- `createMockRemoveDebuffEvent(overrides?)` - Creates mock debuff removal events

## Player Mock Factories (`playerMockFactories.ts`)

Factory functions for creating mock player and combatant data:

### Main Factories

- `createMockCombatantInfo(gearOverrides?)` - Creates mock combatant with customizable gear
- `createMockPlayerData(overrides?)` - Creates mock PlayerDetailsWithRole
- `createGearItem(type, trait?, slot?)` - Creates individual gear items
- `createMockPlayerTalent(overrides?)` - Creates mock talent data
- `createMockCombatantInfoStructure(overrides?)` - Creates mock CombatantInfo structure

## Redux Mock Factories (`reduxMockFactories.ts`)

Factory functions for Redux state and selector testing:

- `createMockState(overrides?)` - Creates complete mock RootState
- `createMockSelectorBuffEvent(...)` - Creates buff events for selector testing
- `createMockSelectorDebuffEvent(...)` - Creates debuff events for selector testing

## Test Utilities (`testUtilities.ts`)

General purpose testing utilities and helpers:

### Constants

- `MOCK_CONSTANTS` - Standard test constants (abilities, targets, sources, fight data)

### Helper Functions

- `createBuffInterval(...)` - Creates mock buff intervals
- `createBuffLookup(intervals)` - Creates mock buff lookup data
- `createMockAbilitiesById(abilityIds)` - Creates abilities lookup
- `generateMockArray(length, factory)` - Generates arrays of mock data

### Random Data Generation

- `createRandomTestData.timestamp(start, end)` - Random timestamps
- `createRandomTestData.abilityId(abilityIds)` - Random ability selection
- `createRandomTestData.damage(min, max)` - Random damage amounts
- `createRandomTestData.isCritical(critRate)` - Random critical determination

## Predefined Mock Data Sets (`mockDataSets.ts`)

Ready-to-use mock data collections for common testing scenarios:

### Data Sets

- `basicMockData` - Minimal data for standard testing
- `highCriticalDamageMockData` - Rich dataset with high crit scenarios
- `noCriticalDamageSourcesMockData` - Baseline testing without crit sources
- `performanceTestMockData` - Large dataset for performance testing (500 damage events, 100 buff events)
- `complexBuffInteractionsMockData` - Overlapping buffs and complex interactions
- `edgeCasesMockData` - Boundary conditions and edge cases

### MockData Interface

```typescript
interface MockData {
  friendlyBuffEvents: (ApplyBuffEvent | RemoveBuffEvent)[];
  damageEvents: DamageEvent[];
  combatantInfoEvents: CombatantInfoEvent[];
  debuffEvents: (ApplyDebuffEvent | RemoveDebuffEvent)[];
}
```

## Usage Examples

### Basic Usage

```typescript
import {
  createMockDamageEvent,
  createMockPlayerData,
  basicMockData,
  MOCK_CONSTANTS,
} from '../../test/utils';

// Create a single damage event
const damageEvent = createMockDamageEvent({
  amount: 1500,
  hitType: 2, // Critical
  timestamp: MOCK_CONSTANTS.FIGHT.START + 1000,
});

// Use predefined mock data
const testData = basicMockData;
```

### Creating Complex Scenarios

```typescript
import {
  createMockCombatantInfo,
  createGearItem,
  generateMockArray,
  createRandomTestData,
} from '../../test/utils';

// Create combatant with specific gear
const combatant = createMockCombatantInfo({
  [GearSlot.MAIN_HAND]: createGearItem(WeaponType.SWORD, GearTrait.SHARPENED, GearSlot.MAIN_HAND),
  [GearSlot.OFF_HAND]: createGearItem(WeaponType.DAGGER, GearTrait.SHARPENED, GearSlot.OFF_HAND),
});

// Generate performance test data
const largeDamageSet = generateMockArray(1000, (i) =>
  createMockDamageEvent({
    timestamp: createRandomTestData.timestamp(1000, 60000),
    amount: createRandomTestData.damage(500, 3000),
    hitType: createRandomTestData.isCritical(0.25) ? 2 : 1,
  }),
);
```

### Testing Redux Selectors

```typescript
import { createMockState, createMockSelectorBuffEvent } from '../../test/utils';

const testState = createMockState({
  events: {
    friendlyBuffs: {
      events: [
        createMockSelectorBuffEvent(1000, 123, 456),
        createMockSelectorBuffEvent(2000, 123, 456, 'removebuff'),
      ],
      loading: false,
      error: null,
    },
  },
});
```

## Integration with Existing Tests

This utility system replaces and consolidates mock functions previously scattered throughout:

- `src/test/mocks/combatLogMocks.ts` (old location)
- Individual test files with inline mock functions
- Storybook decorator mock data

### Migration Guide

- Replace `import {...} from '../mocks/combatLogMocks'` with `import {...} from '../utils'`
- Update function names if they've been renamed for clarity
- Use the new predefined data sets for common scenarios
- Leverage the enhanced type safety and better organization

## Best Practices

1. **Use Predefined Sets**: Start with predefined mock data sets when possible
2. **Consistent Constants**: Use `MOCK_CONSTANTS` for standard test values
3. **Type Safety**: All factories include full TypeScript typing
4. **Performance**: Use `performanceTestMockData` for large dataset tests
5. **Edge Cases**: Test boundary conditions with `edgeCasesMockData`
6. **Realistic Data**: Mock data reflects actual game mechanics and reasonable values

## Extending the Utilities

When adding new mock utilities:

1. Choose the appropriate file based on the utility's purpose
2. Follow the established naming conventions (`createMock...`)
3. Include TypeScript types and JSDoc comments
4. Add usage examples to this documentation
5. Update the main index.ts export
6. Consider adding predefined data sets for common use cases

This organized approach makes testing more consistent, maintainable, and reusable across the entire codebase.
