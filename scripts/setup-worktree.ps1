# setup-worktree.ps1 - Smart worktree dependency setup
#
# Automates the setup steps every worktree needs:
#   1. node_modules  - junction to main repo when lockfiles match; full npm ci otherwise
#   2. .env          - copy from main repo
#   3. .twig         - junction to main repo (shared branch-dependency state, if present)
#
# Usage (from any directory):
#   .\scripts\setup-worktree.ps1 -WorktreePath <path>
#   .\scripts\setup-worktree.ps1 -WorktreePath <path> -Force        # always run npm ci
#   .\scripts\setup-worktree.ps1 -WorktreePath <path> -SkipInstall  # env + twig only
#
# Called by: make wt-setup WT=<path>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$WorktreePath,

    [Parameter()]
    [string]$MainRepoPath,

    [Parameter()]
    [switch]$Force,

    [Parameter()]
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step  { param([string]$msg) Write-Host "`n> $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "  [ok] $msg" -ForegroundColor Green }
function Write-Skip  { param([string]$msg) Write-Host "  [--] $msg" -ForegroundColor DarkGray }
function Write-Warn  { param([string]$msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }

function Confirm-IndependentInstall {
    # Prompt the user to confirm a full npm ci in the worktree when the
    # main repo's node_modules is broken. In non-interactive sessions (e.g.
    # agents running via make wt-setup) default to 'yes' so work isn't blocked.
    param([string]$Reason)
    Write-Host ""
    Write-Warn "Main repo node_modules is unhealthy: $Reason"
    Write-Warn "Junctioning would propagate the broken state to this worktree."
    Write-Host "  Options:" -ForegroundColor Yellow
    Write-Host "    Y - Run npm ci in this worktree only (independent node_modules)" -ForegroundColor Yellow
    Write-Host "    N - Abort setup (fix main repo first: cd $MainRepoPath ; make install)" -ForegroundColor Yellow
    $isInteractive = [Environment]::UserInteractive -and (-not [Console]::IsInputRedirected)
    if (-not $isInteractive) {
        Write-Warn "Non-interactive session detected -- defaulting to independent install"
        return $true
    }
    $answer = Read-Host "  Install independently in this worktree? [Y/n]"
    if ($answer -match '^[Nn]') {
        return $false
    }
    return $true
}

function Get-LockfileHash {
    # Content-normalised SHA-256 for lockfile comparison.
    # Normalises CRLF -> LF and strips a leading BOM so that minor formatting
    # differences (CRLF checkout on Windows, git config differences) do not
    # trigger a false-positive "lockfiles differ" and a needless full npm ci.
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    $content = [System.IO.File]::ReadAllText($Path)
    # Strip UTF-8 BOM (U+FEFF) if present
    if ($content.Length -gt 0 -and [int][char]$content[0] -eq 0xFEFF) {
        $content = $content.Substring(1)
    }
    # Normalise line endings: CRLF -> LF
    $content = $content -replace "`r`n", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $sha   = [System.Security.Cryptography.SHA256]::Create()
    $hash  = $sha.ComputeHash($bytes)
    $sha.Dispose()
    return ([System.BitConverter]::ToString($hash) -replace '-', '')
}

function Assert-NodeModulesValid {
    # Validate that npm ci produced a usable node_modules.
    # Returns $true when valid, $false when broken.
    # npm >= 7 writes .package-lock.json; always check .bin as the primary signal.
    param([string]$NMPath)
    $binDir = Join-Path $NMPath ".bin"
    $binItems = @(Get-ChildItem $binDir -ErrorAction SilentlyContinue)
    if ($binItems.Count -eq 0) {
        Write-Warn "$NMPath/.bin is empty -- install may have failed"
        return $false
    }
    return $true
}

function Test-IsJunction {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $false }
    $item = Get-Item $Path -Force
    return ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
}

function Remove-JunctionSafe {
    # Remove a junction WITHOUT deleting the target contents.
    # Remove-Item -Recurse on a junction follows it; cmd rmdir does not.
    param([string]$Path)
    if (Test-IsJunction $Path) {
        cmd /c "rmdir `"$Path`"" 2>$null
        Write-Ok "Removed stale junction at $Path"
    }
}

function Invoke-NpmCiWithRetry {
    # Run npm ci in $InstallPath, validate, retry once if incomplete.
    # Throws on failure.
    param([string]$InstallPath)
    Push-Location $InstallPath
    try { npm ci } finally { Pop-Location }
    $nm = Join-Path $InstallPath "node_modules"
    if (-not (Assert-NodeModulesValid $nm)) {
        Write-Warn "Retrying npm ci (first attempt left node_modules incomplete)"
        Push-Location $InstallPath
        try { npm ci } finally { Pop-Location }
        if (-not (Assert-NodeModulesValid $nm)) {
            Write-Error "npm ci failed to produce a valid node_modules. Run 'make wt-setup WT=`"$InstallPath`"' again."
        }
    }
}

