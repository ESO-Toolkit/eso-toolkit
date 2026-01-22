# ESO Log Aggregator - GitHub Copilot Agent Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables GitHub Copilot to interact with the ESO Log Aggregator application using Playwright for automated testing. The skill uses local authentication tokens from `tests/auth-state.json` to access authenticated features.

**Compatible With:**
- GitHub Copilot (VS Code) via Agent Skills standard

## Features

- **Authenticated Testing**: Use local OAuth tokens for testing authenticated features
- **Playwright Integration**: Full browser automation capabilities
- **Development Workflow Tools**: Format, lint, typecheck, build automation
- **Test Execution**: Run unit tests, smoke tests, full E2E suite, and nightly tests
- **Dev Server Management**: Start/stop development server as background process
- **Multiple Testing Tools**: Various utilities for different testing scenarios
- **Token Management**: Automatic token validation and expiry checking

## Installation

### 1. Install Dependencies

```powershell
cd .copilot
npm install
```

### 2. Configure GitHub Copilot (VS Code)

The Agent Skill is already configured in [`.vscode/settings.json`](../.vscode/settings.json). The configuration uses workspace-relative paths, so it will work automatically when you open this project in VS Code.

**Configuration (already set up):**

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-testing": {
      "command": "node",
      "args": [
        "${workspaceFolder}\\.copilot\\server.js"
      ],
      "env": {
        "AUTH_STATE_PATH": "${workspaceFolder}\\tests\\auth-state.json",
        "BASE_URL": "http://localhost:3000",
        "PLAYWRIGHT_CONFIG": "${workspaceFolder}\\playwright.debug.config.ts"
      }
    }
  }
}
```

### 3. Reload VS Code Window

After installing dependencies, reload the VS Code window to activate the skill:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Reload Window" and select it
3. Or close and reopen VS Code

### 4. Verify Installation

After reloading, verify the skill is loaded by asking Copilot:

**In Copilot Chat:**
```
@workspace Can you check dev server status?
```

## Prerequisites

1. **Authentication Token**: You must have a valid `tests/auth-state.json` file with a working OAuth token.
   - Run Playwright global setup to generate: `npm run test:nightly:all`
   - This creates the auth token needed for authenticated testing

2. **Local Development Server** (optional): The application should be running locally for some tools:
   ```powershell
   npm run dev
   ```
   
   Or use the `start_dev_server` tool to start it in the background.

## Available Tools

The Agent Skill provides **19 tools** organized into four categories:

1. **Development Server Management** (3 tools)
2. **Test Execution** (4 tools)
3. **Code Quality Tools** (4 tools)
4. **Git Workflow Automation** (3 tools) - **NEW!**
5. **Interactive Testing** (5 tools)

---

### Development Server Management

#### `start_dev_server`
Start the development server in the background. The server runs on port 3000 and continues running independently.

**Example:**
```
@workspace Start the dev server
```

#### `stop_dev_server`
Stop the running development server.

**Example:**
```
@workspace Stop the dev server
```

#### `dev_server_status`
Check if the development server is running.

**Example:**
```
@workspace Check dev server status
```

---

### Test Execution

#### `run_smoke_tests`
Run quick smoke tests (E2E only) to validate critical paths. Returns structured test results.

**Parameters:**
- `project` (optional): Specific browser project (e.g., "chromium-desktop")

**Example:**
```
@workspace Run smoke tests
```

#### `run_full_tests`
Run full E2E test suite (all non-nightly tests). Returns structured test results.

**Parameters:**
- `project` (optional): Specific browser project
- `maxFailures` (optional): Stop after N failures

**Example:**
```
@workspace Run full test suite
@workspace Run full tests for chromium with max 3 failures
```

#### `run_nightly_tests`
Run comprehensive nightly tests across all browsers. **WARNING: This is slow!** Returns structured test results.

**Parameters:**
- `project` (optional): Specific browser project (chromium-desktop, firefox-desktop, webkit-desktop, mobile-chrome, mobile-safari)
- `maxFailures` (optional): Stop after N failures

**Example:**
```
@workspace Run nightly tests for chromium
```

#### `run_unit_tests`
Run Jest unit tests. Returns structured test results.

**Parameters:**
- `coverage` (optional): Generate coverage report (default: false)

**Example:**
```
@workspace Run unit tests
@workspace Run unit tests with coverage
```

---

### Code Quality Tools

#### `run_format`
Format code with Prettier. Returns files that were formatted.

**Parameters:**
- `check` (optional): Only check formatting without making changes (default: false)

**Example:**
```
@workspace Format the code
@workspace Check code formatting
```

#### `run_lint`
Lint code with ESLint. Returns lint errors and warnings.

**Parameters:**
- `fix` (optional): Automatically fix fixable issues (default: false)

**Example:**
```
@workspace Lint the code
@workspace Lint and fix issues
```

#### `run_typecheck`
Run TypeScript type checking. Returns type errors if any.

**Example:**
```
@workspace Run type checking
```

---

### Git Workflow Automation

#### `git_create_branch`
Create and checkout a new git branch following project naming conventions (ESO-XXX-description).

**Parameters:**
- `branchName`: Branch name to create (e.g., "ESO-569-remove-duplicate-roles")

**Example:**
```
@workspace Create branch ESO-569-remove-duplicate-roles
```

#### `git_commit_changes`
Stage and commit changes with a descriptive message following project commit standards.

**Parameters:**
- `message`: Commit message (should follow format: "ESO-XXX: Description\n\nBullet points")
- `files` (optional): Array of files to stage (if omitted, stages all modified files)

**Example:**
```
@workspace Commit changes with message:
ESO-569: Remove duplicate roles in the roles dropdown

