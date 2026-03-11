# ESO Toolkit Discord Bot

A production-grade Discord ticket bot deployed as a Cloudflare Worker. Handles support tickets with AI-powered categorisation, GitHub issue creation, and a full ticket lifecycle (open → claim → close → transcript).

---

## Architecture

```
User clicks panel button
  → Discord sends HTTP POST to Cloudflare Worker
  → Worker verifies Ed25519 signature
  → Worker shows modal
  → User submits modal
  → Worker defers response, then in waitUntil:
      - Creates private Discord channel
      - Calls Z.AI GLM-5 for classification
      - Creates GitHub Issue (bug reports)
      - Posts ticket embed with action buttons
  → Staff claim / close the ticket
  → On close: saves transcript to #ticket-logs, deletes channel
```

**No WebSocket / persistent server.** Everything runs on Cloudflare's edge inside individual HTTP request lifetimes, with `waitUntil` for background work.

---

## Prerequisites

- **Cloudflare account** with Workers and KV enabled
- **Discord Developer Portal** application with a bot user
- **GitHub token** with `repo` scope (for issue creation)
- **Z.AI API key** (GLM-5 access)
- **Node.js 18+** and **npm** installed locally
- **Wrangler CLI** (installed via `npm install` in this repo)

---

## Setup Guide

### 1. Create a Discord Application

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name (e.g. "ESO Toolkit Bot")
3. Go to **General Information** — copy the **Application ID** (`DISCORD_APPLICATION_ID`)
4. Go to **Bot** → click **Add Bot** → copy the **Token** (`DISCORD_BOT_TOKEN`)
5. On the **Bot** page, enable:
   - **Server Members Intent**
   - **Message Content Intent** (needed for transcript fetching)
6. Go to **General Information** → copy the **Public Key** (`DISCORD_PUBLIC_KEY`)

### 2. Create a Cloudflare KV Namespace

```bash
npx wrangler kv:namespace create TICKETS
```

This prints something like:

```
{ binding = "TICKETS", id = "abc123def456..." }
```

Copy the `id` value and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TICKETS"
id = "abc123def456..."   # ← replace this
```

Optionally create a preview namespace for local dev:

```bash
npx wrangler kv:namespace create TICKETS --preview
```

### 3. Install Dependencies

```bash
cd discord-bot
npm install
```

### 4. Set Cloudflare Secrets

These values are sensitive and must not be committed to source control. Use `wrangler secret put` to store them encrypted in Cloudflare:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
# Paste your Discord app's public key when prompted

npx wrangler secret put DISCORD_BOT_TOKEN
# Paste your Discord bot token when prompted

npx wrangler secret put DISCORD_APPLICATION_ID
# Paste your Discord application ID when prompted

npx wrangler secret put GITHUB_TOKEN
# Paste your GitHub personal access token (needs `repo` scope)

npx wrangler secret put ZAI_API_KEY
# Paste your Z.AI API key when prompted
```

Non-sensitive config is already hardcoded in `wrangler.toml` under `[vars]`:

```toml
[vars]
GUILD_ID = "1375703719995244686"
TICKET_CATEGORY_ID = "1480845135733588083"
TICKET_LOGS_CHANNEL_ID = "1480845163277586534"
PANEL_CHANNEL_ID = "1480845158584025148"
GITHUB_OWNER = "ESO-Toolkit"
GITHUB_REPO = "eso-toolkit"
```

### 5. Deploy the Worker

```bash
npm run deploy
```

Wrangler will print the Worker URL, e.g.:

```
https://eso-toolkit-discord-bot.<your-subdomain>.workers.dev
```

### 6. Set the Interactions Endpoint URL

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications) → your app
2. Go to **General Information**
3. Under **Interactions Endpoint URL**, paste your Worker URL:
   ```
   https://eso-toolkit-discord-bot.<your-subdomain>.workers.dev
   ```
4. Click **Save Changes**

Discord will send a `PING` to verify the endpoint. The Worker must respond with `{"type":1}` — it does this automatically.

### 7. Invite the Bot to Your Server

Build the OAuth2 invite URL with the required permissions:

```
https://discord.com/api/oauth2/authorize
  ?client_id=YOUR_APPLICATION_ID
  &permissions=125968
  &scope=bot%20applications.commands
```

**Required permissions (decimal: `125968`):**

| Permission | Why |
|---|---|
| Manage Channels | Create and delete ticket channels |
| Send Messages | Post ticket embeds and transcripts |
| Read Message History | Fetch messages for transcripts |
| Manage Messages | (Optional) For future moderation features |
| Embed Links | Rich embeds in ticket channels |
| Attach Files | Transcripts as file attachments if needed |

