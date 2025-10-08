import { z } from 'zod';

// Base schemas for common types
const ResourceTypeSchema = z.enum(['magicka', 'stamina', 'health', 'hybrid']);
const DamageTypeSchema = z.enum([
  'magic',
  'physical',
  'fire',
  'frost',
  'shock',
  'poison',
  'disease',
  'bleed',
  'oblivion',
  'flame',
]);
const ScriptTypeSchema = z.enum(['Focus', 'Signature', 'Affix']);
// Skill line schema - currently unused but kept for future compatibility
// const SkillLineSchema = z.enum(['Assault', 'Support', 'Mage Guild']);

// Core configuration schemas
export const SimulatorConfigSchema = z.object({
  baseUrl: z.string(),
  combinationMapping: z.record(
    z.string(),
    z.object({
      grimoire: z.string(),
      focusScripts: z.array(z.string()),
    }),
  ),
});

export const FormulaDefinitionSchema = z.object({
  type: z.enum(['resource', 'calculated', 'fixed', 'modifiable']),
  formula: z.string().optional(),
  baseValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const CalculationFormulasSchema = z.object({
  cost: FormulaDefinitionSchema,
  damage: FormulaDefinitionSchema,
  castTime: FormulaDefinitionSchema,
  duration: FormulaDefinitionSchema,
  range: FormulaDefinitionSchema,
});

// Effect modifier schemas
export const FocusModifierSchema = z.object({
  damageType: DamageTypeSchema.optional(),
  effectType: z.string().optional(),
  multiplier: z.number(),
  dotDuration: z.number().optional(),
  tooltip: z.string(),
});

export const SignatureModifierSchema = z.object({
  durationMultiplier: z.number().optional(),
  damageMultiplier: z.number().optional(),
  classBonus: z.boolean().optional(),
  healingBonus: z.number().optional(),
  multiplier: z.number().optional(),
  tooltip: z.string(),
});

export const AffixModifierSchema = z.object({
  buffType: z.string(),
  effects: z.array(z.string()),
  duration: z.number(),
  damageIncrease: z.number().optional(),
  tooltip: z.string(),
});

export const ScriptEffectsSchema = z.object({
  focusModifiers: z.record(z.string(), FocusModifierSchema),
  signatureModifiers: z.record(z.string(), SignatureModifierSchema),
  affixModifiers: z.record(z.string(), AffixModifierSchema),
});

// Mechanical effect schema for scripts
export const MechanicalEffectSchema = z.object({
  damageType: DamageTypeSchema.optional(),
  multiplier: z.number().optional(),
  statusEffect: z.string().optional(),
  costModifier: z.number().optional(),
  durationMultiplier: z.number().optional(),
  effects: z.array(z.string()).optional(),
});

// Base properties for grimoires
export const BasePropertiesSchema = z.object({
  cost: z.number(),
  resource: ResourceTypeSchema,
  castTime: z.number(),
  duration: z.number().optional(),
  radius: z.number().optional(),
  shape: z.string().optional(),
  target: z.string().optional(),
});

// Skill template schema
export const SkillTemplateSchema = z.object({
  baseDescription: z.string(),
  nameVariants: z.record(z.string(), z.string()),
  calculatedProperties: z.record(z.string(), z.string()),
});

// Core script schemas
export const GrimoireSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().min(1),
  cost: z.union([z.number().min(0), z.string()]), // Allow both numeric costs and string values like "highest-resource"
  resource: ResourceTypeSchema,
  skillType: z.string().optional(),
  school: z.string().optional(),
  nameTransformations: z
    .record(
      z.string(),
      z.object({
        name: z.string(),
        abilityIds: z.array(z.number()),
        matchCount: z.number().optional(),
      }),
    )
    .optional(),
  validationSuccess: z.boolean().optional(),
  lastValidated: z.string().optional(),
});

export const FocusScriptSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().min(1),
  category: z.string().optional(),
  damageType: DamageTypeSchema.optional(),
  type: z.literal('Focus').optional(),
  icon: z.string().optional(),
  combatDescription: z.string().optional(),
  mechanicalEffect: MechanicalEffectSchema.optional(),
  compatibleGrimoires: z.array(z.string()).optional(),
});

export const SignatureScriptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string(),
  compatibleGrimoires: z.array(z.string()),
  type: z.literal('Signature').optional(),
  icon: z.string().optional(),
  mechanicalEffect: MechanicalEffectSchema.optional(),
  questReward: z.string().optional(),
  freeLocation: z.string().optional(),
});

export const AffixScriptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string(),
  compatibleGrimoires: z.array(z.string()),
  type: z.literal('Affix').optional(),
  icon: z.string().optional(),
  mechanicalEffect: MechanicalEffectSchema.optional(),
  freeLocation: z.string().optional(),
});

// Calculated skill properties
export const SkillPropertiesSchema = z.object({
  cost: z.number().min(0),
  resource: ResourceTypeSchema,
  castTime: z.number().min(0),
  duration: z.number().optional(),
  radius: z.number().optional(),
  shape: z.string().optional(),
  target: z.string().optional(),
  damage: z.number().optional(),
  damageType: DamageTypeSchema.optional(),
  shield: z.number().optional(),
  healing: z.number().optional(),
  mitigationPercent: z.number().min(0).max(100).optional(),
  dispelCount: z.number().min(0).optional(),
});

