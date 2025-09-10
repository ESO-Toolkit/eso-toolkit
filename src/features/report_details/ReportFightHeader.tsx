import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '@/graphql/generated';
import { useCurrentFight, useReportData } from '@/hooks';
import { useSelectedReportAndFight } from '@/ReportFightContext';
import { cleanArray } from '@/utils/cleanArray';

export const ReportFightHeader: React.FC = () => {
  const navigate = useNavigate();
  const { reportId, fightId } = useSelectedReportAndFight();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // Get report data to access the fights list for navigation
  const { reportData } = useReportData();
  const fight = useCurrentFight();

  // Ref for immediate title rendering
  const titleRef = React.useRef<HTMLElement>(null);

  // Get all fights sorted by start time for navigation
  const sortedFights = React.useMemo<FightFragment[]>(() => {
    if (!reportData?.fights) return [];

    return cleanArray(reportData.fights.filter(Boolean))
      .filter((fight) => fight.startTime && fight.endTime && fight.endTime > fight.startTime)
      .sort((a, b) => a.startTime - b.startTime);
  }, [reportData?.fights]);

  // Find current fight index and navigation fights
  const { currentIndex, previousFight, nextFight } = React.useMemo(() => {
    if (!fightId || sortedFights.length === 0) {
      return { currentIndex: -1, previousFight: null, nextFight: null };
    }

    const fightIdNumber = parseInt(fightId, 10);
    const currentIndex = sortedFights.findIndex((f) => f.id === fightIdNumber);

    if (currentIndex === -1) {
      return { currentIndex: -1, previousFight: null, nextFight: null };
    }

    const previousFight = currentIndex > 0 ? sortedFights[currentIndex - 1] : null;
    const nextFight =
      currentIndex < sortedFights.length - 1 ? sortedFights[currentIndex + 1] : null;

    return { currentIndex, previousFight, nextFight };
  }, [fightId, sortedFights]);

  // Navigation functions
  const navigateToPreviousFight = React.useCallback(() => {
    if (previousFight && reportId) {
      navigate(`/report/${reportId}/fight/${previousFight.id}/insights`);
    }
  }, [previousFight, reportId, navigate]);

  const navigateToNextFight = React.useCallback(() => {
    if (nextFight && reportId) {
      navigate(`/report/${reportId}/fight/${nextFight.id}/insights`);
    }
  }, [nextFight, reportId, navigate]);

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
        titleElement.textContent = `${fight.name} (${fight.id})`;
      }
    }
  }, [fight, fightId]);

  // Force immediate render on mount
  React.useLayoutEffect(() => {
    if (titleRef.current && fightId && !fight) {
      // Ensure content is visible immediately, even before fight data loads
      titleRef.current.textContent = `Fight ${fightId}`;
      titleRef.current.style.visibility = 'visible';
      titleRef.current.style.opacity = '1';
    }
  }, [fightId, fight]);

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
              fontSize: '0.875rem',
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
              fontSize: '0.875rem',
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

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
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
          {fightId ? `Fight ${fightId}` : 'Loading...'}
        </Typography>
      </Stack>

      {/* Fight Navigation */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
        <Tooltip title={previousFight ? `Previous: ${previousFight.name}` : 'No previous fight'}>
          <span>
            <IconButton
              onClick={navigateToPreviousFight}
              disabled={!previousFight}
              size="small"
              sx={{
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                border: 1,
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                },
                '&:disabled': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Typography
          variant="body2"
          sx={{
            alignSelf: 'center',
            color: 'text.secondary',
            fontWeight: 500,
            minWidth: '120px',
            textAlign: 'center',
          }}
        >
          {currentIndex >= 0 && sortedFights.length > 0
            ? `${currentIndex + 1} of ${sortedFights.length}`
            : 'Loading...'}
        </Typography>

        <Tooltip title={nextFight ? `Next: ${nextFight.name}` : 'No next fight'}>
          <span>
            <IconButton
              onClick={navigateToNextFight}
              disabled={!nextFight}
              size="small"
              sx={{
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                border: 1,
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                },
                '&:disabled': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                },
              }}
            >
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </React.Fragment>
  );
};
