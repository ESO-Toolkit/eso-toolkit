import { gql } from '@apollo/client';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useLogger } from '../contexts/LoggerContext';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';

const TRIAL_TEAM_SIZE = 12;
const DEFAULT_METRIC = 'score' as const;
const MAX_RANDOM_ATTEMPTS = 6;

const UNRANKED_ENCOUNTER_IDS = new Set<number>([
  1, 2, 3, 5, 6, 9, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22, 24, 25, 26, 43, 44, 46, 47, 49, 50, 52,
  53, 55, 56, 58, 59, 61, 62, 1000, 1001,
]);

type EncounterOption = {
  id: number;
  name: string;
};

type DifficultyOption = {
  id: number;
  name: string;
  sizes: number[];
};

type TrialZone = {
  id: number;
  name: string;
  encounters: EncounterOption[];
  difficulties: DifficultyOption[];
};

type LeaderboardRow = {
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
  reportStart?: number;
};

type TrialZonesQueryResult = {
  worldData?: {
    zones?: Array<{
      id: number;
      name: string;
      encounters?: Array<{ id: number; name: string } | null> | null;
      difficulties?: Array<{
        id: number;
        name: string;
        sizes?: Array<number | null> | null;
      } | null> | null;
    } | null>;
  } | null;
};

type FightRankingsQueryResult = {
  worldData?: {
    encounter?: {
      fightRankings?: unknown;
    } | null;
  } | null;
};

type FightRankingsVariables = {
  encounterId: number;
  metric: typeof DEFAULT_METRIC;
  page?: number;
  size?: number;
  difficulty?: number;
};

type FightRankingsParsed = {
  rankings: LeaderboardRow[];
  page: number;
  hasMorePages: boolean;
  total?: number;
};

const GET_TRIAL_ZONES = gql`
  query SampleReportTrialZones {
    worldData {
      zones {
        id
        name
        encounters {
          id
          name
        }
        difficulties {
          id
          name
          sizes
        }
      }
    }
  }
`;