function Get-FileHash256 {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    (Get-FileHash -Path $Path -Algorithm SHA256).Hash
}

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------

$WorktreePath = (Resolve-Path $WorktreePath -ErrorAction Stop).Path

if (-not $MainRepoPath) {
    # Find via git common dir (works from any worktree)
    $gitCommonDir = $null
    try { $gitCommonDir = (git -C $WorktreePath rev-parse --git-common-dir 2>$null) } catch {}
    if ($gitCommonDir) {
        $MainRepoPath = (Resolve-Path (Split-Path $gitCommonDir -Parent) -ErrorAction SilentlyContinue).Path
    }
    if (-not $MainRepoPath) {
        $MainRepoPath = "D:\code\eso-log-aggregator"
    }
}

if (-not (Test-Path (Join-Path $MainRepoPath "package-lock.json"))) {
    Write-Error "Main repo not found at $MainRepoPath (no package-lock.json). Pass -MainRepoPath explicitly."
    return
}
if (-not (Test-Path (Join-Path $WorktreePath "package-lock.json"))) {
    Write-Error "Worktree at $WorktreePath has no package-lock.json -- is it a valid checkout?"
    return
}

Write-Host ""
Write-Host "=== Worktree Smart Setup ===" -ForegroundColor Cyan
Write-Host "  Worktree : $WorktreePath"
Write-Host "  Main repo: $MainRepoPath"

# ---------------------------------------------------------------------------
# 1. node_modules
# ---------------------------------------------------------------------------

