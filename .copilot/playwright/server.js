#!/usr/bin/env node

/**
 * ESO Log Aggregator - Playwright Testing Agent Skill (MCP Server)
 * 
 * This MCP server provides tools for GitHub Copilot to run Playwright tests
 * and get machine-readable results without opening HTML reports.
 * 
 * Compatible with: GitHub Copilot (VS Code) via Agent Skills standard
 * 
 * Tools provided:
 * - run_playwright_tests: Run Playwright tests with specific config
 * - run_smoke_tests: Quick smoke tests
 * - run_full_tests: Full E2E test suite
 * - run_nightly_tests: Comprehensive nightly tests
 * - run_screen_size_tests: Visual regression tests across screen sizes
 * - run_performance_tests: Performance benchmarking tests
 * - get_test_results: Get last test results summary
 * - list_test_files: List all available test files
 * - run_single_test: Run a single test file
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

// Get project root (go up two levels from .copilot/playwright)
const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const RESULTS_CACHE = join(PROJECT_ROOT, '.copilot', 'playwright', 'last-results.json');

/**
 * Run Playwright tests with list reporter (no HTML)
 */
function runPlaywrightTests(configFile, testFile = null, additionalArgs = []) {
  const startTime = Date.now();
  
  try {
    // Build command args
    const args = [
      'npx',
      'playwright',
      'test',
      `--config=${configFile}`,
      '--reporter=list', // Use list reporter instead of HTML
    ];
    
    if (testFile) {
      args.push(testFile);
    }
    
    args.push(...additionalArgs);
    
    // Run command
    const command = args.join(' ');
    console.error(`Running: ${command}`);
    
    const output = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    const duration = Date.now() - startTime;
    
    // Parse output
    const result = parseTestOutput(output, duration, true);
    
    // Cache results
    writeFileSync(RESULTS_CACHE, JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Parse error output (tests failed)
    const output = error.stdout || error.stderr || error.message;
    const result = parseTestOutput(output, duration, false);
    
    // Cache results
    writeFileSync(RESULTS_CACHE, JSON.stringify(result, null, 2));
    
    return result;
  }
}

/**
 * Parse Playwright list reporter output
 */
function parseTestOutput(output, duration, allPassed) {
  const lines = output.split('\n');
  
  const result = {
    success: allPassed,
    duration,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
    },
    tests: [],
    failedTests: [],
    output: output.substring(0, 5000), // Keep first 5000 chars of output
  };
  
  // Parse summary line (looks like: "5 passed (1.2s)")
  const summaryMatch = output.match(/(\d+)\s+passed|(\d+)\s+failed|(\d+)\s+skipped|(\d+)\s+flaky/g);
  if (summaryMatch) {
    summaryMatch.forEach(match => {
      const [count, status] = match.split(/\s+/);
      const num = parseInt(count);
      
      if (match.includes('passed')) result.summary.passed = num;
      else if (match.includes('failed')) result.summary.failed = num;
      else if (match.includes('skipped')) result.summary.skipped = num;
      else if (match.includes('flaky')) result.summary.flaky = num;
    });
  }
  
  result.summary.total = result.summary.passed + result.summary.failed + 
                         result.summary.skipped + result.summary.flaky;
  
  // Parse individual test lines
  lines.forEach(line => {
    // Match test result lines like:
    // ✓ [chromium] › tests/smoke.spec.ts:5:1 › loads homepage
    // ✗ [chromium] › tests/feature.spec.ts:10:1 › feature test
    
    const testMatch = line.match(/^[✓✗⊘⊗]\s+\[([^\]]+)\]\s+›\s+([^›]+)›\s+(.+)/);
    if (testMatch) {
      const [, browser, filePath, testName] = testMatch;
      const status = line.startsWith('✓') ? 'passed' : 
                     line.startsWith('✗') ? 'failed' : 'skipped';
      
      const test = {
        name: testName.trim(),
        file: filePath.trim(),
        browser: browser.trim(),
        status,
      };
      
      result.tests.push(test);
      
      if (status === 'failed') {
        result.failedTests.push(test);
      }
    }
  });
  
  return result;
}

/**
 * List all test files in the tests directory
 */
