---
name: scratch-dir
description: 'Use the scratch/ directory to store ad-hoc command output files (lint results, CI logs, Playwright output, debug dumps) without polluting git status. All files in scratch/ are gitignored. Load this skill when capturing command output to a file, piping results to a text file, or told to save output somewhere.'
---

# Skill: scratch/ Directory for Ad-hoc Output Files

## Overview

The repo has a `scratch/` directory at the root. Everything inside is gitignored, so files saved there never appear as unstaged changes.

**Always redirect ad-hoc output files to `scratch/` instead of the repo root.**

## When to Use

- Piping command output to a file for inspection (`Tee-Object`, `Out-File`, `>`)
- Saving lint results, typecheck errors, or CI log dumps
- Capturing Playwright output, test results, or diff files
- Any temporary file you need during a debugging session

## Steps

### Create the directory if it doesn't exist

```powershell
if (-not (Test-Path scratch)) { New-Item -ItemType Directory scratch }
```

### Redirect output to scratch/

Instead of writing to the repo root:

```powershell
# ❌ Don't do this — creates unstaged files at repo root
npm run lint 2>&1 | Tee-Object -FilePath "lint-output.txt"

# ✅ Do this instead
npm run lint 2>&1 | Tee-Object -FilePath "scratch/lint-output.txt"
```

### Common patterns

```powershell
# Lint output
npm run lint 2>&1 | Tee-Object "scratch/lint.txt" | Select-String "error"

# TypeScript errors
npm run typecheck 2>&1 | Tee-Object "scratch/tc-errors.txt" | Select-String "error TS"

# CI log dumps
gh run view RUN_ID --log-failed > scratch/ci-failed.txt
gh run view RUN_ID --log > scratch/ci-full.txt

# Playwright output
npm run test:smoke:e2e 2>&1 | Tee-Object "scratch/pw-out.txt"

# Test coverage
npm run test:coverage 2>&1 | Tee-Object "scratch/coverage.txt"
```

### Reading files back

```powershell
Get-Content "scratch/lint.txt" | Select-String "error" | Select-Object -First 50
```

## Notes

- Files in `scratch/` are **not** cleaned up automatically — delete them when done.
- The directory should be added to `.gitignore` if not already present.
- Each developer's `scratch/` is local to their workspace.
