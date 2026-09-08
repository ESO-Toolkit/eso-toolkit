import { z } from "zod";

/**
 * Zod schema for router.config.{ts,js,json}. The schema is the single source
 * of truth for config validation and is re-exported as TypeScript types via
 * `z.infer` so there is no drift between runtime and compile-time contracts.
 */

export const HeuristicCondition = z.object({
  promptTokens: z
    .object({ lt: z.number().optional(), gt: z.number().optional() })
    .partial()
    .optional(),
  fileGlobBreadth: z
    .object({ lt: z.number().optional(), gt: z.number().optional() })
    .partial()
    .optional(),
  verbClass: z.enum(["read", "write", "design", "unknown"]).optional(),
  keywords: z.array(z.string()).optional(),
  hasMultiStepMarkers: z.boolean().optional(),
});

export const HeuristicRule = z.object({
  name: z.string().optional(),
  when: HeuristicCondition,
  tier: z.string(),
});

export const TierConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  maxTokens: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export const ProviderConfigSchema = z.object({
  kind: z.string(),
  baseURL: z.string().url().optional(),
  region: z.string().optional(),
  // Free-form provider-specific options. Providers validate their own slice.
  options: z.record(z.string(), z.unknown()).optional(),
});

export const EscalationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  triggers: z
    .object({
      validationFailures: z.number().int().nonnegative().default(2),
      toolLoopThreshold: z.number().int().nonnegative().default(5),
      selfDoubt: z.boolean().default(true),
    })
    .default({
      validationFailures: 2,
      toolLoopThreshold: 5,
      selfDoubt: true,
    }),
  maxBumps: z.number().int().nonnegative().default(2),
});

export const BudgetConfigSchema = z.object({
  perTask: z
    .object({
      usd: z.number().positive().optional(),
      toolCalls: z.number().int().positive().optional(),
      tokens: z.number().int().positive().optional(),
    })
    .optional(),
  perSession: z
    .object({
      usd: z.number().positive().optional(),
      tokens: z.number().int().positive().optional(),
    })
    .optional(),
});

export const TriageConfigSchema = z.object({
  provider: z.string().default("anthropic"),
  model: z.string().default("claude-haiku-4-5"),
  rubricPath: z.string().optional(),
  minConfidence: z.number().min(0).max(1).default(0.6),
});

export const WeightsSchema = z
  .object({
    ambiguity: z.number().default(0.35),
    multiFileEdits: z.number().default(0.25),
    reasoningDepth: z.number().default(0.2),
    codebaseExplore: z.number().default(0.1),
    promptLength: z.number().default(0.1),
  })
  .default({
    ambiguity: 0.35,
    multiFileEdits: 0.25,
    reasoningDepth: 0.2,
    codebaseExplore: 0.1,
    promptLength: 0.1,
  });

export const ProjectConfigSchema = z
  .object({
    rootGlobs: z.array(z.string()).default(["**/*"]),
    excludeGlobs: z.array(z.string()).default([]),
    contextFiles: z.array(z.string()).default([]),
  })
  .default({
    rootGlobs: ["**/*"],
    excludeGlobs: [],
    contextFiles: [],
  });

export const RouterConfigSchema = z.object({
  rubricVersion: z.string().default("1"),
  providers: z.record(z.string(), ProviderConfigSchema).default({}),
  tiers: z.record(z.string(), TierConfigSchema),
  defaultTier: z.string().default("default"),
  heuristics: z.array(HeuristicRule).default([]),
  triage: TriageConfigSchema.default({
    provider: "anthropic",
    model: "claude-haiku-4-5",
    minConfidence: 0.6,
  }),
  weights: WeightsSchema,
  escalation: EscalationConfigSchema.default({
    enabled: true,
    triggers: {
      validationFailures: 2,
      toolLoopThreshold: 5,
      selfDoubt: true,
    },
    maxBumps: 2,
  }),
  budgets: BudgetConfigSchema.default({}),
  fallback: z.record(z.string(), z.array(z.string())).default({}),
  project: ProjectConfigSchema,
  hooks: z
    .object({
      beforeTriage: z.string().optional(),
      afterDispatch: z.string().optional(),
      onEscalation: z.string().optional(),
    })
    .default({}),
});

export type RouterConfig = z.infer<typeof RouterConfigSchema>;
export type HeuristicRuleType = z.infer<typeof HeuristicRule>;
