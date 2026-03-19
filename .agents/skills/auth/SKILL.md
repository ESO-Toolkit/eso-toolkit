---
name: auth
description: Check, generate, and inject ESO Logs OAuth tokens for authenticated browser sessions and Playwright tests. Use this when auth-state.json is missing, expired, or when you need to inject authentication into a browser session.
---

You are an authentication assistant for ESO Log Aggregator.

## Auth State File

The primary auth file is: `tests/auth-state.json`

This file contains the OAuth access token used by Playwright tests for authenticated testing.

## Step 1 — Check Existing Auth State

Read the auth state file and check if a valid token exists:

```powershell
# Check if file exists
Test-Path "tests/auth-state.json"

# View contents (look for access_token and expiry)
Get-Content "tests/auth-state.json" | ConvertFrom-Json | Select-Object -Property access_token, expires_at, authenticated
```

A token is **valid** if:
- `access_token` is present and non-empty
- `expires_at` is in the future (compare to current timestamp)

## Step 2 — Generate a Fresh OAuth Token

Requires `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in `.env`:

```powershell
# Check .env for credentials
Get-Content ".env" | Where-Object { $_ -match "OAUTH_CLIENT" }
```

Generate token via the ESO Logs OAuth endpoint:
```powershell
$clientId = (Get-Content ".env" | Where-Object { $_ -match "OAUTH_CLIENT_ID=" }) -replace "OAUTH_CLIENT_ID=", ""
$clientSecret = (Get-Content ".env" | Where-Object { $_ -match "OAUTH_CLIENT_SECRET=" }) -replace "OAUTH_CLIENT_SECRET=", ""

$body = "grant_type=client_credentials&client_id=$clientId&client_secret=$clientSecret"
$response = Invoke-RestMethod -Uri "https://www.esologs.com/oauth/token" -Method POST -ContentType "application/x-www-form-urlencoded" -Body $body

$response.access_token
```

If `.env` credentials are missing, tell the user to add `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` to their `.env` file. These are obtained from https://www.esologs.com/api/clients/.

## Step 3 — Inject Token into Browser Session

Use this with the MCP Playwright browser tool. After navigating to the app, run this script:

```javascript
// Inject auth into browser localStorage
(function() {
  const token = "YOUR_ACCESS_TOKEN_HERE";
  const now = Date.now();
  const expiresIn = 3600 * 1000; // 1 hour in ms

  localStorage.setItem('access_token', token);
  localStorage.setItem('authenticated', 'true');
  localStorage.setItem('access_token_refreshed_at', String(now));
  localStorage.setItem('access_token_expires_at', String(now + expiresIn));

  window.dispatchEvent(new StorageEvent('storage', {
    key: 'access_token',
    newValue: token,
    storageArea: localStorage,
  }));

  console.log('Auth injected - expires at:', new Date(now + expiresIn).toISOString());
  return { success: true };
})();
```

Use this via `mcp_microsoft_pla_browser_evaluate` with the app loaded.

## Step 4 — Update auth-state.json for Playwright Tests

To regenerate the auth state file for Playwright:
```powershell
# Run global setup which creates auth-state.json
npx playwright test --config=playwright/nightly.config.ts --project=chromium-desktop tests/global-setup.ts
```

Or trigger full nightly setup (creates auth state as a side effect):
```powershell
npm run test:nightly:all
```

## localStorage Keys Reference

| Key | Purpose | Required |
|-----|---------|----------|
| `access_token` | JWT OAuth access token | ✅ Yes |
| `authenticated` | Boolean auth flag | Recommended |
| `access_token_refreshed_at` | Timestamp of last refresh | Recommended |
| `access_token_expires_at` | Token expiry timestamp | Optional |
| `refresh_token` | OAuth refresh token | Optional |

## Troubleshooting

- **401 errors in tests**: Token expired — regenerate and update `tests/auth-state.json`
- **Missing .env credentials**: These are OAuth client credentials from the ESO Logs API developer portal
- **Token works in browser but not Playwright**: Ensure `tests/auth-state.json` is up to date
- **CORS errors**: OAuth exchange must happen server-side or via client credentials flow, not the browser
