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

## Cross-Client Parity

All three config files **must** register the same servers. Each client uses a different env var syntax and top-level key:

| Client | Top-level key | Env var example |
|--------|--------------|-----------------|
| Claude Code CLI | `mcpServers` | `"${GH_TOKEN:-}"` |
| VS Code | `servers` | `"${env:GH_TOKEN}"` |
| GitHub Copilot | `servers` | `"${GH_TOKEN}"` |

When adding or modifying a server, update **all three files** and verify parity with the [mcp-gaps skill](../../.agents/skills/mcp-gaps/SKILL.md).

## Adding a New Server

1. Create `tools/mcp/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Use `McpServer` from `@modelcontextprotocol/sdk` with Zod schemas
3. Import shared utilities from `_shared/` (types.ts, github-api.ts)
4. Register in all three config files (`.claude/mcp.json`, `.vscode/mcp.json`, `.github/copilot/mcp.json`)
5. Add tool permissions to `.claude/settings.json`
6. Update agent skills that cover the same operations to reference the MCP tool as preferred

## Security

- **Never** hardcode tokens or secrets in server source or config files
- Use environment variables for all authentication (GH_TOKEN, GITHUB_TOKEN)
- Token values are automatically redacted from error messages in `_shared/github-api.ts`
- The worktree-server refuses to run commands in the main repo when worktrees exist
- The worktree-server refuses to push `main` or `master` branches
