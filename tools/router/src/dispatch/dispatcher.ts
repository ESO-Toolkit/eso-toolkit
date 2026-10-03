import type { RouterConfig } from "../config/schema.js";
import type { CredentialStore } from "../credentials/store.js";
import type { JsonlLogger } from "../telemetry/jsonl-logger.js";
import type { ToolRegistry } from "../tools/index.js";
import { escalateEnvelope } from "../triage/envelope.js";
import {
  AuthError,
  RouterError,
  type DispatchEvent,
  type EscalationReason,
  type Provider,
  type TaskEnvelope,
  type ToolSpec,
} from "../types.js";
import { BudgetTracker } from "./budget.js";
import { EscalationController } from "./escalation.js";
import { runHook } from "./hooks.js";
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
  tools?: ToolRegistry;
  /**
   * Optional policy hook. When non-null, controls whether the dispatcher is
   * allowed to downgrade a task on preflight failure. CI mode sets this to
   * "never" so auth errors become hard failures instead of silent downgrades.
   */
  downgradePolicy?: "auto" | "never" | "ask";
  /**
   * When set, forces the dispatcher to use this exact tier name, ignoring
   * triage. Used by `router run --tier <name>`.
   */
  forcedTier?: string;
  /**
   * Per-task cap on how many times consult_expert can fire. Defaults to 5.
   * Hard cap to keep cheap-shell workers from running away with consultation
   * cost. Independent of the broader budget caps in config.
   */
  maxConsultationsPerTask?: number;
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
  /** Per-root-task consultation counts, keyed by root envelope id. */
  private readonly consultationCounts = new Map<string, number>();

  constructor(private readonly deps: DispatcherDeps) {
    this.tracker = new BudgetTracker(deps.config);
  }

  get budget(): BudgetTracker {
    return this.tracker;
  }

  async run(input: DispatchInput): Promise<void> {
    await this.runInternal(input.envelope, input.signal, input.onEvent);
  }

  /**
   * Borrow expertise from a higher-tier model for a single self-contained
   * question. Runs as a one-shot worker with NO tools and NO escalation —
   * pure reasoning that returns a digest. Cost rolls into the parent task's
   * BudgetTracker.
   *
   * Throws if the consultation cap for the parent root task has been reached.
   */
  async consult(
    parent: TaskEnvelope,
    question: string,
    tierName?: string,
    parentSignal?: AbortSignal,
  ): Promise<{ digest: string; cost: number }> {
    const rootId = parent.parentEnvelopeId ?? parent.id;
    const cap = this.deps.maxConsultationsPerTask ?? 5;
    const current = this.consultationCounts.get(rootId) ?? 0;
    if (current >= cap) {
      throw new RouterError(
        `Consultation cap reached for this task (${cap}). The cheap shell is consulting too aggressively — refine its prompt or raise maxConsultationsPerTask.`,
        "CONSULTATION_CAP",
      );
    }
    this.consultationCounts.set(rootId, current + 1);

    const targetTier = tierName ?? this.bumpTierName(parent.triage.tier);
    const tier = this.deps.config.tiers[targetTier];
    if (!tier) {
      throw new RouterError(
        `Consultation tier "${targetTier}" is not defined in config.`,
        "TIER_UNKNOWN",
      );
    }

    const consultationEnvelope: TaskEnvelope = {
      id: `${parent.id}-c${current + 1}`,
      createdAt: new Date().toISOString(),
      parentSessionId: parent.parentSessionId,
      parentEnvelopeId: rootId,
      decompositionMode: "consultation",
      goal: `Expert consultation: ${question.slice(0, 80)}`,
      originalPrompt: question,
      triage: {
        ...parent.triage,
        tier: targetTier,
        provider: tier.provider,
        model: tier.model,
        source: "user-override",
        rationale: `Consultation requested by ${parent.triage.tier} worker`,
      },
      context: { files: [], constraints: ["pure-reasoning", "no-tools"] },
      budget: {
        maxTokens: tier.maxTokens ?? 2048,
        escalationAllowed: false,
      },
    };

    return this.runOneShot(consultationEnvelope, parentSignal);
  }

  /**
   * Spawn a child sub-task envelope as a full autonomous worker. Unlike
   * consultation, the sub-task can use tools, has its own escalation budget,
   * and runs to completion. Used by planner/executor patterns where an
   * expensive planner parcels out work to cheaper executors.
   */
  async delegate(
    parent: TaskEnvelope,
    prompt: string,
    tierName?: string,
    parentSignal?: AbortSignal,
  ): Promise<{ digest: string; status: "success" | "failure"; cost: number }> {
    const rootId = parent.parentEnvelopeId ?? parent.id;
    const targetTier =
      tierName ?? this.dropTierName(parent.triage.tier);
    const tier = this.deps.config.tiers[targetTier];
    if (!tier) {
      throw new RouterError(
        `Delegation tier "${targetTier}" is not defined in config.`,
        "TIER_UNKNOWN",
      );
    }

    const subtaskEnvelope: TaskEnvelope = {
      id: `${parent.id}-d-${Date.now()}`,
      createdAt: new Date().toISOString(),
      parentEnvelopeId: rootId,
      decompositionMode: "delegation",
      goal: prompt.split("\n")[0]?.slice(0, 120) ?? "delegated subtask",
      originalPrompt: prompt,
      triage: {
        ...parent.triage,
        tier: targetTier,
        provider: tier.provider,
        model: tier.model,
        source: "user-override",
        rationale: `Delegated by ${parent.triage.tier} worker`,
      },
      context: { files: [], constraints: [] },
      budget: {
        maxTokens: tier.maxTokens,
        escalationAllowed: true,
      },
    };

    const startUsd = this.tracker.state.usd;
    let digest = "";
    let status: "success" | "failure" = "success";
    try {
      await this.runInternal(
        subtaskEnvelope,
        parentSignal ?? new AbortController().signal,
        (event) => {
          if (event.type === "done") {
            digest = event.digest;
            status = event.status === "success" ? "success" : "failure";
          }
        },
      );
    } catch (err) {
      status = "failure";
      digest = err instanceof Error ? err.message : String(err);
    }
    return { digest, status, cost: this.tracker.state.usd - startUsd };
  }

  /**
   * Run a one-shot envelope (consultation form): no tools, no escalation,
   * single provider.dispatch call. Returns the final assistant text and the
   * incremental cost.
   */
  private async runOneShot(
    envelope: TaskEnvelope,
    parentSignal?: AbortSignal,
  ): Promise<{ digest: string; cost: number }> {
    const provider = this.deps.providers.get(envelope.triage.provider);
    if (!provider) {
      throw new RouterError(
        `Provider "${envelope.triage.provider}" not instantiated.`,
        "PROVIDER_MISSING",
      );
    }
    const credential = await this.deps.store.get(provider.id);
    if (!credential) {
      throw new AuthError(
        `No credential for provider "${provider.id}".`,
        "missing_credential",
      );
    }

    this.deps.logger.log({
      kind: "consultation",
      envelopeId: envelope.id,
      parentEnvelopeId: envelope.parentEnvelopeId,
      tier: envelope.triage.tier,
      model: envelope.triage.model,
    });

    const startUsd = this.tracker.state.usd;
    const controller = new AbortController();
    const fwd = () => controller.abort();
    parentSignal?.addEventListener("abort", fwd, { once: true });

    let digest = "";
    try {
      await provider.dispatch(
        {
          envelope,
          signal: controller.signal,
          // Deliberately no tools and no executeTool — consultation is
          // pure reasoning. The provider will return after one round.
          onEvent: (event) => {
            this.tracker.observe(event, envelope.triage.model);
            if (event.type === "worker_done") {
              digest = event.digest;
            }
          },
        },
        credential,
      );
    } finally {
      parentSignal?.removeEventListener("abort", fwd);
    }

    const cost = this.tracker.state.usd - startUsd;
    this.deps.logger.log({
      kind: "consultation_done",
      envelopeId: envelope.id,
      cost,
      digestLength: digest.length,
    });
    return { digest, cost };
  }

  private bumpTierName(current: string): string {
    const tiers = Object.keys(this.deps.config.tiers);
    const idx = tiers.indexOf(current);
    if (idx === -1 || idx === tiers.length - 1) return current;
    return tiers[idx + 1] ?? current;
  }

  private dropTierName(current: string): string {
    const tiers = Object.keys(this.deps.config.tiers);
    const idx = tiers.indexOf(current);
    if (idx <= 0) return current;
    return tiers[idx - 1] ?? current;
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

      // Try the fallback chain for this tier before surfacing the error.
      const fallback = await this.tryFallback(envelope, parentSignal, onEvent);
      if (fallback) return;

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

    // Snapshot the tool registry so mutations mid-worker don't leak between
    // dispatches. Build ToolSpecs to hand to the provider.
    const toolRegistry = this.deps.tools?.snapshot();
    const toolSpecs: ToolSpec[] | undefined = toolRegistry
      ? toolRegistry.list().map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }))
      : undefined;

    const executeTool = toolRegistry
      ? async (
          name: string,
          input: unknown,
        ): Promise<{ content: string; isError?: boolean }> => {
          const tool = toolRegistry.get(name);
          if (!tool) {
            return { isError: true, content: `Unknown tool: ${name}` };
          }
          const result = await tool.execute(input, {
            cwd: process.cwd(),
            signal: controller.signal,
            config: this.deps.config,
            requestEscalation: (reason, digest) => {
              escalationPromise.controller.triggerManually(reason, digest);
            },
            // Wire consult/delegate so worker tools can call back into the
            // dispatcher. The current envelope is the parent for any
            // child envelopes spawned during this turn.
            consultExpert: (question, tier) =>
              this.consult(envelope, question, tier, controller.signal),
            delegateSubtask: (prompt, tier) =>
              this.delegate(envelope, prompt, tier, controller.signal),
          });
          return result;
        }
      : undefined;

    try {
      await provider.dispatch(
        {
          envelope,
          signal: controller.signal,
          tools: toolSpecs,
          executeTool,
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
        if (this.deps.config.hooks.onEscalation) {
          try {
            await runHook(this.deps.config.hooks.onEscalation, {
              event: "onEscalation",
              from: envelope,
              to: next,
              reason: escalation.reason,
              digest: escalation.digest,
            });
          } catch (err) {
            this.deps.logger.log({
              kind: "hook_error",
              hook: "onEscalation",
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
        return this.runInternal(next, parentSignal, onEvent);
      } catch (err) {
        // Escalation cap hit — surface as a done event with failure status.
        finalStatus = "failure";
        finalDigest =
          err instanceof Error ? err.message : "Escalation failed.";
      }
    }

    // Fire the afterDispatch hook. Best-effort; hook errors are logged but
    // never propagate — the dispatcher's job is done at this point.
    if (this.deps.config.hooks.afterDispatch) {
      try {
        await runHook(this.deps.config.hooks.afterDispatch, {
          event: "afterDispatch",
          envelope,
          status: finalStatus,
          digest: finalDigest,
          budget: this.tracker.state,
        });
      } catch (err) {
        this.deps.logger.log({
          kind: "hook_error",
          hook: "afterDispatch",
          message: err instanceof Error ? err.message : String(err),
        });
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
   * Walk `config.fallback[envelope.triage.tier]` trying each entry until one
   * passes preflight. Returns true if a fallback dispatched successfully
   * (caller should stop); false if no fallback was configured or none worked.
   *
   * Fallback entries are either:
   *   - a tier name (looked up in config.tiers)
   *   - a "provider:model" pair (built ad-hoc without a named tier)
   *
   * The downgradePolicy gates this behavior: "never" skips fallback entirely
   * (caller surfaces the auth error), "auto" walks the chain silently, "ask"
   * is treated as "auto" at the dispatcher level — the TUI handles prompting
   * before calling the dispatcher.
   */
  private async tryFallback(
    envelope: TaskEnvelope,
    parentSignal: AbortSignal,
    onEvent: (e: DispatcherEvent) => void,
  ): Promise<boolean> {
    if (this.deps.downgradePolicy === "never") return false;

    const chain = this.deps.config.fallback[envelope.triage.tier];
    if (!chain || chain.length === 0) return false;

    for (const entry of chain) {
      const fallbackTier = this.resolveFallbackEntry(entry);
      if (!fallbackTier) continue;

      const fallbackEnvelope: TaskEnvelope = {
        ...envelope,
        triage: {
          ...envelope.triage,
          tier: fallbackTier.tierName,
          provider: fallbackTier.provider,
          model: fallbackTier.model,
          rationale: `${envelope.triage.rationale} [fallback: ${entry}]`,
          source: "user-override",
        },
      };

      const provider = this.deps.providers.get(fallbackTier.provider);
      if (!provider) continue;
      const pre = await preflight({
        provider,
        model: fallbackTier.model,
        store: this.deps.store,
        cache: this.deps.cache,
      });
      if (!pre.result.ok) continue;

      this.deps.logger.log({
        kind: "fallback",
        fromEnvelope: envelope.id,
        toTier: fallbackTier.tierName,
        entry,
      });
      await this.runInternal(fallbackEnvelope, parentSignal, onEvent);
      return true;
    }
    return false;
  }

  private resolveFallbackEntry(
    entry: string,
  ): { tierName: string; provider: string; model: string } | null {
    // "provider:model" form bypasses named tiers entirely.
    if (entry.includes(":")) {
      const [provider, model] = entry.split(":", 2) as [string, string];
      return { tierName: `${provider}:${model}`, provider, model };
    }
    // Named tier form.
    const tier = this.deps.config.tiers[entry];
    if (!tier) return null;
    return { tierName: entry, provider: tier.provider, model: tier.model };
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
