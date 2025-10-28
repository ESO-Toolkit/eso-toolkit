import type { ScribingSkillInfo } from './utils/Scribing';

export interface ScribedSkillEffect {
  abilityId: number;
  abilityName: string;
  type: 'buff' | 'debuff' | 'damage' | 'heal' | 'aura' | 'resource';
  count: number;
}

export interface ScribedSkillRecipe {
  grimoire: string;
  transformation: string;
  transformationType: string;
  confidence: number;
  matchMethod: string;
  recipeSummary: string;
  tooltipInfo: string;
}

export interface ScribedSkillSignatureInfo {
  name: string;
  confidence: number;
  detectionMethod: string;
  evidence: string[];
}

export interface ScribedSkillAffixEvidence {
  buffIds: number[];
  debuffIds: number[];
  abilityNames: string[];
  occurrenceCount: number;
}

export interface ScribedSkillAffixInfo {
  id: string;
  name: string;
  description: string;
  confidence: number;
  detectionMethod: string;
  evidence: ScribedSkillAffixEvidence;
}

export interface ScribedSkillData {
  grimoireName: string;
  effects: ScribedSkillEffect[];
  wasCastInFight?: boolean;
  recipe?: ScribedSkillRecipe;
  signatureScript?: ScribedSkillSignatureInfo;
  affixScripts?: ScribedSkillAffixInfo[];
}

export interface ResolvedScribingDetection {
  schemaVersion: number;
  abilityId: number;
  effectiveAbilityId: number;
  scribingInfo: ScribingSkillInfo;
  wasCastInFight: boolean;
  signatureResult: ScribedSkillSignatureInfo | null;
  affixResults: ScribedSkillAffixInfo[];
  scribedSkillData: ScribedSkillData;
}
