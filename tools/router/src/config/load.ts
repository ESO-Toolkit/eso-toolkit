import { cosmiconfig } from "cosmiconfig";
import { TypeScriptLoader } from "cosmiconfig-typescript-loader";
import { ConfigError } from "../types.js";
import { RouterConfigSchema, type RouterConfig } from "./schema.js";

const MODULE_NAME = "router";

/**
 * Discover and validate a `router.config.{ts,js,mjs,json}` file starting from
 * the provided directory (or cwd). Returns the parsed, defaulted config.
 *
 * Throws ConfigError with a helpful message if:
 *   - No config file is found (rather than silently using defaults, we require
 *     explicit opt-in so users know where the behavior is coming from).
 *   - The config fails Zod validation.
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<{
  config: RouterConfig;
  filepath: string;
}> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      "router.config.ts",
      "router.config.mts",
      "router.config.js",
      "router.config.mjs",
      "router.config.cjs",
      "router.config.json",
      ".routerrc",
      ".routerrc.json",
      ".routerrc.yaml",
      ".routerrc.yml",
      "package.json",
    ],
    loaders: {
      ".ts": TypeScriptLoader(),
      ".mts": TypeScriptLoader(),
    },
  });

  const result = await explorer.search(cwd);

  if (!result || result.isEmpty) {
    throw new ConfigError(
      "No router.config.{ts,js,json} found. Create one at your repo root, or run `router init` to scaffold a starter.",
      { searchedFrom: cwd },
    );
  }

  const parsed = RouterConfigSchema.safeParse(result.config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ConfigError(
      `Invalid router config at ${result.filepath}:\n${issues}`,
      { filepath: result.filepath, issues: parsed.error.issues },
    );
  }

  validateReferences(parsed.data, result.filepath);

  return { config: parsed.data, filepath: result.filepath };
}

/**
 * Cross-field validation that Zod can't express easily: every tier must refer
 * to a provider that actually exists in config.providers, the defaultTier must
 * exist, and fallback chain entries must point at real tiers/providers.
 */
function validateReferences(config: RouterConfig, filepath: string): void {
  const errors: string[] = [];

  if (!config.tiers[config.defaultTier]) {
    errors.push(
      `defaultTier "${config.defaultTier}" is not defined in tiers.`,
    );
  }

  for (const [tierName, tier] of Object.entries(config.tiers)) {
    if (!config.providers[tier.provider]) {
      errors.push(
        `tiers.${tierName}.provider "${tier.provider}" is not defined in providers.`,
      );
    }
  }

  for (const [tierName, chain] of Object.entries(config.fallback)) {
    if (!config.tiers[tierName]) {
      errors.push(`fallback.${tierName}: source tier does not exist.`);
    }
    for (const entry of chain) {
      // Fallback entries are either "provider:model" or a tier name.
      if (entry.includes(":")) continue;
      if (!config.tiers[entry]) {
        errors.push(
          `fallback.${tierName}: entry "${entry}" is neither a tier nor a provider:model pair.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new ConfigError(
      `Invalid router config at ${filepath}:\n${errors.map((e) => "  • " + e).join("\n")}`,
      { filepath, errors },
    );
  }
}
