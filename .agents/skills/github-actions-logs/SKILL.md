---
name: github-actions-logs
description: 'Parse and analyze GitHub Actions CI/CD workflow logs to diagnose failures, understand build progress, and extract actionable error information. Use when investigating CI failures.'
---

# Skill: Reading GitHub Actions Logs

## Overview

Efficiently parse and analyze GitHub Actions logs to diagnose failures, understand build progress, and extract actionable information from the ESO Log Aggregator CI pipeline.

## When to Use

- Investigating CI/CD pipeline failures
- Understanding which step in the workflow failed
- Extracting specific error messages from long logs
- Monitoring test results and build times

## Commands

### View Run Logs with GitHub CLI

```powershell
# View logs from a specific run (failed steps only)
gh run view RUN_ID --log-failed

# View all logs from a run (includes successful steps)
gh run view RUN_ID --log

# List recent runs to find RUN_ID
gh run list --branch (git branch --show-current) --limit 5

# Get run status
gh run view RUN_ID
```

### View Logs by Workflow

```powershell
# PR checks
gh run list --workflow pr-checks.yml --limit 5

# Deployment runs
gh run list --workflow deploy.yml --limit 5

# Nightly tests
gh run list --workflow nightly-tests.yml --limit 5

# Screen size tests
gh run list --workflow screen-size-testing.yml --limit 5
```

### View Individual Job Logs

```powershell
# List all jobs in a run
gh run view RUN_ID --json jobs --jq '.jobs[] | "\(.id) \(.name) \(.conclusion)"'

# View a specific job's logs
gh run view RUN_ID --job JOB_ID --log
```

### View Logs in Browser

```powershell
gh run view RUN_ID --web
```

## 🚨 Critical: Evidence-First Log Reading

**NEVER guess at the problem.** The purpose of reading logs is to extract the **exact error** — file path, line number, error code, or error message — before attempting any fix.

**What counts as sufficient evidence:**

| Failure Type | You need to find...                            | Example                                                                    |
| ------------ | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Lint         | File, line, column, rule name                  | `src/App.tsx:17:3 error @typescript-eslint/no-floating-promises`           |
| TypeScript   | File, line, TS error code, message             | `utils.ts(42,5): error TS2345: Argument of type 'string'...`              |
| Unit test    | Test name + assertion OR Node warning above it | `Expected: 42, Received: undefined` or `Warning: Failed to load ES module` |
| Build        | Module/import error                            | `Module not found: Can't resolve '@/components/Missing'`                   |
| Format       | List of unformatted files                      | Files listed in format output                                              |
| E2E          | Server error OR Playwright assertion           | `expect(locator).toBeVisible()` timeout                                    |

## Common Error Patterns

### 1. Formatting Failure

```powershell
gh run view RUN_ID --log-failed | Select-String "format:check|Checking formatting" -Context 5
```

### 2. Lint Errors

```powershell
# Find the error summary
gh run view RUN_ID --log-failed | Select-String "\d+:\d+\s+error" -Context 1

# Find total problem count
gh run view RUN_ID --log-failed | Select-String "✖ \d+ problems" -Context 3
```

### 3. TypeScript Errors

```powershell
# Find TS error codes
gh run view RUN_ID --log-failed | Select-String "error TS\d+" -Context 3

# Find file paths with errors
gh run view RUN_ID --log-failed | Select-String "\.tsx?\(\d+,\d+\): error" -Context 1
```

### 4. Test Failures

```powershell
# Find failed test suites
gh run view RUN_ID --log-failed | Select-String "FAIL.*\.test\.(ts|tsx)" -Context 5

# Get assertion errors
gh run view RUN_ID --log-failed | Select-String "Expected:|Received:|Error:" -Context 5

# Check for Node warnings BEFORE test failures (root cause)
gh run view RUN_ID --log-failed | Select-String "\(node:\d+\) Warning" -Context 10
```

**⚠️ Important:** Test failures are often symptoms. Always look 10-20 lines BEFORE the failure for Node.js warnings or configuration errors.

### 5. Build Failures

```powershell
gh run view RUN_ID --log-failed | Select-String "ERROR|Error:|Module not found|Cannot find" -Context 5
```

### 6. Playwright E2E Failures

```powershell
# Server startup issues
gh run view RUN_ID --log-failed | Select-String "server.*fail|server.*died|server.*crash" -Context 5

# Test assertion failures
gh run view RUN_ID --log-failed | Select-String "expect\(.*\)\.|playwright.*error" -Context 5
```

### 7. Skills Lint Failure

```powershell
gh run view RUN_ID --log-failed | Select-String "skill.*failed validation|✖" -Context 3
```

## Filtering and Parsing

### Save Logs to File

