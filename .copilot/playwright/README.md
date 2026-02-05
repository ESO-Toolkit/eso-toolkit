# ESO Log Aggregator - Playwright Testing Agent Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables GitHub Copilot to run Playwright tests and get machine-readable results **without opening HTML reports**. This solves the problem of agents not being able to read HTML reports.

**Compatible With:**
- GitHub Copilot (VS Code) via Agent Skills standard

## Features

- **Machine-Readable Results**: Uses Playwright's `list` reporter to output parseable text
- **Multiple Test Configurations**: Run smoke, full, nightly, screen-size, and performance tests
- **Cached Results**: Store and retrieve last test results
- **Test File Discovery**: List all available test files
- **Flexible Execution**: Run specific test files or full suites
- **No HTML Reports**: Results returned as JSON for agent consumption

## Installation

### 1. Install Dependencies

From the project root:

```powershell
npm install
```

This will install dependencies for all workspaces, including this MCP server.

### 2. Configure GitHub Copilot (VS Code)

Add this configuration to `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "eso-playwright": {
      "command": "node",
      "args": [
        "${workspaceFolder}\\.copilot\\playwright\\server.js"
      ]
    }
  }
}
```

### 3. Restart VS Code

After adding the configuration, restart VS Code to load the new Agent Skill.

## Available Tools

### Test Execution

#### `run_playwright_tests`
Run Playwright tests with a specific configuration file.

**Parameters:**
- `config` (required): Config file name
  - `playwright.config.ts` - Default config
  - `playwright.smoke.config.ts` - Quick smoke tests
  - `playwright.full.config.ts` - Full E2E suite
  - `playwright.nightly.config.ts` - Comprehensive nightly tests
  - `playwright.screen-sizes.config.ts` - Screen size regression
  - `playwright.screen-sizes-fast.config.ts` - Fast screen size tests
  - `playwright.performance.config.ts` - Performance benchmarks
  - `playwright.debug.config.ts` - Debug configuration
- `testFile` (optional): Specific test file to run (e.g., `"tests/smoke.spec.ts"`)
- `args` (optional): Additional CLI arguments (e.g., `["--headed", "--project=chromium"]`)

**Example:**
```
@workspace Run playwright tests with smoke config
```

**Returns:**
```json
{
  "success": true,
  "duration": 5234,
  "summary": {
    "total": 10,
    "passed": 10,
    "failed": 0,
    "skipped": 0,
    "flaky": 0
  },
  "tests": [
    {
      "name": "loads homepage",
      "file": "tests/smoke.spec.ts:5:1",
      "browser": "chromium",
      "status": "passed"
    }
  ],
  "failedTests": [],
  "output": "... first 5000 chars of output ..."
}
```

#### `run_smoke_tests`
Run quick smoke tests for PR validation.

**Example:**
```
@workspace Run smoke tests
```

#### `run_full_tests`
Run the full E2E test suite.

**Parameters:**
- `headed` (optional): Run in headed mode (visible browser)

**Example:**
```
@workspace Run full tests in headed mode
```

#### `run_nightly_tests`
Run comprehensive nightly regression tests across browsers.

**Parameters:**
- `project` (optional): Specific project to run (e.g., `"chromium-desktop"`, `"firefox-desktop"`)

**Example:**
```
@workspace Run nightly tests for chromium
```

#### `run_screen_size_tests`
Run visual regression tests across different screen sizes.

**Parameters:**
- `fast` (optional): Use fast mode with fewer screen sizes

**Example:**
```
@workspace Run screen size tests in fast mode
```

#### `run_performance_tests`
Run performance benchmarking tests.

**Example:**
```
@workspace Run performance tests
```

#### `run_single_test`
Run a single test file.

**Parameters:**
- `testFile` (required): Path to test file (e.g., `"tests/smoke.spec.ts"`)
- `headed` (optional): Run in headed mode

**Example:**
```
@workspace Run the smoke test file in headed mode
```

### Test Information

#### `get_test_results`
Get the last cached test results without re-running tests.

**Example:**
```
@workspace Show me the last test results
```

#### `list_test_files`
List all available test files in the tests directory.

**Example:**
```
@workspace What test files are available?
```

**Returns:**
```json
{
  "files": [
    {
      "path": "tests/smoke.spec.ts",
      "name": "smoke.spec.ts",
      "size": 2341
    },
    {
      "path": "tests/feature-a.spec.ts",
      "name": "feature-a.spec.ts",
      "size": 5432
    }
  ]
}
```

## Usage Examples

### Check What Tests Exist
```
@workspace List all playwright test files
```

### Run Quick Validation
```
@workspace Run smoke tests
```

### Run Specific Test
```
@workspace Run the RosterBuilderPage test
```

### Debug Failed Tests
```
@workspace Run full tests in headed mode
```

### Check Results
```
@workspace Show me the last test results
```

### Run Comprehensive Testing
```
@workspace Run nightly tests for firefox
```

## How It Solves the HTML Report Problem

**The Problem:**
- Default Playwright configuration uses `html` reporter
- Running tests opens an HTML report in the browser
- Agents can't read HTML reports
- This blocks automated testing workflows

**The Solution:**
- This skill uses Playwright's `--reporter=list` flag
- Output is plain text that can be parsed
- Results are converted to structured JSON
- Agents can read and interpret the results
- No browser windows opened during test runs

## Result Format

All test execution tools return a consistent JSON format:

```json
{
  "success": true | false,
  "duration": 5234,
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 2,
    "skipped": 0,
    "flaky": 0
  },
  "tests": [
    {
      "name": "test name",
      "file": "file path",
      "browser": "chromium",
      "status": "passed" | "failed" | "skipped"
    }
  ],
  "failedTests": [
    {
      "name": "failed test",
      "file": "file path",
      "browser": "chromium",
      "status": "failed"
    }
  ],
  "output": "first 5000 characters of test output"
}
```

## Caching

Test results are cached in `.copilot/playwright/last-results.json`. This allows:
- Quick access to results without re-running tests
- Historical reference for debugging
- Faster agent responses when just checking status

## Troubleshooting

### Skill Not Appearing

1. Check VS Code settings include the configuration
2. Restart VS Code completely
3. Check Output panel → Model Context Protocol for errors

### Tests Not Running

1. Ensure you're in the project root directory
2. Check that `npx playwright` is available: `npx playwright --version`
3. Verify the config file exists in the project root

### Results Not Parsing

1. Check `.copilot/playwright/last-results.json` for cached data
2. Run with `--headed` to see what's happening visually
3. Check the `output` field in results for raw test output

## Integration with Other Skills

This skill works well with:
- **Git Workflow Skill**: Run tests before committing
- **Jira Skill**: Update tickets based on test results
- **Sentry Skill**: Cross-reference test failures with errors

**Example Workflow:**
```
@workspace Ensure I'm on feature branch for ESO-123
@workspace Run smoke tests
@workspace If tests pass, commit changes with message "Fix bug"
@workspace Move ESO-123 to "In Review"
```

## Technical Details

- **Reporter**: Uses Playwright's `list` reporter (plain text output)
- **Buffer Size**: 10MB max output buffer
- **Result Caching**: JSON file in `.copilot/playwright/`
- **Output Truncation**: First 5000 chars preserved for debugging
- **Error Handling**: Captures both stdout and stderr

## Development

To modify this skill:

1. Edit `server.js`
2. Restart VS Code to reload the skill
3. Test with: `@workspace <your command>`

## See Also

- [Main Agent Documentation](../../AGENTS.md)
- [Testing Documentation](../../documentation/features/testing/)
- [Playwright Configuration Files](../../playwright.*.config.ts)
