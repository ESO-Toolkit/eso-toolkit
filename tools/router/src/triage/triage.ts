import type { RouterConfig } from "../config/schema.js";
import type { Credential, TriageVerdict } from "../types.js";
import {
  buildHeuristicVerdict,
  extractSignals,
  matchHeuristics,
} from "./heuristics.js";
import { runLlmTriage } from "./llm-triage.js";

/**
 * Top-level triage entrypoint. Runs heuristics first, then falls back to the
 * LLM triage model if no rule matched. Enforces the minConfidence threshold
 * from config by bumping low-confidence verdicts to the default tier.
 */
export interface TriageInput {
  prompt: string;
  config: RouterConfig;
  /** Credential for the triage provider. Required only for LLM fallback. */
  triageCredential?: Credential | null;
  signal?: AbortSignal;
}

export async function triage(input: TriageInput): Promise<TriageVerdict> {
  const signals = extractSignals(input.prompt);
  const match = matchHeuristics(signals, input.config);
  if (match) {
    return buildHeuristicVerdict(match, signals);
  }

  if (!input.triageCredential) {
    // No credential and no heuristic match → safe fallback: default tier
    // with low confidence so the TUI can warn the user.
    return {
      complexity: "moderate",
      confidence: 0.3,
      reasoningDepth: 3,
      ambiguity: 3,
      requiresCodebaseExploration: false,
      requiresMultiFileEdits: false,
      rationale:
        "No heuristic matched and no triage credential available; defaulting.",
      recommendedTier: input.config.defaultTier,
      source: "heuristic",
    };
  }

  const verdict = await runLlmTriage({
    prompt: input.prompt,
    config: input.config,
    credential: input.triageCredential,
    signal: input.signal,
  });

  if (verdict.confidence < input.config.triage.minConfidence) {
    // Low confidence → bump one tier up (toward more capability).
    return {
      ...verdict,
      recommendedTier: bumpTierName(
        verdict.recommendedTier,
        input.config,
      ),
      rationale: `${verdict.rationale} (Confidence ${verdict.confidence.toFixed(2)} below threshold; bumping up.)`,
    };
  }

  return verdict;
}

function bumpTierName(current: string, config: RouterConfig): string {
  const tiers = Object.keys(config.tiers);
  const idx = tiers.indexOf(current);
  if (idx === -1 || idx === tiers.length - 1) return current;
  return tiers[idx + 1] ?? current;
}
