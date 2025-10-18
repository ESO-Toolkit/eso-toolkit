import fs from 'node:fs';
import path from 'node:path';

import { GetAbilitiesDocument, type GetAbilitiesQuery } from '@graphql/gql/graphql';
import type { GraphqlTestHarness } from '@graphql/testing/graphqlTestHarness';

import { runScript } from './_runner/bootstrap';
import type { ScriptLogger } from './_runner/bootstrap';

const DATA_DIR = path.resolve(__dirname, '../data');
const OUT_FILE = path.join(DATA_DIR, 'abilities.json');
const ICONS_OUT_FILE = path.join(DATA_DIR, 'abilityIcons.json');
const CHECKPOINT_FILE = path.join(DATA_DIR, 'abilities.fetch.checkpoint.json');

const PAGE_SIZE = 100;
const MAX_RETRIES = Number(process.env.FETCH_MAX_RETRIES || 5);
const RETRY_BASE_MS = Number(process.env.FETCH_RETRY_BASE_MS || 500);
const SCRIPT_NAME = 'fetch-abilities';

type AbilitiesConnection = NonNullable<NonNullable<GetAbilitiesQuery['gameData']>['abilities']>;
type AbilityNode = NonNullable<NonNullable<AbilitiesConnection['data']>[number]>;
type AbilityLookup = Record<string, AbilityNode>;


async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNonNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

function readJsonIfExists<T>(file: string, fallback: T, logger: ScriptLogger): T {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    logger.warn(`Failed to read ${file}`, error instanceof Error ? error.message : error);
  }
  return fallback;
}

