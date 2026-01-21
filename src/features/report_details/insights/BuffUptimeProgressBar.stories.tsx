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
