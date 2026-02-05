#!/usr/bin/env node

/**
 * ESO Log Aggregator - Sentry Integration Skill (MCP Server)
 * 
 * This MCP server provides tools for GitHub Copilot/Claude to interact with Sentry
 * issues using the Sentry CLI.
 * 
 * Compatible with: GitHub Copilot (VS Code), Claude Desktop via Agent Skills standard
 * 
 * Prerequisites:
 * - Sentry CLI installed (`npm install -g @sentry/cli` or `brew install getsentry/tools/sentry-cli`)
 * - SENTRY_AUTH_TOKEN environment variable set
 * - SENTRY_ORG and SENTRY_PROJECT configured (defaults to ESO Log Aggregator)
 * 
 * Tools provided:
 * - sentry_search_issues: Search for issues using filters
 * - sentry_view_issue: View details of a specific issue
 * - sentry_resolve_issue: Resolve or unresolve an issue
 * - sentry_assign_issue: Assign an issue to a user
 * - sentry_comment_issue: Add a comment/note to an issue
 * - sentry_create_issue: Create a new issue manually (for testing/tracking)
 * - sentry_get_recent_errors: Get recent errors from a specific release
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';

// Configuration (can be overridden via environment variables)
const SENTRY_ORG = process.env.SENTRY_ORG || 'your-org';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'eso-log-aggregator';

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[Sentry Skill]', new Date().toISOString(), ...args);
}

/**
 * Execute Sentry CLI command
 */
function executeSentry(command, silent = false) {
  try {
    const fullCommand = command.startsWith('sentry-cli') ? command : `sentry-cli ${command}`;
    log('Executing:', fullCommand);
    
    const output = execSync(fullCommand, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    return output.trim();
  } catch (error) {
    log('Command failed:', error.message);
    throw new Error(`Sentry CLI command failed: ${error.message}\n${error.stderr || ''}`);
  }
}

/**
 * Validation helpers
 */
function validateIssueId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Issue ID is required and must be a string' };
  }
  return { valid: true };
}

/**
 * Create error response
 */
function createErrorResponse(error, tool, args = {}) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: true,
          tool: tool,
          message: error.message,
          args: args,
          timestamp: new Date().toISOString(),
        }, null, 2),
      },
    ],
  };
}

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-sentry',
    version: '1.0.0',
    description: 'Sentry issue management for ESO Log Aggregator project. Provides 7 tools for automated error tracking workflows including viewing issues, searching, resolving, assigning, commenting, creating, and release monitoring.',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

