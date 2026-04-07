import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { analyzeCost } from "../src/commands/cost.js";
import { RouterConfigSchema } from "../src/config/schema.js";

const config = RouterConfigSchema.parse({
  tiers: {
    fast: { provider: "p", model: "claude-haiku-4-5" },
    default: { provider: "p", model: "claude-sonnet-4-6" },
    deep: { provider: "p", model: "claude-opus-4-6" },
  },
  providers: { p: { kind: "anthropic-api" } },
});

interface FakeRecord {
  ts: string;
  kind: string;
  [key: string]: unknown;
}

async function withFixture(records: FakeRecord[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "router-cost-"));
  const logsDir = join(dir, "logs");
  mkdirSync(logsDir, { recursive: true });
  // Group records by date prefix into separate JSONL files (the analyzer
  // uses filename as a fast date filter).
  const byDay = new Map<string, FakeRecord[]>();
  for (const r of records) {
    const day = r.ts.slice(0, 10);
    const cur = byDay.get(day) ?? [];
    cur.push(r);
    byDay.set(day, cur);
  }
  for (const [day, group] of byDay) {
    writeFileSync(
      join(logsDir, `${day}.jsonl`),
      group.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
  }
  return logsDir;
}

describe("analyzeCost", () => {
  it("rolls up realized spend across envelopes", async () => {
    const logsDir = await withFixture([
      {
        ts: "2026-04-01T10:00:00Z",
        kind: "envelope",
        envelopeId: "e1",
        tier: "fast",
        provider: "p",
        model: "claude-haiku-4-5",
        complexity: "simple",
        confidence: 0.9,
        source: "heuristic",
        escalated: false,
      },
      {
        ts: "2026-04-01T10:00:01Z",
        kind: "done",
        envelopeId: "e1",
        status: "success",
        budget: {
          inputTokens: 1000,
          outputTokens: 500,
          toolCalls: 2,
          usd: 0.0035,
          escalations: 0,
          startedAt: 0,
        },
      },
      {
        ts: "2026-04-01T11:00:00Z",
        kind: "envelope",
        envelopeId: "e2",
        tier: "deep",
        provider: "p",
        model: "claude-opus-4-6",
        complexity: "complex",
        confidence: 0.9,
        source: "llm",
        escalated: false,
      },
      {
        ts: "2026-04-01T11:00:01Z",
        kind: "done",
        envelopeId: "e2",
        status: "success",
        budget: {
          inputTokens: 2000,
          outputTokens: 1000,
          toolCalls: 5,
          usd: 0.105,
          escalations: 0,
          startedAt: 0,
        },
      },
    ]);
    const report = analyzeCost({ config, logsDir });
    assert.equal(report.totalEnvelopes, 2);
    assert.ok(Math.abs(report.totalUsd - 0.1085) < 1e-9);
    assert.equal(report.byTier.fast?.count, 1);
    assert.equal(report.byTier.deep?.count, 1);
    assert.ok(report.byTier.deep?.usd && report.byTier.deep.usd > 0.1);
    await rm(logsDir, { recursive: true, force: true });
  });

  it("computes counterfactual baselines for every tier", async () => {
    const logsDir = await withFixture([
      {
        ts: "2026-04-01T10:00:00Z",
        kind: "envelope",
        envelopeId: "e1",
        tier: "fast",
        provider: "p",
        model: "claude-haiku-4-5",
        complexity: "simple",
        confidence: 0.9,
        source: "heuristic",
        escalated: false,
      },
      {
        ts: "2026-04-01T10:00:01Z",
        kind: "done",
        envelopeId: "e1",
        status: "success",
        budget: {
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          toolCalls: 0,
          usd: 6, // (1M*$1 + 1M*$5) / 1M = $6
          escalations: 0,
          startedAt: 0,
        },
      },
    ]);
    const report = analyzeCost({ config, logsDir });
    // Counterfactual for "deep" (opus): (1M*$15 + 1M*$75) / 1M = $90
    const deepCf = report.counterfactuals.deep;
    assert.ok(deepCf, "expected deep counterfactual");
    assert.ok(Math.abs(deepCf.usd - 90) < 1e-9);
    // Saving = always-deep - realized = 90 - 6 = 84
    assert.ok(Math.abs(deepCf.saving - 84) < 1e-9);
    assert.ok(deepCf.savingPct > 90); // 84/90 ≈ 93%
    await rm(logsDir, { recursive: true, force: true });
  });

  it("filters by --since and --until", async () => {
    const logsDir = await withFixture([
      {
        ts: "2026-04-01T10:00:00Z",
        kind: "envelope",
        envelopeId: "old",
        tier: "fast",
        provider: "p",
        model: "claude-haiku-4-5",
        complexity: "simple",
        confidence: 0.9,
        source: "heuristic",
        escalated: false,
      },
      {
        ts: "2026-04-05T10:00:00Z",
        kind: "envelope",
        envelopeId: "new",
        tier: "fast",
        provider: "p",
        model: "claude-haiku-4-5",
        complexity: "simple",
        confidence: 0.9,
        source: "heuristic",
        escalated: false,
      },
    ]);
    const filtered = analyzeCost({ config, logsDir, since: "2026-04-03" });
    assert.equal(filtered.totalEnvelopes, 1);
    await rm(logsDir, { recursive: true, force: true });
  });

  it("attributes consultation overhead from consultation_done records", async () => {
    const logsDir = await withFixture([
      {
        ts: "2026-04-01T10:00:00Z",
        kind: "envelope",
        envelopeId: "main",
        tier: "fast",
        provider: "p",
        model: "claude-haiku-4-5",
        complexity: "simple",
        confidence: 0.9,
        source: "heuristic",
        escalated: false,
      },
      {
        ts: "2026-04-01T10:00:01Z",
        kind: "done",
        envelopeId: "main",
        status: "success",
        budget: {
          inputTokens: 100,
          outputTokens: 100,
          toolCalls: 1,
          usd: 0.01,
          escalations: 0,
          startedAt: 0,
        },
      },
      {
        ts: "2026-04-01T10:00:02Z",
        kind: "consultation",
        envelopeId: "main-c1",
        parentEnvelopeId: "main",
        tier: "deep",
        model: "claude-opus-4-6",
      },
      {
        ts: "2026-04-01T10:00:03Z",
        kind: "consultation_done",
        envelopeId: "main-c1",
        parentEnvelopeId: "main",
        cost: 0.005,
      },
    ]);
    const report = analyzeCost({ config, logsDir });
    assert.equal(report.totalConsultations, 1);
    assert.ok(Math.abs(report.consultationOverheadUsd - 0.005) < 1e-9);
    await rm(logsDir, { recursive: true, force: true });
  });

  it("returns an empty report when no logs exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "router-empty-"));
    const report = analyzeCost({ config, logsDir: join(dir, "logs") });
    assert.equal(report.totalEnvelopes, 0);
    assert.equal(report.totalUsd, 0);
    await rm(dir, { recursive: true, force: true });
  });
});
