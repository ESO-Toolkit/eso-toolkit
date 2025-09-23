#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Extract and view Playwright test results from a zip file or download from GitHub Actions

.DESCRIPTION
    This script can extract test results from a local zip file or automatically download
    the latest test results from GitHub Actions and display them for easy viewing.

.PARAMETER ZipPath
    Path to the test results zip file to extract and view

.PARAMETER ExtractPath
    Optional custom extraction path (defaults to ./test-results-extracted)

.PARAMETER OpenTraces
    Switch to automatically open trace files for failed tests

.PARAMETER DownloadLatest
    Switch to automatically download the latest test results from GitHub Actions

.PARAMETER Repository
    GitHub repository in format 'owner/repo' (defaults to current repo)

.PARAMETER WorkflowName
    Name of the GitHub workflow to download results from (defaults to 'Nightly Regression Tests')

.PARAMETER GitHubToken
    GitHub personal access token for API access (can also use GITHUB_TOKEN env var)

.EXAMPLE
    .\view-test-results.ps1 -ZipPath "C:\Downloads\test-results.zip"
    
.EXAMPLE
    .\view-test-results.ps1 -DownloadLatest
    
.EXAMPLE
    .\view-test-results.ps1 -DownloadLatest -Repository "myuser/myrepo" -GitHubToken "ghp_xxx"
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ZipPath,
    
    [Parameter(Mandatory=$false)]
    [string]$ExtractPath = ".\test-results-extracted",
    
    [Parameter(Mandatory=$false)]
    [switch]$OpenTraces,

    [Parameter(Mandatory=$false)]
    [switch]$DownloadLatest,

    [Parameter(Mandatory=$false)]
    [string]$Repository,

    [Parameter(Mandatory=$false)]
    [string]$WorkflowName = "Nightly Regression Tests",

    [Parameter(Mandatory=$false)]
    [string]$GitHubToken
)

# Function to find zip files in common locations
function Find-TestResultsZip {
    $commonPaths = @(
        ".\*.zip",
        ".\test-results\*.zip",
        ".\test-results-nightly\*.zip",
        "$env:USERPROFILE\Downloads\*test*results*.zip",
        "$env:USERPROFILE\Downloads\*playwright*.zip",
        "$env:USERPROFILE\Downloads\*nightly*.zip"
    )
    
    foreach ($pattern in $commonPaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($found) {
            return $found.FullName
        }
    }
    return $null
}

# Function to get repository info from git
function Get-CurrentRepository {
    try {
        $remoteUrl = git remote get-url origin 2>$null
        if ($remoteUrl -match "github\.com[:/]([^/]+)/([^/\s]+)") {
            $owner = $matches[1]
            $repo = $matches[2] -replace '\.git$', ''
            return "$owner/$repo"
        }
    } catch {
        # Ignore git errors
    }
    return $null
}

# Function to get GitHub token
function Get-GitHubToken {
    param($ProvidedToken)
    
    if ($ProvidedToken) {
        return $ProvidedToken
    }
    
    if ($env:GITHUB_TOKEN) {
        return $env:GITHUB_TOKEN
    }
    
    if ($env:GH_TOKEN) {
        return $env:GH_TOKEN
    }
    
    return $null
}

