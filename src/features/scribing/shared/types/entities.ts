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
export type SkillLine =
  | 'Support'
  | 'Destruction Staff'
  | 'Restoration Staff'
  | 'Assault'
  | 'Mage Guild'
  | 'Fighters Guild'
  | 'Psijic Order'
  | 'Soul Magic'
  | 'Vampire'
  | 'Werewolf';

/**
 * Core Grimoire entity - represents a base scribing skill template
 */
export interface Grimoire {
  readonly id: string;
  readonly name: string;
  readonly skillLine: SkillLine;
  readonly requirements: string | null;
  readonly cost: {
    readonly first: number;
    readonly additional: number;
  };
  readonly description: string;
  readonly iconUrl?: string;
  readonly abilityIds?: readonly number[];
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
  readonly lastUpdated: string;
  readonly grimoires: Record<string, Grimoire>;
  readonly focusScripts: Record<string, FocusScript>;
  readonly signatureScripts: Record<string, SignatureScript>;
  readonly affixScripts: Record<string, AffixScript>;
  readonly questRewards: Record<string, QuestReward>;
  readonly freeScriptLocations: Record<string, FreeScriptLocation>;
  readonly dailyScriptSources: {
    readonly 'focus-scripts': readonly string[];
    readonly 'signature-scripts': readonly string[];
    readonly 'affix-scripts': readonly string[];
  };
  readonly scriptVendors: Record<string, ScriptVendor>;
  readonly luminousInk: LuminousInk;
  readonly system: ScribingSystem;
}
