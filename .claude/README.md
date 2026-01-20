# ESO Log Aggregator - Claude Skill (MCP Server)

## Overview

This Claude Skill provides a Model Context Protocol (MCP) server that enables Claude to interact with the ESO Log Aggregator application using Playwright for automated testing. The skill uses local authentication tokens from `tests/auth-state.json` to access authenticated features.

## Features

- **Authenticated Testing**: Use local OAuth tokens for testing authenticated features
- **Playwright Integration**: Full browser automation capabilities
- **Multiple Tools**: Various testing utilities for different scenarios
- **Token Management**: Automatic token validation and expiry checking

## Installation

### 1. Install Dependencies

```powershell
cd .claude
npm install
```

### 2. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "eso-log-aggregator-testing": {
      "command": "node",
      "args": [
        "d:\\code\\eso-log-aggregator\\.claude\\server.js"
      ],
      "env": {
        "AUTH_STATE_PATH": "d:\\code\\eso-log-aggregator\\tests\\auth-state.json",
        "BASE_URL": "http://localhost:3000",
        "PLAYWRIGHT_CONFIG": "d:\\code\\eso-log-aggregator\\playwright.debug.config.ts"
      }
    }
  }
}
```

**Important**: Update the paths to match your local installation.

### 3. Restart Claude Desktop

After configuring, restart Claude Desktop to load the new MCP server.

## Prerequisites

1. **Authentication Token**: You must have a valid `tests/auth-state.json` file with a working OAuth token.
   - Run Playwright global setup: `npm run test:nightly:all` (will create auth state)
   - Or manually create using `scripts/generate-auth-token.ts` (if available)

2. **Local Development Server**: The application should be running locally:
   ```powershell
   npm run dev
   ```

3. **Node.js**: Ensure Node.js 20+ is installed

## Available Tools

### 1. `get_auth_status`

Check the current authentication status and token information.

**Usage:**
```
Check my auth status
```

**Returns:**
- Authentication status
- Token presence and length
- Token expiry information
- Configured origins

### 2. `run_authenticated_test`

Run custom Playwright test code with authentication.

**Parameters:**
- `url`: URL path to navigate to (e.g., `/report/abc123`)
- `testCode`: JavaScript code to execute (with access to `page` variable)
- `waitForSelector` (optional): CSS selector to wait for before running test

**Usage:**
```
Run an authenticated test:
- Navigate to /dashboard
- Wait for .report-list selector
- Execute: return await page.textContent('h1')
```

**Example:**
```javascript
// testCode parameter
return await page.evaluate(() => {
  return {
    title: document.title,
    reportCount: document.querySelectorAll('.report-item').length
  };
});
```

### 3. `navigate_and_verify`

Navigate to a page and verify it loads correctly.

**Parameters:**
- `url`: URL path to navigate to
- `expectedTitle` (optional): Expected page title substring
- `expectedSelector` (optional): CSS selector that should be present

**Usage:**
```
Navigate to /dashboard and verify the page loads with title "Dashboard"
```

### 4. `take_screenshot`

Capture a screenshot of a page.

**Parameters:**
- `url`: URL path to navigate to
- `outputPath`: Path to save screenshot (relative to project root)
- `fullPage` (optional): Capture full page (default: false)

**Usage:**
```
Take a screenshot of /report/abc123 and save to screenshots/report-view.png
```

### 5. `check_element`

Check if an element exists and is visible on a page.

**Parameters:**
- `url`: URL path to navigate to
- `selector`: CSS selector to check

**Usage:**
```
Check if the .replay-button element exists on /report/abc123
```

**Returns:**
- Element existence status
- Visibility status
- Bounding box information (if visible)

## Usage Examples

### Example 1: Verify Dashboard Loads

```
Claude: Navigate to the dashboard and verify it loads with the expected elements
```

The skill will:
1. Load authentication from `auth-state.json`
2. Launch Playwright with auth state
3. Navigate to `/dashboard`
4. Verify page loads and elements are present

### Example 2: Test Report Analysis

```
Claude: Run a test on report abc123:
- Navigate to /report/abc123
- Wait for .report-header
- Click the "Damage" tab
- Return the damage summary stats
```

The skill will execute the custom test code with full Playwright capabilities.

### Example 3: Screenshot Comparison

```
Claude: Take screenshots of the following pages:
1. /dashboard
2. /report/abc123
3. /replay/xyz789
```

### Example 4: Check Authentication

```
Claude: Check my authentication status
```

Returns token information and expiry details.

## Token Management

### Token Location

Tokens are stored in `tests/auth-state.json` with the following structure:

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [
        {
          "name": "access_token",
          "value": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        },
        {
          "name": "authenticated",
          "value": "true"
        },
        {
          "name": "access_token_expires_at",
          "value": "1762537507411"
        }
      ]
    }
  ]
}
```

