import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { RouterConfig } from "../config/schema.js";
import { RouterError, type Credential, type TriageVerdict } from "../types.js";
import { DEFAULT_RUBRIC } from "./rubric.js";

/**
 * LLM-backed triage. Called only if no heuristic rule matched. Uses the
 * cheap triage model (Haiku by default) and expects strict JSON back.
 *
 * This deliberately does NOT use the provider plugin interface — triage is
 * always an Anthropic Messages API call against whichever provider+credential
 * the config points at. Keeping it direct lets us control the exact shape of
 * the request and the parsing of the response without adding a second abstract
 * layer.
 */

const LlmVerdictSchema = z.object({
  complexity: z.enum(["trivial", "simple", "moderate", "complex", "research"]),
  reasoningDepth: z.number().int().min(1).max(5),
  ambiguity: z.number().int().min(1).max(5),
  requiresCodebaseExploration: z.boolean(),
  requiresMultiFileEdits: z.boolean(),
  recommendedTier: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

export interface LlmTriageInput {
  prompt: string;
  config: RouterConfig;
  credential: Credential;
  signal?: AbortSignal;
}

export async function runLlmTriage(
  input: LlmTriageInput,
): Promise<TriageVerdict> {
  const { prompt, config, credential, signal } = input;

  const rubric = await loadRubric(config.triage.rubricPath);
  const client = new Anthropic({ apiKey: credential.secret });

  let response;
  try {
    response = await client.messages.create(
      {
        model: config.triage.model,
        max_tokens: 512,
        system: rubric,
        messages: [
          {
            role: "user",
            content: `Classify this task:\n\n<prompt>\n${prompt}\n</prompt>\n\nRespond with JSON only.`,
          },
        ],
      },
      { signal },
    );
  } catch (err) {
    throw new RouterError(
      `Triage LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
      "TRIAGE_FAILED",
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    throw new RouterError(
      "Triage response contained no text.",
      "TRIAGE_EMPTY",
    );
  }

  const json = extractJson(textBlock.text);
  const parsed = LlmVerdictSchema.safeParse(json);
  if (!parsed.success) {
    throw new RouterError(
      `Triage response was not valid JSON: ${parsed.error.message}`,
      "TRIAGE_INVALID",
      { raw: textBlock.text },
    );
  }

  return {
    complexity: parsed.data.complexity,
    confidence: parsed.data.confidence,
    reasoningDepth:
      parsed.data.reasoningDepth as TriageVerdict["reasoningDepth"],
    ambiguity: parsed.data.ambiguity as TriageVerdict["ambiguity"],
    requiresCodebaseExploration: parsed.data.requiresCodebaseExploration,
    requiresMultiFileEdits: parsed.data.requiresMultiFileEdits,
    rationale: parsed.data.rationale,
    recommendedTier: parsed.data.recommendedTier,
    source: "llm",
  };
}

async function loadRubric(path: string | undefined): Promise<string> {
  if (!path) return DEFAULT_RUBRIC;
  try {
    return await readFile(path, "utf8");
  } catch {
    return DEFAULT_RUBRIC;
  }
}

/**
 * Robust JSON extractor: handles models that stubbornly wrap output in code
 * fences despite instructions, or prepend a sentence.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // Try plain parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  // Strip markdown fences.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // fall through
    }
  }

  // Grab the first {...} block.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // fall through
    }
  }

  throw new Error("No parseable JSON found in triage response.");
}
