/**
 * ESO Class skill lines - organized by class with all 3 skill lines
 *
 * Leaf module: intentionally free of value imports so worker bundles
 * (e.g. the build-leaderboard clustering worker) can use it without
 * pulling in heavy sibling modules.
 */
export const CLASS_SKILL_LINES = [
  // Dragonknight
  'Ardent Flame',
  'Draconic Power',
  'Earthen Heart',

  // Sorcerer
  'Dark Magic',
  'Daedric Summoning',
  'Storm Calling',

  // Nightblade
  'Assassination',
  'Shadow',
  'Siphoning',

  // Templar
  'Aedric Spear',
  "Dawn's Wrath",
  'Restoring Light',

  // Warden
  'Animal Companions',
  'Green Balance',
  "Winter's Embrace",

  // Necromancer
  'Grave Lord',
  'Bone Tyrant',
  'Living Death',

  // Arcanist
  'Herald of the Tome',
  'Apocryphal Soldier',
  'Curative Runeforms',
] as const;
