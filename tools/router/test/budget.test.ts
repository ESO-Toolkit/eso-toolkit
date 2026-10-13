import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import { BudgetTracker } from "../src/dispatch/budget.js";

const config = RouterConfigSchema.parse({
  tiers: { default: { provider: "p", model: "claude-sonnet-4-6" } },
  providers: { p: { kind: "anthropic-api" } },
  budgets: {
    perTask: { usd: 0.01, toolCalls: 2 },
  },
});

describe("BudgetTracker", () => {
  it("accumulates tokens and computes cost", () => {
    const t = new BudgetTracker(config);
    t.observe(
      { type: "token_usage", inputTokens: 1000, outputTokens: 1000 },
      "claude-sonnet-4-6",
    );
    assert.equal(t.state.inputTokens, 1000);
    assert.equal(t.state.outputTokens, 1000);
    assert.ok(t.state.usd > 0);
  });

  it("counts tool calls", () => {
    const t = new BudgetTracker(config);
    t.observe({ type: "tool_call", name: "read", input: {} }, "m");
    t.observe({ type: "tool_call", name: "read", input: {} }, "m");
    assert.equal(t.state.toolCalls, 2);
  });

  it("reports exceedance when caps are blown", () => {
    const t = new BudgetTracker(config);
    t.observe({ type: "tool_call", name: "x", input: {} }, "m");
    t.observe({ type: "tool_call", name: "x", input: {} }, "m");
    t.observe({ type: "tool_call", name: "x", input: {} }, "m");
    assert.match(t.exceeded() ?? "", /tool call cap/);
  });

  it("returns null when within caps", () => {
    const t = new BudgetTracker(config);
    t.observe({ type: "tool_call", name: "x", input: {} }, "m");
    assert.equal(t.exceeded(), null);
  });
});