export const CalculatedSkillSchema = z.object({
  name: z.string().min(1),
  grimoire: z.string().min(1),
  focus: z.string().optional(),
  signature: z.string().optional(),
  affix: z.string().optional(),
  abilityIds: z.array(z.number()).optional(),
  properties: SkillPropertiesSchema,
  tooltip: z.string(),
  effects: z.array(z.string()),
});

// Legacy compatibility schemas
export const QuestRewardSchema = z.object({
  questName: z.string(),
  location: z.string(),
  scriptType: ScriptTypeSchema,
});

export const ScriptVendorSchema = z.object({
  name: z.string(),
  location: z.string(),
  scriptType: ScriptTypeSchema,
  currency: z.string(),
  rotation: z.string().optional(),
});

export const ScribingCompatibilitySchema = z.record(
  z.string(),
  z.object({
    focus: z.array(z.string()),
    signature: z.array(z.string()),
    affix: z.array(z.string()),
  }),
);

// Main scribing data schema
export const ScribingDataSchema = z.object({
  version: z.string(),
  description: z.string(),
  lastUpdated: z.string(),
  generatedAt: z.string().optional(),
  dataValidation: z.any().optional(),
  simulator: z.any().optional(), // Flexible for actual structure
  calculationFormulas: z.any().optional(), // Flexible for actual structure
  scriptEffects: z.any().optional(), // Flexible for actual structure
  skillTemplates: z.any().optional(), // Flexible for actual structure
  stats: z.any().optional(),
  abilityMappings: z.any().optional(),
  grimoires: z.record(z.string(), GrimoireSchema),
  focusScripts: z.record(z.string(), FocusScriptSchema),
  signatureScripts: z.record(z.string(), SignatureScriptSchema).optional(),
  affixScripts: z.record(z.string(), AffixScriptSchema).optional(),
});

// Inferred TypeScript types from Zod schemas
export type ScribingData = z.infer<typeof ScribingDataSchema>;
export type Grimoire = z.infer<typeof GrimoireSchema>;
export type FocusScript = z.infer<typeof FocusScriptSchema>;
export type SignatureScript = z.infer<typeof SignatureScriptSchema>;
export type AffixScript = z.infer<typeof AffixScriptSchema>;
export type CalculatedSkill = z.infer<typeof CalculatedSkillSchema>;
export type SkillProperties = z.infer<typeof SkillPropertiesSchema>;
export type MechanicalEffect = z.infer<typeof MechanicalEffectSchema>;
export type BaseProperties = z.infer<typeof BasePropertiesSchema>;
export type SimulatorConfig = z.infer<typeof SimulatorConfigSchema>;
export type CalculationFormulas = z.infer<typeof CalculationFormulasSchema>;
export type ScriptEffects = z.infer<typeof ScriptEffectsSchema>;
export type SkillTemplate = z.infer<typeof SkillTemplateSchema>;
export type QuestReward = z.infer<typeof QuestRewardSchema>;
export type ScriptVendor = z.infer<typeof ScriptVendorSchema>;
export type ScribingCompatibility = z.infer<typeof ScribingCompatibilitySchema>;

// Utility types
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type DamageType = z.infer<typeof DamageTypeSchema>;
export type ScriptType = z.infer<typeof ScriptTypeSchema>;
// export type SkillLine = z.infer<typeof SkillLineSchema>;

// Validation helper functions
export const validateScribingData = (data: unknown): ScribingData => {
  return ScribingDataSchema.parse(data);
};

export const validateGrimoire = (grimoire: unknown): Grimoire => {
  return GrimoireSchema.parse(grimoire);
};

export const validateFocusScript = (script: unknown): FocusScript => {
  return FocusScriptSchema.parse(script);
};

export const validateSignatureScript = (script: unknown): SignatureScript => {
  return SignatureScriptSchema.parse(script);
};

export const validateAffixScript = (script: unknown): AffixScript => {
  return AffixScriptSchema.parse(script);
};

export const validateCalculatedSkill = (skill: unknown): CalculatedSkill => {
  return CalculatedSkillSchema.parse(skill);
};

// Safe parsing functions that return success/error results
export const safeParseScribingData = (data: unknown): z.ZodSafeParseResult<ScribingData> => {
  return ScribingDataSchema.safeParse(data);
};

export const safeParseGrimoire = (grimoire: unknown): z.ZodSafeParseResult<Grimoire> => {
  return GrimoireSchema.safeParse(grimoire);
};

export const safeParseFocusScript = (script: unknown): z.ZodSafeParseResult<FocusScript> => {
  return FocusScriptSchema.safeParse(script);
};

export const safeParseSignatureScript = (
  script: unknown,
): z.ZodSafeParseResult<SignatureScript> => {
  return SignatureScriptSchema.safeParse(script);
};

export const safeParseAffixScript = (script: unknown): z.ZodSafeParseResult<AffixScript> => {
  return AffixScriptSchema.safeParse(script);
};

export const safeParseCalculatedSkill = (skill: unknown): z.ZodSafeParseResult<CalculatedSkill> => {
  return CalculatedSkillSchema.safeParse(skill);
};
