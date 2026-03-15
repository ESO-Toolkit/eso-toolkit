/**
 * Build Editor Types
 * Defines the shape of a community-facing shareable ESO build.
 * Intentionally flat (one build, up to 5 setups) versus the loadout-manager's
 * nested trial→page→setup hierarchy.
 */

import type { GearConfig, SkillsConfig } from '../../loadout-manager/types/loadout.types';

// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type ESOClass =
  | 'dragonknight'
  | 'sorcerer'
  | 'nightblade'
  | 'templar'
  | 'warden'
  | 'necromancer'
  | 'arcanist';

export type CombatRole = 'tank' | 'healer' | 'magicka-dps' | 'stamina-dps' | 'hybrid-dps';

export type GameMode = 'pve' | 'pvp' | 'both';

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
  role: CombatRole;
  gameMode: GameMode;
  races: string[];
  setups: BuildSetup[];
  guide: BuildGuide;
  settings: BuildSettings;
  /** Raw addon import string (Combat Metrics / Caro's Skill Point Saver) */
  addonImportString: string;
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
