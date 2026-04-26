#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Deploy a local build to the dev-previews GitHub Pages site with a custom alias.

.DESCRIPTION
  Builds the project with the correct base URL and pushes the output to the
  ESO-Toolkit/dev-previews repo under the given alias directory. This lets you
  test any local branch on the live preview site without opening a PR.

.PARAMETER Alias
  The subdirectory name for this preview (e.g. "my-feature", "debug-auth").
  Defaults to the current git branch name (sanitised for URLs).

.PARAMETER SkipBuild
  Push the existing build/ directory without rebuilding.

.PARAMETER Remove
  Remove an existing preview instead of deploying.

.PARAMETER DevPreviewsPath
  Path to a local clone of ESO-Toolkit/dev-previews.
  Defaults to ../dev-previews (sibling directory).

.EXAMPLE
  # Deploy current branch with auto-generated alias
  .\scripts\deploy-preview.ps1

  # Deploy with a custom alias
  .\scripts\deploy-preview.ps1 -Alias "my-feature"

  # Push an already-built output
  .\scripts\deploy-preview.ps1 -Alias "quick-test" -SkipBuild

  # Remove a preview
  .\scripts\deploy-preview.ps1 -Alias "my-feature" -Remove
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Alias,

    [switch]$SkipBuild,

    [switch]$Remove,

    [string]$DevPreviewsPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not $DevPreviewsPath) {
    $DevPreviewsPath = Join-Path (Split-Path -Parent $ProjectRoot) 'dev-previews'
}

if (-not (Test-Path (Join-Path $DevPreviewsPath '.git'))) {
    Write-Error @"
dev-previews repo not found at: $DevPreviewsPath

Clone it first:
  git clone git@github.com:ESO-Toolkit/dev-previews.git "$DevPreviewsPath"

Or pass -DevPreviewsPath to point to your clone.
"@
}

# ---------------------------------------------------------------------------
# Resolve alias
# ---------------------------------------------------------------------------
if (-not $Alias) {
    # Derive from current git branch, sanitised for URLs
    $branch = (git -C $ProjectRoot branch --show-current) 2>$null
    if (-not $branch) {
        Write-Error 'Could not detect git branch. Pass -Alias explicitly.'
    }
    # Sanitise: lowercase, replace non-alphanumeric with hyphens, collapse runs
    $Alias = ($branch -replace '[^a-zA-Z0-9-]', '-' -replace '-+', '-').Trim('-').ToLower()
    if (-not $Alias) {
        Write-Error 'Derived alias is empty. Pass -Alias explicitly.'
    }
}

$PreviewDir = Join-Path $DevPreviewsPath $Alias
$PreviewUrl = "https://eso-toolkit.github.io/dev-previews/$Alias/"
$BaseUrl = "/dev-previews/$Alias/"

Write-Host ""
Write-Host "  Alias:   $Alias" -ForegroundColor Cyan
Write-Host "  URL:     $PreviewUrl" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Remove mode
# ---------------------------------------------------------------------------
if ($Remove) {
    if (Test-Path $PreviewDir) {
        Remove-Item -Recurse -Force $PreviewDir
        Write-Host "  Removed: $PreviewDir" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Nothing to remove - $Alias does not exist." -ForegroundColor Yellow
    }

    # Update previews.json
    $previewsJson = Join-Path $DevPreviewsPath 'previews.json'
    if (Test-Path $previewsJson) {
        $previews = Get-Content $previewsJson -Raw | ConvertFrom-Json
        $previews = @($previews | Where-Object { -not $_.PSObject.Properties['alias'] -or $_.alias -ne $Alias })
        $previews | ConvertTo-Json -Depth 10 | Set-Content $previewsJson -Encoding UTF8
    }

    # Commit and push
    Push-Location $DevPreviewsPath
    try {
        git add -A
        $status = git status --porcelain
        if ($status) {
            git commit -m "Remove local preview: $Alias"
            git push
            Write-Host "  Pushed removal to dev-previews." -ForegroundColor Green
        }
        else {
            Write-Host "  No changes to push." -ForegroundColor Yellow
        }
    }
    finally {
        Pop-Location
    }
    return
}

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Host "  Building with VITE_BASE_URL=$BaseUrl ..." -ForegroundColor Cyan
    Push-Location $ProjectRoot
    try {
        $env:NODE_ENV = 'production'
        $env:VITE_BASE_URL = $BaseUrl
        $env:NODE_OPTIONS = '--max-old-space-size=8192'
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error 'Build failed.'
        }
    }
    finally {
        # Clean up env vars so they don't leak into the user's shell
        Remove-Item Env:\VITE_BASE_URL -ErrorAction SilentlyContinue
        Remove-Item Env:\NODE_OPTIONS -ErrorAction SilentlyContinue
        Pop-Location
    }
}

$BuildDir = Join-Path $ProjectRoot 'build'
if (-not (Test-Path $BuildDir)) {
    Write-Error "Build directory not found at $BuildDir. Run without -SkipBuild."
}

# ---------------------------------------------------------------------------
# Pull latest dev-previews to avoid push conflicts
# ---------------------------------------------------------------------------
Push-Location $DevPreviewsPath
try {
    try { git pull --rebase origin main 2>&1 | Out-Null } catch { <# ignore informational stderr; push will fail if real conflicts exist #> }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# Copy build to dev-previews
# ---------------------------------------------------------------------------
if (Test-Path $PreviewDir) {
    Remove-Item -Recurse -Force $PreviewDir
}
Copy-Item -Recurse -Force $BuildDir $PreviewDir
Write-Host "  Copied build to $PreviewDir" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Update previews.json
# ---------------------------------------------------------------------------
$previewsJson = Join-Path $DevPreviewsPath 'previews.json'
if (Test-Path $previewsJson) {
    $previews = Get-Content $previewsJson -Raw | ConvertFrom-Json
}
else {
    $previews = @()
}

# Remove existing entry for this alias, add fresh one
# Use PSObject.Properties to safely handle entries that don't have an 'alias' field (e.g. PR entries)
$previews = @($previews | Where-Object { -not $_.PSObject.Properties['alias'] -or $_.alias -ne $Alias })

$branchName = (git -C $ProjectRoot branch --show-current) 2>$null
$commitHash = (git -C $ProjectRoot rev-parse --short HEAD) 2>$null
$updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$entry = [PSCustomObject]@{
    alias     = $Alias
    branch    = $branchName
    commit    = $commitHash
    updatedAt = $updatedAt
    local     = $true
}
$previews = @($previews) + @($entry)

$previews | ConvertTo-Json -Depth 10 | Set-Content $previewsJson -Encoding UTF8

# ---------------------------------------------------------------------------
# Commit and push
# ---------------------------------------------------------------------------
Push-Location $DevPreviewsPath
try {
    git add -A
    git commit -m ('Deploy local preview: ' + $Alias + ' (' + $branchName + '@' + $commitHash + ')')
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Failed to push to dev-previews. You may need to resolve conflicts manually.'
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "  Deployed!" -ForegroundColor Green
Write-Host "  $PreviewUrl" -ForegroundColor Cyan
Write-Host ""
