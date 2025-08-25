import fs from 'fs';
import path from 'path';

import fetch from 'cross-fetch';
import dotenv from 'dotenv';

import { createEsoLogsClient } from '../src/esologsClient';
import { GetAbilitiesDocument } from '../src/graphql/generated';

dotenv.config();

const TOKEN_URL = process.env.ESOLOGS_TOKEN_URL || 'https://www.esologs.com/oauth/token';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUT_FILE = path.join(DATA_DIR, 'abilities.json');
const ICONS_OUT_FILE = path.join(DATA_DIR, 'abilityIcons.json');
const PAGE_SIZE = 100;
const CHECKPOINT_FILE = path.join(DATA_DIR, 'abilities.fetch.checkpoint.json');
const MAX_RETRIES = Number(process.env.FETCH_MAX_RETRIES || 5);
const RETRY_BASE_MS = Number(process.env.FETCH_RETRY_BASE_MS || 500);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonIfExists<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    }
  } catch (e) {
    console.warn(`Failed to read ${file}:`, e);
  }
  return fallback;
}

function writeJsonSafe(file: string, data: unknown) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

async function getAccessToken() {
  if (!CLIENT_ID) {
    throw new Error('Missing OAUTH_CLIENT_ID in environment variables');
  }
  if (!CLIENT_SECRET) {
    throw new Error('Missing OAUTH_CLIENT_SECRET in environment variables');
  }

  console.log('Fetching access token...');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch access token: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  console.log('Access token fetched.');
  return json.access_token;
}

async function fetchAllAbilities(accessToken: string) {
  const esoLogsClient = createEsoLogsClient(accessToken);
  type Ability = {
    id: number;
    name?: string | null;
    icon?: string | null;
    [key: string]: unknown;
  };

  // Load any previously saved abilities to allow true resume
  const existing = readJsonIfExists<Record<string, Ability>>(OUT_FILE, {});
  const abilityLookup: Record<string, Ability> = { ...existing };

  // Load checkpoint if present
  let checkpoint = readJsonIfExists<{
    lastFetchedPage?: number;
    lastKnownTotalPages?: number;
    skippedPages?: number[];
    done?: boolean;
    timestamp?: string;
  }>(CHECKPOINT_FILE, {});

  let page = Math.max(1, (checkpoint.lastFetchedPage ?? 0) + 1);
  let lastPage = checkpoint.lastKnownTotalPages ?? 1;
  let skippedPages: number[] = Array.isArray(checkpoint.skippedPages)
    ? Array.from(new Set(checkpoint.skippedPages))
    : [];

  const updateCheckpoint = (partial: Partial<typeof checkpoint>) => {
    checkpoint = { ...checkpoint, ...partial, timestamp: new Date().toISOString() };
    writeJsonSafe(CHECKPOINT_FILE, checkpoint);
  };

  const fetchPage = async (p: number) => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { data } = await esoLogsClient.query({
          query: GetAbilitiesDocument,
          variables: { limit: PAGE_SIZE, page: p },
          fetchPolicy: 'network-only',
        });
        return data?.gameData?.abilities;
      } catch (err: any) {
        attempt++;
        const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`Error fetching page ${p} (attempt ${attempt}/${MAX_RETRIES}):`, err?.message ?? err);
        if (attempt >= MAX_RETRIES) throw err;
        await sleep(wait);
      }
    }
  };

  // If resuming but page is past last known total, start new pass
  if (page > lastPage) {
    page = 1;
    lastPage = 1;
    skippedPages = [];
    updateCheckpoint({ lastFetchedPage: 0, lastKnownTotalPages: undefined, skippedPages });
  }

  // Primary pass over pages
  do {
    console.log(`Fetching abilities page ${page}...`);
    try {
      const abilitiesData = await fetchPage(page);
      if (abilitiesData?.data) {
        console.log(`Fetched ${abilitiesData.data.length} abilities on page ${page}.`);
        for (const ability of abilitiesData.data as Ability[]) {
          if (ability && ability.id != null) {
            abilityLookup[String(ability.id)] = ability;
          }
        }
        writeJsonSafe(OUT_FILE, abilityLookup);
        if (skippedPages.includes(page)) {
          skippedPages = skippedPages.filter((x) => x !== page);
        }
      }
      lastPage = abilitiesData?.last_page || page;
      updateCheckpoint({ lastFetchedPage: page, lastKnownTotalPages: lastPage, skippedPages });
    } catch (_err) {
      console.error(`Failed to fetch page ${page} after ${MAX_RETRIES} retries; will skip for now.`);
      if (!skippedPages.includes(page)) skippedPages.push(page);
      updateCheckpoint({ lastFetchedPage: page, lastKnownTotalPages: lastPage, skippedPages });
    }
    page++;
  } while (page <= lastPage);

  // Retry skipped pages with a couple of additional passes
  let passes = 0;
  while (skippedPages.length > 0 && passes < 2) {
    passes++;
    console.log(`Retry pass ${passes} for ${skippedPages.length} skipped pages...`);
    const remaining: number[] = [];
    for (const p of skippedPages) {
      console.log(`Re-fetching skipped page ${p}...`);
      try {
        const abilitiesData = await fetchPage(p);
        if (abilitiesData?.data) {
          for (const ability of abilitiesData.data as Ability[]) {
            if (ability && ability.id != null) {
              abilityLookup[String(ability.id)] = ability;
            }
          }
          writeJsonSafe(OUT_FILE, abilityLookup);
        }
        lastPage = abilitiesData?.last_page || lastPage;
      } catch (_e) {
        console.error(`Still failed on page ${p}.`);
        remaining.push(p);
      }
    }
    skippedPages = remaining;
    updateCheckpoint({ skippedPages, lastKnownTotalPages: lastPage });
  }

  if (skippedPages.length > 0) {
    console.warn(`Completed with ${skippedPages.length} pages still failing: [${skippedPages.join(', ')}]. See ${CHECKPOINT_FILE}.`);
  } else {
    console.log('Completed all pages successfully.');
  }

  updateCheckpoint({ done: skippedPages.length === 0 });

  console.log(`Total abilities collected (including previous): ${Object.keys(abilityLookup).length}`);
  return abilityLookup;
}