const GET_ENCOUNTER_FIGHT_RANKINGS = gql`
  query SampleReportEncounterFightRankings(
    $encounterId: Int!
    $difficulty: Int
    $metric: FightRankingMetricType
    $page: Int
    $size: Int
  ) {
    worldData {
      encounter(id: $encounterId) {
        fightRankings(difficulty: $difficulty, metric: $metric, page: $page, size: $size)
      }
    }
  }
`;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const pickRandom = <T,>(items: readonly T[]): T | undefined => {
  if (!items.length) {
    return undefined;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

const createEmptyRankings = (page = 1): FightRankingsParsed => ({
  rankings: [],
  page,
  hasMorePages: false,
});

export const SampleReportButton: React.FC = () => {
  const { client, isReady } = useEsoLogsClientContext();
  const theme = useTheme();
  const navigate = useNavigate();
  const logger = useLogger('SampleReportButton');
  const zonesCache = React.useRef<TrialZone[] | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchSampleLeaderboardRow = React.useCallback(async (): Promise<LeaderboardRow> => {
    if (!client) {
      throw new Error('ESO Logs client is unavailable');
    }

    const resolveZones = async (): Promise<TrialZone[]> => {
      if (zonesCache.current && zonesCache.current.length > 0) {
        return zonesCache.current;
      }

      const response = await client.query<TrialZonesQueryResult>({
        query: GET_TRIAL_ZONES,
        fetchPolicy: 'network-only',
      });

      const parsedZones = parseTrialZones(response);
      if (parsedZones.length > 0) {
        zonesCache.current = parsedZones;
      }

      return parsedZones;
    };

    const zones = await resolveZones();
    if (zones.length === 0) {
      throw new Error('No leaderboard data available right now.');
    }

    const attemptedKeys = new Set<string>();
    const maxAttempts = Math.min(MAX_RANDOM_ATTEMPTS, zones.length * 3);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const zone = pickRandom(zones);
      if (!zone || zone.encounters.length === 0) {
        continue;
      }

      const encounter = pickRandom(zone.encounters);
      if (!encounter) {
        continue;
      }

      const trialSized = zone.difficulties.filter((difficulty) =>
        difficulty.sizes.includes(TRIAL_TEAM_SIZE),
      );
      const difficultyOption = pickRandom(trialSized) ?? pickRandom(zone.difficulties) ?? null;
      const difficultyId = difficultyOption?.id ?? null;

      const attemptKey = `${zone.id}:${encounter.id}:${difficultyId ?? 'any'}`;
      if (attemptedKeys.has(attemptKey)) {
        attempt -= 1;
        continue;
      }
      attemptedKeys.add(attemptKey);

      const variables: FightRankingsVariables = {
        encounterId: encounter.id,
        metric: DEFAULT_METRIC,
        page: 1,
        size: TRIAL_TEAM_SIZE,
      };

      if (typeof difficultyId === 'number') {
        variables.difficulty = difficultyId;
      }

      try {
        const rankingResponse = await client.query<
          FightRankingsQueryResult,
          FightRankingsVariables
        >({
          query: GET_ENCOUNTER_FIGHT_RANKINGS,
          variables,
          fetchPolicy: 'network-only',
        });

        const rankings = parseFightRankings(rankingResponse, variables.page ?? 1).rankings.filter(
          (row) => row.reportCode,
        );

        if (rankings.length === 0) {
          continue;
        }

        const selected = pickRandom(rankings);
        if (selected && selected.reportCode) {
          return selected;
        }
      } catch (fetchError) {
        const err = toError(fetchError);
        logger.warn('Encounter ranking fetch failed for sample report', {
          encounterId: encounter.id,
          difficultyId,
          message: err.message,
        });
      }
    }

    throw new Error('Unable to find a leaderboard entry to preview.');
  }, [client, logger]);

  const handleViewSampleReport = React.useCallback(async () => {
    if (!client || !isReady || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const sampleRow = await fetchSampleLeaderboardRow();
      if (!sampleRow.reportCode) {
        throw new Error('Sample report is missing required data.');
      }

      const targetPath =
        typeof sampleRow.fightId === 'number'
          ? `/report/${sampleRow.reportCode}/fight/${sampleRow.fightId}`
          : `/report/${sampleRow.reportCode}`;

      navigate(targetPath);
    } catch (fetchError) {
      const err = toError(fetchError);
      logger.error('Failed to open sample leaderboard report', err);
      setErrorMessage('Unable to load a sample report right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client, isReady, loading, fetchSampleLeaderboardRow, navigate, logger]);

  const label = loading ? 'Fetching sample…' : 'View Sample Report';

  return (
    <Box
      sx={{
        mt: { xs: 3, sm: 4 },
        width: '100%',
        maxWidth: 600,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        mx: 'auto',
      }}
    >
      <Button
        variant="contained"
        disabled={!isReady || !client || loading}
        onClick={() => void handleViewSampleReport()}
        startIcon={
          loading ? (
            <CircularProgress color="inherit" size={18} />
          ) : (
            <ShuffleIcon fontSize="small" />
          )
        }
        sx={{
          alignSelf: { xs: 'stretch', sm: 'flex-start' },
          borderRadius: '14px',
          py: 1.2,
          px: { xs: 2.5, sm: 4 },
          fontSize: { xs: '1rem', sm: '1.05rem' },
          fontWeight: 600,
          letterSpacing: '0.2px',
          textTransform: 'none',
          color: theme.palette.mode === 'dark' ? '#e0f2fe' : '#0f172a',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(14,165,233,0.4) 100%)'
              : 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(56,189,248,0.3) 100%)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 15px 45px rgba(56, 189, 248, 0.25)'
              : '0 15px 45px rgba(14, 165, 233, 0.2)',
          '&:hover': {
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(56,189,248,0.35) 0%, rgba(14,165,233,0.5) 100%)'
                : 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(56,189,248,0.38) 100%)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 20px 55px rgba(56, 189, 248, 0.32)'
                : '0 20px 55px rgba(14, 165, 233, 0.28)',
          },
          '&:disabled': {
            opacity: 0.75,
            boxShadow: 'none',
          },
        }}
      >
        {label}
      </Button>
      {errorMessage ? (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.error.main,
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          {errorMessage}
        </Typography>
      ) : null}
    </Box>
  );
};

function parseTrialZones(data: TrialZonesQueryResult): TrialZone[] {
  const zones = data.worldData?.zones ?? [];

  return zones
    .map((zone) => {
      if (!zone) {
        return null;
      }

      const encounters = (zone.encounters ?? [])
        .map((encounter) => {
          if (!encounter) {
            return null;
          }

          return {
            id: encounter.id,
            name: encounter.name,
          };
        })
        .filter((encounter): encounter is EncounterOption => Boolean(encounter))
        .filter((encounter) => !UNRANKED_ENCOUNTER_IDS.has(encounter.id));

      const difficulties = (zone.difficulties ?? [])
        .map((difficulty) => {
          if (!difficulty) {
            return null;
          }

          return {
            id: difficulty.id,
            name: difficulty.name,
            sizes: (difficulty.sizes ?? []).filter(
              (size): size is number => typeof size === 'number',
            ),
          };
        })
        .filter((difficulty): difficulty is DifficultyOption => Boolean(difficulty));

      const supportsTrialSize = difficulties.some((difficulty) =>
        difficulty.sizes.includes(TRIAL_TEAM_SIZE),
      );

      if (!supportsTrialSize || encounters.length === 0) {
        return null;
      }

      return {
        id: zone.id,
        name: zone.name,
        encounters,
        difficulties,
      };
    })
    .filter((zone): zone is TrialZone => Boolean(zone))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseFightRankings(
  data: FightRankingsQueryResult,
  requestedPage: number,
): FightRankingsParsed {
  const raw = data.worldData?.encounter?.fightRankings;
  if (!raw || typeof raw !== 'object') {
    return createEmptyRankings(requestedPage);
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

  const guildInfo =
    record.guild && typeof record.guild === 'object'
      ? (record.guild as Record<string, unknown>)
      : undefined;
  const guildName = guildInfo ? (safeString(guildInfo.name) ?? teamName) : undefined;

  let serverName: string | undefined;
  let regionName: string | undefined;
  if (guildInfo) {
    const server =
      guildInfo.server && typeof guildInfo.server === 'object'
        ? (guildInfo.server as Record<string, unknown>)
        : undefined;
    if (server) {
      serverName = safeString(server.name) ?? safeString(server.slug);
      const region =
        server.region && typeof server.region === 'object'
          ? (server.region as Record<string, unknown>)
          : undefined;
      if (region) {
        regionName = safeString(region.compactName) ?? safeString(region.name);
      }
    }
    if (!regionName && guildInfo.region && typeof guildInfo.region === 'object') {
      const directRegion = guildInfo.region as Record<string, unknown>;
      regionName = safeString(directRegion.compactName) ?? safeString(directRegion.name);
    }
  }

  const report =
    record.report && typeof record.report === 'object'
      ? (record.report as Record<string, unknown>)
      : undefined;
  const reportCode = report ? safeString(report.code) : undefined;
  const fightId = report ? safeNumber(report.fightID) : undefined;
  const reportStart = report ? safeNumber(report.startTime) : undefined;
  const reportEnd = report ? safeNumber(report.endTime) : undefined;

  const durationFromRecord = convertDurationToMilliseconds(safeNumber(record.duration));
  const durationFromReport =
    reportStart !== undefined && reportEnd !== undefined ? reportEnd - reportStart : undefined;
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
    reportStart,
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
