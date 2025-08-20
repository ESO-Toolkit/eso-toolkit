import { Paper, Typography, Button, CircularProgress, Box } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import FightDetails from '../FightDetails';
import { FightFragment } from '../graphql/generated';
import { useReportFightParams } from '../hooks/useReportFightParams';
import { fetchEventsForFight } from '../store/eventsSlice';
import { fetchReportMasterData } from '../store/masterDataSlice';
import { fetchReportData } from '../store/reportSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const fights = useSelector((state: RootState) => state.report.fights);
  const fightsLoading = useSelector((state: RootState) => state.report.loading);
  const fightsError = useSelector((state: RootState) => state.report.error);
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
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, fights.length, fightsLoading, fightsError, dispatch]);

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
      <Typography variant="h6" gutterBottom>
        Fight Details
      </Typography>
      <FightDetails fight={fight} />
    </Paper>
  );
};

export default ReportFightDetails;