function buildIconMap(abilities: Record<string, any>) {
  const icons: Record<number, string> = {};
  for (const [idStr, ability] of Object.entries(abilities)) {
    const icon = (ability as any)?.icon as string | undefined;
    if (icon) icons[Number(idStr)] = icon;
  }
  return icons;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  // Optional reset controls
  try {
    if (process.env.RESET_ABILITIES_FETCH === '1' || process.env.RESET_ABILITIES_ALL === '1') {
      if (fs.existsSync(CHECKPOINT_FILE)) {
        try {
          fs.unlinkSync(CHECKPOINT_FILE);
          console.log(`Removed checkpoint ${CHECKPOINT_FILE}`);
        } catch (e) {
          console.warn(`Failed to remove checkpoint ${CHECKPOINT_FILE}:`, e);
        }
      }
      if (process.env.RESET_ABILITIES_ALL === '1' && fs.existsSync(OUT_FILE)) {
        try {
          fs.unlinkSync(OUT_FILE);
          console.log(`Removed ${OUT_FILE}`);
        } catch (e) {
          console.warn(`Failed to remove ${OUT_FILE}:`, e);
        }
      }
    }
  } catch (e) {
    console.warn('Reset pre-step encountered an issue:', e);
  }
  if (CLIENT_ID && CLIENT_SECRET) {
    // Online mode: fetch everything fresh
    const accessToken = await getAccessToken();
    const abilities = await fetchAllAbilities(accessToken);
    fs.writeFileSync(OUT_FILE, JSON.stringify(abilities, null, 2), 'utf-8');
    console.log(`Fetched ${Object.keys(abilities).length} abilities and saved to ${OUT_FILE}`);

    const icons = buildIconMap(abilities);
    fs.writeFileSync(ICONS_OUT_FILE, JSON.stringify(icons, null, 2), 'utf-8');
    console.log(`Wrote icon map for ${Object.keys(icons).length} abilities to ${ICONS_OUT_FILE}`);
  } else {
    // Offline mode: derive icon map from an existing abilities.json
    if (!fs.existsSync(OUT_FILE)) {
      console.error(
        `Missing OAuth credentials and no existing abilities.json at ${OUT_FILE}.\n` +
        `Ask the repo owner for abilities.json or provide OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET to fetch it.`,
      );
      process.exit(1);
    }
    const abilities = JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8')) as Record<string, any>;
    const icons = buildIconMap(abilities);
    fs.writeFileSync(ICONS_OUT_FILE, JSON.stringify(icons, null, 2), 'utf-8');
    console.log(`Offline mode: wrote icon map for ${Object.keys(icons).length} abilities to ${ICONS_OUT_FILE}`);
  }
}

main().catch((err) => {
  console.error('Error fetching abilities:', err);
  process.exit(1);
});
