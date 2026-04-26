#!/bin/bash
# Stop hook: remove node_modules symlink from ephemeral worktree before session ends.
# This is a belt-and-suspenders cleanup — the main protection is that directory
# symlinks (mklink /D) are NOT followed by recursive-delete tools, so even if this
# hook doesn't fire (e.g. Claude Code archive), the target is safe.
#
# Uses `cmd //c rmdir` (non-recursive) which safely removes both symlinks and
# junctions without touching the target. Real directories are left untouched.
#
# Note: on Windows git-bash, `[ -L ]` returns false for NTFS junctions (only true
# symlinks), so we always attempt the non-recursive rmdir whenever node_modules exists.
# cmd rmdir succeeds for symlinks/junctions and fails harmlessly on non-empty real dirs.

WORKTREE="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Only act inside Claude Code ephemeral worktrees
if [[ "$WORKTREE" != *"/.claude/worktrees/"* ]]; then
  exit 0
fi

NM="$WORKTREE/node_modules"

if [ ! -e "$NM" ] && [ ! -L "$NM" ]; then
  exit 0
fi

# Attempt non-recursive removal whenever node_modules exists in an ephemeral worktree.
WIN_PATH=$(cygpath -w "$NM" 2>/dev/null || echo "$NM" | sed 's|/d/|D:\\|; s|/|\\|g')
cmd //c "rmdir \"$WIN_PATH\"" >/dev/null 2>&1

exit 0
