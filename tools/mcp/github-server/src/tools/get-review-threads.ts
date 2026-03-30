import { githubGet, githubGraphQL } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

export interface GetReviewThreadsParams {
  number: number;
  filter?: 'unresolved' | 'resolved' | 'all';
}

const THREADS_QUERY = `
query ($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 50) {
            nodes {
              author { login }
              body
              createdAt
              path
              line
            }
          }
        }
      }
    }
  }
}`;

interface ThreadsQueryResult {
  repository: {
    pullRequest: {
      reviewThreads: {
        nodes: Array<{
          id: string;
          isResolved: boolean;
          comments: {
            nodes: Array<{
              author: { login: string };
              body: string;
              createdAt: string;
              path: string | null;
              line: number | null;
            }>;
          };
        }>;
      };
    };
  };
}

export async function getReviewThreads(params: GetReviewThreadsParams): Promise<ToolResult> {
  try {
    const filter = params.filter ?? 'all';

    const repoInfo = await githubGet<{
      owner: { login: string };
      name: string;
    }>('/');

    const data = await githubGraphQL<ThreadsQueryResult>(THREADS_QUERY, {
      owner: repoInfo.owner.login,
      name: repoInfo.name,
      number: params.number,
    });

    let threads = data.repository.pullRequest.reviewThreads.nodes;

    if (filter === 'unresolved') {
      threads = threads.filter((t) => !t.isResolved);
    } else if (filter === 'resolved') {
      threads = threads.filter((t) => t.isResolved);
    }

    const result = threads.map((t) => ({
      id: t.id,
      isResolved: t.isResolved,
      comments: t.comments.nodes.map((c) => ({
        author: c.author.login,
        body: c.body,
        createdAt: c.createdAt,
        path: c.path,
        line: c.line,
      })),
    }));

    return ok(result);
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
