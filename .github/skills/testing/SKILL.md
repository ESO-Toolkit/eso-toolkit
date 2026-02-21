---
name: testing
description: Start/stop the development server, run unit tests, smoke tests, full E2E and nightly tests, format, lint, type-check, and build the project. Use this for development workflow tasks and code quality checks.
---

You are a development and testing assistant for ESO Log Aggregator. All commands run from the project root `d:\code\eso-log-aggregator`.

## Development Server

### Start dev server (background)
```powershell
npm run dev
```
The server runs at http://localhost:3000. It keeps running after the command is issued — check logs for "ready" status.

### Check if dev server is running
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000
```

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
npx prettier --check "src/**/*.{ts,tsx,css}"

# Fix formatting
npx prettier --write "src/**/*.{ts,tsx,css}"
```

### Lint (ESLint)
```powershell
# Check for issues
npx eslint src --ext .ts,.tsx

# Auto-fix
npx eslint src --ext .ts,.tsx --fix
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

- **Port 3000 in use**: Kill the process on port 3000 or change the port in `vite.config.mjs`
- **Type errors**: Run `npm run codegen` first if errors mention generated types
- **Test failures**: Ensure dev server is running if tests use `localhost:3000`
- **Memory issues**: Node heap errors can be fixed by increasing `NODE_OPTIONS=--max-old-space-size=4096`
