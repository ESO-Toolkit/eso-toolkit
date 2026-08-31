import { toClassKey } from '../../../utils/classNameUtils';

const CLASS_DISPLAY_NAMES: Record<string, string> = {
  arcanist: 'Arcanist',
  dragonknight: 'Dragonknight',
  necromancer: 'Necromancer',
  nightblade: 'Nightblade',
  sorcerer: 'Sorcerer',
  templar: 'Templar',
  warden: 'Warden',
};

/** Formats DPS values using the compact notation used throughout the leaderboard. */
export const formatCompactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

/** Returns the stable, human-readable class label used by leaderboard rows. */
export const getLeaderboardClassDisplayName = (esoClass: string): string => {
  const classKey = toClassKey(esoClass);
  return CLASS_DISPLAY_NAMES[classKey] ?? esoClass;
};
