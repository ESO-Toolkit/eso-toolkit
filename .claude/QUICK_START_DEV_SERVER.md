# Quick Start: Dev Server Management

## TL;DR

The Agent Skill can now start/stop the dev server in the background without blocking your terminal.

**Works with**: Claude Desktop and GitHub Copilot (via Agent Skills standard)

## Usage

### Start Server

```
You: Start the dev server
```

Claude will start the server at http://localhost:3000 in the background.

### Check Status

```
You: Is the dev server running?
```

### Stop Server

```
You: Stop the dev server
```

## Common Workflows

### Workflow 1: Test Session

```
You: Start the dev server, then navigate to /dashboard and verify it loads
```

### Workflow 2: Clean Restart

```
You: Restart the dev server
```

### Workflow 3: Conditional Start

```
You: Check if the dev server is running, and start it if not
```

## How It Works

- Server runs as a **background process**
- **Doesn't block** the terminal
- **Continues running** even after Claude session ends
- Process ID stored in `.claude/dev-server.pid`
- Use `stop_dev_server` to clean up when done

## Troubleshooting

### Server won't start?

```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill any process on port 3000
Stop-Process -Id <PID> -Force
```

### Server won't stop?

```powershell
# Check PID
Get-Content .claude/dev-server.pid

# Force kill
Stop-Process -Id <PID> -Force

# Clean up
Remove-Item .claude/dev-server.pid
```

### Multiple servers running?

```powershell
# Find all node processes
Get-Process node

# Kill specific process
Stop-Process -Id <PID> -Force
```

## Full Documentation

- **[DEV_SERVER_TOOLS.md](DEV_SERVER_TOOLS.md)** - Comprehensive guide
- **[README.md](README.md)** - Claude Skill documentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical details

## Testing

Verify it works:

```powershell
cd .claude
npm test
```

This will run a full test suite of the dev server tools.
