# Coverage Badges Setup Guide

This guide explains how dynamic coverage badges are generated and served for the ESO Toolkit project.

## How It Works

1. **CI runs tests** → Generates coverage data (`coverage/coverage-final.json`)
2. **Script generates badge JSON** → `scripts/generate-coverage-badge-json.cjs` writes shields.io endpoint JSON files to `coverage/badge-json/`
3. **CI deploys JSON to GitHub Pages** → Files are pushed to `ESO-Toolkit/eso-log-aggregator-reports` via the Report Deploy GitHub App
4. **Shields.io reads GitHub Pages** → Generates dynamic SVG badges
5. **README displays badges** → Always shows current coverage

## Required Secrets

The following secrets must be set in the `ESO-Toolkit/eso-toolkit` repository:

| Secret | Description |
|--------|-------------|
| `DEPLOY_APP_ID` | GitHub App ID for the "Report Deploy" app (ID: `2889569`) |
| `DEPLOY_APP_PRIVATE_KEY` | Private key PEM for the "Report Deploy" app |

The Report Deploy app must be installed on `ESO-Toolkit/eso-log-aggregator-reports` with **Contents: read/write** permission.

No personal access tokens or gist secrets are required.

## Local Testing

```bash
# Generate coverage and badge JSON files locally
npm run test:coverage
npm run coverage:badge-json
# Files are written to coverage/badge-json/
```

## Badge URLs

Badges are served from GitHub Pages at:

- Overall: `https://ESO-Toolkit.github.io/eso-log-aggregator-reports/badges/coverage-overall.json`
- Lines: `https://ESO-Toolkit.github.io/eso-log-aggregator-reports/badges/coverage-lines.json`
- Functions: `https://ESO-Toolkit.github.io/eso-log-aggregator-reports/badges/coverage-functions.json`
- Branches: `https://ESO-Toolkit.github.io/eso-log-aggregator-reports/badges/coverage-branches.json`

## Troubleshooting

### Badges not updating

- Confirm the `coverage.yml` workflow ran successfully on `main`
- Check the "Deploy Coverage Badges to GitHub Pages" step in the workflow run
- Verify the Report Deploy app is installed on `eso-log-aggregator-reports` with write access
- Allow a few minutes for shields.io cache to expire

### Badge JSON not generated

- Confirm `coverage/coverage-final.json` exists (tests must have run with coverage)
- Run `npm run coverage:badge-json` locally and check for errors

## Maintenance

The system is fully automated:

- Badge JSON is regenerated and redeployed on every push to `main`
- No personal access tokens or gist IDs to rotate
- Storage is fully org-owned via `ESO-Toolkit/eso-log-aggregator-reports`
