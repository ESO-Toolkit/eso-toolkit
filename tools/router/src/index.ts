#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { loadConfig } from "./config/load.js";
import { KeyringCredentialStore } from "./credentials/keyring-store.js";
import { MemoryCredentialStore } from "./credentials/memory-store.js";
import type { CredentialStore } from "./credentials/store.js";
import { PreflightCache } from "./dispatch/preflight.js";
import "./providers/index.js"; // self-registers built-in providers
import { resolveProviders } from "./providers/resolve.js";
import { JsonlLogger } from "./telemetry/jsonl-logger.js";
import { createDefaultRegistry } from "./tools/index.js";
import { App } from "./tui/App.js";
import {
  authDoctor,
  authLogin,
  authLogout,
  authStatus,
  type AuthCommandDeps,
} from "./auth/commands.js";
import { runInit } from "./commands/init.js";
import { analyzeCost, printCostReport } from "./commands/cost.js";
import { ConfigError, RouterError } from "./types.js";

/**
 * CLI entrypoint. Wires commander subcommands to the core modules:
 *
 *   router                → interactive TUI
 *   router run "prompt"   → one-shot TUI seeded with a prompt
 *   router init           → scaffold a router.config.ts at cwd
 *   router auth login     → device/api-key auth for a provider
 *   router auth status    → show stored credentials
 *   router auth logout    → delete stored credential
 *   router auth doctor    → probe every configured tier
 *
 * Environment:
 *   ROUTER_NO_KEYRING=1  → in-memory credential store (tests, CI)
 *   ROUTER_NO_PROMPT=1   → fail fast on interactive prompts (CI mode)
 *   ROUTER_DEBUG=1       → print stack traces on errors
 */

async function buildDeps(): Promise<{
  deps: AuthCommandDeps;
  logger: JsonlLogger;
  configPath: string;
}> {
  const { config, filepath } = await loadConfig();
  const providers = resolveProviders(config);
  const store: CredentialStore =
    process.env.ROUTER_NO_KEYRING === "1"
      ? new MemoryCredentialStore()
      : new KeyringCredentialStore();
  const cache = PreflightCache.default();
  const logger = JsonlLogger.default();
  return {
    deps: { config, providers, store, cache },
    logger,
    configPath: filepath,
  };
}

function handleError(err: unknown): never {
  if (err instanceof ConfigError) {
    console.error("\x1b[31mConfiguration error:\x1b[0m");
    console.error(err.message);
    process.exit(2);
  }
  if (err instanceof RouterError) {
    console.error(`\x1b[31m${err.code}:\x1b[0m ${err.message}`);
    process.exit(3);
  }
  if (err instanceof Error) {
    console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
    if (process.env.ROUTER_DEBUG === "1") console.error(err.stack);
    process.exit(1);
  }
  console.error("Unknown error:", err);
  process.exit(1);
}

function isCiMode(): boolean {
  return process.env.ROUTER_NO_PROMPT === "1";
}

interface RunOptions {
  tier?: string;
  requireTier?: string;
  allowDowngrade?: boolean;
  noDowngrade?: boolean;
}

