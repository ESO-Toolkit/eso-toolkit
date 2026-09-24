import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type Anthropic from "@anthropic-ai/sdk";
import {
  type AuthContext,
  type AuthEvent,
  type Credential,
  type DispatchRequest,
  type ProbeResult,
  type Provider,
} from "../types.js";
import { classifyAnthropicError } from "./anthropic-api.js";
import { runMessagesLoop } from "./bedrock.js";
import { registerProvider } from "./registry.js";

interface VertexOptions {
  id: string;
  region?: string;
  options?: Record<string, unknown>;
}

/**
 * Google Cloud Vertex AI provider. Uses Google Application Default
 * Credentials (ADC) via the vertex SDK. The `projectId` can come from
 * `GOOGLE_CLOUD_PROJECT` or config options; the `region` defaults to
 * us-east5 which is where Anthropic models are most broadly available.
 *
 * Like the Bedrock provider, there's no stored secret — the SDK picks up
 * whatever ADC resolves to. The router stores a sentinel credential so the
 * auth status surface stays uniform.
 */
export class VertexProvider implements Provider {
  readonly id: string;
  readonly displayName = "Google Vertex AI";
  readonly authStrategy = "cloud-sdk" as const;
  private readonly region: string;
  private readonly projectId?: string;

  constructor(opts: VertexOptions) {
    this.id = opts.id;
    this.region = opts.region ?? "us-east5";
    this.projectId =
      (opts.options?.projectId as string | undefined) ??
      process.env.GOOGLE_CLOUD_PROJECT;
  }

  private createClient(): AnthropicVertex {
    return new AnthropicVertex({
      region: this.region,
      projectId: this.projectId,
    });
  }

  async *login(_ctx: AuthContext): AsyncIterable<AuthEvent> {
    yield {
      type: "instruction",
      message:
        "Vertex uses Google Application Default Credentials. Run `gcloud auth application-default login` and `gcloud config set project <project-id>` before continuing.",
    };
    if (!this.projectId) {
      yield {
        type: "error",
        message:
          "No Google Cloud project id configured. Set GOOGLE_CLOUD_PROJECT or pass options.projectId.",
        recoverable: true,
      };
      return;
    }
    try {
      const client = this.createClient();
      await client.messages.create({
        model: "claude-haiku-4-5@20250101",
        max_tokens: 1,
        messages: [{ role: "user", content: "." }],
      });
    } catch (err) {
      yield {
        type: "error",
        message: `Vertex ADC did not resolve: ${
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
        secret: "<vertex-delegated>",
        metadata: { region: this.region, projectId: this.projectId },
      },
    };
  }

  async probe(model: string, _credential: Credential): Promise<ProbeResult> {
    try {
      const client = this.createClient();
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
    const client = this.createClient();
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

registerProvider("vertex", (opts) => new VertexProvider(opts));
