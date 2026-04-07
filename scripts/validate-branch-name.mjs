#!/usr/bin/env node
// PreToolUse hook for Claude Code: enforces repo branch naming conventions.
//
// Reads the standard hook JSON payload from stdin, looks for git commands that
// create a new branch (`git checkout -b`, `git switch -c`, `git branch <name>`),
// and rejects any branch name that does not match the allowed patterns:
//
//   ESO-<digits>/<kebab-case>     e.g. ESO-569/fix-scribing-resource-events
//   claude/<kebab-case>           fallback for exploratory / non-ticket work
//
// Exit codes:
//   0 — allow the tool call
//   2 — block the tool call (stderr is shown to Claude so it can self-correct)

import { readFileSync } from "node:fs";

const ALLOWED = /^(ESO-\d+|claude)\/[a-z0-9][a-z0-9-]*$/;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function extractBranchName(command) {
  // Normalize whitespace; ignore anything after a shell separator.
  const segments = command.split(/&&|\|\||;|\n/);
  for (const segment of segments) {
    const tokens = segment.trim().split(/\s+/);
    if (tokens[0] !== "git") continue;

    // git checkout -b <name>  |  git switch -c <name>
    const sub = tokens[1];
    if (sub === "checkout" || sub === "switch") {
      const flagIdx = tokens.findIndex((t) => t === "-b" || t === "-c" || t === "-B" || t === "-C");
      if (flagIdx !== -1 && tokens[flagIdx + 1]) {
        return { command: segment.trim(), name: tokens[flagIdx + 1] };
      }
      continue;
    }

    // git branch <name> [<start-point>] — only when creating, not listing/deleting.
    if (sub === "branch") {
      const rest = tokens.slice(2).filter((t) => !t.startsWith("-"));
      const hasDestructiveFlag = tokens.some((t) =>
        ["-d", "-D", "-m", "-M", "-l", "--list", "--delete", "--move", "--show-current"].includes(t),
      );
      if (!hasDestructiveFlag && rest.length >= 1) {
        return { command: segment.trim(), name: rest[0] };
      }
    }
  }
  return null;
}

const raw = readStdin();
if (!raw) process.exit(0);

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const command = payload?.tool_input?.command;
if (typeof command !== "string") process.exit(0);

const found = extractBranchName(command);
if (!found) process.exit(0);

if (ALLOWED.test(found.name)) process.exit(0);

process.stderr.write(
  `Branch name "${found.name}" does not match the eso-toolkit naming convention.\n\n` +
    `Required pattern: ESO-<number>/<kebab-case-description>\n` +
    `  e.g. ESO-569/fix-scribing-resource-events\n\n` +
    `Fallback (no Jira ticket): claude/<kebab-case-description>\n` +
    `  e.g. claude/refactor-worker-pool\n\n` +
    `Rules:\n` +
    `  - lowercase letters, digits, and hyphens only after the slash\n` +
    `  - no underscores, spaces, or uppercase\n` +
    `  - prefer the ESO-<ticket> form whenever a Jira ticket exists\n\n` +
    `See AGENTS.md → "Branch Naming Convention".\n`,
);
process.exit(2);
