import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';

import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

const meta = {
  title: 'Features/BuffUptimes/BuffUptimeProgressBar',
  component: BuffUptimeProgressBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BuffUptimeProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock buff data
const createMockBuff = (name: string, uptime: number, groupAverage?: number): BuffUptime => ({
  abilityGameID: '12345',
  abilityName: name,
  icon: '1234',
  totalDuration: (uptime / 100) * 200000, // 200 seconds fight
  uptime: (uptime / 100) * 200, // seconds
  uptimePercentage: uptime,
  isDebuff: false,
  applications: Math.floor((uptime / 100) * 50),
  hostilityType: 0,
  uniqueKey: `${name}-0`,
  groupAverageUptimePercentage: groupAverage,
});

// Mock multi-stack buff (e.g., Stagger, Touch of Z'en)
const createMockMultiStackBuff = (
  name: string,
  maxStacks: number,
  stackUptimes: number[],
  stackGroupAverages?: number[],
): BuffUptime => {
  const allStacksData = stackUptimes.map((uptime, index) => ({
    stackLevel: index + 1,
    totalDuration: (uptime / 100) * 200000, // 200 seconds fight
    uptime: (uptime / 100) * 200, // seconds
    uptimePercentage: uptime,
    applications: Math.floor((uptime / 100) * 50),
    groupAverageUptimePercentage: stackGroupAverages?.[index],
  }));

  // Use highest stack as the default display
  const defaultStack = allStacksData[allStacksData.length - 1];

  return {
    abilityGameID: '12345',
    abilityName: name,
    icon: '1234',
    totalDuration: defaultStack.totalDuration,
    uptime: defaultStack.uptime,
    uptimePercentage: defaultStack.uptimePercentage,
    isDebuff: true,
    applications: defaultStack.applications,
    hostilityType: 1,
    uniqueKey: `${name}-0`,
    stackLevel: maxStacks,
    maxStacks,
    allStacksData,
  };
};

// Default story - group average (no delta)
export const GroupAverage: Story = {
  args: {
    buff: createMockBuff('Major Courage', 84),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: null,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Player above average
export const AboveAverage: Story = {
  args: {
    buff: createMockBuff('Minor Savagery', 99, 98),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Player below average
export const BelowAverage: Story = {
  args: {
    buff: createMockBuff('Major Savagery', 23, 31),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Player near average (no delta shown due to threshold)
export const NearAverage: Story = {
  args: {
    buff: createMockBuff('Major Courage', 84, 84.3),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Player significantly above average
export const SignificantlyAbove: Story = {
  args: {
    buff: createMockBuff('Major Courage', 95, 75),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Player significantly below average
export const SignificantlyBelow: Story = {
  args: {
    buff: createMockBuff('Major Sorcery', 12, 45),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Multiple buffs comparison
export const MultipleBuffsComparison: Story = {
  render: () => {
    const buffs: BuffUptime[] = [
      createMockBuff('Major Savagery', 23, 31),
      createMockBuff('Minor Savagery', 99, 98),
      createMockBuff('Major Courage', 84, 87),
      createMockBuff('Minor Courage', 97, 96),
      createMockBuff('Major Berserk', 8, 12),
      createMockBuff('Minor Berserk', 75, 84),
      createMockBuff('Major Sorcery', 0, 13),
    ];

    return (
      <Box sx={{ maxWidth: 600, p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <strong>Player Buff Uptimes vs Group Average</strong>
        </Box>
        {buffs.map((buff, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <BuffUptimeProgressBar
              buff={buff}
              reportId="abc123"
              fightId="1"
              selectedTargetId={12345}
            />
          </Box>
        ))}
      </Box>
    );
  },
};

// Dark mode examples
export const DarkModeAboveAverage: Story = {
  args: {
    buff: createMockBuff('Minor Savagery', 99, 98),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2, bgcolor: '#1a1a1a', borderRadius: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

export const DarkModeBelowAverage: Story = {
  args: {
    buff: createMockBuff('Major Savagery', 23, 31),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2, bgcolor: '#1a1a1a', borderRadius: 2 }}>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Multi-stack: Stagger with 3 stacks
export const MultiStackStagger: Story = {
  args: {
    buff: createMockMultiStackBuff('Stagger', 3, [85, 60, 35]),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <strong>Multi-Stack: Stagger (segmented display)</strong>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          Overlaid colored bars with segmented labels below: S1: 85% | S2: 60% | S3: 35%
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          Color gradient: Primary red → Orange → Amber (matches app theme)
        </div>
      </Box>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Multi-stack: Touch of Z'en with 5 stacks
export const MultiStackTouchOfZen: Story = {
  args: {
    buff: createMockMultiStackBuff('Touch of Z\'en', 5, [95, 88, 72, 55, 38]),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <strong>Multi-Stack: Touch of Z&apos;en (segmented display)</strong>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          5 stacks with segmented labels: S1: 95% | S2: 88% | S3: 72% | S4: 55% | S5: 38%
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          Full gradient: Red → Orange → Amber → Blue → Purple
        </div>
      </Box>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Multi-stack: Elemental Weakness with group averages
export const MultiStackWithGroupAverage: Story = {
  args: {
    buff: createMockMultiStackBuff('Elemental Weakness', 3, [78, 52, 28], [70, 50, 30]),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <strong>Multi-Stack: Elemental Weakness (segmented with group average)</strong>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          Segmented display: S1: 78% | S2: 52% | S3: 28%
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
          With delta indicators: +8%, +2%, -2% vs group averages
        </div>
      </Box>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};

// Multi-stack comparison
export const MultiStackComparison: Story = {
  render: () => {
    const buffs: BuffUptime[] = [
      createMockMultiStackBuff('Stagger', 3, [85, 60, 35], [70, 55, 30]),
      createMockMultiStackBuff('Touch of Z\'en', 5, [95, 88, 72, 55, 38]),
      createMockMultiStackBuff('Elemental Weakness', 3, [78, 52, 28], [70, 50, 30]),
      createMockBuff('Major Courage', 84, 87), // Regular buff for comparison
    ];

    return (
      <Box sx={{ maxWidth: 600, p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <strong>Multi-Stack Comparison</strong>
        </Box>
        {buffs.map((buff, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <BuffUptimeProgressBar
              buff={buff}
              reportId="abc123"
              fightId="1"
              selectedTargetId={12345}
            />
          </Box>
        ))}
      </Box>
    );
  },
};

// Dark mode multi-stack
export const DarkModeMultiStack: Story = {
  args: {
    buff: createMockMultiStackBuff('Stagger', 3, [85, 60, 35], [70, 55, 30]),
    reportId: 'abc123',
    fightId: '1',
    selectedTargetId: 12345,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <Box sx={{ maxWidth: 600, p: 2, bgcolor: '#1a1a1a', borderRadius: 2 }}>
      <Box sx={{ mb: 2, color: '#fff' }}>
        <strong>Dark Mode Multi-Stack: Stagger</strong>
      </Box>
      <BuffUptimeProgressBar {...args} />
    </Box>
  ),
};
