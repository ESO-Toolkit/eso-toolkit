import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import {
  buildHeuristicVerdict,
  extractSignals,
  matchHeuristics,
} from "../src/triage/heuristics.js";

const baseConfig = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "m-fast" },
    default: { provider: "p", model: "m-default" },
    deep: { provider: "p", model: "m-deep" },
  },
  providers: { p: { kind: "anthropic-api" } },
  heuristics: [
    {
      name: "trivial-reads",
      when: { promptTokens: { lt: 50 }, verbClass: "read" },
      tier: "fast",
    },
    {
      name: "design-keywords",
      when: { keywords: ["refactor", "architecture"] },
      tier: "deep",
    },
  ],
});

describe("extractSignals", () => {
  it("classifies verbs from the leading word", () => {
    assert.equal(extractSignals("explain this function").verbClass, "read");
    assert.equal(extractSignals("add a new field").verbClass, "write");
    assert.equal(
      extractSignals("refactor the worker pool").verbClass,
      "design",
    );
  });

  it("design wins over write when both present", () => {
    const s = extractSignals("add support and refactor the architecture");
    assert.equal(s.verbClass, "design");
  });

  it("detects multi-step markers", () => {
    assert.equal(
      extractSignals("first do A, then do B").hasMultiStepMarkers,
      true,
    );
    assert.equal(extractSignals("just fix this bug").hasMultiStepMarkers, false);
  });

  it("estimates prompt tokens by character count", () => {
    const s = extractSignals("abcd");
    assert.equal(s.promptTokens, 1);
  });

  it("extracts lowercase keywords without duplicates", () => {
    const s = extractSignals("Refactor the REFACTOR refactor");
    assert.equal(s.keywords.filter((k) => k === "refactor").length, 1);
  });
});

describe("matchHeuristics", () => {
  it("matches the first applicable rule in order", () => {
    const signals = extractSignals("explain this");
    const match = matchHeuristics(signals, baseConfig);
    assert.ok(match, "expected a match");
    assert.equal(match.tier, "fast");
  });

  it("matches design keyword rules", () => {
    const signals = extractSignals("please refactor the worker pool");
    const match = matchHeuristics(signals, baseConfig);
    assert.ok(match);
    assert.equal(match.tier, "deep");
  });

  it("returns null when nothing matches", () => {
    const signals = extractSignals(
      "do something moderately complicated that does not mention the trigger words " +
        "a b c d e f g h i j k l m n o p q r s t u v w x y z".repeat(3),
    );
    assert.equal(matchHeuristics(signals, baseConfig), null);
  });
});

describe("buildHeuristicVerdict", () => {
  it("preserves the matched tier and cites the rule name", () => {
    const signals = extractSignals("refactor the architecture");
    const match = matchHeuristics(signals, baseConfig);
    assert.ok(match);
    const verdict = buildHeuristicVerdict(match, signals);
    assert.equal(verdict.recommendedTier, "deep");
    assert.equal(verdict.source, "heuristic");
    assert.match(verdict.rationale, /design-keywords/);
  });
});
