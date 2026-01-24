import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SkullIcon from '@mui/icons-material/Dangerous';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { DynamicMetaTags } from '../components/DynamicMetaTags';
import { FightFragment } from '../graphql/gql/graphql';
import { useReportData } from '../hooks';
import { useDamageEventsLookup } from '../hooks/events/useDamageEvents';
import { useDeathEvents } from '../hooks/events/useDeathEvents';
import { usePlayerData } from '../hooks/usePlayerData';
import { useBuffLookupTask } from '../hooks/workerTasks/useBuffLookupTask';
import { ReportFightContextInput } from '../store/contextTypes';
import { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';
import {
  TRI_STAT_FOOD,
  HEALTH_AND_REGEN_FOOD,
  HEALTH_FOOD,
  MAGICKA_FOOD,
  STAMINA_FOOD,
  INCREASE_MAX_HEALTH_AND_STAMINA,
  INCREASE_MAX_HEALTH_AND_MAGICKA,
  INCREASE_MAX_MAGICKA_AND_STAMINA,
  MAX_STAMINA_AND_MAGICKA_RECOVERY,
  WITCHES_BREW,
  EXPERIENCE_BOOST_FOOD,
} from '../types/abilities';
import { DeathEvent, DamageEvent } from '../types/combatlogEvents';
import { isBuffActiveOnTarget } from '../utils/BuffLookupUtils';
import { BuildIssue, detectBuildIssues } from '../utils/detectBuildIssues';

// All food buff ability IDs
const ALL_FOOD_BUFF_IDS = new Set([
  ...TRI_STAT_FOOD,
  ...HEALTH_AND_REGEN_FOOD,
  ...HEALTH_FOOD,
  ...MAGICKA_FOOD,
  ...STAMINA_FOOD,
  ...INCREASE_MAX_HEALTH_AND_STAMINA,
  ...INCREASE_MAX_HEALTH_AND_MAGICKA,
  ...INCREASE_MAX_MAGICKA_AND_STAMINA,
  ...MAX_STAMINA_AND_MAGICKA_RECOVERY,
  ...WITCHES_BREW,
  ...EXPERIENCE_BOOST_FOOD,
]);

interface DashboardIssues {
  deaths: {
    total: number;
    players: Array<{ name: string; count: number }>;
    topAbility?: { name: string; count: number };
  };
  buildProblems: {
    total: number;
    playerIssues: Array<{ player: string; issues: BuildIssue[] }>;
  };
  lowPerformers: {
    players: Array<{ name: string; dps: number; expected: number }>;
  };
  missingFood: {
    players: string[];
  };
}

export const RaidDashboardPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const { reportData, isReportLoading } = useReportData();
  const [dashboardData, setDashboardData] = React.useState<DashboardIssues | null>(null);

  // Get the most recent fight
  const mostRecentFight: FightFragment | undefined = useMemo(() => {
    if (!reportData?.fights || reportData.fights.length === 0) return undefined;

    // Sort fights by end time (most recent first)
    const sortedFights = [...reportData.fights].sort((a, b) => {
      const aEnd = a?.endTime ?? a?.startTime ?? 0;
      const bEnd = b?.endTime ?? b?.startTime ?? 0;
      return bEnd - aEnd;
    });

    return sortedFights[0] ?? undefined;
  }, [reportData?.fights]);

  // Create context for hooks
  const context: ReportFightContextInput = useMemo(
    () => ({
      reportCode: reportId || '',
      fightId: mostRecentFight?.id ?? -1,
    }),
    [reportId, mostRecentFight],
  );

  // Use hooks to fetch data
  const { deathEvents, isDeathEventsLoading } = useDeathEvents({ context });
  const { playerData, isPlayerDataLoading } = usePlayerData({ context });
  const { damageEventsByPlayer, isDamageEventsLookupLoading } = useDamageEventsLookup({ context });
  const { buffLookupData, isBuffLookupLoading } = useBuffLookupTask({ context });

  // Flatten damage events from the lookup
  const damageEvents = useMemo(() => {
    if (!damageEventsByPlayer) return [];
    return Object.values(damageEventsByPlayer).flat();
  }, [damageEventsByPlayer]);

  const isAnalyzing =
    isDeathEventsLoading ||
    isPlayerDataLoading ||
    isDamageEventsLookupLoading ||
    isBuffLookupLoading;

  // Analyze issues
  React.useEffect(() => {
    if (!mostRecentFight || !playerData || !deathEvents) return;

    const issues: DashboardIssues = {
      deaths: {
        total: 0,
        players: [],
        topAbility: undefined,
      },
      buildProblems: {
        total: 0,
        playerIssues: [],
      },
      lowPerformers: {
        players: [],
      },
      missingFood: {
        players: [],
      },
    };

    // Analyze deaths
    const playerDeathCounts = new Map<number, { name: string; count: number }>();
    const abilityDeathCounts = new Map<number, { name: string; count: number }>();

    deathEvents.forEach((event: DeathEvent) => {
      if (event.targetIsFriendly) {
        issues.deaths.total++;

        // Track deaths by player
        const playerKey = event.targetID;
        if (playerKey != null) {
          const existing = playerDeathCounts.get(playerKey);
          const actorName = playerData.playersById?.[playerKey]?.name || 'Unknown';
          if (existing) {
            existing.count++;
          } else {
            playerDeathCounts.set(playerKey, { name: actorName, count: 1 });
          }
        }

        // Track deaths by ability
        if (event.abilityGameID != null) {
          const existing = abilityDeathCounts.get(event.abilityGameID);
          if (existing) {
            existing.count++;
          } else {
            abilityDeathCounts.set(event.abilityGameID, { name: 'Unknown Ability', count: 1 });
          }
        }
      }
    });

    issues.deaths.players = Array.from(playerDeathCounts.values()).sort(
      (a, b) => b.count - a.count,
    );
    const topAbilityEntry = Array.from(abilityDeathCounts.values()).sort(
      (a, b) => b.count - a.count,
    )[0];
    if (topAbilityEntry) {
      issues.deaths.topAbility = topAbilityEntry;
    }

    // Analyze build issues for each player
    if (playerData?.playersById) {
      Object.values(playerData.playersById).forEach((player: PlayerDetailsWithRole) => {
        const gear = player.combatantInfo?.gear;
        const playerDamageEvents = damageEvents.filter(
          (event: DamageEvent) => event.sourceID === player.id,
        );

        // Get player resource profile for role detection
        const playerResources =
          playerDamageEvents.length > 0
            ? {
                magicka: playerDamageEvents[0]?.sourceResources?.magicka,
                maxMagicka: playerDamageEvents[0]?.sourceResources?.maxMagicka,
                stamina: playerDamageEvents[0]?.sourceResources?.stamina,
                maxStamina: playerDamageEvents[0]?.sourceResources?.maxStamina,
              }
            : undefined;

        const buildIssues = detectBuildIssues(
          gear,
          buffLookupData || undefined,
          mostRecentFight.startTime,
          mostRecentFight.endTime ?? mostRecentFight.startTime,
          [], // auras - would need separate hook for combatant info events
          player.role,
          playerDamageEvents,
          player.id,
          playerResources,
        );

        if (buildIssues.length > 0) {
          issues.buildProblems.total += buildIssues.length;
          issues.buildProblems.playerIssues.push({
            player: player.name,
            issues: buildIssues,
          });
        }
      });
    }

    // Analyze DPS performance
    if (playerData?.playersById) {
      const fightDuration =
        ((mostRecentFight.endTime ?? mostRecentFight.startTime) - mostRecentFight.startTime) / 1000;

      Object.values(playerData.playersById).forEach((player: PlayerDetailsWithRole) => {
        if (player.role === 'dps') {
          // Calculate DPS from damage events
          const playerDamage = damageEvents
            .filter((event: DamageEvent) => event.sourceID === player.id)
            .reduce((sum: number, event: DamageEvent) => sum + (event.amount || 0), 0);
          const dps = fightDuration > 0 ? playerDamage / fightDuration : 0;

          // Flag players doing less than 50k DPS as low performers
          if (dps < 50000) {
            issues.lowPerformers.players.push({
              name: player.name,
              dps: Math.round(dps),
              expected: 50000,
            });
          }
        }
      });
    }

    // Analyze missing food/drink
    if (playerData?.playersById && buffLookupData) {
      // Check at the midpoint of the fight for food buffs
      const fightMidpoint =
        mostRecentFight.startTime +
        (mostRecentFight.endTime ?? mostRecentFight.startTime - mostRecentFight.startTime) / 2;

      Object.values(playerData.playersById).forEach((player: PlayerDetailsWithRole) => {
        // Check if player has any food buff active during the fight
        const hasFoodBuff = Array.from(ALL_FOOD_BUFF_IDS).some((foodId) =>
          isBuffActiveOnTarget(buffLookupData, foodId, fightMidpoint, player.id),
        );

        if (!hasFoodBuff) {
          issues.missingFood.players.push(player.name);
        }
      });
    }

    setDashboardData(issues);
  }, [mostRecentFight, deathEvents, playerData, damageEvents, buffLookupData]);

  const handleBackToReport = (): void => {
    navigate(`/report/${reportId}`);
  };

  const handleViewFight = (): void => {
    if (mostRecentFight) {
      navigate(`/report/${reportId}/fight/${mostRecentFight.id}`);
    }
  };

  // Generate meta tags
  const metaTags = React.useMemo(() => {
    return {
      title: `Raid Dashboard - ${reportData?.title || reportId}`,
      description: `Quick overview of issues in the most recent fight for report ${reportId}`,
      url: `${window.location.origin}/#/report/${reportId}/dashboard`,
    };
  }, [reportId, reportData]);

  // Loading state
  if (isReportLoading || isAnalyzing) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Loading Dashboard...
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      </Box>
    );
  }

  // No fights available
  if (!mostRecentFight) {
    return (
      <Box sx={{ p: 3 }}>
        <DynamicMetaTags {...metaTags} />
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <IconButton onClick={handleBackToReport} aria-label="Back to report">
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4">Raid Dashboard</Typography>
            </Box>
            <Alert severity="info">No fights found in this report.</Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const fightTime = new Date(mostRecentFight.startTime).toLocaleTimeString();
  const hasIssues =
    (dashboardData?.deaths.total ?? 0) > 0 ||
    (dashboardData?.buildProblems.total ?? 0) > 0 ||
    (dashboardData?.lowPerformers.players.length ?? 0) > 0 ||
    (dashboardData?.missingFood.players.length ?? 0) > 0;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <DynamicMetaTags {...metaTags} />

      {/* Header */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={handleBackToReport} aria-label="Back to report">
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              component="h1"
              sx={{ flex: 1, fontSize: { xs: '1.5rem', md: '2.125rem' } }}
            >
              Raid Dashboard
            </Typography>
            <Button variant="outlined" onClick={handleViewFight} size="small">
              View Fight Details
            </Button>
          </Box>

          <Typography variant="h6" color="text.secondary" gutterBottom>
            {reportData?.title}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            <Chip label="Most Recent Fight" color="primary" size="small" />
            <Chip label={mostRecentFight.name || `Fight ${mostRecentFight.id}`} size="small" />
            <Chip label={fightTime} size="small" />
            <Chip
              label={mostRecentFight.kill ? 'Kill' : 'Wipe'}
              color={mostRecentFight.kill ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Overall Status */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {hasIssues ? (
              <>
                <WarningIcon color="warning" fontSize="large" />
                <Typography variant="h5">Issues Detected</Typography>
              </>
            ) : (
              <>
                <CheckCircleIcon color="success" fontSize="large" />
                <Typography variant="h5">Fight Looks Good!</Typography>
              </>
            )}
          </Box>

          {!hasIssues && (
            <Alert severity="success">
              No significant issues detected in the most recent fight. Great job!
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Issue Sections */}
      {dashboardData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Deaths Section */}
          {dashboardData.deaths.total > 0 && (
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <SkullIcon color="error" />
                  <Typography variant="h6">Deaths ({dashboardData.deaths.total})</Typography>
                </Box>

                {dashboardData.deaths.players.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Players with Deaths</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {dashboardData.deaths.players.map((player, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <ErrorIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={player.name}
                              secondary={`${player.count} ${player.count === 1 ? 'death' : 'deaths'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {dashboardData.deaths.topAbility && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Deadliest Mechanic</Typography>
                    <Typography variant="body2">
                      {dashboardData.deaths.topAbility.name}:{' '}
                      {dashboardData.deaths.topAbility.count} kills
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Low Performance Section */}
          {dashboardData.lowPerformers.players.length > 0 && (
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingDownIcon color="warning" />
                  <Typography variant="h6">
                    Low DPS ({dashboardData.lowPerformers.players.length})
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Players performing below expected DPS thresholds (&lt;50k DPS)
                </Alert>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell align="right">Actual DPS</TableCell>
                      <TableCell align="right">Expected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.lowPerformers.players.map((player, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{player.name}</TableCell>
                        <TableCell align="right">
                          <Typography color="error">{player.dps.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell align="right">{player.expected.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Build Issues Section */}
          {dashboardData.buildProblems.total > 0 && (
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <BuildIcon color="warning" />
                  <Typography variant="h6">
                    Build Issues ({dashboardData.buildProblems.total})
                  </Typography>
                </Box>

                <Alert severity="warning" sx={{ mb: 2 }}>
                  Players with gear quality, enchantment, or buff issues detected.
                </Alert>

                {dashboardData.buildProblems.playerIssues.map((playerIssue, idx) => (
                  <Accordion key={idx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        {playerIssue.player} ({playerIssue.issues.length}{' '}
                        {playerIssue.issues.length === 1 ? 'issue' : 'issues'})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {playerIssue.issues.map((issue, issueIdx) => (
                          <ListItem key={issueIdx}>
                            <ListItemIcon>
                              <WarningIcon color="warning" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={issue.message} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Missing Food Section */}
          {dashboardData.missingFood.players.length > 0 && (
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <FastfoodIcon color="warning" />
                  <Typography variant="h6">
                    Missing Food/Drink ({dashboardData.missingFood.players.length})
                  </Typography>
                </Box>

                <List dense>
                  {dashboardData.missingFood.players.map((player, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={player} secondary="No food/drink buff detected" />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};
