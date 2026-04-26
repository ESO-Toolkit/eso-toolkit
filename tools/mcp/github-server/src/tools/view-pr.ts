import { githubGraphQL } from '../../../_shared/github-api.js';
import { ok, fail } from '../../../_shared/types.js';
import type { ToolResult } from '../../../_shared/types.js';

export interface ViewPrParams {
  number: number;
}

const PR_QUERY = `
query ($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      title
      body
      state
      isDraft
      mergeable
      author { login }
      headRefName
      baseRefName
      additions
      deletions
      changedFiles
      commits { totalCount }
      reviews(last: 20) {
        nodes {
          author { login }
          state
        }
      }
      statusCheckRollup: commits(last: 1) {
        nodes {
          commit {
            statusCheckRollup {
              contexts(first: 50) {
                nodes {
                  ... on CheckRun {
                    name
                    conclusion
                  }
                  ... on StatusContext {
                    context
                    state
                  }
                }
              }
            }
          }
        }
      }
      labels(first: 20) {
        nodes { name }
      }
    }
  }
}`;

interface PrQueryResult {
  repository: {
    pullRequest: {
      title: string;
      body: string | null;
      state: string;
      isDraft: boolean;
      mergeable: string;
      author: { login: string };
      headRefName: string;
      baseRefName: string;
      additions: number;
      deletions: number;
      changedFiles: number;
      commits: { totalCount: number };
      reviews: {
        nodes: Array<{ author: { login: string }; state: string }>;
      };
      statusCheckRollup: {
        nodes: Array<{
          commit: {
            statusCheckRollup: {
              contexts: {
                nodes: Array<{
                  name?: string;
                  conclusion?: string | null;
                  context?: string;
                  state?: string;
                }>;
              };
            } | null;
          };
        }>;
      };
      labels: { nodes: Array<{ name: string }> };
    };
  };
}

export async function viewPr(params: ViewPrParams): Promise<ToolResult> {
  try {
    // We need owner/name from the repo slug. Derive from githubGet on root.
    const repoInfo = await (await import('../../../_shared/github-api.js')).githubGet<{
      owner: { login: string };
      name: string;
    }>('/');

    const data = await githubGraphQL<PrQueryResult>(PR_QUERY, {
      owner: repoInfo.owner.login,
      name: repoInfo.name,
      number: params.number,
    });

    const pr = data.repository.pullRequest;

    const statusChecks =
      pr.statusCheckRollup.nodes[0]?.commit?.statusCheckRollup?.contexts?.nodes?.map(
        (node) => ({
          name: node.name ?? node.context ?? 'unknown',
          conclusion: node.conclusion ?? node.state ?? null,
        }),
      ) ?? [];

    return ok({
      title: pr.title,
      body: pr.body,
      state: pr.state,
      isDraft: pr.isDraft,
      mergeable: pr.mergeable,
      author: pr.author.login,
      headRef: pr.headRefName,
      baseRef: pr.baseRefName,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      commits: pr.commits.totalCount,
      reviews: pr.reviews.nodes.map((r) => ({
        author: r.author.login,
        state: r.state,
      })),
      statusChecks,
      labels: pr.labels.nodes.map((l) => l.name),
    });
  } catch (e: unknown) {
    return fail((e as Error).message);
  }
}