function writeJsonSafe(file: string, data: unknown, logger: ScriptLogger): void {
  try {
    const directory = path.dirname(file);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const tempPath = `${file}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, file);
  } catch (error) {
    logger.error(`Failed to write ${file}`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function fetchAllAbilities(
  harness: GraphqlTestHarness,
  logger: ScriptLogger,
): Promise<AbilityLookup> {
  const abilityLookup = readJsonIfExists<AbilityLookup>(OUT_FILE, {}, logger);

  let checkpoint = readJsonIfExists<{
    lastFetchedPage?: number;
    lastKnownTotalPages?: number;
    skippedPages?: number[];
    done?: boolean;
    timestamp?: string;
  }>(CHECKPOINT_FILE, {}, logger);

  let page = Math.max(1, (checkpoint.lastFetchedPage ?? 0) + 1);
  let lastPage = checkpoint.lastKnownTotalPages ?? 1;
  let skippedPages: number[] = Array.isArray(checkpoint.skippedPages)
    ? Array.from(new Set(checkpoint.skippedPages))
    : [];

  const updateCheckpoint = (partial: Partial<typeof checkpoint>) => {
    checkpoint = { ...checkpoint, ...partial, timestamp: new Date().toISOString() };
    writeJsonSafe(CHECKPOINT_FILE, checkpoint, logger);
  };

  const fetchPage = async (currentPage: number): Promise<AbilitiesConnection | null> => {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt += 1;
      try {
        const data = await harness.execute(GetAbilitiesDocument, {
          fetchPolicy: 'network-only',
          variables: { limit: PAGE_SIZE, page: currentPage },
          logLabel: `${SCRIPT_NAME}:page-${currentPage}`,
        });

        return data.gameData?.abilities ?? null;
      } catch (error) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        logger.warn(
          `Failed to fetch abilities page ${currentPage} (attempt ${attempt}/${MAX_RETRIES})`,
          error instanceof Error ? error.message : error,
        );
        if (attempt >= MAX_RETRIES) {
          throw error;
        }
        await sleep(waitMs);
      }
    }

    return null;
  };

  if (page > lastPage) {
    page = 1;
    lastPage = 1;
    skippedPages = [];
    updateCheckpoint({ lastFetchedPage: 0, lastKnownTotalPages: undefined, skippedPages });
  }

  do {
    logger.info(`Fetching abilities page ${page}...`);
    try {
      const abilitiesConnection = await fetchPage(page);
      if (abilitiesConnection?.data) {
        const abilityNodes = abilitiesConnection.data.filter(isNonNull);
        logger.info(`Fetched ${abilityNodes.length} abilities on page ${page}.`);
        for (const ability of abilityNodes) {
          abilityLookup[String(ability.id)] = ability;
        }
        writeJsonSafe(OUT_FILE, abilityLookup, logger);
      }

      lastPage = abilitiesConnection?.last_page ?? page;
      updateCheckpoint({ lastFetchedPage: page, lastKnownTotalPages: lastPage, skippedPages });
    } catch (error) {
      logger.error(`Failed to fetch page ${page} after ${MAX_RETRIES} retries`, error);
      if (!skippedPages.includes(page)) {
        skippedPages.push(page);
      }
      updateCheckpoint({ lastFetchedPage: page, lastKnownTotalPages: lastPage, skippedPages });
    }

    page += 1;
  } while (page <= lastPage);

  let passes = 0;
  while (skippedPages.length > 0 && passes < 2) {
    passes += 1;
    logger.info(`Retry pass ${passes} for ${skippedPages.length} skipped pages...`);
    const remaining: number[] = [];

    for (const skippedPage of skippedPages) {
      logger.info(`Re-fetching skipped page ${skippedPage}...`);
      try {
        const abilitiesConnection = await fetchPage(skippedPage);
        const abilityNodes = abilitiesConnection?.data?.filter(isNonNull) ?? [];
        if (abilityNodes.length > 0) {
          for (const ability of abilityNodes) {
            abilityLookup[String(ability.id)] = ability;
          }
          writeJsonSafe(OUT_FILE, abilityLookup, logger);
        }
        lastPage = abilitiesConnection?.last_page ?? lastPage;
      } catch (error) {
        logger.error(`Still failed on page ${skippedPage}`, error);
        remaining.push(skippedPage);
      }
    }

    skippedPages = remaining;
    updateCheckpoint({ skippedPages, lastKnownTotalPages: lastPage });
  }

  if (skippedPages.length > 0) {
    logger.warn(
      `Completed with ${skippedPages.length} pages still failing. See ${CHECKPOINT_FILE} for details.`,
    );
  } else {
    logger.info('Completed all pages successfully.');
  }

  updateCheckpoint({ done: skippedPages.length === 0 });

  logger.info(
    `Total abilities collected (including previous): ${Object.keys(abilityLookup).length}`,
  );

  return abilityLookup;
}

function buildIconMap(abilities: AbilityLookup): Record<number, string> {
  const icons: Record<number, string> = {};

  for (const [id, ability] of Object.entries(abilities)) {
    if (ability.icon) {
      icons[Number(id)] = ability.icon;
    }
  }

  return icons;
}

function resetIfRequested(logger: ScriptLogger): void {
  try {
    const resetFetch = process.env.RESET_ABILITIES_FETCH === '1' || process.env.RESET_ABILITIES_ALL === '1';
    const resetAll = process.env.RESET_ABILITIES_ALL === '1';

    if (!resetFetch && !resetAll) {
      return;
    }

    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
      logger.info(`Removed checkpoint ${CHECKPOINT_FILE}`);
    }

    if (resetAll && fs.existsSync(OUT_FILE)) {
      fs.unlinkSync(OUT_FILE);
      logger.info(`Removed ${OUT_FILE}`);
    }
  } catch (error) {
    logger.warn('Reset pre-step encountered an issue', error instanceof Error ? error.message : error);
  }
}

runScript(async ({ getGraphqlHarness, logger }) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  resetIfRequested(logger);

  const hasAccessToken = Boolean(
    process.env.ESOLOGS_TOKEN || (process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET),
  );

  if (!hasAccessToken) {
    if (!fs.existsSync(OUT_FILE)) {
      throw new Error(
        `Missing OAuth credentials and no existing abilities.json at ${OUT_FILE}. Provide ESOLOGS_TOKEN or OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET to fetch fresh data.`,
      );
    }

    logger.info('Offline mode: deriving icon map from existing abilities.json');
    const abilitiesContent = fs.readFileSync(OUT_FILE, 'utf-8');
    const abilities = JSON.parse(abilitiesContent) as AbilityLookup;
    const icons = buildIconMap(abilities);
    writeJsonSafe(ICONS_OUT_FILE, icons, logger);
    logger.info(
      `Offline mode: wrote icon map for ${Object.keys(icons).length} abilities to ${ICONS_OUT_FILE}`,
    );
    return;
  }

  const harness = await getGraphqlHarness({ defaultFetchPolicy: 'network-only' });
  const abilities = await fetchAllAbilities(harness, logger);
  writeJsonSafe(OUT_FILE, abilities, logger);
  logger.info(`Fetched ${Object.keys(abilities).length} abilities and saved to ${OUT_FILE}`);

  const icons = buildIconMap(abilities);
  writeJsonSafe(ICONS_OUT_FILE, icons, logger);
  logger.info(`Wrote icon map for ${Object.keys(icons).length} abilities to ${ICONS_OUT_FILE}`);
}, { name: SCRIPT_NAME });
