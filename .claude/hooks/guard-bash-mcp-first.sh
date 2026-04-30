#!/bin/bash
# PreToolUse hook: warn when Bash commands have direct MCP tool replacements
# (ls/find/cat/head/tail/grep/rg). Always exits 0 — this is a WARNING hook,
# not a blocker. Agents are never trapped in a retry loop.
#
# Receives JSON on stdin with tool_name and tool_input.command.
# Exit 0 = allow (command always runs). Warning is written to stdout so
# Claude sees it in context before the tool executes.
#
# Bypass: add `# mcp-ok` anywhere in the command when you have verified
# that no MCP tool covers this case. This suppresses the warning and marks
# the command as intentional in the audit log:
#
#   find . -name "*.ts" -exec wc -l {} \;  # mcp-ok: no -exec equivalent in MCP
#   rg --type ts "pattern" /abs/path       # mcp-ok: Grep does not support absolute path on Windows
#
# Audit: every command that matches a banned binary AND passes the cat
# allow-list checks (i.e., would warn or bypass) is appended to
# .claude/bash-audit.log (WARN = no bypass marker, BYPASS = acknowledged).
# The file is covered by the **/*.log gitignore rule and is never committed.

INPUT=$(cat 2>/dev/null || true)

# Fail open silently if input is empty or jq is not available
if [ -z "$INPUT" ] || ! command -v jq &>/dev/null; then
  exit 0
fi

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Strip leading whitespace and capture the first token.
# Split on whitespace AND shell operators (;, &, |) and redirection operators
# (<, >) so compound commands like `ls;pwd`, `ls&&echo ok`, `ls>/tmp/out`,
# and `cat</etc/hosts` are all caught correctly.
TRIMMED=$(echo "$COMMAND" | sed -E 's/^[[:space:]]+//')
FIRST_WORD=$(echo "$TRIMMED" | sed -E 's/[[:space:];|&<>].*//')

# Normalize to basename so absolute-path invocations like /bin/head or
# /usr/bin/rg match the same cases as bare names.
# Guard empty/"-" values and stop option parsing so option-like input cannot
# make basename error and accidentally bypass the check.
if [ -n "$FIRST_WORD" ] && [ "$FIRST_WORD" != "-" ]; then
  FIRST_WORD=$(basename -- "$FIRST_WORD")
fi

# Pattern: first word is one of the banned binaries. We match the bare binary
# name only (after basename normalization) — `aws ls` and friends are not
# affected because they start with `aws`.
case "$FIRST_WORD" in
  ls)
    REPLACEMENT="Glob (e.g. Glob({ pattern: \"**/*.ts\", path: \"<dir>\" })). If Glob returns empty on a Windows worktree absolute path, fall back to worktree_run({ command: \"dir <dir>\" }) from the eso-logs-worktree MCP server"
    BAD="ls"
    ;;
  find)
    REPLACEMENT="Glob for file discovery (Glob({ pattern: \"**/*.ts\" })) or Grep for content search (Grep({ pattern: \"foo\", glob: \"**/*.ts\" })). For find ... -exec with no MCP equivalent, add \`# mcp-ok\` (see below)"
    BAD="find"
    ;;
  cat)
    # Allow:
    #   - heredocs:        cat <<EOF
    #   - true pipelines:  cat file | ...   (single |, not ||)
    #   - no file args:    cat              (stdin passthrough)
    #   - redirect forms:  cat > file  /  cat >> file  /  cat file > out
    # Warn: cat <file(s)> with no redirect or pipeline (plain file read),
    #       including redirection-adjacent forms like cat</etc/hosts.
    # Derive REST by stripping the leading "cat" command (with optional spaces)
    # so redirection-adjacent forms like `cat</etc/hosts` yield `</etc/hosts`.
    REST=$(echo "$TRIMMED" | sed -E 's/^cat[[:space:]]*//')
    # Heredoc: cat <<EOF
    if echo "$TRIMMED" | grep -qE '<<'; then
      exit 0
    fi
    # True pipeline: single | not part of ||
    # Uses portable awk (not grep -P) for cross-platform compatibility.
    if echo "$TRIMMED" | awk '{
      for (i=1;i<=length($0);i++) {
        if (substr($0,i,1)=="|") {
          prev=(i>1?substr($0,i-1,1):"")
          nxt=(i<length($0)?substr($0,i+1,1):"")
          if (prev!="|" && nxt!="|") { exit 0 }
        }
      }
      exit 1
    }'; then
      exit 0
    fi
    # No arguments at all (stdin passthrough)
    if [ -z "$REST" ]; then
      exit 0
    fi
    # Output redirect forms: > or >> anywhere in REST (cat > file, cat >> file,
    # cat file > out). Input redirect (<) without heredoc (<<) is a plain file
    # read — it is warned, including cat</etc/hosts.
    if echo "$REST" | grep -qE '>>|[^<]>|^>'; then
      exit 0
    fi
    REPLACEMENT="Read (Read({ file_path: \"<absolute path>\" }))"
    BAD="cat"
    ;;
  head)
    REPLACEMENT="Read with limit (Read({ file_path: \"...\", limit: N }))"
    BAD="head"
    ;;
  tail)
    REPLACEMENT="Read with offset (first Read to get total_lines, then Read({ file_path: \"...\", offset: total - N, limit: N }))"
    BAD="tail"
    ;;
  grep|rg)
    REPLACEMENT="Grep (Grep({ pattern: \"foo\", path: \"<dir>\", glob: \"**/*.ts\", output_mode: \"content\" }))"
    BAD="$FIRST_WORD"
    ;;
  *)
    exit 0
    ;;
esac

# Check for bypass marker — suppresses warning when agent has verified no MCP alternative.
# The `# mcp-ok` comment is stripped by the shell before execution, so it never
# affects the command itself. It shows up in session logs and audit output.
#
# Pattern requires `#` to be preceded by whitespace or at start of the command
# so that occurrences inside quoted strings (e.g. echo "# mcp-ok") are ignored.
BYPASSED=0
if echo "$COMMAND" | grep -qE '(^|[[:space:]])#[[:space:]]*mcp-ok'; then
  BYPASSED=1
fi

# Append to audit log (best-effort; errors are silenced).
# Normalize newlines/tabs to spaces so multi-line scripts produce one log line.
AUDIT_LOG=".claude/bash-audit.log"
AUDIT_STATUS="WARN"
if [ "$BYPASSED" = "1" ]; then
  AUDIT_STATUS="BYPASS"
fi
TRIMMED_ONE_LINE=$(printf '%s' "$TRIMMED" | tr '\n\t\r' ' ' | sed -E 's/  +/ /g')
printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$AUDIT_STATUS" "$TRIMMED_ONE_LINE" >> "$AUDIT_LOG" 2>/dev/null || true

# If agent acknowledged with # mcp-ok, allow silently.
if [ "$BYPASSED" = "1" ]; then
  exit 0
fi

# Emit warning to stdout — Claude Code injects PreToolUse stdout into the
# agent's context before the tool executes, so Claude sees this warning.
# The command still runs (exit 0).
cat <<EOF
[MCP-FIRST WARNING] \`$BAD\` has MCP-first alternatives — check for an MCP tool before using Bash.

  Preferred: $REPLACEMENT

  Command running: $TRIMMED

  If you have already verified that no MCP tool covers this case, add \`# mcp-ok\` to suppress this warning and mark it for the gap audit:
    $TRIMMED  # mcp-ok: <brief reason>
EOF
exit 0
