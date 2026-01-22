# ESO Log Aggregator - Agent Skill (MCP Server)

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables AI assistants (Claude Desktop and GitHub Copilot) to interact with the ESO Log Aggregator application using Playwright for automated testing. The skill uses local authentication tokens from `tests/auth-state.json` to access authenticated features.

**Compatible With:**
- Claude Desktop (via Claude Skill/MCP)
- GitHub Copilot (via Agent Skills standard)

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

### 2. Configure Your AI Assistant

#### Option A: Claude Desktop

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

Then restart Claude Desktop to load the skill.

#### Option B: GitHub Copilot (VS Code)

Add the following to your VS Code settings (User or Workspace):

**File**: `.vscode/settings.json` or User Settings

```json
{
  "github.copilot.chat.agentSkills": {
    "eso-log-aggregator-testing": {
      "command": "node",
      "args": [
        "d:\\code\\eso-log-aggregator\\.claude\\server.js"
      ],
      "env": {
        "AUTH_STATE_PATH": "d:\\code\\eso-log-aggregator\\tests\\auth-state.json",
        "BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

**Important**: Update the paths to match your local installation.

Then reload VS Code window to load the skill.

### 3. Verify Installation

After configuration, verify the skill is loaded by asking your AI assistant:

**Claude Desktop**: "Can you check if the eso-log-aggregator-testing skill is available?"

**GitHub Copilot**: "@workspace Can you check dev server status?"

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

The MCP server provides **19 tools** organized into four categories:

1. **Development Server Management** (3 tools)
2. **Test Execution** (4 tools)
3. **Code Quality Tools** (4 tools)
4. **Git Workflow Automation** (3 tools) - **NEW!**
5. **Interactive Testing** (5 tools)

📖 **Git Workflow Full Documentation**: [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md)

---

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

### 2. `start_dev_server`

Start the development server in the background on port 3000.

**Usage:**
```
Start the dev server
```

**Returns:**
- Server status
- Process ID (PID)
- Server URL

**Notes:**
- Server runs as a detached background process
- Continues running even after Claude session ends
- Use `dev_server_status` to check if running
- Use `stop_dev_server` to stop it

### 3. `stop_dev_server`

Stop the running development server.

**Usage:**
```
Stop the dev server
```

**Returns:**
- Stop status
- Process ID that was stopped

### 4. `dev_server_status`

Check if the development server is currently running.

**Usage:**
```
Check if the dev server is running
```

**Returns:**
- Running status (true/false)
- Process ID (if running)
- Server URL

### 5. `run_smoke_tests`

Run quick smoke tests to validate critical paths.

**Parameters:**
- `project` (optional): Specific browser project (e.g., "chromium-desktop")

**Usage:**
```
Run smoke tests
```

**Returns:**
```json
{
  "testType": "smoke",
  "success": true,
  "summary": {
    "passed": 15,
    "failed": 0,
    "skipped": 0,
    "duration": 45000,
    "tests": [...]
  }
}
```

### 6. `run_full_tests`

Run the full E2E test suite (all non-nightly tests).

**Parameters:**
- `project` (optional): Specific browser project
- `maxFailures` (optional): Stop after N failures

**Usage:**
```
Run full test suite for chromium only
```

**Returns:**
- Structured test results with pass/fail counts
- Individual test details with errors
- Total duration

### 7. `run_nightly_tests`

Run comprehensive nightly tests across all browsers.

**Parameters:**
- `project` (optional): Specific browser (chromium-desktop, firefox-desktop, webkit-desktop, mobile-chrome, mobile-safari)
- `maxFailures` (optional): Stop after N failures

**Usage:**
```
Run nightly tests for chromium only with max 5 failures
```

**Warning**: This is slow! Consider using `project` to limit scope.

### 8. `run_authenticated_test`

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

### 9. `navigate_and_verify`

Navigate to a page and verify it loads correctly.

**Parameters:**
- `url`: URL path to navigate to
- `expectedTitle` (optional): Expected page title substring
- `expectedSelector` (optional): CSS selector that should be present

**Usage:**
```
Navigate to /dashboard and verify the page loads with title "Dashboard"
```

### 10. `take_screenshot`

Capture a screenshot of a page.

**Parameters:**
- `url`: URL path to navigate to
- `outputPath`: Path to save screenshot (relative to project root)
- `fullPage` (optional): Capture full page (default: false)

**Usage:**
```
Take a screenshot of /report/abc123 and save to screenshots/report-view.png
```

### 11. `check_element`

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

### 12. `run_format`

Format code with Prettier.

**Parameters:**
- `check` (optional): Only check formatting without changes (default: false)

**Usage:**
```
Format all code
```

Or check only:
```
Check code formatting without making changes
```

**Returns:**
- Success status
- Files formatted (or formatting issues found)

### 13. `run_lint`

Lint code with ESLint.

**Parameters:**
- `fix` (optional): Auto-fix fixable issues (default: false)

**Usage:**
```
Lint the code
```

Or with auto-fix:
```
Lint the code and fix issues
```

**Returns:**
- Success status
- Lint errors and warnings
- Files affected

### 14. `run_typecheck`

Run TypeScript type checking.

**Usage:**
```
Run type checking
```

**Returns:**
- Success status
- Type errors (if any)

### 15. `run_unit_tests`

Run Jest unit tests.

**Parameters:**
- `coverage` (optional): Generate coverage report (default: false)

**Usage:**
```
Run unit tests
```

Or with coverage:
```
Run unit tests with coverage
```

**Returns:**
- Success status
- Test results
- Coverage data (if requested)

### 16. `run_build`

Create production build.

**Usage:**
```
Build for production
```

**Returns:**
- Success status
- Build output
- Bundle size information

---

### 17. `git_create_branch`

Create and checkout a new git branch following project naming conventions (ESO-XXX-description).

**Usage:**
```
Create branch ESO-569-remove-duplicate-roles
```

**Parameters:**
- `branchName`: Branch name (e.g., "ESO-569-remove-duplicate-roles")

**Returns:**
- Branch name
- Creation status
- Action taken (create or checkout existing)

---

### 18. `git_commit_changes`

Stage and commit changes with a descriptive message following project standards.

**Usage:**
```
Commit changes with message:
ESO-569: Remove duplicate roles in the roles dropdown

