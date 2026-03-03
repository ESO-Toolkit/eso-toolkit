---
name: create-pr
description: 'Create pull requests using gh CLI with automatic PR template population. Always use --body-file to avoid PowerShell mangling markdown. Use after completing work on a feature branch.'
---

# Skill: Pull Request Creation

## Overview

Create pull requests using the GitHub CLI. **Always use a temp file for the PR body** to avoid PowerShell mangling markdown.

## When to Use

- After completing work on a feature branch
- All pre-commit validation passes (`npm run validate`)
- Ready for code review
- Before updating Jira ticket to "In Review"

## Prerequisites

Before creating a PR, verify the following **in order**. Stop at the first failure and resolve it.

### 1. Must Be on a Non-Main Branch

```powershell
$branch = git branch --show-current
if ($branch -eq 'main') { Write-Error 'Cannot create a PR from main. Create a feature branch first.' }
```

If you are on `main`, **stop** and use the **workflow** skill to create a feature branch before proceeding.

### 2. Must Have an Associated Jira Ticket

Extract the ticket key from the branch name and confirm it exists:

```powershell
$branch = git branch --show-current
if ($branch -match '(ESO-\d+)') {
    $ticket = $Matches[1]
    acli jira workitem view $ticket          # Must succeed
} else {
    Write-Error "Branch '$branch' has no Jira ticket (expected ESO-#### in the name). Create a branch with an associated ticket first."
}
```

### 3. Must Pass Pre-Commit Validation

```powershell
npm run validate
npm test -- --watchAll=false
```

## Command

```powershell
# Detect the correct base branch (try twig, fall back to git config, then main)
$baseBranch = (twig branch parent 2>$null) -replace '\s',''
if (-not $baseBranch -or $baseBranch -eq '') {
    $baseBranch = (git config "branch.$(git branch --show-current).parent") 2>$null
}
if (-not $baseBranch -or $baseBranch -eq '') { $baseBranch = 'main' }

# Create PR using GitHub CLI with --body-file (preferred — works for both humans and agents)
gh pr create --title "ESO-#### type(scope): description" --body-file ".github/tmp-pr-body.md" --base $baseBranch
```

> **Stacked branches**: The base branch should be the parent branch (e.g., `ESO-449/feature-a`), not `main`. The command above auto-detects this via twig or git config.

## 🚨 CRITICAL: Always Use --body-file, Never --body

PowerShell corrupts inline markdown passed via `--body`:

- Backticks are stripped or escaped incorrectly
- Arrow characters (→) turn into `\`
- Code blocks render as broken text
- Special characters get double-escaped

**PowerShell heredoc (`@" "@`) also strips single backticks.** The only safe way is to write the file directly using a tool (e.g., `create_file`) or `Set-Content` with properly escaped content via a variable.

**Agent workflow — write a temp .md file, then pass it to `gh pr create`:**

```powershell
# 1. Use your file-writing tool to create a temp .md file with the PR body
#    (agents: use create_file to write the markdown — it preserves backticks)
#    File location: .github/tmp-pr-body.md (or $env:TEMP/pr-body.md)

# 2. Create PR using --body-file
gh pr create --title "ESO-#### fix(scope): description" --body-file ".github/tmp-pr-body.md" --base main

# 3. Clean up the temp file
Remove-Item ".github/tmp-pr-body.md" -ErrorAction SilentlyContinue
```

### ❌ NEVER Do These

```powershell
# BAD - PowerShell will mangle the markdown
gh pr create --title "fix: thing" --body "## Problem`nThe \`code\` was broken"

# BAD - Inline backticks and special chars get corrupted
gh pr create --title "fix: thing" --body "Change \`--old\` to \`--new\`"

# BAD - Heredoc also strips single backticks
@"
The `function` was broken
"@ | Set-Content -Path "$env:TEMP\pr-body.md"
# Result: "The  was broken" (backticks gone)
```

### 🚨 Do NOT Escape Backticks in PR Body Content

When writing the PR body markdown (via `create_file` or any method), use **plain backtick characters** for inline code — never write `\`` (backslash + backtick).

| ❌ Wrong               | ✅ Correct               |
| ---------------------- | ------------------------ |
| `\`git worktree add\`` | `` `git worktree add` `` |
| `\`npm run dev\``      | `` `npm run dev` ``      |
| `\.env\``              | `` `.env` ``             |

### Quick PR (No Description Needed)

```powershell
# Auto-fill from commit messages (safe, no markdown)
gh pr create --fill --base main
```

### Fixing a Mangled PR Description

If a PR was already created with broken formatting:

```powershell
# 1. Write corrected body to a temp file (use create_file tool)
# 2. Update the existing PR
gh pr edit <PR_NUMBER> --body-file ".github/tmp-pr-body.md"
# 3. Clean up
Remove-Item ".github/tmp-pr-body.md" -ErrorAction SilentlyContinue
```

## PR Body Template

When writing the temp PR body file, use this structure:

```markdown
## Summary

Brief overview of what this PR does.

## Jira Ticket

[ESO-1234](https://bkrupa.atlassian.net/browse/ESO-1234)

## Problem

Description of the issue being fixed, with error messages in fenced code blocks.

## Root Cause

Technical explanation of why the issue occurred.

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing Done

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Formatting passes (`npm run format:check`)
- [ ] Unit tests pass (`npm test -- --watchAll=false`)
- [ ] Pre-commit validation passes (`npm run validate`)
```

## Expected Output

- **Success**: PR URL printed to console
- **Pre-filled**: Title and body from provided content
- **Branch**: Current branch set as source, main as target

## Common Issues

### Issue: Branch not pushed

**Solution**: Push branch before creating PR

```powershell
git push -u origin HEAD
```

### Issue: No changes to commit

**Solution**: Verify changes exist relative to main

```powershell
git log main..HEAD --oneline
```

### Issue: PR already exists

**Solution**: Update the existing PR instead

```powershell
gh pr edit --title "ESO-#### type(scope): updated description" --body-file ".github/tmp-pr-body.md"
```

## Post-PR Steps

After the PR is created:

```powershell
# Transition Jira ticket to "In Review"
acli jira workitem transition --key ESO-#### --status "In Review"
```

## Related Skills

- [workflow](../workflow/SKILL.md) — branch creation and Jira integration
- [testing](../testing/SKILL.md) — pre-PR validation
- [jira](../jira/SKILL.md) — Jira ticket management