```powershell
# Save full logs (use scratch/ directory to avoid git pollution)
gh run view RUN_ID --log > scratch/ci-logs.txt

# Save only failed logs
gh run view RUN_ID --log-failed > scratch/ci-failed.txt
```

### Parse with PowerShell

```powershell
# Count occurrences of a pattern
(gh run view RUN_ID --log | Select-String "error").Count

# Extract unique error messages
gh run view RUN_ID --log | Select-String "error TS\d+:" | Select-Object -Unique

# Get files with lint errors
gh run view RUN_ID --log | Select-String "\d+:\d+\s+error" | Select-Object -First 20
```

## Common Troubleshooting Workflow

```powershell
# Step 1: Identify the failed run
$runId = (gh run list --branch (git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId')

# Step 2: Get failed logs
$logs = gh run view $runId --log-failed

# Step 3: Classify the failure
$errorTypes = @(
  "\(node:\d+\) Warning",    # Node.js warnings (ROOT CAUSE)
  "Cannot find module",       # Missing dependencies (ROOT CAUSE)
  "format:check.*failed",     # Formatting
  "error TS\d+",              # TypeScript errors
  "\d+:\d+\s+error",          # Lint errors
  "FAIL.*\.test\.",            # Test failures (SYMPTOM)
  "Module not found",          # Build failures
  "expect\(.*\)\."             # E2E failures
)

foreach ($pattern in $errorTypes) {
  $matches = $logs | Select-String $pattern
  if ($matches) {
    Write-Host "Found: $pattern - Count: $($matches.Count)"
    $matches | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" }
  }
}
```

## Comprehensive One-Liner Diagnostic

```powershell
$runId = (gh run list --branch (git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId')
$logs = gh run view $runId --log-failed

@{
  "🎨 Format"       = "format:check.*failed|Check formatting.*failed"
  "🔍 Lint"         = "\d+:\d+\s+error.*@typescript-eslint|✖ \d+ problems"
  "📝 TypeScript"   = "error TS\d+"
  "🧪 Tests"        = "FAIL.*\.test\.(ts|tsx)|Test Suites:.*failed"
  "🏗️ Build"        = "Module not found|Cannot find|BUILD FAILED"
  "🌐 E2E"          = "playwright.*error|expect\(.*\)\.to|server.*fail"
  "📚 Skills"       = "skill.*failed validation"
  "⏹️ Cancelled"    = "operation was canceled|more recent commit"
}.GetEnumerator() | ForEach-Object {
  $hits = $logs | Select-String $_.Value
  if ($hits) { Write-Host "$($_.Key) — $($hits.Count) hit(s)" -ForegroundColor Red }
}
```

## Quick Reference Table

| Task                   | Command                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| View failed logs       | `gh run view RUN_ID --log-failed`                                              |
| View all logs          | `gh run view RUN_ID --log`                                                     |
| List recent runs       | `gh run list --branch BRANCH --limit 5`                                        |
| Open in browser        | `gh run view RUN_ID --web`                                                     |
| Find TypeScript errors | `gh run view RUN_ID --log \| Select-String "error TS"`                         |
| Find lint errors       | `gh run view RUN_ID --log \| Select-String "\d+:\d+\s+error"`                 |
| Find test failures     | `gh run view RUN_ID --log \| Select-String "FAIL"`                             |
| Save logs to file      | `gh run view RUN_ID --log > scratch/ci-logs.txt`                               |
| Check PR status        | `gh pr checks`                                                                 |
| Rerun failed jobs      | `gh run rerun RUN_ID --failed`                                                 |
| List PR checks runs    | `gh run list --workflow pr-checks.yml --limit 5`                               |
| List deploy runs       | `gh run list --workflow deploy.yml --limit 5`                                  |
| Check run conclusion   | `gh run view RUN_ID --json conclusion --jq '.conclusion'`                      |
| List jobs in run       | `gh run view RUN_ID --json jobs --jq '.jobs[] \| "\(.name): \(.conclusion)"'`  |

---

**🚨 Golden Rule: NEVER attempt a fix until you can cite the exact error from the logs.** Saying "lint failed" is not enough — you need `src/App.tsx:17:3 error @typescript-eslint/no-floating-promises`.

**💡 Pro Tip**: Test failures (FAIL) are often symptoms. Always look 10-20 lines BEFORE the failure for Node.js warnings, module loading errors, or configuration issues — those are the root causes.

## Related Skills

- [debug-ci-failure](../debug-ci-failure/SKILL.md) — Full end-to-end CI debugging workflow
- [fix-lint](../fix-lint/SKILL.md) — Resolving specific ESLint rule violations
- [fix-types](../fix-types/SKILL.md) — Fixing TypeScript type errors
- [testing](../testing/SKILL.md) — Running and debugging unit tests locally
- [scratch-dir](../scratch-dir/SKILL.md) — Saving log output to scratch/ directory
