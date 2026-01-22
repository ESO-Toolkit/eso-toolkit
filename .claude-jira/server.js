#!/usr/bin/env node

/**
 * ESO Log Aggregator - Jira Integration Skill (MCP Server)
 * 
 * This MCP server provides tools for GitHub Copilot to interact with Jira
 * work items using the Atlassian CLI (acli).
 * 
 * Compatible with: GitHub Copilot (VS Code) via Agent Skills standard
 * 
 * Tools provided:
 * - jira_view_workitem: View specific Jira tickets
 * - jira_search_workitems: Search using JQL queries
 * - jira_transition_workitem: Move tickets between states
 * - jira_comment_workitem: Add comments to tickets
 * - jira_link_workitems: Link related tickets
 * - jira_get_epic_status: Check epic progress
 * - jira_assign_workitem: Assign tickets
 * - jira_update_story_points: Update story point estimates
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve('..');
const PROJECT_KEY = 'ESO';

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[Jira Skill]', new Date().toISOString(), ...args);
}

// Simple cache for reducing acli calls
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Validation helpers
 */
function validateJiraKey(key) {
  const keyPattern = /^[A-Z]+-\d+$/;
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Jira key is required and must be a string' };
  }
  if (!keyPattern.test(key)) {
    return { 
      valid: false, 
      error: `Invalid Jira key format: "${key}". Expected format: PROJECT-123 (e.g., ESO-372)`,
      suggestion: 'Use format: PROJECT-NUMBER (e.g., ESO-372, ESO-449)'
    };
  }
  return { valid: true };
}

function validateStoryPoints(points) {
  if (typeof points !== 'number' || points < 0 || points > 100) {
    return { 
      valid: false, 
      error: `Invalid story points: ${points}. Must be a positive number between 0 and 100`,
      suggestion: 'Typical values: 1, 2, 3, 5, 8, 13, 21'
    };
  }
  return { valid: true };
}

function validateJQL(jql) {
  if (!jql || typeof jql !== 'string' || jql.trim().length === 0) {
    return { 
      valid: false, 
      error: 'JQL query is required and cannot be empty',
      suggestion: 'Example: "project = ESO AND status = \'To Do\'"'
    };
  }
  return { valid: true };
}

/**
 * Create error response with context and recovery suggestions
 */
function createErrorResponse(error, tool, args = {}) {
  const errorInfo = {
    error: true,
    tool: tool,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  // Add recovery suggestions based on error type
  if (error.message.includes('acli command failed')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Check acli authentication: acli jira auth status';
    errorInfo.helpCommand = 'acli jira auth login';
  } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
    errorInfo.recoverable = false;
    errorInfo.suggestion = `Work item "${args.key || args.epicKey}" may not exist or you don't have permission to access it`;
  } else if (error.message.includes('transition')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = `Status "${args.targetStatus}" may not be a valid transition. Check available transitions for this work item.`;
  } else {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Retry the operation or check acli installation';
  }

  log('Error:', errorInfo);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorInfo, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Execute acli command with caching support
 */
function executeAcli(command, useCache = false, parseJson = false) {
  log('Executing:', command);
  
  // Check cache if enabled
  if (useCache) {
    const cached = cache.get(command);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      log('Cache hit:', command.substring(0, 50) + '...');
      return cached.result;
    }
  }
  
  try {
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    let output = result.trim();
    
    if (parseJson) {
      try {
        output = JSON.parse(output);
      } catch (e) {
        log('JSON parse failed, returning raw text');
        output = { raw: output };
      }
    }
    
    // Cache if enabled
    if (useCache) {
      cache.set(command, { result: output, timestamp: Date.now() });
      log('Cached result for:', command.substring(0, 50) + '...');
    }
    
    log('Command succeeded, output length:', output.length || JSON.stringify(output).length);
    return output;
  } catch (error) {
    const errorMessage = `acli command failed: ${error.message}`;
    const stderr = error.stderr ? `\nStderr: ${error.stderr}` : '';
    log('Command failed:', errorMessage + stderr);
    throw new Error(errorMessage + stderr);
  }
}

/**
 * Parse acli workitem view output to structured format
 */
