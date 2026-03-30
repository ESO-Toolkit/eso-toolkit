# MCP Servers

Custom Model Context Protocol servers for the ESO Log Aggregator project. These provide structured, validated tool interfaces that replace raw Bash commands for common agent operations.

## Servers

| Server | ID | Tools | Purpose |
|--------|-----|-------|---------|
| **github-server** | `eso-logs-github` | 6 | PR lifecycle: list, view, create PRs; review threads |
| **ci-server** | `eso-logs-ci` | 5 | CI triage: list runs, view details, fetch/search logs, rerun |
| **worktree-server** | `eso-logs-worktree` | 7 | Worktree management: list, create, run, guard, push, status, diff |

## Configuration

Servers are registered in three locations for cross-client support:

| Client | Config File | Env Var Syntax |
|--------|------------|----------------|
| Claude Code CLI | `.claude/mcp.json` | `${VAR:-}` |
| VS Code | `.vscode/mcp.json` | `${env:VAR}` |
| GitHub Copilot | `.github/copilot/mcp.json` | `${VAR}` |

## Running a Server

All servers run directly via tsx (no build step):

```bash
node --import tsx tools/mcp/<server-name>/src/index.ts
```

## Authentication

**github-server** and **ci-server** resolve GitHub tokens via:
1. `GH_TOKEN` environment variable
2. `GITHUB_TOKEN` environment variable
3. `gh auth token` CLI fallback

## Adding a New Server

1. Create `tools/mcp/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Use `McpServer` from `@modelcontextprotocol/sdk` with Zod schemas
3. Import shared utilities from `_shared/` (types.ts, github-api.ts)
4. Register in all three config files (`.claude/mcp.json`, `.vscode/mcp.json`, `.github/copilot/mcp.json`)
5. Add tool permissions to `.claude/settings.json`
