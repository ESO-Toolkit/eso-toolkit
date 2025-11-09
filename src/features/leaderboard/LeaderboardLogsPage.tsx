import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useLogger } from '../../contexts/LoggerContext';
import { useEsoLogsClientContext } from '../../EsoLogsClientContext';
import {
  FightRankingMetricType,
  GetEncounterFightRankingsDocument,
  GetEncounterFightRankingsQuery,
  GetEncounterFightRankingsQueryVariables,
  GetTrialZonesDocument,
  GetTrialZonesQuery,
} from '../../graphql/gql/graphql';
import { formatDuration } from '../../utils/fightDuration';
import { formatReportDateTime } from '../reports/reportFormatting';

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

type FightRankingsParsed = {
  rankings: LeaderboardRow[];
  page: number;
  hasMorePages: boolean;
  total?: number;
};

const TRIAL_TEAM_SIZE = 12;
const DEFAULT_METRIC = FightRankingMetricType.Score;
const METRIC_LABEL = DEFAULT_METRIC.charAt(0).toUpperCase() + DEFAULT_METRIC.slice(1);

const LEGACY_PARTITION_ENCOUNTER_IDS = new Set<number>([
  1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
]);

const UNRANKED_ENCOUNTER_IDS = new Set<number>([
  1, 2, 3, 5, 6, 9, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22, 24, 25, 26, 43, 44, 46, 47, 49, 50, 52,
  53, 55, 56, 58, 59, 61, 62, 1000, 1001,
]);

const createEmptyRankings = (page = 1): FightRankingsParsed => ({
  rankings: [],
  page,
  hasMorePages: false,
});

