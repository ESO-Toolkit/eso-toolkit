# Sentry Integration Skill (MCP Server)

AI agent skill for managing Sentry issues in the ESO Log Aggregator project.

## Overview

This MCP server provides tools for GitHub Copilot and Claude to interact with Sentry error tracking using the Sentry CLI. It enables automated workflows for viewing, creating, resolving, and managing production issues.

## Prerequisites

### 1. Install Sentry CLI

**npm (global)**:
```bash
npm install -g @sentry/cli
```

**Homebrew (macOS)**:
```bash
brew install getsentry/tools/sentry-cli
```

**Windows**:
```powershell
# Download from https://github.com/getsentry/sentry-cli/releases
# Or use npm as above
```

### 2. Authentication

Set up your Sentry authentication token:

```bash
# Set environment variable
export SENTRY_AUTH_TOKEN="your-token-here"

# Or create .sentryclirc file in your home directory
[auth]
token=your-token-here
```

To create an auth token:
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new token with appropriate permissions (Project: Read/Write, Organization: Read)
3. Copy the token

### 3. Configuration

Set environment variables for your organization and project:

```bash
export SENTRY_ORG="your-org-name"
export SENTRY_PROJECT="eso-log-aggregator"
```

Or update the defaults in [server.js](server.js):
```javascript
const SENTRY_ORG = process.env.SENTRY_ORG || 'your-org';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'eso-log-aggregator';
```

## Installation

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "node",
      "args": ["D:\\code\\eso-log-aggregator\\.claude\\sentry\\server.js"],
      "env": {
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "eso-log-aggregator",
        "SENTRY_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

### For GitHub Copilot (VS Code)

Add to your VS Code settings (`.vscode/settings.json`):

```json
{
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.experimental.agentSkills": {
    "sentry": {
      "command": "node",
      "args": ["${workspaceFolder}/.copilot/sentry/server.js"],
      "env": {
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "eso-log-aggregator",
        "SENTRY_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Available Tools

### 1. sentry_search_issues
Search for Sentry issues using filters.

**Usage**:
```
@workspace Search for unresolved TypeErrors in Sentry
@workspace Find all high priority issues from the last 24 hours
```

**Parameters**:
- `query` (string): Search query (e.g., "is:unresolved", "error.type:TypeError")
- `status` (string): Filter by status: "resolved", "unresolved", or "ignored"
- `limit` (number): Maximum results (default: 25)

### 2. sentry_view_issue
View details of a specific Sentry issue.

**Usage**:
```
@workspace View Sentry issue 1234567890
@workspace Show me the details of issue ABC123
```

**Parameters**:
- `issueId` (string, required): Sentry issue ID

### 3. sentry_resolve_issue
Resolve or unresolve a Sentry issue.

**Usage**:
```
@workspace Resolve Sentry issue 1234567890
@workspace Mark issue ABC123 as resolved in release 1.2.3
@workspace Unresolve issue 1234567890
```

**Parameters**:
- `issueId` (string, required): Sentry issue ID
- `resolve` (boolean): true to resolve, false to unresolve (default: true)
- `inRelease` (string): Release version to mark as resolved in

### 4. sentry_assign_issue
Assign a Sentry issue to a user or team.

**Usage**:
```
@workspace Assign Sentry issue 1234567890 to john@example.com
@workspace Unassign issue ABC123
```

**Parameters**:
- `issueId` (string, required): Sentry issue ID
- `assignee` (string, required): Username/email or "unassigned"

### 5. sentry_comment_issue
Add a comment/note to a Sentry issue.

**Usage**:
```
@workspace Add comment to Sentry issue 1234567890: "Fixed in PR #123"
```

**Parameters**:
- `issueId` (string, required): Sentry issue ID
- `comment` (string, required): Comment text

### 6. sentry_create_issue
Manually create a Sentry issue (rare, typically auto-created from errors).

**Usage**:
```
@workspace Create a Sentry issue for manual tracking
```

**Parameters**:
- `title` (string, required): Issue title
- `message` (string, required): Error message
- `level` (string): Severity ("fatal", "error", "warning", "info", "debug")
- `tags` (object): Key-value pairs for tags

**Note**: Manual issue creation is uncommon. Sentry issues are typically auto-created from captured exceptions in your application.

### 7. sentry_get_recent_errors
Get recent errors from a specific release or time period.

**Usage**:
```
@workspace Get recent errors from release 1.2.3
@workspace Show errors from the last 48 hours
```

**Parameters**:
- `release` (string): Release version
- `hours` (number): Hours to look back (default: 24)

## Example Workflows

### Triaging Production Errors

```
@workspace Search for unresolved errors in Sentry
@workspace View issue 1234567890
@workspace Assign issue 1234567890 to developer@example.com
@workspace Add comment to issue 1234567890: "Investigating - appears related to recent deploy"
```

### Release Management

```
@workspace Get recent errors from release 1.2.3
@workspace Resolve issue 1234567890 in release 1.2.4
```

### Issue Investigation

```
@workspace Search for TypeError issues
@workspace View issue ABC123
@workspace Comment on issue ABC123: "Root cause: missing null check in parser"
```

## Debugging

Enable debug logging:

**Linux/macOS**:
```bash
DEBUG=true node server.js
```

**Windows (PowerShell)**:
```powershell
$env:DEBUG="true"; node server.js
```

Debug logs are written to stderr and won't interfere with MCP communication.

## Limitations

- Some operations require appropriate Sentry API permissions
- Manual issue creation is not standard workflow (issues are typically auto-created)
- Bulk operations are not currently supported
- Real-time notifications not available through this skill

## Security

- **Never commit** `SENTRY_AUTH_TOKEN` to version control
- Store tokens in environment variables or secure configuration
- Use scoped tokens with minimal required permissions
- Rotate tokens regularly

## Troubleshooting

### "Command not found: sentry-cli"
Install Sentry CLI: `npm install -g @sentry/cli`

### "Authentication failed"
Check that `SENTRY_AUTH_TOKEN` is set correctly and has valid permissions.

### "Organization/Project not found"
Verify `SENTRY_ORG` and `SENTRY_PROJECT` environment variables match your Sentry setup.

### "Permission denied"
Ensure your auth token has the required scopes (Project: Read/Write, Organization: Read).

## Related Skills

- **Jira Skill**: For work item management and sprint planning
- **Git Skill**: For branch management and code navigation
- **Testing Skill**: For running tests and validations

## Resources

- [Sentry CLI Documentation](https://docs.sentry.io/product/cli/)
- [Sentry API Reference](https://docs.sentry.io/api/)
- [ESO Log Aggregator Sentry Config](../../src/config/sentryConfig.ts)
