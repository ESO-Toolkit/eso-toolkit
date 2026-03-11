#!/usr/bin/env node
/**
 * Backfill Discord #updates channel with summaries for the last N merged PRs.
 * Uses DeepSeek for AI summaries and posts via webhook with the same embed
 * format as the discord-pr-notify workflow.
 *
 * Usage:
 *   GITHUB_TOKEN=... DEEPSEEK_API_KEY=... DISCORD_WEBHOOK=... node scripts/backfill-discord-updates.cjs
 */

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_COUNT = parseInt(process.env.PR_COUNT || '25', 10);
const OWNER = 'ESO-Toolkit';
const REPO = 'eso-toolkit';
const MERGED_GREEN = 5763719; // #57F287
const WEBHOOK_AVATAR_URL = 'https://cdn.discordapp.com/avatars/1480832993613578322/e3c37b8e3c1cf5389ef3a6c3e014e11a.png';

if (!DISCORD_WEBHOOK) { console.error('❌ DISCORD_WEBHOOK is required'); process.exit(1); }
if (!GITHUB_TOKEN) { console.error('❌ GITHUB_TOKEN is required'); process.exit(1); }

// ── GitHub fetch helper ──────────────────────────────────────────────────────
async function ghFetch(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return res.json();
}

// ── Extract image URLs from markdown/HTML ────────────────────────────────────
function extractImages(text) {
  if (!text) return [];
  const images = [];
  const seen = new Set();

  const add = (url) => { if (url && !seen.has(url)) { seen.add(url); images.push(url); } };

  // Markdown images with explicit extension: ![alt](url.png)
  for (const m of text.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s)]*)?)\)/gi)) add(m[1]);
  // HTML <img src="..."> with explicit extension
  for (const m of text.matchAll(/<img[^>]+src=["'](https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"']*)?)["'][^>]*>/gi)) add(m[1]);
  // GitHub user-attachments in markdown: ![alt](https://github.com/user-attachments/assets/...)
  for (const m of text.matchAll(/!\[.*?\]\((https:\/\/github\.com\/user-attachments\/assets\/[^\s)]+)\)/gi)) add(m[1]);
  // GitHub user-attachments in HTML <img> tags (most common when drag-dropping into comments)
  for (const m of text.matchAll(/<img[^>]+src=["'](https:\/\/github\.com\/user-attachments\/assets\/[^\s"']+)["'][^>]*>/gi)) add(m[1]);
  // GitHub repo asset URLs (legacy format)
  for (const m of text.matchAll(/!\[.*?\]\((https:\/\/github\.com\/[^/]+\/[^/]+\/assets\/[^\s)]+)\)/gi)) add(m[1]);

  return images;
}

