import { githubGraphQL } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

export interface ResolveThreadParams {
  threadId: string;
}

const RESOLVE_MUTATION = `
mutation ($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread {
      id
      isResolved
    }
  }
}`;

interface ResolveMutationResult {
  resolveReviewThread: {
    thread: {
      id: string;
      isResolved: boolean;
    };
  };
}

export async function resolveThread(params: ResolveThreadParams): Promise<ToolResult> {
  try {
    const data = await githubGraphQL<ResolveMutationResult>(RESOLVE_MUTATION, {
      threadId: params.threadId,
    });

    return ok({
      id: data.resolveReviewThread.thread.id,
      isResolved: data.resolveReviewThread.thread.isResolved,
    });
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
