# Claude CLI Installation Troubleshooting Log

## Overview
This document chronicles all attempts to install and troubleshoot the Claude CLI on Windows PowerShell, including multiple installation methods, PATH configurations, and diagnostic steps.

## Initial Installation Attempts

### Method 1: npm install (First Attempt)
```powershell
npm install -g @anthropic-ai/claude-code
```
- **Exit Code**: 0 (Success)
- **Output**: "added 10 packages, and changed 2 packages in 1s"
- **Issue**: `claude` command not recognized in PowerShell

### Method 2: PATH Configuration
**Diagnostic Commands:**
```powershell
npm config get prefix
# Result: C:\Users\brayd\AppData\Roaming\npm

$Env:PATH -split ';' | Where-Object { $_ -like '*npm*' }
# Result: No output (npm not in PATH)
```

**PATH Fix Applied:**
```powershell
$npmPath = npm config get prefix
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$npmPath*") {
  $newPath = "$userPath;$npmPath"
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  "Added npm global bin to PATH"
} else {
  "npm global bin already in PATH"
}
```

## File Verification
**Files Found in npm Directory:**
```powershell
Get-ChildItem -Path "C:\Users\brayd\AppData\Roaming\npm" -Name "*claude*"
# Results:
# .claude (directory)
# claude (433 bytes)
# claude.cmd (347 bytes)
# claude.ps1 (893 bytes)
```

**File Analysis:**
- `claude` file: Unix shell script (`#!/bin/sh`) - **Not Windows executable**
- `claude.cmd` file: Windows batch file - **Should work on Windows**
- `claude.ps1` file: PowerShell script - **Windows PowerShell compatible**

## Working vs Non-Working Commands

### Commands That Work ✅
```powershell
# Direct path execution
& "C:\Users\brayd\AppData\Roaming\npm\claude.cmd" --version
# Result: "2.0.5 (Claude Code)"

# npx execution (bypasses global install)
npx @anthropic-ai/claude-code --version
# Result: "2.0.5 (Claude Code)"

# PATH refresh in current session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
claude --version  # Works after refresh
```

### Commands That Don't Work ❌
```powershell
claude                    # "not recognized"
claude --version          # "not recognized"
claude.cmd                # "not recognized"
claude.cmd --version      # "not recognized"
```

## PATH Investigation

### Current PATH Configuration
```powershell
$Env:PATH -split ';' | Where-Object { $_ -like '*npm*' }
# Result: C:\Users\brayd\AppData\Roaming\npm (appears multiple times)
```

### Registry PATH Check
```powershell
[Environment]::GetEnvironmentVariable("Path", "User")
# Result: Contains C:\Users\brayd\AppData\Roaming\npm (verified in registry)
```

## Session-Specific Behavior

### Pattern Observed:
1. **New terminal sessions**: Commands fail with "not recognized"
2. **After PATH refresh in session**: Commands work
3. **After terminal restart**: Commands fail again (until PATH refreshed)

### This suggests:
- PATH environment variable is correctly set in registry
- PowerShell sessions are not inheriting the PATH correctly
- Issue is with PowerShell session initialization, not the installation itself

## Uninstall/Reinstall Attempt

### Complete Uninstall Process:
```powershell
npm uninstall -g @anthropic-ai/claude-code
# Result: "removed 2 packages in 436ms"

# Manual cleanup of remaining files
Remove-Item "C:\Users\brayd\AppData\Roaming\npm\.claude" -Recurse -Force
Get-ChildItem -Path "C:\Users\brayd\AppData\Roaming\npm" -Name "*claude*" | Remove-Item -Force
```

### Fresh Reinstall:
```powershell
npm install -g @anthropic-ai/claude-code
# Result: "added 12 packages in 2s"
```

### Post-Reinstall Verification:
```powershell
Get-ChildItem -Path "C:\Users\brayd\AppData\Roaming\npm" -Name "*claude*"
# Results:
# claude (file)
# claude.cmd (file)
# claude.ps1 (file)

& "C:\Users\brayd\AppData\Roaming\npm\claude.cmd" --version
# Result: "2.0.5 (Claude Code)" ✅
```

## Persistent Issue Analysis

### The Core Problem:
- Files are installed correctly
- Direct execution works
- PATH is set correctly in registry
- **Issue**: PowerShell terminal sessions are not picking up the PATH consistently

### Possible Causes:
1. **Terminal Session Inheritance**: PowerShell not reading updated environment variables
2. **Execution Policy**: PowerShell execution policy blocking script execution
3. **PATHEXT Variable**: Missing .CMD extension in file association list
4. **Windows Terminal vs PowerShell**: Different behavior between terminal applications

### Unresolved Questions:
- Why do PATH refreshes work temporarily but not persist across sessions?
- Why are new terminal sessions not inheriting the correct PATH?
- Is this a Windows/PowerShell configuration issue rather than an installation issue?

## Recommendations for Further Investigation

1. **Check PowerShell Execution Policy**:
   ```powershell
   Get-ExecutionPolicy
   ```

2. **Verify PATHEXT includes .CMD**:
   ```powershell
   $Env:PATHEXT
   ```

3. **Test in different terminal applications**:
   - Windows Terminal
   - Command Prompt (cmd.exe)
   - Different PowerShell instances

4. **Check Windows Environment Variables**:
   - Verify PATH in System Properties
   - Check for duplicate or conflicting entries

## Conclusion
The Claude CLI installation itself is successful. The issue appears to be related to PowerShell session management and environment variable inheritance rather than the installation process. The CLI works perfectly when executed directly or after manual PATH refresh, suggesting the problem is with how PowerShell handles the PATH environment variable across sessions.

**Current Workaround**: Refresh PATH in each terminal session before use:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
