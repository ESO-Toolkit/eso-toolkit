import type { ProbeFailureReason } from "../types.js";

export interface ErrorPanelContent {
  title: string;
  body: string[];
  actions: Array<{ key: string; label: string; action: ErrorAction }>;
}

export type ErrorAction =
  | { type: "auth_login"; providerId: string }
  | { type: "auth_refresh"; providerId: string }
  | { type: "downgrade" }
  | { type: "retry" }
  | { type: "cancel" }
  | { type: "open_url"; url: string };

/**
 * Map a preflight failure into a renderable error panel. Every case offers
 * at least one forward action so the user is never stuck staring at an
 * error with no way out.
 */
export function renderPreflightError(
  reason: ProbeFailureReason,
  providerId: string,
  model: string,
  message?: string,
): ErrorPanelContent {
  switch (reason) {
    case "missing_credential":
      return {
        title: `Cannot use ${model}`,
        body: [
          `⚠  No credentials configured for provider "${providerId}".`,
          "",
          "This tier requires authentication before it can run workers.",
        ],
        actions: [
          { key: "a", label: "Authenticate now", action: { type: "auth_login", providerId } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "expired_credential":
      return {
        title: `Credential expired for ${providerId}`,
        body: [
          `⚠  Your stored credential for "${providerId}" has expired.`,
          message ? `   Detail: ${message}` : "",
          "",
          "Re-authenticate to continue, or downgrade to a tier that's still valid.",
        ].filter(Boolean),
        actions: [
          { key: "r", label: "Refresh / re-login", action: { type: "auth_refresh", providerId } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "invalid_credential":
      return {
        title: `Credential rejected by ${providerId}`,
        body: [
          `⚠  The stored credential for "${providerId}" was rejected.`,
          message ? `   Detail: ${message}` : "",
          "",
          "This usually means the key was revoked or is malformed. Re-authenticate to continue.",
        ].filter(Boolean),
        actions: [
          { key: "a", label: "Re-authenticate", action: { type: "auth_login", providerId } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "entitlement_denied":
      return {
        title: `${model} not available on your plan`,
        body: [
          `⚠  Your account for "${providerId}" does not have access to ${model}.`,
          message ? `   Detail: ${message}` : "",
          "",
          "You can upgrade your plan, switch to a different provider that has this model,",
          "or downgrade this task to a tier you do have access to.",
        ].filter(Boolean),
        actions: [
          { key: "u", label: "Open upgrade page", action: { type: "open_url", url: "https://console.anthropic.com/settings/plans" } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "model_not_found":
      return {
        title: `Model ${model} not found`,
        body: [
          `⚠  Provider "${providerId}" does not recognize model "${model}".`,
          message ? `   Detail: ${message}` : "",
          "",
          "Check your router.config.ts — the model id may be wrong or the provider",
          "may not serve this model in your region.",
        ].filter(Boolean),
        actions: [
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "region_unavailable":
      return {
        title: `${model} unavailable in this region`,
        body: [
          `⚠  ${model} is not available in the configured region for "${providerId}".`,
          message ? `   Detail: ${message}` : "",
        ].filter(Boolean),
        actions: [
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "rate_limited":
      return {
        title: `Rate limited on ${providerId}`,
        body: [
          `⏳ ${providerId} is rate-limiting ${model}.`,
          message ? `   Detail: ${message}` : "",
          "",
          "You can retry in a moment, or downgrade to a less-loaded tier.",
        ].filter(Boolean),
        actions: [
          { key: "r", label: "Retry", action: { type: "retry" } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    case "network_error":
      return {
        title: `Network error reaching ${providerId}`,
        body: [
          `⚠  Could not reach "${providerId}".`,
          message ? `   Detail: ${message}` : "",
          "",
          "Check your connection and try again.",
        ].filter(Boolean),
        actions: [
          { key: "r", label: "Retry", action: { type: "retry" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };

    default:
      return {
        title: `Preflight failed for ${providerId}:${model}`,
        body: [
          message ?? "An unknown error occurred during preflight.",
        ],
        actions: [
          { key: "r", label: "Retry", action: { type: "retry" } },
          { key: "d", label: "Downgrade tier", action: { type: "downgrade" } },
          { key: "esc", label: "Cancel", action: { type: "cancel" } },
        ],
      };
  }
}
