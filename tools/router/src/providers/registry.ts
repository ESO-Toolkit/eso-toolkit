import type { Provider } from "../types.js";
import { RouterError } from "../types.js";

/**
 * Plugin registry for providers. Built-in providers register themselves at
 * module load; third-party providers can register via `registerProvider()`
 * from a config hook (or a dedicated `plugins: [...]` entry once we add it).
 *
 * Kind vs id
 * ----------
 * `kind` identifies the plugin implementation ("anthropic-api", "bedrock").
 * `id` is the user-facing name in config.providers (e.g. "work", "claude").
 * A config may have multiple providers with the same kind but different ids
 * (e.g. two anthropic-api providers pointing at different gateways).
 */
export type ProviderFactory = (options: {
  id: string;
  baseURL?: string;
  region?: string;
  options?: Record<string, unknown>;
}) => Provider;

const factories = new Map<string, ProviderFactory>();

export function registerProvider(kind: string, factory: ProviderFactory): void {
  if (factories.has(kind)) {
    throw new RouterError(
      `Provider kind "${kind}" is already registered.`,
      "PROVIDER_DUPLICATE",
    );
  }
  factories.set(kind, factory);
}

export function getProviderFactory(kind: string): ProviderFactory {
  const factory = factories.get(kind);
  if (!factory) {
    throw new RouterError(
      `Unknown provider kind "${kind}". Registered kinds: ${[...factories.keys()].join(", ") || "(none)"}`,
      "PROVIDER_UNKNOWN",
      { kind },
    );
  }
  return factory;
}

export function listProviderKinds(): string[] {
  return [...factories.keys()].sort();
}

/** Test-only: clear the registry. Not exported from the package index. */
export function _resetRegistryForTests(): void {
  factories.clear();
}
