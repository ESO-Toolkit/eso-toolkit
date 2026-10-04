import { strict as assert } from "node:assert";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { RouterConfigSchema } from "../src/config/schema.js";
import { MemoryCredentialStore } from "../src/credentials/memory-store.js";
import { Dispatcher } from "../src/dispatch/dispatcher.js";
import { PreflightCache } from "../src/dispatch/preflight.js";
import { JsonlLogger } from "../src/telemetry/jsonl-logger.js";
import { buildEnvelope } from "../src/triage/envelope.js";
import type {
  Credential,
  DispatchRequest,
  ProbeResult,
  Provider,
  TriageVerdict,
} from "../src/types.js";

/**
 * Scriptable provider that returns a fixed digest and reports a fixed token
 * usage. Used to verify the consult/delegate cost accounting without making
 * real API calls.
 */
class ScriptedProvider implements Provider {
  readonly authStrategy = "api-key" as const;
  digestForModel: Record<string, string> = {};
  inputTokensForModel: Record<string, number> = {};
  outputTokensForModel: Record<string, number> = {};
  consultsObserved = 0;

  constructor(
    readonly id: string,
    readonly displayName: string = id,
  ) {}

  async *login(): AsyncIterable<never> {}

  async probe(): Promise<ProbeResult> {
    return { ok: true, checkedAt: Date.now() };
  }

  async dispatch(req: DispatchRequest, _credential: Credential): Promise<void> {
    if (req.envelope.decompositionMode === "consultation") {
      this.consultsObserved += 1;
    }
    req.onEvent({ type: "worker_start", model: req.envelope.triage.model });
    req.onEvent({
      type: "token_usage",
      inputTokens: this.inputTokensForModel[req.envelope.triage.model] ?? 100,
      outputTokens: this.outputTokensForModel[req.envelope.triage.model] ?? 200,
    });
    req.onEvent({
      type: "worker_done",
      digest:
        this.digestForModel[req.envelope.triage.model] ??
        `default digest from ${req.envelope.triage.model}`,
      status: "success",
    });
  }
}

const baseConfig = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "claude-haiku-4-5", maxTokens: 1000 },
    default: { provider: "p", model: "claude-sonnet-4-6", maxTokens: 10000 },
    deep: { provider: "p", model: "claude-opus-4-6", maxTokens: 100000 },
  },
  providers: { p: { kind: "anthropic-api" } },
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

async function tempLogger(): Promise<JsonlLogger> {
  const dir = await mkdtemp(join(tmpdir(), "router-consult-"));
  return new JsonlLogger(join(dir, "log.jsonl"));
}

async function makeDispatcher(
  provider: ScriptedProvider,
  overrides: { maxConsultationsPerTask?: number } = {},
): Promise<Dispatcher> {
  const store = new MemoryCredentialStore();
  await store.set("p", { providerId: "p", kind: "api-key", secret: "sk" });
  return new Dispatcher({
    config: baseConfig,
    providers: new Map([["p", provider]]),
    store,
    cache: new PreflightCache(join(tmpdir(), `consult-cache-${Date.now()}.json`)),
    logger: await tempLogger(),
    ...overrides,
  });
}

describe("Dispatcher.consult", () => {
  it("returns a digest from a higher-tier model", async () => {
    const provider = new ScriptedProvider("p");
    provider.digestForModel["claude-sonnet-4-6"] = "expert says: do this";
    const dispatcher = await makeDispatcher(provider);

    const env = buildEnvelope({ prompt: "tiny task", config: baseConfig, verdict });
    const result = await dispatcher.consult(env, "should I refactor X?");
    assert.equal(result.digest, "expert says: do this");
    assert.ok(result.cost > 0, "consultation should incur a cost");
    assert.equal(provider.consultsObserved, 1);
  });

  it("respects the maxConsultationsPerTask cap", async () => {
    const provider = new ScriptedProvider("p");
    const dispatcher = await makeDispatcher(provider, {
      maxConsultationsPerTask: 2,
    });
    const env = buildEnvelope({ prompt: "x", config: baseConfig, verdict });
    await dispatcher.consult(env, "q1");
    await dispatcher.consult(env, "q2");
    await assert.rejects(
      () => dispatcher.consult(env, "q3"),
      /Consultation cap reached/,
    );
  });

  it("counts consultations against the root task across child envelopes", async () => {
    const provider = new ScriptedProvider("p");
    const dispatcher = await makeDispatcher(provider, {
      maxConsultationsPerTask: 1,
    });
    const env = buildEnvelope({ prompt: "x", config: baseConfig, verdict });
    await dispatcher.consult(env, "q1");

    // A child envelope sharing the same root id is still capped.
    const childEnv = {
      ...env,
      id: `${env.id}-child`,
      parentEnvelopeId: env.id,
    };
    await assert.rejects(
      () => dispatcher.consult(childEnv, "q2"),
      /Consultation cap reached/,
    );
  });

  it("uses the next-higher tier when no tier is specified", async () => {
    const provider = new ScriptedProvider("p");
    provider.digestForModel["claude-sonnet-4-6"] = "from sonnet";
    provider.digestForModel["claude-opus-4-6"] = "from opus";
    const dispatcher = await makeDispatcher(provider);

    const env = buildEnvelope({
      prompt: "x",
      config: baseConfig,
      verdict: { ...verdict, recommendedTier: "fast" },
    });
    const result = await dispatcher.consult(env, "q");
    // fast → default = sonnet
    assert.equal(result.digest, "from sonnet");
  });

  it("respects an explicit tier override", async () => {
    const provider = new ScriptedProvider("p");
    provider.digestForModel["claude-opus-4-6"] = "from opus directly";
    const dispatcher = await makeDispatcher(provider);

    const env = buildEnvelope({
      prompt: "x",
      config: baseConfig,
      verdict: { ...verdict, recommendedTier: "fast" },
    });
    const result = await dispatcher.consult(env, "q", "deep");
    assert.equal(result.digest, "from opus directly");
  });
});

describe("Dispatcher.delegate", () => {
  it("returns the sub-worker's digest and a cost", async () => {
    const provider = new ScriptedProvider("p");
    provider.digestForModel["claude-haiku-4-5"] = "subtask done";
    const dispatcher = await makeDispatcher(provider);

    const env = buildEnvelope({
      prompt: "plan",
      config: baseConfig,
      verdict: { ...verdict, recommendedTier: "deep" },
    });
    const result = await dispatcher.delegate(env, "execute step 1", "fast");
    assert.equal(result.status, "success");
    assert.equal(result.digest, "subtask done");
    assert.ok(result.cost > 0);
  });

  it("uses the next-lower tier when no tier is specified", async () => {
    const provider = new ScriptedProvider("p");
    provider.digestForModel["claude-sonnet-4-6"] = "from sonnet exec";
    const dispatcher = await makeDispatcher(provider);

    const env = buildEnvelope({
      prompt: "plan",
      config: baseConfig,
      verdict: { ...verdict, recommendedTier: "deep" },
    });
    const result = await dispatcher.delegate(env, "execute");
    // deep → default = sonnet
    assert.equal(result.digest, "from sonnet exec");
  });
});
