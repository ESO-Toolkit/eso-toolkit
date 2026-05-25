import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { resolve, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let activeWorktree: string | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRepoRoot(): string {
  // src/index.ts -> worktree-server/src/index.ts -> tools/mcp/worktree-server
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', '..');
}

function getWorktreeDir(): string {
  const repoRoot = getRepoRoot();
  return resolve(repoRoot, '..', basename(repoRoot) + '-worktrees');
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

function resolveWorktreePath(worktreePath: string | undefined): string {
  if (worktreePath) return resolve(worktreePath);
  if (activeWorktree) return activeWorktree;
  throw new Error('No active worktree. Use worktree_list or worktree_create first.');
}

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function ok(data: unknown): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const ALLOWED_COMMANDS = new Set([
  'git',
  'npm',
  'npx',
  'node',
  'pnpm',
  'tsc',
  'eslint',
  'prettier',
]);

function parseArgv(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({ name: 'eso-logs-worktree', version: '1.0.0' });

// ---------------------------------------------------------------------------
// worktree_list
// ---------------------------------------------------------------------------

server.tool(
  'worktree_list',
  'List all git worktrees with branch, HEAD SHA, and active status',
  {},
  async () => {
    try {
      const repoRoot = getRepoRoot();
      const raw = await runGit(['worktree', 'list', '--porcelain'], repoRoot);

      const worktrees: Array<{
        path: string;
        branch: string | null;
        head: string;
        bare: boolean;
        isActive: boolean;
      }> = [];

      const blocks = raw.split(/\n\n+/);
      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.trim().split('\n');
        let wtPath = '';
        let head = '';
        let branch: string | null = null;
        let bare = false;

        for (const line of lines) {
          if (line.startsWith('worktree ')) {
            wtPath = line.slice('worktree '.length);
          } else if (line.startsWith('HEAD ')) {
            head = line.slice('HEAD '.length).substring(0, 7);
          } else if (line.startsWith('branch ')) {
            branch = line.slice('branch '.length).replace('refs/heads/', '');
          } else if (line === 'bare') {
            bare = true;
          }
        }

        if (wtPath) {
          worktrees.push({
            path: wtPath,
            branch,
            head,
            bare,
            isActive: wtPath === activeWorktree,
          });
        }
      }

      return ok(worktrees);
    } catch (err) {
      return fail(`Failed to list worktrees: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_create
// ---------------------------------------------------------------------------

server.tool(
  'worktree_create',
  'Create a new worktree for a ticket branch and set it as active',
  {
    ticket: z.string().describe('Ticket ID, e.g. "ESO-716"'),
    description: z.string().describe('Branch description, e.g. "add-dismiss-button"'),
  },
  async ({ ticket, description }) => {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(ticket)) {
        return fail('Invalid ticket ID. Use only letters, numbers, hyphens, and underscores.');
      }
      if (!/^[a-z0-9-]+$/.test(description)) {
        return fail('Invalid description. Use only lowercase letters, numbers, and hyphens.');
      }

      const repoRoot = getRepoRoot();
      const worktreeDir = getWorktreeDir();

      const branchName = `${ticket}/${description}`.toLowerCase().replace(/\s+/g, '-');
      const wtPath = resolve(worktreeDir, ticket);

      const normalizedWtDir = resolve(worktreeDir) + sep;
      if (!resolve(wtPath).startsWith(normalizedWtDir)) {
        return fail('Invalid ticket ID: path escapes worktree directory.');
      }

      // Fetch latest main
      await runGit(['fetch', 'origin', 'main'], repoRoot);

      // Create worktree
      await runGit(['worktree', 'add', wtPath, '-b', branchName, 'origin/main'], repoRoot);

      activeWorktree = wtPath;

      // Determine port slot: list worktrees and find next available slot
      const listRaw = await runGit(['worktree', 'list', '--porcelain'], repoRoot);
      const worktreeCount = listRaw.split(/\n\n+/).filter((b) => b.trim()).length;
      // Slot 0 is main, new worktrees get subsequent slots
      const slot = worktreeCount - 1;
      const httpPort = 3000 + slot * 2;
      const httpsPort = httpPort + 1;

      return ok({
        path: wtPath,
        branch: branchName,
        slot,
        ports: { http: httpPort, https: httpsPort },
      });
    } catch (err) {
      return fail(`Failed to create worktree: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_run
// ---------------------------------------------------------------------------

server.tool(
  'worktree_run',
  'Run a command in a worktree directory (refuses to run in main repo)',
  {
    command: z.string().describe('Command to execute (e.g. "npm install", "git status")'),
    worktreePath: z.string().optional().describe('Worktree path (defaults to active worktree)'),
  },
  async ({ command, worktreePath }) => {
    try {
      const resolved = resolveWorktreePath(worktreePath);
      const repoRoot = getRepoRoot();

      if (resolve(resolved) === resolve(repoRoot)) {
        return fail('Refusing to run command in main repo. Use a worktree path instead.');
      }

      const argv = parseArgv(command);
      if (argv.length === 0) {
        return fail('Empty command.');
      }

      const executable = basename(argv[0]);
      if (!ALLOWED_COMMANDS.has(executable)) {
        return fail(
          `Command "${executable}" is not in the allowlist. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`,
        );
      }

      const { stdout, stderr } = await execFileAsync(argv[0], argv.slice(1), {
        cwd: resolved,
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stdout) {
        return fail(stderr.trim());
      }

      return ok(stdout.trim() + (stderr ? `\n\nSTDERR:\n${stderr.trim()}` : ''));
    } catch (err) {
      const error = err as Error & { stderr?: string };
      return fail(error.stderr?.trim() || error.message);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_guard
// ---------------------------------------------------------------------------

server.tool(
  'worktree_guard',
  'Check if a path is inside the main repo (warning if worktrees exist)',
  {
    path: z.string().describe('Path to check'),
  },
  async ({ path: checkPath }) => {
    try {
      const repoRoot = getRepoRoot();
      const resolved = resolve(checkPath);

      // Check if path is inside main repo
      const normalizedRoot = resolve(repoRoot);
      const isInMainRepo =
        resolved === normalizedRoot ||
        resolved.startsWith(normalizedRoot + '\\') ||
        resolved.startsWith(normalizedRoot + '/');

      if (!isInMainRepo) {
        return ok('Path is safe to edit.');
      }

      // Check if worktrees exist (beyond main)
      const raw = await runGit(['worktree', 'list', '--porcelain'], repoRoot);
      const worktreeCount = raw.split(/\n\n+/).filter((b) => b.trim()).length;

      if (worktreeCount > 1) {
        return ok(
          'Path is in main repo. You have active worktrees \u2014 use a worktree path instead.',
        );
      }

      return ok('Path is safe to edit.');
    } catch (err) {
      return fail(`Guard check failed: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_push
// ---------------------------------------------------------------------------

server.tool(
  'worktree_push',
  'Push the current branch in a worktree to origin (refuses to push main)',
  {
    worktreePath: z.string().optional().describe('Worktree path (defaults to active worktree)'),
    force: z.boolean().optional().default(false).describe('Use --force-with-lease'),
  },
  async ({ worktreePath, force }) => {
    try {
      const resolved = resolveWorktreePath(worktreePath);

      // Safety: refuse to push main
      const branch = await runGit(['branch', '--show-current'], resolved);

      if (branch === 'main' || branch === 'master') {
        return fail(`Refusing to push branch "${branch}". Only push feature branches.`);
      }

      if (!branch || /^-/.test(branch) || !/^[\w./-]+$/.test(branch)) {
        return fail(`Invalid branch name: "${branch}".`);
      }

      const pushArgs = ['push', 'origin', 'HEAD'];
      if (force) {
        pushArgs.push('--force-with-lease');
      }

      const result = await runGit(pushArgs, resolved);
      return ok(result || `Pushed ${branch} to origin successfully.`);
    } catch (err) {
      return fail(`Push failed: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_status
// ---------------------------------------------------------------------------

server.tool(
  'worktree_status',
  'Show git status and recent commits in a worktree',
  {
    worktreePath: z.string().optional().describe('Worktree path (defaults to active worktree)'),
  },
  async ({ worktreePath }) => {
    try {
      const resolved = resolveWorktreePath(worktreePath);

      const [status, log] = await Promise.all([
        runGit(['status', '--short'], resolved),
        runGit(['log', '--oneline', '-5'], resolved),
      ]);

      return ok(`=== Status ===\n${status || '(clean)'}\n\n=== Recent Commits ===\n${log}`);
    } catch (err) {
      return fail(`Status check failed: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// worktree_diff
// ---------------------------------------------------------------------------

server.tool(
  'worktree_diff',
  'Show git diff in a worktree (staged or unstaged)',
  {
    worktreePath: z.string().optional().describe('Worktree path (defaults to active worktree)'),
    staged: z
      .boolean()
      .optional()
      .default(false)
      .describe('Show staged changes instead of unstaged'),
  },
  async ({ worktreePath, staged }) => {
    try {
      const resolved = resolveWorktreePath(worktreePath);

      const diffArgs = ['diff'];
      if (staged) {
        diffArgs.push('--staged');
      }

      let diff = await runGit(diffArgs, resolved);

      // Truncate at 500KB
      const MAX_SIZE = 500 * 1024;
      if (diff.length > MAX_SIZE) {
        diff = diff.substring(0, MAX_SIZE) + '\n\n... [truncated at 500KB] ...';
      }

      return ok(diff || '(no changes)');
    } catch (err) {
      return fail(`Diff failed: ${(err as Error).message}`);
    }
  },
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
