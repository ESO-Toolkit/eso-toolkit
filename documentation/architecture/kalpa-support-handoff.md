# Kalpa authenticated support handoff

Status: implemented on feature branches (2026-08-28)

## Decision

Kalpa prepares the privacy-safe report and opens a hosted ESO Toolkit support page. The report travels in the URL fragment, which the page immediately moves into tab-scoped `sessionStorage` and removes from browser history. The desktop app never receives a Discord token and never supplies a Discord user ID.

The hosted page displays the exact report again and requires an explicit Create ticket action. The route is statically prerendered and marked `noindex`; this is a security requirement because the site's GitHub Pages 404 redirect otherwise converts fragments into query parameters. If needed, the page uses the existing Discord OAuth authorization-code flow (`identify guilds`) and returns to the support page.

The browser first exchanges its Discord bearer token for a short-lived, audience-bound support session. The Worker resolves `/oauth2/@me` from the Discord token, verifies that the token belongs to the configured Discord application and includes the expected scopes, verifies the resulting user is still a member of the configured support guild with the bot token, and returns a 10-minute HMAC-signed support token. Ticket creation accepts only that support token, validates and renders the structured report again, and calls the same ticket service and permission-overwrite builder used by Discord interaction tickets. The response distinguishes a created ticket from a prepared report and includes a direct Discord channel URL only after channel creation, ticket persistence, and the initial report message succeed.

This hosted handoff is preferred over a direct Tauri-to-Worker API. It keeps OAuth tokens and identity handling out of Kalpa, avoids trusting client identity fields, reuses the registered web callback, and lets the Worker restrict CORS to ESO Toolkit web origins rather than adding a broad or spoofable desktop origin.

## User and interaction model

Visual thesis: one restrained handoff surface, with the exact report as the dominant trust artifact and no dashboard or decorative card grid.

Content order: problem category and description; exact disclosure and privacy notice; consent; Discord authentication and ticket creation; explicit result or preserved-report fallback.

Interaction thesis: ticket creation is always an intentional final action after review. Authentication may interrupt the flow, but the tab-scoped draft and idempotency key survive the redirect. Status changes use an `aria-live` region, focus moves to actionable errors/results, controls remain usable at compact widths, and duplicate clicks are disabled locally and rejected safely server-side.

## API contract

`POST /discord/support/kalpa/session`

Required headers are the Discord OAuth bearer token and an exact configured ESO Toolkit `Origin`. The endpoint applies an IP rate limit before calling Discord, derives the token's application, scopes, and identity from `/oauth2/@me`, rejects tokens minted for another application, verifies fixed-guild membership with the bot token, and returns `{ "token": "...", "expiresAt": "<ISO timestamp>" }`. Authentication, membership, rate-limit, and Discord failures use the structured error codes documented below.

`POST /discord/support/kalpa/tickets`

Required headers:

- `Authorization: Bearer <short-lived support session token>`
- `Idempotency-Key: <32-128 character opaque value>`
- `Content-Type: application/json`
- `Origin`: an exact configured ESO Toolkit web origin

Request body (maximum 8 KiB before parsing):

```json
{
  "payload": {
    "version": 2,
    "issueId": "addon-status|install-update|addon-folder|backups-data|log-upload|other",
    "description": "optional user description, maximum 500 characters",
    "appVersion": "bounded display version",
    "platform": "windows|macos|linux",
    "environment": {
      "osVersion": "digits-and-dots OS product/build, or \"unknown\"",
      "arch": "allow-listed CPU architecture, or \"unknown\"",
      "tauri": "bounded Tauri runtime version, or \"unknown\"",
      "webview": "\"Chromium <major>\" | \"WebKit <major>\" | \"unknown\""
    },
    "generatedAt": "bounded ISO-8601 timestamp",
    "connection": "online|offline",
    "updateState": "checking|complete",
    "instanceLabel": "bounded display label, never a path",
    "diagnostics": {
      "addons": 0,
      "libraries": 0,
      "disabled": 0,
      "checked": 0,
      "updates": 0,
      "dependencyWarnings": 0,
      "modified": 0,
      "lastError": "optional bounded, redacted display error",
      "attention": [
        {
          "name": "bounded display-only addon name",
          "folder": "bounded addon folder name, never a path",
          "currentVersion": "bounded display version or null",
          "availableVersion": "bounded display version or null",
          "missingDependencies": 0,
          "outdatedDependencies": 0,
          "modifiedFiles": 0
        }
      ]
    }
  }
}
```

