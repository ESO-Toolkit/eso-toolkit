# Dev Server Management Tools - Quick Reference

## Overview

The Agent Skill provides tools to manage the development server as a background process. This allows you to start, stop, and check the status of the dev server without blocking your terminal.

**Compatible With**: Claude Desktop and GitHub Copilot (via Agent Skills standard)

## Tools

### `start_dev_server`

Starts the development server in the background on port 3000.

**Example AI Assistant Requests:**
- "Start the dev server"
- "Launch the development server"
- "Start npm dev in the background"
- (GitHub Copilot) "@workspace start the dev server"

**Behavior:**
- Spawns `npm run dev` as a detached process
- Saves process ID to `.claude/dev-server.pid`
- Server continues running even after Claude session ends
- Returns immediately after starting (doesn't block)

**Returns:**
```json
{
  "success": true,
  "message": "Dev server started successfully",
  "pid": 12345,
  "url": "http://localhost:3000",
  "note": "Server is running in the background..."
}
```

### `stop_dev_server`

Stops the running development server.

**Example AI Assistant Requests:**
- "Stop the dev server"
- "Shut down the development server"
- "Kill the dev server process"
- (GitHub Copilot) "@workspace stop the dev server"

**Behavior:**
- Reads PID from `.claude/dev-server.pid`
- Kills the entire process tree (Windows: `taskkill /T /F`)
- Removes the PID file
- Safe to call even if server is not running

**Returns:**
```json
{
  "success": true,
  "message": "Dev server stopped successfully",
  "pid": 12345
}
```

### `dev_server_status`

Checks if the development server is currently running.

**Example AI Assistant Requests:**
- "Check dev server status"
- "Is the dev server running?"
- "Show me the dev server status"
- (GitHub Copilot) "@workspace check dev server status"

**Returns (Running):**
```json
{
  "running": true,
  "pid": 12345,
  "url": "http://localhost:3000",
  "message": "Dev server is running"
}
```

**Returns (Not Running):**
```json
{
  "running": false,
  "pid": null,
  "url": "http://localhost:3000",
  "message": "Dev server is not running. Use start_dev_server to start it."
}
```

## Workflows

### Workflow 1: Start and Test

**With any AI assistant:**
```
You: Start the dev server and run a test
```

**With GitHub Copilot:**
```
You: @workspace Start the dev server and run a test
```

AI assistant will:
1. Check if server is already running
2. Start server if needed
3. Wait for initialization (~3 seconds)
4. Run your test
5. (Optionally) Stop server when done

### Workflow 2: Status Check

```
You: Check if the dev server is running and start it if not
```

Claude will:
1. Check server status
2. Start server only if not running
3. Report status

### Workflow 3: Clean Restart

```
You: Restart the dev server
```

Claude will:
1. Stop the server (if running)
2. Wait briefly
3. Start a fresh server instance

## Technical Details

### Process Management

**PID File:** `.claude/dev-server.pid`
- Contains the process ID of the running dev server
- Automatically created when server starts
- Automatically removed when server stops
- Git-ignored

**Process Spawn:**
```javascript
spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  detached: true,      // Runs independently
  stdio: 'ignore',     // No output capture
  shell: true,         // Uses system shell
});
```

**Process Termination (Windows):**
```javascript
spawn('taskkill', ['/pid', pid, '/T', '/F'], { shell: true });
```
- `/T`: Terminates process tree (all child processes)
- `/F`: Forces termination

### Port Configuration

**Default:** `http://localhost:3000`

Configure via environment variable in your AI assistant's configuration:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "eso-log-aggregator-testing": {
      "env": {
        "BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

**GitHub Copilot** (`.vscode/settings.json`):
```json
{
  "github.copilot.chat.agentSkills": {
    "eso-log-aggregator-testing": {
      "env": {
        "BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Error Handling

**Already Running:**
```json
{
  "success": false,
  "message": "Dev server is already running",
  "pid": 12345,
  "url": "http://localhost:3000"
}
```

**Not Running (when stopping):**
```json
{
  "success": false,
  "message": "No dev server is currently running"
}
```

**Process Not Found:**
If PID file exists but process is not running, the status check will:
1. Detect the stale PID
2. Return `running: false`
3. Allow starting a new server

## Troubleshooting

### Problem: Server won't start

**Possible Causes:**
1. Port 3000 is already in use
2. Node modules not installed
3. Build configuration error

**Solution:**
```powershell
# Check if port is in use
netstat -ano | findstr :3000

# Kill process on port 3000
Stop-Process -Id <PID> -Force

# Reinstall dependencies
npm ci

# Try manual start to see errors
npm run dev
```

### Problem: Server won't stop

**Solution:**
```powershell
# Check PID file
Get-Content .claude/dev-server.pid

# Manually kill process
Stop-Process -Id <PID> -Force

# Clean up PID file
Remove-Item .claude/dev-server.pid
```

### Problem: Stale PID file

**Symptoms:**
- Status shows running but server not accessible
- Process ID doesn't exist

**Solution:**
```powershell
# Remove stale PID file
Remove-Item .claude/dev-server.pid

# Start fresh
# Ask Claude: "Start the dev server"
```

### Problem: Multiple servers running

**Solution:**
```powershell
# Find all node processes
Get-Process node

# Kill specific process
Stop-Process -Id <PID> -Force

# Or kill all node processes (careful!)
Stop-Process -Name node -Force

# Clean up and restart
Remove-Item .claude/dev-server.pid
# Ask Claude: "Start the dev server"
```

## Best Practices

1. **Check Before Starting**: Always check status before starting to avoid multiple servers
2. **Clean Shutdown**: Stop the server when done to free resources
3. **Monitor Logs**: If issues occur, check terminal output with manual start
4. **Regular Cleanup**: Periodically verify no orphaned processes exist
5. **Use Status Tool**: Frequently check status to maintain awareness

## Integration with Other Tools

The dev server tools work seamlessly with other Claude Skill tools:

```
You: Start the dev server, then navigate to /dashboard and take a screenshot
```

Claude will:
1. Start server (if not running)
2. Wait for initialization
3. Navigate to dashboard
4. Capture screenshot
5. Return results

## Limitations

1. **No Output Capture**: Server output is not captured or visible
2. **Windows Only**: Process termination uses Windows-specific commands
3. **No Health Checks**: Doesn't verify server is actually responding
4. **Fixed Port**: Uses port 3000 (configurable via env var)
5. **No Auto-Restart**: If server crashes, must manually restart

## Future Enhancements

Potential improvements:
- [ ] Health check endpoint monitoring
- [ ] Automatic crash detection and restart
- [ ] Server log capture and streaming
- [ ] Cross-platform process management
- [ ] Port conflict detection and resolution
- [ ] Server ready detection (wait for actual readiness)
- [ ] Resource usage monitoring

## See Also

- [Main README](.claude/README.md) - Full Claude Skill documentation
- [AI Agent Guidelines](../documentation/ai-agents/AI_AGENT_GUIDELINES.md)
- [Development Workflow](../README.md#development)
