/**
 * Core domain entities for ESO Scribing system
 * These represent the fundamental business objects
 */

export type ResourceType = 'magicka' | 'stamina' | 'health' | 'hybrid';
export type DamageType =
  | 'magic'
  | 'physical'
  | 'fire'
  | 'frost'
  | 'shock'
  | 'poison'
  | 'disease'
  | 'bleed'
  | 'oblivion'
  | 'flame';

export type ScriptType = 'Focus' | 'Signature' | 'Affix';
/**
 * Skill lines a Scribing grimoire can belong to. The 12 live grimoires map to
 * weapon, guild, Alliance War and Soul Magic lines (derived from each grimoire's
 * `ability_grimoire_*` base icon in the game data). The trailing entries are
 * kept for backward compatibility with older detection metadata.
 */
export type SkillLine =
  // Weapon lines
  | 'Two Handed'
  | 'One Hand and Shield'
  | 'Dual Wield'
  | 'Bow'
  | 'Destruction Staff'
  | 'Restoration Staff'
  // Guild lines
  | 'Mages Guild'
  | 'Fighters Guild'
  | 'Soul Magic'
  // Alliance War lines
  | 'Assault'
  | 'Support'
  // Back-compat (legacy detection metadata)
  | 'Mage Guild'
  | 'Psijic Order'
  | 'Vampire'
  | 'Werewolf';

/**
 * Per-damage-type name transformation for a grimoire, e.g. focusing "Traveling
 * Knife" with the Flame focus yields "Fiery Knife". Keyed by `<damage>-damage`
 * (e.g. `flame-damage`). Sourced from the game-extracted scribing dataset.
 */
export interface GrimoireNameTransformation {
  readonly name: string;
  readonly abilityIds?: readonly number[];
  readonly matchCount?: number;
}

/**
 * Core Grimoire entity - represents a base scribing skill template
 */
export interface Grimoire {
  readonly id: string;
  readonly name: string;
  // Optional: the source dataset categorizes grimoires by `resource`/`school`
  // rather than a UI skill line, so skillLine may be absent.
  readonly skillLine?: SkillLine;
  readonly requirements: string | null;
  readonly cost: {
    readonly first: number;
    readonly additional: number;
  };
  /**
   * True when the grimoire's cost is not a fixed number (e.g. Soul Burst costs
   * your "highest resource"). When set, the numeric `cost` is a placeholder (0)
   * and should not be presented as an exact value.
   */
  readonly costVaries?: boolean;
  readonly description: string;
  readonly iconUrl?: string;
  /** ESO Logs ability-icon filename (no extension) for the grimoire's skill. */
  readonly icon?: string;
  readonly abilityIds?: readonly number[];
  /** Resource the grimoire's base ability costs (from the extracted dataset). */
  readonly resource?: ResourceType;
  /** How the grimoire is acquired in-game (quest/activity). */
  readonly acquisition?: string;
  /** Short summary of what the grimoire's base ability does. */
  readonly baseEffect?: string;
  /** Target type, e.g. "Enemy", "Self", "Ground", "Area". */
  readonly targetType?: string;
  /** Cast behaviour, e.g. "Instant", "Channeled", "Cast Time", "Toggle". */
  readonly castType?: string;
  /** Skill-name overrides per focus script, keyed by the focus script slug. */
  readonly nameTransformations?: Readonly<Record<string, GrimoireNameTransformation>>;
}

/**
 * Base Script entity - common properties for all script types
 */
export interface Script {
  readonly id: string;
  readonly name: string;
  readonly type: ScriptType;
  readonly icon: string;
  readonly compatibleGrimoires: readonly string[];
  readonly description: string;
  /** Unlock category, e.g. "Class", "World", "Guild", "Weapon", "Alliance War". */
  readonly category?: string;
  /** Where/how the script is unlocked in-game (quest, activity, vendor). */
  readonly acquisition?: string;
  readonly questReward?: string;
  readonly freeLocation?: string;
  readonly abilityIds?: readonly number[];
}

