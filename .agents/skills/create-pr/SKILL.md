---
name: create-pr
description: 'Create pull requests using gh CLI with automatic PR template population. Always use --body-file to avoid PowerShell mangling markdown. Automatically captures screenshots for UI changes. Use after completing work on a feature branch.'
---

# Skill: Pull Request Creation

## Overview

Create pull requests using the GitHub CLI. **Always use a temp file for the PR body** to avoid PowerShell mangling markdown. **Automatically detect UI changes and include screenshots** in the PR description.

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

### 4. Check for UI Changes (Screenshot Detection)

Before writing the PR body, determine whether the PR includes visual/UI changes:

```powershell
# Get changed files relative to base branch
$baseBranch = (twig branch parent 2>$null) -replace '\s',''
if (-not $baseBranch -or $baseBranch -eq '') {
    $baseBranch = (git config "branch.$(git branch --show-current).parent") 2>$null
}
if (-not $baseBranch -or $baseBranch -eq '') { $baseBranch = 'main' }

$changedFiles = git diff --name-only "$baseBranch...HEAD"
```

**UI changes are present if ANY changed file matches these patterns:**
- `src/components/**/*.tsx` — shared UI components
- `src/features/**/*.tsx` — feature components with visual changes
- `src/ReduxThemeProvider.tsx` — theme/design token changes
- `src/utils/roleColors.ts` — role color changes
- Any `.tsx` file with changes to: `styled()`, `sx` prop, CSS-in-JS, `className`, layout JSX, MUI component usage

