# MCP Tools Quick Reference

**Last Updated**: November 12, 2025  
**Purpose**: Quick lookup for MCP tool usage and application authentication

---

## 🔑 Quick Application Authentication

### Use Existing Auth State (Fastest)
```typescript
// Load existing Playwright test auth
await page.context().storageState({ path: 'tests/auth-state.json' });
```

### Generate Fresh OAuth Token
```typescript
// Step 1: Get token from ESO Logs
const response = await fetch('https://www.esologs.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
  }),
});
const { access_token } = await response.json();

// Step 2: Navigate and inject token
await mcp_microsoft_pla_browser_navigate({ url: 'http://localhost:5173' });
await page.evaluate((token) => {
  localStorage.setItem('access_token', token);
  localStorage.setItem('authenticated', 'true');
}, access_token);

// Step 3: Reload to activate
await page.reload();
```

---

## 🧪 Available MCP Tools

### Microsoft Playwright Browser Tools
**Purpose**: Browser automation for the ESO Log Aggregator app

**Common Tools**:
- `mcp_microsoft_pla_browser_navigate` - Navigate to URL
- `mcp_microsoft_pla_browser_snapshot` - Capture accessibility snapshot
- `mcp_microsoft_pla_browser_click` - Click elements
- `mcp_microsoft_pla_browser_type` - Type text
- `mcp_microsoft_pla_browser_take_screenshot` - Take screenshots
- `mcp_microsoft_pla_browser_evaluate` - Run JavaScript

**Documentation**: [AI_MCP_PLAYWRIGHT_AUTH_SETUP.md](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md)

### Other MCP Servers
- **GitKraken** - Git operations, PRs, issues
- **Sentry** - Error tracking, issue search
- **Atlassian** - Jira work items, Confluence docs
- **Pylance** - Python language server

---

## 🔧 Environment Setup

### Required .env Variables
```properties
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
```

### Load .env in Scripts
```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
```

---

## 📦 localStorage Keys

| Key | Purpose | Required |
|-----|---------|----------|
| `access_token` | JWT from ESO Logs OAuth | ✅ Yes |
| `authenticated` | Auth status flag | Recommended |
| `access_token_refreshed_at` | Token refresh timestamp | Recommended |
| `access_token_expires_at` | Token expiration | Optional |
| `refresh_token` | OAuth refresh token | Optional |

---

## 🐛 Quick Troubleshooting

| Error | Quick Fix |
|-------|-----------|
| "App not authenticated" | Set `localStorage.setItem('access_token', token)` and reload |
| "OAUTH_CLIENT_ID missing" | Check `.env` file exists and is loaded with `dotenv.config()` |
| "Token expired" | Generate fresh token from `/oauth/token` endpoint |
| "localStorage not accessible" | Wait for page load: `await page.waitForLoadState('domcontentloaded')` |

---

## ✅ Verification Checklist

- [ ] `.env` file loaded (`dotenv.config()`)
- [ ] OAuth credentials present
- [ ] Token generated from `/oauth/token`
- [ ] Navigated to app with MCP tool
- [ ] Token injected into localStorage
- [ ] Page reloaded to activate auth
- [ ] Authenticated UI elements visible

---

## 🚀 Complete Minimal Example

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

// Get token
const res = await fetch('https://www.esologs.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.OAUTH_CLIENT_ID!,
    client_secret: process.env.OAUTH_CLIENT_SECRET!,
  }),
});
const { access_token } = await res.json();

// Navigate and auth
await mcp_microsoft_pla_browser_navigate({ url: 'http://localhost:5173' });
await page.evaluate((token) => localStorage.setItem('access_token', token), access_token);
await page.reload();
```

---

## 📝 Best Practices

### ✅ Do:
- Use `tests/auth-state.json` if available
- Generate fresh tokens when needed
- Reload page after setting localStorage
- Verify authentication worked
- Document auth steps

### ❌ Don't:
- Commit `.env` to version control
- Skip page reload after auth
- Assume auth worked without verification
- Use expired tokens

---

## 📚 Related Documentation

- **Full Setup Guide**: [AI_MCP_PLAYWRIGHT_AUTH_SETUP.md](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md)
- **Playwright Testing**: [../playwright/](../playwright/)
- **MCP Tools Index**: [INDEX.md](./INDEX.md)
- **Agent Guidelines**: [../AI_AGENT_GUIDELINES.md](../AI_AGENT_GUIDELINES.md)
