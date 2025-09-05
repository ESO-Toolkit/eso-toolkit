import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Paper,
  Typography,
  Button,
  Box,
  Stack,
  Tooltip,
  Skeleton,
  CircularProgress,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

import { FightDetails } from './FightDetails';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined | null;
  fightsLoading: boolean;
  reportId: string | undefined;
  fightId: string | undefined;
  tabId: string | undefined;
}

export const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  reportId,
  fightId,
  tabId,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Show loading panel if fights are loading or missing
  if (fightsLoading) {
    return (
      <Paper elevation={2} sx={{ p: 3, position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Skeleton variant="rounded" width={96} height={32} />
        </Box>
        <Skeleton variant="rounded" width={180} height={36} sx={{ mb: 2 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Skeleton variant="text" width={140} height={28} />
        </Stack>
        <Skeleton variant="text" width={200} />
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <CircularProgress />
          </Box>
        </Box>
      </Paper>
    );
  }

  if (!fight) {
    return <Typography variant="h6">Fight ({fightId}) not found.</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3, position: 'relative' }}>
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
        <Typography variant="h6" gutterBottom={false} sx={{ fontSize: '2.25rem' }}>
          {fight.name} ({fight.id})
        </Typography>
      </Stack>

      <FightDetails fight={fight} reportId={reportId} fightId={fightId} tabId={tabId} />
    </Paper>
  );
};
