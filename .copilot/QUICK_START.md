# Quick Start Guide - GitHub Copilot Agent Skill

## Prerequisites

✅ Node.js 20+ installed  
✅ VS Code with GitHub Copilot extension  
✅ This ESO Log Aggregator project open in VS Code  

## Installation (3 Steps)

### 1. Install Dependencies

```powershell
cd .copilot
npm install
```

Or use the automated script:

```powershell
cd .copilot
.\install.ps1
```

### 2. Generate Authentication Token

From the project root directory:

```powershell
npm run test:nightly:all
```

This creates `tests/auth-state.json` with a valid OAuth token.

### 3. Reload VS Code

Press `Ctrl+Shift+P` → Type "Reload Window" → Press Enter

Or simply close and reopen VS Code.

## Verification

Ask Copilot in the chat:

```
@workspace Check dev server status
```

If the skill is loaded correctly, you'll get a response about the dev server status.

## First Commands

### Start Development Server

```
@workspace Start the dev server
```

### Run Quick Tests

```
@workspace Run smoke tests
```

### Check Code Quality

```
@workspace Format the code
@workspace Lint the code
@workspace Run type checking
```

### Navigate and Test

```
@workspace Navigate to / and verify the page loads
@workspace Check if .upload-button exists on /
```

## Troubleshooting

### "Unknown command" or no response

1. Check that MCP is enabled in settings
2. Reload VS Code window
3. Check Output panel (View → Output → "GitHub Copilot Chat")

### "No authentication state found"

Run from project root:
```powershell
npm run test:nightly:all
```

### Port 3000 already in use

Stop any running dev servers:
```powershell
@workspace Stop the dev server
```

Or manually kill the process in Task Manager.

## Next Steps

📖 **Full Documentation**: [README.md](README.md)  
🧪 **Test Tools**: [TEST_EXECUTION_TOOLS.md](TEST_EXECUTION_TOOLS.md)  
⚙️ **Workflow Tools**: [WORKFLOW_TOOLS.md](WORKFLOW_TOOLS.md)  
🚀 **Dev Server**: [DEV_SERVER_TOOLS.md](DEV_SERVER_TOOLS.md)  

## Common Workflows

### Before Committing

```
@workspace Format the code
@workspace Lint and fix issues
@workspace Run type checking
@workspace Run unit tests
```

### Feature Testing

```
@workspace Start dev server
@workspace Navigate to /new-feature and verify it loads
@workspace Take a screenshot of /new-feature and save to screenshots/feature.png
@workspace Run smoke tests
@workspace Stop dev server
```

### Full Validation

```
@workspace Start dev server
@workspace Run full test suite
@workspace Run unit tests with coverage
@workspace Build the project
@workspace Stop dev server
```

---

**Need Help?** See the [full README](README.md) or check the troubleshooting section.
