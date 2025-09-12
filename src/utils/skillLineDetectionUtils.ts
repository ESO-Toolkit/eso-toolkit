/**
 * Utilities for abbreviating skill line names for display
 */

/**
 * Abbreviates skill line names for display
 * @param name - The full skill line name
 * @returns Abbreviated skill line name
 */
export function abbreviateSkillLine(name: string): string {
  // Arcanist skill lines
  if (name === 'Herald of the Tome') return 'HERALD';
  if (name === 'Soldier of Apocrypha') return 'SOLDIER';
  if (name === 'Curative Runeforms') return 'RUNEFORM';

  // Dragonknight skill lines
  if (name === 'Ardent Flame') return 'ARDENT';
  if (name === 'Draconic Power') return 'DRACONIC';
  if (name === 'Earthen Heart') return 'EARTHEN';

  // Necromancer skill lines
  if (name === 'Grave Lord') return 'GRAVE';
  if (name === 'Bone Tyrant') return 'TYRANT';
  if (name === 'Living Death') return 'DEATH';

  // Nightblade skill lines
  if (name === 'Assassination') return 'ASSASSIN';
  if (name === 'Shadow') return 'SHADOW';
  if (name === 'Siphoning') return 'SIPHON';

  // Sorcerer skill lines
  if (name === 'Dark Magic') return 'DARK';
  if (name === 'Storm Calling') return 'STORM';
  if (name === 'Daedric Summoning') return 'DAEDRIC';

  // Templar skill lines
  if (name === 'Aedric Spear') return 'AEDRIC';
  if (name === "Dawn's Wrath") return 'DAWN';
  if (name === 'Restoring Light') return 'RESTORING';

  // Warden skill lines
  if (name === 'Animal Companions') return 'ANIMAL';
  if (name === 'Green Balance') return 'GREEN';
  if (name === "Winter's Embrace") return 'WINTER';

  // Fallback for unknown skill lines
  // Take first letter of each word, max 4 chars
  const words = name.split(' ').filter((word) => word.length > 0);
  const abbreviation = words
    .slice(0, 4)
    .map((word) => word[0])
    .join('');

  // For short names, return as-is
  if (name.length <= 2) return name.toUpperCase();

  return abbreviation.slice(0, 4).toUpperCase();
}