**If UI changes are detected → proceed to the [Screenshots for UI Changes](#screenshots-for-ui-changes) section before writing the PR body.**

If no UI changes are detected (e.g., pure logic, tests, config, data files), skip the screenshots section entirely.

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

---

## Screenshots for UI Changes

When the PR includes visual changes, **always capture screenshots** and include them in the PR description. This provides reviewers with immediate visual context and creates a historical record of UI evolution.

### Step 1 — Identify Affected Pages

Review the changed `.tsx` files and determine which pages/views are visually affected. Map changed files to their routes:

| Changed file pattern | Likely affected page |
|---------------------|---------------------|
| `src/features/fight_replay/` | Fight replay view (`/report/ID/fight/N/replay`) |
| `src/features/loadout_manager/` | Loadout manager page |
| `src/features/scribing/` | Scribing-related views |
| `src/components/shared/` | Multiple pages (capture representative ones) |
| `src/components/Report/` | Report pages |
| `src/ReduxThemeProvider.tsx` | Entire app (capture 2–3 representative pages) |

### Step 2 — Capture Screenshots

Use the **MCP Playwright browser tool** to navigate to affected pages and take screenshots.

**Setup:**

1. Ensure the dev server is running (`npm run dev`)
2. Use the MCP browser tool to navigate and capture

**Capture process using MCP Playwright browser:**

```
# Navigate to the affected page
browser_navigate → http://localhost:3000/path/to/affected/page

# Wait for the page to fully load (wait for skeletons to disappear)
browser_wait_for → Wait for page content to be ready

# Take a screenshot and save it
browser_take_screenshot → Save to scratch/pr-screenshots/
```

**Screenshot naming convention:**

```
scratch/pr-screenshots/{area}-{description}.png
```

Examples:
- `scratch/pr-screenshots/report-damage-tab.png`
- `scratch/pr-screenshots/loadout-manager-dark.png`
- `scratch/pr-screenshots/fight-replay-controls.png`
- `scratch/pr-screenshots/theme-change-homepage.png`

**Ensure the `scratch/pr-screenshots/` directory exists:**

```powershell
New-Item -ItemType Directory -Path scratch/pr-screenshots -Force
```

### Step 3 — Upload Screenshots to GitHub

Screenshots in `scratch/` are gitignored and cannot be referenced by URL in the PR body. Use a **GitHub draft release** to host the images:

```powershell
$branch = git branch --show-current
$ticket = if ($branch -match '(ESO-\d+)') { $Matches[1] } else { 'screenshots' }
$tag = "pr-assets/$ticket"

# Create a draft release to host screenshot assets
gh release create $tag --draft --title "PR Screenshots: $ticket" --notes "Temporary asset host for PR screenshots. Safe to delete after PR is merged."

# Upload all screenshots from scratch/pr-screenshots/
Get-ChildItem scratch/pr-screenshots/*.png | ForEach-Object {
    gh release upload $tag $_.FullName --clobber
}

# Retrieve the download URLs for each uploaded asset
$assets = gh release view $tag --json assets | ConvertFrom-Json
$assets.assets | ForEach-Object {
    Write-Output "![$($_.name)]($($_.url))"
}
```

The output gives you markdown image references like:
```
![report-damage-tab.png](https://github.com/ESO-Toolkit/eso-toolkit/releases/download/pr-assets/ESO-XXX/report-damage-tab.png)
```

Use these URLs directly in the `## Screenshots` section of the PR body.

### Step 4 — Include in PR Body

Add the `## Screenshots` section to the PR body (see [PR Body Template](#pr-body-template) below). Place it after `## Changes Made` and before `## Testing Done`.

### Cleanup (Post-Merge)

After the PR is merged, delete the draft release to keep the repo tidy:

```powershell
$ticket = "ESO-XXX"   # Replace with actual ticket
gh release delete "pr-assets/$ticket" --yes
```

> **Note**: Deleting the release will break the image links in the closed PR description. This is acceptable — the screenshots served their purpose during review. If you want permanent records, leave the draft release in place.

### Alternative: Manual Screenshot Upload (Fallback)

If the MCP browser tool or draft release approach is unavailable:

1. Save screenshots to `scratch/pr-screenshots/`
2. Create the PR **without** the Screenshots section (or with a placeholder)
3. Open the PR in a browser
4. Edit the PR description and **drag-and-drop** the screenshot files from `scratch/pr-screenshots/` directly into the edit box
5. GitHub will upload them to its CDN and insert `![image](https://github.com/user-attachments/assets/...)` URLs automatically

---

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

When writing the temp PR body file, use this structure. **Include the Screenshots section only when UI changes are present** (see [Prerequisites Step 4](#4-check-for-ui-changes-screenshot-detection)).

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

## Screenshots

<!-- ONLY include this section when the PR contains UI/visual changes.
     Delete this entire section for non-UI PRs. -->

| Before | After |
|--------|-------|
| ![Before: description](URL) | ![After: description](URL) |

<!-- For changes with no meaningful "before" state (new UI), use a simple layout: -->

### New Feature Name

![Description of the new UI](URL)

<!-- For theme/global changes affecting multiple pages, show multiple screenshots: -->

### Page/View Name
![Description](URL)

### Another Page/View Name
![Description](URL)

## Testing Done

- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Formatting passes (`npm run format:check`)
- [ ] Unit tests pass (`npm test -- --watchAll=false`)
- [ ] Pre-commit validation passes (`npm run validate`)
- [ ] Screenshots captured for UI changes (if applicable)
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

### Issue: Screenshots not loading in PR description

**Possible causes:**
- Draft release was deleted before PR was reviewed — re-upload with `gh release create`
- Wrong URL format — ensure you use the `url` field from `gh release view --json assets`, not the `apiUrl`
- Release is still in draft — draft release assets are still accessible via direct URL

## Post-PR Steps

After the PR is created:

```powershell
# Transition Jira ticket to "In Review"
acli jira workitem transition --key ESO-#### --status "In Review"
```

After the PR is merged (optional cleanup):

```powershell
# Delete the temporary screenshot hosting release
$ticket = "ESO-####"
gh release delete "pr-assets/$ticket" --yes 2>$null

# Clean up local screenshots
Remove-Item -Recurse -Force scratch/pr-screenshots -ErrorAction SilentlyContinue
```

## Related Skills

- [workflow](../workflow/SKILL.md) — branch creation and Jira integration
- [testing](../testing/SKILL.md) — pre-PR validation
- [jira](../jira/SKILL.md) — Jira ticket management
- [ui-updates](../ui-updates/SKILL.md) — theme-consistent UI changes (when making visual changes)
- [playwright](../playwright/SKILL.md) — E2E test execution (for verifying visual behavior)
