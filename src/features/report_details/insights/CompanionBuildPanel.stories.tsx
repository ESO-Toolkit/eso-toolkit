import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { buildChampionPointsViewModel } from '@/features/loadout-manager/utils/esotkCompanionChampionPoints';
import {
  computeStatCoaching,
  PVE_PENETRATION_CAP,
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
          'Renders the build data the ESOTK Companion add-on captures that ESO Logs cannot see: the full champion-point allocation (grouped by tree) and the character sheet at capture (point-in-time, buff-dependent stats separated from stable ones), plus plain stat readings for penetration and crit chance.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CompanionBuildPanel>;

/** High self-penetration reading captured on the character sheet. */
export const HighPenetration: Story = {
  args: {
    championPoints,
    coaching: computeStatCoaching({ physicalPen: PVE_PENETRATION_CAP + 3000, weaponCrit: 14000 }),
    stats: {
      physicalPen: PVE_PENETRATION_CAP + 3000,
      weaponCrit: 14000,
      spellDamage: 4800,
      maxMagicka: 38000,
    },
  },
};

/** Typical self-penetration reading captured on the character sheet. */
export const TypicalPenetration: Story = {
  args: {
    championPoints,
    coaching: computeStatCoaching({ physicalPen: 9500, weaponCrit: 12000 }),
    stats: {
      physicalPen: 9500,
      weaponCrit: 12000,
      spellDamage: 4200,
      maxStamina: 34000,
    },
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
