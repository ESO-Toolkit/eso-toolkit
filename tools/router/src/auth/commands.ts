import { render } from "ink";
import React from "react";
import type { RouterConfig } from "../config/schema.js";
import type { CredentialStore } from "../credentials/store.js";
import { PreflightCache, preflight } from "../dispatch/preflight.js";
import { AuthFlow } from "../tui/components/AuthFlow.js";
import type { Credential, Provider } from "../types.js";

/**
 * `router auth` subcommand implementations. Each function is independent of
 * the main TUI — they render their own Ink app for the duration of the
 * operation and exit cleanly. This keeps `router auth login` usable as a
 * one-shot even when the user doesn't want the full interactive TUI.
 */

export interface AuthCommandDeps {
  config: RouterConfig;
  providers: Map<string, Provider>;
  store: CredentialStore;
  cache: PreflightCache;
}

export async function authLogin(
  providerId: string,
  deps: AuthCommandDeps,
): Promise<void> {
  const provider = deps.providers.get(providerId);
  if (!provider) {
    throw new Error(
      `Unknown provider "${providerId}". Configured: ${[...deps.providers.keys()].join(", ")}`,
    );
  }

  await new Promise<void>((resolve, reject) => {
    const { unmount } = render(
      React.createElement(AuthFlow, {
        provider,
        onComplete: async (event) => {
          const credential = (event as { credential: Credential }).credential;
          await deps.store.set(providerId, credential);
          deps.cache.invalidate(providerId);
          unmount();
          resolve();
        },
        onCancel: () => {
          unmount();
          reject(new Error("Authentication cancelled."));
        },
        onError: (message) => {
          unmount();
          reject(new Error(message));
        },
      }),
    );
  });
}

export async function authLogout(
  providerId: string,
  deps: AuthCommandDeps,
): Promise<void> {
  const provider = deps.providers.get(providerId);
  if (provider?.logout) {
    const credential = await deps.store.get(providerId);
    if (credential) {
      try {
        await provider.logout(credential);
      } catch {
        // Server-side logout is best-effort.
      }
    }
  }
  await deps.store.delete(providerId);
  deps.cache.invalidate(providerId);
  console.log(`✓ Logged out of "${providerId}".`);
}

export async function authStatus(deps: AuthCommandDeps): Promise<void> {
  const stored = await deps.store.list();
  const configured = [...deps.providers.keys()];
  const all = new Set([...stored, ...configured]);

  if (all.size === 0) {
    console.log("No providers configured.");
    return;
  }

  console.log("Providers:");
  for (const id of [...all].sort()) {
    const provider = deps.providers.get(id);
    const credential = await deps.store.get(id);
    const status = !provider
      ? "✗ not in config"
      : !credential
        ? "✗ no credential"
        : credential.expiresAt && credential.expiresAt < Date.now()
          ? "⚠ expired"
          : "✓ authenticated";
    const strategy = provider?.authStrategy ?? "?";
    console.log(`  ${id.padEnd(20)} ${status.padEnd(20)} (${strategy})`);
  }
}

export async function authDoctor(deps: AuthCommandDeps): Promise<void> {
  console.log("Running auth doctor...\n");
  let failures = 0;

  for (const [tierName, tier] of Object.entries(deps.config.tiers)) {
    const provider = deps.providers.get(tier.provider);
    if (!provider) {
      console.log(`✗ tier "${tierName}" → provider "${tier.provider}" not instantiated`);
      failures += 1;
      continue;
    }
    const result = await preflight({
      provider,
      model: tier.model,
      store: deps.store,
      cache: deps.cache,
    });
    if (result.result.ok) {
      console.log(
        `✓ tier "${tierName}" → ${tier.provider}:${tier.model} authorized`,
      );
    } else {
      console.log(
        `✗ tier "${tierName}" → ${tier.provider}:${tier.model}: ${result.result.reason} (${result.result.message ?? "no detail"})`,
      );
      failures += 1;
    }
  }

  console.log(
    `\n${failures === 0 ? "✓ all tiers authorized" : `✗ ${failures} tier(s) unauthorized`}`,
  );
  if (failures > 0) process.exitCode = 1;
}
