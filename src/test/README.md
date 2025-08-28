# Testing Utilities

This directory contains organized testing utilities for Storybook stories, component testing, and mock data creation throughout the ESO Log Aggregator project.

## Directory Structure

```
src/test/
├── index.ts                    # Re-exports all testing utilities
├── utils/                      # NEW: Organized mock utilities (recommended)
│   ├── index.ts               # Main utility exports
│   ├── combatLogMockFactories.ts # Combat log event factories
│   ├── playerMockFactories.ts   # Player and combatant factories
│   ├── reduxMockFactories.ts    # Redux state factories
│   ├── testUtilities.ts        # General test helpers
│   ├── mockDataSets.ts         # Predefined data sets
│   └── README.md               # Detailed utility documentation
├── mocks/                      # Legacy mock data (backwards compatibility)
│   └── combatLogMocks.ts      # Original combat log mocks
├── decorators/                 # Storybook decorators
│   └── storybookDecorators.tsx # Standard decorators for stories
├── themes/                     # Theme configurations
│   └── storybookThemes.ts     # Material-UI themes for stories
└── EmptyMockComponent.tsx     # Existing empty mock component
```

## ⚡ Quick Start - New Code

For new tests and components, use the organized utilities:

```typescript
import {
  createMockDamageEvent,
  createMockPlayerData,
  basicMockData,
  MOCK_CONSTANTS,
} from '../test/utils';
```

## Legacy Support

Existing test files can continue using their current imports:

```typescript
import { createMockBuffEvent, basicMockData } from '../test';
```

Both approaches work thanks to re-exports in the main index file.

```
src/test/
├── index.ts                    # Re-exports all testing utilities
├── mocks/                      # Mock data factories and interfaces
│   └── combatLogMocks.ts      # Combat log event mock data
├── decorators/                 # Storybook decorators
│   └── storybookDecorators.tsx # Standard decorators for stories
├── themes/                     # Theme configurations
│   └── storybookThemes.ts     # Material-UI themes for stories
└── EmptyMockComponent.tsx     # Existing empty mock component
```

## Usage

### Mock Data

Import mock data factories and predefined datasets:

```typescript
import {
  basicMockData,
  createMockFight,
  createMockDamageEvent,
  highCriticalDamageMockData,
  noCriticalDamageSourcesMockData,
  performanceTestMockData,
} from '../../test';
```

### Storybook Decorators

Use the standard ESO log decorator for consistent theming and Redux state:

```typescript
import { withEsoLogDecorators, withReduxProvider } from '../../test';

const meta: Meta<typeof YourComponent> = {
  component: YourComponent,
  decorators: [withEsoLogDecorators(basicMockData)],
};

// For components that only need Redux:
const simpleReduxMeta: Meta<typeof SimpleComponent> = {
  component: SimpleComponent,
  decorators: [withReduxProvider],
};
```

### Available Decorators

- `withEsoLogDecorators(mockData)` - Full ESO log component decorator with Redux, themes, routing, and mock data
- `withBasicDecorators` - Minimal decorator with Redux, theme, and routing
- `withReduxProvider` - Redux-only decorator for components that only need Redux state
- `withCustomReportFightContext(reportId, fightId)` - Custom ReportFightContext values with Redux

All decorators now include a Redux Provider with a mock store that includes:

- Events data (combatantInfo, damage, buff/debuff events)
- UI state management
- Master data and player data
- Report data
- Simplified router state

### Mock Data Sets

- `basicMockData` - Minimal mock data for standard testing
- `highCriticalDamageMockData` - Rich dataset with high critical damage scenarios
- `noCriticalDamageSourcesMockData` - Empty state testing dataset
- `performanceTestMockData` - Large dataset for performance testing

### Themes

- `storybookDarkTheme` - Standard dark theme for ESO log components
- `storybookLightTheme` - Light theme variant for testing

## Benefits

1. **Consistency**: All components use the same theming and mock data structure
2. **Reusability**: Mock data factories can be reused across different stories
3. **Organization**: Separates concerns - mocks, decorators, and themes are in dedicated files
4. **Maintainability**: Easy to update themes or mock data in one place
5. **Type Safety**: All mock data is properly typed with TypeScript

## Adding New Mock Data

1. Add new factory functions to `combatLogMocks.ts`
2. Export the new mocks from the main index file
3. Create predefined datasets for common scenarios
4. Document the new mocks in this README

## Adding New Decorators

1. Add new decorator functions to `storybookDecorators.tsx`
2. Re-export from index.ts
3. Document usage patterns above
