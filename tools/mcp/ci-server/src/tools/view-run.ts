import { githubGet } from '../../../_shared/github-api.js';
import { type ToolResult, ok, fail } from '../../../_shared/types.js';

interface ViewRunParams {
  runId: number;
}

interface GitHubStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: GitHubStep[];
}

interface GitHubRun {
  id: number;
  run_number: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  head_sha: string;
  event: string;
  actor: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  run_attempt: number;
}

interface GitHubJobsResponse {
  total_count: number;
  jobs: GitHubJob[];
}

export async function viewRun(params: ViewRunParams): Promise<ToolResult> {
  try {
    const [run, jobsData] = await Promise.all([
      githubGet<GitHubRun>(`/actions/runs/${params.runId}`),
      githubGet<GitHubJobsResponse>(`/actions/runs/${params.runId}/jobs`),
    ]);

    const summary = {
      id: run.id,
      runNumber: run.run_number,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      headSha: run.head_sha,
      event: run.event,
      actor: run.actor.login,
      attempt: run.run_attempt,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url,
    };

    const jobs = jobsData.jobs.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      conclusion: j.conclusion,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      steps: j.steps.map((s) => ({
        number: s.number,
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
      })),
    }));

    return ok({ run: summary, jobs });
  } catch (e) {
    return fail((e as Error).message);
  }
}
