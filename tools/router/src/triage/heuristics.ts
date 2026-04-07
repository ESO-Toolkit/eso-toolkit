import type { RouterConfig } from "../config/schema.js";
import type { HeuristicRuleType } from "../config/schema.js";
import type { TierName, TriageSignals, TriageVerdict } from "../types.js";

/**
 * Fast, deterministic triage that runs before any LLM call.
 *
 * Input: the raw prompt + minimal static analysis.
 * Output: a TriageSignals object and (if any rule matched) a TriageVerdict.
 *
 * Design goals:
 *   1. Zero network calls. Everything here is pure.
 *   2. Explainable — every verdict records which rule fired.
 *   3. Config-driven — rules live in router.config.ts, not in code.
 */

const DESIGN_KEYWORDS = [
  "architect",
  "architecture",
  "refactor",
  "redesign",
  "migrate",
  "migration",
  "rewrite",
  "design",
];
const WRITE_VERBS = [
  "add",
  "create",
  "implement",
  "build",
  "write",
  "fix",
  "update",
  "change",
  "modify",
  "remove",
  "delete",
  "rename",
];
const READ_VERBS = [
  "show",
  "list",
  "explain",
  "describe",
  "what",
  "where",
  "how",
  "why",
  "find",
  "search",
  "read",
  "look",
];
const MULTI_STEP_MARKERS = [
  "then",
  "and then",
  "after that",
  "finally",
  "first",
  "second",
  "step 1",
  "step 2",
  "1.",
  "2.",
];
const GLOB_PATTERN = /\*\*?|\{[^}]+\}|\[[^\]]+\]/g;

export function extractSignals(prompt: string): TriageSignals {
  const lower = prompt.toLowerCase();
  const promptTokens = estimateTokens(prompt);
  const fileGlobBreadth = countGlobBreadth(prompt);
  const verbClass = classifyVerb(lower);
  const keywords = extractKeywords(lower);
  const hasMultiStepMarkers = MULTI_STEP_MARKERS.some((m) =>
    lower.includes(m),
  );

  return {
    promptTokens,
    fileGlobBreadth,
    verbClass,
    keywords,
    hasMultiStepMarkers,
  };
}

export interface HeuristicMatch {
  ruleIndex: number;
  ruleName: string;
  tier: TierName;
}

/**
 * Walk rules in order. Return the first match, if any. Rule authors put
 * most-specific rules first in config.
 */
export function matchHeuristics(
  signals: TriageSignals,
  config: RouterConfig,
): HeuristicMatch | null {
  for (let i = 0; i < config.heuristics.length; i++) {
    const rule = config.heuristics[i]!;
    if (ruleMatches(rule, signals)) {
      return {
        ruleIndex: i,
        ruleName: rule.name ?? `rule[${i}]`,
        tier: rule.tier,
      };
    }
  }
  return null;
}

export function buildHeuristicVerdict(
  match: HeuristicMatch,
  signals: TriageSignals,
): TriageVerdict {
  return {
    complexity: inferComplexityFromTier(match.tier),
    confidence: 0.9,
    reasoningDepth: match.tier === "fast" ? 1 : match.tier === "deep" ? 5 : 3,
    ambiguity: signals.hasMultiStepMarkers ? 3 : 2,
    requiresCodebaseExploration: signals.fileGlobBreadth > 3,
    requiresMultiFileEdits:
      signals.verbClass === "write" && signals.fileGlobBreadth > 1,
    rationale: `Matched heuristic rule "${match.ruleName}".`,
    recommendedTier: match.tier,
    source: "heuristic",
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ruleMatches(
  rule: HeuristicRuleType,
  signals: TriageSignals,
): boolean {
  const when = rule.when;

  if (when.promptTokens) {
    if (
      when.promptTokens.lt !== undefined &&
      !(signals.promptTokens < when.promptTokens.lt)
    )
      return false;
    if (
      when.promptTokens.gt !== undefined &&
      !(signals.promptTokens > when.promptTokens.gt)
    )
      return false;
  }

  if (when.fileGlobBreadth) {
    if (
      when.fileGlobBreadth.lt !== undefined &&
      !(signals.fileGlobBreadth < when.fileGlobBreadth.lt)
    )
      return false;
    if (
      when.fileGlobBreadth.gt !== undefined &&
      !(signals.fileGlobBreadth > when.fileGlobBreadth.gt)
    )
      return false;
  }

  if (when.verbClass && when.verbClass !== signals.verbClass) return false;

  if (when.hasMultiStepMarkers !== undefined) {
    if (when.hasMultiStepMarkers !== signals.hasMultiStepMarkers) return false;
  }

  if (when.keywords && when.keywords.length > 0) {
    const hit = when.keywords.some((kw) =>
      signals.keywords.includes(kw.toLowerCase()),
    );
    if (!hit) return false;
  }

  return true;
}

function estimateTokens(prompt: string): number {
  // Rough approximation: 4 chars per token. Good enough for heuristic gates.
  return Math.ceil(prompt.length / 4);
}

function countGlobBreadth(prompt: string): number {
  const matches = prompt.match(GLOB_PATTERN);
  if (matches) return matches.length * 5;
  // Count bare file references as breadth 1 each.
  const fileRefs = prompt.match(/[\w/.-]+\.(ts|tsx|js|jsx|py|go|rs|md)\b/g);
  return fileRefs?.length ?? 0;
}

function classifyVerb(lower: string): TriageSignals["verbClass"] {
  // Check design first — "refactor the architecture" should win over "change".
  if (DESIGN_KEYWORDS.some((kw) => lower.includes(kw))) return "design";
  // First-word wins for read vs write.
  const firstWord = lower.trim().split(/\s+/)[0] ?? "";
  if (WRITE_VERBS.includes(firstWord)) return "write";
  if (READ_VERBS.includes(firstWord)) return "read";
  if (WRITE_VERBS.some((v) => lower.includes(` ${v} `))) return "write";
  if (READ_VERBS.some((v) => lower.includes(` ${v} `))) return "read";
  return "unknown";
}

function extractKeywords(lower: string): string[] {
  const words = lower.match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  // Dedupe while preserving order for stable rule matching.
  return [...new Set(words)];
}

function inferComplexityFromTier(
  tier: TierName,
): TriageVerdict["complexity"] {
  switch (tier) {
    case "fast":
      return "simple";
    case "deep":
      return "complex";
    default:
      return "moderate";
  }
}
