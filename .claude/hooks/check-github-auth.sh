#!/bin/bash
# SessionStart hook: warn if GitHub auth is not configured.
# Non-blocking — prints a warning but never fails the session.

# Skip on Windows local dev — gh auth login handles it
if [ "$(uname -s)" = "Linux" ] && [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if [ -z "${GH_TOKEN:-}" ] && [ -z "${GITHUB_TOKEN:-}" ]; then
    if ! gh auth status >/dev/null 2>&1; then
      echo "WARNING: GitHub is not authenticated. PR creation will fail."
      echo "  Set GH_TOKEN in cloud env settings or run: gh auth login"
      echo "  See .agents/skills/auth/SKILL.md for auth guidance"
    fi
  fi
fi
