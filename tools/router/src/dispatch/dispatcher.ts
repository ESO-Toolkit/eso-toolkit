import type { RouterConfig } from "../config/schema.js";
import type { CredentialStore } from "../credentials/store.js";
import type { JsonlLogger } from "../telemetry/jsonl-logger.js";
import { escalateEnvelope } from "../triage/envelope.js";
import {
  AuthError,
  RouterError,
  type DispatchEvent,
  type EscalationReason,
  type Provider,
  type TaskEnvelope,
} from "../types.js";
import { BudgetTracker } from "./budget.js";
import { EscalationController } from "./escalation.js";
import { PreflightCache, preflight } from "./preflight.js";

/**
 * Top-level dispatcher. Orchestrates the full lifecycle of a single task:
 *
 *   1. Preflight the chosen (provider, model) to verify entitlement.
 *   2. If preflight fails → surface a typed error up to the TUI for handling.
 *   3. Otherwise, start the provider's dispatch() and forward events.
 *   4. Watch for escalation triggers; if one fires, cancel the current worker,
 *      mint an escalated envelope, and respawn recursively.
 *   5. Log every envelope + outcome to JSONL for rubric tuning.
 *
 * The dispatcher is intentionally decoupled from the TUI — it takes an
 * onEvent callback and pushes events out. The TUI renders them, but the
 * dispatcher could equally well be driven from a headless CLI run.
 */

export interface DispatcherDeps {
  config: RouterConfig;
  providers: Map<string, Provider>;
  store: CredentialStore;
  cache: PreflightCache;
  logger: JsonlLogger;
}

export interface DispatchInput {
  envelope: TaskEnvelope;
  signal: AbortSignal;
  onEvent: (event: DispatcherEvent) => void;
}

export type DispatcherEvent =
  | { type: "envelope"; envelope: TaskEnvelope }
  | { type: "preflight_failed"; envelope: TaskEnvelope; reason: string }
  | { type: "dispatch_event"; envelope: TaskEnvelope; event: DispatchEvent }
  | { type: "budget_update"; tracker: BudgetTracker }
  | {
      type: "escalating";
      from: TaskEnvelope;
      reason: EscalationReason;
      digest: string;
    }
  | {
      type: "done";
      envelope: TaskEnvelope;
      status: "success" | "failure" | "aborted";
      digest: string;
    };

export class Dispatcher {
  private readonly tracker: BudgetTracker;

  constructor(private readonly deps: DispatcherDeps) {
    this.tracker = new BudgetTracker(deps.config);
  }

  get budget(): BudgetTracker {
    return this.tracker;
  }

  async run(input: DispatchInput): Promise<void> {
    await this.runInternal(input.envelope, input.signal, input.onEvent);
  }

