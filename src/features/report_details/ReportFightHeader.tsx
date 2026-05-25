import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportData } from '@/hooks';
import { useSelectedReportAndFight } from '@/ReportFightContext';
import { selectCombatantInfoEvents } from '@/store/events_data/combatantInfoEventsSelectors';
import { selectActivePlayersById } from '@/store/player_data/playerDataSelectors';
import type { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import type { RootState } from '@/store/storeWithHistory';
import { createDefaultRoster } from '@/types/roster';
import { cleanArray } from '@/utils/cleanArray';
import { convertLogPlayersToRoster, type LogPlayerDetails } from '@/utils/logToRoster';
import { encodeRosterToURL } from '@/utils/rosterEncoding';

// Custom hook for fight navigation logic
export const useFightNavigation = (): {
  navigationMode: 'all' | 'bosses';
  navigationData: {
    currentIndex: number;
    previousFight: FightFragment | null;
    nextFight: FightFragment | null;
    totalCount: number;
    modeLabel: string;
    currentFightType: 'boss' | 'trash' | 'unknown';
  };
  navigateToPrevious: () => void;
  navigateToNext: () => void;
  handleNavigationModeChange: (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'all' | 'bosses',
  ) => void;
} => {
  const navigate = useNavigate();
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportData } = useReportData();

  // Navigation mode state
  const [navigationMode, setNavigationMode] = React.useState<'all' | 'bosses'>('all');

  // Get all fights sorted by start time for navigation
  const sortedFights = React.useMemo<FightFragment[]>(() => {
    if (!reportData?.fights) return [];

    return cleanArray(reportData.fights.filter(Boolean))
      .filter((fight) => fight.startTime && fight.endTime && fight.endTime > fight.startTime)
      .sort((a, b) => a.startTime - b.startTime);
  }, [reportData?.fights]);

  // Get boss fights (fights with difficulty set) for boss navigation
  const bossFights = React.useMemo<FightFragment[]>(() => {
    return sortedFights.filter((fight) => fight.difficulty != null);
  }, [sortedFights]);

  // Unified navigation logic based on current mode
  const navigationData = React.useMemo(() => {
    if (!fightId) {
      return {
        currentIndex: -1,
        previousFight: null,
        nextFight: null,
        totalCount: 0,
        modeLabel: navigationMode === 'all' ? 'Fight' : 'Boss',
        currentFightType: 'unknown' as 'boss' | 'trash' | 'unknown',
      };
    }

    const fightIdNumber = parseInt(fightId, 10);
    const activeList = navigationMode === 'all' ? sortedFights : bossFights;

    if (activeList.length === 0) {
      return {
        currentIndex: -1,
        previousFight: null,
        nextFight: null,
        totalCount: 0,
        modeLabel: navigationMode === 'all' ? 'Fight' : 'Boss',
        currentFightType: 'unknown' as 'boss' | 'trash' | 'unknown',
      };
    }

    const currentIndex = activeList.findIndex((f) => f.id === fightIdNumber);

    // Determine if current fight is a boss or trash
    const currentFight = sortedFights.find((f) => f.id === fightIdNumber);
    const currentFightType: 'boss' | 'trash' | 'unknown' =
      currentFight?.difficulty != null ? 'boss' : 'trash';

    if (currentIndex === -1) {
      // Current fight not found in active list - handle cross-mode navigation
      if (navigationMode === 'bosses' && currentFightType === 'trash') {
        // We're on a trash fight but in boss mode - find nearest boss fights
        const currentFightStartTime = currentFight?.startTime;
        if (currentFightStartTime != null) {
          // Find the previous boss fight (last boss before current fight)
          const previousBoss =
            bossFights
              .filter((boss) => boss.startTime < currentFightStartTime)
              .sort((a, b) => b.startTime - a.startTime)[0] || null;

          // Find the next boss fight (first boss after current fight)
          const nextBoss =
            bossFights
              .filter((boss) => boss.startTime > currentFightStartTime)
              .sort((a, b) => a.startTime - b.startTime)[0] || null;

          return {
            currentIndex: -1, // Not in boss list
            previousFight: previousBoss,
            nextFight: nextBoss,
            totalCount: activeList.length,
            modeLabel: 'Boss', // We're in bosses mode when doing cross-navigation
            currentFightType,
          };
        }
      }

      // Default case - current fight not found in active list
      return {
        currentIndex: -1,
        previousFight: null,
        nextFight: null,
        totalCount: activeList.length,
        modeLabel: navigationMode === 'all' ? 'Fight' : 'Boss',
        currentFightType,
      };
    }

    const previousFight = currentIndex > 0 ? activeList[currentIndex - 1] : null;
    const nextFight = currentIndex < activeList.length - 1 ? activeList[currentIndex + 1] : null;

    return {
      currentIndex,
      previousFight,
      nextFight,
      totalCount: activeList.length,
      modeLabel: navigationMode === 'all' ? 'Fight' : 'Boss',
      currentFightType,
    };
  }, [fightId, sortedFights, bossFights, navigationMode]);

  // Navigation functions
  const navigateToPrevious = React.useCallback(() => {
    if (navigationData.previousFight && reportId) {
      navigate(`/report/${reportId}/fight/${navigationData.previousFight.id}/insights`);
    }
  }, [navigationData.previousFight, reportId, navigate]);

  const navigateToNext = React.useCallback(() => {
    if (navigationData.nextFight && reportId) {
      navigate(`/report/${reportId}/fight/${navigationData.nextFight.id}/insights`);
    }
  }, [navigationData.nextFight, reportId, navigate]);

  const handleNavigationModeChange = React.useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: 'all' | 'bosses') => {
      if (newMode !== null) {
        setNavigationMode(newMode);
      }
    },
    [],
  );

  return {
    navigationMode,
    navigationData,
    navigateToPrevious,
    navigateToNext,
    handleNavigationModeChange,
  };
};

