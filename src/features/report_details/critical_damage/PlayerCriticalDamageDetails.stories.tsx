import type { Meta, StoryObj } from '@storybook/react';

import { LOCAL_STORAGE_ACCESS_TOKEN_KEY } from '../../../auth';
import {
  basicMockData,
  createMockFight,
  highCriticalDamageMockData,
  noCriticalDamageSourcesMockData,
  performanceTestMockData,
  withEsoLogDecorators,
  withLocalStorage,
  withMockReportFightContext,
} from '../../../test';

// Import the real component
import { PlayerCriticalDamageDetails } from './PlayerCriticalDamageDetails';

// Storybook Meta configuration - now using the real component with react-docgen-typescript
const meta: Meta<typeof PlayerCriticalDamageDetails> = {
  title: 'Features/Report Details/Critical Damage/PlayerCriticalDamageDetails',
  component: PlayerCriticalDamageDetails,
  decorators: [
    withMockReportFightContext,
    withLocalStorage({
      [LOCAL_STORAGE_ACCESS_TOKEN_KEY]: 'some-key',
    }),
    withEsoLogDecorators(basicMockData),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Player Critical Damage Details component shows critical damage analysis for a specific player in a fight, including sources, multipliers, and timeline charts. This component uses react-docgen-typescript to automatically infer prop types and generate documentation.',
      },
    },
  },
  // Remove manual argTypes to let react-docgen-typescript auto-generate them
  argTypes: {
    // Only override specific controls that need customization
    onExpandChange: {
      action: 'onExpandChange',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerCriticalDamageDetails>;

// Stories - now using the real component with automatically inferred props
export const Default: Story = {
  args: {
    id: 123,
    name: 'Player One',
    fight: createMockFight(),
    expanded: false,
  },
};

export const Expanded: Story = {
  args: {
    id: 123,
    name: 'Player One',
    fight: createMockFight(),
    expanded: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the component in expanded state with all details visible, including critical damage timeline chart and source breakdown.',
      },
    },
  },
};

export const HighCriticalDamage: Story = {
  args: {
    id: 456,
    name: 'High Crit Player',
    fight: createMockFight(),
    expanded: true,
  },
  decorators: [withEsoLogDecorators(highCriticalDamageMockData)],
  parameters: {
    docs: {
      description: {
        story:
          'Player with high critical damage output, showing multiple critical hit damage events and active damage multiplier sources.',
      },
    },
  },
};

export const NoCriticalDamageSources: Story = {
  args: {
    id: 789,
    name: 'No Crit Player',
    fight: createMockFight(),
    expanded: true,
  },
  decorators: [withEsoLogDecorators(noCriticalDamageSourcesMockData)],
  parameters: {
    docs: {
      description: {
        story:
          'Player with no active critical damage sources, demonstrating the empty state or baseline critical damage display.',
      },
    },
  },
};

export const PerformanceTest: Story = {
  args: {
    id: 999,
    name: 'Performance Test Player',
    fight: createMockFight({ endTime: 1300000 }), // 5 minute fight
    expanded: true,
  },
  decorators: [withEsoLogDecorators(performanceTestMockData)],
  parameters: {
    docs: {
      description: {
        story:
          'Performance test story with a large dataset for testing render performance and component optimization.',
      },
    },
  },
};
