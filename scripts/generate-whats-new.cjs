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
 *
 * If GITHUB_TOKEN is not set, the script will skip generation and keep the
 * existing whats-new.json file (useful for local development).
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'whats-new.json');
const DEFAULT_PR_COUNT = 15;

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
        console.warn(`⚠️  Invalid --count value, using default (${DEFAULT_PR_COUNT})`);
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

  // Remove HTML comments, including nested or malformed ones, by repeatedly
  // stripping comment blocks and any remaining comment starts until stable.
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/<!--/g, '');
  } while (cleaned !== previous);

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

  console.log(`📡 Fetching last ${count} merged PRs from ${owner}/${repo}...`);

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
 * Main
 */
async function main() {
  const { count } = parseArgs();
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log('ℹ️  GITHUB_TOKEN not set — skipping whats-new.json generation.');
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
    console.error('❌ Could not determine GitHub repository. Set GITHUB_REPOSITORY or configure git remote.');
    process.exit(1);
  }

  try {
    const entries = await fetchMergedPRs(repoInfo.owner, repoInfo.repo, count);

    const output = {
      generatedAt: new Date().toISOString(),
      entries,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log(`✅ Generated whats-new.json with ${entries.length} entries`);
    entries.forEach((e) => {
      const date = new Date(e.mergedAt).toLocaleDateString();
      console.log(`   #${e.id} (${date}) — ${e.title}`);
    });
  } catch (error) {
    console.error('❌ Failed to fetch PRs:', error.message);
    // Don't fail the build — use existing file if available
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
