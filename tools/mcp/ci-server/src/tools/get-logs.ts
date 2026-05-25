import { runShell, getRepoRoot } from '../../../_shared/github-api.js';
import { type ToolResult, ok, fail } from '../../../_shared/types.js';

interface GetLogsParams {
  runId: number;
  jobName?: string;
  failedOnly?: boolean;
  maxLines?: number;
}

export async function getLogs(params: GetLogsParams): Promise<ToolResult> {
  try {
    const repoRoot = getRepoRoot();
    const maxLines = Math.min(Math.max(params.maxLines ?? 500, 1), 5000);
    const failedOnly = params.failedOnly ?? false;

    const args = ['run', 'view', String(params.runId)];
    if (failedOnly) {
      args.push('--log-failed');
    } else {
      args.push('--log');
    }

    let output = await runShell('gh', args, repoRoot);

    // Filter to a specific job if requested
    if (params.jobName) {
      const lines = output.split('\n');
      const filtered = lines.filter((line) => {
        // gh log output lines are prefixed with the job name: "jobName\tstepName\tlogline"
        const lowerLine = line.toLowerCase();
        const lowerJob = params.jobName!.toLowerCase();
        return lowerLine.startsWith(lowerJob) || lowerLine.includes(`\t${lowerJob}\t`);
      });
      output = filtered.length > 0 ? filtered.join('\n') : `No logs found matching job "${params.jobName}"`;
    }

    // Truncate to maxLines
    const lines = output.split('\n');
    const truncated = lines.length > maxLines;
    const result = lines.slice(0, maxLines).join('\n');

    return ok({
      runId: params.runId,
      failedOnly,
      totalLines: lines.length,
      truncated,
      maxLines,
      logs: result,
    });
  } catch (e) {
    return fail((e as Error).message);
  }
}
