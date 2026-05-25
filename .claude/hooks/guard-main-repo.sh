#!/bin/bash
# PreToolUse hook: block Edit/Write operations targeting the main repo
# when worktrees exist. Forces agents to use the worktree path.
#
# Receives JSON on stdin with tool_name and tool_input.file_path.
# Exit 0 = allow, exit 2 = block.
# Fails open: if jq is missing or input is invalid, allows the operation.

INPUT=$(cat 2>/dev/null || true)

# Fail open if input is empty or jq is not available
if [ -z "$INPUT" ] || ! command -v jq &>/dev/null; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

# Nothing to check if no file_path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Normalise to forward slashes for comparison
FILE_PATH=$(echo "$FILE_PATH" | sed 's|\\|/|g')

# Main repo path (normalised)
MAIN_REPO="D:/code/eso-log-aggregator"

# Check if the file is inside the main repo (but NOT in a worktree)
if [[ "$FILE_PATH" != "$MAIN_REPO"/* ]]; then
  exit 0  # Not in main repo — allow
fi

# Allow edits to config/settings files in .claude/
if [[ "$FILE_PATH" == "$MAIN_REPO/.claude/"* ]]; then
  exit 0
fi

# Allow edits to workspace file
if [[ "$FILE_PATH" == *"eso-log-aggregator.code-workspace" ]]; then
  exit 0
fi

# Allow edits to MCP server source files (development tooling)
if [[ "$FILE_PATH" == "$MAIN_REPO/tools/mcp/"* ]]; then
  exit 0
fi

# Check if worktrees exist
WORKTREE_COUNT=$(git -C "$MAIN_REPO" worktree list --porcelain 2>/dev/null | grep -c "^worktree " || true)

# Subtract 1 for the main repo entry itself
WORKTREE_COUNT=$((WORKTREE_COUNT - 1))

if [ "$WORKTREE_COUNT" -le 0 ]; then
  exit 0  # No worktrees — allow main repo edits
fi

# Block: file is in main repo and worktrees exist
echo "BLOCKED: Editing files in the main repo ($MAIN_REPO) while $WORKTREE_COUNT worktree(s) exist. Edit the file in the worktree path instead (D:/code/eso-log-aggregator-worktrees/... or .claude/worktrees/...)." >&2
exit 2
