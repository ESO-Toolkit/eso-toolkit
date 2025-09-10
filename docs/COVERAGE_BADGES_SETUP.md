# Coverage Badges Setup Guide

This guide explains how to set up dynamic coverage badges for the ESO Log Aggregator project.

## How It Works

1. **CI runs tests** → Generates coverage data (`coverage/coverage-final.json`)
2. **Script uploads to GitHub Gist** → Creates JSON endpoints for shields.io
3. **Shields.io reads Gist data** → Generates dynamic SVG badges
4. **README displays badges** → Always shows current coverage

## Setup Steps

### 1. Create GitHub Gist

1. Go to https://gist.github.com/
2. Create a new gist:
   - **Description**: "Coverage badges for eso-log-aggregator"
   - **Filename**: `coverage-overall.json`
   - **Content**:
     ```json
     {
       "schemaVersion": 1,
       "label": "coverage",
       "message": "0%",
       "color": "red"
     }
     ```
   - **Visibility**: Public or Secret (both work)
3. Click "Create gist"
4. Copy the **Gist ID** from URL (e.g., `abc123def456` from `https://gist.github.com/username/abc123def456`)

### 2. Add Repository Secret

1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add:
   - **Name**: `COVERAGE_GIST_ID`
   - **Value**: Your Gist ID from step 1

### 3. Update README Badge URLs

Replace `YOUR_GIST_ID` in the README badges with your actual Gist ID:

```markdown
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bkrupa/YOUR_GIST_ID/raw/coverage-overall.json&style=flat)](...)
```

## Testing

### Local Testing

```bash
# Generate coverage and test gist upload
npm run test:coverage
npm run coverage:gist
```

### CI Testing

1. Push changes to trigger CI
2. Check GitHub Actions logs for "✅ Coverage data uploaded to GitHub Gist successfully"
3. View your gist to see updated JSON files
4. Check README badges (may take a few minutes to update)

## Troubleshooting

### Badges not updating

- Check that `COVERAGE_GIST_ID` secret is set correctly
- Verify gist is accessible (try visiting the JSON URLs directly)
- Wait a few minutes - shields.io has some caching

### Script errors

- Ensure Node.js version supports `fetch` (v18+) or install `node-fetch`
- Check GitHub token permissions
- Verify coverage file exists before running script

## Badge URLs

Once set up, your badges will be available at:

- Overall: `https://gist.githubusercontent.com/bkrupa/YOUR_GIST_ID/raw/coverage-overall.json`
- Lines: `https://gist.githubusercontent.com/bkrupa/YOUR_GIST_ID/raw/coverage-lines.json`
- Functions: `https://gist.githubusercontent.com/bkrupa/YOUR_GIST_ID/raw/coverage-functions.json`
- Branches: `https://gist.githubusercontent.com/bkrupa/YOUR_GIST_ID/raw/coverage-branches.json`

## Maintenance

The system is fully automated once set up:

- Coverage badges update on every CI run
- No manual intervention required
- Gist serves as permanent storage for badge data
