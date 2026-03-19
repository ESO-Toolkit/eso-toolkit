---
name: rollbar
description: Search, view, resolve, assign, and comment on Rollbar production errors for ESO Log Aggregator. Use this for triaging production issues, release management, and error investigation.
---

You are a Rollbar error tracking assistant for the ESO Log Aggregator project.

## Prerequisites

Verify you have a Rollbar server-side access token available.

Required environment variable (set in `.env` or shell):
- `ROLLBAR_SERVER_TOKEN` — `post_server_item` or `read` token from https://rollbar.com/settings/accounts/

## Searching Items (Errors)

Rollbar uses a REST API. Use PowerShell `Invoke-RestMethod` to query items.

```powershell
$token = $env:ROLLBAR_SERVER_TOKEN

# All active (unresolved) errors
Invoke-RestMethod "https://api.rollbar.com/api/1/items?access_token=$token&status=active&level=error" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty items |
  Select-Object id, title, level, status, last_occurrence_timestamp, total_occurrences

# Filter by error type (title contains)
Invoke-RestMethod "https://api.rollbar.com/api/1/items?access_token=$token&status=active&query=TypeError" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty items |
  Select-Object id, title, level, status, total_occurrences

# Most frequent errors
Invoke-RestMethod "https://api.rollbar.com/api/1/items?access_token=$token&status=active" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty items |
  Sort-Object total_occurrences -Descending | Select-Object -First 25 |
  Select-Object id, title, total_occurrences, last_occurrence_timestamp
```

## Viewing an Item

```powershell
$token = $env:ROLLBAR_SERVER_TOKEN
$itemId = 12345  # numeric Rollbar item ID

Invoke-RestMethod "https://api.rollbar.com/api/1/item/$itemId?access_token=$token" |
  Select-Object -ExpandProperty result
```

Returns: title, level, status, first_occurrence_timestamp, last_occurrence_timestamp, total_occurrences, environment.

## Viewing Occurrences (Stack Traces)

```powershell
$token = $env:ROLLBAR_SERVER_TOKEN
$itemId = 12345

# List recent occurrences
Invoke-RestMethod "https://api.rollbar.com/api/1/item/$itemId/instances?access_token=$token" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty instances |
  Select-Object id, timestamp | Select-Object -First 5

# View a specific occurrence (with full stack trace)
$occurrenceId = "abc123"
Invoke-RestMethod "https://api.rollbar.com/api/1/instance/$occurrenceId?access_token=$token" |
  Select-Object -ExpandProperty result
```

## Resolving an Item

```powershell
$token = $env:ROLLBAR_SERVER_TOKEN
$itemId = 12345

# Resolve
$body = @{ status = "resolved" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "https://api.rollbar.com/api/1/item/$itemId" `
  -Headers @{ "X-Rollbar-Access-Token" = $token; "Content-Type" = "application/json" } `
  -Body $body

# Mute (suppress)
$body = @{ status = "muted" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "https://api.rollbar.com/api/1/item/$itemId" `
  -Headers @{ "X-Rollbar-Access-Token" = $token; "Content-Type" = "application/json" } `
  -Body $body

# Reopen
$body = @{ status = "active" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "https://api.rollbar.com/api/1/item/$itemId" `
  -Headers @{ "X-Rollbar-Access-Token" = $token; "Content-Type" = "application/json" } `
  -Body $body
```

## Errors by Environment / Release

```powershell
$token = $env:ROLLBAR_SERVER_TOKEN

# Filter by environment
Invoke-RestMethod "https://api.rollbar.com/api/1/items?access_token=$token&status=active&environment=production" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty items |
  Select-Object id, title, total_occurrences

# Filter by code version
Invoke-RestMethod "https://api.rollbar.com/api/1/items?access_token=$token&status=active&code_version=1.2.3" |
  Select-Object -ExpandProperty result | Select-Object -ExpandProperty items
```

## Typical Triage Workflow

1. **Search for new errors**: Query items with `status=active`
2. **View error details**: `GET /api/1/item/<id>`
3. **Check stack trace**: `GET /api/1/item/<id>/instances` then `GET /api/1/instance/<occurrenceId>`
4. **After fix lands**: PATCH item with `status = "resolved"`

## Rollbar Web Console

For complex queries or bulk operations, direct the user to:
https://rollbar.com/eso-log-aggregator/

## Related Files

- `src/config/errorTrackingConfig.ts` — Rollbar SDK configuration in the app
- `src/utils/errorTracking.ts` — `initializeErrorTracking()`, `reportError()`, `setUserContext()`
- Token is set via `ERROR_TRACKING_TOKEN` environment variable at build time

## Security Notes

- Never log or display `ROLLBAR_SERVER_TOKEN`
- If the token is expired, direct user to https://rollbar.com/settings/accounts/ to rotate it
