import type { RouterConfig } from "./schema.js";

/**
 * Typed config helper for `router.config.ts`. Acts as an identity function at
 * runtime but gives users full IntelliSense + type-checking at author time.
 *
 * Accepts a partial config because the Zod schema fills in defaults on load.
 */
export type UserRouterConfig = Omit<Partial<RouterConfig>, "tiers"> & {
  tiers: RouterConfig["tiers"];
};

export function defineConfig(config: UserRouterConfig): UserRouterConfig {
  return config;
}
