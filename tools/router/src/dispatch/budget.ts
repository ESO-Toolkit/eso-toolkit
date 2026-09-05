import type { RouterConfig } from "../config/schema.js";
import type { BudgetState, DispatchEvent } from "../types.js";

/**
 * Per-session budget tracker. Observes DispatchEvents and maintains running
 * totals for tokens, tool calls, and estimated USD cost. Also exposes a
 * `shouldEscalate()` predicate the controller calls after each event.
 */

// Rough USD per 1M tokens. Keep this conservative and user-overridable.
const DEFAULT_COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
};

export class BudgetTracker {
  readonly state: BudgetState = {
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    usd: 0,
    escalations: 0,
    startedAt: Date.now(),
  };

  constructor(
    private readonly config: RouterConfig,
    private readonly costTable: Record<
      string,
      { input: number; output: number }
    > = DEFAULT_COST_TABLE,
  ) {}

  observe(event: DispatchEvent, model: string): void {
    switch (event.type) {
      case "tool_call":
        this.state.toolCalls += 1;
        break;
      case "token_usage":
        this.state.inputTokens += event.inputTokens;
        this.state.outputTokens += event.outputTokens;
        this.state.usd += this.estimateCost(
          model,
          event.inputTokens,
          event.outputTokens,
        );
        break;
      case "escalation_requested":
        this.state.escalations += 1;
        break;
    }
  }

  /**
   * Returns a reason string if a hard cap has been exceeded. Callers treat
   * a non-null return as a trigger to abort or escalate.
   */
  exceeded(): string | null {
    const task = this.config.budgets.perTask;
    if (task?.toolCalls && this.state.toolCalls > task.toolCalls) {
      return `tool call cap exceeded (${this.state.toolCalls}/${task.toolCalls})`;
    }
    if (
      task?.tokens &&
      this.state.inputTokens + this.state.outputTokens > task.tokens
    ) {
      return `token cap exceeded`;
    }
    if (task?.usd && this.state.usd > task.usd) {
      return `USD cap exceeded ($${this.state.usd.toFixed(4)}/$${task.usd})`;
    }
    const session = this.config.budgets.perSession;
    if (session?.usd && this.state.usd > session.usd) {
      return `session USD cap exceeded`;
    }
    return null;
  }

  private estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const row = this.costTable[model];
    if (!row) return 0;
    return (
      (inputTokens * row.input) / 1_000_000 +
      (outputTokens * row.output) / 1_000_000
    );
  }
}
