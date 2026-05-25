import { githubGet } from '../../../_shared/github-api.js';
import { type ToolResult, ok, fail } from '../../../_shared/types.js';

interface RunsParams {
  branch?: string;
  workflow?: string;
  status?: string;
  event?: string;
  limit?: number;
}

interface GitHubWorkflowRun {
  id: number;
  run_number: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  actor: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface GitHubRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

export async function listRuns(params: RunsParams): Promise<ToolResult> {
  try {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 30);

    const query: Record<string, string> = {
      per_page: String(limit),
    };

    if (params.branch) query.branch = params.branch;
    if (params.status) query.status = params.status;
    if (params.event) query.event = params.event;

    const path = params.workflow
      ? `/actions/workflows/${params.workflow}/runs`
      : '/actions/runs';

    const data = await githubGet<GitHubRunsResponse>(path, query);

    const runs = data.workflow_runs.map((r) => ({
      id: r.id,
      runNumber: r.run_number,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      branch: r.head_branch,
      event: r.event,
      actor: r.actor.login,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      htmlUrl: r.html_url,
    }));

    return ok({ totalCount: data.total_count, runs });
  } catch (e) {
    return fail((e as Error).message);
  }
}