export const ReportFightHeader: React.FC = () => {
  const navigate = useNavigate();
  const { reportId, fightId } = useSelectedReportAndFight();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { fight, isFightLoading } = useCurrentFight();

  // Ref for immediate title rendering
  const titleRef = React.useRef<HTMLElement>(null);

  // AGGRESSIVE LCP OPTIMIZATION: Paint content before React hydration
  React.useLayoutEffect(() => {
    if (titleRef.current && fightId) {
      // Bypass React and directly manipulate DOM for immediate paint
      const titleElement = titleRef.current;

      // Set immediate static content
      titleElement.textContent = `Fight ${fightId}`;

      // Force immediate browser paint
      titleElement.style.transform = 'translateZ(0)'; // Force layer creation
      titleElement.getBoundingClientRect(); // Force layout

      // Upgrade to real content when available
      if (fight) {
        const isBossFight = fight.difficulty != null;
        let statusIndicator: string;

        if (isBossFight) {
          // Boss fight logic
          const bossWasKilled =
            fight.bossPercentage !== null &&
            fight.bossPercentage !== undefined &&
            fight.bossPercentage <= 1.0;
          statusIndicator = bossWasKilled
            ? '✓'
            : fight.bossPercentage
              ? `${Math.round(fight.bossPercentage)}%`
              : 'Wipe';
        } else {
          // Trash fight logic - use kill field
          const wasKilled = fight.kill === true || fight.kill === null;
          statusIndicator = wasKilled ? '✓' : 'Wipe';
        }

        titleElement.textContent = '';
        titleElement.appendChild(document.createTextNode(`${fight.name} (`));
        const span = document.createElement('span');
        span.style.fontWeight = '300';
        span.textContent = statusIndicator;
        titleElement.appendChild(span);
        titleElement.appendChild(document.createTextNode(')'));
      }
    }
  }, [fight, isFightLoading, fightId]);

  // Force immediate render on mount
  React.useLayoutEffect(() => {
    if (titleRef.current && fightId && !fight) {
      // Ensure content is visible immediately, even before fight data loads
      titleRef.current.textContent = `Fight ${fightId}`;
      titleRef.current.style.visibility = 'visible';
      titleRef.current.style.opacity = '1';
    }
  }, [fightId, fight, isFightLoading]);

  // ── Create Roster from fight players ──────────────────────────────────────
  const playersById = useSelector((state: RootState) => selectActivePlayersById(state));
  const combatantInfoEvents = useSelector((state: RootState) => selectCombatantInfoEvents(state));
  const [rosterLoading, setRosterLoading] = React.useState(false);

  const hasPlayers = Object.keys(playersById).length > 0;

  const handleCreateRoster = React.useCallback(async () => {
    if (!hasPlayers) return;
    setRosterLoading(true);
    try {
      // Group flat playersById into role arrays for LogPlayerDetails
      const tanks: PlayerDetailsWithRole[] = [];
      const healers: PlayerDetailsWithRole[] = [];
      const dps: PlayerDetailsWithRole[] = [];
      for (const player of Object.values(playersById)) {
        if (player.role === 'tank') tanks.push(player);
        else if (player.role === 'healer') healers.push(player);
        else dps.push(player);
      }

      const details: LogPlayerDetails = { tanks, healers, dps };
      const defaultRoster = createDefaultRoster();

      // CombatantInfoEvents from Redux use the canonical type which has `ability` on auras;
      // convertLogPlayersToRoster expects the same shape via LogCombatantInfoEvent
      const result = convertLogPlayersToRoster(details, combatantInfoEvents, defaultRoster);

      const roster = {
        ...defaultRoster,
        rosterName: fight?.name ? `${fight.name} Roster` : 'Imported Roster',
        tanks: defaultRoster.tanks.map((t, i) =>
          i < result.tanks.length ? { ...result.tanks[i], slotNumber: i + 1 } : t,
        ),
        healers: defaultRoster.healers.map((h, i) =>
          i < result.healers.length ? { ...result.healers[i], slotNumber: i + 1 } : h,
        ),
        dpsSlots: result.dpsSlots.length > 0 ? result.dpsSlots : defaultRoster.dpsSlots,
        rosterDetailLevel: 'full' as const,
        updatedAt: new Date().toISOString(),
      };

      const encoded = await encodeRosterToURL(roster);
      if (encoded) {
        navigate(`/roster-builder?r=${encoded}`);
      }
    } finally {
      setRosterLoading(false);
    }
  }, [hasPlayers, playersById, combatantInfoEvents, fight, navigate]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Shared pill-style base for action buttons
  const pillBase = {
    textTransform: 'none' as const,
    borderRadius: '99px',
    fontWeight: 500,
    fontSize: '0.8125rem',
    padding: isMobile ? '6px' : '6px 14px',
    minWidth: isMobile ? 36 : 'auto',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  };

  return (
    <React.Fragment>
      {/* ── Toolbar: back + actions ─────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1 },
          mb: { xs: 1.5, sm: 2 },
          py: { xs: 0.75, sm: 1 },
          px: { xs: 1, sm: 1.5 },
          borderRadius: '12px',
          background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Back button */}
        <Tooltip title="Back to Fight List">
          {isMobile ? (
            <IconButton
              onClick={() => navigate(`/report/${reportId}`)}
              aria-label="Back to Fight List"
              size="small"
              sx={{
                color: isDarkMode ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)',
                '&:hover': {
                  color: isDarkMode ? '#e2e8f0' : '#1e293b',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <Button
              onClick={() => navigate(`/report/${reportId}`)}
              startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
              size="small"
              sx={{
                ...pillBase,
                color: isDarkMode ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)',
                padding: '6px 14px',
                '&:hover': {
                  color: isDarkMode ? '#e2e8f0' : '#1e293b',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                },
              }}
            >
              Fight List
            </Button>
          )}
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Action buttons */}
        <Tooltip title="Interactive Fight Replay">
          <Button
            onClick={() => navigate(`/report/${reportId}/fight/${fightId}/replay`)}
            variant="outlined"
            size="small"
            aria-label="Interactive Fight Replay"
            startIcon={!isMobile ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : undefined}
            sx={{
              ...pillBase,
              borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.25)',
              color: isDarkMode ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)',
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)',
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.08)',
              },
            }}
          >
            {isMobile ? <PlayArrowIcon sx={{ fontSize: 18 }} /> : 'Replay'}
          </Button>
        </Tooltip>
        <Tooltip title="View full report on ESO Logs">
          <Button
            href={`https://www.esologs.com/reports/${reportId}?fight=${fightId}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            aria-label="View full report on ESO Logs"
            startIcon={!isMobile ? <OpenInNewIcon sx={{ fontSize: 16 }} /> : undefined}
            sx={{
              ...pillBase,
              borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(59, 130, 246, 0.25)',
              color: isDarkMode ? 'rgba(56, 189, 248, 0.9)' : 'rgba(37, 99, 235, 0.9)',
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(59, 130, 246, 0.4)',
                backgroundColor: isDarkMode
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'rgba(59, 130, 246, 0.08)',
              },
            }}
          >
            {isMobile ? <OpenInNewIcon sx={{ fontSize: 18 }} /> : 'ESO Logs'}
          </Button>
        </Tooltip>
        {hasPlayers && (
          <Tooltip title="Create a roster from this fight's players">
            <Button
              onClick={handleCreateRoster}
              disabled={rosterLoading}
              variant="outlined"
              size="small"
              aria-label="Create a roster from this fight's players"
              startIcon={
                !isMobile ? (
                  rosterLoading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <GroupsIcon sx={{ fontSize: 16 }} />
                  )
                ) : undefined
              }
              sx={{
                ...pillBase,
                borderColor: isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(147, 51, 234, 0.25)',
                color: isDarkMode ? 'rgba(168, 85, 247, 0.9)' : 'rgba(126, 34, 206, 0.9)',
                '&:hover': {
                  borderColor: isDarkMode ? 'rgba(168, 85, 247, 0.5)' : 'rgba(147, 51, 234, 0.4)',
                  backgroundColor: isDarkMode
                    ? 'rgba(168, 85, 247, 0.08)'
                    : 'rgba(147, 51, 234, 0.08)',
                },
              }}
            >
              {isMobile ? (
                rosterLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <GroupsIcon sx={{ fontSize: 18 }} />
                )
              ) : (
                'Roster'
              )}
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* ── Fight title ────────────────────────────────────────── */}
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, sm: 3, md: 4 } }}
      >
        <Typography
          ref={titleRef}
          variant="h4"
          gutterBottom={false}
          data-testid="fight-title"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
            fontWeight: 500,
            lineHeight: 1.2,
            // Use system fonts for fastest rendering - most aggressive stack
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            // Pre-allocate space to prevent layout shift
            minHeight: { xs: '1.8rem', sm: '2.4rem', md: '2.7rem' },
            // AGGRESSIVE LCP optimizations
            willChange: 'contents', // Hint that content will change
            contain: 'layout style', // Contain layout calculations
            // Force immediate visibility and prioritize painting
            opacity: 1,
            visibility: 'visible',
            // Critical rendering hints
            '&': {
              // Ensure this element gets prioritized in paint order
              zIndex: 1,
              position: 'relative',
            },
            // Remove any transitions that could delay initial paint
            transition: 'none',
            // Optimize text rendering for speed over quality initially
            textRendering: 'optimizeSpeed',
          }}
        >
          {/* Fallback content for SSR/initial render */}
          {fight
            ? (() => {
                const isBossFight = fight.difficulty != null;
                let statusIndicator: string;

                if (isBossFight) {
                  // Boss fight logic
                  const bossWasKilled =
                    fight.bossPercentage !== null &&
                    fight.bossPercentage !== undefined &&
                    fight.bossPercentage <= 1.0;
                  statusIndicator = bossWasKilled
                    ? '✓'
                    : fight.bossPercentage
                      ? `${Math.round(fight.bossPercentage)}%`
                      : 'Wipe';
                } else {
                  // Trash fight logic - use kill field
                  const wasKilled = fight.kill === true || fight.kill === null;
                  statusIndicator = wasKilled ? '✓' : 'Wipe';
                }

                return (
                  <>
                    {fight.name} (<span style={{ fontWeight: 300 }}>{statusIndicator}</span>)
                  </>
                );
              })()
            : fightId
              ? `Fight ${fightId}`
              : 'Loading...'}
        </Typography>
      </Stack>
    </React.Fragment>
  );
};
