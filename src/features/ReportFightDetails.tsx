import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Paper, Typography, Button, CircularProgress, Box, Stack, Tooltip } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import FightDetails from '../FightDetails';
import { FightFragment } from '../graphql/generated';
import { useReportFightParams } from '../hooks/useReportFightParams';
import { fetchEventsForFight, clearEvents } from '../store/eventsSlice';
import { fetchReportMasterData, clearMasterData } from '../store/masterDataSlice';
import { fetchReportData } from '../store/reportSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { accessToken } = useAuth();

  // Redux selectors

  const fights = useSelector((state: RootState) => state.report.fights);
  const fightsLoading = useSelector((state: RootState) => state.report.loading);
  const fightsError = useSelector((state: RootState) => state.report.error);
  const currentReportId = useSelector((state: RootState) => state.report.reportId);
  const fight = fights.find((f: FightFragment) => f.id === Number(fightId));

  // Master data loading state
  const masterDataLoaded = useSelector((state: RootState) => state.masterData.loaded);
  const masterDataLoading = useSelector((state: RootState) => state.masterData.loading);
  const masterDataError = useSelector((state: RootState) => state.masterData.error);

  // Fetch master data if not loaded
  React.useEffect(() => {
    if (reportId && accessToken && !masterDataLoaded && !masterDataLoading && !masterDataError) {
      dispatch(fetchReportMasterData({ reportCode: reportId, accessToken }));
    }
  }, [reportId, accessToken, masterDataLoaded, masterDataLoading, masterDataError, dispatch]);

  // Events loading state and current fetch fight id
  const eventsLoading = useSelector((state: RootState) => state.events.loading);
  const currentFetchFightId = useSelector((state: RootState) => state.events.currentFetchFightId);

  // Always fetch report data if fights are missing
  React.useEffect(() => {
    if (reportId && accessToken && fights.length === 0 && !fightsLoading && !fightsError) {
      // Clear existing data when fetching a new report (different from current one)
      if (currentReportId !== reportId) {
        dispatch(clearEvents());
        dispatch(clearMasterData());
      }
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, fights.length, fightsLoading, fightsError, currentReportId, dispatch]);

  React.useEffect(() => {
    if (fight && reportId && accessToken) {
      void dispatch(fetchEventsForFight({ reportCode: reportId, fight, accessToken }));
    }
  }, [fight, reportId, accessToken, dispatch]);

  // Show loading panel if fights, master data, or events are loading, or fights are missing
  if (
    fightsLoading ||
    fights.length === 0 ||
    masterDataLoading ||
    !masterDataLoaded ||
    (eventsLoading && currentFetchFightId === Number(fightId))
  ) {
    return (
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
    );
  }
  if (fightsError) {
    return <Typography color="error">Error loading fights: {fightsError}</Typography>;
  }
  if (!fight) {
    return <Typography variant="h6">Fight not found.</Typography>;
  }

  // Get selectedTabId from query param if present
  const selectedTabId = searchParams.has('selectedTabId')
    ? Number(searchParams.get('selectedTabId'))
    : undefined;

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

export default ReportFightDetails;
