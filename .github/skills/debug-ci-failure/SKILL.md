---
name: debug-ci-failure
description: 'End-to-end workflow for debugging failed GitHub Actions CI runs: identify the failed stage, fetch logs, locate the root cause, reproduce locally, fix, and re-verify. Use when a CI run fails on a PR or branch.'
---

# Skill: Debug a Failed GitHub Actions Run

## Overview

Step-by-step playbook for triaging and fixing a failed CI run in ESO Log Aggregator. The CI pipeline (`pr-checks.yml`) has parallel jobs — a failure in any job blocks the PR. This skill walks through identifying which job failed, pulling the right logs, finding the root cause, and driving to a fix.

## When to Use

- A GitHub Actions CI run failed on your PR or branch
- `gh pr checks` shows a failing status
- You need to understand **why** CI failed and how to fix it
- A merge-queue run was rejected

## CRITICAL: Evidence-First Debugging

**NEVER guess at the problem.** Before attempting any fix, you MUST extract the actual error text from CI logs — the specific file, line number, error code, or message that identifies what went wrong.

**Insufficient evidence (DO NOT proceed with just this):**

- "The lint step failed" — _which rule? which file?_
- "There are TypeScript errors" — _which TS error code? which file/line?_
- "Unit tests failed" — _which test? what assertion? was it a config error upstream?_
- "The build failed" — _what error message?_

**Sufficient evidence (you need this before fixing):**

- `src/utils/helpers.ts(42,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`
- `src/components/App.tsx:17:3 error @typescript-eslint/no-floating-promises: Promises must be awaited`
- `FAIL src/utils/helpers.test.ts — Expected: 42, Received: undefined`

## CI Pipeline Jobs (parallel)

| Job               | What It Does                                      | Local Command              |
| ----------------- | ------------------------------------------------- | -------------------------- |
| build             | Vite production build                             | `npm run build`            |
| lint              | ESLint checks                                     | `npm run lint`             |
| format            | Prettier formatting check                         | `npm run format:check`     |
| lint-skills       | Agent skill file validation                       | `python scripts/lint-skills.py` |
| test              | Jest unit tests + scribing E2E tests              | `npm run test:coverage:ci` |
| typecheck         | TypeScript compilation check                      | `npm run typecheck`        |
| build-storybook   | Storybook build validation                        | `npm run build-storybook`  |
| playwright-smoke  | Playwright E2E smoke tests                        | `npm run test:smoke:e2e`   |

## Steps

### 1. Find the failed run

```powershell
# List recent runs on the current branch
gh run list --branch (git branch --show-current) --limit 5

# Or check PR checks directly
gh pr checks
```

Note the `RUN_ID` of the failed run for subsequent commands.

### 2. Fetch failed logs and extract the actual error

```powershell
# Show only logs from failed steps (fastest)
gh run view RUN_ID --log-failed

# Save to a file for easier searching
gh run view RUN_ID --log-failed > scratch/ci-failed.txt

# If --log-failed is empty, fetch all logs
gh run view RUN_ID --log > scratch/ci-full.txt
```

**Your goal in this step is to find the exact error line(s).** Do not proceed until you can cite the specific error message, file path, line number, or error code from the logs.

### 3. Identify the root cause

**Most CI failures come from one of six categories.** Search in this order — earlier items are root causes that cascade into later symptoms.

#### 3a. Formatting failure

```powershell
gh run view RUN_ID --log-failed | Select-String "format:check|Formatting.*failed|Check formatting" -Context 3
```

**Fix locally:**

```powershell
npm run format
git add -A ; git commit -m "style: fix formatting"
```

#### 3b. Lint errors

```powershell
# Find the SPECIFIC errors with file, line, and rule name
gh run view RUN_ID --log-failed | Select-String "\d+:\d+\s+error" -Context 1
```

**Evidence you need:** The file path, line number, column, and ESLint rule name.

**Fix locally:**

```powershell
npm run lint:fix
```

Then manually resolve any errors that auto-fix cannot handle. See `skills/fix-lint/SKILL.md` for guidance on specific lint rules.

#### 3c. TypeScript type errors

```powershell
# Find the error code and message
gh run view RUN_ID --log-failed | Select-String "error TS\d+" -Context 3

# Get file path and line number
gh run view RUN_ID --log-failed | Select-String "\.tsx?\(\d+,\d+\): error" -Context 1
```

**Fix locally:**

