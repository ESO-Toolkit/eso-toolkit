#!/usr/bin/env node

/**
 * Generate whats-new.json from recent merged PRs
 *
 * This script fetches the most recent merged pull requests from the GitHub
 * repository and writes their descriptions and metadata to public/whats-new.json.
 * The file is served statically and used by the "What's New" UI component.
 *
 * Usage:
 *   node scripts/generate-whats-new.cjs [--count <number>]
 *
 * Environment:
 *   GITHUB_TOKEN - GitHub personal access token (required in CI, optional locally)
 *   ZAI_API_KEY - Z.AI API key for AI summaries (optional)
 *
 * If GITHUB_TOKEN is not set, the script will skip generation and keep the
 * existing whats-new.json file (useful for local development).
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'whats-new.json');
const DEFAULT_PR_COUNT = 15;
const SUMMARY_CONCURRENCY = 5;

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let count = DEFAULT_PR_COUNT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      if (isNaN(count) || count < 1) {
        console.warn(`\u26a0\ufe0f  Invalid --count value, using default (${DEFAULT_PR_COUNT})`);
        count = DEFAULT_PR_COUNT;
      }
    }
  }

  return { count };
}

/**
 * Get repository owner/name from git remote
 */
function getRepoInfo() {
  try {
    const { execSync } = require('child_process');
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // Ignore
  }

  // Fallback to environment variables
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY_NAME;
  if (owner && repo) {
    return { owner, repo };
  }

  // Try GITHUB_REPOSITORY (owner/repo format)
  const fullRepo = process.env.GITHUB_REPOSITORY;
  if (fullRepo) {
    const [o, r] = fullRepo.split('/');
    return { owner: o, repo: r };
  }

  return null;
}

/**
 * Strip common boilerplate sections from PR descriptions
 */
function cleanDescription(body) {
  if (!body) return '';

  let cleaned = body;

  // Remove common PR template sections that aren't useful for "What's New"
  // Remove checklist items
  cleaned = cleaned.replace(/^[-*]\s*\[[ x]\]\s*.+$/gm, '');

  // Remove common template headers and their content
  const templateHeaders = [
    /## (?:Testing|Tests|Test Plan|How to Test|QA)[\s\S]*?(?=\n## |\n---|\n$|$)/gi,
    /## (?:Checklist|Review Checklist)[\s\S]*?(?=\n## |\n---|\n$|$)/gi,
    /## (?:Screenshots?|Screen Recording)[\s\S]*?(?=\n## |\n---|\n$|$)/gi,
    /## (?:Related Issues?|References?|Links?)[\s\S]*?(?=\n## |\n---|\n$|$)/gi,
  ];

  for (const pattern of templateHeaders) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove HTML comments, including nested or malformed ones
  // First remove complete comment blocks, then escape remaining comment starts
  // to prevent HTML injection (convert to &lt;!-- so they render as text)
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  } while (cleaned !== previous);

  // Escape any remaining HTML comment starts to prevent HTML injection
  cleaned = cleaned.replace(/<!--/g, '&lt;!--');

  // Remove consecutive blank lines (collapse to single)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Fetch merged PRs from GitHub API
 */
async function fetchMergedPRs(owner, repo, count) {
  // Dynamic import for Octokit (ESM module)
  const { Octokit } = require('@octokit/rest');

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  console.log(`\ud83d\udce1 Fetching last ${count} merged PRs from ${owner}/${repo}...`);

  // Fetch merged PRs sorted by most recently updated
  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: count * 2, // Fetch extra to filter for merged only
  });

  // Filter to only merged PRs and take the requested count
  const mergedPRs = pullRequests
    .filter((pr) => pr.merged_at !== null)
    .slice(0, count);

  return mergedPRs.map((pr) => ({
    id: pr.number,
    title: pr.title,
    description: cleanDescription(pr.body),
    mergedAt: pr.merged_at,
    author: pr.user?.login || 'unknown',
    url: pr.html_url,
    labels: pr.labels.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean),
  }));
}

/**
 * Generate a friendly, non-technical summary via Z.AI GLM-5.
 * Returns null on failure so the caller can fall back to the raw description.
 */