if ($SkipInstall) {
    Write-Step "node_modules -- skipped (-SkipInstall)"
}
else {
    Write-Step "node_modules"

    $wtLockPath   = Join-Path $WorktreePath "package-lock.json"
    $mainLockPath = Join-Path $MainRepoPath "package-lock.json"
    # Use content-normalised hashes to avoid false positives from CRLF/LF or
    # BOM differences that git may introduce on Windows checkout.
    $wtLock       = Get-LockfileHash $wtLockPath
    $mainLock     = Get-LockfileHash $mainLockPath
    $mainNM       = Join-Path $MainRepoPath "node_modules"
    $wtNM         = Join-Path $WorktreePath "node_modules"

    $currentIsJunction = Test-IsJunction $wtNM
    $lockfilesMatch    = ($wtLock -eq $mainLock)

    if ($Force) {
        # Force mode: always full install
        Write-Warn "Force mode -- running full npm ci"
        Remove-JunctionSafe $wtNM
        Invoke-NpmCiWithRetry -InstallPath $WorktreePath
        Write-Ok "npm ci completed (independent node_modules)"
    }
    elseif ($lockfilesMatch -and (Test-Path $mainNM) -and -not $currentIsJunction) {
        # Lockfiles match + main has node_modules + worktree has no junction yet
        # Validate main node_modules BEFORE junctioning to avoid propagating broken state
        if (-not (Assert-NodeModulesValid $mainNM)) {
            $reason = "main repo node_modules/.bin is missing or empty"
            if (Confirm-IndependentInstall -Reason $reason) {
                # If worktree already has a valid independent node_modules, skip reinstall
                if ((Test-Path $wtNM) -and -not (Test-IsJunction $wtNM) -and (Assert-NodeModulesValid $wtNM)) {
                    Write-Ok "Worktree already has valid independent node_modules -- skipping reinstall"
                }
                else {
                    Write-Warn "Installing independently in worktree (not junctioning)"
                    if (Test-Path $wtNM) {
                        cmd /c "rmdir /s /q `"$wtNM`"" 2>$null
                        if (Test-Path $wtNM) { Remove-Item $wtNM -Recurse -Force -ErrorAction SilentlyContinue }
                    }
                    Invoke-NpmCiWithRetry -InstallPath $WorktreePath
                    Write-Ok "npm ci completed (independent node_modules, main repo still needs repair)"
                }
            }
            else {
                Write-Error "Aborting: fix main repo node_modules first (cd $MainRepoPath ; make install), then re-run wt-setup."
            }
        }
        else {
            if (Test-Path $wtNM) {
                Write-Warn "Removing existing node_modules to replace with junction (lockfiles match)"
                # cmd rmdir /s /q is faster than Remove-Item -Recurse on Windows
                cmd /c "rmdir /s /q `"$wtNM`"" 2>$null
                if (Test-Path $wtNM) {
                    Remove-Item $wtNM -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
            cmd /c "mklink /J `"$wtNM`" `"$mainNM`"" | Out-Null
            Write-Ok "Junctioned node_modules -> main repo (lockfiles match, saved ~400 MB)"
        }
    }
    elseif ($lockfilesMatch -and $currentIsJunction) {
        # Already junctioned -- verify the target is still healthy
        if (-not (Assert-NodeModulesValid $wtNM)) {
            $reason = "junctioned node_modules/.bin is missing or empty"
            if (Confirm-IndependentInstall -Reason $reason) {
                Write-Warn "Replacing broken junction with independent install"
                Remove-JunctionSafe $wtNM
                Invoke-NpmCiWithRetry -InstallPath $WorktreePath
                Write-Ok "npm ci completed (independent node_modules, main repo still needs repair)"
            }
            else {
                Write-Error "Aborting: fix main repo node_modules first (cd $MainRepoPath ; make install), then re-run wt-setup."
            }
        }
        else {
            Write-Ok "node_modules already junctioned to main repo (lockfiles still match)"
        }
    }
    elseif (-not $lockfilesMatch -and $currentIsJunction) {
        # Lockfiles diverged -- need independent install
        Write-Warn "Lockfiles diverged -- removing junction, running npm ci"
        Remove-JunctionSafe $wtNM
        Invoke-NpmCiWithRetry -InstallPath $WorktreePath
        Write-Ok "npm ci completed (independent node_modules)"
    }
    elseif (-not $lockfilesMatch) {
        # Lockfiles differ, no junction -- normal install
        Write-Warn "Lockfiles differ from main -- running npm ci"
        Invoke-NpmCiWithRetry -InstallPath $WorktreePath
        Write-Ok "npm ci completed (independent node_modules)"
    }
    else {
        # Lockfiles match but main has no node_modules
        Write-Warn "Main repo has no node_modules -- running npm ci in worktree"
        Invoke-NpmCiWithRetry -InstallPath $WorktreePath
        Write-Ok "npm ci completed"
    }
}

# ---------------------------------------------------------------------------
# 2. .env
# ---------------------------------------------------------------------------

Write-Step ".env"

$mainEnv = Join-Path $MainRepoPath ".env"
$wtEnv   = Join-Path $WorktreePath ".env"

if (-not (Test-Path $mainEnv)) {
    Write-Warn "No .env in main repo -- skipping"
}
elseif (Test-Path $wtEnv) {
    $mainHash = Get-FileHash256 $mainEnv
    $wtHash   = Get-FileHash256 $wtEnv
    if ($mainHash -eq $wtHash) {
        Write-Ok ".env already up to date"
    }
    else {
        Copy-Item $mainEnv $wtEnv -Force
        Write-Ok ".env updated from main repo"
    }
}
else {
    Copy-Item $mainEnv $wtEnv
    Write-Ok ".env copied from main repo"
}

# ---------------------------------------------------------------------------
# 3. .twig junction (optional — skip if main repo has no .twig)
# ---------------------------------------------------------------------------

Write-Step ".twig"

$mainTwig = Join-Path $MainRepoPath ".twig"
$wtTwig   = Join-Path $WorktreePath ".twig"

if (-not (Test-Path $mainTwig)) {
    Write-Skip "No .twig in main repo -- skipping (twig not installed or not initialised)"
}
elseif (Test-IsJunction $wtTwig) {
    Write-Ok ".twig junction already exists"
}
elseif (Test-Path $wtTwig) {
    Write-Warn ".twig exists but is not a junction -- replacing with junction"
    Remove-Item $wtTwig -Recurse -Force
    cmd /c "mklink /J `"$wtTwig`" `"$mainTwig`"" | Out-Null
    Write-Ok ".twig junctioned -> main repo"
}
else {
    cmd /c "mklink /J `"$wtTwig`" `"$mainTwig`"" | Out-Null
    Write-Ok ".twig junctioned -> main repo"
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host "  Next: code $WorktreePath"
Write-Host "  Start dev: `$env:PORT = `"3002`" ; npm run dev"
Write-Host ""
