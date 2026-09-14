import type { RouterConfig } from "../config/schema.js";
import type {
  DispatchEvent,
  EscalationReason,
  TaskEnvelope,
} from "../types.js";

/**
 * Escalation controller. Watches dispatch events and decides whether the
 * current worker should be cancelled and respawned at a higher tier.
 *
 * Design: this class is pure state machine. It does NOT respawn workers
 * itself — it raises a signal (via the onTrigger callback) and leaves the
 * actual envelope-minting and re-dispatch to the top-level dispatcher.
 * Keeps cancellation ownership in one place.
 */

export interface EscalationTrigger {
  reason: EscalationReason;
  digest: string;
}

export class EscalationController {
  private validationFailures = 0;
  private recentTools: string[] = [];
  private fired = false;

  constructor(
    private readonly config: RouterConfig,
    private readonly envelope: TaskEnvelope,
    private readonly onTrigger: (trigger: EscalationTrigger) => void,
  ) {}

  /** Inspect a dispatch event; trigger escalation if a condition matches. */
  observe(event: DispatchEvent): void {
    if (this.fired) return;
    if (!this.config.escalation.enabled) return;
    if (!this.envelope.budget.escalationAllowed) return;

    const triggers = this.config.escalation.triggers;

    switch (event.type) {
      case "escalation_requested":
        if (triggers.selfDoubt) {
          this.trigger({ reason: event.reason, digest: event.digest });
        }
        break;
      case "tool_call":
        this.recentTools.push(JSON.stringify({ n: event.name, i: event.input }));
        if (this.recentTools.length > triggers.toolLoopThreshold) {
          this.recentTools.shift();
        }
        if (this.detectLoop(triggers.toolLoopThreshold)) {
          this.trigger({
            reason: "loop_detected",
            digest: `Detected tool loop: ${event.name} called ${triggers.toolLoopThreshold} times with identical arguments.`,
          });
        }
        break;
      case "tool_result":
        if (!event.ok && /test|validate/i.test(event.name)) {
          this.validationFailures += 1;
          if (this.validationFailures >= triggers.validationFailures) {
            this.trigger({
              reason: "validation_failed",
              digest: `Validation tool "${event.name}" failed ${this.validationFailures} times in a row.`,
            });
          }
        }
        break;
    }
  }

  /** External trigger (e.g. budget tracker says we blew the cap). */
  triggerManually(reason: EscalationReason, digest: string): void {
    if (this.fired) return;
    this.trigger({ reason, digest });
  }

  private detectLoop(threshold: number): boolean {
    if (this.recentTools.length < threshold) return false;
    const last = this.recentTools[this.recentTools.length - 1];
    return this.recentTools.every((t) => t === last);
  }

  private trigger(trigger: EscalationTrigger): void {
    this.fired = true;
    this.onTrigger(trigger);
  }
}
