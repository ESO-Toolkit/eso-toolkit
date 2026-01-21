#!/usr/bin/env node

/**
 * ESO Log Aggregator - Claude Skill (MCP Server)
 * 
 * This MCP server provides tools for Claude to interact with the ESO Log Aggregator
 * application using Playwright, with proper authentication using local tokens.
 * 
 * Tools provided:
 * - run_authenticated_test: Run Playwright tests with local auth token
 * - get_auth_status: Check current authentication state
 * - navigate_and_verify: Navigate to a page and verify it loads correctly
 * - take_screenshot: Capture a screenshot of the current page
 * - check_element: Check if an element exists and is visible
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_STATE_PATH = process.env.AUTH_STATE_PATH || path.resolve('tests', 'auth-state.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; // Dev server runs on port 3000

/**
 * Load authentication state from file
 */
function loadAuthState() {
  try {
    if (fs.existsSync(AUTH_STATE_PATH)) {
      const content = fs.readFileSync(AUTH_STATE_PATH, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error('Error loading auth state:', error);
    return null;
  }
}

/**
 * Extract access token from auth state
 */
function getAccessToken(authState) {
  if (!authState || !authState.origins) return null;
  
  for (const origin of authState.origins) {
    if (origin.localStorage) {
      const tokenEntry = origin.localStorage.find(entry => entry.name === 'access_token');
      if (tokenEntry) {
        return tokenEntry.value;
      }
    }
  }
  return null;
}

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-testing',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_authenticated_test',
        description: 'Run a Playwright test with local authentication token. This allows you to test authenticated features of the ESO Log Aggregator application.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL path to navigate to (relative to BASE_URL)',
            },
            testCode: {
              type: 'string',
              description: 'JavaScript code to execute in the Playwright context. You have access to "page" variable.',
            },
            waitForSelector: {
              type: 'string',
              description: 'Optional: CSS selector to wait for before running test code',
            },
          },
          required: ['url', 'testCode'],
        },
      },
      {
        name: 'get_auth_status',
        description: 'Check the current authentication status and token information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'navigate_and_verify',
        description: 'Navigate to a page and verify it loads correctly with authentication',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL path to navigate to (relative to BASE_URL)',
            },
            expectedTitle: {
              type: 'string',
              description: 'Optional: Expected page title to verify',
            },
            expectedSelector: {
              type: 'string',
              description: 'Optional: CSS selector that should be present on the page',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of a page at a specific URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL path to navigate to (relative to BASE_URL)',
            },
            outputPath: {
              type: 'string',
              description: 'Path where to save the screenshot (relative to project root)',
            },
            fullPage: {
              type: 'boolean',
              description: 'Whether to capture the full page or just viewport',
              default: false,
            },
          },
          required: ['url', 'outputPath'],
        },
      },
      {
        name: 'check_element',
        description: 'Check if an element exists and is visible on a page',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL path to navigate to (relative to BASE_URL)',
            },
            selector: {
              type: 'string',
              description: 'CSS selector to check',
            },
          },
          required: ['url', 'selector'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_auth_status': {
        const authState = loadAuthState();
        if (!authState) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  authenticated: false,
                  message: 'No auth state file found',
                  authStatePath: AUTH_STATE_PATH,
                }, null, 2),
              },
            ],
          };
        }

        const token = getAccessToken(authState);
        const hasToken = !!token;
        
        // Parse token expiry if available
        let expiryInfo = {};
        if (authState.origins && authState.origins[0]?.localStorage) {
          const expiresAtEntry = authState.origins[0].localStorage.find(
            entry => entry.name === 'access_token_expires_at'
          );
          if (expiresAtEntry) {
            const expiresAt = parseInt(expiresAtEntry.value);
            const now = Date.now();
            const isExpired = expiresAt < now;
            const expiresIn = Math.floor((expiresAt - now) / 1000 / 60); // minutes
            
            expiryInfo = {
              expiresAt: new Date(expiresAt).toISOString(),
              expiresInMinutes: expiresIn,
              isExpired,
            };
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                authenticated: hasToken,
                hasToken,
                tokenLength: token ? token.length : 0,
                ...expiryInfo,
                origins: authState.origins?.map(o => o.origin) || [],
              }, null, 2),
            },
          ],
        };
      }

      case 'run_authenticated_test': {
        const { url, testCode, waitForSelector } = args;
        
        const authState = loadAuthState();
        if (!authState) {
          throw new Error('No authentication state found. Please ensure auth-state.json exists.');
        }

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: authState });
        const page = await context.newPage();

        try {
          // Navigate to the URL
          await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });

          // Wait for optional selector
          if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: 10000 });
          }

          // Execute test code
          const testFn = new Function('page', testCode);
          const result = await testFn(page);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  url: `${BASE_URL}${url}`,
                  result: result,
                }, null, 2),
              },
            ],
          };
        } finally {
          await browser.close();
        }
      }

      case 'navigate_and_verify': {
        const { url, expectedTitle, expectedSelector } = args;
        
        const authState = loadAuthState();
        if (!authState) {
          throw new Error('No authentication state found.');
        }

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: authState });
        const page = await context.newPage();

        try {
          await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });

          const title = await page.title();
          const checks = {
            pageLoaded: true,
            title: title,
          };

          if (expectedTitle) {
            checks.titleMatches = title.includes(expectedTitle);
          }

          if (expectedSelector) {
            const element = await page.$(expectedSelector);
            checks.selectorFound = !!element;
            if (element) {
              checks.selectorVisible = await element.isVisible();
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  url: `${BASE_URL}${url}`,
                  ...checks,
                }, null, 2),
              },
            ],
          };
        } finally {
          await browser.close();
        }
      }

      case 'take_screenshot': {
        const { url, outputPath, fullPage = false } = args;
        
        const authState = loadAuthState();
        if (!authState) {
          throw new Error('No authentication state found.');
        }

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: authState });
        const page = await context.newPage();

        try {
          await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000); // Wait for rendering

          const screenshotPath = path.resolve(outputPath);
          await page.screenshot({ path: screenshotPath, fullPage });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  url: `${BASE_URL}${url}`,
                  screenshotPath,
                }, null, 2),
              },
            ],
          };
        } finally {
          await browser.close();
        }
      }

      case 'check_element': {
        const { url, selector } = args;
        
        const authState = loadAuthState();
        if (!authState) {
          throw new Error('No authentication state found.');
        }

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: authState });
        const page = await context.newPage();

        try {
          await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });

          const element = await page.$(selector);
          const exists = !!element;
          let visible = false;
          let boundingBox = null;

          if (element) {
            visible = await element.isVisible();
            boundingBox = await element.boundingBox();
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  url: `${BASE_URL}${url}`,
                  selector,
                  exists,
                  visible,
                  boundingBox,
                }, null, 2),
              },
            ],
          };
        } finally {
          await browser.close();
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ESO Log Aggregator Testing MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
