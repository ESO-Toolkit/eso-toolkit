/**
 * Build Editor Types
 * Defines the shape of a community-facing shareable ESO build.
 * Intentionally flat (one build, up to 5 setups) versus the loadout-manager's
 * nested trial→page→setup hierarchy.
 */

import type { GearConfig, SkillsConfig } from '../../loadout-manager/types/loadout.types';
import type { StatOverrides } from '../engine/stat-types';

// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type ESOClass =
  | 'any-class'
  | 'dragonknight'
  | 'sorcerer'
  | 'nightblade'
  | 'templar'
  | 'warden'
  | 'necromancer'
  | 'arcanist';

/** IDs match the `SkillLineData.id` field in src/data/skill-lines/class/ */
export type ClassSkillLineId =
  | 'class.ardent-flame'
  | 'class.draconic-power'
  | 'class.earthen-heart'
  | 'class.dark-magic'
  | 'class.daedric-summoning'
  | 'class.storm-calling'
  | 'class.assassination'
  | 'class.shadow'
  | 'class.siphoning'
  | 'class.aedric-spear'
  | 'class.dawns-wrath'
  | 'class.restoring-light'
  | 'class.animal-companions'
  | 'class.green-balance'
  | 'class.winters-embrace'
  | 'class.grave-lord'
  | 'class.bone-tyrant'
  | 'class.living-death'
  | 'class.herald-of-the-tome'
  | 'class.soldier-of-apocrypha'
  | 'class.curative-runeforms';

export type CombatRole = 'tank' | 'healer' | 'magicka-dps' | 'stamina-dps' | 'hybrid-dps';

export type GameMode = 'pve' | 'pvp';

export type BuildVisibility = 'public' | 'private' | 'link-only';

export type SidebarTopTab = 'general' | 'guide' | 'settings';

export type SetupTab =
  | 'info'
  | 'character'
  | 'equipment'
  | 'skills'
  | 'passives'
  | 'champion'
  | 'consumables'
  | 'screenshots'
  | 'subclassing';

// ─── Setup-level data ────────────────────────────────────────────────────────

export interface BuildAttributes {
  magicka: number;
  health: number;
  stamina: number;
}

export interface ChampionTree {
  /** IDs of slotted (active) champion perks — max 4 */
  slots: Array<number | null>;
  /** Passive star allocations: passiveId (string) → points allocated */
  passives: Record<string, number>;
}

export interface BuildChampionPoints {
  warfare: ChampionTree;
  fitness: ChampionTree;
  craft: ChampionTree;
}

export interface BuildPotion {
  id: number;
  name: string;
  effects: string[];
}

export interface BuildConsumables {
  potions: BuildPotion[];
  food: { id?: number; name?: string };
}

export interface BuildSetup {
  id: string;
  name: string;
  attributes: BuildAttributes;
  /** None | Vampire (Stage 1–4) | Werewolf */
  curse: string;
  mundusStone: string;
  gear: GearConfig;
  skills: SkillsConfig;
  cp: BuildChampionPoints;
  consumables: BuildConsumables;
  /** Passive ability IDs the build uses */
  passives: number[];
  /** Screenshot URLs / data-urls */
  screenshots: string[];
  /** Manual stat overrides for buff toggles and armor counts */
  statOverrides?: StatOverrides;
}

// ─── Top-level build ─────────────────────────────────────────────────────────

export interface BuildGuide {
  content: string;
  youtubeUrl: string;
  bannerImageUrl: string;
}

export interface BuildSettings {
  visibility: BuildVisibility;
  dlc: string;
  /** Reordered setup indices */
  setupOrder: number[];
}

export interface Build {
  id: string;
  name: string;
  shortDescription: string;
  esoClass: ESOClass;
  /** Exactly 3 class skill line slots — can be from any class, nullable during editing */
  classSkillLines: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
  role: CombatRole;
  gameMode: GameMode;
  races: string[];
  setups: BuildSetup[];
  guide: BuildGuide;
  settings: BuildSettings;
  /** Raw addon import string (Combat Metrics / Caro's Skill Point Saver) */
  addonImportString: string;
  /** Trial IDs this build is designed for (e.g. 'lucent_citadel') */
  trialTags?: string[];
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
}

// ─── Redux state ─────────────────────────────────────────────────────────────

export interface BuildEditorState {
  build: Build;
  /** Index into build.setups */
  activeSetupIndex: number;
  /** Top-level nav tab */
  activeSidebarTab: SidebarTopTab;
  /** Per-setup content tab */
  activeSetupTab: SetupTab;
  /** Dirty / unsaved flag */
  isDirty: boolean;
}