function listTestFiles() {
  const testsDir = join(PROJECT_ROOT, 'tests');
  
  if (!existsSync(testsDir)) {
    return { files: [], error: 'Tests directory not found' };
  }
  
  const files = [];
  
  function walkDir(dir) {
    const items = readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.spec.ts') || item.endsWith('.spec.js')) {
        const relativePath = relative(PROJECT_ROOT, fullPath);
        files.push({
          path: relativePath,
          name: item,
          size: stat.size,
        });
      }
    });
  }
  
  walkDir(testsDir);
  
  return { files };
}

/**
 * Get cached test results
 */
function getCachedResults() {
  if (!existsSync(RESULTS_CACHE)) {
    return { error: 'No cached results found. Run tests first.' };
  }
  
  try {
    const content = readFileSync(RESULTS_CACHE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { error: `Failed to read cached results: ${error.message}` };
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'eso-log-aggregator-playwright',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_playwright_tests',
        description: 'Run Playwright tests with a specific config file. Returns machine-readable results without opening HTML report.',
        inputSchema: {
          type: 'object',
          properties: {
            config: {
              type: 'string',
              description: 'Config file name (e.g., "playwright.smoke.config.ts", "playwright.full.config.ts")',
              enum: [
                'playwright.config.ts',
                'playwright.smoke.config.ts',
                'playwright.full.config.ts',
                'playwright.nightly.config.ts',
                'playwright.screen-sizes.config.ts',
                'playwright.screen-sizes-fast.config.ts',
                'playwright.performance.config.ts',
                'playwright.debug.config.ts',
              ],
            },
            testFile: {
              type: 'string',
              description: 'Optional: specific test file to run (e.g., "tests/smoke.spec.ts")',
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: additional arguments (e.g., ["--headed", "--project=chromium"])',
            },
          },
          required: ['config'],
        },
      },
      {
        name: 'run_smoke_tests',
        description: 'Run quick smoke tests for PR validation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_full_tests',
        description: 'Run full E2E test suite',
        inputSchema: {
          type: 'object',
          properties: {
            headed: {
              type: 'boolean',
              description: 'Run tests in headed mode (visible browser)',
            },
          },
        },
      },
      {
        name: 'run_nightly_tests',
        description: 'Run comprehensive nightly regression tests',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Optional: specific project to run (e.g., "chromium-desktop", "firefox-desktop")',
            },
          },
        },
      },
      {
        name: 'run_screen_size_tests',
        description: 'Run visual regression tests across different screen sizes',
        inputSchema: {
          type: 'object',
          properties: {
            fast: {
              type: 'boolean',
              description: 'Use fast mode (fewer screen sizes)',
            },
          },
        },
      },
      {
        name: 'run_performance_tests',
        description: 'Run performance benchmarking tests',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_test_results',
        description: 'Get the last cached test results',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_test_files',
        description: 'List all available test files in the tests directory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_single_test',
        description: 'Run a single test file',
        inputSchema: {
          type: 'object',
          properties: {
            testFile: {
              type: 'string',
              description: 'Path to test file (e.g., "tests/smoke.spec.ts")',
            },
            headed: {
              type: 'boolean',
              description: 'Run test in headed mode (visible browser)',
            },
          },
          required: ['testFile'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'run_playwright_tests': {
        const config = args.config || 'playwright.config.ts';
        const testFile = args.testFile || null;
        const additionalArgs = args.args || [];
        
        const result = runPlaywrightTests(config, testFile, additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_smoke_tests': {
        const result = runPlaywrightTests('playwright.smoke.config.ts');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_full_tests': {
        const additionalArgs = args.headed ? ['--headed'] : [];
        const result = runPlaywrightTests('playwright.full.config.ts', null, additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_nightly_tests': {
        const additionalArgs = [];
        if (args.project) {
          additionalArgs.push(`--project=${args.project}`);
        }
        
        const result = runPlaywrightTests('playwright.nightly.config.ts', null, additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_screen_size_tests': {
        const config = args.fast ? 
          'playwright.screen-sizes-fast.config.ts' : 
          'playwright.screen-sizes.config.ts';
        
        const result = runPlaywrightTests(config);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_performance_tests': {
        const result = runPlaywrightTests('playwright.performance.config.ts');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_test_results': {
        const result = getCachedResults();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_test_files': {
        const result = listTestFiles();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'run_single_test': {
        const testFile = args.testFile;
        const additionalArgs = args.headed ? ['--headed'] : [];
        
        const result = runPlaywrightTests('playwright.config.ts', testFile, additionalArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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
          text: JSON.stringify({ error: error.message, stack: error.stack }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ESO Log Aggregator Playwright Agent Skill started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
