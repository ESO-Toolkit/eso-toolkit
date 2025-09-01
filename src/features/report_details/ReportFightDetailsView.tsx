import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Paper, Typography, Button, Box, Stack, Tooltip, Skeleton, CircularProgress } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { getSkeletonForTab } from '../../utils/getSkeletonForTab';

import { FightFragment } from '../../graphql/generated';

import { FightDetails } from './FightDetails';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined | null;
  fightsLoading: boolean;
  selectedTabId?: number;
  reportId: string | undefined;
  fightId: string | undefined;
}

export const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  selectedTabId,
  reportId,
  fightId,
}) => {
  const navigate = useNavigate();

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
      <Tooltip title="View full report on ESO Logs">
        <Button
          component="a"
          href={`https://www.esologs.com/reports/${reportId}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            textTransform: 'none',
            fontSize: '0.875rem',
          }}
        >
          ESO Logs
        </Button>
      </Tooltip>
      <Button
        variant="outlined"
        sx={{
          mb: 2,
          color: 'text.secondary',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
          textTransform: 'none',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          },
        }}
        onClick={() => {
          navigate(`/report/${reportId}`);
        }}
      >
        Back to Fight List
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" gutterBottom={false}>
          {fight.name} ({fight.id})
        </Typography>
      </Stack>

      <FightDetails fight={fight} selectedTabId={selectedTabId} />
    </Paper>
  );
};
