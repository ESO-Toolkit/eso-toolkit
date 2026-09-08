import type { RouterConfig } from "../config/schema.js";
import type { Provider } from "../types.js";
import { ConfigError } from "../types.js";
import { getProviderFactory } from "./registry.js";

/**
 * Instantiate Provider objects from a validated RouterConfig. Called once at
 * startup and memoized — provider instances are long-lived for the session.
 */
export function resolveProviders(
  config: RouterConfig,
): Map<string, Provider> {
  const providers = new Map<string, Provider>();
  for (const [id, providerConfig] of Object.entries(config.providers)) {
    try {
      const factory = getProviderFactory(providerConfig.kind);
      const provider = factory({
        id,
        baseURL: providerConfig.baseURL,
        region: providerConfig.region,
        options: providerConfig.options,
      });
      providers.set(id, provider);
    } catch (err) {
      throw new ConfigError(
        `Failed to instantiate provider "${id}" (kind=${providerConfig.kind}): ${
          err instanceof Error ? err.message : String(err)
        }`,
        { id, kind: providerConfig.kind },
      );
    }
  }
  return providers;
}
