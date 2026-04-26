/**
 * ESO Static Game Data for the Build Editor
 * Classes, races, mundus stones, curses, roles, game modes.
 */

import type { ClassSkillLineId, CombatRole, ESOClass, GameMode } from '../types/build.types';

// ─── Classes ─────────────────────────────────────────────────────────────────

export interface ClassDef {
  id: ESOClass;
  label: string;
  color: string;
}

export const ESO_CLASSES: ClassDef[] = [
  { id: 'any-class', label: 'Any Class', color: '#94a3b8' },
  { id: 'dragonknight', label: 'Dragonknight', color: '#e05c00' },
  { id: 'sorcerer', label: 'Sorcerer', color: '#00acc1' },
  { id: 'nightblade', label: 'Nightblade', color: '#e53935' },
  { id: 'templar', label: 'Templar', color: '#ffb300' },
  { id: 'warden', label: 'Warden', color: '#26a69a' },
  { id: 'necromancer', label: 'Necromancer', color: '#7c4dff' },
  { id: 'arcanist', label: 'Arcanist', color: '#43a047' },
];

// ─── Races ───────────────────────────────────────────────────────────────────

export interface RaceDef {
  id: string;
  label: string;
  alliance: 'aldmeri' | 'daggerfall' | 'ebonheart' | 'any';
}

export const ESO_RACES: RaceDef[] = [
  { id: 'nord', label: 'Nord', alliance: 'ebonheart' },
  { id: 'darkelf', label: 'Dark Elf', alliance: 'ebonheart' },
  { id: 'argonian', label: 'Argonian', alliance: 'ebonheart' },
  { id: 'breton', label: 'Breton', alliance: 'daggerfall' },
  { id: 'redguard', label: 'Redguard', alliance: 'daggerfall' },
  { id: 'orc', label: 'Orc', alliance: 'daggerfall' },
  { id: 'highelf', label: 'High Elf', alliance: 'aldmeri' },
  { id: 'woodelf', label: 'Wood Elf', alliance: 'aldmeri' },
  { id: 'khajiit', label: 'Khajiit', alliance: 'aldmeri' },
  { id: 'imperial', label: 'Imperial', alliance: 'any' },
];

// ─── Combat Roles ─────────────────────────────────────────────────────────────

export interface RoleDef {
  id: CombatRole;
  label: string;
  color: string;
  shortLabel: string;
}

export const ESO_ROLES: RoleDef[] = [
  { id: 'tank', label: 'Tank', shortLabel: 'Tank', color: '#1e88e5' },
  { id: 'healer', label: 'Healer', shortLabel: 'Heal', color: '#43a047' },
  { id: 'magicka-dps', label: 'Magicka DPS', shortLabel: 'MagDPS', color: '#ab47bc' },
  { id: 'stamina-dps', label: 'Stamina DPS', shortLabel: 'StamDPS', color: '#ef6c00' },
  { id: 'hybrid-dps', label: 'Hybrid DPS', shortLabel: 'Hybrid', color: '#00838f' },
];

// ─── Game Modes ──────────────────────────────────────────────────────────────

export interface GameModeDef {
  id: GameMode;
  label: string;
}

export const ESO_GAME_MODES: GameModeDef[] = [
  { id: 'pve', label: 'PvE' },
  { id: 'pvp', label: 'PvP' },
];

// ─── Mundus Stones ───────────────────────────────────────────────────────────

export interface MundusDef {
  id: string;
  label: string;
  description: string;
}

export const ESO_MUNDUS_STONES: MundusDef[] = [
  { id: 'warrior', label: 'The Warrior', description: 'Increases Weapon and Spell Damage' },
  { id: 'mage', label: 'The Mage', description: 'Increases Max Magicka' },
  { id: 'shadow', label: 'The Shadow', description: 'Increases Critical Strike Damage' },
  { id: 'thief', label: 'The Thief', description: 'Increases Critical Strike Chance' },
  { id: 'tower', label: 'The Tower', description: 'Increases Max Stamina' },
  { id: 'lover', label: 'The Lover', description: 'Increases Penetration' },
  { id: 'serpent', label: 'The Serpent', description: 'Increases Stamina Recovery' },
  { id: 'lady', label: 'The Lady', description: 'Increases Physical and Spell Resistance' },
  { id: 'steed', label: 'The Steed', description: 'Increases Movement Speed and Health Recovery' },
  { id: 'lord', label: 'The Lord', description: 'Increases Max Health' },
  { id: 'apprentice', label: 'The Apprentice', description: 'Increases Spell Damage' },
  { id: 'ritual', label: 'The Ritual', description: 'Increases Healing Done' },
  { id: 'atronach', label: 'The Atronach', description: 'Increases Magicka Recovery' },
];

// ─── Curses ──────────────────────────────────────────────────────────────────

export interface CurseDef {
  id: string;
  label: string;
}

export const ESO_CURSES: CurseDef[] = [
  { id: 'none', label: 'None' },
  { id: 'vampire-1', label: 'Vampire (Stage 1)' },
  { id: 'vampire-2', label: 'Vampire (Stage 2)' },
  { id: 'vampire-3', label: 'Vampire (Stage 3)' },
  { id: 'vampire-4', label: 'Vampire (Stage 4)' },
  { id: 'werewolf', label: 'Werewolf' },
];

// ─── Equipment Slot Definitions ───────────────────────────────────────────────

export interface EquipSlotDef {
  slot: number;
  name: string;
  category: 'apparel' | 'accessories' | 'weapons';
  slotType:
    | 'head'
    | 'chest'
    | 'shoulders'
    | 'waist'
    | 'hand'
    | 'legs'
    | 'feet'
    | 'neck'
    | 'ring'
    | 'weapon'
    | 'offhand';
}

