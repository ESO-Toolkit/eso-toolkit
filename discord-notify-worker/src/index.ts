import { Hono } from 'hono';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Env {
  DISCORD_WEBHOOK_URL: string;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_TOKEN: string;
  ZAI_API_KEY: string;
}

const BOT_USERNAME = 'ESO Toolkit';
const BOT_AVATAR_URL = 'https://esotk.com/android-chrome-512x512.png';

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string;
  user: { login: string; avatar_url: string; html_url: string };
  head: { ref: string };
  labels: Array<{ name: string }>;
  additions: number;
  deletions: number;
  changed_files: number;
  milestone: { title: string } | null;
}

interface GitHubWebhookPayload {
  action: string;
  pull_request: PullRequest;
  repository: { owner: { login: string }; name: string };
}

interface GitHubComment {
  body: string | null;
}

// ── Tag mapping ────────────────────────────────────────────────────────────────
// Maps conventional commit types to Discord forum tag IDs
const TAG_MAP: Record<string, string> = {
  feat: '1481632728557555804',
  fix: '1481632728557555805',
  chore: '1481632728557555806',
  refactor: '1481632728557555807',
  docs: '1481632728557555808',
  style: '1481632728557555809',
  test: '1481632728557555810',
  ci: '1481632728557555811',
  perf: '1481632728557555812',
  build: '1481632728586911806',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse conventional commit type from PR title, e.g. "feat(scope): desc" → "feat" */
function parseCommitType(title: string): string | null {
  const match = title.match(/^(\w+)(?:\(.+?\))?[!]?:/);
  return match ? match[1].toLowerCase() : null;
}

/** Verify GitHub webhook HMAC-SHA256 signature */
async function verifySignature(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = `sha256=${Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
  return expected === signature;
}

/** Extract image URLs from GitHub markdown/HTML content */
function extractImages(text: string | null): string[] {
  if (!text) return [];
  const images: string[] = [];
  const seen = new Set<string>();

  const patterns = [
    // Markdown: ![alt](url.png)
    /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s)]*)?)\)/gi,
    // HTML: <img src="url">
    /<img[^>]+src=["'](https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"']*)?)["'][^>]*>/gi,
    // GitHub assets: ![alt](https://github.com/.../assets/...)
    /!\[.*?\]\((https:\/\/github\.com\/[^/]+\/[^/]+\/assets\/[^\s)]+)\)/gi,
    // GitHub user-attachments
    /!\[.*?\]\((https:\/\/github\.com\/user-attachments\/assets\/[^\s)]+)\)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        images.push(match[1]);
      }
    }
  }
  return images;
}

/** Fetch PR comment bodies from GitHub API (issue comments + review comments) */
async function fetchCommentBodies(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
): Promise<string[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const [issueRes, reviewRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
        { headers },
      ),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`,
        { headers },
      ),
    ]);

    const bodies: string[] = [];

    if (issueRes.ok) {
      const comments = (await issueRes.json()) as GitHubComment[];
      for (const c of comments) {
        if (c.body) bodies.push(c.body);
      }
    }

    if (reviewRes.ok) {
      const comments = (await reviewRes.json()) as GitHubComment[];
      for (const c of comments) {
        if (c.body) bodies.push(c.body);
      }
    }

    return bodies;
  } catch {
    return [];
  }
}

