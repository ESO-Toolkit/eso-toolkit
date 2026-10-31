import Anthropic from "@anthropic-ai/sdk";
import {
  AuthError,
  type AuthContext,
  type AuthEvent,
  type Credential,
  type DispatchRequest,
  type ModelInfo,
  type ProbeFailureReason,
  type ProbeResult,
  type Provider,
} from "../types.js";
import { registerProvider } from "./registry.js";

interface AnthropicProviderOptions {
  id: string;
  baseURL?: string;
  options?: Record<string, unknown>;
}

/**
 * Direct Anthropic API provider. Auth is API key (paste-in), validated
 * immediately against the /v1/models endpoint so we catch invalid keys
 * before any real work happens.
 *
 * Dispatch uses the Messages API directly in a tool-calling loop. We avoid
 * pulling in the Claude Agent SDK here so the provider surface stays minimal
 * and the same pattern can be copied for other API-key-based providers.
 */
export class AnthropicApiProvider implements Provider {
  readonly id: string;
  readonly displayName = "Anthropic API";
  readonly authStrategy = "api-key" as const;
  private readonly baseURL?: string;

  constructor(opts: AnthropicProviderOptions) {
    this.id = opts.id;
    this.baseURL = opts.baseURL;
  }

  async *login(ctx: AuthContext): AsyncIterable<AuthEvent> {
    yield {
      type: "instruction",
      message:
        "Paste your Anthropic API key (starts with sk-ant-). Get one at https://console.anthropic.com/settings/keys",
    };

    let apiKey: string;
    try {
      apiKey = await ctx.requestInput({
        label: "Anthropic API key",
        mask: true,
      });
    } catch (err) {
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Input cancelled",
        recoverable: false,
      };
      return;
    }

    apiKey = apiKey.trim();
    if (!apiKey) {
      yield {
        type: "error",
        message: "No API key provided.",
        recoverable: true,
      };
      return;
    }
    if (!apiKey.startsWith("sk-ant-")) {
      yield {
        type: "error",
        message:
          'API key should start with "sk-ant-". Double-check you copied the full value.',
        recoverable: true,
      };
      return;
    }

    // Validate the key before persisting it.
    const client = new Anthropic({ apiKey, baseURL: this.baseURL });
    try {
      await client.models.list({ limit: 1 });
    } catch (err) {
      const { reason, message } = classifyAnthropicError(err);
      yield {
        type: "error",
        message: `API key rejected: ${message}`,
        recoverable: reason !== "entitlement_denied",
      };
      return;
    }

    const credential: Credential = {
      providerId: this.id,
      kind: "api-key",
      secret: apiKey,
    };
    yield { type: "success", credential };
  }

  async probe(model: string, credential: Credential): Promise<ProbeResult> {
    const client = new Anthropic({
      apiKey: credential.secret,
      baseURL: this.baseURL,
    });
    try {
      // Cheapest probe: single-token completion. Preferred over models.list()
      // because it verifies the caller has entitlement for *this specific*
      // model, not just that the key is valid.
      await client.messages.create({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "." }],
      });
      return { ok: true, checkedAt: Date.now() };
    } catch (err) {
      const { reason, message } = classifyAnthropicError(err);
      return { ok: false, reason, message, checkedAt: Date.now() };
    }
  }

  async listModels(credential: Credential): Promise<ModelInfo[]> {
    const client = new Anthropic({
      apiKey: credential.secret,
      baseURL: this.baseURL,
    });
    const out: ModelInfo[] = [];
    for await (const m of client.models.list()) {
      out.push({ id: m.id, displayName: m.display_name });
    }
    return out;
  }

  async dispatch(
    request: DispatchRequest,
    credential: Credential,
  ): Promise<void> {
    const { envelope, signal, onEvent, tools, executeTool } = request;
    const client = new Anthropic({
      apiKey: credential.secret,
      baseURL: this.baseURL,
    });

    onEvent({ type: "worker_start", model: envelope.triage.model });

    const systemPrompt = buildSystemPrompt(envelope, Boolean(tools?.length));
    const anthropicTools: Anthropic.Tool[] | undefined = tools?.length
      ? tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
        }))
      : undefined;

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildUserMessage(envelope) },
    ];

    const maxIterations = 20; // hard cap on tool-use rounds per worker
    let finalText = "";

    try {
      for (let iter = 0; iter < maxIterations; iter++) {
        if (signal.aborted) {
          onEvent({
            type: "worker_done",
            digest: finalText || "aborted",
            status: "failure",
          });
          return;
        }

        const stream = client.messages.stream({
          model: envelope.triage.model,
          max_tokens: envelope.budget.maxTokens ?? 4096,
          system: systemPrompt,
          messages,
          ...(anthropicTools ? { tools: anthropicTools } : {}),
        });

        // Stream assistant text to the TUI as it arrives.
        for await (const event of stream) {
          if (signal.aborted) {
            stream.controller.abort();
            break;
          }
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            onEvent({ type: "assistant_text", text: event.delta.text });
          }
        }

        const final = await stream.finalMessage();
        if (final.usage) {
          onEvent({
            type: "token_usage",
            inputTokens: final.usage.input_tokens,
            outputTokens: final.usage.output_tokens,
          });
        }

        // Accumulate text output for the final digest.
        finalText += final.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        // Append the assistant turn to the running conversation.
        messages.push({ role: "assistant", content: final.content });

        const toolUses = final.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );

        if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
          // Natural stop — the worker is done.
          onEvent({
            type: "worker_done",
            digest: finalText.slice(0, 2000),
            status: "success",
          });
          return;
        }

        if (!executeTool) {
          // Model asked for tools but the dispatcher didn't provide a handler.
          onEvent({
            type: "worker_done",
            digest: "Model requested tools but no executor was provided.",
            status: "failure",
          });
          return;
        }

        // Execute every tool_use block in this turn and feed the results
        // back as a single user message.
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const use of toolUses) {
          onEvent({ type: "tool_call", name: use.name, input: use.input });
          let result;
          try {
            result = await executeTool(use.name, use.input);
          } catch (err) {
            result = {
              isError: true,
              content:
                err instanceof Error ? err.message : String(err),
            };
          }
          onEvent({
            type: "tool_result",
            name: use.name,
            ok: !result.isError,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: result.content,
            is_error: result.isError,
          });
        }
        messages.push({ role: "user", content: toolResults });
      }

      // Fell off the iteration cap without a natural stop.
      onEvent({
        type: "worker_done",
        digest:
          finalText.slice(0, 2000) + "\n\n[stopped: max tool iterations]",
        status: "failure",
      });
    } catch (err) {
      if (signal.aborted) {
        onEvent({
          type: "worker_done",
          digest: finalText || "aborted",
          status: "failure",
        });
        return;
      }
      const { reason, message } = classifyAnthropicError(err);
      throw new AuthError(message, reason, {
        provider: this.id,
        model: envelope.triage.model,
      });
    }
  }
}

