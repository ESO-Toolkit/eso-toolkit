#!/usr/bin/env node

/**
 * ESO Log Aggregator - GitHub Copilot Agent Skill (MCP Server)
 * 
 * This MCP server provides tools for GitHub Copilot to interact with the ESO Log Aggregator
 * application using Playwright, with proper authentication using local tokens.
 * 
 * Compatible with: GitHub Copilot (VS Code) via Agent Skills standard
 * 
 * Tools provided:
 * - run_authenticated_test: Run Playwright tests with local auth token
 * - get_auth_status: Check current authentication state
 * - navigate_and_verify: Navigate to a page and verify it loads correctly
 * - take_screenshot: Capture a screenshot of the current page
 * - check_element: Check if an element exists and is visible
 * - start_dev_server: Start development server in background
 * - stop_dev_server: Stop running development server
 * - dev_server_status: Check dev server status
 * - run_format: Format code with Prettier
 * - run_lint: Lint code with ESLint
 * - run_typecheck: TypeScript type checking
 * - run_unit_tests: Jest unit tests
 * - run_build: Production build
 *
 * NOTE: E2E test tools (run_smoke_tests, run_full_tests, run_nightly_tests) are in the
 * dedicated playwright skill. Git tools are in the git and workflow skills.
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
import { spawn, execSync } from 'child_process';

const AUTH_STATE_PATH = process.env.AUTH_STATE_PATH || path.resolve('tests', 'auth-state.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; // Dev server runs on port 3000
const DEV_SERVER_PID_PATH = path.resolve('.claude', 'dev-server.pid');
const PROJECT_ROOT = path.resolve('..');

// Store dev server process
let devServerProcess = null;

/**
 * Run Playwright tests and return structured results
 */