/** Generate a friendly, non-technical summary via Z.AI GLM-5 */
async function generateSummary(
  title: string,
  body: string | null,
  apiKey: string,
): Promise<string | null> {
  try {
    const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-5',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'You write friendly Discord update messages for a gaming tool called ESO Toolkit (an Elder Scrolls Online combat log analyzer). Your audience is gamers and guild members who are NOT developers. Write a 2-3 sentence summary of what changed from a user\'s perspective. Use Discord markdown (**bold** for emphasis). Be conversational and enthusiastic but not over the top. Never mention code, files, components, CSS, or technical implementation details. Focus on what users will SEE or EXPERIENCE. If the change is purely technical/internal with no visible user impact, say so briefly.',
          },
          {
            role: 'user',
            content: `Summarize this update for Discord:\n\nTitle: ${title}\n\nDescription:\n${body || 'No description provided.'}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  } catch {
    return null;
  }
}

/** Convert GitHub markdown to Discord-friendly markdown (fallback) */
function toDiscordMarkdown(text: string | null, prUrl: string): string {
  if (!text) return '*No description provided.*';

  let result = text;
  result = result.replace(/^#{1,3}\s+(.+)$/gm, '**$1**');
  result = result.replace(/<br\s*\/?>/gi, '\n');
  result = result.replace(
    /<\/?(?:details|summary|div|span|p|table|thead|tbody|tr|td|th|hr)[^>]*>/gi,
    '',
  );
  result = result.replace(/<img[^>]*>/gi, '');
  result = result.replace(/- \[x\]/gi, '\u2705');
  result = result.replace(/- \[ \]/g, '\u2b1c');
  result = result.replace(/\n{3,}/g, '\n\n');

  if (result.length > 3900) {
    result =
      result.substring(0, 3900) + `\n\n*\u2026 truncated — [view full PR](${prUrl})*`;
  }

  return result.trim();
}

/** Build Discord embed objects for the PR */
function buildEmbeds(pr: PullRequest, description: string, screenshots: string[]) {
  const MERGED_GREEN = 5763719; // #57F287

  const mainEmbed: Record<string, unknown> = {
    title: `#${pr.number} — ${pr.title}`,
    url: pr.html_url,
    description,
    color: MERGED_GREEN,
    author: {
      name: pr.user.login,
      url: pr.user.html_url,
      icon_url: pr.user.avatar_url,
    },
    fields: [] as Array<{ name: string; value: string; inline: boolean }>,
    footer: {
      text: `main ← ${pr.head.ref} · ${pr.changed_files} file${pr.changed_files === 1 ? '' : 's'} changed`,
    },
    timestamp: pr.merged_at,
  };

  const fields = mainEmbed.fields as Array<{
    name: string;
    value: string;
    inline: boolean;
  }>;

  const labels = pr.labels.map((l) => '`' + l.name + '`').join(' ');
  if (labels) {
    fields.push({ name: 'Labels', value: labels, inline: true });
  }

  fields.push({
    name: 'Changes',
    value: `\`+${pr.additions}\` / \`-${pr.deletions}\``,
    inline: true,
  });

  if (pr.milestone) {
    fields.push({ name: 'Milestone', value: pr.milestone.title, inline: true });
  }

  const embeds: Array<Record<string, unknown>> = [mainEmbed];

  // First screenshot on main embed
  if (screenshots.length > 0) {
    mainEmbed.image = { url: screenshots[0] };
  }

  // Additional screenshots (Discord allows up to 10 embeds, same URL for gallery)
  for (let i = 1; i < Math.min(screenshots.length, 9); i++) {
    embeds.push({ url: pr.html_url, image: { url: screenshots[i] } });
  }

  return embeds;
}

// ── App ────────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ status: 'ok', service: 'discord-notify-worker' }));

app.post('/webhook/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  const rawBody = await c.req.text();

  // Verify webhook signature
  const valid = await verifySignature(c.env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const event = c.req.header('x-github-event');
  if (event !== 'pull_request') {
    return c.json({ skipped: true, reason: `Event type: ${event}` });
  }

  const payload: GitHubWebhookPayload = JSON.parse(rawBody);

  // Only process merged PRs
  if (payload.action !== 'closed' || !payload.pull_request.merged_at) {
    return c.json({ skipped: true, reason: 'PR not merged' });
  }

  const pr = payload.pull_request;

  // Parse conventional commit type for tag
  const commitType = parseCommitType(pr.title);
  const tagId = commitType ? TAG_MAP[commitType] : null;
  const appliedTags = tagId ? [tagId] : [];

  // Extract screenshots from PR body + all comments
  const { owner, name: repo } = payload.repository;
  const commentBodies = c.env.GITHUB_TOKEN
    ? await fetchCommentBodies(owner.login, repo, pr.number, c.env.GITHUB_TOKEN)
    : [];
  const allBodies = [pr.body, ...commentBodies];
  const screenshots: string[] = [];
  const seenUrls = new Set<string>();
  for (const body of allBodies) {
    for (const url of extractImages(body)) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        screenshots.push(url);
      }
    }
  }

  // Generate AI summary (with fallback)
  const aiSummary = c.env.ZAI_API_KEY
    ? await generateSummary(pr.title, pr.body, c.env.ZAI_API_KEY)
    : null;
  const description = aiSummary || toDiscordMarkdown(pr.body, pr.html_url);

  // Build embeds
  const embeds = buildEmbeds(pr, description, screenshots);

  // Create forum thread via Discord webhook
  const discordResponse = await fetch(`${c.env.DISCORD_WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: BOT_USERNAME,
      avatar_url: BOT_AVATAR_URL,
      thread_name: `#${pr.number} — ${pr.title}`.substring(0, 100),
      applied_tags: appliedTags,
      embeds,
    }),
  });

  if (!discordResponse.ok) {
    const errText = await discordResponse.text();
    console.error(`Discord API error (${discordResponse.status}): ${errText}`);
    return c.json(
      { error: 'Discord API failed', status: discordResponse.status, detail: errText },
      502,
    );
  }

  const message = (await discordResponse.json()) as { id: string; channel_id: string };
  console.log(`Forum thread created: ${message.channel_id} for PR #${pr.number}`);

  return c.json({
    success: true,
    threadId: message.channel_id,
    prNumber: pr.number,
    commitType: commitType || 'unknown',
    tagApplied: !!tagId,
    aiSummary: !!aiSummary,
    screenshots: screenshots.length,
  });
});

export default app;