- Removed redundant 'Damage Dealers' option
- Updated RoleFilter type
- Simplified filtering logic
```

**Parameters:**
- `message`: Commit message (format: "ESO-XXX: Description\n\nBullet points")
- `files` (optional): Array of files to stage (if omitted, stages all modified files)

**Returns:**
- Commit hash (short and full)
- Staged files
- Commit output

---

### 19. `git_push_branch`

Push current branch to remote origin with upstream tracking. Returns PR creation URL.

**Usage:**
```
Push the current branch
```

**Parameters:**
- `force` (optional): Force push (default: false)

**Returns:**
- Push status
- Branch name
- PR creation URL
- Push output

**Complete Workflow Example:**
```
Claude: Implement ESO-569 - remove duplicate roles dropdown

Agent will:
1. Create branch: ESO-569-remove-duplicate-roles
2. Make code changes
3. Commit with proper message
4. Push and provide PR URL
```

📖 **Full Documentation**: [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md)

---

## Usage Examples

### Example 1: Start Development Workflow

```
Claude: Start the dev server and verify it's running
```

The skill will:
1. Start the dev server in the background
2. Wait for it to initialize
3. Return the process ID and URL

### Example 2: Verify Dashboard Loads

```
Claude: Navigate to the dashboard and verify it loads with the expected elements
```

The skill will:
1. Load authentication from `auth-state.json`
2. Launch Playwright with auth state
3. Navigate to `/dashboard`
4. Verify page loads and elements are present

### Example 3: Run Test Suite

```
Claude: Start the dev server and run smoke tests
```

Expected:
- Server starts in background
- Smoke tests execute
- Returns structured results with pass/fail counts
- No HTML report opens (results are in structured format)

Example output:
```json
{
  "testType": "smoke",
  "success": true,
  "summary": {
    "passed": 15,
    "failed": 0,
    "skipped": 0,
    "duration": 45000
  }
}
```

### Example 4: Test Report Analysis

```
Claude: Run a test on report abc123:
- Navigate to /report/abc123
- Wait for .report-header
- Click the "Damage" tab
- Return the damage summary stats
```

The skill will execute the custom test code with full Playwright capabilities.

### Example 5: Complete Testing Session

```
Claude: 
1. Start the dev server
2. Wait for it to be ready
3. Navigate to /dashboard
4. Take a screenshot
5. Stop the dev server when done
```

### Example 6: Screenshot Comparison

```
Claude: Take screenshots of the following pages:
1. /dashboard
2. /report/abc123
3. /replay/xyz789
```

### Example 7: Check Authentication

```
Claude: Check my authentication status
```

Returns token information and expiry details.

### Example 8: Dev Server Management

```
Claude: Check if the dev server is running
```

Or:

```
Claude: If the dev server is not running, start it
```

### Example 9: Run All Test Suites

```
Claude: Run smoke, full, and nightly tests and give me a summary
```

AI will:
1. Run smoke tests (fast validation)
2. Run full test suite (comprehensive)
3. Run nightly tests (cross-browser)
4. Return combined summary with total pass/fail counts

Example output:
```
Smoke Tests: ✓ 15/15 passed in 45s
Full Tests: ✓ 85/85 passed in 6m
Nightly Tests: ✓ 450/450 passed in 25m
Total: 550 tests passed
```

### Example 10: Pre-Commit Validation

```
Claude: Run pre-commit checks (format, lint, typecheck, unit tests)

