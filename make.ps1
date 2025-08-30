# ESO Log Aggregator Build Script for Windows PowerShell
# This script provides convenient commands for common development tasks

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Available commands:" -ForegroundColor Green
    Write-Host "  help          - Show this help message"
    Write-Host "  install       - Install dependencies"
    Write-Host "  build         - Build the project for production"
    Write-Host "  test          - Run tests"
    Write-Host "  test-watch    - Run tests in watch mode"
    Write-Host "  lint          - Run ESLint to check code quality"
    Write-Host "  lint-fix      - Run ESLint and automatically fix issues"
    Write-Host "  format        - Format code with Prettier"
    Write-Host "  dev           - Start development server"
    Write-Host "  clean         - Clean build artifacts"
    Write-Host "  codegen       - Generate GraphQL types"
    Write-Host "  fetch-abilities - Fetch abilities data"
    Write-Host "  pre-commit    - Run full CI pipeline (lint-fix, test, build, typecheck)"
    Write-Host "  all           - Run clean, install, lint, test, and build"
    Write-Host "  check         - Run lint and test (quick pre-commit check)"
    Write-Host "  setup         - Setup project for new developers"
}

function Install-Dependencies {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm ci
}

function Build-Project {
    Write-Host "Building project..." -ForegroundColor Yellow
    npm run build
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Yellow
    npm run test
}

function Run-TestsWatch {
    Write-Host "Running tests in watch mode..." -ForegroundColor Yellow
    npm test
}

function Run-Lint {
    Write-Host "Running ESLint..." -ForegroundColor Yellow
    npm run lint
}

function Run-LintFix {
    Write-Host "Running ESLint with auto-fix..." -ForegroundColor Yellow
    npm run lint:fix
}

function Format-Code {
    Write-Host "Formatting code with Prettier..." -ForegroundColor Yellow
    npm run format
}

function Start-Dev {
    Write-Host "Starting development server..." -ForegroundColor Yellow
    npm start
}

function Clean-Build {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
    if (Test-Path ".eslintcache") { Remove-Item -Force ".eslintcache" }
}

function Run-Codegen {
    Write-Host "Generating GraphQL types..." -ForegroundColor Yellow
    npm run codegen
}

function Fetch-Abilities {
    Write-Host "Fetching abilities data..." -ForegroundColor Yellow
    npm run fetch-abilities
}

function Run-All {
    Clean-Build
    Install-Dependencies
    Run-Lint
    Run-Tests
    Build-Project
    Write-Host "✅ All tasks completed successfully!" -ForegroundColor Green
}

function Run-PreCommit {
    Write-Host "Running pre-commit checks..." -ForegroundColor Yellow
    
    Write-Host "1/4 - Running ESLint with auto-fix..." -ForegroundColor Cyan
    npm run lint:fix
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ESLint failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "2/4 - Running tests..." -ForegroundColor Cyan
    npm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tests failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "3/4 - Building project..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "4/4 - Running type check..." -ForegroundColor Cyan
    npm run typecheck
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Type check failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "✅ All pre-commit tasks completed successfully!" -ForegroundColor Green
}

function Run-Check {
    Run-Lint
    Run-Tests
    Write-Host "✅ Code quality checks passed!" -ForegroundColor Green
}

function Setup-Project {
    Install-Dependencies
    Run-Codegen
    Fetch-Abilities
    Write-Host "✅ Project setup complete! Run './build.ps1 dev' to start development server." -ForegroundColor Green
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "build" { Build-Project }
    "test" { Run-Tests }
    "test-watch" { Run-TestsWatch }
    "lint" { Run-Lint }
    "lint-fix" { Run-LintFix }
    "format" { Format-Code }
    "dev" { Start-Dev }
    "clean" { Clean-Build }
    "codegen" { Run-Codegen }
    "fetch-abilities" { Fetch-Abilities }
    "pre-commit" { Run-PreCommit }
    "all" { Run-All }
    "check" { Run-Check }
    "setup" { Setup-Project }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Run './build.ps1 help' to see available commands." -ForegroundColor Yellow
    }
}
