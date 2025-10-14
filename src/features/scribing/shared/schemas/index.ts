/**
 * Zod validation schemas for ESO Scribing system
 * These provide runtime type validation and parsing
 */

import { z } from 'zod';

// Base type schemas
export const ResourceTypeSchema = z.enum(['magicka', 'stamina', 'health', 'hybrid']);
export const DamageTypeSchema = z.enum([
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
export const ScriptTypeSchema = z.enum(['Focus', 'Signature', 'Affix']);
export const SkillLineSchema = z.enum([
  'Support',
  'Destruction Staff',
  'Restoration Staff',
  'Assault',
  'Mage Guild',
  'Fighters Guild',
  'Psijic Order',
  'Soul Magic',
  'Vampire',
  'Werewolf',
]);

// Entity schemas
export const GrimoireSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  skillLine: SkillLineSchema,
  requirements: z.string().nullable(),
  cost: z.object({
    first: z.number().min(0),
    additional: z.number().min(0),
  }),
  description: z.string(),
  iconUrl: z.string().url().optional(),
  abilityIds: z.array(z.number()).optional(),
});

export const ScriptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ScriptTypeSchema,
  icon: z.string(),
  compatibleGrimoires: z.array(z.string()),
  description: z.string(),
  questReward: z.string().optional(),
  freeLocation: z.string().optional(),
  abilityIds: z.array(z.number()).optional(),
});

export const FocusScriptSchema = ScriptSchema.extend({
  type: z.literal('Focus'),
  damageType: DamageTypeSchema.optional(),
  effectType: z.string().optional(),
  multiplier: z.number().optional(),
});

export const SignatureScriptSchema = ScriptSchema.extend({
  type: z.literal('Signature'),
  additionalEffects: z.array(z.string()).optional(),
  modifiers: z.record(z.string(), z.number()).optional(),
});

export const AffixScriptSchema = ScriptSchema.extend({
  type: z.literal('Affix'),
  bonusType: z.string().optional(),
  bonusValue: z.number().optional(),
  conditions: z.array(z.string()).optional(),
});

export const ScribingCombinationSchema = z.object({
  grimoire: z.string().min(1),
  focusScript: z.string().min(1),
  signatureScript: z.string().min(1),
  affixScript: z.string().min(1),
});

export const ScribedSkillSchema = z.object({
  combination: ScribingCombinationSchema,
  name: z.string().min(1),
  description: z.string(),
  resourceType: ResourceTypeSchema,
  cost: z.number().min(0),
  castTime: z.number().min(0),
  range: z.number().min(0),
  duration: z.number().min(0).optional(),
  cooldown: z.number().min(0).optional(),
  effects: z.array(z.string()),
  abilityIds: z.array(z.number()),
});

export const QuestRewardSchema = z.object({
  questName: z.string().min(1),
  rewards: z.array(
    z.object({
      type: z.enum(['grimoire', 'focus', 'signature', 'affix']),
      id: z.string().min(1),
    }),
  ),
});

export const FreeScriptLocationSchema = z.object({
  zone: z.string().min(1),
  location: z.string().min(1),
  scriptType: ScriptTypeSchema,
  scriptId: z.string().min(1),
});

export const ScriptVendorSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  currency: z.string().min(1),
  costs: z.object({
    'focus-script': z.object({
      first: z.number().min(0),
      additional: z.number().min(0),
    }),
    'signature-script': z.object({
      first: z.number().min(0),
      additional: z.number().min(0),
    }),
    'affix-script': z.object({
      first: z.number().min(0),
      additional: z.number().min(0),
    }),
  }),
});

export const LuminousInkSchema = z.object({
  description: z.string(),
  costs: z.object({
    newSkill: z.number().min(0),
    modifySkill: z.number().min(0),
  }),
  sources: z.array(z.string()),
  storage: z.string(),
});

export const ScribingSystemSchema = z.object({
  totalPossibleSkills: z.number().min(0),
  grimoireRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  requirements: z.object({
    chapter: z.string(),
    characterLevel: z.number().min(0),
    tutorialQuest: z.string(),
  }),
});

export const ScribingDataSchema = z.object({
  version: z.string().min(1),
  description: z.string(),
  lastUpdated: z.string(),
  grimoires: z.record(z.string(), GrimoireSchema),
  focusScripts: z.record(z.string(), FocusScriptSchema),
  signatureScripts: z.record(z.string(), SignatureScriptSchema),
  affixScripts: z.record(z.string(), AffixScriptSchema),
  questRewards: z.record(z.string(), QuestRewardSchema),
  freeScriptLocations: z.record(z.string(), FreeScriptLocationSchema),
  dailyScriptSources: z.object({
    'focus-scripts': z.array(z.string()),
    'signature-scripts': z.array(z.string()),
    'affix-scripts': z.array(z.string()),
  }),
  scriptVendors: z.record(z.string(), ScriptVendorSchema),
  luminousInk: LuminousInkSchema,
  system: ScribingSystemSchema,
});

