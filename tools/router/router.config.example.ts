import { defineConfig } from "./src/config/defineConfig.js";

/**
 * Example router configuration. Copy to `router.config.ts` at your repo
 * root and customize. Every field except `tiers` has sensible defaults.
 *
 * Run `router auth login --provider anthropic` before the first task.
 */
export default defineConfig({
  rubricVersion: "1",

  providers: {
    anthropic: {
      kind: "anthropic-api",
    },
    // Example: OAuth device-flow provider. Fill in real endpoint URLs and
    // client id for your identity provider before using.
    // claude: {
    //   kind: "oauth-device",
    //   options: {
    //     deviceAuthorizationUrl: "https://auth.example.com/oauth/device/code",
    //     tokenUrl: "https://auth.example.com/oauth/token",
    //     clientId: "router-cli",
    //     scope: "messages:read messages:write",
    //     apiBaseURL: "https://api.anthropic.com",
    //   },
    // },
  },

  tiers: {
    fast: {
      provider: "anthropic",
      model: "claude-haiku-4-5",
      maxTokens: 8_000,
      description: "trivial reads, lookups, formatting",
    },
    default: {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      maxTokens: 32_000,
      description: "normal coding work",
    },
    deep: {
      provider: "anthropic",
      model: "claude-opus-4-6",
      maxTokens: 200_000,
      description: "architecture, hard bugs, research",
    },
  },

  defaultTier: "default",

  heuristics: [
    {
      name: "trivial-reads",
      when: { promptTokens: { lt: 200 }, verbClass: "read" },
      tier: "fast",
    },
    {
      name: "wide-file-impact",
      when: { fileGlobBreadth: { gt: 20 } },
      tier: "deep",
    },
    {
      name: "design-keywords",
      when: {
        keywords: ["refactor", "architecture", "migrate", "design", "rewrite"],
      },
      tier: "deep",
    },
    {
      name: "mechanical-edits",
      when: { keywords: ["typo", "rename", "format"] },
      tier: "fast",
    },
  ],

  triage: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    minConfidence: 0.6,
  },

  weights: {
    ambiguity: 0.35,
    multiFileEdits: 0.25,
    reasoningDepth: 0.2,
    codebaseExplore: 0.1,
    promptLength: 0.1,
  },

  escalation: {
    enabled: true,
    triggers: {
      validationFailures: 2,
      toolLoopThreshold: 5,
      selfDoubt: true,
    },
    maxBumps: 2,
  },

  budgets: {
    perTask: { usd: 2.0, toolCalls: 50 },
    perSession: { usd: 20.0 },
  },

  fallback: {
    deep: ["default"],
  },

  project: {
    rootGlobs: ["src/**", "scripts/**"],
    excludeGlobs: ["**/*.generated.*", "**/node_modules/**"],
    contextFiles: ["AGENTS.md"],
  },
});
