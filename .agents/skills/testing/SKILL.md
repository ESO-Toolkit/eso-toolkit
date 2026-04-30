---
name: testing
description: Start/stop the development server, run unit tests, smoke tests, full E2E and nightly tests, format, lint, type-check, and build the project. Use this for development workflow tasks and code quality checks.
---

You are a development and testing assistant for ESO Log Aggregator. All commands run from the project root `d:\code\eso-log-aggregator`.

## Development Server

### Worktree Port Mapping

Each worktree has a dedicated port based on its directory name:

| Directory Pattern | HTTP Port | HTTPS Port |
|-------------------|-----------|------------|
| main worktree | 3000 | 3001 |
| `eso-log-aggregator-worktrees\*` (worktree 1) | 3002 | 3003 |
| `eso-log-aggregator-worktrees\*` (worktree 2) | 3004 | 3005 |
| `eso-log-aggregator-worktrees\*` (worktree 3) | 3006 | 3007 |
| `eso-log-aggregator-worktrees\*` (worktree 4) | 3008 | 3009 |

To determine the correct port for the current worktree, use the worktree slot:
- **Main worktree** (`D:\code\eso-log-aggregator`): port 3000 (default, no `PORT` env var needed)
- **Feature worktrees** (under `D:\code\eso-log-aggregator-worktrees\`): use the next available even port (3002, 3004, 3006, 3008)

### Start dev server (background)

```powershell
# Main worktree (port 3000 — the default)
npm run dev

# Any other worktree — set the PORT env var first
$env:PORT = "3002" ; npm run dev
```

> **Important**: Always determine the correct port for the current worktree before starting. Do not start on port 3000 from a non-main worktree — it may collide with the main worktree's server.

### Check if dev server is running for THIS worktree

When asked "is a dev server running?" in a worktree context, do **not** just check if any server is running. Instead, check whether a dev server is running **for the current working directory**:

```powershell
# Step 1: Determine the expected port for this worktree
$cwd = (Get-Location).Path
if ($cwd -match 'eso-log-aggregator$') {
    $expectedPort = 3000  # main worktree
} else {
    # For feature worktrees, check which port slot is in use
    # List all Vite/node dev servers and match by working directory
    $expectedPort = $null
}

# Step 2: Find Vite/node processes serving THIS directory
$devServers = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'vite' } |
    Select-Object ProcessId, CommandLine

foreach ($proc in $devServers) {
    # Check if the process was started from the current worktree directory
    if ($proc.CommandLine -match [regex]::Escape($cwd)) {
        Write-Host "Dev server running for THIS worktree (PID: $($proc.ProcessId))"
        # Extract the port from the process or check netstat
        netstat -ano | findstr $proc.ProcessId | findstr LISTENING
    }
}

# Step 3: If no match found by CommandLine, check known ports
if (-not $devServers) {
    # Check all worktree ports
    $ports = @(3000, 3002, 3004, 3006, 3008)
    foreach ($port in $ports) {
        $result = netstat -ano | findstr ":$port " | findstr LISTENING
        if ($result) {
            $pid = ($result -split '\s+')[-1]
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
            if ($proc -and $proc.CommandLine -match [regex]::Escape($cwd)) {
                Write-Host "Dev server for THIS worktree at port $port (PID: $pid)"
            } else {
                Write-Host "Port $port in use by a DIFFERENT worktree (PID: $pid)"
            }
        }
    }
}
```

**Key principle**: Always report which worktree a running dev server belongs to. A server on port 3000 started from the main worktree is **not** the server for a feature worktree under `eso-log-aggregator-worktrees\`.

### Stop dev server
Kill the process using the PID found from the above command, or press Ctrl+C if running interactively.

## Unit Tests (Jest)

```powershell
# Run tests for changed files
npm test

# Run all unit tests
npm test -- --watchAll=false

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/utils/myUtil.test.ts --watchAll=false
```

Coverage report is generated in `coverage/`.

## E2E Tests (Playwright)

```powershell
# Smoke tests — fastest, tests critical paths
npx playwright test --config=playwright/smoke.config.ts --reporter=line

# Full suite
npx playwright test --config=playwright/full.config.ts --reporter=line

# Nightly — comprehensive, slow
npx playwright test --config=playwright/nightly.config.ts --reporter=line

# Specific browser only
npx playwright test --config=playwright/smoke.config.ts --project=chromium-desktop --reporter=line
```

**Note**: Nightly tests require `tests/auth-state.json`. Generate it with:
```powershell
npm run test:nightly:all  # runs once to create auth state
```

## Code Quality

### Format (Prettier)
```powershell
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Lint (ESLint)
```powershell
# Check for issues
npm run lint

# Auto-fix
npm run lint:fix
```

### TypeScript Type Check
```powershell
npm run typecheck
```

### Run All Validations (pre-commit)
```powershell
npm run validate
```
This runs typecheck + lint + format check in sequence.

## Build

```powershell
# Production build
npm run build
```

Output goes to `dist/`. Build errors will appear in the terminal output.

## GraphQL Code Generation

When GraphQL schema or queries change, regenerate types:
```powershell
npm run codegen
```

## Bundle Analysis

```powershell
npm run analyze
```
Opens an interactive bundle visualization.

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm test` | Unit tests (watch mode) |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run validate` | typecheck + lint + format check |
| `npm run typecheck` | TypeScript compiler check |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run build` | Production build |
| `npm run codegen` | Generate GraphQL types |

## Troubleshooting

- **Port in use**: Determine which worktree owns the port using `Get-CimInstance Win32_Process` (see "Check if dev server is running" above). Then either kill the process or use the next worktree port slot (`$env:PORT = "3002" ; npm run dev`). Use `netstat -ano | findstr :<port>` then `taskkill /PID <PID> /F` to kill a specific process.
- **Type errors**: Run `npm run codegen` first if errors mention generated types
- **Test failures**: Playwright configs auto-start the dev server via `webServer` — manual startup is only needed for the `debug` config
- **Memory issues**: Node heap errors during lint/storybook can be fixed by increasing `--max-old-space-size` in package.json (currently 4096 for lint, 8192 for builds)
