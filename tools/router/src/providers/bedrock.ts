import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import type Anthropic from "@anthropic-ai/sdk";
import {
  AuthError,
  type AuthContext,
  type AuthEvent,
  type Credential,
  type DispatchRequest,
  type ProbeResult,
  type Provider,
} from "../types.js";
import { classifyAnthropicError } from "./anthropic-api.js";
import { registerProvider } from "./registry.js";

interface BedrockOptions {
  id: string;
  region?: string;
  options?: Record<string, unknown>;
}

/**
 * AWS Bedrock provider. Uses the AWS default credential chain (env vars,
 * shared config, SSO, EC2/ECS role) via the official bedrock SDK, so there's
 * no explicit router-owned credential to store. We still produce a sentinel
 * Credential so the CredentialStore round-trip works uniformly.
 *
 * "Authentication" for this provider is effectively delegated to `aws`
 * tooling — `aws sso login` or `aws configure` before using router. The
 * login() flow just verifies the chain resolves.
 */
export class BedrockProvider implements Provider {
  readonly id: string;
  readonly displayName = "AWS Bedrock";
  readonly authStrategy = "cloud-sdk" as const;
  private readonly region: string;

  constructor(opts: BedrockOptions) {
    this.id = opts.id;
    this.region = opts.region ?? process.env.AWS_REGION ?? "us-east-1";
  }

  async *login(_ctx: AuthContext): AsyncIterable<AuthEvent> {
    yield {
      type: "instruction",
      message:
        "Bedrock uses the AWS credential chain. Run `aws sso login` or `aws configure` in your shell first, then press enter to verify.",
    };

    // Probe with a minimal request to confirm credentials + region work.
    try {
      const client = new AnthropicBedrock({ awsRegion: this.region });
      await client.messages.create({
        model: "anthropic.claude-haiku-4-5-v1:0",
        max_tokens: 1,
        messages: [{ role: "user", content: "." }],
      });
    } catch (err) {
      yield {
        type: "error",
        message: `Bedrock credential chain did not resolve: ${
          err instanceof Error ? err.message : String(err)
        }`,
        recoverable: true,
      };
      return;
    }

    yield {
      type: "success",
      credential: {
        providerId: this.id,
        kind: "cloud-sdk",
        secret: "<bedrock-delegated>",
        metadata: { region: this.region },
      },
    };
  }

  async probe(model: string, _credential: Credential): Promise<ProbeResult> {
    try {
      const client = new AnthropicBedrock({ awsRegion: this.region });
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

  async dispatch(
    request: DispatchRequest,
    _credential: Credential,
  ): Promise<void> {
    const { envelope, signal, onEvent, tools, executeTool } = request;
    const client = new AnthropicBedrock({ awsRegion: this.region });
    await runMessagesLoop(
      client as unknown as Anthropic,
      envelope,
      signal,
      onEvent,
      tools,
      executeTool,
      this.id,
    );
  }
}

/**
 * Shared messages-API tool loop used by the bedrock and vertex providers.
 * Factored out so both SDKs share the same control flow as anthropic-api.ts
 * without depending on that file's internals.
 */
export async function runMessagesLoop(
  client: Anthropic,
  envelope: DispatchRequest["envelope"],
  signal: AbortSignal,
  onEvent: DispatchRequest["onEvent"],
  tools: DispatchRequest["tools"],
  executeTool: DispatchRequest["executeTool"],
  providerId: string,
): Promise<void> {
  onEvent({ type: "worker_start", model: envelope.triage.model });

  const anthropicTools: Anthropic.Tool[] | undefined = tools?.length
    ? tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      }))
    : undefined;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: envelope.originalPrompt },
  ];
  const maxIterations = 20;
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
      const final = await client.messages.create({
        model: envelope.triage.model,
        max_tokens: envelope.budget.maxTokens ?? 4096,
        messages,
        ...(anthropicTools ? { tools: anthropicTools } : {}),
      });
      if (final.usage) {
        onEvent({
          type: "token_usage",
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
        });
      }
      const textChunk = final.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      if (textChunk) {
        onEvent({ type: "assistant_text", text: textChunk });
      }
      finalText += textChunk;
      messages.push({ role: "assistant", content: final.content });

      const toolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
        onEvent({
          type: "worker_done",
          digest: finalText.slice(0, 2000),
          status: "success",
        });
        return;
      }
      if (!executeTool) {
        onEvent({
          type: "worker_done",
          digest: "No tool executor available.",
          status: "failure",
        });
        return;
      }
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        onEvent({ type: "tool_call", name: use.name, input: use.input });
        let result;
        try {
          result = await executeTool(use.name, use.input);
        } catch (err) {
          result = {
            isError: true,
            content: err instanceof Error ? err.message : String(err),
          };
        }
        onEvent({ type: "tool_result", name: use.name, ok: !result.isError });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: result.content,
          is_error: result.isError,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
    onEvent({
      type: "worker_done",
      digest: finalText.slice(0, 2000) + "\n\n[stopped: max tool iterations]",
      status: "failure",
    });
  } catch (err) {
    if (signal.aborted) {
      onEvent({ type: "worker_done", digest: finalText || "aborted", status: "failure" });
      return;
    }
    const { reason, message } = classifyAnthropicError(err);
    throw new AuthError(message, reason, {
      provider: providerId,
      model: envelope.triage.model,
    });
  }
}

registerProvider("bedrock", (opts) => new BedrockProvider(opts));