export const EQUIP_SLOTS: EquipSlotDef[] = [
  // Apparel
  { slot: 0, name: 'Head', category: 'apparel', slotType: 'head' },
  { slot: 2, name: 'Body', category: 'apparel', slotType: 'chest' },
  { slot: 3, name: 'Shoulders', category: 'apparel', slotType: 'shoulders' },
  { slot: 6, name: 'Waist', category: 'apparel', slotType: 'waist' },
  { slot: 16, name: 'Hands', category: 'apparel', slotType: 'hand' },
  { slot: 8, name: 'Legs', category: 'apparel', slotType: 'legs' },
  { slot: 9, name: 'Feet', category: 'apparel', slotType: 'feet' },
  // Accessories
  { slot: 1, name: 'Neck', category: 'accessories', slotType: 'neck' },
  { slot: 11, name: 'Ring 1', category: 'accessories', slotType: 'ring' },
  { slot: 12, name: 'Ring 2', category: 'accessories', slotType: 'ring' },
  // Weapons
  { slot: 4, name: 'Main-Hand', category: 'weapons', slotType: 'weapon' },
  { slot: 5, name: 'Off-Hand', category: 'weapons', slotType: 'offhand' },
  { slot: 20, name: 'Main-Hand Backup', category: 'weapons', slotType: 'weapon' },
  { slot: 21, name: 'Off-Hand Backup', category: 'weapons', slotType: 'offhand' },
];

// ─── Class Skill Lines ────────────────────────────────────────────────────────

export interface ClassSkillLineDef {
  id: ClassSkillLineId;
  label: string;
  ownerClass: ESOClass;
  /** Emoji icon from the skill line data files */
  icon: string;
}

export const CLASS_SKILL_LINES: ClassSkillLineDef[] = [
  // Dragonknight
  { id: 'class.ardent-flame', label: 'Ardent Flame', ownerClass: 'dragonknight', icon: '🔥' },
  { id: 'class.draconic-power', label: 'Draconic Power', ownerClass: 'dragonknight', icon: '🛡️' },
  { id: 'class.earthen-heart', label: 'Earthen Heart', ownerClass: 'dragonknight', icon: '⛰️' },
  // Sorcerer
  { id: 'class.dark-magic', label: 'Dark Magic', ownerClass: 'sorcerer', icon: '🌑' },
  { id: 'class.daedric-summoning', label: 'Daedric Summoning', ownerClass: 'sorcerer', icon: '👾' },
  { id: 'class.storm-calling', label: 'Storm Calling', ownerClass: 'sorcerer', icon: '⚡' },
  // Nightblade
  { id: 'class.assassination', label: 'Assassination', ownerClass: 'nightblade', icon: '🗡️' },
  { id: 'class.shadow', label: 'Shadow', ownerClass: 'nightblade', icon: '🌑' },
  { id: 'class.siphoning', label: 'Siphoning', ownerClass: 'nightblade', icon: '🩸' },
  // Templar
  { id: 'class.aedric-spear', label: 'Aedric Spear', ownerClass: 'templar', icon: '✨' },
  { id: 'class.dawns-wrath', label: "Dawn's Wrath", ownerClass: 'templar', icon: '☀️' },
  { id: 'class.restoring-light', label: 'Restoring Light', ownerClass: 'templar', icon: '💛' },
  // Warden
  { id: 'class.animal-companions', label: 'Animal Companions', ownerClass: 'warden', icon: '🐻' },
  { id: 'class.green-balance', label: 'Green Balance', ownerClass: 'warden', icon: '🌿' },
  { id: 'class.winters-embrace', label: "Winter's Embrace", ownerClass: 'warden', icon: '❄️' },
  // Necromancer
  { id: 'class.grave-lord', label: 'Grave Lord', ownerClass: 'necromancer', icon: '💀' },
  { id: 'class.bone-tyrant', label: 'Bone Tyrant', ownerClass: 'necromancer', icon: '🦴' },
  { id: 'class.living-death', label: 'Living Death', ownerClass: 'necromancer', icon: '⚗️' },
  // Arcanist
  {
    id: 'class.herald-of-the-tome',
    label: 'Herald of the Tome',
    ownerClass: 'arcanist',
    icon: '📖',
  },
  {
    id: 'class.soldier-of-apocrypha',
    label: 'Soldier of Apocrypha',
    ownerClass: 'arcanist',
    icon: '🔮',
  },
  {
    id: 'class.curative-runeforms',
    label: 'Curative Runeforms',
    ownerClass: 'arcanist',
    icon: '🌀',
  },
];

/** Returns the 3 skill lines belonging to a given class, in canonical order.
 *  Returns [null, null, null] for 'any-class' so the user picks lines freely. */
export const getDefaultLinesForClass = (
  cls: ESOClass,
): [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null] => {
  if (cls === 'any-class') return [null, null, null];
  const lines = CLASS_SKILL_LINES.filter((l) => l.ownerClass === cls);
  return [lines[0].id, lines[1].id, lines[2].id];
};

/** Looks up a skill line definition by ID. */
export const getSkillLineDef = (id: ClassSkillLineId): ClassSkillLineDef | undefined =>
  CLASS_SKILL_LINES.find((l) => l.id === id);

// ─── DLC List ─────────────────────────────────────────────────────────────────

export const ESO_DLCS = [
  'Base Game',
  'Morrowind',
  'Summerset',
  'Elsweyr',
  'Greymoor',
  'Blackwood',
  'High Isle',
  'Necrom',
  'Gold Road',
  'Seasons of the Worm',
];
