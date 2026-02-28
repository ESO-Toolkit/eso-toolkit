---
name: workflow
description: Enforce git workflow by checking the current branch before starting Jira ticket work. Creates properly-formatted ESO-XXX/description feature branches, prevents commits directly to main, and updates the Jira ticket status as work progresses.
---

You are enforcing the ESO Log Aggregator git workflow. Follow these steps precisely.

## Step 1 — Check Current Branch

Run this command and capture the output:

```powershell
git rev-parse --abbrev-ref HEAD
```

## Step 2 — Evaluate Branch State

**If branch is `main` or `master`:**
- Do NOT start or continue any implementation work
- Tell the user they are on a protected branch
- Ask for the Jira ticket number (e.g. `ESO-569`) and a short description
- Proceed to Step 3

**If branch is already an `ESO-XXX/...` feature branch:**
- Confirm the branch name to the user
- Confirm it is safe to proceed with work
- Stop — no branch creation needed

**If branch is some other non-main branch:**
- Show the user the current branch name
- Ask if this is the intended working branch or if they need a new one

## Step 3 — Create Feature Branch (if needed)

Branch naming convention: `ESO-XXX/short-description-in-kebab-case`

Examples of valid names:
- `ESO-569/remove-duplicate-roles`
- `ESO-449/structure-redux-state`
- `ESO-372/fix-aria-labels`

> **Why this matters**: The `npm run sync-jira` script reads all remote branches and moves Jira tickets to *In Progress* or *Done* automatically. It only detects branches whose name **starts with the Jira ticket key** (`ESO-\d+`). A branch named `feature/remove-duplicate-roles` will be invisible to the sync and its ticket will never be updated.

Run these commands in sequence:

```powershell
# Switch to main and pull latest
git checkout main
git pull origin main

# Create and switch to the feature branch
git checkout -b ESO-XXX/your-description
```

## Step 4 — Set Up Twig Parent (if twig is available)

Check if twig is installed:
```powershell
twig --version
```

If twig is available, set the parent branch dependency:
```powershell
twig branch ESO-XXX/your-description --parent main
```

If the new branch depends on another feature branch (not main), use that branch as the parent instead.

## Step 5 — Confirm and Report

Tell the user:
- The new branch name
- That they are now safe to begin implementation
- Any twig setup that was performed

## Step 6 — Pre-PR Quality Gate (MANDATORY)

**Before creating a PR or marking a ticket as In Review**, run all quality checks and ensure they pass:

```powershell
# 1. Type-check, lint, and format — must all pass with zero errors/warnings
npm run validate

# 2. Unit tests — must all pass
npm test -- --watchAll=false
```

**Do NOT create a PR if either command exits with a non-zero code.**

- Fix any TypeScript errors before continuing.
- Run `npm run lint:fix` and `npm run format` to auto-fix lint/format issues, then re-run `npm run validate`.
- Fix any failing unit tests before continuing.

## Step 7 — Update Ticket Status When Work Is Complete

When implementation is finished, all quality checks pass, and changes are committed/pushed, update the Jira ticket status:

```
@workspace Move ESO-XXX to "In Review"
```

Use the appropriate status based on state:
- **Starting work**: Move ticket to `In Progress`
- **Implementation done, PR open**: Move ticket to `In Review`
- **Merged and deployed**: Move ticket to `Done`

See the Jira skill for full transition commands: [.github/skills/jira/SKILL.md](.github/skills/jira/SKILL.md)

## Recovery: If Changes Were Made on Main

If the user has already made changes directly on `main`, guide them through this recovery:

```powershell
# 1. Create the feature branch from current position (preserves commits)
git checkout -b ESO-XXX/your-description

# 2. Reset main back to origin
git checkout main
git reset --hard origin/main

# 3. Switch back to feature branch
git checkout ESO-XXX/your-description
```

## Project Context

- Jira project key: `ESO`
- Jira board: https://bkrupa.atlassian.net
- Branch format: `ESO-XXX/kebab-case-description`
- Protected branches: `main`, `master`
- Twig is used for branch stacking/dependencies