**Permissions calculator URL (pre-filled):**

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=125968&scope=bot%20applications.commands
```

Replace `YOUR_APPLICATION_ID` with your Discord Application ID.

### 8. Register Slash Commands

```bash
npm run register
```

This calls `scripts/register-commands.js` which registers `/ticket` (with subcommands: `setup`, `close`, `add`, `remove`) as a guild command (instant propagation) by default.

**Environment variables for the script:**

```bash
DISCORD_BOT_TOKEN=your_bot_token \
DISCORD_APPLICATION_ID=your_app_id \
DISCORD_GUILD_ID=1375703719995244686 \
npm run register
```

Or export them first:

```bash
export DISCORD_BOT_TOKEN="your_token"
export DISCORD_APPLICATION_ID="your_app_id"
npm run register
```

To register globally (takes up to 1 hour to propagate), omit `DISCORD_GUILD_ID`. Note: if you set `DISCORD_GUILD_ID` (as shown in the example above), commands are registered as guild commands for instant propagation — omitting it truly registers globally.

### 9. Post the Ticket Panel

```bash
DISCORD_BOT_TOKEN=your_bot_token npm run panel
```

This posts the panel embed (with Bug / Feature / Feedback buttons) to `#create-ticket`. You can also run `/ticket setup` from Discord if you prefer.

---

## Usage

### For Users

1. Go to `#create-ticket`
2. Click the appropriate button (Bug Report / Feature Request / General Feedback)
3. Fill in the modal form (title + description)
4. A private ticket channel is created automatically

### For Staff

Inside a ticket channel:

- **Claim button** — assigns the ticket to you, updates the embed status
- **Close button** — prompts for confirmation, then saves a transcript to `#ticket-logs` and deletes the channel
- `/ticket close [reason]` — same as the Close button, with an optional reason
- `/ticket add @user` — grants a user access to the ticket channel
- `/ticket remove @user` — removes a user's access

---

## Local Development

```bash
npm run dev
```

Wrangler starts a local dev server. For testing interactions, you need to expose it publicly:

```bash
npx cloudflare tunnel --url http://localhost:8787
```

Then update the Interactions Endpoint URL in Discord to the tunnel URL temporarily.

---

## File Structure

```
discord-bot/
  src/
    index.ts              Worker entry: signature verification + router
    types.ts              All TypeScript interfaces and constants
    verify.ts             Ed25519 signature verification (Web Crypto API)
    discord.ts            Discord REST API client
    github.ts             GitHub Issues creation
    ai.ts                 Z.AI GLM-5 ticket classification
    kv.ts                 KV storage helpers
    handlers/
      commands.ts         Slash command router
      buttons.ts          Button interaction router
      modals.ts           Modal submission router
    commands/
      ticket-setup.ts     /ticket setup handler
      ticket-close.ts     /ticket close handler
      ticket-add.ts       /ticket add handler
      ticket-remove.ts    /ticket remove handler
    buttons/
      create-ticket.ts    Panel button → show modal
      claim.ts            Claim button handler
      close.ts            Close button → confirmation prompt
      confirm-close.ts    Confirm close → transcript + delete channel
    modals/
      ticket-form.ts      Modal submission → full ticket creation pipeline
  scripts/
    register-commands.js  One-time command registration
    setup-panel.js        One-time panel posting
  wrangler.toml
  package.json
  tsconfig.json
  README.md
```

---

## KV Schema

```
ticket:{channelId}  →  JSON TicketState object
ticket-counter      →  string (auto-incrementing integer)
```

`TicketState` fields: `id`, `channelId`, `userId`, `username`, `category`, `title`, `description`, `status`, `claimedBy`, `claimedByUsername`, `githubIssueNumber`, `githubIssueUrl`, `aiSummary`, `aiPriority`, `aiRefinedCategory`, `embedMessageId`, `createdAt`.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Discord shows "This interaction failed" | Check Worker logs in Cloudflare dashboard. Usually a missing env secret. |
| Signature verification fails | Ensure `DISCORD_PUBLIC_KEY` secret is set to the exact hex string from Discord. |
| Commands not appearing | Run `npm run register`. Guild commands appear instantly; global takes up to 1 hour. |
| Bot can't create channels | Ensure bot has **Manage Channels** permission and is above restricted roles in hierarchy. |
| GitHub issues not created | Verify `GITHUB_TOKEN` has `repo` scope and the repo exists. |
| AI summary shows "pending" | Check `ZAI_API_KEY` is set and Z.AI API is reachable from Cloudflare Workers. |
| KV errors | Confirm `TICKETS` KV namespace ID is set correctly in `wrangler.toml`. |

---

## Security Notes

- All Discord requests are verified using Ed25519 (Web Crypto API) before any processing
- Secrets are stored encrypted in Cloudflare — never in `wrangler.toml`
- The `@everyone` role is explicitly denied `VIEW_CHANNEL` on all ticket channels
- Only the ticket creator and roles with `MANAGE_CHANNELS` gain channel access
- The `/ticket setup` command requires the `Administrator` Discord permission
