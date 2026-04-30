import { githubGet } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

interface RepoResponse {
  owner: { login: string };
  name: string;
  default_branch: string;
  html_url: string;
  description: string | null;
}

export async function getRepoInfo(): Promise<ToolResult> {
  try {
    const repo = await githubGet<RepoResponse>('/');
    return ok({
      owner: repo.owner.login,
      name: repo.name,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      description: repo.description,
    });
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