async function generateSummary(title, description) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-5',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You write friendly update summaries for ESO Toolkit, an Elder Scrolls Online combat log analyzer. Your audience is gamers and guild members who are NOT developers. Write a 1-3 sentence summary of what changed from a user's perspective. Be conversational but concise. Never mention code, files, components, CSS, props, or technical implementation details. Focus on what users will SEE or EXPERIENCE differently. If the change is purely internal with no visible impact, write a single sentence saying it's an under-the-hood improvement. Do not use markdown formatting.`,
          },
          {
            role: 'user',
            content: `Summarize this update:\n\nTitle: ${title}\n\nDescription:\n${description || 'No description provided.'}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`   \u26a0\ufe0f  Z.AI API error (${response.status}) for "${title}"`);
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.warn(`   \u26a0\ufe0f  Z.AI API failed for "${title}": ${err.message}`);
    return null;
  }
}

/**
 * Load existing summaries from the current whats-new.json to avoid
 * re-calling the API for entries that already have one.
 */
function loadExistingSummaries() {
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      const map = new Map();
      for (const entry of existing.entries || []) {
        if (entry.summary) {
          map.set(entry.id, entry.summary);
        }
      }
      return map;
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
}

/**
 * Generate summaries for entries in batches to avoid rate limits.
 * Reuses existing summaries from the current file to save API calls.
 */
async function generateSummaries(entries) {
  // Reuse existing summaries for entries that already have one
  const cached = loadExistingSummaries();
  let reusedCount = 0;

  for (const entry of entries) {
    if (cached.has(entry.id)) {
      entry.summary = cached.get(entry.id);
      reusedCount++;
    }
  }

  if (reusedCount > 0) {
    console.log(`\u267b\ufe0f  Reused ${reusedCount} cached summaries`);
  }

  // Only generate summaries for entries that don't have one yet
  const needsSummary = entries.filter((e) => !e.summary);

  if (needsSummary.length === 0) {
    console.log('\u2705 All entries already have summaries \u2014 no API calls needed');
    return entries;
  }

  if (!process.env.ZAI_API_KEY) {
    console.log(`\u2139\ufe0f  ZAI_API_KEY not set \u2014 ${needsSummary.length} entries without summaries`);
    return entries;
  }

  console.log(`\ud83e\udd16 Generating AI summaries for ${needsSummary.length} new entries...`);

  // Process in batches
  for (let i = 0; i < needsSummary.length; i += SUMMARY_CONCURRENCY) {
    const batch = needsSummary.slice(i, i + SUMMARY_CONCURRENCY);
    const summaries = await Promise.all(
      batch.map((entry) => generateSummary(entry.title, entry.description)),
    );

    summaries.forEach((summary, j) => {
      if (summary) {
        needsSummary[i + j].summary = summary;
      }
    });

    const completed = Math.min(i + SUMMARY_CONCURRENCY, needsSummary.length);
    console.log(`   ${completed}/${needsSummary.length} summaries generated`);
  }

  const successCount = entries.filter((e) => e.summary).length;
  console.log(`\u2705 AI summaries: ${successCount}/${entries.length} total (${successCount - reusedCount} new)`);

  return entries;
}

/**
 * Main
 */
async function main() {
  const { count } = parseArgs();
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log('\u2139\ufe0f  GITHUB_TOKEN not set \u2014 skipping whats-new.json generation.');
    console.log('   Using existing file for local development.');

    // Ensure the file exists with seed data if it doesn't
    if (!fs.existsSync(OUTPUT_PATH)) {
      const seed = {
        generatedAt: new Date().toISOString(),
        entries: [],
      };
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(seed, null, 2));
      console.log('   Created empty whats-new.json seed file.');
    }
    return;
  }

  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    console.error('\u274c Could not determine GitHub repository. Set GITHUB_REPOSITORY or configure git remote.');
    process.exit(1);
  }

  try {
    let entries = await fetchMergedPRs(repoInfo.owner, repoInfo.repo, count);
    entries = await generateSummaries(entries);

    const output = {
      generatedAt: new Date().toISOString(),
      entries,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log(`\u2705 Generated whats-new.json with ${entries.length} entries`);
    entries.forEach((e) => {
      const date = new Date(e.mergedAt).toLocaleDateString();
      console.log(`   #${e.id} (${date}) \u2014 ${e.title}`);
    });
  } catch (error) {
    console.error('\u274c Failed to fetch PRs:', error.message);
    // Don't fail the build \u2014 use existing file if available
    if (fs.existsSync(OUTPUT_PATH)) {
      console.log('   Using existing whats-new.json file.');
    } else {
      // Write empty seed so the app doesn't crash
      const seed = {
        generatedAt: new Date().toISOString(),
        entries: [],
      };
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(seed, null, 2));
      console.log('   Created empty whats-new.json fallback.');
    }
  }
}

main();
