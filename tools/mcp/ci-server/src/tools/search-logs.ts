import { runShell, getRepoRoot } from '../../../_shared/github-api.js';
import { type ToolResult, ok, fail } from '../../../_shared/types.js';

interface SearchLogsParams {
  runId: number;
  pattern: string;
  contextLines?: number;
}

interface Match {
  lineNumber: number;
  line: string;
  context: string[];
}

export async function searchLogs(params: SearchLogsParams): Promise<ToolResult> {
  try {
    const repoRoot = getRepoRoot();
    const contextLines = params.contextLines ?? 3;
    const MAX_MATCHES = 200;

    // Fetch full logs via gh CLI
    const output = await runShell('gh', ['run', 'view', String(params.runId), '--log'], repoRoot);
    const lines = output.split('\n');

    // Build regex from pattern
    let regex: RegExp;
    try {
      regex = new RegExp(params.pattern, 'i');
    } catch {
      return fail(`Invalid regex pattern: ${params.pattern}`);
    }

    // Search through lines
    const matches: Match[] = [];
    for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
      if (regex.test(lines[i])) {
        const ctxStart = Math.max(0, i - contextLines);
        const ctxEnd = Math.min(lines.length - 1, i + contextLines);
        const context = lines.slice(ctxStart, ctxEnd + 1);
        matches.push({
          lineNumber: i + 1,
          line: lines[i],
          context,
        });
      }
    }

    return ok({
      runId: params.runId,
      pattern: params.pattern,
      totalLines: lines.length,
      matchCount: matches.length,
      truncated: matches.length >= MAX_MATCHES,
      matches,
    });
  } catch (e) {
    return fail((e as Error).message);
  }
}
