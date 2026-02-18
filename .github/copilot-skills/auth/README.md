# Auth Skill for GitHub Copilot

Authenticates MCP browser sessions with ESO Logs OAuth. Handles token generation, localStorage injection, and auth state management.

## Quick Start

```
@workspace Check if I have a valid auth token
@workspace Generate a fresh OAuth token
@workspace Get the auth injection script for token <token>
@workspace What localStorage keys does the app use for auth?
```

## Available Tools

### 1. `generate_oauth_token`

Generates a fresh OAuth access token using client credentials from `.env`.

**Usage:**
```
@workspace Generate an OAuth token
@workspace Get a fresh ESO Logs access token
```

**Requires:** `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in `.env`

### 2. `get_auth_script`

Returns a JavaScript snippet that injects an OAuth token into browser localStorage. Use with `mcp_microsoft_pla_browser_evaluate`.

**Usage:**
```
@workspace Get auth injection script for token eyJ0eXAi...
```

### 3. `check_auth_state`

Checks if `tests/auth-state.json` exists, contains a valid token, and whether it's expired.

**Usage:**
```
@workspace Check auth state
@workspace Is my auth token still valid?
```

### 4. `get_localstorage_keys`

Lists all localStorage keys the app uses for authentication with descriptions.

**Usage:**
```
@workspace What localStorage keys does auth use?
```

## Typical Workflow

1. **Check existing auth**: `check_auth_state` — see if a valid token exists
2. **Generate token**: `generate_oauth_token` — get a fresh token if needed
3. **Get script**: `get_auth_script` — get injectable JavaScript
4. **Inject in browser**: Navigate to app, run the script, reload

## Related Documentation

- [MCP Playwright Auth Setup](../../../documentation/ai-agents/mcp-tools/AI_MCP_PLAYWRIGHT_AUTH_SETUP.md) — Full reference with troubleshooting
- [Playwright Global Setup](../../../tests/global-setup.ts) — How Playwright tests authenticate