# Function to download latest test results from GitHub Actions
function Download-LatestTestResults {
    param(
        [string]$Repository,
        [string]$WorkflowName,
        [string]$GitHubToken
    )
    
    # Get repository info
    if (-not $Repository) {
        $Repository = Get-CurrentRepository
        if (-not $Repository) {
            throw "Could not determine repository. Please specify -Repository 'owner/repo'"
        }
    }
    
    # Get GitHub token
    $token = Get-GitHubToken -ProvidedToken $GitHubToken
    if (-not $token) {
        throw "GitHub token required. Set GITHUB_TOKEN environment variable or use -GitHubToken parameter"
    }
    
    Write-Host "🔍 Searching for latest workflow runs..." -ForegroundColor Cyan
    Write-Host "   Repository: $Repository"
    Write-Host "   Workflow: $WorkflowName"
    
    # Set up headers
    $headers = @{
        'Authorization' = "Bearer $token"
        'Accept' = 'application/vnd.github.v3+json'
        'User-Agent' = 'PowerShell-TestResultsViewer'
    }
    
    try {
        # Get workflow runs
        $workflowsUrl = "https://api.github.com/repos/$Repository/actions/workflows"
        $workflows = Invoke-RestMethod -Uri $workflowsUrl -Headers $headers
        
        $targetWorkflow = $workflows.workflows | Where-Object { $_.name -eq $WorkflowName }
        if (-not $targetWorkflow) {
            throw "Workflow '$WorkflowName' not found. Available workflows: $($workflows.workflows.name -join ', ')"
        }
        
        # Get recent runs for this workflow
        $runsUrl = "https://api.github.com/repos/$Repository/actions/workflows/$($targetWorkflow.id)/runs?per_page=10"
        $runs = Invoke-RestMethod -Uri $runsUrl -Headers $headers
        
        if ($runs.workflow_runs.Count -eq 0) {
            throw "No workflow runs found for '$WorkflowName'"
        }
        
        # Find the latest completed run
        $latestRun = $runs.workflow_runs | Where-Object { $_.status -eq 'completed' } | Select-Object -First 1
        if (-not $latestRun) {
            throw "No completed runs found for '$WorkflowName'"
        }
        
        Write-Host "✅ Found latest run:" -ForegroundColor Green
        Write-Host "   Run ID: $($latestRun.id)"
        Write-Host "   Status: $($latestRun.conclusion)"
        Write-Host "   Created: $($latestRun.created_at)"
        Write-Host "   URL: $($latestRun.html_url)"
        
        # Get artifacts for this run
        $artifactsUrl = "https://api.github.com/repos/$Repository/actions/runs/$($latestRun.id)/artifacts"
        $artifacts = Invoke-RestMethod -Uri $artifactsUrl -Headers $headers
        
        if ($artifacts.artifacts.Count -eq 0) {
            throw "No artifacts found for the latest run"
        }
        
        # Find test results artifact (look for consolidated results first, then individual)
        $testArtifact = $artifacts.artifacts | Where-Object { 
            $_.name -like "*consolidated*" -or 
            $_.name -like "*test-results*" -or 
            $_.name -like "*nightly*results*"
        } | Select-Object -First 1
        
        if (-not $testArtifact) {
            Write-Host "⚠️  No test results artifacts found. Available artifacts:" -ForegroundColor Yellow
            $artifacts.artifacts | ForEach-Object { Write-Host "   - $($_.name)" }
            throw "No test results artifacts available"
        }
        
        Write-Host "📦 Downloading artifact: $($testArtifact.name)" -ForegroundColor Cyan
        Write-Host "   Size: $([math]::Round($testArtifact.size_in_bytes / 1MB, 2)) MB"
        
        # Download the artifact
        $downloadUrl = $testArtifact.archive_download_url
        $tempZipPath = Join-Path $env:TEMP "$($testArtifact.name)-$($latestRun.id).zip"
        
        # GitHub API returns a redirect for artifact downloads, so we need to follow it
        $response = Invoke-WebRequest -Uri $downloadUrl -Headers $headers -MaximumRedirection 0 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 302) {
            $actualDownloadUrl = $response.Headers.Location
            Invoke-WebRequest -Uri $actualDownloadUrl -OutFile $tempZipPath -Headers $headers
        } else {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZipPath -Headers $headers
        }
        
        Write-Host "✅ Downloaded to: $tempZipPath" -ForegroundColor Green
        return $tempZipPath
        
    } catch {
        throw "Failed to download from GitHub Actions: $($_.Exception.Message)"
    }
}

# Main logic starts here

# Handle download latest option
if ($DownloadLatest) {
    Write-Host "🚀 Downloading latest test results from GitHub Actions..." -ForegroundColor Green
    try {
        $ZipPath = Download-LatestTestResults -Repository $Repository -WorkflowName $WorkflowName -GitHubToken $GitHubToken
        Write-Host "✅ Download completed!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Make sure you have:" -ForegroundColor Yellow
        Write-Host "   1. A GitHub token set (GITHUB_TOKEN env var or -GitHubToken parameter)"
        Write-Host "   2. Access to the repository"
        Write-Host "   3. The workflow name is correct (default: 'Nightly Regression Tests')"
        Write-Host ""
        Write-Host "🔧 To set up a GitHub token:" -ForegroundColor Cyan
        Write-Host "   1. Go to https://github.com/settings/tokens"
        Write-Host "   2. Generate a token with 'actions:read' permission"
        Write-Host "   3. Set it as: `$env:GITHUB_TOKEN = 'your_token_here'"
        exit 1
    }
}

# If no zip path provided and not downloading, try to find one
if (-not $ZipPath) {
    Write-Host "🔍 No zip path provided. Searching for test results zip files..." -ForegroundColor Yellow
    $ZipPath = Find-TestResultsZip
    
    if (-not $ZipPath) {
        Write-Host "❌ No test results zip file found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Usage examples:" -ForegroundColor Cyan
        Write-Host "   .\view-test-results.ps1 -ZipPath 'C:\Downloads\test-results.zip'"
        Write-Host "   .\view-test-results.ps1 -ZipPath 'results.zip' -OpenTraces"
        Write-Host "   .\view-test-results.ps1 -DownloadLatest"
        Write-Host "   .\view-test-results.ps1 -DownloadLatest -Repository 'user/repo'"
        Write-Host ""
        Write-Host "📁 Searched in:"
        Write-Host "   - Current directory (*.zip)"
        Write-Host "   - ./test-results/ directory"
        Write-Host "   - ./test-results-nightly/ directory"
        Write-Host '   - Downloads folder (*test*results*.zip, *playwright*.zip, *nightly*.zip)'
        Write-Host ""
        Write-Host "🔧 To download latest results automatically:" -ForegroundColor Yellow
        Write-Host "   1. Set GITHUB_TOKEN environment variable"
        Write-Host "   2. Run: .\view-test-results.ps1 -DownloadLatest"
        exit 1
    }
    
    Write-Host "✅ Found: $ZipPath" -ForegroundColor Green
}

