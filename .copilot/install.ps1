# GitHub Copilot Agent Skill - Quick Setup Script
# This script installs dependencies and verifies the configuration

Write-Host "🚀 ESO Log Aggregator - GitHub Copilot Agent Skill Setup" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Error: Please run this script from the .copilot directory" -ForegroundColor Red
    Write-Host "   cd .copilot" -ForegroundColor Yellow
    Write-Host "   .\install.ps1" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Check for auth state
$authStatePath = "..\tests\auth-state.json"
if (Test-Path $authStatePath) {
    Write-Host "✅ Authentication state file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Authentication state file not found" -ForegroundColor Yellow
    Write-Host "   Generate it by running: npm run test:nightly:all" -ForegroundColor Yellow
    Write-Host "   (from the project root directory)" -ForegroundColor Yellow
}
Write-Host ""

# Check VS Code settings
$settingsPath = "..\.vscode\settings.json"
if (Test-Path $settingsPath) {
    Write-Host "✅ VS Code settings.json found" -ForegroundColor Green
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    
    if ($settings.'github.copilot.chat.mcp.enabled' -eq $true) {
        Write-Host "✅ MCP is enabled in VS Code settings" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MCP is not enabled in VS Code settings" -ForegroundColor Yellow
        Write-Host "   Please set 'github.copilot.chat.mcp.enabled': true" -ForegroundColor Yellow
    }
    
    if ($settings.'github.copilot.chat.mcp.servers'.'eso-log-aggregator-testing') {
        Write-Host "✅ Agent Skill is configured in VS Code settings" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Agent Skill is not configured in VS Code settings" -ForegroundColor Yellow
        Write-Host "   See README.md for configuration instructions" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  VS Code settings.json not found" -ForegroundColor Yellow
    Write-Host "   The skill should be configured in .vscode\settings.json" -ForegroundColor Yellow
}
Write-Host ""

# Final instructions
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Reload VS Code window (Ctrl+Shift+P → 'Reload Window')" -ForegroundColor White
Write-Host "2. Verify the skill is loaded:" -ForegroundColor White
Write-Host "   @workspace Check dev server status" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Documentation: .copilot\README.md" -ForegroundColor Cyan
Write-Host ""
