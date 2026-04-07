import Anthropic from "@anthropic-ai/sdk";
import {
  type AuthContext,
  type AuthEvent,
  type Credential,
  type DispatchRequest,
  type ProbeResult,
  type Provider,
  AuthError,
} from "../types.js";
import { runDeviceFlow } from "./oauth-device-flow.js";
import { classifyAnthropicError } from "./anthropic-api.js";
import { registerProvider } from "./registry.js";

interface OAuthDeviceProviderOptions {
  id: string;
  baseURL?: string;
  options?: Record<string, unknown>;
}

/**
 * Generic OAuth 2.0 device-flow provider. Configured via `options` in
 * router.config.ts:
 *
 *   providers: {
 *     claude: {
 *       kind: "oauth-device",
 *       options: {
 *         deviceAuthorizationUrl: "https://...",
 *         tokenUrl: "https://...",
 *         clientId: "...",
 *         scope: "messages:read messages:write",
 *         apiBaseURL: "https://api.anthropic.com",
 *       },
 *     },
 *   }
 *
 * The resulting credential is a bearer token. Dispatch/probe calls use it
 * as an Authorization header against the provider's API. This is deliberately
 * a thin wrapper — the device flow itself lives in oauth-device-flow.ts so
 * any future OAuth provider can reuse it.
 */
export class OAuthDeviceProvider implements Provider {
  readonly id: string;
  readonly displayName: string;
  readonly authStrategy = "oauth-device" as const;

  private readonly deviceAuthorizationUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly scope?: string;
  private readonly audience?: string;
  private readonly apiBaseURL: string;

  constructor(opts: OAuthDeviceProviderOptions) {
    this.id = opts.id;
    const options = opts.options ?? {};
    this.deviceAuthorizationUrl = required(
      options.deviceAuthorizationUrl,
      "deviceAuthorizationUrl",
    );
    this.tokenUrl = required(options.tokenUrl, "tokenUrl");
    this.clientId = required(options.clientId, "clientId");
    this.scope = options.scope as string | undefined;
    this.audience = options.audience as string | undefined;
    this.apiBaseURL =
      (options.apiBaseURL as string | undefined) ??
      opts.baseURL ??
      "https://api.anthropic.com";
    this.displayName =
      (options.displayName as string | undefined) ?? `${opts.id} (OAuth)`;
  }

  async *login(ctx: AuthContext): AsyncIterable<AuthEvent> {
    yield {
      type: "instruction",
      message: `Starting device authorization for ${this.displayName}. Follow the instructions below.`,
    };

    const flow = runDeviceFlow({
      deviceAuthorizationUrl: this.deviceAuthorizationUrl,
      tokenUrl: this.tokenUrl,
      clientId: this.clientId,
      scope: this.scope,
      audience: this.audience,
      signal: ctx.signal,
    });

    for await (const event of flow) {
      if (event.type === "device_flow_result") {
        const credential: Credential = {
          providerId: this.id,
          kind: "oauth-device",
          secret: event.result.accessToken,
          refreshToken: event.result.refreshToken,
          expiresAt: event.result.expiresAt,
          metadata: {
            tokenType: event.result.tokenType ?? "Bearer",
            scope: event.result.scope,
          },
        };
        yield { type: "success", credential };
        return;
      }
      yield event;
    }
  }

  async refresh(credential: Credential): Promise<Credential> {
    if (!credential.refreshToken) {
      throw new AuthError(
        "No refresh token available; re-login required.",
        "expired_credential",
      );
    }
    const res = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credential.refreshToken,
        client_id: this.clientId,
      }).toString(),
    });
    if (!res.ok) {
      throw new AuthError(
        `Refresh failed (${res.status}): ${await res.text()}`,
        "expired_credential",
      );
    }
    const body = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };
    return {
      ...credential,
      secret: body.access_token,
      refreshToken: body.refresh_token ?? credential.refreshToken,
      expiresAt: body.expires_in
        ? Date.now() + body.expires_in * 1000
        : undefined,
    };
  }

  async probe(model: string, credential: Credential): Promise<ProbeResult> {
    // Treat the bearer token as a drop-in for an API key against the
    // Anthropic-compatible endpoint. Providers that speak a different API
    // shape should subclass and override probe/dispatch.
    const client = new Anthropic({
      apiKey: credential.secret,
      baseURL: this.apiBaseURL,
      authToken: credential.secret,
    });
    try {
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
    credential: Credential,
  ): Promise<void> {
    // Same messages-API pattern as anthropic-api; the only difference is
    // how we authenticate. Reuse the anthropic client with the bearer token.
    const { envelope, signal, onEvent } = request;
    const client = new Anthropic({
      apiKey: credential.secret,
      baseURL: this.apiBaseURL,
      authToken: credential.secret,
    });

    onEvent({ type: "worker_start", model: envelope.triage.model });
    try {
      const stream = client.messages.stream({
        model: envelope.triage.model,
        max_tokens: envelope.budget.maxTokens ?? 4096,
        messages: [{ role: "user", content: envelope.originalPrompt }],
      });
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
      const text = final.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      onEvent({
        type: "worker_done",
        digest: text.slice(0, 2000),
        status: "success",
      });
    } catch (err) {
      const { reason, message } = classifyAnthropicError(err);
      throw new AuthError(message, reason);
    }
  }
}

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `oauth-device provider requires options.${name} to be a non-empty string.`,
    );
  }
  return value;
}

registerProvider("oauth-device", (opts) => new OAuthDeviceProvider(opts));