function runPlaywrightTests(configFile, additionalArgs = []) {
  const resultsFile = path.join(PROJECT_ROOT, '.claude', `test-results-${Date.now()}.json`);
  
  try {
    // Run playwright with JSON reporter
    const args = [
      'test',
      `--config=${configFile}`,
      `--reporter=json`,
      ...additionalArgs,
    ];
    
    const result = execSync(`npx playwright ${args.join(' ')}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });
    
    // Parse JSON output
    const jsonOutput = JSON.parse(result);
    
    // Extract summary
    const summary = {
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: 0,
      tests: [],
    };
    
    if (jsonOutput.suites) {
      const extractTests = (suite) => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              const status = test.results[0]?.status || 'unknown';
              const duration = test.results[0]?.duration || 0;
              
              summary.duration += duration;
              
              if (status === 'passed') summary.passed++;
              else if (status === 'failed') summary.failed++;
              else if (status === 'skipped') summary.skipped++;
              else if (status === 'flaky') summary.flaky++;
              
              summary.tests.push({
                title: spec.title,
                file: spec.file,
                status,
                duration,
                error: test.results[0]?.error?.message,
              });
            });
          });
        }
        
        if (suite.suites) {
          suite.suites.forEach(extractTests);
        }
      };
      
      jsonOutput.suites.forEach(extractTests);
    }
    
    return {
      success: summary.failed === 0,
      summary,
      config: configFile,
    };
    
  } catch (error) {
    // Test failures throw errors, but we still want to parse the output
    try {
      const output = error.stdout || error.stderr || '';
      
      // Try to extract test summary from error output
      const lines = output.split('\n');
      const summaryLine = lines.find(line => line.includes('passed') || line.includes('failed'));
      
      return {
        success: false,
        error: error.message,
        summary: {
          message: summaryLine || 'Tests failed',
          output: output.substring(0, 5000), // Limit output size
        },
        config: configFile,
      };
    } catch (parseError) {
      return {
        success: false,
        error: error.message,
        summary: {
          message: 'Failed to parse test results',
          rawError: error.toString().substring(0, 5000),
        },
        config: configFile,
      };
    }
  }
}

/**
 * Run a development workflow command and return structured results
 */
function runDevCommand(command, args = []) {
  try {
    const fullCommand = `npm run ${command} ${args.join(' ')}`;
    
    const result = execSync(fullCommand, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    
    return {
      success: true,
      command,
      output: result.substring(0, 5000), // Limit output size
    };
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    
    return {
      success: false,
      command,
      error: error.message,
      output: output.substring(0, 5000),
      exitCode: error.status,
    };
  }
}

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
 * Check if a process is running on Windows
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get dev server PID from file
 */
function getDevServerPid() {
  try {
    if (fs.existsSync(DEV_SERVER_PID_PATH)) {
      const pid = parseInt(fs.readFileSync(DEV_SERVER_PID_PATH, 'utf-8').trim(), 10);
      return isProcessRunning(pid) ? pid : null;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Save dev server PID to file
 */
function saveDevServerPid(pid) {
  try {
    fs.writeFileSync(DEV_SERVER_PID_PATH, pid.toString());
  } catch (error) {
    console.error('Error saving PID:', error);
  }
}

/**
 * Remove dev server PID file
 */
function removeDevServerPid() {
  try {
    if (fs.existsSync(DEV_SERVER_PID_PATH)) {
      fs.unlinkSync(DEV_SERVER_PID_PATH);
    }
  } catch (error) {
    console.error('Error removing PID file:', error);
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
      {
        name: 'start_dev_server',
        description: 'Start the development server in the background. The server runs on port 3000 and continues running independently.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'stop_dev_server',
        description: 'Stop the running development server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'dev_server_status',
        description: 'Check if the development server is running',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_format',
        description: 'Format code with Prettier. Returns files that were formatted.',
        inputSchema: {
          type: 'object',
          properties: {
            check: {
              type: 'boolean',
              description: 'Optional: Only check formatting without making changes (default: false)',
            },
          },
        },
      },
      {
        name: 'run_lint',
        description: 'Lint code with ESLint. Returns lint errors and warnings.',
        inputSchema: {
          type: 'object',
          properties: {
            fix: {
              type: 'boolean',
              description: 'Optional: Automatically fix fixable issues (default: false)',
            },
          },
        },
      },
      {
        name: 'run_typecheck',
        description: 'Run TypeScript type checking. Returns type errors if any.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_unit_tests',
        description: 'Run Jest unit tests. Returns structured test results.',
        inputSchema: {
          type: 'object',
          properties: {
            coverage: {
              type: 'boolean',
              description: 'Optional: Generate coverage report (default: false)',
            },
          },
        },
      },
      {
        name: 'run_build',
        description: 'Create production build. Returns build status and any errors.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // NOTE: Git tools (git_create_branch, git_commit_changes, git_push_branch, git_rebase_tree)
      // have been moved to dedicated skills: .github/copilot-skills/git/ and .github/copilot-skills/workflow/
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

      case 'start_dev_server': {
        const existingPid = getDevServerPid();
        if (existingPid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: 'Dev server is already running',
                  pid: existingPid,
                  url: BASE_URL,
                }, null, 2),
              },
            ],
          };
        }

        const projectRoot = path.resolve('..');
        
        // Start dev server using npm run dev
        devServerProcess = spawn('npm', ['run', 'dev'], {
          cwd: projectRoot,
          detached: true,
          stdio: 'ignore',
          shell: true,
        });

        // Unref so the parent process can exit independently
        devServerProcess.unref();

        saveDevServerPid(devServerProcess.pid);

        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Dev server started successfully',
                pid: devServerProcess.pid,
                url: BASE_URL,
                note: 'Server is running in the background. Use dev_server_status to check status or stop_dev_server to stop it.',
              }, null, 2),
            },
          ],
        };
      }

      case 'stop_dev_server': {
        const pid = getDevServerPid();
        if (!pid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: 'No dev server is currently running',
                }, null, 2),
              },
            ],
          };
        }

        try {
          // On Windows, we need to kill the entire process tree
          spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], { shell: true });
          removeDevServerPid();
          devServerProcess = null;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Dev server stopped successfully',
                  pid,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: 'Error stopping dev server',
                  error: error.message,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'dev_server_status': {
        const pid = getDevServerPid();
        const isRunning = !!pid;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                running: isRunning,
                pid: pid || null,
                url: BASE_URL,
                message: isRunning 
                  ? 'Dev server is running' 
                  : 'Dev server is not running. Use start_dev_server to start it.',
              }, null, 2),
            },
          ],
        };
      }

      // NOTE: run_smoke_tests, run_full_tests, run_nightly_tests moved to playwright skill
      // NOTE: git_create_branch, git_commit_changes, git_push_branch, git_rebase_tree moved to git/workflow skills

      case 'run_format': {
        const { check } = args;
        
        console.error(check ? 'Checking code formatting...' : 'Formatting code...');
        
        const command = check ? 'format:check' : 'format';
        const result = runDevCommand(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: check ? 'format-check' : 'format',
                ...result,
                note: check 
                  ? 'Checked formatting without making changes'
                  : 'Code has been formatted with Prettier',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_lint': {
        const { fix } = args;
        
        console.error(fix ? 'Linting and fixing code...' : 'Linting code...');
        
        const command = fix ? 'lint:fix' : 'lint';
        const result = runDevCommand(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: fix ? 'lint-fix' : 'lint',
                ...result,
                note: fix 
                  ? 'Linted code and fixed auto-fixable issues'
                  : 'Linted code (no changes made)',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_typecheck': {
        console.error('Running TypeScript type checking...');
        
        const result = runDevCommand('typecheck');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: 'typecheck',
                ...result,
                note: 'TypeScript compilation check (no code emitted)',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_unit_tests': {
        const { coverage } = args;
        
        console.error(coverage ? 'Running unit tests with coverage...' : 'Running unit tests...');
        
        const command = coverage ? 'test:coverage' : 'test:all';
        const result = runDevCommand(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: 'unit-tests',
                coverage: !!coverage,
                ...result,
                note: coverage 
                  ? 'Unit tests completed with coverage report generated'
                  : 'Unit tests completed',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_build': {
        console.error('Building production bundle...');
        
        const result = runDevCommand('build');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                action: 'build',
                ...result,
                note: 'Production build created in build/ directory',
              }, null, 2),
            },
          ],
        };
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

/**
 * Cleanup on exit
 */
process.on('SIGINT', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down MCP server...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
