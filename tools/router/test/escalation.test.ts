import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import { EscalationController } from "../src/dispatch/escalation.js";
import { buildEnvelope } from "../src/triage/envelope.js";
import type { TriageVerdict } from "../src/types.js";

const config = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "m1" },
    default: { provider: "p", model: "m2" },
  },
  providers: { p: { kind: "anthropic-api" } },
  escalation: {
    enabled: true,
    triggers: {
      validationFailures: 2,
      toolLoopThreshold: 3,
      selfDoubt: true,
    },
    maxBumps: 2,
  },
});

const verdict: TriageVerdict = {
  complexity: "simple",
  confidence: 0.9,
  reasoningDepth: 1,
  ambiguity: 1,
  requiresCodebaseExploration: false,
  requiresMultiFileEdits: false,
  rationale: "t",
  recommendedTier: "fast",
  source: "heuristic",
};

describe("EscalationController", () => {
  it("fires on self-doubt signal", () => {
    const env = buildEnvelope({ prompt: "x", config, verdict });
    let fired: { reason: string; digest: string } | null = null;
    const ctrl = new EscalationController(config, env, (t) => {
      fired = t;
    });
    ctrl.observe({
      type: "escalation_requested",
      reason: "self_doubt",
      digest: "help",
    });
    assert.ok(fired);
    assert.equal((fired as { reason: string }).reason, "self_doubt");
  });

  it("fires after repeated validation failures", () => {
    const env = buildEnvelope({ prompt: "x", config, verdict });
    let count = 0;
    const ctrl = new EscalationController(config, env, () => {
      count += 1;
    });
    ctrl.observe({ type: "tool_result", name: "validate", ok: false });
    assert.equal(count, 0);
    ctrl.observe({ type: "tool_result", name: "validate", ok: false });
    assert.equal(count, 1);
  });

  it("fires only once even after repeat triggers", () => {
    const env = buildEnvelope({ prompt: "x", config, verdict });
    let count = 0;
    const ctrl = new EscalationController(config, env, () => {
      count += 1;
    });
    ctrl.observe({
      type: "escalation_requested",
      reason: "self_doubt",
      digest: "a",
    });
    ctrl.observe({
      type: "escalation_requested",
      reason: "self_doubt",
      digest: "b",
    });
    assert.equal(count, 1);
  });

  it("detects tool loops", () => {
    const env = buildEnvelope({ prompt: "x", config, verdict });
    let fired = false;
    const ctrl = new EscalationController(config, env, () => {
      fired = true;
    });
    for (let i = 0; i < 3; i++) {
      ctrl.observe({ type: "tool_call", name: "read", input: { path: "x" } });
    }
    assert.equal(fired, true);
  });

  it("respects disabled escalation", () => {
    const disabled = RouterConfigSchema.parse({
      ...config,
      escalation: { ...config.escalation, enabled: false },
    });
    const env = buildEnvelope({ prompt: "x", config: disabled, verdict });
    let fired = false;
    const ctrl = new EscalationController(disabled, env, () => {
      fired = true;
    });
    ctrl.observe({
      type: "escalation_requested",
      reason: "self_doubt",
      digest: "a",
    });
    assert.equal(fired, false);
  });
});
