import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Paper, Typography, Button, CircularProgress, Box, Stack, Tooltip } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

import FightDetails from './FightDetails';

interface ReportFightDetailsViewProps {
  fight: FightFragment | undefined;
  fightsLoading: boolean;
  fightsError: string | null;
  masterDataLoading: boolean;
  masterDataLoaded: boolean;
  eventsLoading: boolean;
  currentFetchFightId: number | null;
  selectedTabId?: number;
  reportId: string | undefined;
  fightId: string | undefined;
}

const ReportFightDetailsView: React.FC<ReportFightDetailsViewProps> = ({
  fight,
  fightsLoading,
  fightsError,
  masterDataLoading,
  masterDataLoaded,
  eventsLoading,
  currentFetchFightId,
  selectedTabId,
  reportId,
  fightId,
}) => {
  const navigate = useNavigate();

  // Show loading panel if fights, master data, or events are loading, or fights are missing
  if (
    fightsLoading ||
    masterDataLoading ||
    !masterDataLoaded ||
    (eventsLoading && currentFetchFightId === Number(fightId))
  ) {
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
          <Typography variant="h6">Loading...</Typography>
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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Button
        variant="outlined"
        sx={{ mb: 2 }}
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
              textTransform: 'none',
              fontSize: '0.875rem',
            }}
          >
            ESO Logs
          </Button>
        </Tooltip>
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

export default ReportFightDetailsView;
