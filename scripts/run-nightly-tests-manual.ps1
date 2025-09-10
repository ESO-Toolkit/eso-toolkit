#!/usr/bin/env powershell
<#
.SYNOPSIS
    Run nightly regression tests manually with various options
    
.DESCRIPTION
    This script provides an easy way to run the nightly regression tests
    with various configuration options, similar to the GitHub Actions workflow.
    
.PARAMETER TestSuite
    The test suite to run (all, chromium, firefox, webkit, mobile, auth-only)
    
.PARAMETER Headed
    Run tests in headed mode (for debugging)
    
.PARAMETER Debug
    Enable debug mode (single failure, more verbose)
    
.PARAMETER BuildFirst
    Build the application before running tests
    
.EXAMPLE
    .\run-nightly-tests-manual.ps1
    # Runs all tests
    
.EXAMPLE
    .\run-nightly-tests-manual.ps1 -TestSuite chromium -Headed
    # Runs chromium tests in headed mode
    
.EXAMPLE
    .\run-nightly-tests-manual.ps1 -TestSuite auth-only -Debug -BuildFirst
    # Runs auth tests in debug mode with fresh build
#>

param(
    [ValidateSet("all", "chromium", "firefox", "webkit", "mobile", "auth-only")]
    [string]$TestSuite = "all",
    
    [switch]$Headed,
    
    [switch]$Debug,
    
    [switch]$BuildFirst
)

Write-Host "Nightly Regression Tests - Manual Run" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Check for required environment variables
Write-Host "Checking environment..." -ForegroundColor Blue

$hasOAuthCreds = $env:OAUTH_CLIENT_ID -and $env:OAUTH_CLIENT_SECRET
$hasTestUserCreds = $env:ESO_LOGS_TEST_EMAIL -and $env:ESO_LOGS_TEST_PASSWORD

if ($hasOAuthCreds) {
    Write-Host "OAuth credentials found" -ForegroundColor Green
} else {
    Write-Host "OAuth credentials not found - some tests may be skipped" -ForegroundColor Yellow
    Write-Host "   Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET for full authentication testing"
}

if ($hasTestUserCreds) {
    Write-Host "Test user credentials found" -ForegroundColor Green
} else {
    Write-Host "Test user credentials not found - browser flow tests may be skipped" -ForegroundColor Yellow
    Write-Host "   Set ESO_LOGS_TEST_EMAIL and ESO_LOGS_TEST_PASSWORD for browser authentication testing"
}

# Build application if requested
if ($BuildFirst) {
    Write-Host "Building application..." -ForegroundColor Blue
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed" -ForegroundColor Green
}

# Determine the test command
$testCommand = switch ($TestSuite) {
    "all" { "test:nightly:all" }
    "chromium" { "test:nightly:chromium" }
    "firefox" { "test:nightly:firefox" }
    "webkit" { "test:nightly:webkit" }
    "mobile" { "test:nightly:mobile" }
    "auth-only" { "test:nightly:auth" }
    default { "test:nightly:all" }
}

# Override for special modes
if ($Headed) {
    $testCommand = "test:nightly:headed"
    Write-Host "Running in headed mode" -ForegroundColor Yellow
}

if ($Debug) {
    $testCommand = "test:nightly:debug"
    Write-Host "Running in debug mode" -ForegroundColor Yellow
}

Write-Host "Running tests: npm run $testCommand" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

# Start timestamp
$startTime = Get-Date

# Run the tests
npm run $testCommand

$exitCode = $LASTEXITCODE
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "================================================" -ForegroundColor Blue

if ($exitCode -eq 0) {
    Write-Host "Tests completed successfully" -ForegroundColor Green
} else {
    Write-Host "Tests failed with exit code $exitCode" -ForegroundColor Red
}

Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Blue

# Show report options
Write-Host "View results:" -ForegroundColor Blue
Write-Host "   * HTML Report: npm run test:nightly:report"
Write-Host "   * Test Results: ./test-results-nightly/"
Write-Host "   * Screenshots: ./test-results-nightly/**/test-failed-*.png"

exit $exitCode
