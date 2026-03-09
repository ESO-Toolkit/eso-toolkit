---
name: deploy-preview
description: Deploy a local build to the dev-previews GitHub Pages site with a custom alias, or remove an existing preview. Use this when asked to deploy a preview, push a local build to dev-previews, create a preview URL, or clean up a local preview deployment.
---

# Skill: Deploy Local Preview

## Overview

Deploy any local branch to the dev-previews GitHub Pages site at `https://eso-toolkit.github.io/dev-previews/<alias>/`. This uses the `scripts/deploy-preview.ps1` script which builds the project, pushes the output to the `ESO-Toolkit/dev-previews` repo, and updates the landing page.

## Prerequisites

- The `ESO-Toolkit/dev-previews` repo must be cloned as a sibling directory (e.g. `../dev-previews` relative to the project root). The script auto-detects this location. If it doesn't exist:
  ```powershell
  git clone git@github.com:ESO-Toolkit/dev-previews.git ../dev-previews
  ```
  Or pass a custom path: `.\scripts\deploy-preview.ps1 -DevPreviewsPath "D:\path\to\dev-previews"`
- Node.js and npm dependencies must be installed (`npm ci`)

## Deploy a Preview

### With auto-generated alias (uses current branch name)

```powershell
.\scripts\deploy-preview.ps1
```

This derives the alias from the current git branch (sanitised to URL-safe lowercase).

### With a custom alias

```powershell
.\scripts\deploy-preview.ps1 -Alias "my-feature"
```

The preview will be available at `https://eso-toolkit.github.io/dev-previews/my-feature/`.

### Skip the build (push existing build/ directory)

```powershell
.\scripts\deploy-preview.ps1 -Alias "quick-test" -SkipBuild
```

Use this when the project was already built with the correct `VITE_BASE_URL`.

## Remove a Preview

```powershell
.\scripts\deploy-preview.ps1 -Alias "my-feature" -Remove
```

This removes the preview directory and its entry from `previews.json`, then pushes the cleanup.

## What the Script Does

1. **Builds** the project with `VITE_BASE_URL=/dev-previews/<alias>/` so routing works correctly
2. **Pulls** the latest dev-previews repo to avoid push conflicts
3. **Copies** the `build/` output into the alias directory
4. **Updates** `previews.json` with an entry including alias, branch, commit hash, and timestamp
5. **Commits and pushes** to the dev-previews repo
6. GitHub Pages automatically deploys the update

## Output

After a successful deploy, report to the user:
- The preview URL: `https://eso-toolkit.github.io/dev-previews/<alias>/`
- The branch and commit that was deployed
- Note that GitHub Pages may take 1–2 minutes to update

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Push rejected | The dev-previews repo has new commits. Run `git -C ../dev-previews pull --rebase origin main` from the project root and retry. If `previews.json` has conflicts, accept theirs (`git checkout --theirs previews.json`) since the script regenerates it. |
| dev-previews not found | Clone it as a sibling: `git clone git@github.com:ESO-Toolkit/dev-previews.git ../dev-previews` |
| Build fails | Check for TypeScript errors (`npm run typecheck`) or missing dependencies (`npm ci`) |
| Custom DevPreviewsPath | Pass `-DevPreviewsPath "C:\path\to\dev-previews"` if the repo is not at the default sibling location |
| `previews.json` conflict | This file is auto-generated. Accept theirs: `git -C ../dev-previews checkout --theirs previews.json && git -C ../dev-previews add previews.json && git -C ../dev-previews commit -m "resolve previews.json conflict"` then re-run the deploy script. |

## OAuth Note

Login works on custom alias previews too — the OAuth redirect URI detection matches any path under `/dev-previews/`. The user must have `https://eso-toolkit.github.io/dev-previews/oauth-redirect` registered in their esologs.com OAuth client settings.
