// Auto-generated types for ESO Scribing data
// Generated on: 2025-09-25

export interface Grimoire {
  id: string;
  name: string;
  skillLine: string;
  requirements: string | null;
  cost: {
    first: number;
    additional: number;
  };
  description: string;
}

export interface Script {
  id: string;
  name: string;
  type: 'Focus' | 'Signature' | 'Affix';
  icon: string;
  compatibleGrimoires: string[];
  description: string;
  questReward?: string;
  freeLocation?: string;
}

export interface FocusScript extends Script {
  type: 'Focus';
}

export interface SignatureScript extends Script {
  type: 'Signature';
}

export interface AffixScript extends Script {
  type: 'Affix';
}

export interface QuestReward {
  questName: string;
  rewards: Array<{
    type: 'grimoire' | 'focus' | 'signature' | 'affix';
    id: string;
  }>;
}

export interface FreeScriptLocation {
  zone: string;
  location: string;
  scriptType: 'Focus' | 'Signature' | 'Affix';
  scriptId: string;
}

export interface ScriptVendor {
  name: string;
  location: string;
  currency: string;
  costs: {
    'focus-script': { first: number; additional: number };
    'signature-script': { first: number; additional: number };
    'affix-script': { first: number; additional: number };
  };
}

export interface LuminousInk {
  description: string;
  costs: {
    newSkill: number;
    modifySkill: number;
  };
  sources: string[];
  storage: string;
}

export interface ScribingSystem {
  totalPossibleSkills: number;
  grimoireRange: {
    min: number;
    max: number;
  };
  requirements: {
    chapter: string;
    characterLevel: number;
    tutorialQuest: string;
  };
}

export interface ScribingData {
  grimoires: Record<string, Grimoire>;
  focusScripts: Record<string, FocusScript>;
  signatureScripts: Record<string, SignatureScript>;
  affixScripts: Record<string, AffixScript>;
  questRewards: Record<string, QuestReward>;
  freeScriptLocations: Record<string, FreeScriptLocation>;
  dailyScriptSources: {
    'focus-scripts': string[];
    'signature-scripts': string[];
    'affix-scripts': string[];
  };
  scriptVendors: Record<string, ScriptVendor>;
  luminousInk: LuminousInk;
  system: ScribingSystem;
}

// Utility types for working with scribing combinations
export interface ScribedSkillCombination {
  grimoire: string;
  focusScript: string;
  signatureScript: string;
  affixScript: string;
}

export interface ScribedSkillInfo {
  combination: ScribedSkillCombination;
  name: string;
  description: string;
  resourceCost: 'Magicka' | 'Stamina';
  skillLine: string;
  effects: string[];
}

// Helper types for filtering and searching
export type ScriptType = 'Focus' | 'Signature' | 'Affix';
export type SkillLine =
  | 'Support'
  | 'Destruction Staff'
  | 'Restoration Staff'
  | 'One Hand and Shield'
  | 'Two Handed'
  | 'Soul Magic'
  | 'Fighters Guild'
  | 'Assault'
  | 'Dual Wield'
  | 'Mages Guild'
  | 'Bow';

export type ScriptSource = 'quest' | 'free' | 'daily' | 'vendor' | 'enemy-drop' | 'other';

// Constants for easy reference
export const SCRIPT_TYPES: ScriptType[] = ['Focus', 'Signature', 'Affix'];

export const SKILL_LINES: SkillLine[] = [
  'Support',
  'Destruction Staff',
  'Restoration Staff',
  'One Hand and Shield',
  'Two Handed',
  'Soul Magic',
  'Fighters Guild',
  'Assault',
  'Dual Wield',
  'Mages Guild',
  'Bow',
];

export const SCRIPT_SOURCES: ScriptSource[] = [
  'quest',
  'free',
  'daily',
  'vendor',
  'enemy-drop',
  'other',
];
