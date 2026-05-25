import { githubGet } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

export interface ListPrsParams {
  state?: 'open' | 'closed' | 'all';
  branch?: string;
  author?: string;
  label?: string;
  search?: string;
  limit?: number;
}

interface PrItem {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
}

export async function listPrs(params: ListPrsParams = {}): Promise<ToolResult> {
  try {
    const state = params.state ?? 'open';
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);

    const query: Record<string, string> = {
      state,
      per_page: String(limit),
      sort: 'updated',
      direction: 'desc',
    };

    if (params.branch) query.head = params.branch;

    const prs = await githubGet<PrItem[]>('/pulls', query);

    let filtered = prs;

    if (params.author) {
      const author = params.author.toLowerCase();
      filtered = filtered.filter((pr) => pr.user.login.toLowerCase() === author);
    }

    if (params.label) {
      const label = params.label.toLowerCase();
      filtered = filtered.filter((pr) =>
        pr.labels.some((l) => l.name.toLowerCase() === label),
      );
    }

    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.title.toLowerCase().includes(search) ||
          String(pr.number).includes(search),
      );
    }

    const result = filtered.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      branch: pr.head.ref,
      base: pr.base.ref,
      draft: pr.draft,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      labels: pr.labels.map((l) => l.name),
    }));

    return ok(result);
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
