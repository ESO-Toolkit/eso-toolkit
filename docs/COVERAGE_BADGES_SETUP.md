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

### 2. Add Repository Secrets

#### Required Secret: COVERAGE_GIST_ID

1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add:
   - **Name**: `COVERAGE_GIST_ID`
   - **Value**: Your Gist ID from step 1

#### Required Secret: GIST_TOKEN (Personal Access Token)

The default `GITHUB_TOKEN` in GitHub Actions doesn't have permission to modify gists. You need to create a Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Configure:
   - **Note**: "Coverage badges gist access for eso-log-aggregator"
   - **Expiration**: Choose appropriate duration (90 days, 1 year, or no expiration)
   - **Scopes**: Check only `gist` (write access to gists)
4. Click "Generate token"
5. Copy the generated token immediately (you won't see it again)
6. In your repository: Settings → Secrets and variables → Actions
7. Click "New repository secret"
8. Add:
   - **Name**: `GIST_TOKEN`
   - **Value**: Your personal access token

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

### "Resource not accessible by integration" error

This error occurs when the GitHub token doesn't have gist permissions:

1. **Check if GIST_TOKEN secret exists**: Repository Settings → Secrets and variables → Actions
2. **If missing**: Follow step 2 above to create a Personal Access Token with `gist` scope
3. **If exists but still failing**:
   - Regenerate the Personal Access Token
   - Ensure only `gist` scope is selected
   - Update the `GIST_TOKEN` secret with the new token

### Badges not updating

- Check that `COVERAGE_GIST_ID` secret is set correctly
- Verify gist is accessible (try visiting the JSON URLs directly)
- Wait a few minutes - shields.io has some caching
- Check that `GIST_TOKEN` is properly configured (see above)

### Script errors

- Ensure Node.js version supports `fetch` (v18+) or install `node-fetch`
- Check GitHub token permissions (see "Resource not accessible" above)
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
