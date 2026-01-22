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
 * - run_smoke_tests: Quick validation tests
 * - run_full_tests: Full E2E test suite
 * - run_nightly_tests: Comprehensive cross-browser testing
 * - run_format: Format code with Prettier
 * - run_lint: Lint code with ESLint
 * - run_typecheck: TypeScript type checking
 * - run_unit_tests: Jest unit tests
 * - run_build: Production build
 * - git_create_branch: Create and checkout a new git branch
 * - git_commit_changes: Stage and commit changes with message
 * - git_push_branch: Push branch to remote with PR URL
 * - git_rebase_tree: Rebase branches in tree while skipping squashed commits
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
        name: 'run_smoke_tests',
        description: 'Run quick smoke tests (E2E only) to validate critical paths. Returns structured test results.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Optional: Specific browser project to test (e.g., "chromium-desktop")',
            },
          },
        },
      },
      {
        name: 'run_full_tests',
        description: 'Run full E2E test suite (all non-nightly tests). Returns structured test results.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Optional: Specific browser project to test (e.g., "chromium-desktop")',
            },
            maxFailures: {
              type: 'number',
              description: 'Optional: Stop after N failures (default: run all)',
            },
          },
        },
      },
      {
        name: 'run_nightly_tests',
        description: 'Run comprehensive nightly tests across all browsers. WARNING: This is slow! Returns structured test results.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Optional: Specific browser project (chromium-desktop, firefox-desktop, webkit-desktop, mobile-chrome, mobile-safari)',
            },
            maxFailures: {
              type: 'number',
              description: 'Optional: Stop after N failures',
            },
          },
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
      {
        name: 'git_create_branch',
        description: 'Create and checkout a new git branch based on Jira work item (e.g., ESO-569-description). Returns branch name and status.',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: {
              type: 'string',
              description: 'Branch name to create (e.g., ESO-569-remove-duplicate-roles)',
            },
          },
          required: ['branchName'],
        },
      },
      {
        name: 'git_commit_changes',
        description: 'Stage and commit changes with a descriptive message. Returns commit hash and summary.',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Commit message (should follow format: "ESO-XXX: Description\\n\\nBullet points of changes")',
            },
            files: {
              type: 'array',
              description: 'List of files to stage (relative to project root). If empty, stages all modified files.',
              items: {
                type: 'string',
              },
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'git_push_branch',
        description: 'Push current branch to remote origin with upstream tracking. Returns push status and PR creation URL.',
        inputSchema: {
          type: 'object',
          properties: {
            force: {
              type: 'boolean',
              description: 'Force push (use with caution)',
              default: false,
            },
          },
        },
      },
      {
        name: 'git_rebase_tree',
        description: 'Rebase branches in a tree structure while handling squashed commits. When a parent branch is squashed into main, this tool helps rebase child branches by skipping the squashed commits and only keeping new commits. Use this after landing/merging a branch into main.',
        inputSchema: {
          type: 'object',
          properties: {
            parentBranch: {
              type: 'string',
              description: 'The branch that was squashed into main (e.g., "ESO-449/feature-branch")',
            },
            targetBranch: {
              type: 'string',
              description: 'The base branch to rebase onto (typically "master" or "main")',
              default: 'master',
            },
            childBranches: {
              type: 'array',
              description: 'List of child branches to rebase. If empty, will detect children automatically using twig tree.',
              items: {
                type: 'string',
              },
            },
            dryRun: {
              type: 'boolean',
              description: 'Show what would be done without actually rebasing',
              default: false,
            },
            autoStash: {
              type: 'boolean',
              description: 'Automatically stash and pop pending changes',
              default: true,
            },
          },
          required: ['parentBranch'],
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

      case 'run_smoke_tests': {
        const { project } = args;
        
        console.error('Running smoke tests...');
        
        const additionalArgs = [];
        if (project) {
          additionalArgs.push(`--project=${project}`);
        }
        
        const results = runPlaywrightTests('playwright.smoke.config.ts', additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                testType: 'smoke',
                ...results,
                note: 'Smoke tests validate critical paths quickly',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_full_tests': {
        const { project, maxFailures } = args;
        
        console.error('Running full test suite...');
        
        const additionalArgs = [];
        if (project) {
          additionalArgs.push(`--project=${project}`);
        }
        if (maxFailures) {
          additionalArgs.push(`--max-failures=${maxFailures}`);
        }
        
        const results = runPlaywrightTests('playwright.full.config.ts', additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                testType: 'full',
                ...results,
                note: 'Full test suite covers all E2E scenarios',
              }, null, 2),
            },
          ],
        };
      }

      case 'run_nightly_tests': {
        const { project, maxFailures } = args;
        
        console.error('Running nightly tests (this may take a while)...');
        
        const additionalArgs = [];
        if (project) {
          additionalArgs.push(`--project=${project}`);
        }
        if (maxFailures) {
          additionalArgs.push(`--max-failures=${maxFailures}`);
        }
        
        const results = runPlaywrightTests('playwright.nightly.config.ts', additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                testType: 'nightly',
                ...results,
                note: 'Nightly tests run comprehensive cross-browser validation',
              }, null, 2),
            },
          ],
        };
      }

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

      case 'git_create_branch': {
        const { branchName } = args;
        
        console.error(`Creating and checking out branch: ${branchName}...`);
        
        try {
          // Check if branch already exists
          const existingBranches = execSync('git branch --list', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          });
          
          if (existingBranches.includes(branchName)) {
            // Branch exists, just check it out
            execSync(`git checkout ${branchName}`, {
              cwd: PROJECT_ROOT,
              encoding: 'utf-8',
            });
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    action: 'checkout',
                    branch: branchName,
                    message: `Checked out existing branch: ${branchName}`,
                  }, null, 2),
                },
              ],
            };
          }
          
          // Create new branch
          const output = execSync(`git checkout -b ${branchName}`, {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  action: 'create',
                  branch: branchName,
                  message: `Created and checked out new branch: ${branchName}`,
                  output: output.trim(),
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
                  error: error.message,
                  stderr: error.stderr?.toString() || '',
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'git_commit_changes': {
        const { message, files } = args;
        
        console.error('Staging and committing changes...');
        
        try {
          // Stage files
          if (files && files.length > 0) {
            const fileList = files.join(' ');
            execSync(`git add ${fileList}`, {
              cwd: PROJECT_ROOT,
              encoding: 'utf-8',
            });
          } else {
            // Stage all modified files
            execSync('git add -u', {
              cwd: PROJECT_ROOT,
              encoding: 'utf-8',
            });
          }
          
          // Get status before commit
          const statusBefore = execSync('git status --short', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          });
          
          // Commit
          const commitOutput = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          });
          
          // Get commit hash
          const commitHash = execSync('git rev-parse HEAD', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          }).trim();
          
          // Get short hash
          const shortHash = commitHash.substring(0, 8);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  commitHash: shortHash,
                  fullHash: commitHash,
                  stagedFiles: statusBefore.trim(),
                  output: commitOutput.trim(),
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
                  error: error.message,
                  stderr: error.stderr?.toString() || '',
                  note: 'Check if there are files to commit or if commit message is valid',
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'git_push_branch': {
        const { force } = args;
        
        console.error('Pushing branch to remote...');
        
        try {
          // Get current branch
          const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
          }).trim();
          
          // Push with upstream tracking
          const pushCommand = force
            ? `git push -u origin ${currentBranch} --force`
            : `git push -u origin ${currentBranch}`;
          
          const output = execSync(pushCommand, {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          
          // Extract PR URL from output
          const prUrlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/new\/[^\s]+/);
          const prUrl = prUrlMatch ? prUrlMatch[0] : null;
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  branch: currentBranch,
                  forced: !!force,
                  prUrl: prUrl,
                  message: prUrl 
                    ? `Branch pushed successfully. Create PR at: ${prUrl}`
                    : `Branch ${currentBranch} pushed successfully`,
                  output: output.trim(),
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
                  error: error.message,
                  stderr: error.stderr?.toString() || '',
                  note: 'Check if you have uncommitted changes or if remote repository is accessible',
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'git_rebase_tree': {
        const { parentBranch, targetBranch = 'master', childBranches, dryRun = false, autoStash = true } = args;
        
        console.error(`Rebasing tree after ${parentBranch} was squashed into ${targetBranch}...`);
        
        try {
          // Step 1: Get list of child branches if not provided
          let branches = childBranches;
          if (!branches || branches.length === 0) {
            console.error('Detecting child branches using twig tree...');
            const treeOutput = execSync('twig tree', {
              cwd: PROJECT_ROOT,
              encoding: 'utf-8',
            });
            
            // Parse twig tree output to find children of parentBranch
            branches = parseChildBranches(treeOutput, parentBranch);
            
            if (branches.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      message: `No child branches found for ${parentBranch}`,
                      note: 'Run "twig tree" to see the branch structure',
                    }, null, 2),
                  },
                ],
              };
            }
            
            console.error(`Found ${branches.length} child branches: ${branches.join(', ')}`);
          }
          
          // Step 2: Get commits from parent branch that were squashed
          console.error(`Identifying commits from ${parentBranch} that were squashed...`);
          
          // Find the merge base between parent and target
          let commitsToSkip = [];
          try {
            // Get all commits in parent branch that aren't in target
            const commitList = execSync(
              `git log --pretty=format:%H ${targetBranch}..${parentBranch}`,
              {
                cwd: PROJECT_ROOT,
                encoding: 'utf-8',
              }
            ).trim().split('\n').filter(c => c);
            
            commitsToSkip = commitList;
            console.error(`Found ${commitsToSkip.length} commits to skip from ${parentBranch}`);
          } catch (error) {
            // Parent branch might not exist anymore if it was deleted after squashing
            console.error(`Warning: Could not get commits from ${parentBranch}. It may have been deleted.`);
            console.error('Will attempt to rebase without skip-commits...');
          }
          
          // Step 3: Rebase each child branch
          const results = [];
          
          for (const branch of branches) {
            console.error(`\nRebasing ${branch}...`);
            
            if (dryRun) {
              results.push({
                branch,
                action: 'dry-run',
                message: `Would rebase ${branch} onto ${targetBranch}`,
                commitsToSkip: commitsToSkip.length,
              });
              continue;
            }
            
            try {
              // First, reparent the branch to target using twig
              console.error(`  Reparenting ${branch} to ${targetBranch}...`);
              execSync(`twig branch reparent ${targetBranch} ${branch}`, {
                cwd: PROJECT_ROOT,
                encoding: 'utf-8',
              });
              
              // Checkout the branch
              execSync(`git checkout ${branch}`, {
                cwd: PROJECT_ROOT,
                encoding: 'utf-8',
              });
              
              // Rebase with skip-commits
              let rebaseCommand = `twig rebase`;
              if (autoStash) {
                rebaseCommand += ' --autostash';
              }
              
              if (commitsToSkip.length > 0) {
                // Write commits to a temp file
                const skipCommitsFile = path.join(PROJECT_ROOT, '.twig', 'skip-commits.tmp');
                fs.writeFileSync(skipCommitsFile, commitsToSkip.join('\n'));
                rebaseCommand += ` --skip-commits ${skipCommitsFile}`;
              }
              
              console.error(`  Running: ${rebaseCommand}`);
              const rebaseOutput = execSync(rebaseCommand, {
                cwd: PROJECT_ROOT,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
              });
              
              // Clean up temp file
              if (commitsToSkip.length > 0) {
                const skipCommitsFile = path.join(PROJECT_ROOT, '.twig', 'skip-commits.tmp');
                if (fs.existsSync(skipCommitsFile)) {
                  fs.unlinkSync(skipCommitsFile);
                }
              }
              
              results.push({
                branch,
                success: true,
                message: `Successfully rebased ${branch} onto ${targetBranch}`,
                commitsSkipped: commitsToSkip.length,
              });
              
            } catch (error) {
              results.push({
                branch,
                success: false,
                error: error.message,
                stderr: error.stderr?.toString() || '',
                note: 'Rebase may have conflicts. Resolve manually with "git rebase --continue" or "git rebase --abort"',
              });
            }
          }
          
          // Step 4: Return summary
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success && !r.action).length;
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: failed === 0,
                  dryRun,
                  parentBranch,
                  targetBranch,
                  commitsSkipped: commitsToSkip.length,
                  skipCommitsList: commitsToSkip.slice(0, 5), // Show first 5
                  summary: {
                    total: branches.length,
                    successful,
                    failed,
                  },
                  results,
                  message: dryRun
                    ? `Dry run complete. Would rebase ${branches.length} branches.`
                    : failed > 0
                    ? `Rebased ${successful}/${branches.length} branches. ${failed} failed - check results for conflicts.`
                    : `Successfully rebased all ${branches.length} child branches onto ${targetBranch}.`,
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
                  error: error.message,
                  stderr: error.stderr?.toString() || '',
                  note: 'Check that twig is installed and the branch names are correct',
                }, null, 2),
              },
            ],
            isError: true,
          };
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
 * Parse twig tree output to find child branches
 */
function parseChildBranches(treeOutput, parentBranch) {
  const lines = treeOutput.split('\n');
  const children = [];
  let foundParent = false;
  let parentIndent = 0;
  
  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.includes('Orphaned branches') || line.includes('To organize')) {
      continue;
    }
    
    // Extract branch name and indentation
    const match = line.match(/^(\s*[│├└─\s]*)\s*([^\s\[]+)/);
    if (!match) continue;
    
    const indent = match[1].length;
    const branchName = match[2].trim();
    
    if (branchName === parentBranch) {
      foundParent = true;
      parentIndent = indent;
      continue;
    }
    
    // If we found parent, collect children until we find a sibling or parent
    if (foundParent) {
      if (indent <= parentIndent) {
        // We've moved to a sibling or back up the tree
        break;
      }
      
      // This is a direct child (one level deeper)
      const childIndent = parentIndent + 4; // Twig uses 4 spaces for each level
      if (indent <= childIndent + 2) { // Allow some tolerance for tree characters
        children.push(branchName);
      }
    }
  }
  
  return children;
}

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
