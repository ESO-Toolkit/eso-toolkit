import type { Meta, StoryObj } from '@storybook/react';

import { SkillTooltip, SkillStat } from './SkillTooltip';

const meta: Meta<typeof SkillTooltip> = {
  title: 'Components/SkillTooltip',
  component: SkillTooltip,
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof SkillTooltip>;

const stats: SkillStat[] = [
  { label: 'Cost', value: '4455 Magicka' },
  { label: 'Target', value: 'Self' },
  { label: 'Duration', value: '30 seconds' },
];

export const ActiveSkill: Story = {
  args: {
    headerBadge: 'Active',
    lineText: 'Arcanist — Herald of the Tome',
    abilityId: 185842,
    name: 'Inspired Scholarship',
    morphOf: "Tome-Bearer's Inspiration",
    stats,
    description:
      'Etch a series of runes onto your weapon that pulse with power once every 3 seconds. Each pulse enhances your class abilities, and striking an enemy with one deals an additional 935 Magic Damage and generates Crux if you have none. While slotted on either ability bar, gain Major Brutality and Major Sorcery, increasing your Weapon and Spell Damage by 20%.',
  },
};

export const PassiveSkill: Story = {
  args: {
    headerBadge: 'Passive',
    lineText: 'Arcanist — Herald of the Tome',
    abilityId: 196226,
    name: "Tome-Bearer's Inspiration",
    stats: [],
    description:
      'While slotted, gain Major Brutality and Major Sorcery, increasing Weapon and Spell Damage by 20%.',
  },
};
