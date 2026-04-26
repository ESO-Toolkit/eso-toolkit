#!/usr/bin/env node

/**
 * Start the Vite development server in HTTPS mode.
 *
 * Usage:
 *   node scripts/dev-https.cjs            # HTTPS on port 3001, HTTP proxy on 3000
 *   PORT=3002 node scripts/dev-https.cjs  # HTTPS on port 3003, HTTP proxy on 3002
 *
 * What this does:
 *   1. Generates the version.json file (same as `npm run dev`).
 *   2. Spawns Vite with VITE_HTTPS=true so vite.config.mjs enables mkcert + the
 *      HTTP→HTTPS reverse-proxy that also serves the CA-cert install page.
 *
 * Port allocation (mirrors the worktree port table in CLAUDE.md):
 *   The HTTP proxy binds to PORT (even).
 *   Vite HTTPS binds to PORT + 1 (odd).
 *   Default PORT is 3000, yielding HTTP :3000 → HTTPS :3001.
 */

'use strict';

const { execFileSync, spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

// ── 1. Generate version.json (same step as `npm run dev`) ─────────────────────
try {
  execFileSync(process.execPath, [path.join(__dirname, 'generate-version.cjs')], {
    cwd: root,
    stdio: 'inherit',
  });
} catch (err) {
  console.error('Failed to generate version:', err.message);
  process.exit(1);
}

// ── 2. Resolve the HTTP proxy port from the environment ───────────────────────
const rawPort = process.env.PORT || '3000';
const parsedPort = Number.parseInt(rawPort, 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

console.info(
  `\n  Starting HTTPS dev server — HTTP proxy :${port} → HTTPS :${port + 1}\n`,
);

// ── 3. Spawn Vite with VITE_HTTPS=true ────────────────────────────────────────
const env = {
  ...process.env,
  VITE_HTTPS: 'true',
  PORT: String(port),
};

// Resolve the vite binary from the local node_modules
const viteBin = path.join(root, 'node_modules', '.bin', 'vite');

const child = spawn(viteBin, [], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32', // required on Windows to find .cmd shims
});

child.on('error', (err) => {
  console.error('Failed to start Vite:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

// Forward SIGINT / SIGTERM so the child process can clean up
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
