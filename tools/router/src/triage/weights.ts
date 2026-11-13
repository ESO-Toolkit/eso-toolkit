import type { RouterConfig } from "../config/schema.js";
import type { TierName, TriageVerdict } from "../types.js";

/**
 * Apply user-configured weights to an LLM triage verdict to compute a final
 * composite complexity score, and map that score to a tier.
 *
 * The LLM already emits a `recommendedTier`, but users want to influence how
 * much each signal contributes — e.g. "ambiguity should dominate" or
 * "multi-file edits always mean deep". The weights block in router.config.ts
 * expresses those preferences as a weighted sum. Components are each
 * normalized to 0-1, multiplied by their weight, and summed; the final
 * composite is compared against thresholds.
 *
 * If the composite score disagrees with the LLM's recommended tier by more
 * than one step, we bump toward the weighted choice and record that the
 * verdict was re-weighted (so the TUI can show it).
 */

export interface WeightedScoring {
  verdict: TriageVerdict;
  /** Composite score in [0, 1]. */
  score: number;
  /** Tier derived from the composite, independent of the LLM recommendation. */
  weightedTier: TierName;
  /** True if weights changed the chosen tier from the LLM recommendation. */
  adjusted: boolean;
}

export function applyWeights(
  verdict: TriageVerdict,
  config: RouterConfig,
): WeightedScoring {
  const w = config.weights;

  // Normalize each signal to [0, 1]. Higher = more complex.
  const ambiguity = (verdict.ambiguity - 1) / 4;
  const multiFileEdits = verdict.requiresMultiFileEdits ? 1 : 0;
  const reasoningDepth = (verdict.reasoningDepth - 1) / 4;
  const codebaseExplore = verdict.requiresCodebaseExploration ? 1 : 0;
  // Prompt length is not in the verdict; we approximate it via the rationale
  // length as a stand-in. It's a minor signal anyway.
  const promptLength = Math.min(1, verdict.rationale.length / 500);

  const total =
    w.ambiguity +
    w.multiFileEdits +
    w.reasoningDepth +
    w.codebaseExplore +
    w.promptLength;

  // Guard against a zero-weight config. Fall back to the LLM pick untouched.
  if (total === 0) {
    return {
      verdict,
      score: 0,
      weightedTier: verdict.recommendedTier,
      adjusted: false,
    };
  }

  const score =
    (w.ambiguity * ambiguity +
      w.multiFileEdits * multiFileEdits +
      w.reasoningDepth * reasoningDepth +
      w.codebaseExplore * codebaseExplore +
      w.promptLength * promptLength) /
    total;

  const weightedTier = scoreToTier(score, config);
  const adjusted = weightedTier !== verdict.recommendedTier;

  if (!adjusted) {
    return { verdict, score, weightedTier, adjusted };
  }

  // Only override if the weighted tier differs by more than one step from
  // the LLM pick — this preserves the LLM's judgment for borderline cases.
  if (!isBigDivergence(verdict.recommendedTier, weightedTier, config)) {
    return { verdict, score, weightedTier: verdict.recommendedTier, adjusted: false };
  }

  return {
    verdict: {
      ...verdict,
      recommendedTier: weightedTier,
      rationale: `${verdict.rationale} (reweighted from ${verdict.recommendedTier} → ${weightedTier}, score ${score.toFixed(2)})`,
    },
    score,
    weightedTier,
    adjusted: true,
  };
}

/**
 * Partition the [0, 1] composite score across the tiers in config, in
 * insertion order. With 3 tiers the cutoffs are 1/3 and 2/3; with 4 tiers
 * they're 1/4, 2/4, 3/4, etc. This keeps the math config-agnostic.
 */
function scoreToTier(score: number, config: RouterConfig): TierName {
  const tiers = Object.keys(config.tiers);
  if (tiers.length === 0) return config.defaultTier;
  const idx = Math.min(
    tiers.length - 1,
    Math.floor(score * tiers.length),
  );
  return tiers[idx]!;
}

function isBigDivergence(
  a: TierName,
  b: TierName,
  config: RouterConfig,
): boolean {
  const tiers = Object.keys(config.tiers);
  const ai = tiers.indexOf(a);
  const bi = tiers.indexOf(b);
  if (ai === -1 || bi === -1) return true;
  return Math.abs(ai - bi) > 1;
}
