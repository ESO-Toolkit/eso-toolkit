import {
  FightRankingMetricType,
  GetEncounterFightRankingsDocument,
  type GetEncounterFightRankingsQuery,
  type GetEncounterFightRankingsQueryVariables,
  type GetTrialZonesQuery,
} from '../../src/graphql/gql/graphql';
import type { GraphqlTestHarness } from '../../src/graphql/testing/graphqlTestHarness';
import type { ScriptLogger } from '../_runner/bootstrap';

export const TRIAL_TEAM_SIZE = 12;

export type EncounterSelection = {
  encounterId: number;
  zoneName: string;
  encounterName: string;
  difficultyId: number | null;
  size: number | undefined;
};

export type LeaderboardRow = {
  rank: number;
  score?: number;
  percentile?: number;
  teamName?: string;
  guildName?: string;
  serverName?: string;
  regionName?: string;
  durationMs?: number;
  reportCode?: string;
  fightId?: number;
};

export type FightRankingsParsed = {
  rankings: LeaderboardRow[];
  page: number;
  hasMorePages: boolean;
  total?: number;
};

export type ParsedEncounter = { id: number; name: string };
export type ParsedZoneDifficulty = { id: number; name: string; sizes: number[] };
export type ParsedTrialZone = {
  id: number;
  name: string;
  encounters: ParsedEncounter[];
  difficulties: ParsedZoneDifficulty[];
};

type WorldData = NonNullable<GetTrialZonesQuery['worldData']>;
type ZoneList = NonNullable<WorldData['zones']>;
type Zone = NonNullable<ZoneList[number]>;
type EncounterList = NonNullable<Zone['encounters']>;
type ZoneEncounter = NonNullable<EncounterList[number]>;
type DifficultyList = NonNullable<Zone['difficulties']>;
type ZoneDifficulty = NonNullable<DifficultyList[number]>;

export const LEGACY_PARTITION_ENCOUNTER_IDS = new Set<number>([
  1, // Aetherian Archive - Lightning Storm Atronach
  2, // Aetherian Archive - Foundation Stone Atronach
  3, // Aetherian Archive - The Lightning Storm Atronach
  4, // Aetherian Archive - The Mage
  6, // Hel Ra Citadel - Yokeda Rok'dun
  7, // Hel Ra Citadel - Yokeda Kai
  8, // Hel Ra Citadel - The Warrior
  9, // Sanctum Ophidia - Possessed Mantikora
  10, // Sanctum Ophidia - Ozara
  11, // Sanctum Ophidia - The Serpent
  21, // Asylum Sanctorium - Saint Felms
  22, // Asylum Sanctorium - Saint Llothis
  23, // Asylum Sanctorium - Saint Olms
  24, // Cloudrest - Siroria
  25, // Cloudrest - Relequen
  26, // Cloudrest - Galenwe
  27, // Cloudrest - Z'Maja
  28, // Sunspire - Yolnahkriin
  29, // Sunspire - Lokkestiiz
  30, // Sunspire - Nahviintaas
  31, // Kyne's Aegis - Yandir the Butcher
  32, // Kyne's Aegis - Captain Vrol
  33, // Kyne's Aegis - Lord Falgravn
]);

