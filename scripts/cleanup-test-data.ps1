#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleanup script for test data and temporary files

.DESCRIPTION
    Removes generated test artifacts and old downloaded test data to free up disk space.
    Safe to run periodically or as part of CI cleanup.

.PARAMETER DaysOld
    Remove data-downloads older than this many days (default: 7)

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\scripts\cleanup-test-data.ps1
    
.EXAMPLE
    .\scripts\cleanup-test-data.ps1 -DaysOld 3 -Force
#>

param(
    [int]$DaysOld = 7,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "ESO Log Aggregator - Test Data Cleanup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Calculate cutoff date
$cutoffDate = (Get-Date).AddDays(-$DaysOld)
Write-Host "Cleaning data older than: $($cutoffDate.ToString('yyyy-MM-dd'))" -ForegroundColor Yellow
Write-Host ""

# Directories to clean
$cleanupTargets = @(
    @{
        Path = "data-downloads"
        Description = "Downloaded test report data"
        CheckAge = $true
    },
    @{
        Path = "test-results-full"
        Description = "Full test results"
        CheckAge = $false
    },
    @{
        Path = "test-results-nightly"
        Description = "Nightly test results"
        CheckAge = $false
    },
    @{
        Path = "test-results-screen-sizes"
        Description = "Screen size test results"
        CheckAge = $false
    },
    @{
        Path = "playwright-report"
        Description = "Playwright HTML reports"
        CheckAge = $false
    },
    @{
        Path = "playwright-report-full"
        Description = "Full Playwright HTML reports"
        CheckAge = $false
    },
    @{
        Path = "playwright-report-nightly"
        Description = "Nightly Playwright HTML reports"
        CheckAge = $false
    },
    @{
        Path = "screen-size-report"
        Description = "Screen size HTML reports"
        CheckAge = $false
    }
)

$totalSaved = 0
$itemsCleaned = 0

foreach ($target in $cleanupTargets) {
    $path = $target.Path
    
    if (-not (Test-Path $path)) {
        Write-Host "  [SKIP] $path (doesn't exist)" -ForegroundColor Gray
        continue
    }
    
    # Calculate size before cleanup
    $items = Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue
    
    if ($target.CheckAge) {
        # Filter by age for data-downloads
        $items = $items | Where-Object { $_.LastWriteTime -lt $cutoffDate }
    }
    
    if ($items.Count -eq 0) {
        Write-Host "  [SKIP] $($target.Description) - No items to clean" -ForegroundColor Gray
        continue
    }
    
    $sizeMB = ($items | Measure-Object -Property Length -Sum).Sum / 1MB
    
    Write-Host "  [CLEAN] $($target.Description)" -ForegroundColor Green
    Write-Host "          Path: $path" -ForegroundColor Gray
    Write-Host "          Items: $($items.Count) files" -ForegroundColor Gray
    Write-Host "          Size: $([math]::Round($sizeMB, 2)) MB" -ForegroundColor Gray
    
    if (-not $Force) {
        $response = Read-Host "    Clean this directory? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "    Skipped" -ForegroundColor Yellow
            continue
        }
    }
    
    # Perform cleanup
    try {
        Remove-Item "$path\*" -Recurse -Force -ErrorAction Stop
        $totalSaved += $sizeMB
        $itemsCleaned++
        Write-Host "    ✓ Cleaned" -ForegroundColor Green
    }
    catch {
        Write-Host "    ✗ Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Summary
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  Directories cleaned: $itemsCleaned" -ForegroundColor Green
Write-Host "  Space freed: $([math]::Round($totalSaved, 2)) MB" -ForegroundColor Green
Write-Host ""

if ($totalSaved -gt 1000) {
    Write-Host "💾 Freed over 1 GB of disk space!" -ForegroundColor Cyan
}

exit 0
