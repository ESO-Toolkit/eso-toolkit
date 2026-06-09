import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { buildChampionPointsViewModel } from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import {
  computeStatCoaching,
  PVE_PENETRATION_CAP,
  STANDARD_GROUP_PEN,
} from '@/features/loadout-manager/utils/esotkCompanionCoaching';

import { CompanionBuildPanel } from './CompanionBuildPanel';

const championPoints = buildChampionPointsViewModel({
  total: 3600,
  disciplines: {
    1: { id: 1, skills: { 25: 50, 27: 50, 8: 50, 12: 50 } }, // Warfare: Deadly Aim, Thaumaturge, Wrathful Strikes, Fighting Finesse
    3: { id: 3, skills: { 4: 50, 46: 20 } }, // Fitness: Untamed Aggression, Bastion
  },
  slotted: { 5: 25, 6: 27, 7: 8, 8: 12 },
});

const meta: Meta<typeof CompanionBuildPanel> = {
  title: 'Features/Report Details/Insights/CompanionBuildPanel',
  component: CompanionBuildPanel,
  parameters: {
    docs: {
      description: {
        component:
          'Renders the build data the ESOTK Companion add-on captures that ESO Logs cannot see: the full champion-point allocation (grouped by tree) and stat-aware coaching (penetration vs the 18,200 cap, crit caps).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CompanionBuildPanel>;

/** Over-penetration: a DPS wasting stats above the cap. */
export const OverPenetration: Story = {
  args: {
    championPoints,
    coaching: computeStatCoaching(
      { physicalPen: 12000, critDamage: 130, weaponCrit: 14000 },
      { assumedGroupPen: STANDARD_GROUP_PEN, groupPenIsExact: false },
    ),
  },
};

/** On-cap, healthy build. */
export const OnCap: Story = {
  args: {
    championPoints,
    coaching: computeStatCoaching(
      { physicalPen: PVE_PENETRATION_CAP - STANDARD_GROUP_PEN, critDamage: 120, weaponCrit: 12000 },
      { assumedGroupPen: STANDARD_GROUP_PEN, groupPenIsExact: false },
    ),
  },
};

/** Champion points only (no stats captured). */
export const ChampionPointsOnly: Story = {
  args: { championPoints, coaching: [] },
};

/** Nothing captured — renders nothing. */
export const Empty: Story = {
  args: { championPoints: null, coaching: [] },
};
