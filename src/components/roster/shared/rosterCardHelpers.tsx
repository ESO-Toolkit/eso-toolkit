/**
 * Shared helpers, icon mappings, and set option arrays used by the
 * TankSlotCard, HealerSlotCard, and DPSSlotCard components.
 *
 * These were previously module-level constants inside RosterBuilderPage.tsx.
 * Extracted here so the card files can import them without circular deps.
 */

import { Avatar, Box } from '@mui/material';
import React from 'react';

import { KnownSetIDs } from '../../../types/abilities';
import {
  HealerBuff,
  SupportUltimate,
  TANK_5PIECE_SETS,
  TANK_MONSTER_SETS,
  HEALER_5PIECE_SETS,
  HEALER_MONSTER_SETS,
  FLEXIBLE_5PIECE_SETS,
  FLEXIBLE_MONSTER_SETS,
  MONSTER_SETS,
  ALL_5PIECE_SETS,
  DD_SPECIAL_SETS,
} from '../../../types/roster';
import { getEsoHubSkillLineUrl } from '../../../utils/esoHubLinks';
import { getSetDisplayName } from '../../../utils/setNameUtils';

// ---------------------------------------------------------------------------
// Icon mappings
// ---------------------------------------------------------------------------

const ULTIMATE_ICONS: Record<string, string> = {
  [SupportUltimate.WARHORN]: 'ability_ava_003_a',
  [SupportUltimate.COLOSSUS]: 'ability_necromancer_006_b',
  [SupportUltimate.BARRIER]: 'ability_ava_006',
  [SupportUltimate.ATRONACH]: 'ability_sorcerer_greater_storm_atronach',
};

const HEALER_BUFF_ICONS: Record<string, string> = {
  [HealerBuff.ENLIVENING_OVERFLOW]: 'ability_mage_065',
  [HealerBuff.FROM_THE_BRINK]: 'ability_mage_065',
};

const SKILL_LINE_ICONS: Record<string, string> = {
  // Dragonknight
  'Ardent Flame': 'ability_dragonknight_001',
  'Draconic Power': 'ability_dragonknight_008',
  'Earthen Heart': 'ability_dragonknight_007',

  // Sorcerer
  'Dark Magic': 'ability_sorcerer_mage_wraith',
  'Daedric Summoning': 'ability_sorcerer_greater_storm_atronach',
  'Storm Calling': 'ability_sorcerer_endless_fury',

  // Nightblade
  Assassination: 'ability_nightblade_012',
  Shadow: 'ability_nightblade_012',
  Siphoning: 'ability_nightblade_012',

  // Templar
  'Aedric Spear': 'ability_templar_sun_fire',
  "Dawn's Wrath": 'ability_templar_sun_fire',
  'Restoring Light': 'ability_templar_sun_fire',

  // Warden
  'Animal Companions': 'ability_mage_065',
  'Green Balance': 'ability_mage_065',
  "Winter's Embrace": 'ability_mage_065',

  // Necromancer
  'Grave Lord': 'ability_necromancer_006_b',
  'Bone Tyrant': 'ability_necromancer_006_b',
  'Living Death': 'ability_necromancer_006_b',

  // Arcanist
  'Herald of the Tome': 'ability_mage_065',
  'Apocryphal Soldier': 'ability_mage_065',
  'Curative Runeforms': 'ability_mage_065',
};

// ---------------------------------------------------------------------------
// Icon helper functions
// ---------------------------------------------------------------------------

export const getUltimateIcon = (ultimate: string | undefined): React.ReactElement | null => {
  if (!ultimate) return null;
  const iconFile = ULTIMATE_ICONS[ultimate];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      alt=""
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

export const getHealerBuffIcon = (buff: string | undefined): React.ReactElement | null => {
  if (!buff) return null;
  const iconFile = HEALER_BUFF_ICONS[buff];
  if (!iconFile) return null;
  return (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      alt=""
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
};

export const getSkillLineIcon = (skillLine: string): React.ReactElement | null => {
  const iconFile = SKILL_LINE_ICONS[skillLine];
  if (!iconFile) return null;
  const href = getEsoHubSkillLineUrl(skillLine);
  const avatar = (
    <Avatar
      src={`https://assets.rpglogs.com/img/eso/abilities/${iconFile}.png`}
      alt=""
      sx={{ width: 20, height: 20, mr: 0.5 }}
      variant="rounded"
    />
  );
  if (!href) return avatar;
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      aria-label={`${skillLine} on ESO-Hub`}
      title={`${skillLine} — view on ESO-Hub`}
      sx={{ display: 'inline-flex', lineHeight: 0 }}
    >
      {avatar}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Pre-computed option arrays (computed once at module load)
// ---------------------------------------------------------------------------

/**
 * All support ultimates as a stable array reference.
 * Defined at module level so card components don't call Object.values() on
 * every render and pass a new array reference to MUI Autocomplete.
 */
export const AVAILABLE_ULTIMATES: readonly string[] = Object.values(SupportUltimate);

// Pre-computed set option arrays

export const TANK_5PIECE_OPTIONS: readonly string[] = (() => {
  const tankSets = Array.from(TANK_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !TANK_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...tankSets, ...hybridSets];
})();

export const TANK_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  TANK_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

export const HEALER_5PIECE_OPTIONS: readonly string[] = (() => {
  const healerSets = Array.from(HEALER_5PIECE_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const hybridSets = Array.from(FLEXIBLE_5PIECE_SETS)
    .filter((set) => !HEALER_5PIECE_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...healerSets, ...hybridSets];
})();

export const HEALER_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  HEALER_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  FLEXIBLE_MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

export const DPS_5PIECE_OPTIONS: readonly string[] = (() => {
  const ddSets = Array.from(DD_SPECIAL_SETS)
    .map((id) => getSetDisplayName(id))
    .sort();
  const otherSets = Array.from(ALL_5PIECE_SETS)
    .filter((set) => !DD_SPECIAL_SETS.includes(set))
    .map((id) => getSetDisplayName(id))
    .sort();
  return [...ddSets, ...otherSets];
})();

export const DPS_MONSTER_OPTIONS: readonly string[] = (() => {
  const sets = new Set<string>();
  MONSTER_SETS.forEach((id) => sets.add(getSetDisplayName(id)));
  return Array.from(sets).sort();
})();

// ---------------------------------------------------------------------------
// Set membership helpers
// ---------------------------------------------------------------------------

export const isDDSpecialSet = (setId: KnownSetIDs): boolean => {
  return (DD_SPECIAL_SETS as readonly KnownSetIDs[]).includes(setId);
};

export const isTank5PieceSet = (setId: KnownSetIDs): boolean => {
  return TANK_5PIECE_SETS.includes(setId);
};

export const isHealer5PieceSet = (setId: KnownSetIDs): boolean => {
  return HEALER_5PIECE_SETS.includes(setId);
};

export const isFlexible5PieceSet = (setId: KnownSetIDs): boolean => {
  return FLEXIBLE_5PIECE_SETS.includes(setId);
};

export const isMonsterSet = (setId: KnownSetIDs): boolean => {
  return MONSTER_SETS.includes(setId);
};
