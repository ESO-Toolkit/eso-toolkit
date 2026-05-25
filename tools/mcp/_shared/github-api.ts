import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_API = 'https://api.github.com';
const COMMAND_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Repo root resolution
// ---------------------------------------------------------------------------

export function getRepoRoot(): string {
  const thisDir = resolve(fileURLToPath(import.meta.url), '..');
  return resolve(thisDir, '..', '..', '..');
}

// ---------------------------------------------------------------------------
// Token resolution: env → gh auth token
// ---------------------------------------------------------------------------

let cachedToken: string | undefined;
let cachedSlug: string | undefined;

function runShell(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: COMMAND_TIMEOUT }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || stdout?.trim() || err.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function getToken(): Promise<string> {
  const envToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (envToken) return envToken;
  const repoRoot = getRepoRoot();
  return runShell('gh', ['auth', 'token'], repoRoot);
}

async function getRepoSlug(): Promise<string> {
  const repoRoot = getRepoRoot();
  const url = await runShell('git', ['remote', 'get-url', 'origin'], repoRoot);
  // Handle SSH (git@github.com:owner/repo.git) and HTTPS (https://github.com/owner/repo.git)
  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse GitHub repo from remote: ${url}`);
  return match[1];
}

async function ensureAuth(): Promise<{ token: string; slug: string }> {
  if (!cachedToken) cachedToken = await getToken();
  if (!cachedSlug) cachedSlug = await getRepoSlug();
  return { token: cachedToken, slug: cachedSlug };
}

// ---------------------------------------------------------------------------
// Error sanitization (redact tokens)
// ---------------------------------------------------------------------------

function sanitizeErrorBody(text: string, maxLen = 500): string {
  const redacted = text
    .replace(/ghp_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/gho_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  return redacted.length > maxLen ? redacted.slice(0, maxLen) + '...' : redacted;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'eso-logs-mcp',
  };
}

export async function githubGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const { token, slug } = await ensureAuth();
  const url = new URL(`${GITHUB_API}/repos/${slug}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { headers: buildHeaders(token) });
  if (!res.ok) {
    const body = sanitizeErrorBody(await res.text());
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function githubPost<T>(path: string, body?: unknown): Promise<T> {
  const { token, slug } = await ensureAuth();
  const url = `${GITHUB_API}/repos/${slug}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(token), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = sanitizeErrorBody(await res.text());
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function githubGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { token } = await ensureAuth();
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...buildHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = sanitizeErrorBody(await res.text());
    throw new Error(`GitHub GraphQL ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('GraphQL response missing data');
  return json.data;
}

export async function githubGetRaw(path: string, params?: Record<string, string>): Promise<ArrayBuffer> {
  const { token, slug } = await ensureAuth();
  const url = new URL(`${GITHUB_API}/repos/${slug}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { ...buildHeaders(token), Accept: 'application/vnd.github.v3+json' },
    redirect: 'follow',
  });
  if (!res.ok) {
    const body = sanitizeErrorBody(await res.text());
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.arrayBuffer();
}

export { runShell };
