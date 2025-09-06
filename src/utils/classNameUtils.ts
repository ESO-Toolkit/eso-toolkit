/**
 * Utilities for normalizing ESO class names and aliases
 */

export const CLASS_ALIASES: Record<string, string> = {
  dragonknight: 'dragonknight',
  'dragon knight': 'dragonknight',
  dk: 'dragonknight',
  templar: 'templar',
  plar: 'templar',
  warden: 'warden',
  nightblade: 'nightblade',
  'night blade': 'nightblade',
  nb: 'nightblade',
  sorcerer: 'sorcerer',
  sorc: 'sorcerer',
  necromancer: 'necromancer',
  necro: 'necromancer',
  arcanist: 'arcanist',
};

/**
 * Converts a class name to its canonical key
 * @param name - The class name to normalize
 * @returns The canonical class key or 'unknown' if not found
 */
export function toClassKey(name?: string | null): string {
  const normalized = (name ?? '').toLowerCase().trim();
  return CLASS_ALIASES[normalized] || 'unknown';
}
