#!/usr/bin/env node
/**
 * Fails if the Worker's DISCORD_OAUTH_CLIENT_ID does not equal the site's
 * VITE_DISCORD_CLIENT_ID.
 *
 * Why this exists: this Worker talks to Discord as two applications — the bot
 * (DISCORD_BOT_APPLICATION_ID + DISCORD_BOT_TOKEN) and the website's OAuth
 * client (DISCORD_OAUTH_CLIENT_ID + DISCORD_OAUTH_CLIENT_SECRET). One env var
 * once served both. Because it held the bot, Discord rejected every
 * authorization-code exchange with a 401, which surfaced to users as an expired
 * or invalid login rather than as a misconfiguration, and Discord sign-in was
 * broken in production until someone ran the flow for real.
 *
 * The browser authorizes against VITE_DISCORD_CLIENT_ID, so Discord issues the
 * code and the bearer token against that application. If the Worker's value
 * differs, the exchange cannot succeed and the support session's audience check
 * can never match. Nothing in the type system or the test suite catches that —
 * both values are well-formed snowflakes either way — so it is checked here,
 * before a deploy can ship the mismatch.
 *
 * Usage: VITE_DISCORD_CLIENT_ID=<id> node scripts/check-oauth-client-id.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WRANGLER_TOML = join(dirname(dirname(fileURLToPath(import.meta.url))), 'wrangler.toml');
const SNOWFLAKE = /^\d{17,20}$/;

function fail(message) {
  console.error(`::error file=discord-bot/wrangler.toml::${message}`);
  process.exit(1);
}

const toml = readFileSync(WRANGLER_TOML, 'utf8');
const match = toml.match(/^\s*DISCORD_OAUTH_CLIENT_ID\s*=\s*"([^"]*)"\s*$/m);

if (!match) {
  fail(
    'DISCORD_OAUTH_CLIENT_ID is not declared in [vars] in discord-bot/wrangler.toml. ' +
      'It is a public client id and must stay checked in so it can be verified against the site.',
  );
}

const workerClientId = match[1];
const siteClientId = process.env.VITE_DISCORD_CLIENT_ID ?? '';

if (!SNOWFLAKE.test(workerClientId)) {
  fail(`DISCORD_OAUTH_CLIENT_ID is not a Discord snowflake: "${workerClientId}".`);
}

if (!siteClientId) {
  fail(
    'VITE_DISCORD_CLIENT_ID is not set, so the Worker OAuth client cannot be checked against ' +
      'the site. Set it as a repository variable and pass it to this step.',
  );
}

if (workerClientId !== siteClientId) {
  fail(
    `The Worker signs users in as Discord application ${workerClientId} but the site authorizes ` +
      `against ${siteClientId}. Discord issues the code and bearer token against the site's ` +
      'application, so the token exchange would fail with a 401 and every support session would ' +
      "be rejected. Set both to the website OAuth client (never the bot's application id).",
  );
}

console.log(`Discord OAuth client id matches the site: ${workerClientId}`);
