---
name: troubleshoot
description: 'Quick-reference fixes for common dev environment issues: module not found errors, port conflicts, GraphQL type staleness, build failures, and complete reset procedures.'
---

# Skill: Troubleshooting

## Overview

Quick-reference fixes for common development environment issues in ESO Log Aggregator.

## Quick Issue → Fix Lookup

| Problem                              | Fix                                              |
| ------------------------------------ | ------------------------------------------------ |
| GraphQL type errors / stale types    | `npm run codegen`                                |
| TypeScript errors                    | `npm run typecheck` then see fix-types skill     |
| ESLint errors                        | `npm run lint:fix` then see fix-lint skill       |
| Port in use                          | Kill process or use next worktree port slot (see below) |
| Module not found                     | Delete `node_modules/`, run `npm ci`             |
| Build fails                          | `npm run build` — check error output             |
| Test failures                        | `npm test -- --watchAll=false`                   |
| Playwright browser missing           | `npx playwright install`                         |
| `acli` or `twig` not found           | Refresh PATH (see below), or use plain git fallbacks for twig |
| Memory issues (OOM)                  | Increase NODE_OPTIONS in package.json            |
| Vite cache stale                     | Delete `.vite/` and restart dev server           |

---

## By Error Type

### GraphQL / Generated Type Errors

```powershell
# Regenerate GraphQL types
npm run codegen

# Then verify types
npm run typecheck
```

### TypeScript Errors

1. Run `npm run typecheck` to see all errors
2. If generated types are stale: `npm run codegen`
3. For other errors: see [fix-types skill](../fix-types/SKILL.md)

### Linting Errors

1. `npm run lint:fix` — auto-fixes ~80%
2. For remaining errors: see [fix-lint skill](../fix-lint/SKILL.md)

### Test Failures

1. Read the failure message carefully
2. If implementation changed intentionally, update the test
3. For scribing tests: `npm run test:scribing`
4. For full coverage: `npm run test:coverage`

### Build Failures

```powershell
# Try a clean build
npm run build

# If module errors, reinstall
Remove-Item -Recurse -Force node_modules
npm ci
npm run build
```

### Port Already in Use

```powershell
# Option 1: Use the next worktree port slot
$env:PORT = "3002" ; npm run dev

# Option 2: Kill the process on the occupied port
netstat -ano | findstr :<port>
taskkill /PID <PID> /F
```

See [.claude-rules.md](../../.claude-rules.md) for the full worktree port allocation table (3000–3009).

### Playwright Browser Issues

```powershell
# Install/reinstall Playwright browsers
npx playwright install

# Install with system dependencies (Linux/CI)
npx playwright install --with-deps
```

### PATH Issues (`acli`, `twig` not found)

```powershell
# Refresh PATH in current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Vite Cache Issues

```powershell
# Clear Vite cache
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
npm run dev
```

---

## Complete Reset (Nuclear Option)

When nothing else works:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
npm ci
npm run codegen
npm run build
```

---

## CI Failures

```powershell
# View CI logs
gh run list --branch (git branch --show-current) --limit 5
gh run view <run-id> --log-failed

# Re-run failed jobs
gh run rerun <run-id> --failed
```

See [debug-ci-failure skill](../debug-ci-failure/SKILL.md) for detailed CI debugging.

## Git / Branch Issues

```powershell
# Check current state
git status
git branch

# View branch tree (twig with fallback)
twig tree 2>$null
if ($LASTEXITCODE -ne 0) {
    git config --get-regexp 'branch\..*\.parent'
    git log --oneline --graph --all --decorate --simplify-by-decoration
}

# Rebase onto main
git fetch origin
git rebase origin/main
```

See [rebase-conflicts skill](../rebase-conflicts/SKILL.md) for conflict resolution.

## Related Skills

- [fix-types](../fix-types/SKILL.md) — TypeScript error fixes
- [fix-lint](../fix-lint/SKILL.md) — ESLint error fixes
- [debug-ci-failure](../debug-ci-failure/SKILL.md) — CI debugging
- [testing](../testing/SKILL.md) — Running tests
- [rebase-conflicts](../rebase-conflicts/SKILL.md) — Rebase conflict resolution
