# Microsoft Playwright MCP Browser Tool - Application Authentication Guide

**Last Updated**: November 12, 2025  
**Purpose**: Guide for AI agents to authenticate with the ESO Log Aggregator application when using the Microsoft Playwright MCP browser automation tool

---

## Overview

When using the Microsoft Playwright MCP browser tool (`mcp_microsoft_pla_browser_navigate` and related tools) to interact with the ESO Log Aggregator application, you need to authenticate the **application** (not the MCP tool itself) to see authenticated content.

This guide shows how to:
1. Generate an OAuth access token using client credentials from `.env`
2. Store the token in the browser's localStorage
3. Access authenticated features of the application

## Why Application Authentication is Required

The ESO Log Aggregator uses ESO Logs OAuth for authentication. Many features require a valid access token stored in `localStorage` with key `access_token`. Without authentication, you'll see limited content and features.

---

## Quick Start: Authenticate Your Browser Session

### Method 1: Using Existing Global Setup Token (Recommended)

If you've run Playwright tests, there's likely an existing `tests/auth-state.json` file with a valid token:

```typescript
// Use the existing auth state from Playwright tests
await page.context().storageState({ path: 'tests/auth-state.json' });
```

### Method 2: Generate New Token from OAuth Credentials

Generate a fresh token using the client credentials from `.env`:

**Step 1: Read OAuth credentials from .env**
```typescript
// .env contains:
// OAUTH_CLIENT_ID=your_client_id_here
// OAUTH_CLIENT_SECRET=your_client_secret_here

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
```

**Step 2: Request OAuth token from ESO Logs**
```typescript
const response = await fetch('https://www.esologs.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
});

const data = await response.json();
const accessToken = data.access_token;
```

**Step 3: Store token in localStorage using MCP browser tool**
```typescript
// Navigate to your app
await mcp_microsoft_pla_browser_navigate({ url: 'http://localhost:5173' });

// Inject the token into localStorage
await page.evaluate((token) => {
  localStorage.setItem('access_token', token);
  localStorage.setItem('authenticated', 'true');
  localStorage.setItem('access_token_refreshed_at', String(Date.now()));
}, accessToken);

// Reload to activate authentication
await page.reload();
```

---

## Complete Working Example

Here's a complete script that generates a token and authenticates the browser:

```typescript
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function authenticateAppWithMCP() {
  // Step 1: Get OAuth credentials
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials not found in .env file');
  }

  // Step 2: Request access token
  console.log('🔑 Requesting OAuth token from ESO Logs...');
  const response = await fetch('https://www.esologs.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  console.log('✅ OAuth token obtained successfully');

  // Step 3: Navigate to app with MCP tool
  console.log('🌐 Navigating to application...');
  await mcp_microsoft_pla_browser_navigate({ 
    url: 'http://localhost:5173' 
  });

  // Step 4: Inject token into localStorage
  console.log('💉 Injecting authentication token...');
  await page.evaluate((token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('authenticated', 'true');
    localStorage.setItem('access_token_refreshed_at', String(Date.now()));
    
    // Trigger storage event to notify the app
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'access_token',
        newValue: token,
        storageArea: localStorage,
      })
    );
  }, accessToken);

  // Step 5: Reload to activate authentication
  console.log('🔄 Reloading to activate authentication...');
  await page.reload();
  
  console.log('✅ Authentication complete! You can now access authenticated features.');
}
```

---

## localStorage Keys Used by ESO Log Aggregator

The application stores authentication data in these localStorage keys:

| Key | Description | Required |
|-----|-------------|----------|
| `access_token` | JWT access token from ESO Logs OAuth | Yes |
| `authenticated` | Boolean flag indicating auth status | Recommended |
| `access_token_refreshed_at` | Timestamp of last token refresh | Recommended |
| `access_token_expires_at` | Token expiration timestamp (if known) | Optional |
| `refresh_token` | OAuth refresh token (if available) | Optional |

### Minimal Authentication

At minimum, you only need to set the `access_token`:

```typescript
await page.evaluate((token) => {
  localStorage.setItem('access_token', token);
}, accessToken);
await page.reload();
```

### Complete Authentication (Recommended)

For full compatibility with all auth features:

```typescript
await page.evaluate((token, expiresIn) => {
  const now = Date.now();
  localStorage.setItem('access_token', token);
  localStorage.setItem('authenticated', 'true');
  localStorage.setItem('access_token_refreshed_at', String(now));
  if (expiresIn) {
    localStorage.setItem('access_token_expires_at', String(now + expiresIn * 1000));
  }
}, accessToken, data.expires_in);
```

---

## OAuth Client Credentials Flow Details

### Token Endpoint
```
POST https://www.esologs.com/oauth/token
```

### Request Parameters
```
grant_type: client_credentials
client_id: <from .env>
client_secret: <from .env>
```

### Response Format
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLC...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Token Expiration
- Client credentials tokens typically expire in 1 hour (3600 seconds)
- The token includes expiration info in the JWT payload
- Tokens can be refreshed using the same client credentials flow

---

## Verifying Authentication

After setting the token, verify authentication is working:

```typescript
// Check if token is present
const tokenPresent = await page.evaluate(() => {
  return !!localStorage.getItem('access_token');
});
console.log('Token present:', tokenPresent);

// Check if app shows authenticated state
// Look for elements that only appear when logged in
const userMenuVisible = await page.locator('[data-testid="user-menu"]').isVisible();
console.log('User menu visible:', userMenuVisible);
```

---

## Troubleshooting

### Issue: "Token is invalid or expired"

