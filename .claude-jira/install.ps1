# ESO Log Aggregator - Jira Skill Installation

Write-Host "Installing Jira Agent Skill..." -ForegroundColor Cyan

# Install for GitHub Copilot
Write-Host "`n1. Installing .copilot-jira dependencies..." -ForegroundColor Yellow
Push-Location .copilot-jira
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install .copilot-jira dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "   ✓ .copilot-jira installed" -ForegroundColor Green

# Install for Claude Desktop
Write-Host "`n2. Installing .claude-jira dependencies..." -ForegroundColor Yellow
Push-Location .claude-jira
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install .claude-jira dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "   ✓ .claude-jira installed" -ForegroundColor Green

# Check acli
Write-Host "`n3. Checking acli installation..." -ForegroundColor Yellow
try {
    $acliVersion = acli --version 2>&1
    Write-Host "   ✓ acli version: $acliVersion" -ForegroundColor Green
    
    $acliAuth = acli jira auth status 2>&1
    if ($acliAuth -match "authenticated|logged in") {
        Write-Host "   ✓ acli authenticated" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ acli not authenticated" -ForegroundColor Yellow
        Write-Host "     Run: acli jira auth login" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ acli not found" -ForegroundColor Red
    Write-Host "     Install from: https://developer.atlassian.com/server/framework/atlassian-sdk/atlassian-cli/" -ForegroundColor Yellow
}

Write-Host "`n4. Configuration check..." -ForegroundColor Yellow
$settingsPath = ".vscode\settings.json"
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    if ($settings.'github.copilot.chat.mcp.servers'.'eso-log-aggregator-jira') {
        Write-Host "   ✓ VS Code configured for Jira skill" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ VS Code not configured for Jira skill" -ForegroundColor Yellow
        Write-Host "     Add to .vscode/settings.json:" -ForegroundColor Yellow
        Write-Host '     "eso-log-aggregator-jira": {' -ForegroundColor Gray
        Write-Host '       "command": "node",' -ForegroundColor Gray
        Write-Host '       "args": ["${workspaceFolder}\\.copilot-jira\\server.js"]' -ForegroundColor Gray
        Write-Host '     }' -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠ .vscode/settings.json not found" -ForegroundColor Yellow
}

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Reload VS Code window (Ctrl+Shift+P → 'Reload Window')" -ForegroundColor White
Write-Host "2. Test in Copilot chat: @workspace View ESO-372" -ForegroundColor White
Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "- .copilot-jira/README.md" -ForegroundColor White
Write-Host "- documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md" -ForegroundColor White