export const UNRANKED_ENCOUNTER_IDS = new Set<number>([
  1, // Aetherian Archive - Lightning Storm Atronach
  2, // Aetherian Archive - Foundation Stone Atronach
  3, // Aetherian Archive - Varlariel
  5, // Hel Ra Citadel - Ra Kotu
  6, // Hel Ra Citadel - The Yokedas
  9, // Sanctum Ophidia - Possessed Mantikora
  10, // Sanctum Ophidia - Stonebreaker
  11, // Sanctum Ophidia - Ozara
  13, // Maw of Lorkhaj - Zhaj'hassa the Forgotten
  14, // Maw of Lorkhaj - The Twins
  16, // The Halls of Fabrication - The Hunter Killers
  17, // The Halls of Fabrication - Pinnacle Factotum
  18, // The Halls of Fabrication - Archcustodian
  19, // The Halls of Fabrication - The Refabrication Committee
  21, // Asylum Sanctorium - Saint Llothis the Pious
  22, // Asylum Sanctorium - Saint Felms the Bold
  24, // Cloudrest - Shade of Galenwe
  25, // Cloudrest - Shade of Relequen
  26, // Cloudrest - Shade of Siroria
  43, // Sunspire - Lokkestiiz
  44, // Sunspire - Yolnahkriin
  46, // Kyne's Aegis - Yandir the Butcher
  47, // Kyne's Aegis - Captain Vrol
  49, // Rockgrove - Oaxiltso
  50, // Rockgrove - Flame-Herald Bahsei
  52, // Dreadsail Reef - Lylanar and Turlassil
  53, // Dreadsail Reef - Reef Guardian
  55, // Sanity's Edge - Exarchanic Yaseyla
  56, // Sanity's Edge - Archwizard Twelvane and Chimera
  58, // Lucent Citadel - Count Ryelaz and Zilyesset
  59, // Lucent Citadel - Orphic Shattered Shard
  61, // Ossein Cage - Hall of Fleshcraft
  62, // Ossein Cage - Jynorah and Skorkhif
  1000, // Arenas (Group) - Dragonstar Arena
  1001, // Arenas (Group) - Blackrose Prison
]);