### Report version 2: allow-listed environment

Version 2 adds one nested `environment` object. Every field earns its place in triage and none of them singles a person out:

| Field | Why support needs it | Bound |
| --- | --- | --- |
| `osVersion` | Windows feature builds change Controlled Folder Access, SmartScreen, and WebView2 behaviour; macOS and Linux releases change permission prompts. Most "the install silently failed" reports are resolved by the build number alone. | Digits and dots, at most four components. Anything else — an edition string, a machine name, a path — becomes `unknown`. |
| `arch` | Separates the x86_64 and aarch64 builds, and on macOS separates a native Apple-silicon run from a Rosetta one. | Fixed allow-list of the architectures Tauri's os plugin reports. |
| `tauri` | Pins which bundled windowing, opener, and updater behaviour is in play for a given report. | Bounded semver shape with an optional pre-release tag. |
| `webview` | WebView2 and WebKit majors drive the CSS, clipboard, and dialog differences behind most "it looks wrong" reports. | Engine name plus **major only**, so the value is shared by millions of installs rather than identifying one. |

Collection failures produce `unknown` rather than a guess. The client normalizes before display, and the Worker and hosted page normalize again independently — a client cannot smuggle an unbounded value through by claiming it is an OS version.

Deliberately never collected, and rejected by the allow-listed schema on both servers: hostname or computer name, user or home-directory name, hardware or device IDs, serial numbers, MAC or IP addresses, Discord or account IDs in the report, locale, environment-variable dumps, tokens, credentials, cookies, SavedVariables, combat-log contents, raw files, and full local paths.

Version 1 (no `environment` key) is still parsed and rendered so a report prepared by an older client is not lost, but the environment section is omitted for it: rendering a section the user never reviewed in Kalpa would break the exact-review guarantee. The two versions are mutually exclusive — a version-1 payload carrying an `environment` key, or a version-2 payload missing one, is rejected. Both repositories share the same fixture file, which carries one case per version.

Kalpa, the hosted page, and the Worker use the same versioned canonical rendering rules and cross-repository fixtures. The canonical report is capped at Discord-safe message limits (1,950 characters) after every section, including attention rows. The fragment carries only the structured payload, uses the bare `https://esotk.com/kalpa/support#kalpa=` origin, and is rejected above 8 KiB; it does not carry a separately trusted free-form report.

The service accepts no user ID, guild ID, channel ID, permission overwrite, or staff role input.

Success (`201`, or `200` for a replayed completed request):

```json
{
  "status": "created",
  "requestId": "opaque audit correlation ID",
  "ticketId": "0123",
  "channelId": "Discord snowflake",
  "channelUrl": "https://discord.com/channels/<configured guild>/<created channel>",
  "duplicate": false
}
```

Errors are structured as `{ "requestId": "...", "error": { "code": "...", "message": "safe user-facing text", "retryable": true|false } }`. Codes are `AUTH_REQUIRED`, `AUTH_EXPIRED`, `NOT_A_MEMBER`, `RATE_LIMITED`, `INVALID_REQUEST`, `IDEMPOTENCY_CONFLICT`, `DISCORD_UNAVAILABLE`, `TICKET_RECOVERING`, and `INTERNAL_ERROR`. No diagnostic content appears in logs or error responses.

## Trust boundaries and controls