```powershell
npm run typecheck
```

See `skills/fix-types/SKILL.md` for common patterns.

#### 3d. Unit test failures

```powershell
# Step 1: FIRST check for Node warnings above the failure (root cause)
gh run view RUN_ID --log-failed | Select-String "\(node:\d+\) Warning|Failed to load" -Context 5

# Step 2: Find which test suites failed
gh run view RUN_ID --log-failed | Select-String "FAIL.*\.test\.(ts|tsx)" -Context 5

# Step 3: Get the actual assertion or runtime error
gh run view RUN_ID --log-failed | Select-String "Expected:|Received:|Error:|thrown:" -Context 5
```

**IMPORTANT:** If tests fail, always check for Node warnings (step 1) _above_ the failure — the test may have failed because its config could not load. Fix the config issue, not the test.

**Fix locally:**

```powershell
npm test -- --watchAll=false
```

#### 3e. Build failures

```powershell
gh run view RUN_ID --log-failed | Select-String "ERROR|Error:|Module not found|Cannot find|BUILD FAILED" -Context 5
```

**Fix locally:**

```powershell
npm run build
```

#### 3f. Playwright smoke test failures

```powershell
gh run view RUN_ID --log-failed | Select-String "FAIL.*e2e|playwright.*error|expect\(.*\)\." -Context 5
```

**Fix locally:**

```powershell
npm run test:smoke:e2e
```

#### 3g. Agent skills lint failure

```powershell
gh run view RUN_ID --log-failed | Select-String "skill.*failed validation|✖" -Context 3
```

**Fix locally:**

```powershell
python scripts/lint-skills.py
```

### 4. Reproduce locally with `npm run validate`

After identifying the exact error, run the full local validation to confirm your fix:

```powershell
npm run validate
npm test -- --watchAll=false
```

This runs typecheck → lint → format check. All must pass.

For faster iteration, run only the failing target:

```powershell
npm run lint          # lint only
npm run typecheck     # typecheck only
npm run format:check  # format only
npm test              # unit tests only
npm run build         # build only
```

### 5. Push and verify

```powershell
git add -A ; git commit -m "fix(scope): resolve CI failure"
git push origin HEAD
```

Then watch the new run:

```powershell
# Wait for checks to complete
gh pr checks --watch

# Or monitor the run
gh run watch
```

### 6. If the failure is flaky / transient

Some CI failures are not caused by your code:

- **GitHub Actions infrastructure** — runner timeouts, service outages
- **Network issues** — npm registry failures, GitHub API rate limits

In these cases, rerun the failed jobs:

```powershell
gh run rerun RUN_ID --failed
```

### When search patterns return no results

If the `Select-String` commands in step 3 don't match anything, **do not guess**. Escalate your search:

```powershell
# 1. Save full logs and open in VS Code
gh run view RUN_ID --log > scratch/ci-full.txt

# 2. Search for the GitHub Actions error annotation format
gh run view RUN_ID --log | Select-String "##\[error\]" -Context 5

# 3. Search for any non-zero exit code
gh run view RUN_ID --log | Select-String "exit code [1-9]" -Context 10

# 4. View in browser
gh run view RUN_ID --web
```

## Quick Diagnostic Script

For a comprehensive one-liner that classifies the failure type automatically, see the [github-actions-logs skill](../github-actions-logs/SKILL.md#comprehensive-one-liner-diagnostic). A minimal version:

```powershell
$runId = (gh run list --branch (git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view $runId --log-failed | Select-String "error TS\d+|✖ \d+ problems|\d+:\d+\s+error|FAIL.*\.test\.|format:check.*failed|skill.*failed" -Context 3
```

## Concurrency Cancellations (Not a Real Failure)

If you push a new commit while CI is running, the previous run is cancelled. This appears as a failure but is expected behavior.

```powershell
gh run view RUN_ID | Select-String "cancel|The operation was canceled"
```

**No fix needed** — the newer run supersedes it.

## Related Skills

- [github-actions-logs](../github-actions-logs/SKILL.md) — Detailed log parsing patterns
- [fix-lint](../fix-lint/SKILL.md) — Resolving specific ESLint rule violations
- [fix-types](../fix-types/SKILL.md) — Fixing TypeScript type errors
- [testing](../testing/SKILL.md) — Running tests locally
- [troubleshoot](../troubleshoot/SKILL.md) — General dev environment troubleshooting
