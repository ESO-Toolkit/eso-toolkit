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
 * before either side can ship the mismatch.
 *
 * Usage: VITE_DISCORD_CLIENT_ID=<id> node scripts/check-oauth-client-id.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WRANGLER_TOML = join(dirname(dirname(fileURLToPath(import.meta.url))), 'wrangler.toml');
const SNOWFLAKE = /^\d{17,20}$/;

function fail(message) {
  // Workflow commands are line-oriented, and this message can quote a value
  // that came from the environment. Collapse newlines so a crafted variable
  // cannot emit a second ::command:: line of its own.
  const oneLine = message.replace(/\s*[\r\n]+\s*/g, ' ');
  console.error(`::error file=discord-bot/wrangler.toml::${oneLine}`);
  process.exit(1);
}

/**
 * Read a key from the top-level `[vars]` table only.
 *
 * The scoping matters: an unscoped search is satisfied by a value under
 * `[env.staging.vars]`, or any other table that happens to carry the same key,
 * which is not what the deployed Worker reads. Comments and blank lines are
 * skipped, and a trailing `#` comment on the value line is tolerated.
 */
function readTopLevelVar(toml, key) {
  let inVars = false;
  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      inVars = line === '[vars]';
      continue;
    }
    if (!inVars) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== key) continue;
    const value = line.slice(eq + 1).match(/^\s*"([^"]*)"/);
    if (value) return value[1];
  }
  return null;
}

const workerClientId = readTopLevelVar(readFileSync(WRANGLER_TOML, 'utf8'), 'DISCORD_OAUTH_CLIENT_ID');
const siteClientId = (process.env.VITE_DISCORD_CLIENT_ID ?? '').trim();

if (workerClientId === null) {
  fail(
    'DISCORD_OAUTH_CLIENT_ID is not declared in the top-level [vars] table of ' +
      'discord-bot/wrangler.toml. It is a public client id and must stay checked in so it can ' +
      'be verified against the site.',
  );
}

if (!SNOWFLAKE.test(workerClientId)) {
  fail(`DISCORD_OAUTH_CLIENT_ID is not a Discord snowflake: "${workerClientId}".`);
}

if (!siteClientId) {
  fail(
    'VITE_DISCORD_CLIENT_ID is not set, so the Worker OAuth client cannot be checked against ' +
      'the site. Set it as a repository variable and pass it to this step.',
  );
}

if (!SNOWFLAKE.test(siteClientId)) {
  fail(`VITE_DISCORD_CLIENT_ID is not a Discord snowflake: "${siteClientId}".`);
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
