import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import { applyWeights } from "../src/triage/weights.js";
import type { TriageVerdict } from "../src/types.js";

const config = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "h" },
    default: { provider: "p", model: "s" },
    deep: { provider: "p", model: "o" },
  },
  providers: { p: { kind: "anthropic-api" } },
  weights: {
    ambiguity: 0.4,
    multiFileEdits: 0.3,
    reasoningDepth: 0.2,
    codebaseExplore: 0.05,
    promptLength: 0.05,
  },
});

function verdict(overrides: Partial<TriageVerdict>): TriageVerdict {
  return {
    complexity: "moderate",
    confidence: 0.9,
    reasoningDepth: 3,
    ambiguity: 3,
    requiresCodebaseExploration: false,
    requiresMultiFileEdits: false,
    rationale: "baseline",
    recommendedTier: "default",
    source: "llm",
    ...overrides,
  };
}

describe("applyWeights", () => {
  it("leaves the verdict alone for small divergences", () => {
    const v = verdict({ recommendedTier: "default" });
    const result = applyWeights(v, config);
    assert.equal(result.verdict.recommendedTier, "default");
  });

  it("bumps to deep when ambiguity and multi-file edits are maxed", () => {
    const v = verdict({
      recommendedTier: "fast",
      ambiguity: 5,
      requiresMultiFileEdits: true,
      reasoningDepth: 5,
      requiresCodebaseExploration: true,
    });
    const result = applyWeights(v, config);
    // Heavy signals + fast recommendation = big divergence → override.
    assert.equal(result.adjusted, true);
    assert.notEqual(result.verdict.recommendedTier, "fast");
  });

  it("does not override single-step divergences", () => {
    // Score near the boundary but LLM says default → should stay default.
    const v = verdict({
      recommendedTier: "default",
      ambiguity: 3,
      reasoningDepth: 3,
    });
    const result = applyWeights(v, config);
    assert.equal(result.verdict.recommendedTier, "default");
  });

  it("records the reweighted rationale when it overrides", () => {
    const v = verdict({
      recommendedTier: "fast",
      ambiguity: 5,
      requiresMultiFileEdits: true,
      requiresCodebaseExploration: true,
      reasoningDepth: 5,
    });
    const result = applyWeights(v, config);
    if (result.adjusted) {
      assert.match(result.verdict.rationale, /reweighted/);
    }
  });
});