function renderApp(
  deps: AuthCommandDeps,
  logger: JsonlLogger,
  initialPrompt: string | undefined,
  opts: RunOptions,
): ReturnType<typeof render> {
  const downgradePolicy = opts.noDowngrade
    ? "never"
    : opts.allowDowngrade
      ? "auto"
      : isCiMode()
        ? "never"
        : "ask";
  return render(
    React.createElement(App, {
      config: deps.config,
      providers: deps.providers,
      store: deps.store,
      cache: deps.cache,
      logger,
      tools: createDefaultRegistry(),
      initialPrompt,
      forcedTier: opts.tier,
      requireTier: opts.requireTier,
      downgradePolicy,
      ciMode: isCiMode(),
    }),
  );
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("router")
    .description(
      "Agentic model router with TUI, device auth, and runtime escalation",
    )
    .version("0.1.0");

  // `router init`
  program
    .command("init")
    .description("Scaffold a router.config.ts in the current directory")
    .option("--force", "Overwrite an existing router.config.ts")
    .action((opts: { force?: boolean }) => {
      runInit({ force: opts.force });
    });

  // `router cost`
  program
    .command("cost")
    .description("Analyze JSONL telemetry and report cost vs counterfactuals")
    .option("--since <date>", "Earliest day to include (YYYY-MM-DD)")
    .option("--until <date>", "Latest day to include (YYYY-MM-DD)")
    .option("--top <n>", "Top N most expensive envelopes to show", "10")
    .option("--json", "Emit a machine-readable JSON report instead of a table")
    .action(
      async (opts: {
        since?: string;
        until?: string;
        top?: string;
        json?: boolean;
      }) => {
        try {
          const { deps } = await buildDeps();
          const report = analyzeCost({
            config: deps.config,
            since: opts.since,
            until: opts.until,
            topN: opts.top ? parseInt(opts.top, 10) : 10,
          });
          if (opts.json) {
            console.log(JSON.stringify(report, null, 2));
          } else {
            printCostReport(report);
          }
        } catch (err) {
          handleError(err);
        }
      },
    );

  // Default command: interactive TUI
  program
    .command("tui", { isDefault: true })
    .description("Launch the interactive TUI")
    .argument("[prompt...]", "Optional initial prompt")
    .option("--tier <name>", "Force a specific tier")
    .option("--require-tier <name>", "Fail if the given tier is unauthorized")
    .option("--allow-downgrade", "Silently downgrade on auth failures")
    .option("--no-downgrade", "Never downgrade; hard-fail on auth failures")
    .action(async (promptWords: string[], opts: RunOptions) => {
      try {
        const { deps, logger } = await buildDeps();
        const initialPrompt = promptWords.length
          ? promptWords.join(" ")
          : undefined;
        const { waitUntilExit } = renderApp(deps, logger, initialPrompt, opts);
        await waitUntilExit();
      } catch (err) {
        handleError(err);
      }
    });

  // `router run "..."`
  program
    .command("run")
    .description("Run a one-shot prompt")
    .argument("<prompt...>", "Prompt to dispatch")
    .option("--tier <name>", "Force a specific tier")
    .option("--require-tier <name>", "Fail if the given tier is unauthorized")
    .option("--allow-downgrade", "Silently downgrade on auth failures")
    .option("--no-downgrade", "Never downgrade; hard-fail on auth failures")
    .action(async (promptWords: string[], opts: RunOptions) => {
      try {
        const { deps, logger } = await buildDeps();
        const { waitUntilExit } = renderApp(
          deps,
          logger,
          promptWords.join(" "),
          opts,
        );
        await waitUntilExit();
      } catch (err) {
        handleError(err);
      }
    });

  // `router auth <subcommand>`
  const auth = program.command("auth").description("Manage provider credentials");

  auth
    .command("login")
    .description("Authenticate a provider")
    .option("--provider <id>", "Provider id (from router.config.ts)")
    .action(async (opts: { provider?: string }) => {
      try {
        const { deps } = await buildDeps();
        if (isCiMode() && !opts.provider) {
          throw new Error(
            "ROUTER_NO_PROMPT is set; --provider is required in CI mode.",
          );
        }
        const providerId =
          opts.provider ??
          (await pickProviderInteractively([...deps.providers.keys()]));
        await authLogin(providerId, deps);
      } catch (err) {
        handleError(err);
      }
    });

  auth
    .command("logout")
    .description("Remove a stored credential")
    .requiredOption("--provider <id>", "Provider id")
    .action(async (opts: { provider: string }) => {
      try {
        const { deps } = await buildDeps();
        await authLogout(opts.provider, deps);
      } catch (err) {
        handleError(err);
      }
    });

  auth
    .command("status")
    .description("Show credential status for all providers")
    .action(async () => {
      try {
        const { deps } = await buildDeps();
        await authStatus(deps);
      } catch (err) {
        handleError(err);
      }
    });

  auth
    .command("doctor")
    .description("Probe every configured tier and report authorization")
    .action(async () => {
      try {
        const { deps } = await buildDeps();
        await authDoctor(deps);
      } catch (err) {
        handleError(err);
      }
    });

  await program.parseAsync(process.argv);
}

async function pickProviderInteractively(ids: string[]): Promise<string> {
  if (ids.length === 0) throw new Error("No providers configured.");
  if (ids.length === 1) return ids[0]!;
  console.log("Configured providers:");
  ids.forEach((id, i) => console.log(`  [${i + 1}] ${id}`));
  process.stdout.write("Pick a number: ");
  const answer = await new Promise<string>((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });
  const idx = parseInt(answer, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= ids.length) {
    throw new Error("Invalid selection.");
  }
  return ids[idx]!;
}

main().catch(handleError);
