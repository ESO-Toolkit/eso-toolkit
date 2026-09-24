import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RouterConfig } from "../config/schema.js";

/**
 * `router cost` — analyze JSONL telemetry from .router/logs/ and produce
 * cost summaries plus counterfactual baselines.
 *
 * The router already logs every envelope and every dispatch outcome to
 * .router/logs/<date>.jsonl, so this command needs no new instrumentation —
 * it just parses what's already there. The interesting numbers are:
 *
 *   1. Realized cost broken down by tier/provider/day
 *   2. Counterfactual: "what would this have cost if you'd run every task
 *      at always-deep / always-default / always-fast?"
 *   3. Top-N most expensive envelopes (rubric-tuning targets)
 *   4. Consultation overhead: how much was spent on consult/delegate calls
 *      vs main worker turns
 *
 * The counterfactual is the headline. It tells the user: "the router saved
 * you $X this week vs running everything on Opus." That's the only number
 * that proves the router is worth running.
 */

// USD per 1M tokens. Mirrors src/dispatch/budget.ts so the analyzer doesn't
// need to import dispatch internals; if you change one, change both.
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
};

interface EnvelopeRecord {
  ts: string;
  kind: "envelope";
  envelopeId: string;
  tier: string;
  provider: string;
  model: string;
  complexity: string;
  confidence: number;
  source: string;
  escalated: boolean;
}

interface DoneRecord {
  ts: string;
  kind: "done";
  envelopeId: string;
  status: string;
  budget: {
    inputTokens: number;
    outputTokens: number;
    toolCalls: number;
    usd: number;
    escalations: number;
    startedAt: number;
  };
}

interface ConsultationRecord {
  ts: string;
  kind: "consultation" | "consultation_done";
  envelopeId: string;
  parentEnvelopeId?: string;
  tier?: string;
  model?: string;
  cost?: number;
}

type LogRecord = EnvelopeRecord | DoneRecord | ConsultationRecord | { ts: string; kind: string };

export interface CostReport {
  totalUsd: number;
  totalEnvelopes: number;
  totalConsultations: number;
  byTier: Record<string, { count: number; usd: number }>;
  byProvider: Record<string, { count: number; usd: number }>;
  byDay: Record<string, { count: number; usd: number }>;
  topN: Array<{ envelopeId: string; tier: string; model: string; usd: number }>;
  counterfactuals: Record<string, { usd: number; saving: number; savingPct: number }>;
  consultationOverheadUsd: number;
  consultationOverheadPct: number;
}

export interface CostOptions {
  logsDir?: string;
  since?: string; // YYYY-MM-DD
  until?: string;
  topN?: number;
  config: RouterConfig;
}

/**
 * Read every JSONL file in the logs directory, parse all records, and roll
 * them up into a CostReport. Skips malformed lines silently — telemetry
 * should never crash an analysis tool.
 */
export function analyzeCost(opts: CostOptions): CostReport {
  const dir = opts.logsDir ?? join(process.cwd(), ".router", "logs");
  const records = loadRecords(dir, opts.since, opts.until);

  // Pair envelopes with their done records so we have both the metadata
  // (tier, provider, model) AND the final budget (cost). One pass to index
  // envelopes, second pass to attach budget.
  const envelopes = new Map<string, EnvelopeRecord & { budget?: DoneRecord["budget"] }>();
  const consultations: ConsultationRecord[] = [];

  for (const r of records) {
    if (r.kind === "envelope") {
      envelopes.set((r as EnvelopeRecord).envelopeId, r as EnvelopeRecord);
    } else if (r.kind === "done") {
      const done = r as DoneRecord;
      const env = envelopes.get(done.envelopeId);
      if (env) env.budget = done.budget;
    } else if (r.kind === "consultation" || r.kind === "consultation_done") {
      consultations.push(r as ConsultationRecord);
    }
  }

  // Roll up the realized totals.
  const byTier: Record<string, { count: number; usd: number }> = {};
  const byProvider: Record<string, { count: number; usd: number }> = {};
  const byDay: Record<string, { count: number; usd: number }> = {};
  const items: Array<{ envelopeId: string; tier: string; model: string; usd: number }> = [];
  let totalUsd = 0;
  let totalEnvelopes = 0;

  for (const env of envelopes.values()) {
    const usd = env.budget?.usd ?? 0;
    totalUsd += usd;
    totalEnvelopes += 1;
    bump(byTier, env.tier, usd);
    bump(byProvider, env.provider, usd);
    bump(byDay, env.ts.slice(0, 10), usd);
    items.push({
      envelopeId: env.envelopeId,
      tier: env.tier,
      model: env.model,
      usd,
    });
  }

  items.sort((a, b) => b.usd - a.usd);
  const topN = items.slice(0, opts.topN ?? 10);

  // Compute consultation overhead.
  let consultationOverheadUsd = 0;
  for (const c of consultations) {
    if (c.kind === "consultation_done" && typeof c.cost === "number") {
      consultationOverheadUsd += c.cost;
    }
  }
  const consultationOverheadPct =
    totalUsd > 0 ? (consultationOverheadUsd / totalUsd) * 100 : 0;

  // Counterfactual baselines: what would each tier have cost?
  // We need a per-envelope token count to multiply by each tier's price.
  const counterfactuals: CostReport["counterfactuals"] = {};
  for (const tierName of Object.keys(opts.config.tiers)) {
    const tierConfig = opts.config.tiers[tierName]!;
    const price = COST_TABLE[tierConfig.model];
    if (!price) continue;
    let totalAt = 0;
    for (const env of envelopes.values()) {
      const inTok = env.budget?.inputTokens ?? 0;
      const outTok = env.budget?.outputTokens ?? 0;
      totalAt +=
        (inTok * price.input) / 1_000_000 +
        (outTok * price.output) / 1_000_000;
    }
    const saving = totalAt - totalUsd;
    counterfactuals[tierName] = {
      usd: totalAt,
      saving,
      savingPct: totalAt > 0 ? (saving / totalAt) * 100 : 0,
    };
  }

  return {
    totalUsd,
    totalEnvelopes,
    totalConsultations: consultations.filter(
      (c) => c.kind === "consultation",
    ).length,
    byTier,
    byProvider,
    byDay,
    topN,
    counterfactuals,
    consultationOverheadUsd,
    consultationOverheadPct,
  };
}

