import { ulid } from "ulid";
import type { RouterConfig } from "../config/schema.js";
import {
  RouterError,
  type EscalationReason,
  type TaskEnvelope,
  type TierName,
  type TriageVerdict,
} from "../types.js";

/**
 * Materialize a TaskEnvelope from a triage verdict. This is the single point
 * where we resolve tier → (provider, model) and bake in budget guardrails.
 */
export interface BuildEnvelopeInput {
  prompt: string;
  goal?: string;
  config: RouterConfig;
  verdict: TriageVerdict;
  contextFiles?: string[];
  parentSessionId?: string;
}

export function buildEnvelope(input: BuildEnvelopeInput): TaskEnvelope {
  const { prompt, config, verdict } = input;

  const tierName = resolveTierName(verdict.recommendedTier, config);
  const tier = config.tiers[tierName];
  if (!tier) {
    throw new RouterError(
      `Resolved tier "${tierName}" is not defined in config.`,
      "TIER_UNKNOWN",
    );
  }

  return {
    id: ulid(),
    createdAt: new Date().toISOString(),
    parentSessionId: input.parentSessionId,
    goal: input.goal ?? deriveGoal(prompt),
    originalPrompt: prompt,
    triage: {
      ...verdict,
      tier: tierName,
      provider: tier.provider,
      model: tier.model,
      rubricVersion: config.rubricVersion,
    },
    context: {
      files: input.contextFiles ?? [],
      constraints: [],
    },
    budget: {
      maxTokens: tier.maxTokens ?? config.budgets.perTask?.tokens,
      maxToolCalls: config.budgets.perTask?.toolCalls,
      maxUsd: config.budgets.perTask?.usd,
      escalationAllowed: config.escalation.enabled,
    },
  };
}

/**
 * Mint a new envelope at an escalated tier, carrying the prior attempt's
 * digest forward. This is the method that makes the handoff actually work
 * across model boundaries — the old worker session is discarded and the new
 * one cold-starts with a structured summary.
 */
export function escalateEnvelope(
  prior: TaskEnvelope,
  config: RouterConfig,
  reason: EscalationReason,
  priorDigest: string,
): TaskEnvelope {
  const nextTier = bumpTier(prior.triage.tier, config);
  if (!nextTier) {
    throw new RouterError(
      `No higher tier available to escalate from "${prior.triage.tier}".`,
      "ESCALATION_CEILING",
    );
  }
  const tier = config.tiers[nextTier]!;
  const bumpCount = (prior.escalation?.bumpCount ?? 0) + 1;

  if (bumpCount > config.escalation.maxBumps) {
    throw new RouterError(
      `Escalation cap reached (maxBumps=${config.escalation.maxBumps}).`,
      "ESCALATION_CAP",
    );
  }

  return {
    ...prior,
    id: ulid(),
    createdAt: new Date().toISOString(),
    triage: {
      ...prior.triage,
      tier: nextTier,
      provider: tier.provider,
      model: tier.model,
      source: "user-override",
      rationale: `Escalated from ${prior.triage.tier} due to ${reason}.`,
    },
    budget: {
      ...prior.budget,
      maxTokens: tier.maxTokens ?? prior.budget.maxTokens,
    },
    escalation: {
      fromTier: prior.triage.tier,
      fromModel: prior.triage.model,
      reason,
      priorAttemptDigest: priorDigest,
      bumpCount,
    },
  };
}

function resolveTierName(
  recommended: TierName,
  config: RouterConfig,
): TierName {
  if (config.tiers[recommended]) return recommended;
  // Fall back to defaultTier if the LLM picked an unknown tier.
  return config.defaultTier;
}

function deriveGoal(prompt: string): string {
  const firstLine = prompt.trim().split("\n")[0] ?? prompt;
  return firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
}

/** Return the next higher tier in config order, or null if at the top. */
export function bumpTier(
  current: TierName,
  config: RouterConfig,
): TierName | null {
  const order = tierOrder(config);
  const idx = order.indexOf(current);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1]!;
}

/**
 * Tier ordering heuristic: sort by maxTokens ascending, using the order in
 * which tiers were declared as a tiebreaker. Users who want an explicit
 * ordering can rely on insertion order of the tiers record.
 */
function tierOrder(config: RouterConfig): TierName[] {
  return Object.keys(config.tiers).sort((a, b) => {
    const ta = config.tiers[a]!.maxTokens ?? Number.POSITIVE_INFINITY;
    const tb = config.tiers[b]!.maxTokens ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return 0;
  });
}
