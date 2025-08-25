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

const DATA_DIR = path.resolve(__dirname, '../data');
const OUT_FILE = path.join(DATA_DIR, 'abilities.json');
const PAGE_SIZE = 100;

async function getAccessToken(): Promise<string> {
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
  let page = 1;
  let lastPage = 1;
  type Ability = {
    id: number;
    name?: string;
    [key: string]: unknown;
  };
  const abilityLookup: Record<string, Ability> = {};

  do {
    console.log(`Fetching abilities page ${page}...`);
    const { data } = await esoLogsClient.query({
      query: GetAbilitiesDocument,
      variables: { limit: PAGE_SIZE, page },
      fetchPolicy: 'network-only',
    });
    const abilitiesData = data?.gameData?.abilities;
    if (abilitiesData?.data) {
      console.log(`Fetched ${abilitiesData.data.length} abilities on page ${page}.`);
      for (const ability of abilitiesData.data) {
        if (ability && ability.id != null) {
          abilityLookup[String(ability.id)] = ability;
        }
      }
    }
    lastPage = abilitiesData?.last_page || page;
    page++;
  } while (page <= lastPage);

  console.log(`Total abilities fetched: ${Object.keys(abilityLookup).length}`);
  return abilityLookup;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  const accessToken = await getAccessToken();
  const abilities = await fetchAllAbilities(accessToken);
  fs.writeFileSync(OUT_FILE, JSON.stringify(abilities, null, 2), 'utf-8');
  console.log(`Fetched ${Object.keys(abilities).length} abilities and saved to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('Error fetching abilities:', err);
  process.exit(1);
});