// ── DeepSeek summary ─────────────────────────────────────────────────────────
async function generateSummary(title, body) {
  if (!DEEPSEEK_API_KEY) return null;

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You write friendly Discord update messages for a gaming tool called ESO Toolkit (an Elder Scrolls Online combat log analyzer). Your audience is gamers and guild members who are NOT developers. Write a 2-3 sentence summary of what changed from a user's perspective. Use Discord markdown (**bold** for emphasis). Be conversational and enthusiastic but not over the top. Never mention code, files, components, CSS, or technical implementation details. Focus on what users will SEE or EXPERIENCE. If the change is purely technical/internal with no visible user impact, say so briefly.`,
          },
          {
            role: 'user',
            content: `Summarize this update for Discord:\n\nTitle: ${title}\n\nDescription:\n${body || 'No description provided.'}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`   ⚠️  DeepSeek error (${res.status}) for "${title}"`);
      return null;
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.warn(`   ⚠️  DeepSeek failed for "${title}": ${err.message}`);
    return null;
  }
}

// ── Fallback: convert GitHub markdown → Discord markdown ─────────────────────
function toDiscordMarkdown(text, prUrl) {
  if (!text) return '*No description provided.*';
  let result = text
    .replace(/^#{1,3}\s+(.+)$/gm, '**$1**')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:details|summary|div|span|p|table|thead|tbody|tr|td|th|hr)[^>]*>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/- \[x\]/gi, '✅')
    .replace(/- \[ \]/g, '⬜')
    .replace(/\n{3,}/g, '\n\n');
  if (result.length > 3900) result = result.substring(0, 3900) + `\n\n*… truncated — [view full PR](${prUrl})*`;
  return result.trim();
}

// ── Post one embed to Discord ─────────────────────────────────────────────────
async function postToDiscord(pr, screenshots, description) {
  const labels = pr.labels.map((l) => `\`${typeof l === 'string' ? l : l.name}\``).join(' ');

  const mainEmbed = {
    title: `#${pr.number} — ${pr.title}`,
    url: pr.html_url,
    description: `${description}\n\n🔗 [View Pull Request on GitHub](${pr.html_url})`,
    color: MERGED_GREEN,
    author: {
      name: pr.user.login,
      url: `https://github.com/${pr.user.login}`,
      icon_url: pr.user.avatar_url,
    },
    thumbnail: {
      url: pr.user.avatar_url,
    },
    fields: [],
    footer: {
      text: `main ← ${pr.head.ref} · ${pr.changed_files} file${pr.changed_files === 1 ? '' : 's'} changed`,
      icon_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    },
    timestamp: pr.merged_at,
  };

  if (labels) mainEmbed.fields.push({ name: 'Labels', value: labels, inline: true });
  mainEmbed.fields.push({ name: 'Changes', value: `\`+${pr.additions}\` / \`-${pr.deletions}\``, inline: true });

  const embeds = [mainEmbed];
  if (screenshots.length > 0) mainEmbed.image = { url: screenshots[0] };
  for (let i = 1; i < Math.min(screenshots.length, 9); i++) {
    embeds.push({ url: pr.html_url, image: { url: screenshots[i] } });
  }

  const res = await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ESO Toolkit', avatar_url: WEBHOOK_AVATAR_URL, embeds }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed (${res.status}): ${text}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📡 Fetching last ${PR_COUNT} merged PRs from ${OWNER}/${REPO}...`);

  // Fetch closed PRs (fetch 2x to filter for merged)
  const prs = await ghFetch(`/repos/${OWNER}/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=${PR_COUNT * 2}`);
  const mergedPRs = prs.filter((p) => p.merged_at).slice(0, PR_COUNT);
  console.log(`✅ Got ${mergedPRs.length} merged PRs\n`);

  let posted = 0;
  for (const pr of mergedPRs) {
    process.stdout.write(`  PR #${pr.number} — ${pr.title.slice(0, 60)}...`);

    // Fetch comments for screenshot extraction
    const [issueComments, reviewComments] = await Promise.all([
      ghFetch(`/repos/${OWNER}/${REPO}/issues/${pr.number}/comments?per_page=100`),
      ghFetch(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/comments?per_page=100`),
    ]);

    const allBodies = [pr.body, ...issueComments.map((c) => c.body), ...reviewComments.map((c) => c.body)];
    const screenshots = [];
    const seen = new Set();
    for (const body of allBodies) {
      for (const url of extractImages(body)) {
        if (!seen.has(url)) { seen.add(url); screenshots.push(url); }
      }
    }

    // Generate AI summary
    const summary = await generateSummary(pr.title, pr.body);
    const description = summary || toDiscordMarkdown(pr.body, pr.html_url);

    await postToDiscord(pr, screenshots, description);

    const screenshotNote = screenshots.length > 0 ? ` 📸 ${screenshots.length}` : '';
    const aiNote = summary ? ' 🤖 AI' : ' 📝 fallback';
    console.log(` ✅${aiNote}${screenshotNote}`);
    posted++;

    // Rate limit: Discord allows ~30 webhook posts/minute
    if (posted < mergedPRs.length) await new Promise((r) => setTimeout(r, 2100));
  }

  console.log(`\n🎉 Done — ${posted} messages posted to #updates`);
}

main().catch((err) => { console.error('❌', err.message); process.exit(1); });
