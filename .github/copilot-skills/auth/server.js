#!/usr/bin/env node

/**
 * Auth MCP Server
 *
 * Provides tools for authenticating MCP browser sessions with
 * ESO Logs OAuth. Handles token generation, localStorage injection
 * scripts, and auth state management.
 *
 * Tools:
 *   - generate_oauth_token: Generate a fresh OAuth access token
 *   - get_auth_script: Get a JavaScript snippet to inject auth into a browser session
 *   - check_auth_state: Check if tests/auth-state.json exists and is valid
 *   - get_localstorage_keys: List all localStorage keys the app uses for auth
 *
 * @module eso-log-aggregator-auth-skill
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import { config } from 'dotenv';

const PROJECT_ROOT = process.cwd();
const AUTH_STATE_PATH = resolve(PROJECT_ROOT, 'tests/auth-state.json');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');

// Load .env
config({ path: ENV_PATH });

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[Auth Skill]', new Date().toISOString(), ...args);
}

// ── localStorage keys reference ───────────────────────────────────────

const LOCALSTORAGE_KEYS = [
  { key: 'access_token', description: 'JWT access token from ESO Logs OAuth', required: true },
  { key: 'authenticated', description: 'Boolean flag indicating auth status', required: false, recommended: true },
  { key: 'access_token_refreshed_at', description: 'Timestamp of last token refresh', required: false, recommended: true },
  { key: 'access_token_expires_at', description: 'Token expiration timestamp (if known)', required: false },
  { key: 'refresh_token', description: 'OAuth refresh token (if available)', required: false },
];

// ── Tool implementations ──────────────────────────────────────────────

async function generateOAuthToken() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'OAuth credentials not found',
      message: 'OAUTH_CLIENT_ID and/or OAUTH_CLIENT_SECRET not set in .env file.',
      envPath: relative(PROJECT_ROOT, ENV_PATH),
      suggestion: 'Add OAUTH_CLIENT_ID=<your_id> and OAUTH_CLIENT_SECRET=<your_secret> to your .env file.',
    };
  }

  log('Requesting OAuth token from ESO Logs...');

  try {
    const response = await fetch('https://www.esologs.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Token request failed: ${response.status} ${response.statusText}`,
        details: errorText,
        suggestion: 'Check that OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env are valid.',
      };
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      message: 'Token generated successfully. Use get_auth_script to get the browser injection code.',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: 'Check network connectivity and that https://www.esologs.com/oauth/token is accessible.',
    };
  }
}

function getAuthScript(token) {
  if (!token) {
    return {
      error: 'No token provided',
      suggestion: 'Generate a token first using generate_oauth_token, then pass it here.',
    };
  }

  const now = Date.now();
  const expiresIn = 3600; // Default 1 hour

  const script = `
// ESO Log Aggregator Auth Injection
// Paste this in the browser console or use with mcp_microsoft_pla_browser_evaluate
(function() {
  const token = ${JSON.stringify(token)};
  const now = ${now};
  
  localStorage.setItem('access_token', token);
  localStorage.setItem('authenticated', 'true');
  localStorage.setItem('access_token_refreshed_at', String(now));
  localStorage.setItem('access_token_expires_at', String(now + ${expiresIn * 1000}));
  
  // Trigger storage event to notify the app
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'access_token',
      newValue: token,
      storageArea: localStorage,
    })
  );
  
  console.log('✅ Authentication injected successfully');
  return { success: true, expiresAt: new Date(now + ${expiresIn * 1000}).toISOString() };
})();
`.trim();

  return {
    script,
    usage: [
      'Step 1: Navigate to the app with mcp_microsoft_pla_browser_navigate({ url: "http://localhost:5173" })',
      'Step 2: Execute this script with mcp_microsoft_pla_browser_evaluate({ expression: <script> })',
      'Step 3: Reload the page to activate authentication',
    ],
    tokenPreview: token.substring(0, 20) + '...',
  };
}

function checkAuthState() {
  if (!existsSync(AUTH_STATE_PATH)) {
    return {
      exists: false,
      path: relative(PROJECT_ROOT, AUTH_STATE_PATH),
      message: 'No auth-state.json found. Run Playwright tests once or generate a fresh token.',
      suggestion: 'Use generate_oauth_token to create a new token, or run: npx playwright test --config=playwright.smoke.config.ts',
    };
  }

  try {
    const content = readFileSync(AUTH_STATE_PATH, 'utf8');
    const authState = JSON.parse(content);

    // Check if it contains localStorage with access_token
    const origins = authState.origins || [];
    let tokenFound = false;
    let tokenValue = null;

    for (const origin of origins) {
      const storage = origin.localStorage || [];
      for (const item of storage) {
        if (item.name === 'access_token' && item.value) {
          tokenFound = true;
          tokenValue = item.value;
        }
      }
    }

    // Try to decode JWT to check expiration
    let tokenInfo = null;
    if (tokenValue) {
      try {
        const parts = tokenValue.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          tokenInfo = {
            issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
            expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            isExpired: payload.exp ? Date.now() > payload.exp * 1000 : null,
          };
        }
      } catch {
        tokenInfo = { parseError: 'Could not decode JWT payload' };
      }
    }

    return {
      exists: true,
      path: relative(PROJECT_ROOT, AUTH_STATE_PATH),
      hasToken: tokenFound,
      tokenInfo,
      originsCount: origins.length,
      message: tokenFound
        ? (tokenInfo?.isExpired
          ? 'Auth state exists but token is expired. Generate a fresh token.'
          : 'Auth state exists with valid token.')
        : 'Auth state file exists but no access_token found in localStorage.',
    };
  } catch (error) {
    return {
      exists: true,
      path: relative(PROJECT_ROOT, AUTH_STATE_PATH),
      error: `Failed to parse auth state: ${error.message}`,
    };
  }
}

function getLocalStorageKeys() {
  return {
    keys: LOCALSTORAGE_KEYS,
    minimalAuth: 'Only access_token is strictly required. Set it and reload the page.',
    fullAuth: 'For complete auth compatibility, set access_token, authenticated, and access_token_refreshed_at.',
    references: {
      authContext: 'src/features/auth/AuthContext.tsx',
      globalSetup: 'tests/global-setup.ts',
      authUtils: 'tests/auth-utils.ts',
    },
  };
}

// ── MCP Server setup ──────────────────────────────────────────────────

const server = new Server(
  { name: 'eso-log-aggregator-auth', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_oauth_token',
      description:
        'Generate a fresh OAuth access token from ESO Logs using client credentials ' +
        'from .env. Returns the token for use with get_auth_script or direct injection.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_auth_script',
      description:
        'Get a JavaScript snippet that injects an OAuth token into the browser localStorage. ' +
        'Use with mcp_microsoft_pla_browser_evaluate to authenticate MCP browser sessions.',
      inputSchema: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'The OAuth access token to inject. Get one from generate_oauth_token.',
          },
        },
        required: ['token'],
      },
    },
    {
      name: 'check_auth_state',
      description:
        'Check if tests/auth-state.json exists, contains a valid token, and whether ' +
        'the token is expired. Useful before deciding whether to generate a fresh token.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_localstorage_keys',
      description:
        'List all localStorage keys the ESO Log Aggregator app uses for authentication, ' +
        'with descriptions and whether each is required. Also lists reference source files.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'generate_oauth_token':
        result = await generateOAuthToken();
        break;
      case 'get_auth_script':
        result = getAuthScript(args?.token);
        break;
      case 'check_auth_state':
        result = checkAuthState();
        break;
      case 'get_localstorage_keys':
        result = getLocalStorageKeys();
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Error: ${error.message}\n\n${error.stack || ''}` },
      ],
      isError: true,
    };
  }
});

// ── Start server ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
