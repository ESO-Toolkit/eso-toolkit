import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import {
  buildEnvelope,
  bumpTier,
  escalateEnvelope,
} from "../src/triage/envelope.js";
import type { TriageVerdict } from "../src/types.js";

const config = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "m-fast", maxTokens: 1000 },
    default: { provider: "p", model: "m-default", maxTokens: 10000 },
    deep: { provider: "p", model: "m-deep", maxTokens: 100000 },
  },
  providers: { p: { kind: "anthropic-api" } },
  escalation: { maxBumps: 2 },
});

const verdict: TriageVerdict = {
  complexity: "moderate",
  confidence: 0.8,
  reasoningDepth: 3,
  ambiguity: 2,
  requiresCodebaseExploration: false,
  requiresMultiFileEdits: false,
  rationale: "test",
  recommendedTier: "default",
  source: "heuristic",
};

describe("buildEnvelope", () => {
  it("resolves tier to provider and model", () => {
    const env = buildEnvelope({ prompt: "do a thing", config, verdict });
    assert.equal(env.triage.tier, "default");
    assert.equal(env.triage.provider, "p");
    assert.equal(env.triage.model, "m-default");
  });

  it("derives a goal from the first line of the prompt", () => {
    const env = buildEnvelope({
      prompt: "short goal\nlots of detail below",
      config,
      verdict,
    });
    assert.equal(env.goal, "short goal");
  });

  it("falls back to default tier when recommended tier is unknown", () => {
    const env = buildEnvelope({
      prompt: "x",
      config,
      verdict: { ...verdict, recommendedTier: "turbo" },
    });
    assert.equal(env.triage.tier, "default");
  });

  it("populates budget from tier maxTokens", () => {
    const env = buildEnvelope({ prompt: "x", config, verdict });
    assert.equal(env.budget.maxTokens, 10000);
  });
});

describe("bumpTier", () => {
  it("moves up one step in maxTokens order", () => {
    assert.equal(bumpTier("fast", config), "default");
    assert.equal(bumpTier("default", config), "deep");
  });
  it("returns null at the top", () => {
    assert.equal(bumpTier("deep", config), null);
  });
});

describe("escalateEnvelope", () => {
  it("mints a new envelope with the next tier and the prior digest", () => {
    const first = buildEnvelope({ prompt: "x", config, verdict });
    const next = escalateEnvelope(first, config, "self_doubt", "got stuck");
    assert.notEqual(next.id, first.id);
    assert.equal(next.triage.tier, "deep");
    assert.equal(next.escalation?.reason, "self_doubt");
    assert.equal(next.escalation?.bumpCount, 1);
    assert.equal(next.escalation?.priorAttemptDigest, "got stuck");
  });

  it("enforces the bump cap", () => {
    const first = buildEnvelope({
      prompt: "x",
      config,
      verdict: { ...verdict, recommendedTier: "fast" },
    });
    const second = escalateEnvelope(first, config, "self_doubt", "d1");
    const third = escalateEnvelope(second, config, "self_doubt", "d2");
    assert.equal(third.escalation?.bumpCount, 2);
    assert.throws(
      () => escalateEnvelope(third, config, "self_doubt", "d3"),
      /No higher tier|Escalation cap reached/,
    );
  });
});