export const LeaderboardLogsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const logger = useLogger('LeaderboardLogsPage');
  const { client } = useEsoLogsClientContext();

  const [zones, setZones] = React.useState<TrialZone[]>([]);
  const [zonesLoading, setZonesLoading] = React.useState<boolean>(true);
  const [zonesError, setZonesError] = React.useState<string | null>(null);

  const [selectedZoneId, setSelectedZoneId] = React.useState<number | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = React.useState<number | null>(null);
  const [selectedDifficultyId, setSelectedDifficultyId] = React.useState<number | null>(null);

  const [rankingsState, setRankingsState] =
    React.useState<FightRankingsParsed>(createEmptyRankings());
  const [rankingsLoading, setRankingsLoading] = React.useState<boolean>(false);
  const [rankingsError, setRankingsError] = React.useState<string | null>(null);
  const partitionPreferenceRef = React.useRef<Map<string, number>>(new Map());
  const clientUnavailable = !client;

  React.useEffect(() => {
    if (clientUnavailable) {
      logger.error('EsoLogsClient is unavailable for leaderboard data');
    }
  }, [clientUnavailable, logger]);

  const currentZone = React.useMemo(() => {
    if (!selectedZoneId) {
      return null;
    }
    return zones.find((zone) => zone.id === selectedZoneId) ?? null;
  }, [zones, selectedZoneId]);

  const currentEncounter = React.useMemo(() => {
    if (!selectedEncounterId || !currentZone) {
      return null;
    }
    return currentZone.encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null;
  }, [currentZone, selectedEncounterId]);

  const loadZones = React.useCallback(async (): Promise<void> => {
    if (!client) {
      return;
    }
    setZonesLoading(true);
    setZonesError(null);
    try {
      const response = await client.query<GetTrialZonesQuery>({
        query: GetTrialZonesDocument,
        fetchPolicy: 'network-only',
      });

      const parsedZones = parseTrialZones(response);
      setZones(parsedZones);
      if (parsedZones.length > 0) {
        setSelectedZoneId((previous) => previous ?? parsedZones[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trial data';
      setZonesError(message);
      setZones([]);
      setSelectedZoneId(null);
    } finally {
      setZonesLoading(false);
    }
  }, [client]);

  const fetchRankings = React.useCallback(
    async ({
      encounterId,
      difficultyId,
      page = 1,
      size,
    }: {
      encounterId: number;
      difficultyId: number | null;
      page?: number;
      size?: number;
    }): Promise<void> => {
      if (!client) {
        setRankingsError('Leaderboard data is temporarily unavailable. Please try again later.');
        setRankingsState(createEmptyRankings(page ?? 1));
        setRankingsLoading(false);
        return;
      }

      setRankingsLoading(true);
      setRankingsError(null);

      const baseVariables: GetEncounterFightRankingsQueryVariables = {
        encounterId,
        difficulty: difficultyId ?? undefined,
        page,
        metric: DEFAULT_METRIC,
        size,
      };

      const preferenceKey = `${encounterId}:${difficultyId ?? 'default'}`;
      const preferredPartition = partitionPreferenceRef.current.get(preferenceKey);
      const prefersLegacyPartition = LEGACY_PARTITION_ENCOUNTER_IDS.has(encounterId);

      const buildVariableCandidates = (): GetEncounterFightRankingsQueryVariables[] => {
        const sizeAdjusted: GetEncounterFightRankingsQueryVariables[] = [baseVariables];

        if (typeof baseVariables.size === 'number') {
          sizeAdjusted.push({ ...baseVariables, size: undefined });
        }

        if (DEFAULT_METRIC === FightRankingMetricType.Score) {
          sizeAdjusted.push({
            ...baseVariables,
            size: undefined,
            metric: FightRankingMetricType.Default,
          });
        }

        const candidateKeys = new Set<string>();
        const candidates: GetEncounterFightRankingsQueryVariables[] = [];
        const addCandidate = (candidate: GetEncounterFightRankingsQueryVariables): void => {
          const signature = JSON.stringify({
            encounterId: candidate.encounterId,
            difficulty: candidate.difficulty ?? null,
            page: candidate.page ?? 1,
            metric: candidate.metric,
            size: candidate.size ?? null,
            partition: candidate.partition ?? null,
          });
          if (!candidateKeys.has(signature)) {
            candidateKeys.add(signature);
            candidates.push(candidate);
          }
        };

        const partitionOrder: Array<number | undefined> = [];
        const addPartitionOrder = (value: number | undefined): void => {
          if (!partitionOrder.includes(value)) {
            partitionOrder.push(value);
          }
        };

        if (prefersLegacyPartition) {
          if (preferredPartition === 0) {
            addPartitionOrder(0);
          }
          addPartitionOrder(0);
          addPartitionOrder(undefined);
        } else {
          if (preferredPartition === 0) {
            addPartitionOrder(preferredPartition);
          }
          addPartitionOrder(undefined);
          addPartitionOrder(0);
        }

        sizeAdjusted.forEach((candidate) => {
          partitionOrder.forEach((partitionValue) => {
            if (typeof partitionValue === 'number') {
              addCandidate({ ...candidate, partition: partitionValue });
            } else {
              addCandidate(candidate);
            }
          });
        });

        return candidates;
      };

      const attemptFetch = async (
        variables: GetEncounterFightRankingsQueryVariables,
      ): Promise<FightRankingsParsed> => {
        const data = await client.query<GetEncounterFightRankingsQuery>({
          query: GetEncounterFightRankingsDocument,
          variables,
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });
        return parseFightRankings(data, variables.page ?? 1);
      };

      const candidates = buildVariableCandidates();
      let lastError: unknown;
      let success = false;

      for (const variables of candidates) {
        try {
          const parsed = await attemptFetch(variables);

          if (parsed.rankings.length === 0 && !parsed.hasMorePages) {
            logger.warn('Leaderboard query returned no data; trying next fallback', { variables });
            continue;
          }

          setRankingsState(parsed);
          if (variables.partition === 0) {
            partitionPreferenceRef.current.set(preferenceKey, variables.partition);
          } else {
            partitionPreferenceRef.current.delete(preferenceKey);
          }
          success = true;
          break;
        } catch (error) {
          lastError = error;
          logger.warn('Leaderboard query failed, trying next fallback', { error });
        }
      }

      if (!success) {
        const fallbackPage = page ?? 1;
        const message =
          lastError instanceof Error
            ? lastError.message
            : 'Leaderboard query returned no data for the available fallbacks';
        setRankingsError(message);
        setRankingsState(createEmptyRankings(fallbackPage));
      }

      setRankingsLoading(false);
    },
    [client, logger],
  );

  React.useEffect(() => {
    if (!client) {
      return;
    }
    void loadZones();
  }, [client, loadZones]);

  React.useEffect(() => {
    if (!currentZone) {
      return;
    }

    if (!currentZone.encounters.some((encounter) => encounter.id === selectedEncounterId)) {
      const nextEncounterId = currentZone.encounters[0]?.id ?? null;
      setSelectedEncounterId(nextEncounterId);
    }

    if (!currentZone.difficulties.some((difficulty) => difficulty.id === selectedDifficultyId)) {
      const nextDifficultyId = pickDefaultDifficulty(currentZone.difficulties);
      setSelectedDifficultyId(nextDifficultyId);
    }
  }, [currentZone, selectedDifficultyId, selectedEncounterId]);

  const resolveSizeForDifficulty = React.useCallback(
    (difficultyId: number | null): number | undefined => {
      if (!difficultyId || !currentZone) {
        return undefined;
      }
      const difficulty = currentZone.difficulties.find((item) => item.id === difficultyId);
      if (!difficulty) {
        return undefined;
      }
      return difficulty.sizes.includes(TRIAL_TEAM_SIZE) ? TRIAL_TEAM_SIZE : undefined;
    },
    [currentZone],
  );

  React.useEffect(() => {
    if (!client || !selectedEncounterId) {
      return;
    }

    const sizeForDifficulty = resolveSizeForDifficulty(selectedDifficultyId);
    void fetchRankings({
      encounterId: selectedEncounterId,
      difficultyId: selectedDifficultyId,
      page: 1,
      size: sizeForDifficulty,
    });
  }, [client, fetchRankings, resolveSizeForDifficulty, selectedEncounterId, selectedDifficultyId]);

  React.useEffect(() => {
    if (!client) {
      logger.error('EsoLogsClient is unavailable for leaderboard data');
    }
  }, [client, logger]);

  const handleZoneChange = (event: SelectChangeEvent<number>): void => {
    const nextZoneId = Number(event.target.value);
    setSelectedZoneId(nextZoneId);
    setSelectedEncounterId(null);
    setSelectedDifficultyId(null);
    setRankingsState(createEmptyRankings());
    setRankingsError(null);
  };

  const handleEncounterChange = (event: SelectChangeEvent<number>): void => {
    const nextEncounterId = Number(event.target.value);
    setSelectedEncounterId(nextEncounterId);
    setRankingsState(createEmptyRankings());
    setRankingsError(null);
  };

  const handleDifficultyChange = (event: SelectChangeEvent<number>): void => {
    const nextDifficultyId = Number(event.target.value);
    setSelectedDifficultyId(nextDifficultyId);
    setRankingsState(createEmptyRankings());
    setRankingsError(null);
  };

  const handleRefresh = (): void => {
    if (!selectedEncounterId) {
      return;
    }
    const sizeForDifficulty = resolveSizeForDifficulty(selectedDifficultyId);
    void fetchRankings({
      encounterId: selectedEncounterId,
      difficultyId: selectedDifficultyId,
      page: rankingsState.page,
      size: sizeForDifficulty,
    });
  };

  const handleNextPage = (): void => {
    if (!selectedEncounterId || rankingsLoading || !rankingsState.hasMorePages) {
      return;
    }
    const nextPage = rankingsState.page + 1;
    const sizeForDifficulty = resolveSizeForDifficulty(selectedDifficultyId);
    void fetchRankings({
      encounterId: selectedEncounterId,
      difficultyId: selectedDifficultyId,
      page: nextPage,
      size: sizeForDifficulty,
    });
  };

  const handlePreviousPage = (): void => {
    if (!selectedEncounterId || rankingsLoading || rankingsState.page <= 1) {
      return;
    }
    const previousPage = rankingsState.page - 1;
    const sizeForDifficulty = resolveSizeForDifficulty(selectedDifficultyId);
    void fetchRankings({
      encounterId: selectedEncounterId,
      difficultyId: selectedDifficultyId,
      page: previousPage,
      size: sizeForDifficulty,
    });
  };

  const handleOpenReport = (row: LeaderboardRow): void => {
    if (!row.reportCode) {
      return;
    }
    if (row.fightId !== undefined) {
      navigate(`/report/${row.reportCode}/fight/${row.fightId}`);
    } else {
      navigate(`/report/${row.reportCode}`);
    }
  };

  if (clientUnavailable) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Leaderboard data is temporarily unavailable. Please refresh the page or try again later.
        </Alert>
      </Container>
    );
  }

  const isInitialLoading = zonesLoading && zones.length === 0;

  if (isInitialLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (zonesError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadZones()}>
              Retry
            </Button>
          }
        >
          {zonesError}
        </Alert>
      </Container>
    );
  }

  if (zones.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">No trial data available. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card
        elevation={4}
        sx={{
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(0, 225, 255, 0.04) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.6) 0%, rgba(224, 242, 254, 0.35) 100%)',
        }}
      >
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
              <EmojiEventsIcon color="primary" />
              <Box>
                <Typography variant="h4" component="h1">
                  Leaderboard Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Explore the highest scoring runs and jump straight into their reports.
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={handleRefresh}
              disabled={rankingsLoading}
              color="primary"
              aria-label="Refresh leaderboard"
            >
              <RefreshIcon />
            </IconButton>
          </Stack>

          <Stack
            spacing={2}
            direction={{ xs: 'column', md: 'row' }}
            sx={{ mt: 3 }}
            alignItems={{ md: 'center' }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="leaderboard-zone-label">Trial</InputLabel>
              <Select
                labelId="leaderboard-zone-label"
                id="leaderboard-zone"
                label="Trial"
                value={selectedZoneId ?? ''}
                onChange={handleZoneChange}
              >
                {zones.map((zone) => (
                  <MenuItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              size="small"
              disabled={!currentZone || currentZone.encounters.length === 0}
            >
              <InputLabel id="leaderboard-encounter-label">Boss</InputLabel>
              <Select
                labelId="leaderboard-encounter-label"
                id="leaderboard-encounter"
                label="Boss"
                value={selectedEncounterId ?? ''}
                onChange={handleEncounterChange}
              >
                {currentZone?.encounters.map((encounter) => (
                  <MenuItem key={encounter.id} value={encounter.id}>
                    {encounter.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              size="small"
              disabled={!currentZone || currentZone.difficulties.length === 0}
            >
              <InputLabel id="leaderboard-difficulty-label">Difficulty</InputLabel>
              <Select
                labelId="leaderboard-difficulty-label"
                id="leaderboard-difficulty"
                label="Difficulty"
                value={selectedDifficultyId ?? ''}
                onChange={handleDifficultyChange}
              >
                {currentZone?.difficulties.map((difficulty) => (
                  <MenuItem key={difficulty.id} value={difficulty.id}>
                    {difficulty.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
            >
              <Typography variant="h6" component="h2">
                {currentEncounter ? currentEncounter.name : 'Select a boss to view rankings'}
              </Typography>
              <Chip
                label={`Metric: ${METRIC_LABEL}`}
                size="small"
                variant="outlined"
                color="primary"
              />
              <Chip
                label={
                  rankingsState.total
                    ? `Ranked runs: ${rankingsState.total.toLocaleString()}`
                    : `Page ${rankingsState.page}`
                }
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>

          {rankingsError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {rankingsError}
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            {rankingsLoading && rankingsState.rankings.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                <CircularProgress />
              </Box>
            ) : rankingsState.rankings.length === 0 ? (
              <Alert severity="info">No leaderboard entries found for this selection.</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Report</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankingsState.rankings.map((row) => {
                      const scoreDisplay =
                        typeof row.score === 'number'
                          ? row.score.toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : '—';
                      const durationDisplay =
                        typeof row.durationMs === 'number' ? formatDuration(row.durationMs) : '—';
                      const dateDisplay =
                        typeof row.reportStart === 'number'
                          ? formatReportDateTime(row.reportStart)
                          : '—';
                      const teamDisplay = row.guildName ?? row.teamName ?? 'Unknown';
                      const regionDisplay = row.regionName ? ` (${row.regionName})` : '';
                      const serverDisplay = row.serverName ? ` • ${row.serverName}` : '';
                      return (
                        <TableRow
                          key={`${row.rank}-${row.reportCode ?? row.teamName ?? row.guildName}`}
                        >
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>
                                {scoreDisplay}
                              </Typography>
                              {typeof row.percentile === 'number' && (
                                <Chip
                                  label={`${row.percentile.toFixed(0)}%`}
                                  size="small"
                                  color="success"
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {teamDisplay}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`${regionDisplay}${serverDisplay}`.trim() || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{durationDisplay}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenReport(row)}
                              disabled={!row.reportCode}
                            >
                              View Log
                            </Button>
                          </TableCell>
                          <TableCell>{dateDisplay}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 3 }}
          >
            <Button
              variant="outlined"
              onClick={handlePreviousPage}
              disabled={rankingsLoading || rankingsState.page <= 1}
            >
              Previous
            </Button>
            <Typography variant="body2" color="text.secondary">
              Page {rankingsState.page}
            </Typography>
            <Button
              variant="contained"
              onClick={handleNextPage}
              disabled={rankingsLoading || !rankingsState.hasMorePages}
            >
              Next
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export function parseTrialZones(response: GetTrialZonesQuery): TrialZone[] {
  const zones = response.worldData?.zones ?? [];

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

export function parseFightRankings(
  response: GetEncounterFightRankingsQuery,
  requestedPage: number,
): FightRankingsParsed {
  const raw = response.worldData?.encounter?.fightRankings;
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

export function parseRankingEntry(entry: unknown, indexHint: number): LeaderboardRow | null {
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

function pickDefaultDifficulty(difficulties: DifficultyOption[]): number | null {
  if (difficulties.length === 0) {
    return null;
  }

  const veteran = difficulties.find((difficulty) =>
    difficulty.name.toLowerCase().includes('veteran'),
  );
  if (veteran) {
    return veteran.id;
  }

  const matchingSize = difficulties.find((difficulty) =>
    difficulty.sizes.includes(TRIAL_TEAM_SIZE),
  );
  if (matchingSize) {
    return matchingSize.id;
  }

  return difficulties[0].id;
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
