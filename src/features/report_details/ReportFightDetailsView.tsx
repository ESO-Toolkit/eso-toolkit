import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Paper, Typography, Button, CircularProgress, Box, Stack, Tooltip } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

import { FightDetails } from './FightDetails';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined;
  fightsLoading: boolean;
  fightsError: string | null;
  selectedTabId?: number;
  reportId: string | undefined;
  fightId: string | undefined;
}

export const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  fightsError,
  selectedTabId,
  reportId,
}) => {
  const navigate = useNavigate();

  // Show loading panel if fights are loading or missing
  if (fightsLoading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Loading Report Data...</Typography>
        </Box>
      </Paper>
    );
  }

  if (fightsError) {
    return <Typography color="error">Error loading fights: {fightsError}</Typography>;
  }

  if (!fight) {
    return <Typography variant="h6">Fight not found.</Typography>;
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
          Fight Details
        </Typography>
      </Stack>

      {fight && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Total Fight Time: {((fight.endTime - fight.startTime) / 1000).toFixed(1)} seconds
        </Typography>
      )}

      <FightDetails fight={fight} selectedTabId={selectedTabId} />
    </Paper>
  );
};
