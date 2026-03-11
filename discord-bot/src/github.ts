/**
 * GitHub Issues integration for Discord ticket bot.
 * Uses the GitHub REST API v3.
 */

import type { Env, GitHubIssue, TicketPriority } from './types.js';

const GITHUB_API = 'https://api.github.com';

/**
 * Creates a GitHub issue for a bug report ticket.
 * Returns the created issue (number + URL) or null on failure.
 */
export async function createGitHubIssue(
  env: Env,
  ticketId: string,
  title: string,
  description: string,
  username: string,
  userId: string,
  priority: TicketPriority | undefined,
): Promise<GitHubIssue | null> {
  const body = buildIssueBody(ticketId, title, description, username, userId, priority);

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: `[Discord Ticket #${ticketId}] ${title}`,
          body,
          labels: ['bug', 'discord-ticket'],
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[github] create issue failed ${res.status}: ${text}`);
      return null;
    }

    const issue = (await res.json()) as { number: number; html_url: string; title: string };
    return {
      number: issue.number,
      html_url: issue.html_url,
      title: issue.title,
    };
  } catch (err) {
    console.error('[github] createGitHubIssue error:', err);
    return null;
  }
}

/**
 * Adds a label to an existing GitHub issue.
 */
export async function addGitHubIssueLabel(
  env: Env,
  issueNumber: number,
  labels: string[],
): Promise<void> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}/labels`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ labels }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[github] add label failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('[github] addGitHubIssueLabel error:', err);
  }
}

/**
 * Adds a comment to an existing GitHub issue.
 */
export async function addGitHubIssueComment(
  env: Env,
  issueNumber: number,
  body: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ body }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[github] add comment failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('[github] addGitHubIssueComment error:', err);
  }
}

/**
 * Creates a GitHub Discussion for a Feature or Feedback ticket when staff acknowledges it.
 * Uses the GraphQL API — Discussions are the right place for community ideas, not Issues.
 *
 * Category matching (case-insensitive, first match wins):
 *   Feature → "Feature Requests", "Ideas", "Suggestions"
 *   Feedback → "Feedback", "General", "Q&A"
 */
export async function createGitHubDiscussionOnAcknowledge(
  env: Env,
  ticketId: string,
  category: 'Feature' | 'Feedback',
  title: string,
  description: string,
  username: string,
  userId: string,
  acknowledgedBy: string,
): Promise<GitHubIssue | null> {
  const categoryEmoji = category === 'Feature' ? '💡' : '💬';

  try {
    // 1. Fetch repo node_id + available discussion categories in one query
    const metaRes = await githubGraphQL<{
      data: {
        repository: {
          id: string;
          discussionCategories: {
            nodes: { id: string; name: string }[];
          };
        };
      };
    }>(env, `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
          discussionCategories(first: 25) {
            nodes { id name }
          }
        }
      }
    `, { owner: env.GITHUB_OWNER, repo: env.GITHUB_REPO });

    const repo = metaRes?.data?.repository;
    if (!repo) {
      console.error('[github] could not fetch repo metadata for discussions');
      return null;
    }

    // 2. Pick the best matching category
    const preferredNames =
      category === 'Feature'
        ? ['feature requests', 'ideas', 'suggestions', 'feature']
        : ['feedback', 'general', 'q&a', 'general feedback'];

    const categories = repo.discussionCategories.nodes;
    const matched =
      preferredNames
        .map((name) => categories.find((c) => c.name.toLowerCase() === name))
        .find(Boolean) ?? categories[0]; // fallback to first available

    if (!matched) {
      console.error('[github] no discussion categories found — enable Discussions on the repo');
      return null;
    }

    // 3. Build the discussion body
    const body =
      buildIssueBody(ticketId, title, description, username, userId, undefined) +
      `\n\n---\n*Acknowledged by staff: **${acknowledgedBy}***\n*Category: ${category}*`;

    // 4. Create the discussion
    const createRes = await githubGraphQL<{
      data: { createDiscussion: { discussion: { number: number; url: string; title: string } } };
    }>(env, `
      mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repoId
          categoryId: $categoryId
          title: $title
          body: $body
        }) {
          discussion { number url title }
        }
      }
    `, {
      repoId: repo.id,
      categoryId: matched.id,
      title: `${categoryEmoji} [Discord Ticket #${ticketId}] ${title}`,
      body,
    });

    const discussion = createRes?.data?.createDiscussion?.discussion;
    if (!discussion) {
      console.error('[github] createDiscussion mutation returned no data');
      return null;
    }

    return {
      number: discussion.number,
      html_url: discussion.url,
      title: discussion.title,
    };
  } catch (err) {
    console.error('[github] createGitHubDiscussionOnAcknowledge error:', err);
    return null;
  }
}

/** Thin GraphQL client for the GitHub API. */
async function githubGraphQL<T>(env: Env, query: string, variables: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ESO-Toolkit-DiscordBot/1.0',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[github] graphql failed ${res.status}: ${text}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error('[github] graphql error:', err);
    return null;
  }
}

function buildIssueBody(
  ticketId: string,
  title: string,
  description: string,
  username: string,
  userId: string,
  priority: TicketPriority | undefined,
): string {
  const priorityBadge = priority ? `**Priority:** ${priority}` : '';

  return `## Discord Support Ticket #${ticketId}

**Reported by:** ${username} (Discord ID: \`${userId}\`)
${priorityBadge}

---

## Description

${description}

---

*This issue was automatically created from a Discord support ticket in the ESO Toolkit server.*
*Ticket title: ${title}*`;
}