# Verify zip file exists
if (-not (Test-Path $ZipPath)) {
    Write-Host "❌ Zip file not found: $ZipPath" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Extracting test results..." -ForegroundColor Cyan
Write-Host "   Source: $ZipPath"
Write-Host "   Target: $ExtractPath"

# Remove existing extraction directory if it exists
if (Test-Path $ExtractPath) {
    Remove-Item -Path $ExtractPath -Recurse -Force
}

# Extract the zip file
try {
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
    Write-Host "✅ Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract zip file: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Analyzing extracted contents..." -ForegroundColor Cyan

# Find and display contents
$contents = Get-ChildItem -Path $ExtractPath -Recurse
$htmlReports = $contents | Where-Object { $_.Name -eq "index.html" }
$traceFiles = $contents | Where-Object { $_.Extension -eq ".zip" -and $_.Name -like "*trace*" }
$screenshots = $contents | Where-Object { $_.Extension -in @(".png", ".jpg", ".jpeg") }
$jsonResults = $contents | Where-Object { $_.Name -like "*results*.json" }

Write-Host "📊 Found artifacts:" -ForegroundColor Yellow
Write-Host "   HTML Reports: $($htmlReports.Count)"
Write-Host "   Trace Files: $($traceFiles.Count)"
Write-Host "   Screenshots: $($screenshots.Count)"
Write-Host "   JSON Results: $($jsonResults.Count)"

Write-Host ""

# Open HTML report
if ($htmlReports.Count -gt 0) {
    $primaryReport = $htmlReports[0]
    Write-Host "🌐 Opening HTML report..." -ForegroundColor Green
    Write-Host "   Path: $($primaryReport.FullName)"
    
    try {
        Start-Process $primaryReport.FullName
        Write-Host "✅ HTML report opened in browser!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to open HTML report: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  No HTML report found" -ForegroundColor Yellow
}

# Handle trace files
if ($traceFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "🎬 Trace files available:" -ForegroundColor Cyan
    
    foreach ($trace in $traceFiles | Select-Object -First 5) {
        $relativePath = $trace.FullName.Replace((Get-Location).Path, ".")
        Write-Host "   $relativePath"
    }
    
    if ($traceFiles.Count -gt 5) {
        Write-Host "   ... and $($traceFiles.Count - 5) more"
    }
    
    if ($OpenTraces -or $traceFiles.Count -le 3) {
        Write-Host ""
        Write-Host "🔍 Opening trace viewer..." -ForegroundColor Green
        
        foreach ($trace in $traceFiles | Select-Object -First 3) {
            try {
                Write-Host "   Opening: $($trace.Name)"
                Start-Process "npx" -ArgumentList "playwright", "show-trace", $trace.FullName -NoNewWindow
            } catch {
                Write-Host "   ❌ Failed to open trace: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host ""
        Write-Host "💡 To view traces, run:" -ForegroundColor Yellow
        Write-Host "   npx playwright show-trace `"$($traceFiles[0].FullName)`""
        Write-Host "   or use -OpenTraces switch"
    }

# Show screenshots location
if ($screenshots.Count -gt 0) {
    Write-Host ""
    Write-Host "📷 Screenshots available: $($screenshots.Count)" -ForegroundColor Cyan
    $screenshotDir = Split-Path $screenshots[0].FullName -Parent
    Write-Host "   Location: $screenshotDir"
    Write-Host "💡 To view: explorer `"$screenshotDir`""
}

# Show results summary
if ($jsonResults.Count -gt 0) {
    Write-Host ""
    Write-Host "📄 JSON Results:" -ForegroundColor Cyan
    foreach ($json in $jsonResults) {
        Write-Host "   $($json.FullName)"
    }
}

Write-Host ''
Write-Host '🎉 Test results ready for analysis!' -ForegroundColor Green
Write-Host '📁 All files extracted to:' -ForegroundColor Cyan
Write-Host "   $ExtractPath"

Write-Host ''
Write-Host '🚀 Next steps:' -ForegroundColor Yellow
Write-Host '   1. Check the HTML report that should have opened in your browser'
Write-Host '   2. Use npx playwright show-trace [trace-file] to view detailed traces'
Write-Host '   3. Browse screenshots and other artifacts in the extracted folder'