- Removed redundant 'Damage Dealers' option
- Updated RoleFilter type
- Simplified filtering logic
```

#### `git_push_branch`
Push current branch to remote origin with upstream tracking. Returns push status and PR creation URL.

**Parameters:**
- `force` (optional): Force push (default: false)

**Example:**
```
@workspace Push the current branch
```

**Complete Workflow Example:**
```
@workspace Implement ESO-569: Remove duplicate roles dropdown

Agent will:
1. Create branch: ESO-569-remove-duplicate-roles
2. Make code changes
3. Commit with proper message
4. Push and provide PR URL
```

📖 **Full Documentation**: [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md)

---

### Build Tools

#### `run_build`
Create production build. Returns build status and any errors.

**Example:**
```
@workspace Build the project
```

---

### Authenticated Browser Testing

#### `run_authenticated_test`
Run a Playwright test with local authentication token. This allows you to test authenticated features of the ESO Log Aggregator application.

**Parameters:**
- `url`: The URL path to navigate to (relative to BASE_URL)
- `testCode`: JavaScript code to execute in the Playwright context (you have access to "page" variable)
- `waitForSelector` (optional): CSS selector to wait for before running test code

**Example:**
```
@workspace Run authenticated test:
- URL: /
- Test: Check if the report upload button is visible
- Wait for: .upload-button
```

#### `get_auth_status`
Check the current authentication status and token information.

**Example:**
```
@workspace What's the auth status?
```

#### `navigate_and_verify`
Navigate to a page and verify it loads correctly with authentication.

**Parameters:**
- `url`: The URL path to navigate to (relative to BASE_URL)
- `expectedTitle` (optional): Expected page title to verify
- `expectedSelector` (optional): CSS selector that should be present on the page

**Example:**
```
@workspace Navigate to / and verify the page loads
```

#### `take_screenshot`
Take a screenshot of a page at a specific URL.

**Parameters:**
- `url`: The URL path to navigate to (relative to BASE_URL)
- `outputPath`: Path where to save the screenshot (relative to project root)
- `fullPage` (optional): Whether to capture the full page or just viewport (default: false)

**Example:**
```
@workspace Take a screenshot of / and save to screenshots/home.png
```

#### `check_element`
Check if an element exists and is visible on a page.

**Parameters:**
- `url`: The URL path to navigate to (relative to BASE_URL)
- `selector`: CSS selector to check

**Example:**
```
@workspace Check if .upload-button exists on /
```

---

## Example Workflows

### Quick Feature Verification

```
@workspace Start the dev server
@workspace Navigate to / and verify the main UI loads
@workspace Check if .report-list exists on /reports
@workspace Stop the dev server
```

### Code Quality Check Before Commit

```
@workspace Format the code
@workspace Lint and fix issues
@workspace Run type checking
@workspace Run unit tests
```

### Full Testing Workflow

```
@workspace Start dev server
@workspace Run smoke tests
@workspace Run full test suite for chromium
@workspace Stop dev server
```

### Visual Inspection

```
@workspace Start dev server
@workspace Take a screenshot of / and save to screenshots/home.png
@workspace Take a screenshot of /reports and save to screenshots/reports.png
@workspace Stop dev server
```

---

## Troubleshooting

### Skill Not Loading

1. **Check MCP is enabled**: Verify `github.copilot.chat.mcp.enabled` is `true` in settings
2. **Reload Window**: Press `Ctrl+Shift+P` → "Reload Window"
3. **Check Output Panel**: View → Output → Select "GitHub Copilot Chat" from dropdown
4. **Verify Paths**: Ensure paths in `.vscode/settings.json` use `${workspaceFolder}` variable

### Authentication Errors

1. **Generate Token**: Run `npm run test:nightly:all` to create `tests/auth-state.json`
2. **Check Expiry**: Use `@workspace Check auth status` to verify token validity
3. **Regenerate**: If expired, run nightly tests again to refresh token

### Dev Server Issues

1. **Port Conflict**: Ensure port 3000 is not already in use
2. **Check Status**: Use `@workspace Check dev server status`
3. **Manual Start**: Try starting manually with `npm run dev` first
4. **Force Stop**: Use Task Manager to kill any orphaned node processes

### Test Failures

1. **Dev Server**: Ensure dev server is running for E2E tests
2. **Dependencies**: Run `cd .copilot && npm install` if tools are missing
3. **Clear Cache**: Clear browser cache and playwright state
4. **Check Logs**: Review test output in Copilot chat for specific errors

---

## Architecture

### File Structure

```
.copilot/
├── server.js              # Main MCP server implementation
├── auth-utils.js          # Authentication utilities
├── package.json           # Dependencies and metadata
├── copilot-config.json    # Example configuration
└── README.md             # This file
```

### How It Works

1. **MCP Protocol**: Uses Model Context Protocol for tool-based AI interactions
2. **Playwright Integration**: Launches Chromium with authenticated state
3. **Token Management**: Loads OAuth token from `tests/auth-state.json`
4. **Background Processes**: Dev server runs detached for independent operation
5. **Structured Results**: Returns JSON-formatted results for AI interpretation

### Environment Variables

- `AUTH_STATE_PATH`: Path to authentication state file (default: `tests/auth-state.json`)
- `BASE_URL`: Base URL for the application (default: `http://localhost:3000`)
- `PLAYWRIGHT_CONFIG`: Playwright configuration file (optional)

