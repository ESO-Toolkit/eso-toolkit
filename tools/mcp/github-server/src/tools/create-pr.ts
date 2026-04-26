import { githubPost } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

export interface CreatePrParams {
  title: string;
  body?: string;
  head: string;
  base?: string;
  draft?: boolean;
}

interface CreatePrResponse {
  number: number;
  html_url: string;
}

export async function createPr(params: CreatePrParams): Promise<ToolResult> {
  try {
    const result = await githubPost<CreatePrResponse>('/pulls', {
      title: params.title,
      body: params.body ?? '',
      head: params.head,
      base: params.base ?? 'main',
      draft: params.draft ?? false,
    });

    return ok({
      number: result.number,
      url: result.html_url,
    });
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
