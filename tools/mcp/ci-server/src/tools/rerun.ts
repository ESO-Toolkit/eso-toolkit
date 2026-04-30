import { githubPost, githubGet } from '../../../_shared/github-api.js';
import { type ToolResult, ok, fail } from '../../../_shared/types.js';

interface RerunParams {
  runId: number;
  failedOnly?: boolean;
}

interface GitHubRun {
  html_url: string;
  name: string;
  run_number: number;
}

export async function rerun(params: RerunParams): Promise<ToolResult> {
  try {
    const failedOnly = params.failedOnly ?? true;

    const endpoint = failedOnly
      ? `/actions/runs/${params.runId}/rerun-failed-jobs`
      : `/actions/runs/${params.runId}/rerun`;

    await githubPost(endpoint);

    // Fetch the run to get its URL for confirmation
    const run = await githubGet<GitHubRun>(`/actions/runs/${params.runId}`);

    return ok({
      runId: params.runId,
      rerunType: failedOnly ? 'failed-jobs-only' : 'full',
      message: `Successfully triggered ${failedOnly ? 'failed jobs' : 'full'} rerun for "${run.name}" #${run.run_number}`,
      htmlUrl: run.html_url,
    });
  } catch (e) {
    return fail((e as Error).message);
  }
}
