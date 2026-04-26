import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listRuns } from './tools/list-runs.js';
import { viewRun } from './tools/view-run.js';
import { getLogs } from './tools/get-logs.js';
import { searchLogs } from './tools/search-logs.js';
import { rerun } from './tools/rerun.js';

const server = new McpServer({ name: 'eso-logs-ci', version: '1.0.0' });

// ---------------------------------------------------------------------------
// ci_list_runs
// ---------------------------------------------------------------------------
server.tool(
  'ci_list_runs',
  'List recent GitHub Actions workflow runs with optional filters',
  {
    branch: z.string().optional().describe('Filter by branch name'),
    workflow: z.string().optional().describe('Filter by workflow filename (e.g. "pr-checks.yml")'),
    status: z
      .enum(['completed', 'in_progress', 'queued'])
      .optional()
      .describe('Filter by run status'),
    event: z
      .enum(['push', 'pull_request', 'workflow_dispatch', 'schedule'])
      .optional()
      .describe('Filter by trigger event'),
    limit: z.number().optional().describe('Number of runs to return (default 10, max 30)'),
  },
  async (params) => listRuns(params),
);

// ---------------------------------------------------------------------------
// ci_view_run
// ---------------------------------------------------------------------------
server.tool(
  'ci_view_run',
  'View details of a specific workflow run including all jobs and steps',
  {
    runId: z.number().describe('The workflow run ID'),
  },
  async (params) => viewRun(params),
);

// ---------------------------------------------------------------------------
// ci_get_logs
// ---------------------------------------------------------------------------
server.tool(
  'ci_get_logs',
  'Fetch logs for a workflow run, optionally filtered to a specific job or failed steps only',
  {
    runId: z.number().describe('The workflow run ID'),
    jobName: z.string().optional().describe('Filter logs to a specific job name'),
    failedOnly: z
      .boolean()
      .optional()
      .describe('Only return logs from failed steps (default false)'),
    maxLines: z
      .number()
      .optional()
      .describe('Maximum number of log lines to return (default 500, max 5000)'),
  },
  async (params) => getLogs(params),
);

// ---------------------------------------------------------------------------
// ci_search_logs
// ---------------------------------------------------------------------------
server.tool(
  'ci_search_logs',
  'Search workflow run logs with a regex pattern, returning matching lines with context',
  {
    runId: z.number().describe('The workflow run ID'),
    pattern: z.string().describe('Regex pattern to search for in the logs'),
    contextLines: z
      .number()
      .optional()
      .describe('Number of context lines around each match (default 3)'),
  },
  async (params) => searchLogs(params),
);

// ---------------------------------------------------------------------------
// ci_rerun
// ---------------------------------------------------------------------------
server.tool(
  'ci_rerun',
  'Re-run a workflow run (all jobs or only failed jobs)',
  {
    runId: z.number().describe('The workflow run ID to rerun'),
    failedOnly: z
      .boolean()
      .optional()
      .describe('Only rerun failed jobs (default true)'),
  },
  async (params) => rerun(params),
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