// DTO schemas
export const AbilityScribingMappingSchema = z.object({
  abilityId: z.number().min(1),
  type: z.enum(['grimoire', 'transformation', 'signature', 'affix']),
  grimoireKey: z.string().min(1),
  componentKey: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const DetectedCombinationSchema = z.object({
  grimoire: z.string().min(1),
  grimoireKey: z.string().min(1),
  casts: z.number().min(0),
  focus: z.string().min(1),
  focusKey: z.string().optional(),
  signature: z.string().min(1),
  signatureKey: z.string().optional(),
  affix: z.string().min(1),
  affixKey: z.string().optional(),
  confidence: z
    .object({
      focus: z.number().min(0).max(1).optional(),
      signature: z.number().min(0).max(1).optional(),
      affix: z.number().min(0).max(1).optional(),
      overall: z.number().min(0).max(1).optional(),
    })
    .optional(),
  events: z
    .object({
      casts: z.number().min(0),
      buffs: z.number().min(0),
      debuffs: z.number().min(0),
      damage: z.number().min(0),
      heals: z.number().min(0),
    })
    .optional(),
});

export const ScribingDetectionResultSchema = z.object({
  playerId: z.number().min(1),
  playerName: z.string().min(1),
  detectedCombinations: z.array(DetectedCombinationSchema),
  confidence: z.number().min(0).max(1),
  analysisTimestamp: z.number().min(0),
});

export const ScribingSimulationRequestSchema = z.object({
  grimoireId: z.string().min(1),
  focusScriptId: z.string().optional(),
  signatureScriptId: z.string().optional(),
  affixScriptId: z.string().optional(),
  characterLevel: z.number().min(1).max(1000).optional(),
  championPoints: z.number().min(0).optional(),
});

export const ScribingSimulationResponseSchema = z.object({
  combination: z.object({
    grimoire: z.string().min(1),
    focusScript: z.string().optional(),
    signatureScript: z.string().optional(),
    affixScript: z.string().optional(),
  }),
  calculatedSkill: z.object({
    name: z.string().min(1),
    description: z.string(),
    resourceType: ResourceTypeSchema,
    cost: z.number().min(0),
    castTime: z.number().min(0),
    range: z.number().min(0),
    duration: z.number().min(0).optional(),
    damage: z
      .object({
        type: DamageTypeSchema,
        amount: z.number().min(0),
      })
      .optional(),
    effects: z.array(z.string()),
  }),
  isValid: z.boolean(),
  errors: z.array(z.string()).optional(),
});

// Validation functions
export const validateScribingData = (data: unknown): z.infer<typeof ScribingDataSchema> =>
  ScribingDataSchema.parse(data);
export const validateGrimoire = (grimoire: unknown): z.infer<typeof GrimoireSchema> =>
  GrimoireSchema.parse(grimoire);
export const validateFocusScript = (script: unknown): z.infer<typeof FocusScriptSchema> =>
  FocusScriptSchema.parse(script);
export const validateSignatureScript = (script: unknown): z.infer<typeof SignatureScriptSchema> =>
  SignatureScriptSchema.parse(script);
export const validateAffixScript = (script: unknown): z.infer<typeof AffixScriptSchema> =>
  AffixScriptSchema.parse(script);
export const validateScribedSkill = (skill: unknown): z.infer<typeof ScribedSkillSchema> =>
  ScribedSkillSchema.parse(skill);
export const validateDetectionResult = (
  result: unknown,
): z.infer<typeof ScribingDetectionResultSchema> => ScribingDetectionResultSchema.parse(result);
export const validateSimulationRequest = (
  request: unknown,
): z.infer<typeof ScribingSimulationRequestSchema> =>
  ScribingSimulationRequestSchema.parse(request);
export const validateSimulationResponse = (
  response: unknown,
): z.infer<typeof ScribingSimulationResponseSchema> =>
  ScribingSimulationResponseSchema.parse(response);

// Safe parsing functions that return Result types
export const safeParseScribingData = (
  data: unknown,
): ReturnType<typeof ScribingDataSchema.safeParse> => ScribingDataSchema.safeParse(data);
export const safeParseGrimoire = (grimoire: unknown): ReturnType<typeof GrimoireSchema.safeParse> =>
  GrimoireSchema.safeParse(grimoire);
export const safeParseDetectionResult = (
  result: unknown,
): ReturnType<typeof ScribingDetectionResultSchema.safeParse> =>
  ScribingDetectionResultSchema.safeParse(result);