log('Server initialized:', server.server.name, server.server.version);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sentry_search_issues',
        description: 'Search for Sentry issues using filters. Returns array of issues with key details.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (e.g., "is:unresolved", "error.type:TypeError")',
            },
            status: {
              type: 'string',
              description: 'Filter by status: "resolved", "unresolved", or "ignored"',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
              default: 25,
            },
          },
        },
      },
      {
        name: 'sentry_view_issue',
        description: 'View details of a specific Sentry issue including stack trace, tags, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'Sentry issue ID (numeric ID or short ID)',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'sentry_resolve_issue',
        description: 'Resolve or unresolve a Sentry issue. Can optionally mark as resolved in a specific release.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'Sentry issue ID',
            },
            resolve: {
              type: 'boolean',
              description: 'true to resolve, false to unresolve',
              default: true,
            },
            inRelease: {
              type: 'string',
              description: 'Release version to mark as resolved in (e.g., "1.2.3")',
            },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'sentry_assign_issue',
        description: 'Assign a Sentry issue to a user or team.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'Sentry issue ID',
            },
            assignee: {
              type: 'string',
              description: 'Username or email to assign to (or "unassigned" to remove assignment)',
            },
          },
          required: ['issueId', 'assignee'],
        },
      },
      {
        name: 'sentry_comment_issue',
        description: 'Add a comment/note to a Sentry issue.',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: {
              type: 'string',
              description: 'Sentry issue ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text to add',
            },
          },
          required: ['issueId', 'comment'],
        },
      },
      {
        name: 'sentry_create_issue',
        description: 'Manually create a Sentry issue for tracking purposes (not common, typically issues are auto-created from errors).',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Issue title/summary',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
            level: {
              type: 'string',
              description: 'Severity level: "fatal", "error", "warning", "info", "debug"',
              default: 'error',
            },
            tags: {
              type: 'object',
              description: 'Key-value pairs for tags (e.g., {"environment": "production"})',
            },
          },
          required: ['title', 'message'],
        },
      },
      {
        name: 'sentry_get_recent_errors',
        description: 'Get recent errors from a specific release or time period.',
        inputSchema: {
          type: 'object',
          properties: {
            release: {
              type: 'string',
              description: 'Release version (e.g., "1.2.3")',
            },
            hours: {
              type: 'number',
              description: 'Number of hours to look back (default: 24)',
              default: 24,
            },
          },
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
      case 'sentry_search_issues': {
        const { query = 'is:unresolved', status, limit = 25 } = args;
        
        log('Searching issues:', query);
        
        let searchQuery = query;
        if (status) {
          searchQuery += ` is:${status}`;
        }
        
        // Use Sentry API via CLI (note: this is a simplified approach)
        // In practice, you might need to use curl with Sentry API or sentry-cli issues list
        const command = `issues list -p ${SENTRY_PROJECT} --query "${searchQuery}" --max ${limit}`;
        const output = executeSentry(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query: searchQuery,
                results: output,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      case 'sentry_view_issue': {
        const { issueId } = args;
        
        const validation = validateIssueId(issueId);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Viewing issue:', issueId);
        
        // Note: Sentry CLI doesn't have a direct "view issue" command
        // This is a placeholder - in production, you'd use the Sentry API
        const apiUrl = `https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/${issueId}/`;
        const command = `sentry-cli api GET "${apiUrl}"`;
        
        try {
          const output = executeSentry(command);
          const issue = JSON.parse(output);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  issueId: issueId,
                  title: issue.title,
                  culprit: issue.culprit,
                  status: issue.status,
                  level: issue.level,
                  count: issue.count,
                  userCount: issue.userCount,
                  firstSeen: issue.firstSeen,
                  lastSeen: issue.lastSeen,
                  permalink: issue.permalink,
                  metadata: issue.metadata,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return createErrorResponse(error, name, args);
        }
      }

      case 'sentry_resolve_issue': {
        const { issueId, resolve = true, inRelease } = args;
        
        const validation = validateIssueId(issueId);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Resolving issue:', issueId, resolve ? 'RESOLVE' : 'UNRESOLVE');
        
        const apiUrl = `https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/${issueId}/`;
        const status = resolve ? 'resolved' : 'unresolved';
        const data = inRelease 
          ? JSON.stringify({ status, statusDetails: { inRelease } })
          : JSON.stringify({ status });
        
        const command = `sentry-cli api PUT "${apiUrl}" -d '${data}'`;
        const output = executeSentry(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                issueId: issueId,
                newStatus: status,
                inRelease: inRelease,
                message: `Issue ${resolve ? 'resolved' : 'unresolved'} successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case 'sentry_assign_issue': {
        const { issueId, assignee } = args;
        
        const validation = validateIssueId(issueId);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Assigning issue:', issueId, 'to', assignee);
        
        const apiUrl = `https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/${issueId}/`;
        const data = assignee.toLowerCase() === 'unassigned' 
          ? JSON.stringify({ assignedTo: null })
          : JSON.stringify({ assignedTo: assignee });
        
        const command = `sentry-cli api PUT "${apiUrl}" -d '${data}'`;
        const output = executeSentry(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                issueId: issueId,
                assignee: assignee,
                message: `Issue assigned to ${assignee} successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case 'sentry_comment_issue': {
        const { issueId, comment } = args;
        
        const validation = validateIssueId(issueId);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        if (!comment || typeof comment !== 'string') {
          return createErrorResponse(new Error('Comment is required'), name, args);
        }
        
        log('Adding comment to issue:', issueId);
        
        const apiUrl = `https://sentry.io/api/0/organizations/${SENTRY_ORG}/issues/${issueId}/notes/`;
        const data = JSON.stringify({ text: comment });
        
        const command = `sentry-cli api POST "${apiUrl}" -d '${data}'`;
        const output = executeSentry(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                issueId: issueId,
                message: 'Comment added successfully',
              }, null, 2),
            },
          ],
        };
      }

      case 'sentry_create_issue': {
        const { title, message, level = 'error', tags = {} } = args;
        
        if (!title || !message) {
          return createErrorResponse(new Error('Title and message are required'), name, args);
        }
        
        log('Creating issue:', title);
        
        // Note: Creating issues manually is not typical in Sentry
        // Usually issues are created from captured events
        // This would require sending an event to Sentry
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                info: 'Manual issue creation requires sending an event to Sentry.',
                suggestion: 'Use Sentry SDK in your application to capture events, or use the Sentry API to send events.',
                title: title,
                message: message,
                level: level,
                tags: tags,
              }, null, 2),
            },
          ],
        };
      }

      case 'sentry_get_recent_errors': {
        const { release, hours = 24 } = args;
        
        log('Getting recent errors:', release ? `release=${release}` : `last ${hours}h`);
        
        const now = new Date();
        const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
        
        let query = `is:unresolved`;
        if (release) {
          query += ` release:${release}`;
        }
        
        const command = `issues list -p ${SENTRY_PROJECT} --query "${query}" --max 50`;
        const output = executeSentry(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                release: release,
                hours: hours,
                since: since.toISOString(),
                results: output,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      }

      default:
        return createErrorResponse(new Error(`Unknown tool: ${name}`), name, args);
    }
  } catch (error) {
    log('Uncaught error in tool handler:', error);
    return createErrorResponse(error, name, args);
  }
});

/**
 * Start server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ESO Log Aggregator Sentry Skill MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