  private async runInternal(
    envelope: TaskEnvelope,
    parentSignal: AbortSignal,
    onEvent: (e: DispatcherEvent) => void,
  ): Promise<void> {
    onEvent({ type: "envelope", envelope });
    this.deps.logger.log({
      kind: "envelope",
      envelopeId: envelope.id,
      tier: envelope.triage.tier,
      provider: envelope.triage.provider,
      model: envelope.triage.model,
      complexity: envelope.triage.complexity,
      confidence: envelope.triage.confidence,
      source: envelope.triage.source,
      escalated: Boolean(envelope.escalation),
    });

    const provider = this.deps.providers.get(envelope.triage.provider);
    if (!provider) {
      throw new RouterError(
        `Provider "${envelope.triage.provider}" is not instantiated.`,
        "PROVIDER_MISSING",
      );
    }

    // -- Preflight -----------------------------------------------------------
    const pre = await preflight({
      provider,
      model: envelope.triage.model,
      store: this.deps.store,
      cache: this.deps.cache,
    });
    if (!pre.result.ok) {
      onEvent({
        type: "preflight_failed",
        envelope,
        reason: pre.result.message ?? pre.result.reason ?? "unknown",
      });
      this.deps.logger.log({
        kind: "preflight_failed",
        envelopeId: envelope.id,
        reason: pre.result.reason,
        message: pre.result.message,
      });
      throw new AuthError(
        pre.result.message ?? "Preflight failed.",
        pre.result.reason ?? "unknown",
        { provider: provider.id, model: envelope.triage.model },
      );
    }

    const credential = await this.deps.store.get(provider.id);
    if (!credential) {
      // Should be caught by preflight, but defensive.
      throw new AuthError(
        `Credential disappeared between preflight and dispatch.`,
        "missing_credential",
      );
    }

    // -- Escalation wiring ---------------------------------------------------
    const escalationPromise = this.setupEscalation(envelope);
    const controller = new AbortController();
    const forwarded = () => controller.abort();
    parentSignal.addEventListener("abort", forwarded, { once: true });

    // -- Dispatch ------------------------------------------------------------
    let finalDigest = "";
    let finalStatus: "success" | "failure" | "aborted" = "success";

    try {
      await provider.dispatch(
        {
          envelope,
          signal: controller.signal,
          onEvent: (event) => {
            this.tracker.observe(event, envelope.triage.model);
            escalationPromise.controller.observe(event);
            onEvent({ type: "dispatch_event", envelope, event });
            onEvent({ type: "budget_update", tracker: this.tracker });

            if (event.type === "worker_done") {
              finalDigest = event.digest;
              finalStatus = event.status;
            }

            const exceeded = this.tracker.exceeded();
            if (exceeded) {
              escalationPromise.controller.triggerManually(
                "budget_exceeded",
                `Budget exceeded: ${exceeded}`,
              );
            }
          },
        },
        credential,
      );
    } catch (err) {
      if (controller.signal.aborted) {
        finalStatus = "aborted";
      } else {
        finalStatus = "failure";
        finalDigest =
          err instanceof Error ? err.message : String(err);
      }
    } finally {
      parentSignal.removeEventListener("abort", forwarded);
    }

    // -- Handle escalation (if triggered mid-dispatch) -----------------------
    const escalation = await Promise.race([
      escalationPromise.promise,
      Promise.resolve(null),
    ]);

    if (escalation) {
      // Cancel current worker if still running.
      controller.abort();

      try {
        const next = escalateEnvelope(
          envelope,
          this.deps.config,
          escalation.reason,
          escalation.digest,
        );
        onEvent({
          type: "escalating",
          from: envelope,
          reason: escalation.reason,
          digest: escalation.digest,
        });
        this.deps.logger.log({
          kind: "escalation",
          fromEnvelope: envelope.id,
          toEnvelope: next.id,
          reason: escalation.reason,
          bumpCount: next.escalation?.bumpCount,
        });
        return this.runInternal(next, parentSignal, onEvent);
      } catch (err) {
        // Escalation cap hit — surface as a done event with failure status.
        finalStatus = "failure";
        finalDigest =
          err instanceof Error ? err.message : "Escalation failed.";
      }
    }

    onEvent({
      type: "done",
      envelope,
      status: finalStatus,
      digest: finalDigest,
    });
    this.deps.logger.log({
      kind: "done",
      envelopeId: envelope.id,
      status: finalStatus,
      budget: this.tracker.state,
    });
  }

  /**
   * Set up an escalation controller that resolves a promise when any trigger
   * fires. The dispatcher awaits this promise after provider.dispatch returns
   * (or races it if the provider is still running). Keeping it promise-based
   * lets us express "stop the worker when escalation fires" cleanly.
   */
  private setupEscalation(envelope: TaskEnvelope): {
    controller: EscalationController;
    promise: Promise<{ reason: EscalationReason; digest: string } | null>;
  } {
    let resolve!: (
      value: { reason: EscalationReason; digest: string } | null,
    ) => void;
    const promise = new Promise<
      { reason: EscalationReason; digest: string } | null
    >((r) => {
      resolve = r;
    });
    const controller = new EscalationController(
      this.deps.config,
      envelope,
      (trigger) => resolve(trigger),
    );
    // Auto-resolve null if nothing fires by the time dispatch exits normally.
    // The race() call in runInternal ensures we don't block forever.
    return { controller, promise };
  }
}