function bump(
  map: Record<string, { count: number; usd: number }>,
  key: string,
  usd: number,
): void {
  const cur = map[key] ?? { count: 0, usd: 0 };
  cur.count += 1;
  cur.usd += usd;
  map[key] = cur;
}

function loadRecords(
  dir: string,
  since?: string,
  until?: string,
): LogRecord[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const records: LogRecord[] = [];
  for (const file of files) {
    // Filename is YYYY-MM-DD.jsonl; quick filter before reading.
    const day = file.replace(".jsonl", "");
    if (since && day < since) continue;
    if (until && day > until) continue;
    const text = readFileSync(join(dir, file), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line) as LogRecord);
      } catch {
        // Skip malformed lines.
      }
    }
  }
  return records;
}

/**
 * Pretty-print a CostReport to stdout. Used by `router cost` when --json is
 * not passed. Lays out the headline counterfactual first because that's the
 * number the user actually wants to see.
 */
export function printCostReport(report: CostReport): void {
  const fmt = (n: number) => `$${n.toFixed(4)}`;
  const fmtPct = (n: number) =>
    `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  console.log(`\nrouter cost report`);
  console.log(`──────────────────`);
  console.log(`Envelopes:        ${report.totalEnvelopes}`);
  console.log(`Consultations:    ${report.totalConsultations}`);
  console.log(`Realized spend:   ${fmt(report.totalUsd)}`);
  console.log(
    `Consult overhead: ${fmt(report.consultationOverheadUsd)} (${report.consultationOverheadPct.toFixed(1)}% of total)`,
  );

  if (Object.keys(report.counterfactuals).length > 0) {
    console.log(`\nCounterfactual baselines (vs realized ${fmt(report.totalUsd)}):`);
    for (const [tier, c] of Object.entries(report.counterfactuals)) {
      const sign = c.saving >= 0 ? "saved" : "cost extra";
      console.log(
        `  always-${tier.padEnd(8)} ${fmt(c.usd).padStart(10)}   ${sign} ${fmt(Math.abs(c.saving))}  (${fmtPct(c.savingPct)})`,
      );
    }
  }

  if (Object.keys(report.byTier).length > 0) {
    console.log(`\nBy tier:`);
    for (const [tier, agg] of Object.entries(report.byTier)) {
      console.log(`  ${tier.padEnd(12)} ${agg.count} envelopes  ${fmt(agg.usd)}`);
    }
  }

  if (Object.keys(report.byDay).length > 0) {
    console.log(`\nBy day:`);
    for (const [day, agg] of Object.entries(report.byDay).sort()) {
      console.log(`  ${day}   ${agg.count} envelopes  ${fmt(agg.usd)}`);
    }
  }

  if (report.topN.length > 0) {
    console.log(`\nTop ${report.topN.length} most expensive envelopes:`);
    for (const item of report.topN) {
      console.log(
        `  ${item.envelopeId.padEnd(28)} ${item.tier.padEnd(8)} ${item.model.padEnd(20)} ${fmt(item.usd)}`,
      );
    }
  }
  console.log("");
}
