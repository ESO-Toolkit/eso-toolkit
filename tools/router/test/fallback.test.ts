import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import { MemoryCredentialStore } from "../src/credentials/memory-store.js";
import { Dispatcher } from "../src/dispatch/dispatcher.js";
import { PreflightCache } from "../src/dispatch/preflight.js";
import { JsonlLogger } from "../src/telemetry/jsonl-logger.js";
import { buildEnvelope } from "../src/triage/envelope.js";
import type {
  Credential,
  DispatchEvent,
  DispatchRequest,
  ProbeResult,
  Provider,
  TriageVerdict,
} from "../src/types.js";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Fake Provider that lets tests script both probe outcomes and dispatch
 * behavior. Used to verify fallback chain walking without real API calls.
 */
class FakeProvider implements Provider {
  readonly authStrategy = "api-key" as const;
  probeResults: ProbeResult[] = [];
  dispatched: string[] = [];

  constructor(
    readonly id: string,
    readonly displayName: string = id,
  ) {}

  async *login(): AsyncIterable<never> {
    // not used in these tests
  }

  async probe(): Promise<ProbeResult> {
    const next = this.probeResults.shift();
    return next ?? { ok: true, checkedAt: Date.now() };
  }

  async dispatch(
    req: DispatchRequest,
    _credential: Credential,
  ): Promise<void> {
    this.dispatched.push(req.envelope.triage.model);
    req.onEvent({ type: "worker_start", model: req.envelope.triage.model });
    req.onEvent({
      type: "worker_done",
      digest: `ok from ${this.id}`,
      status: "success",
    });
  }
}

async function tempLogger(): Promise<JsonlLogger> {
  const dir = await mkdtemp(join(tmpdir(), "router-log-"));
  return new JsonlLogger(join(dir, "log.jsonl"));
}

const verdict: TriageVerdict = {
  complexity: "complex",
  confidence: 0.9,
  reasoningDepth: 5,
  ambiguity: 3,
  requiresCodebaseExploration: true,
  requiresMultiFileEdits: true,
  rationale: "t",
  recommendedTier: "deep",
  source: "llm",
};

describe("fallback chain", () => {
  it("falls back to the next tier when preflight fails", async () => {
    const config = RouterConfigSchema.parse({
      tiers: {
        default: { provider: "primary", model: "m-default", maxTokens: 10000 },
        deep: { provider: "primary", model: "m-deep", maxTokens: 100000 },
      },
      providers: {
        primary: { kind: "anthropic-api" },
      },
      fallback: { deep: ["default"] },
    });

    const primary = new FakeProvider("primary");
    // Fail the first probe (deep), succeed the second (default).
    primary.probeResults = [
      { ok: false, reason: "entitlement_denied", checkedAt: Date.now() },
      { ok: true, checkedAt: Date.now() },
    ];

    const store = new MemoryCredentialStore();
    await store.set("primary", {
      providerId: "primary",
      kind: "api-key",
      secret: "sk-test",
    });

    const cache = new PreflightCache(join(tmpdir(), "rt-cache.json"));
    const logger = await tempLogger();

    const dispatcher = new Dispatcher({
      config,
      providers: new Map([["primary", primary]]),
      store,
      cache,
      logger,
      downgradePolicy: "auto",
    });

    const env = buildEnvelope({ prompt: "hard task", config, verdict });
    const events: DispatchEvent[] = [];
    await dispatcher.run({
      envelope: env,
      signal: new AbortController().signal,
      onEvent: (e) => {
        if (e.type === "dispatch_event") events.push(e.event);
      },
    });

    // The fallback should have dispatched m-default.
    assert.ok(primary.dispatched.includes("m-default"));
  });

  it("surfaces error when downgradePolicy is never", async () => {
    const config = RouterConfigSchema.parse({
      tiers: {
        default: { provider: "p", model: "m-default" },
        deep: { provider: "p", model: "m-deep" },
      },
      providers: { p: { kind: "anthropic-api" } },
      fallback: { deep: ["default"] },
    });

    const provider = new FakeProvider("p");
    provider.probeResults = [
      { ok: false, reason: "entitlement_denied", checkedAt: Date.now() },
    ];

    const store = new MemoryCredentialStore();
    await store.set("p", {
      providerId: "p",
      kind: "api-key",
      secret: "sk",
    });
    const cache = new PreflightCache(join(tmpdir(), "rt-cache2.json"));
    const logger = await tempLogger();

    const dispatcher = new Dispatcher({
      config,
      providers: new Map([["p", provider]]),
      store,
      cache,
      logger,
      downgradePolicy: "never",
    });

    const env = buildEnvelope({ prompt: "x", config, verdict });
    await assert.rejects(
      () =>
        dispatcher.run({
          envelope: env,
          signal: new AbortController().signal,
          onEvent: () => {},
        }),
      /entitlement_denied|Preflight failed/,
    );
  });
});
