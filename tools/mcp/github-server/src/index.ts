import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getRepoInfo } from './tools/get-repo-info.js';
import { listPrs } from './tools/list-prs.js';
import { viewPr } from './tools/view-pr.js';
import { createPr } from './tools/create-pr.js';
import { getReviewThreads } from './tools/get-review-threads.js';
import { resolveThread } from './tools/resolve-thread.js';

const server = new McpServer({ name: 'eso-logs-github', version: '1.0.0' });

// ---------------------------------------------------------------------------
// github_get_repo_info
// ---------------------------------------------------------------------------
server.tool(
  'github_get_repo_info',
  'Get repository metadata: owner, name, default branch, URL, and description',
  {},
  async () => getRepoInfo(),
);

// ---------------------------------------------------------------------------
// github_list_prs
// ---------------------------------------------------------------------------
server.tool(
  'github_list_prs',
  'List pull requests with optional filters for state, branch, author, label, or search text',
  {
    state: z
      .enum(['open', 'closed', 'all'])
      .default('open')
      .describe('PR state filter'),
    branch: z
      .string()
      .optional()
      .describe('Filter by head branch name'),
    author: z
      .string()
      .optional()
      .describe('Filter by PR author username'),
    label: z
      .string()
      .optional()
      .describe('Filter by label name'),
    search: z
      .string()
      .optional()
      .describe('Search text to match against PR title or number'),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(10)
      .describe('Maximum number of PRs to return (1-100)'),
  },
  async (params) => listPrs(params),
);

// ---------------------------------------------------------------------------
// github_view_pr
// ---------------------------------------------------------------------------
server.tool(
  'github_view_pr',
  'View full details of a pull request including reviews, status checks, and diff stats',
  {
    number: z
      .number()
      .int()
      .positive()
      .describe('PR number to view'),
  },
  async (params) => viewPr(params),
);

// ---------------------------------------------------------------------------
// github_create_pr
// ---------------------------------------------------------------------------
server.tool(
  'github_create_pr',
  'Create a new pull request from a branch',
  {
    title: z
      .string()
      .describe('Title for the pull request'),
    body: z
      .string()
      .optional()
      .describe('Markdown body/description for the PR'),
    head: z
      .string()
      .describe('Branch name to create the PR from'),
    base: z
      .string()
      .default('main')
      .describe('Target branch to merge into (default: main)'),
    draft: z
      .boolean()
      .default(false)
      .describe('Whether to create the PR as a draft'),
  },
  async (params) => createPr(params),
);

// ---------------------------------------------------------------------------
// github_get_review_threads
// ---------------------------------------------------------------------------
server.tool(
  'github_get_review_threads',
  'Get review comment threads on a PR, optionally filtered by resolution status',
  {
    number: z
      .number()
      .int()
      .positive()
      .describe('PR number to get review threads for'),
    filter: z
      .enum(['unresolved', 'resolved', 'all'])
      .default('all')
      .describe('Filter threads by resolution status'),
  },
  async (params) => getReviewThreads(params),
);

// ---------------------------------------------------------------------------
// github_resolve_thread
// ---------------------------------------------------------------------------
server.tool(
  'github_resolve_thread',
  'Resolve a review comment thread by its GraphQL node ID',
  {
    threadId: z
      .string()
      .describe('GraphQL node ID of the review thread to resolve'),
  },
  async (params) => resolveThread(params),
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
