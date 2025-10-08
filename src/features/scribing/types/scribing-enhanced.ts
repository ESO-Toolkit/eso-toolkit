// Enhanced TypeScript types for ESO Scribing with calculation capabilities

export interface ScribingData {
  version: string;
  description: string;
  lastUpdated: string;
  simulator: SimulatorConfig;
  calculationFormulas: CalculationFormulas;
  scriptEffects: ScriptEffects;
  skillTemplates: Record<string, SkillTemplate>;
  grimoires: Record<string, Grimoire>;
  focusScripts: Record<string, FocusScript>;
  signatureScripts?: Record<string, SignatureScript>;
  affixScripts?: Record<string, AffixScript>;
}

export interface SimulatorConfig {
  baseUrl: string;
  combinationMapping: Record<string, CombinationMapping>;
}

export interface CombinationMapping {
  grimoire: string;
  focusScripts: string[];
}

export interface CalculationFormulas {
  cost: FormulaDefinition;
  damage: FormulaDefinition;
  castTime: FormulaDefinition;
  duration: FormulaDefinition;
  range: FormulaDefinition;
}

export interface FormulaDefinition {
  type: 'resource' | 'calculated' | 'fixed' | 'modifiable';
  formula?: string;
  baseValues: Record<string, string | number | boolean>;
}

export interface ScriptEffects {
  focusModifiers: Record<string, FocusModifier>;
  signatureModifiers: Record<string, SignatureModifier>;
  affixModifiers: Record<string, AffixModifier>;
}

export interface FocusModifier {
  damageType?: string;
  effectType?: string;
  multiplier: number;
  dotDuration?: number;
  tooltip: string;
}

export interface SignatureModifier {
  durationMultiplier?: number;
  damageMultiplier?: number;
  classBonus?: boolean;
  healingBonus?: number;
  multiplier?: number;
  tooltip: string;
}

export interface AffixModifier {
  buffType: string;
  effects: string[];
  duration: number;
  damageIncrease?: number;
  tooltip: string;
}

export interface SkillTemplate {
  baseDescription: string;
  nameVariants: Record<string, string>;
  calculatedProperties: Record<string, string>;
}

export interface Grimoire {
  id: string;
  name: string;
  skillLine: string;
  combinationId?: string;
  requirements: string | null;
  cost: {
    first: number;
    additional: number;
  };
  description: string;
  baseProperties: BaseProperties;
}

export interface BaseProperties {
  cost: number;
  resource: string;
  castTime: number;
  duration?: number;
  radius?: number;
  shape?: string;
  target?: string;
}

export interface FocusScript {
  id: string;
  name: string;
  type: 'Focus';
  icon: string;
  combatDescription: string;
  mechanicalEffect: MechanicalEffect;
  compatibleGrimoires: string[];
}

export interface SignatureScript {
  id: string;
  name: string;
  type: 'Signature';
  icon: string;
  description: string;
  mechanicalEffect?: MechanicalEffect;
  compatibleGrimoires: string[];
  questReward?: string;
  freeLocation?: string;
}

export interface AffixScript {
  id: string;
  name: string;
  type: 'Affix';
  icon: string;
  description: string;
  mechanicalEffect?: MechanicalEffect;
  compatibleGrimoires: string[];
  freeLocation?: string;
}

export interface MechanicalEffect {
  damageType?: string;
  multiplier?: number;
  statusEffect?: string;
  costModifier?: number;
  durationMultiplier?: number;
  effects?: string[];
}

export interface CalculatedSkill {
  name: string;
  grimoire: string;
  focus?: string;
  signature?: string;
  affix?: string;
  abilityIds?: number[];
  properties: SkillProperties;
  tooltip: string;
  effects: string[];
}

export interface SkillProperties {
  cost: number;
  resource: string;
  castTime: number;
  duration?: number;
  radius?: number;
  shape?: string;
  target?: string;
  damage?: number;
  damageType?: string;
  shield?: number;
  healing?: number;
  mitigationPercent?: number;
  dispelCount?: number;
}

// Legacy compatibility with existing types
export interface QuestReward {
  questName: string;
  location: string;
  scriptType: 'Focus' | 'Signature' | 'Affix';
}

export interface ScriptVendor {
  name: string;
  location: string;
  scriptType: 'Focus' | 'Signature' | 'Affix';
  currency: string;
  rotation?: string;
}

export interface ScribingCompatibility {
  [key: string]: {
    focus: string[];
    signature: string[];
    affix: string[];
  };
}
