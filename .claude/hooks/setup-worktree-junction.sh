#!/bin/bash
# SessionStart hook: validate and recreate the node_modules symlink for
# ephemeral worktrees (.claude/worktrees/<name>/).
#
# Responsibilities:
#   1. Validate the symlink: check that .bin is non-empty (empty .bin is the
#      most common symptom of a stale or broken link on Windows/npm).
#   2. If missing or invalid, recreate via cmd mklink /D (directory symlink,
#      preferred) or PowerShell New-Item -ItemType SymbolicLink as fallback.
#
# Why symlinks, not junctions:
#   NTFS junctions are followed by recursive-delete tools (PowerShell
#   Remove-Item, Node.js fs.rmSync, git worktree remove). When Claude Code's
#   archive deletes the worktree directory, it follows the junction into the
#   main repo's node_modules and destroys it. Directory symlinks (mklink /D)
#   are NOT followed — the recursive delete removes the link itself, leaving
#   the target intact. Requires Windows Developer Mode (one-time setting).
#
# Windows notes:
#   - Runs in git-bash (ships with Git for Windows); cygpath is available.
#   - `cmd //c` is required — git-bash interprets a single /c as a path.
#   - Path conversion: cygpath -w is the primary method; the sed fallback
#     uses the repo-specific /d/ prefix that matches this machine's layout.
#   - The Stop hook (cleanup-worktree-junction.sh) removes the symlink
#     when the session ends cleanly.

# Prefer CLAUDE_PROJECT_DIR over pwd — Claude Code may invoke hooks with the
# main repo as the process cwd even for worktree sessions, while CLAUDE_PROJECT_DIR
# is the stable per-session project root (set to the worktree path by the launcher).
WORKTREE="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Diagnostic: opt-in logging gated on CLAUDE_HOOK_DEBUG=1.
# Runs before the guard so failures (wrong CLAUDE_PROJECT_DIR) are visible.
# Log is capped at 200 lines to prevent unbounded growth.
if [[ "${CLAUDE_HOOK_DEBUG:-}" == "1" ]]; then
  {
    echo "--- setup-worktree-junction $(date -u +%Y-%m-%dT%H:%M:%SZ) ---"
    echo "  pwd:                 $(pwd)"
    echo "  CLAUDE_PROJECT_DIR:  ${CLAUDE_PROJECT_DIR:-unset}"
    echo "  WORKTREE (resolved): $WORKTREE"
  } >> /tmp/claude-hook-debug.log 2>&1
  if [ -f /tmp/claude-hook-debug.log ]; then
    tail -200 /tmp/claude-hook-debug.log > /tmp/claude-hook-debug.log.tmp 2>/dev/null \
      && mv /tmp/claude-hook-debug.log.tmp /tmp/claude-hook-debug.log 2>/dev/null || true
  fi
fi

# Only act inside Claude Code ephemeral worktrees
if [[ "$WORKTREE" != *"/.claude/worktrees/"* ]]; then
  exit 0
fi

# --- 1. Determine paths ------------------------------------------------------
NM="$WORKTREE/node_modules"
BIN="$NM/.bin"

# Strip /.claude/worktrees/<name> to get main repo root
MAIN_REPO=$(echo "$WORKTREE" | sed 's|/.claude/worktrees/[^/]*$||')
MAIN_NM="$MAIN_REPO/node_modules"

# If main repo node_modules doesn't exist there's nothing we can do here.
# The agent will surface the issue when it runs its first npm/make command.
if [ ! -d "$MAIN_NM" ]; then
  exit 0
fi

# --- 2. Decide if symlink needs creation/repair ------------------------------
needs_recreate=false

if [ ! -e "$NM" ] && [ ! -L "$NM" ]; then
  # Symlink is entirely absent
  needs_recreate=true
elif [ ! -d "$BIN" ] || [ -z "$(ls -A "$BIN" 2>/dev/null | head -c1)" ]; then
  # .bin is missing or empty — symlink is broken or stale
  needs_recreate=true
elif [ -e "$NM" ]; then
  # node_modules exists and .bin is healthy — check if it's a junction (unsafe)
  # vs a symlink (safe). Junctions must be migrated to symlinks.
  # `dir /AL` shows <JUNCTION> vs <SYMLINKD> in its output.
  WIN_NM_CHECK=$(cygpath -w "$NM" 2>/dev/null || echo "$NM" | sed 's|/d/|D:\\|; s|/|\\|g')
  if cmd //c "dir /AL \"$(dirname "$WIN_NM_CHECK")\"" 2>/dev/null | grep -q "JUNCTION.*node_modules"; then
    needs_recreate=true  # migrate junction -> symlink
  fi
fi

if [ "$needs_recreate" = "false" ]; then
  exit 0
fi

# --- 3. Remove any existing stale/broken link (non-recursive, safe) ----------
WIN_NM=$(cygpath -w "$NM" 2>/dev/null || echo "$NM" | sed 's|/d/|D:\\|; s|/|\\|g')
cmd //c "rmdir \"$WIN_NM\"" >/dev/null 2>&1

# --- 4. Recreate as directory symlink via cmd mklink /D ----------------------
# mklink /D creates a directory symlink (not a junction). Recursive-delete tools
# remove the symlink without following it into the target — this is the key
# protection against Claude Code's archive destroying the main repo's node_modules.
WIN_MAIN_NM=$(cygpath -w "$MAIN_NM" 2>/dev/null || echo "$MAIN_NM" | sed 's|/d/|D:\\|; s|/|\\|g')
cmd //c "mklink /D \"$WIN_NM\" \"$WIN_MAIN_NM\"" >/dev/null 2>&1

# Verify; fall back to PowerShell if cmd mklink failed
if [ ! -d "$NM" ]; then
  powershell -NoProfile -NonInteractive -Command \
    "New-Item -ItemType SymbolicLink -Path '$WIN_NM' -Target '$WIN_MAIN_NM'" \
    >/dev/null 2>&1
fi

# If both methods failed, warn the user — most likely Developer Mode is off
if [ ! -d "$NM" ]; then
  echo "WARNING: Failed to create node_modules symlink in worktree." >&2
  echo "  Directory symlinks require Windows Developer Mode to be enabled." >&2
  echo "  Enable it: Settings > System > For Developers > Developer Mode" >&2
fi

exit 0
