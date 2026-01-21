# ESO Log Aggregator - Claude Skill Installation Script
# This script helps set up the Claude Skill for local testing

Write-Host "🔧 Setting up Claude Skill for ESO Log Aggregator..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Found Node.js $nodeVersion" -ForegroundColor Green
Write-Host ""

# Navigate to .claude directory
$claudeDir = Join-Path $PSScriptRoot ".claude"
if (-not (Test-Path $claudeDir)) {
    Write-Host "❌ .claude directory not found" -ForegroundColor Red
    exit 1
}

Set-Location $claudeDir

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check for auth state
$authStatePath = Join-Path $PSScriptRoot "tests" "auth-state.json"
if (Test-Path $authStatePath) {
    Write-Host "✅ Found auth-state.json" -ForegroundColor Green
} else {
    Write-Host "⚠️  No auth-state.json found" -ForegroundColor Yellow
    Write-Host "   Run 'npm run test:nightly:all' to generate authentication token" -ForegroundColor Yellow
}
Write-Host ""

# Get current directory for config
$projectRoot = $PSScriptRoot
$serverPath = Join-Path $projectRoot ".claude" "server.js"
$authPath = Join-Path $projectRoot "tests" "auth-state.json"

# Generate configuration example
Write-Host "📝 Configuration for Claude Desktop:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add the following to your Claude Desktop configuration file:" -ForegroundColor White
Write-Host "Windows: %APPDATA%\Claude\claude_desktop_config.json" -ForegroundColor Gray
Write-Host "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json" -ForegroundColor Gray
Write-Host ""
Write-Host @"
{
  "mcpServers": {
    "eso-log-aggregator-testing": {
      "command": "node",
      "args": [
        "$($serverPath -replace '\\', '\\')"
      ],
      "env": {
        "AUTH_STATE_PATH": "$($authPath -replace '\\', '\\')",
        "BASE_URL": "http://localhost:3000"
      }
    }
  }
}
"@ -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add the configuration above to your Claude Desktop config" -ForegroundColor White
Write-Host "2. Restart Claude Desktop" -ForegroundColor White
Write-Host "3. Ensure auth-state.json exists (run 'npm run test:nightly:all')" -ForegroundColor White
Write-Host "4. Start the dev server ('npm run dev')" -ForegroundColor White
Write-Host "5. Start testing with Claude!" -ForegroundColor White
Write-Host ""
Write-Host "📖 See .claude/README.md for detailed documentation" -ForegroundColor Gray
