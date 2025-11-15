import { LoadoutSetup } from '../types/loadout.types';

export type SetupProgressSection =
  | { type: 'skills'; count: number }
  | { type: 'cp'; count: number }
  | { type: 'food' }
  | { type: 'gear'; count: number };

export type SetupTagColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

export interface SetupTag {
  label: string;
  color: SetupTagColor;
  variant?: 'filled' | 'outlined';
}

const normalize = (value?: string | null) => (value ?? '').trim();

const isTrashKeyword = (value: string) => value.includes('trash');

export const isTrashSetup = (setup: LoadoutSetup): boolean => {
  if (typeof setup.condition.trash === 'number') {
    return true;
  }

  const bossName = normalize(setup.condition.boss).toLowerCase();
  return bossName !== '' && isTrashKeyword(bossName);
};

export const isBossSetup = (setup: LoadoutSetup): boolean => {
  const bossName = normalize(setup.condition.boss);
  if (!bossName) {
    return false;
  }

  if (isTrashSetup(setup)) {
    return false;
  }

  const normalized = bossName.toLowerCase();
  if (normalized === 'trash' || normalized === 'any' || normalized === 'general' || normalized === 'default') {
    return false;
  }

  return true;
};

export const getSetupTags = (setup: LoadoutSetup): SetupTag[] => {
  const tags: SetupTag[] = [];

  const boss = isBossSetup(setup);
  const trash = isTrashSetup(setup);

  if (boss) {
    tags.push({ label: 'Boss', color: 'error' });
  }

  if (trash) {
    tags.push({ label: 'Trash', color: 'info' });
  }

  if (!boss && !trash) {
    const bossName = normalize(setup.condition.boss);
    if (bossName) {
      tags.push({ label: bossName, color: 'primary', variant: 'outlined' });
    } else {
      tags.push({ label: 'All fights', color: 'success', variant: 'outlined' });
    }
  }

  if (setup.disabled) {
    tags.push({ label: 'Disabled', color: 'warning', variant: 'outlined' });
  }

  return tags;
};

export const getSetupConditionSummary = (setup: LoadoutSetup): string | null => {
  const bossName = normalize(setup.condition.boss);
  const boss = isBossSetup(setup);
  const trash = isTrashSetup(setup);

  if (trash) {
    if (typeof setup.condition.trash === 'number') {
      if (setup.condition.trash === -1) {
        return 'Applies to all trash packs';
      }

      return `Trash pack ${setup.condition.trash}`;
    }

    return bossName ? `Trash setup: ${bossName}` : 'Trash setup';
  }

  if (boss) {
    return bossName ? `Boss: ${bossName}` : 'Boss setup';
  }

  if (bossName) {
    return `Condition: ${bossName}`;
  }

  return null;
};

const countAbilitySlots = (bar: Record<number, number> | undefined): number => {
  if (!bar) {
    return 0;
  }

  return Object.values(bar).filter((abilityId) => typeof abilityId === 'number' && abilityId > 0).length;
};

export const getSetupProgressSections = (setup: LoadoutSetup): SetupProgressSection[] => {
  const sections: SetupProgressSection[] = [];

  const totalSkills =
    countAbilitySlots(setup.skills?.[0]) + countAbilitySlots(setup.skills?.[1]);
  if (totalSkills > 0) {
    sections.push({ type: 'skills', count: totalSkills });
  }

  const cpValues = Object.values(setup.cp ?? {}).filter(
    (value) => typeof value === 'number' && value > 0,
  );
  if (cpValues.length > 0) {
    sections.push({ type: 'cp', count: cpValues.length });
  }

  if (setup.food && (setup.food.id || setup.food.link)) {
    sections.push({ type: 'food' });
  }

  const gearEntries = Object.entries(setup.gear ?? {}).filter(([slot, piece]) => {
    if (slot === 'mythic') {
      return false;
    }

    if (!piece || typeof piece !== 'object') {
      return false;
    }

    const value = piece as { id?: string | number | null; link?: string | null };
    return Boolean(value.id) || Boolean(value.link);
  });

  if (gearEntries.length > 0) {
    sections.push({ type: 'gear', count: gearEntries.length });
  }

  return sections;
};

export const formatProgressSection = (section: SetupProgressSection): string => {
  switch (section.type) {
    case 'skills':
      return `Skills ${section.count}`;
    case 'cp':
      return `CP ${section.count}`;
    case 'food':
      return 'Food';
    case 'gear':
      return `Gear ${section.count}`;
    default:
      return '';
  }
};

export const getSetupProgressSummary = (setup: LoadoutSetup): string => {
  const sections = getSetupProgressSections(setup);
  if (sections.length === 0) {
    return 'Empty setup';
  }

  return sections
    .map((section) => formatProgressSection(section))
    .filter((value) => value !== '')
    .join(' | ');
};