function parseWorkitemView(output) {
  const lines = output.split('\n');
  const workitem = {
    key: '',
    type: '',
    summary: '',
    status: '',
    description: '',
    assignee: '',
    reporter: '',
    storyPoints: null,
    created: '',
    updated: '',
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Key:')) {
      workitem.key = trimmed.replace('Key:', '').trim();
    } else if (trimmed.startsWith('Type:')) {
      workitem.type = trimmed.replace('Type:', '').trim();
    } else if (trimmed.startsWith('Summary:')) {
      workitem.summary = trimmed.replace('Summary:', '').trim();
    } else if (trimmed.startsWith('Status:')) {
      workitem.status = trimmed.replace('Status:', '').trim();
    } else if (trimmed.startsWith('Assignee:')) {
      workitem.assignee = trimmed.replace('Assignee:', '').trim();
    } else if (trimmed.startsWith('Reporter:')) {
      workitem.reporter = trimmed.replace('Reporter:', '').trim();
    } else if (trimmed.startsWith('Story Points:')) {
      const points = trimmed.replace('Story Points:', '').trim();
      workitem.storyPoints = points ? parseFloat(points) : null;
    } else if (trimmed.startsWith('Created:')) {
      workitem.created = trimmed.replace('Created:', '').trim();
    } else if (trimmed.startsWith('Updated:')) {
      workitem.updated = trimmed.replace('Updated:', '').trim();
    } else if (trimmed.startsWith('Description:')) {
      // Description might be multi-line
      const descStartIndex = lines.indexOf(line);
      const descLines = [];
      for (let i = descStartIndex + 1; i < lines.length; i++) {
        if (lines[i].trim().match(/^[A-Z][a-z]+:/)) break;
        descLines.push(lines[i]);
      }
      workitem.description = descLines.join('\n').trim();
    }
  }
  
  return workitem;
}

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-jira',
    version: '1.0.0',
    description: 'Jira work item management for ESO Log Aggregator project. Provides 8 tools for automated Jira workflows including viewing tickets, searching, status transitions, commenting, linking, epic tracking, and assignment.',
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
        name: 'jira_view_workitem',
        description: 'View details of a specific Jira work item. Returns key, type, summary, status, description, assignee, story points, and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Jira work item key (e.g., "ESO-372", "ESO-449")',
            },
          },
          required: ['key'],
        },
      },
      {
        name: 'jira_search_workitems',
        description: 'Search for Jira work items using JQL (Jira Query Language). Returns array of work items with key fields.',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'JQL query string (e.g., "project = ESO AND status = \'To Do\'")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
              default: 50,
            },
          },
          required: ['jql'],
        },
      },
      {
        name: 'jira_transition_workitem',
        description: 'Transition a work item to a different status (e.g., "To Do" → "In Progress" → "Done").',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Jira work item key (e.g., "ESO-372")',
            },
            targetStatus: {
              type: 'string',
              description: 'Target status name (e.g., "In Progress", "Done", "In Review")',
            },
          },
          required: ['key', 'targetStatus'],
        },
      },
      {
        name: 'jira_comment_workitem',
        description: 'Add a comment to a Jira work item. Supports markdown formatting.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Jira work item key (e.g., "ESO-372")',
            },
            comment: {
              type: 'string',
              description: 'Comment text (markdown supported)',
            },
          },
          required: ['key', 'comment'],
        },
      },
      {
        name: 'jira_link_workitems',
        description: 'Create a link between two Jira work items (e.g., "blocks", "relates to").',
        inputSchema: {
          type: 'object',
          properties: {
            sourceKey: {
              type: 'string',
              description: 'Source work item key (e.g., "ESO-372")',
            },
            targetKey: {
              type: 'string',
              description: 'Target work item key (e.g., "ESO-449")',
            },
            linkType: {
              type: 'string',
              description: 'Link type (e.g., "blocks", "relates to", "depends on")',
              default: 'relates to',
            },
          },
          required: ['sourceKey', 'targetKey'],
        },
      },
      {
        name: 'jira_get_epic_status',
        description: 'Get status summary of an epic including child stories/tasks and completion percentage.',
        inputSchema: {
          type: 'object',
          properties: {
            epicKey: {
              type: 'string',
              description: 'Epic work item key (e.g., "ESO-368")',
            },
          },
          required: ['epicKey'],
        },
      },
      {
        name: 'jira_assign_workitem',
        description: 'Assign a work item to a user. Use "unassigned" to remove assignment.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Jira work item key (e.g., "ESO-372")',
            },
            assignee: {
              type: 'string',
              description: 'Username to assign to, or "unassigned" to remove assignment',
            },
          },
          required: ['key', 'assignee'],
        },
      },
      {
        name: 'jira_update_story_points',
        description: 'Update the story point estimate for a work item.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Jira work item key (e.g., "ESO-372")',
            },
            storyPoints: {
              type: 'number',
              description: 'Story point value (typically 1, 2, 3, 5, 8, 13, etc.)',
            },
          },
          required: ['key', 'storyPoints'],
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
      case 'jira_view_workitem': {
        const { key } = args;
        
        // Validate input
        const validation = validateJiraKey(key);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Viewing work item:', key);
        
        const output = executeAcli(`acli jira workitem view ${key}`, true); // Enable caching
        const workitem = parseWorkitemView(output);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workitem, null, 2),
            },
          ],
        };
      }

      case 'jira_search_workitems': {
        const { jql, maxResults = 50 } = args;
        
        // Validate input
        const validation = validateJQL(jql);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Searching with JQL:', jql.substring(0, 50) + '...');
        
        const escapedJql = jql.replace(/'/g, "\\'");
        const command = `acli jira workitem search --jql "${escapedJql}" --fields key,summary,type,status,assignee --max-results ${maxResults}`;
        const output = executeAcli(command, true); // Enable caching
        
        // Parse output (acli returns table format, we'll parse it)
        const lines = output.split('\n').filter(l => l.trim());
        const workitems = [];
        
        // Skip header lines
        const dataLines = lines.slice(2);
        for (const line of dataLines) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 5) {
            workitems.push({
              key: parts[0],
              summary: parts[1],
              type: parts[2],
              status: parts[3],
              assignee: parts[4],
            });
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: workitems.length,
                workitems: workitems,
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_transition_workitem': {
        const { key, targetStatus } = args;
        
        // Validate input
        const validation = validateJiraKey(key);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        if (!targetStatus || typeof targetStatus !== 'string') {
          return createErrorResponse(new Error('Target status is required'), name, args);
        }
        
        log('Transitioning:', key, '->', targetStatus);
        
        const command = `acli jira workitem transition ${key} --to "${targetStatus}"`;
        const output = executeAcli(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                key: key,
                newStatus: targetStatus,
                message: output,
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_comment_workitem': {
        const { key, comment } = args;        
        // Validate input
        const validation = validateJiraKey(key);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        if (!comment || typeof comment !== 'string') {
          return createErrorResponse(new Error('Comment text is required'), name, args);
        }
        
        log('Adding comment to:', key, '(length:', comment.length, ')');
                const escapedComment = comment.replace(/"/g, '\\"');
        const command = `acli jira workitem comment create -k ${key} -b "${escapedComment}"`;
        const output = executeAcli(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                key: key,
                message: 'Comment added successfully',
                output: output,
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_link_workitems': {
        const { sourceKey, targetKey, linkType = 'relates to' } = args;
        
        // Validate inputs
        const sourceValidation = validateJiraKey(sourceKey);
        if (!sourceValidation.valid) {
          return createErrorResponse(new Error(`Invalid sourceKey: ${sourceValidation.error}`), name, args);
        }
        
        const targetValidation = validateJiraKey(targetKey);
        if (!targetValidation.valid) {
          return createErrorResponse(new Error(`Invalid targetKey: ${targetValidation.error}`), name, args);
        }
        
        log('Linking:', sourceKey, linkType, targetKey);
        
        const command = `acli jira workitem link ${sourceKey} ${targetKey} --link-type "${linkType}"`;
        const output = executeAcli(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sourceKey: sourceKey,
                targetKey: targetKey,
                linkType: linkType,
                message: output,
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_get_epic_status': {
        const { epicKey } = args;
        
        // Validate input
        const validation = validateJiraKey(epicKey);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Getting epic status:', epicKey);
        
        // Get epic details (use cache to improve performance)
        const epicOutput = executeAcli(`acli jira workitem view ${epicKey}`, true);
        const epic = parseWorkitemView(epicOutput);
        
        // Search for child issues
        const jql = `"Epic Link" = ${epicKey}`;
        const escapedJql = jql.replace(/'/g, "\\'");
        const childrenCommand = `acli jira workitem search --jql "${escapedJql}" --fields key,summary,type,status --max-results 100`;
        const childrenOutput = executeAcli(childrenCommand);
        
        // Parse children
        const lines = childrenOutput.split('\n').filter(l => l.trim());
        const children = [];
        const dataLines = lines.slice(2);
        
        let done = 0;
        let inProgress = 0;
        let toDo = 0;
        
        for (const line of dataLines) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 4) {
            const child = {
              key: parts[0],
              summary: parts[1],
              type: parts[2],
              status: parts[3],
            };
            children.push(child);
            
            if (child.status.toLowerCase().includes('done')) {
              done++;
            } else if (child.status.toLowerCase().includes('progress')) {
              inProgress++;
            } else {
              toDo++;
            }
          }
        }
        
        const total = children.length;
        const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                epic: {
                  key: epic.key,
                  summary: epic.summary,
                  status: epic.status,
                },
                children: children,
                summary: {
                  total: total,
                  done: done,
                  inProgress: inProgress,
                  toDo: toDo,
                  completionPercent: completionPercent,
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_assign_workitem': {
        const { key, assignee } = args;
        
        // Validate input
        const validation = validateJiraKey(key);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Assigning:', key, 'to', assignee || 'Unassigned');
        
        const assigneeArg = assignee.toLowerCase() === 'unassigned' ? '--unassigned' : `--assignee ${assignee}`;
        const command = `acli jira workitem assign ${key} ${assigneeArg}`;
        const output = executeAcli(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                key: key,
                assignee: assignee,
                message: output,
              }, null, 2),
            },
          ],
        };
      }

      case 'jira_update_story_points': {
        const { key, storyPoints } = args;        
        // Validate inputs
        const keyValidation = validateJiraKey(key);
        if (!keyValidation.valid) {
          return createErrorResponse(new Error(keyValidation.error), name, args);
        }
        
        const pointsValidation = validateStoryPoints(storyPoints);
        if (!pointsValidation.valid) {
          return createErrorResponse(new Error(pointsValidation.error), name, args);
        }
        
        log('Updating story points:', key, '=', storyPoints);
                const command = `acli jira workitem update ${key} --story-points ${storyPoints}`;
        const output = executeAcli(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                key: key,
                storyPoints: storyPoints,
                message: output,
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
  console.error('ESO Log Aggregator Jira Skill MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
