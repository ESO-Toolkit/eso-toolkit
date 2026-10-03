import { setTimeout as sleep } from "node:timers/promises";
import type { AuthEvent } from "../types.js";

/**
 * Reusable RFC 8628 OAuth 2.0 Device Authorization Grant implementation.
 *
 * Any provider that speaks device flow (GitHub, Google, Auth0, custom) can
 * invoke `runDeviceFlow()` with its endpoint URLs + client id and get back
 * an async iterator of AuthEvents that the TUI knows how to render.
 *
 * This file has no provider-specific logic — it's pure protocol. The calling
 * provider is responsible for translating the final access token into a
 * Credential object with the right providerId and metadata.
 */

export interface DeviceFlowConfig {
  /** Device authorization endpoint (where we request a device_code). */
  deviceAuthorizationUrl: string;
  /** Token endpoint (where we poll for the access token). */
  tokenUrl: string;
  /** OAuth client id registered with the identity provider. */
  clientId: string;
  /** Space-separated OAuth scopes. */
  scope?: string;
  /** Audience parameter (Auth0-style). */
  audience?: string;
  /** Abort signal from the TUI (user pressed Esc). */
  signal: AbortSignal;
}

export interface DeviceFlowResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Stream AuthEvents through a complete device flow. Terminal events are
 * `success` (with the final token inside the emitted event payload) or
 * `error`. The caller is expected to consume the stream with for-await.
 */
export async function* runDeviceFlow(
  config: DeviceFlowConfig,
): AsyncGenerator<
  AuthEvent | { type: "device_flow_result"; result: DeviceFlowResult }
> {
  // Step 1: request device code
  let deviceCode: DeviceCodeResponse;
  try {
    const res = await fetch(config.deviceAuthorizationUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        ...(config.scope ? { scope: config.scope } : {}),
        ...(config.audience ? { audience: config.audience } : {}),
      }).toString(),
      signal: config.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      yield {
        type: "error",
        message: `Device authorization request failed (${res.status}): ${body.slice(0, 200)}`,
        recoverable: false,
      };
      return;
    }
    deviceCode = (await res.json()) as DeviceCodeResponse;
  } catch (err) {
    yield {
      type: "error",
      message: `Could not reach device authorization endpoint: ${(err as Error).message}`,
      recoverable: true,
    };
    return;
  }

  const expiresAt = Date.now() + deviceCode.expires_in * 1000;

  yield {
    type: "device_code",
    userCode: deviceCode.user_code,
    verificationUri: deviceCode.verification_uri,
    verificationUriComplete: deviceCode.verification_uri_complete,
    expiresAt,
  };

  // Step 2: poll token endpoint at the server-suggested interval.
  let intervalMs = (deviceCode.interval ?? 5) * 1000;
  while (Date.now() < expiresAt) {
    if (config.signal.aborted) {
      yield {
        type: "error",
        message: "Cancelled by user.",
        recoverable: true,
      };
      return;
    }

    yield { type: "polling", waitMs: intervalMs };
    try {
      await sleep(intervalMs, undefined, { signal: config.signal });
    } catch {
      yield {
        type: "error",
        message: "Cancelled by user.",
        recoverable: true,
      };
      return;
    }

    let token: TokenResponse;
    try {
      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode.device_code,
          client_id: config.clientId,
        }).toString(),
        signal: config.signal,
      });
      token = (await res.json()) as TokenResponse;
    } catch (err) {
      yield {
        type: "error",
        message: `Token polling failed: ${(err as Error).message}`,
        recoverable: true,
      };
      return;
    }

    if (token.access_token) {
      const result: DeviceFlowResult = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in
          ? Date.now() + token.expires_in * 1000
          : undefined,
        tokenType: token.token_type,
        scope: token.scope,
      };
      yield { type: "device_flow_result", result };
      return;
    }

    // RFC 8628 standard polling error codes
    switch (token.error) {
      case "authorization_pending":
        // Keep polling silently.
        break;
      case "slow_down":
        intervalMs += 5000;
        break;
      case "expired_token":
        yield {
          type: "error",
          message: "Device code expired before approval.",
          recoverable: true,
        };
        return;
      case "access_denied":
        yield {
          type: "error",
          message: "Authorization was denied.",
          recoverable: false,
        };
        return;
      default:
        if (token.error) {
          yield {
            type: "error",
            message: `OAuth error: ${token.error}${
              token.error_description ? ` — ${token.error_description}` : ""
            }`,
            recoverable: false,
          };
          return;
        }
    }
  }

  yield {
    type: "error",
    message: "Device code expired before approval.",
    recoverable: true,
  };
}