AI:
1. Checks code formatting
2. Lints code
3. Runs type checking
4. Runs unit tests
5. Reports: "All pre-commit checks passed ✓"
```

Or with issues:
```
AI Reports:
✓ Format: OK
✗ Lint: 3 issues found
✗ Typecheck: 1 error in Widget.tsx
✓ Unit Tests: 234 passed

Fix lint and type errors before committing.
```

### Example 11: Fix and Validate

```
Claude: Fix code quality issues and validate

AI:
1. Formats code
2. Lints with auto-fix
3. Runs type checking
4. Reports: "Fixed formatting and lint issues. Type checking passed ✓"
```

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
# Option 1: Start manually
npm run dev

# Option 2: Use Claude Skill
# Ask Claude: "Start the dev server"
```

### Error: "Dev server is already running"

**Solution**: This means a dev server is already running. You can:
1. Check status: Ask Claude "Check dev server status"
2. Stop it: Ask Claude "Stop the dev server"
3. Use the existing server

### Dev Server Won't Stop

**Solution**:
1. Check the PID: Look in `.claude/dev-server.pid`
2. Manually kill: `Stop-Process -Id <PID> -Force`
3. Delete PID file: `Remove-Item .claude/dev-server.pid`

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

### v1.3.0 (2026-01-21)
- **NEW**: Added `run_format` tool for code formatting with Prettier
- **NEW**: Added `run_lint` tool for linting with ESLint
- **NEW**: Added `run_typecheck` tool for TypeScript type checking
- **NEW**: Added `run_unit_tests` tool for Jest unit tests
- **NEW**: Added `run_build` tool for production builds
- Complete development workflow automation (16 tools total)
- All tools return structured results for AI parsing

### v1.2.0 (2026-01-21)
- **NEW**: Added `run_smoke_tests` tool for quick validation with structured results
- **NEW**: Added `run_full_tests` tool for comprehensive E2E testing
- **NEW**: Added `run_nightly_tests` tool for cross-browser testing
- Test results returned in structured JSON format (no HTML reports)
- Supports project filtering and max-failures limits

### v1.1.0 (2026-01-21)
- **NEW**: Added `start_dev_server` tool for background server management
- **NEW**: Added `stop_dev_server` tool to stop running servers
- **NEW**: Added `dev_server_status` tool to check server status
- **Cross-Platform**: Works with both Claude Desktop and GitHub Copilot via Agent Skills standard
- Process management with PID tracking in `.claude/dev-server.pid`
- Detached process execution prevents blocking AI assistant sessions
- Windows-specific process tree termination support

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
- [x] Dev server background management
- [ ] Token refresh automation
- [ ] Test result persistence
- [ ] Integration with Jira for bug reporting
- [ ] Screenshot comparison tools
- [ ] Performance metrics collection
- [ ] Network request interception
- [ ] Console log capture
- [ ] Test report generation
- [ ] Health check endpoint monitoring
- [ ] Automatic server restart on crashes
