import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";

describe("RouterConfigSchema", () => {
  it("accepts a minimal config and fills defaults", () => {
    const parsed = RouterConfigSchema.parse({
      tiers: {
        fast: { provider: "p", model: "m" },
        default: { provider: "p", model: "m" },
      },
      providers: { p: { kind: "anthropic-api" } },
    });
    assert.equal(parsed.defaultTier, "default");
    assert.equal(parsed.escalation.enabled, true);
    assert.equal(parsed.triage.minConfidence, 0.6);
    assert.deepEqual(parsed.heuristics, []);
  });

  it("rejects heuristic rules without a tier", () => {
    assert.throws(() =>
      RouterConfigSchema.parse({
        tiers: { default: { provider: "p", model: "m" } },
        providers: { p: { kind: "anthropic-api" } },
        heuristics: [{ when: {} }],
      }),
    );
  });

  it("preserves weights when fully specified", () => {
    const parsed = RouterConfigSchema.parse({
      tiers: { default: { provider: "p", model: "m" } },
      providers: { p: { kind: "anthropic-api" } },
      weights: {
        ambiguity: 0.5,
        multiFileEdits: 0.1,
        reasoningDepth: 0.1,
        codebaseExplore: 0.2,
        promptLength: 0.1,
      },
    });
    assert.equal(parsed.weights.ambiguity, 0.5);
  });
});