---

## Differences from Claude Skill

This is a **GitHub Copilot-specific** implementation. Key differences:

- ✅ **VS Code Integration**: Configured via `.vscode/settings.json`
- ✅ **Workspace Variables**: Uses `${workspaceFolder}` for portability
- ✅ **Copilot Chat**: Works with `@workspace` command in Copilot
- ✅ **MCP Protocol**: Uses `github.copilot.chat.mcp.servers` configuration

The original `.claude/` directory contains the Claude Desktop implementation.

---

## Documentation

**Quick References:**
- [Test Execution Tools](TEST_EXECUTION_TOOLS.md)
- [Development Workflow Tools](WORKFLOW_TOOLS.md)
- [Dev Server Tools](DEV_SERVER_TOOLS.md)

**Main Documentation:**
- [AI Agent Guidelines](../documentation/ai-agents/AI_AGENT_GUIDELINES.md)
- [Scribing Detection System](../documentation/ai-agents/scribing/)
- [Report Data Debugging](../documentation/ai-agents/AI_REPORT_DATA_DEBUGGING.md)
- [Jira Workflow (acli)](../documentation/ai-agents/jira/)

---

## Contributing

When making changes to the Agent Skill:

1. **Update Both Implementations**: Changes may need to apply to both `.copilot/` and `.claude/`
2. **Test Thoroughly**: Verify tools work in VS Code before committing
3. **Document Changes**: Update this README and relevant documentation
4. **Version Bump**: Increment version in `package.json` for significant changes

---

## License

MIT

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review MCP server output in VS Code Output panel
3. Verify configuration in `.vscode/settings.json`
4. Check authentication token status with `@workspace Check auth status`
