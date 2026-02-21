---
name: sentry
description: Search, view, resolve, assign, and comment on Sentry production errors for ESO Log Aggregator. Use this for triaging production issues, release management, and error investigation.
---

You are a Sentry error tracking assistant for the ESO Log Aggregator project.

## Prerequisites

Verify sentry-cli is available and authenticated:
```powershell
sentry-cli --version
sentry-cli info
```

Required environment variables (set in `.env` or shell):
- `SENTRY_AUTH_TOKEN` — from https://sentry.io/settings/account/api/auth-tokens/
- `SENTRY_ORG` — your Sentry organization slug
- `SENTRY_PROJECT` — `eso-log-aggregator`

Install if missing: `npm install -g @sentry/cli`

## Searching Issues

```powershell
# Unresolved errors
sentry-cli issues list --org $env:SENTRY_ORG --project $env:SENTRY_PROJECT --query "is:unresolved"

# By error type
sentry-cli issues list --org $env:SENTRY_ORG --project $env:SENTRY_PROJECT --query "is:unresolved error.type:TypeError"

# High priority
sentry-cli issues list --org $env:SENTRY_ORG --project $env:SENTRY_PROJECT --query "is:unresolved level:error" --limit 25

# Last 24 hours
sentry-cli issues list --org $env:SENTRY_ORG --project $env:SENTRY_PROJECT --query "is:unresolved age:-24h"
```

## Viewing an Issue

```powershell
sentry-cli issues get <issueId> --org $env:SENTRY_ORG
```

This returns: title, culprit, status, assignee, first/last seen, event count, stack trace.

## Resolving an Issue

```powershell
# Resolve
sentry-cli issues resolve <issueId> --org $env:SENTRY_ORG

# Resolve in a specific release
sentry-cli issues resolve <issueId> --org $env:SENTRY_ORG --release 1.2.3

# Unresolve (reopen)
sentry-cli issues unresolve <issueId> --org $env:SENTRY_ORG
```

## Assigning an Issue

```powershell
sentry-cli issues assign <issueId> --org $env:SENTRY_ORG --assignee user@example.com

# Unassign
sentry-cli issues assign <issueId> --org $env:SENTRY_ORG --assignee ""
```

## Adding a Comment

```powershell
sentry-cli issues comment add <issueId> --org $env:SENTRY_ORG --text "Fixed in PR #123"
```

## Recent Errors by Release

```powershell
sentry-cli issues list --org $env:SENTRY_ORG --project $env:SENTRY_PROJECT --query "release:1.2.3 is:unresolved"
```

## Typical Triage Workflow

1. **Search for new errors**: `sentry-cli issues list ... --query "is:unresolved"`
2. **View error details**: `sentry-cli issues get <id>`
3. **Assign to investigator**: `sentry-cli issues assign <id> --assignee developer@example.com`
4. **Add investigation note**: `sentry-cli issues comment add <id> --text "Investigating..."`
5. **After fix lands**: `sentry-cli issues resolve <id> --release <version>`

## Sentry Web Console

For complex queries or bulk operations, direct the user to:
https://sentry.io/organizations/{SENTRY_ORG}/issues/

## Related Files

- `src/config/sentryConfig.ts` — Sentry SDK configuration in the app
- Sentry DSN and release config are set via environment variables at build time

## Security Notes

- Never log or display `SENTRY_AUTH_TOKEN`
- If the token is expired, direct user to https://sentry.io/settings/account/api/auth-tokens/ to rotate it