### Token Validation

The skill automatically:
- Checks if token exists
- Validates token expiry
- Reports token status

### Refreshing Tokens

If your token expires, regenerate it:

```powershell
# Run Playwright setup to get fresh token
npm run test:nightly:all

# Or use VS Code MCP Playwright tool's auth setup
```

## Troubleshooting

### Error: "No authentication state found"

**Solution**: Create `tests/auth-state.json` by running Playwright tests:
```powershell
npm run test:nightly:all
```

### Error: "Token has expired"

**Solution**: Regenerate the auth state file with a fresh token.

### Error: "Cannot connect to BASE_URL"

**Solution**: Ensure development server is running:
```powershell
npm run dev
```

### Browser Doesn't Launch

**Solution**: 
1. Verify Playwright browsers are installed: `npx playwright install`
2. Check that `@playwright/test` is installed in `.claude/node_modules`

### MCP Server Not Showing in Claude

**Solution**:
1. Verify configuration path is correct in `claude_desktop_config.json`
2. Check paths use correct separators (backslashes on Windows)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

## Development

### Testing the Server Locally

You can test the MCP server outside of Claude:

```powershell
cd .claude
node server.js
```

The server communicates via stdio, so direct testing requires an MCP client.

### Modifying Tools

Edit `server.js` to add new tools or modify existing ones. The structure follows the MCP protocol:

1. Add tool definition in `ListToolsRequestSchema` handler
2. Add tool implementation in `CallToolRequestSchema` handler
3. Restart Claude Desktop to reload changes

### Adding New Features

Common additions:
- **Custom assertions**: Add validation logic in test code
- **Wait strategies**: Implement custom wait conditions
- **Data extraction**: Parse and return structured data from pages
- **Multi-page flows**: Navigate through multiple pages in sequence

## Integration with Existing Tests

This Claude Skill complements existing Playwright tests:

- **Playwright Tests** (`tests/`): Structured, automated test suites
- **Claude Skill**: Ad-hoc, exploratory testing with AI assistance

Use the Claude Skill for:
- Quick verification of features
- Exploratory testing
- Visual inspection via screenshots
- Debugging specific issues

Use Playwright tests for:
- Regression testing
- CI/CD integration
- Comprehensive test coverage

## Security Considerations

1. **Token Storage**: Tokens in `auth-state.json` have full access to your account
2. **Local Only**: This skill is for local development only
3. **Token Expiry**: Tokens expire after 45 minutes (standard OAuth flow)
4. **No Remote Access**: Never commit `auth-state.json` to version control

## Environment Variables

The skill respects the following environment variables (configured in `claude_desktop_config.json`):

- `AUTH_STATE_PATH`: Path to auth state file (default: `tests/auth-state.json`)
- `BASE_URL`: Base URL of the application (default: `http://localhost:3000`)
- `PLAYWRIGHT_CONFIG`: Path to Playwright config (for reference)

## Related Documentation

- [AI Agent Guidelines](../documentation/ai-agents/AI_AGENT_GUIDELINES.md)
- [Playwright Testing Guide](../tests/README.md)
- [Authentication Setup](../documentation/architecture/AUTHENTICATION.md)
- [VS Code MCP Playwright Tool](../AGENTS.md) - Built-in testing capabilities

## Changelog

### v1.0.0 (2026-01-20)
- Initial release
- Five core tools: auth status, run test, navigate, screenshot, check element
- Full authentication support with token validation
- Integration with existing Playwright infrastructure

## Support

For issues or questions:
1. Check this README
2. Review existing Playwright tests for examples
3. Check auth-state.json for valid token
4. Verify development server is running
5. Check Claude Desktop logs for MCP server errors

## Future Enhancements

Potential additions:
- [ ] Token refresh automation
- [ ] Test result persistence
- [ ] Integration with Jira for bug reporting
- [ ] Screenshot comparison tools
- [ ] Performance metrics collection
- [ ] Network request interception
- [ ] Console log capture
- [ ] Test report generation