export function parseTrialZones(response: GetTrialZonesQuery): ParsedTrialZone[] {
  const zones = (response.worldData?.zones ?? []) as Array<Zone | null | undefined>;

  return zones
    .map((zoneNode): ParsedTrialZone | null => {
      if (!zoneNode) {
        return null;
      }

      const encountersSource = (zoneNode.encounters ?? []) as Array<ZoneEncounter | null | undefined>;
      const encounters = encountersSource
        .map((encounterNode): ParsedEncounter | null => {
          if (!encounterNode) {
            return null;
          }
          return {
            id: encounterNode.id,
            name: encounterNode.name,
          };
        })
        .filter((encounterNode): encounterNode is ParsedEncounter => Boolean(encounterNode))
        .filter((encounterNode) => !UNRANKED_ENCOUNTER_IDS.has(encounterNode.id));

      const difficultiesSource = (zoneNode.difficulties ?? []) as Array<ZoneDifficulty | null | undefined>;
      const difficulties = difficultiesSource
        .map((difficultyNode): ParsedZoneDifficulty | null => {
          if (!difficultyNode) {
            return null;
          }
          const sizes = (difficultyNode.sizes ?? []).filter(
            (size: number | null | undefined): size is number => typeof size === 'number',
          );
          return {
            id: difficultyNode.id,
            name: difficultyNode.name,
            sizes,
          };
        })
        .filter((difficultyNode): difficultyNode is ParsedZoneDifficulty => Boolean(difficultyNode));

      const supportsTrialSize = difficulties.some((difficulty) =>
        difficulty.sizes.includes(TRIAL_TEAM_SIZE),
      );

      if (!supportsTrialSize || encounters.length === 0) {
        return null;
      }

      return {
        id: zoneNode.id,
        name: zoneNode.name,
        encounters,
        difficulties,
      };
    })
    .filter((zoneNode): zoneNode is ParsedTrialZone => Boolean(zoneNode))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createDifficultyPriority(
  difficulties: ParsedZoneDifficulty[],
): Array<ParsedZoneDifficulty | null> {
  if (difficulties.length === 0) {
    return [null];
  }

  const seen = new Set<number>();
  const ordered: Array<ParsedZoneDifficulty | null> = [];

  const pushUnique = (difficulty: ParsedZoneDifficulty | null) => {
    if (!difficulty) {
      return;
    }
    if (seen.has(difficulty.id)) {
      return;
    }
    seen.add(difficulty.id);
    ordered.push(difficulty);
  };

  const veteran = difficulties.find((difficulty) => difficulty.name.toLowerCase().includes('veteran'));
  if (veteran) {
    pushUnique(veteran);
  }

  const trialSized = difficulties.find((difficulty) => difficulty.sizes.includes(TRIAL_TEAM_SIZE));
  if (trialSized) {
    pushUnique(trialSized);
  }

  difficulties.forEach((difficulty) => pushUnique(difficulty));

  ordered.push(null);
  return ordered;
}

export async function fetchLeaderboardWithFallbacks(
  harness: GraphqlTestHarness,
  selection: EncounterSelection,
  logger: Pick<ScriptLogger, 'info' | 'warn'>,
  options: { logLabelPrefix: string },
): Promise<{
  parsed: FightRankingsParsed;
  attempted: GetEncounterFightRankingsQueryVariables;
  attemptIndex: number;
}> {
  const baseVariables: GetEncounterFightRankingsQueryVariables = {
    encounterId: selection.encounterId,
    difficulty: selection.difficultyId ?? undefined,
    page: 1,
    metric: FightRankingMetricType.Score,
    size: selection.size,
  };

  const prefersLegacyPartition = LEGACY_PARTITION_ENCOUNTER_IDS.has(selection.encounterId);

  const buildVariableCandidates = (): GetEncounterFightRankingsQueryVariables[] => {
    const sizeAdjusted: GetEncounterFightRankingsQueryVariables[] = [baseVariables];

    if (typeof baseVariables.size === 'number') {
      sizeAdjusted.push({ ...baseVariables, size: undefined });
    }

    if (baseVariables.metric === FightRankingMetricType.Score) {
      sizeAdjusted.push({ ...baseVariables, size: undefined, metric: FightRankingMetricType.Default });
    }

    const partitionVariants: GetEncounterFightRankingsQueryVariables[] = [];
    const partitionOrder: Array<number | undefined> = [];
    const addPartitionOrder = (value: number | undefined) => {
      if (!partitionOrder.includes(value)) {
        partitionOrder.push(value);
      }
    };

    if (prefersLegacyPartition) {
      addPartitionOrder(0);
      addPartitionOrder(undefined);
    } else {
      addPartitionOrder(undefined);
      addPartitionOrder(0);
    }

    sizeAdjusted.forEach((candidate) => {
      partitionOrder.forEach((partitionValue) => {
        if (typeof partitionValue === 'number') {
          partitionVariants.push({ ...candidate, partition: partitionValue });
        } else {
          partitionVariants.push(candidate);
        }
      });
    });

    return partitionVariants;
  };

  const candidates = buildVariableCandidates();

  for (let attemptIndex = 0; attemptIndex < candidates.length; attemptIndex += 1) {
    const variables = candidates[attemptIndex];
    try {
      logger.info('Fetching leaderboard data...', variables);
      const rankingData = await harness.execute(GetEncounterFightRankingsDocument, {
        variables,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
        logLabel: `${options.logLabelPrefix}:getEncounterFightRankings`,
      });

      const parsed = parseFightRankings(rankingData, variables.page ?? 1);
      if (parsed.rankings.length === 0 && !parsed.hasMorePages) {
        logger.warn('Leaderboard query returned no data; trying next fallback', variables);
        continue;
      }

      return { parsed, attempted: variables, attemptIndex };
    } catch (error) {
      const partial = extractPartialLeaderboardData(error);
      if (partial) {
        const parsed = parseFightRankings(partial, variables.page ?? 1);
        if (parsed.rankings.length === 0 && !parsed.hasMorePages) {
          logger.warn('Leaderboard query returned no data; trying next fallback', {
            variables,
            warning: formatErrorMessage(error),
          });
          continue;
        }

        logger.warn('Leaderboard query completed with errors; using partial data', {
          variables,
          warning: formatErrorMessage(error),
        });
        return { parsed, attempted: variables, attemptIndex };
      }

      logger.warn('Leaderboard query failed, trying next fallback', formatErrorMessage(error));
    }
  }

  throw new Error('All leaderboard query attempts failed.');
}

function parseFightRankings(
  response: GetEncounterFightRankingsQuery,
  requestedPage: number,
): FightRankingsParsed {
  const raw = response.worldData?.encounter?.fightRankings;
  if (!raw || typeof raw !== 'object') {
    return {
      rankings: [],
      page: requestedPage,
      hasMorePages: false,
    };
  }

  const rawObject = raw as Record<string, unknown>;
  const page = safeNumber(rawObject.page) ?? requestedPage;
  const hasMorePagesValue =
    typeof rawObject.hasMorePages !== 'undefined'
      ? rawObject.hasMorePages
      : rawObject.has_more_pages;
  const hasMorePages = Boolean(hasMorePagesValue);
  const total = safeNumber(rawObject.total ?? rawObject.totalCount ?? rawObject.count);

  const rankingsRaw = Array.isArray(rawObject.rankings)
    ? rawObject.rankings
    : Array.isArray(rawObject.data)
      ? rawObject.data
      : [];
  const rankings = rankingsRaw
    .map((entry, index) => parseRankingEntry(entry, index))
    .filter((entry): entry is LeaderboardRow => entry !== null);

  return {
    rankings,
    page,
    hasMorePages,
    total,
  };
}

function parseRankingEntry(entry: unknown, indexHint: number): LeaderboardRow | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const rank = safeNumber(record.rank) ?? indexHint + 1;

  const score = safeNumber(record.total) ?? safeNumber(record.score) ?? safeNumber(record.best);
  const percentile = safeNumber(record.percent) ?? safeNumber(record.historicalPercent);
  const teamName = safeString(record.name);

  const guildInfo = record.guild && typeof record.guild === 'object' ? (record.guild as Record<string, unknown>) : undefined;
  const guildName = guildInfo ? safeString(guildInfo.name) ?? teamName : undefined;

  let serverName: string | undefined;
  let regionName: string | undefined;
  if (guildInfo) {
    const server = guildInfo.server && typeof guildInfo.server === 'object' ? (guildInfo.server as Record<string, unknown>) : undefined;
    if (server) {
      serverName = safeString(server.name) ?? safeString(server.slug);
      const region = server.region && typeof server.region === 'object' ? (server.region as Record<string, unknown>) : undefined;
      if (region) {
        regionName = safeString(region.compactName) ?? safeString(region.name);
      }
    }
    if (!regionName && guildInfo.region && typeof guildInfo.region === 'object') {
      const directRegion = guildInfo.region as Record<string, unknown>;
      regionName = safeString(directRegion.compactName) ?? safeString(directRegion.name);
    }
  }

  const report = record.report && typeof record.report === 'object' ? (record.report as Record<string, unknown>) : undefined;
  const reportCode = report ? safeString(report.code) : undefined;
  const fightId = report ? safeNumber(report.fightID) : undefined;
  const reportStart = report ? safeNumber(report.startTime) : undefined;
  const reportEnd = report ? safeNumber(report.endTime) : undefined;

  const durationFromRecord = convertDurationToMilliseconds(safeNumber(record.duration));
  const durationFromReport = reportStart !== undefined && reportEnd !== undefined ? reportEnd - reportStart : undefined;
  const durationMs = durationFromRecord ?? durationFromReport;

  return {
    rank,
    score,
    percentile,
    teamName,
    guildName,
    serverName,
    regionName,
    durationMs,
    reportCode,
    fightId,
  };
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function convertDurationToMilliseconds(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value >= 1000) {
    return value;
  }
  return value * 1000;
}

function extractPartialLeaderboardData(error: unknown): GetEncounterFightRankingsQuery | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const withData = error as { data?: unknown };
  if (!withData.data || typeof withData.data !== 'object') {
    return null;
  }

  const data = withData.data as GetEncounterFightRankingsQuery;
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (!('worldData' in data)) {
    return null;
  }

  return data;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return 'Unknown error';
  }
}