**Cause**: Token from `.env` credentials may have expired, or client credentials have limited scopes.

**Solution**:
```typescript
// Generate a fresh token
const response = await fetch('https://www.esologs.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
  }),
});
```

### Issue: "App doesn't show authenticated content"

**Cause**: localStorage not set correctly, or page not reloaded.

**Solution**:
1. Verify token is in localStorage
2. Trigger storage event
3. Reload the page
4. Check browser console for auth errors

```typescript
// Debug auth state
await page.evaluate(() => {
  console.log('access_token:', localStorage.getItem('access_token'));
  console.log('authenticated:', localStorage.getItem('authenticated'));
});
```

### Issue: "No OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET"

**Cause**: `.env` file not loaded or missing credentials.

**Solution**:
```powershell
# Check .env file exists
cat .env

# Verify credentials are present
# OAUTH_CLIENT_ID=your_client_id_here
# OAUTH_CLIENT_SECRET=your_client_secret_here

# Load .env in your script
import * as dotenv from 'dotenv';
dotenv.config();
```

### Issue: "Client credentials scope limitations"

**Cause**: Client credentials grant has limited scopes compared to user OAuth flow.

**Solution**:
- For full user profile access, you may need to use the browser-based OAuth flow
- Client credentials are sufficient for most report and combat log access
- See `tests/global-setup.ts` `performBrowserLogin()` for full OAuth flow

---

## Security Best Practices

### Protecting OAuth Credentials

- **Never commit `.env` to version control** - Already in `.gitignore`
- **Rotate credentials regularly** if used in production
- **Use read-only scopes** when possible
- **Monitor token usage** for unexpected activity

### Token Storage

- Tokens in `localStorage` persist across page reloads
- Clear tokens after testing: `localStorage.removeItem('access_token')`
- Don't expose tokens in screenshots or logs

### MCP Browser Session

- MCP browser sessions are isolated from your personal browser
- Tokens set in MCP browser don't affect your normal browsing
- Each MCP session starts fresh unless you load an auth state

---

## Reference: Existing Authentication Implementations

The ESO Log Aggregator project has several reference implementations you can study:

### 1. Playwright Global Setup (`tests/global-setup.ts`)
**What it does**: Authenticates tests using client credentials or browser OAuth flow

**Key functions**:
- `getClientCredentialsToken()` - OAuth client credentials flow
- `createAuthStateWithToken()` - Saves token to auth-state.json
- `performBrowserLogin()` - Full browser-based OAuth flow

**Usage**: Automatically runs before Playwright tests

### 2. Auth Utilities (`tests/auth-utils.ts`)
**What it does**: Helper functions for managing auth in tests

**Key functions**:
- `setAccessToken(token)` - Inject token into localStorage
- `getAccessToken()` - Retrieve token from localStorage
- `clearAuth()` - Remove authentication state

### 3. Application Auth Context (`src/features/auth/AuthContext.tsx`)
**What it does**: React context managing auth state in the app

**Key behavior**:
- Reads `access_token` from localStorage on mount
- Listens for storage events to sync auth across tabs
- Validates token and fetches user data

### 4. OAuth Redirect (`src/OAuthRedirect.tsx`)
**What it does**: Handles OAuth callback after user authorization

**Key behavior**:
- Exchanges authorization code for access token
- Stores token in localStorage
- Redirects to intended destination

---

## AI Agent Usage Guidelines

### When to Authenticate

✅ **Authenticate when**:
- Testing authenticated features (user profile, private reports)
- Taking screenshots of logged-in state
- Debugging auth-specific UI
- Validating permissions and access control

❌ **Don't authenticate when**:
- Testing public pages
- Validating error states for unauthenticated users
- Testing login/logout flows themselves

### Preferred Workflow

1. **Check if authentication is needed** for your task
2. **Use existing auth state** from `tests/auth-state.json` if available
3. **Generate fresh token** only if needed
4. **Verify auth worked** before proceeding
5. **Document auth setup** in test comments

### Example: Taking Screenshot of Authenticated Page

```typescript
// Step 1: Authenticate
const authToken = await generateOAuthToken();
await mcp_microsoft_pla_browser_navigate({ url: 'http://localhost:5173' });
await page.evaluate((token) => {
  localStorage.setItem('access_token', token);
}, authToken);
await page.reload();

// Step 2: Wait for auth to activate
await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

// Step 3: Navigate to authenticated page
await mcp_microsoft_pla_browser_navigate({ 
  url: 'http://localhost:5173/reports/myreports' 
});

// Step 4: Take screenshot
await mcp_microsoft_pla_browser_take_screenshot({
  filename: 'authenticated-reports.png'
});
```

---

## Additional Resources

- **Application Auth Flow**: `src/features/auth/auth.ts`
- **Playwright Test Setup**: `tests/global-setup.ts`
- **Test Auth Utilities**: `tests/auth-utils.ts`
- **OAuth Documentation**: https://www.esologs.com/api/docs
- **Project Playwright Guide**: [documentation/ai-agents/playwright/](../playwright/)

---

## Related Documentation

- [AI Playwright Instructions](../playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md)
- [AI Playwright Quick Reference](../playwright/AI_PLAYWRIGHT_QUICK_REFERENCE.md)
- [AI Agent Guidelines](../AI_AGENT_GUIDELINES.md)
- [MCP Tools Index](./INDEX.md)

---

**Notes for AI Agents**:
- Always load `.env` to get OAuth credentials
- Prefer using existing `tests/auth-state.json` when available
- Remember to reload page after setting localStorage
- Verify authentication worked before continuing
- Document authentication steps in your workflow
