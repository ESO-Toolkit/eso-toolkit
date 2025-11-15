/**
 * Type definitions for skill line data structures
 * Consolidated from multiple locations to be the single source of truth
 */

/**
 * Represents a single skill/ability
 * Unified interface combining properties from:
 * - src/features/loadout-manager/data/types.ts
 * - Original skill-line-types.ts
 */
export interface SkillData {
  /** Unique ability ID */
  id: number;
  /** Display name of the skill */
  name: string;
  /** Skill type - from skill-lines structure */
  type?: 'ultimate' | 'active' | 'passive';
  /** Whether the skill is passive (legacy flag; prefer using `type`) */
  isPassive?: boolean;
  /** Category/classification - from loadout manager */
  category?: string;
  /** Icon URL or identifier */
  icon?: string;
  /** Whether this is an ultimate ability */
  isUltimate?: boolean;
  /** Base skill ID for morphs - from loadout manager */
  baseSkillId?: number;
  /** Base ability ID - from skill-lines structure */
  baseAbilityId?: number;
  /** Skill description */
  description?: string;
  /** Maximum rank available for the skill */
  maxRank?: number;
  /** Additional ability IDs that map to this skill (e.g., ranks, alternate datasets) */
  alternateIds?: number[];

  /** Allow arbitrary metadata for forward compatibility */
  [key: string]: unknown;
}

/**
 * Represents a complete skill line (e.g., "Destruction Staff", "Fighters Guild")
 */
export interface SkillLineData {
  id: string | number;
  name: string;
  class: string;
  category: 'class' | 'weapon' | 'armor' | 'guild' | 'alliance' | 'world' | 'racial' | 'craft';
  icon: string;
  /** Canonical ESO-Hub URL for this skill line */
  sourceUrl?: string;
  skills: SkillData[];
}

/**
 * Ability data from abilities.json
 * Lightweight interface for dynamic loading
 */
export interface Ability {
  id: number;
  name: string;
  icon: string;
}
