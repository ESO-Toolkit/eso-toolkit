import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportData } from '@/hooks';
import { useSelectedReportAndFight } from '@/ReportFightContext';
import { cleanArray } from '@/utils/cleanArray';

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
        const bossWasKilled =
          fight.bossPercentage !== null &&
          fight.bossPercentage !== undefined &&
          fight.bossPercentage <= 1.0;
        const statusIndicator = bossWasKilled
          ? '✓'
          : fight.bossPercentage
            ? `${Math.round(fight.bossPercentage)}%`
            : 'Wipe';
        titleElement.innerHTML = `${fight.name} (<span style="font-weight: 300;">${statusIndicator}</span>)`;
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

  return (
    <React.Fragment>
      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
        <Tooltip title="Interactive Fight Replay">
          <Button
            onClick={() => navigate(`/report/${reportId}/fight/${fightId}/replay`)}
            variant="outlined"
            size="small"
            startIcon={<PlayArrowIcon />}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
              padding: { xs: '4px 8px', sm: '6px 12px', md: '6px 16px' },
              minWidth: { xs: 'auto', sm: 'auto', md: 'auto' },
              borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.25)',
              color: isDarkMode ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)',
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.4)',
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.05)',
              },
            }}
          >
            Replay
          </Button>
        </Tooltip>
        <Tooltip title="View full report on ESO Logs">
          <Button
            component="a"
            href={`https://www.esologs.com/reports/${reportId}?fight=${fightId}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
              padding: { xs: '4px 8px', sm: '6px 12px', md: '6px 16px' },
              minWidth: { xs: 'auto', sm: 'auto', md: 'auto' },
              borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(59, 130, 246, 0.25)',
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.5)' : 'rgba(59, 130, 246, 0.4)',
              },
            }}
          >
            ESO Logs
          </Button>
        </Tooltip>
      </Box>
      <Box
        component="button"
        onClick={() => {
          navigate(`/report/${reportId}`);
        }}
        sx={{
          mb: 2,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: isDarkMode ? 'rgba(226, 232, 240, 0.7)' : 'rgba(51, 65, 85, 0.7)',
          position: 'relative',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '"←"',
            fontSize: '1rem',
            fontWeight: 600,
            background: isDarkMode
              ? 'linear-gradient(135deg, #38bdf8 0%, #9333ea 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            transition: 'transform 0.3s ease',
            marginRight: '4px',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -2,
            left: 0,
            width: '0%',
            height: '2px',
            background: isDarkMode
              ? 'linear-gradient(135deg, #38bdf8 0%, #9333ea 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
            borderRadius: '1px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '&:hover': {
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            transform: 'translateX(-4px)',
            '&::before': {
              transform: 'translateX(-2px) scale(1.1)',
            },
            '&::after': {
              width: '100%',
            },
          },
          '&:focus-visible': {
            outline: `2px solid ${isDarkMode ? '#38bdf8' : '#3b82f6'}`,
            outlineOffset: '4px',
            borderRadius: '4px',
          },
        }}
      >
        Back to Fight List
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
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
                const bossWasKilled =
                  fight.bossPercentage !== null &&
                  fight.bossPercentage !== undefined &&
                  fight.bossPercentage <= 1.0;
                const statusIndicator = bossWasKilled
                  ? '✓'
                  : fight.bossPercentage
                    ? `${Math.round(fight.bossPercentage)}%`
                    : 'Wipe';
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