1. **Kalpa process to default browser.** The report is already locally redacted and capped. The fragment prevents it from appearing in HTTP requests and ordinary referrers. The web page parses it synchronously, validates it, saves it only in `sessionStorage`, and replaces the URL before rendering. Invalid or oversized fragments are rejected without network submission.
2. **Browser to OAuth provider.** A cryptographically random state value binds the authorization response. Discord access tokens stay in tab-scoped storage and are never sent to Kalpa. Cancellation/expiry returns to a preserved draft and manual fallback.
3. **Browser to Worker.** Exact production and development origin allowlists apply; no wildcard. Missing or invalid origins are rejected before rate, authentication, Discord, or persistence side effects. Preflight explicitly permits `Authorization`, `Content-Type`, and `Idempotency-Key`. The session endpoint requires a Discord bearer token; ticket creation requires the narrower support token and an idempotency key. Bodies are capped before JSON parsing.
4. **Worker to Discord user API.** The Worker derives the Discord application, granted scopes, and user ID from `/oauth2/@me`; client-supplied identity is impossible by schema, and a bearer token issued to a different application is rejected. It then independently checks guild membership using the bot credential and configured guild ID.
5. **Worker to ticket service.** The service accepts a server-verified member only. It builds ACLs from the configured guild and its existing staff-role rule. Staff-role discovery fails closed: channel creation does not proceed unless at least one authorized role was resolved. `TicketState.source` distinguishes `discord-modal` from `kalpa`; Kalpa tickets bypass AI and GitHub enrichment. The Kalpa report message uses `allowed_mentions: { parse: [] }` and contains no owner ping.
6. **Durable coordinator.** A single bound and migrated Durable Object instance serializes rate-limit and idempotency decisions globally. Keys are scoped to a keyed HMAC of verified user ID plus the idempotency key; raw access tokens, user IDs, IPs, and report contents are not stored. Completed results are retained for safe replay, pending operations cannot be re-leased to a competing request, and per-user/per-IP attempt windows run before Discord membership calls. Failed operations become explicitly retryable; the service records the channel ID in the coordinator immediately after Discord creates it.
7. **Discord recovery.** The channel topic contains only an opaque HMAC idempotency marker, never report text. Discord channel creation is never blindly retried. On recovery, the coordinator's recorded channel wins; only if that write was interrupted does the service search the configured ticket category for the marker. The first message uses a stable Discord nonce with nonce enforcement. This closes both crash windows without creating a second channel.

## Validation and privacy invariants

- Category is an enum; version, description, report, idempotency key, and total body each have independent byte/character caps.
- Control characters are removed and Discord mentions are neutralized, including `@everyone`, `@here`, user/role/channel mention syntax, and timestamp/command syntax where relevant.
- Server-side defense-in-depth redacts Windows drive and UNC paths, common macOS and Linux absolute paths, token/authorization/cookie patterns, and ESO account identifiers; it also removes non-printing control characters. The allow-listed schema cannot contain attachments, SavedVariables, or raw-file fields, and Kalpa never collects their contents.
- Audit events contain an event name, request ID, optional result code, and—after authentication—a keyed pseudonymous subject hash. Rate state uses keyed network/subject hashes. Neither contains report/description text, access tokens, Discord names, raw IDs, or channel topics.
- The Discord report message explicitly suppresses all automatic mention parsing.

## Abuse, retry, and failure behavior

- The browser creates one idempotency key per draft, disables the Create button while pending, and reuses the same key for retries.
- The coordinator atomically enforces one in-flight operation for a key and bounded user/IP creation attempts. Replays return the original ticket result.
- Transient Discord failures produce a retryable error and retain the report. Authentication/membership errors are non-retryable until the user signs in or joins the guild.
- A confirmed channel plus a failed initial message is reported as `discord_unavailable` only after recovery state is retained; a retry finds and repairs the same channel rather than creating another. Success is authoritative only after channel creation, ticket KV persistence, initial report delivery, and coordinator completion.
- Kalpa retains its local exact-report review, Copy report, and Open ticket desk actions. The hosted page also offers copy/manual desk fallback for offline, OAuth cancellation, membership, Worker, or Discord failures. Neither surface says “ticket created” until the Worker returns a durable created/replayed result.

## Existing Discord modal behavior

The shared ticket service deliberately applies two safety changes to tickets opened from Discord as well as Kalpa: staff-role discovery now fails closed instead of creating a channel that staff may be unable to access, and channel creation is not transport-retried because Discord channel creation has no idempotency key. The existing modal's opening message now explicitly allows only its owner mention, so the ticket owner is notified without permitting role, channel, `@here`, or `@everyone` mentions. These are intentional behavior changes in the existing interaction path and should be called out in release notes.

## Deployment order

1. Configure the Worker-only `SUPPORT_SESSION_SECRET` and `SUPPORT_AUDIT_SECRET`, then deploy the Worker with the Durable Object binding/migration and authenticated endpoints.
2. Deploy the prerendered ESO Toolkit hosted support route and telemetry redaction.
3. Release Kalpa with the new handoff URL.

Until steps 1 and 2 are live, Kalpa continues to expose its current copy-and-open manual workflow.