function buildSystemPrompt(
  envelope: DispatchRequest["envelope"],
  hasTools: boolean,
): string {
  const parts = [
    "You are a router-dispatched worker agent.",
    `Tier: ${envelope.triage.tier} (${envelope.triage.model})`,
    `Goal: ${envelope.goal}`,
  ];
  if (envelope.context.constraints.length > 0) {
    parts.push(`Constraints: ${envelope.context.constraints.join(", ")}`);
  }
  if (hasTools) {
    parts.push(
      "You have access to tools for reading files, writing files, listing directories, and running shell commands. Use them to explore the workspace and make changes as needed.",
    );
  }
  if (envelope.budget.escalationAllowed) {
    parts.push(
      "If this task is larger or more ambiguous than it appears, call the request_escalation tool with a reason and a one-paragraph digest of what you tried and where you got stuck. Do not retry blindly.",
    );
  }
  if (envelope.escalation) {
    parts.push(
      `This is an escalated attempt (bump ${envelope.escalation.bumpCount}). Previous attempt at ${envelope.escalation.fromTier} failed with reason "${envelope.escalation.reason}". Prior digest:\n${envelope.escalation.priorAttemptDigest}`,
    );
  }
  return parts.join("\n\n");
}

function buildUserMessage(envelope: DispatchRequest["envelope"]): string {
  const parts = [envelope.originalPrompt];
  if (envelope.context.files.length > 0) {
    parts.push(
      `\nRelevant files identified by triage:\n${envelope.context.files.map((f) => `- ${f}`).join("\n")}`,
    );
  }
  if (envelope.context.priorFindings) {
    parts.push(`\nPrior findings:\n${envelope.context.priorFindings}`);
  }
  return parts.join("\n");
}

/**
 * Map Anthropic SDK errors to router ProbeFailureReason enum. This is where
 * we convert opaque HTTP errors into the categories the TUI error panels
 * know how to render.
 */
export function classifyAnthropicError(err: unknown): {
  reason: ProbeFailureReason;
  message: string;
} {
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    const raw = err.message ?? "";
    if (status === 401) {
      return {
        reason: /expired/i.test(raw)
          ? "expired_credential"
          : "invalid_credential",
        message: raw || "Authentication failed.",
      };
    }
    if (status === 403) {
      if (/model|plan|subscription|entitlement/i.test(raw)) {
        return { reason: "entitlement_denied", message: raw };
      }
      return { reason: "invalid_credential", message: raw };
    }
    if (status === 404) {
      return {
        reason: "model_not_found",
        message: raw || "Model not found.",
      };
    }
    if (status === 429) {
      return { reason: "rate_limited", message: raw || "Rate limited." };
    }
    return { reason: "unknown", message: raw || "API error." };
  }
  if (
    err instanceof Error &&
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(err.message)
  ) {
    return { reason: "network_error", message: err.message };
  }
  return {
    reason: "unknown",
    message: err instanceof Error ? err.message : String(err),
  };
}

// Self-register.
registerProvider("anthropic-api", (opts) => new AnthropicApiProvider(opts));
