# Dev Server Management - Setup Checklist

## ✅ Pre-Installation

- [ ] Node.js 20+ installed
- [ ] ESO Log Aggregator project cloned
- [ ] Claude Desktop installed
- [ ] Auth state file exists (`tests/auth-state.json`)

## ✅ Installation

1. **Navigate to .claude directory**
   ```powershell
   cd .claude
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Verify installation**
   ```powershell
   npm test
   ```
   
   Expected output:
   - All 6 tests pass
   - Server starts and stops successfully
   - No errors

## ✅ Configuration

Choose **Option A** (Claude Desktop) **OR** **Option B** (GitHub Copilot):

### Option A: Claude Desktop

4. **Locate Claude Desktop config file**
   
   Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   
   ```powershell
   notepad $env:APPDATA\Claude\claude_desktop_config.json
   ```

5. **Add MCP server configuration**
   
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
           "BASE_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```
   
   **Important**: Update paths to match your installation!

6. **Restart Claude Desktop**
   
   - Completely quit Claude Desktop
   - Restart the application
   - Wait for initialization

### Option B: GitHub Copilot (VS Code)

4. **Open VS Code settings**
   
   - Press `Ctrl+,` or `Cmd+,`
   - Click "Open Settings (JSON)" icon in top right
   - OR open `.vscode/settings.json` in your workspace

5. **Add Agent Skill configuration**
   
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
   
   **Important**: Update paths to match your installation!

6. **Reload VS Code window**
   
   - Press `Ctrl+Shift+P` or `Cmd+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

## ✅ Verification

7. **Check Agent Skill is loaded**
   
   **Claude Desktop**, ask:
   ```
   Can you check if the eso-log-aggregator-testing skill is available?
   ```
   
   **GitHub Copilot**, ask in chat:
   ```
   @workspace Can you check dev server status?
   ```
   
   Expected: AI assistant should confirm the skill is available and can check status

8. **Test dev server status**
   
   ```
   Check the dev server status
   ```
   
   Expected: Should return status (running or not running)

9. **Test starting dev server**
   
   ```
   Start the dev server
   ```
   
   Expected:
   - Server starts successfully
   - Returns PID
   - Returns URL (http://localhost:3000)

10. **Verify server is accessible**
    
    Open browser to http://localhost:3000
    
    Expected: ESO Log Aggregator application loads

11. **Test stopping dev server**
    
    ```
    Stop the dev server
    ```
    
    Expected:
    - Server stops successfully
    - Returns PID that was stopped

12. **Verify cleanup**
    
    ```powershell
    # Check PID file is removed
    Test-Path .claude/dev-server.pid
    ```
    
    Expected: Should return `False`

## ✅ Full Workflow Test

13. **Complete test scenario**
    
    Ask Claude:
    ```
    1. Start the dev server
    2. Wait for it to be ready
    3. Navigate to /dashboard
    4. Take a screenshot and save to test-screenshot.png
    5. Stop the dev server
    ```
    
    Expected:
    - All steps complete successfully
    - Screenshot file created
    - Server cleanly stopped

## 🔧 Troubleshooting

### Issue: MCP server not appearing

**Check:**
```powershell
# Verify config file syntax
Get-Content $env:APPDATA\Claude\claude_desktop_config.json | ConvertFrom-Json

# Check paths exist
Test-Path "d:\code\eso-log-aggregator\.claude\server.js"
Test-Path "d:\code\eso-log-aggregator\tests\auth-state.json"
```

**Solution:**
- Fix JSON syntax errors
- Update paths to correct locations
- Restart Claude Desktop

### Issue: Server won't start

**Check:**
```powershell
# Is port 3000 in use?
netstat -ano | findstr :3000

# Is npm dev command working?
cd ..
npm run dev
# (Ctrl+C to stop)
```

**Solution:**
- Kill process on port 3000
- Verify npm dependencies installed
- Check for build errors

### Issue: Server won't stop

**Check:**
```powershell
# Check PID file
Get-Content .claude/dev-server.pid

# Is process running?
Get-Process -Id <PID> -ErrorAction SilentlyContinue
```

**Solution:**
```powershell
# Manual cleanup
Stop-Process -Id <PID> -Force
Remove-Item .claude/dev-server.pid
```

### Issue: Test suite fails

**Check:**
```powershell
# Verify Node.js version
node --version  # Should be 20+

# Verify dependencies
npm list
```

**Solution:**
```powershell
# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
npm install

# Try again
npm test
```

## 📚 Next Steps

After successful setup:

1. **Read documentation**
   - [README.md](README.md) - Full Claude Skill guide
   - [DEV_SERVER_TOOLS.md](DEV_SERVER_TOOLS.md) - Dev server tools reference
   - [QUICK_START_DEV_SERVER.md](QUICK_START_DEV_SERVER.md) - Quick usage guide

2. **Try workflows**
   - Start server and run authenticated tests
   - Take screenshots of different pages
   - Explore the application with Claude's help

3. **Integrate with testing**
   - Use alongside VS Code MCP Playwright tool
   - Combine with existing Playwright tests
   - Create custom testing scenarios

## 🎯 Success Criteria

You've successfully set up dev server management if:

- ✅ All test suite tests pass
- ✅ Can start server via Claude
- ✅ Can check status via Claude
- ✅ Can stop server via Claude
- ✅ Server runs in background (doesn't block terminal)
- ✅ Server continues running after Claude session ends
- ✅ PID file is properly managed

## 🆘 Getting Help

If you're still having issues:

1. Check Claude Desktop logs for errors
2. Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details
3. Verify all prerequisites are met
4. Try manual `npm run dev` to isolate issues
5. Check Windows firewall/antivirus isn't blocking Node.js

## 📝 Notes

- PID file location: `.claude/dev-server.pid`
- Default port: 3000 (configurable via BASE_URL env var)
- Process runs detached (independent of parent)
- Windows-specific implementation (uses `taskkill`)
- Git-ignored by default

---

**Version**: 1.1.0  
**Last Updated**: January 21, 2026