/**
 * Focus Script entity - modifies damage type, effect type, and mechanics
 */
export interface FocusScript extends Script {
  readonly type: 'Focus';
  readonly damageType?: DamageType;
  readonly effectType?: string;
  readonly multiplier?: number;
}

/**
 * Signature Script entity - adds additional effects and modifications
 */
export interface SignatureScript extends Script {
  readonly type: 'Signature';
  readonly additionalEffects?: readonly string[];
  readonly modifiers?: Record<string, number>;
}

/**
 * Affix Script entity - provides final modifications and enhancements
 */
export interface AffixScript extends Script {
  readonly type: 'Affix';
  readonly bonusType?: string;
  readonly bonusValue?: number;
  readonly conditions?: readonly string[];
}

/**
 * Scribing Combination entity - represents a complete scribed skill configuration
 */
export interface ScribingCombination {
  readonly grimoire: string;
  readonly focusScript: string;
  readonly signatureScript: string;
  readonly affixScript: string;
}

/**
 * Scribed Skill entity - represents the final calculated skill
 */
export interface ScribedSkill {
  readonly combination: ScribingCombination;
  readonly name: string;
  readonly description: string;
  readonly resourceType: ResourceType;
  readonly cost: number;
  readonly castTime: number;
  readonly range: number;
  readonly duration?: number;
  readonly cooldown?: number;
  readonly effects: readonly string[];
  readonly abilityIds: readonly number[];
}

/**
 * Quest Reward entity - represents scribing rewards from quests
 */
export interface QuestReward {
  readonly questName: string;
  readonly rewards: readonly {
    readonly type: 'grimoire' | 'focus' | 'signature' | 'affix';
    readonly id: string;
  }[];
}

/**
 * Free Script Location entity - represents locations where scripts can be found for free
 */
export interface FreeScriptLocation {
  readonly zone: string;
  readonly location: string;
  readonly scriptType: ScriptType;
  readonly scriptId: string;
}

/**
 * Script Vendor entity - represents NPCs that sell scripts
 */
export interface ScriptVendor {
  readonly name: string;
  readonly location: string;
  readonly currency: string;
  readonly costs: {
    readonly 'focus-script': { readonly first: number; readonly additional: number };
    readonly 'signature-script': { readonly first: number; readonly additional: number };
    readonly 'affix-script': { readonly first: number; readonly additional: number };
  };
}

/**
 * Luminous Ink entity - represents the crafting material for scribing
 */
export interface LuminousInk {
  readonly description: string;
  readonly costs: {
    readonly newSkill: number;
    readonly modifySkill: number;
  };
  readonly sources: readonly string[];
  readonly storage: string;
}

/**
 * Scribing System entity - represents global system configuration
 */
export interface ScribingSystem {
  readonly totalPossibleSkills: number;
  readonly grimoireRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly requirements: {
    readonly chapter: string;
    readonly characterLevel: number;
    readonly tutorialQuest: string;
  };
}

/**
 * Complete Scribing Data entity - represents the entire scribing system data
 */
export interface ScribingData {
  readonly version: string;
  readonly description: string;
  readonly lastUpdated?: string;
  readonly grimoires: Record<string, Grimoire>;
  readonly focusScripts: Record<string, FocusScript>;
  readonly signatureScripts: Record<string, SignatureScript>;
  readonly affixScripts: Record<string, AffixScript>;
  // Reference metadata not present in the extracted dataset — optional.
  readonly questRewards?: Record<string, QuestReward>;
  readonly freeScriptLocations?: Record<string, FreeScriptLocation>;
  readonly dailyScriptSources?: {
    readonly 'focus-scripts': readonly string[];
    readonly 'signature-scripts': readonly string[];
    readonly 'affix-scripts': readonly string[];
  };
  readonly scriptVendors?: Record<string, ScriptVendor>;
  readonly luminousInk?: LuminousInk;
  readonly system?: ScribingSystem;
}
