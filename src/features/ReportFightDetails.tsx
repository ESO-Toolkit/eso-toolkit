import {
  Paper,
  Typography,
  Button,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
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
import { Event } from '../types/events';

const ReportFightDetails: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessToken } = useAuth();

  // Redux selectors
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const events = useSelector((state: RootState) => state.events.events);
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

  // Get selected target from URL params
  const selectedTargetId = searchParams.get('target') || '';

  // Get available targets (NPCs/Bosses that participated in this fight)
  const targets = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) {
      return [];
    }

    // Get all actor IDs that participated in this fight
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const participatingActorIds = new Set<string>();

    // Filter events for this fight's timeframe and collect participating actors
    events.forEach((event: Event) => {
      if (event.timestamp < fightStart || event.timestamp > fightEnd) {
        return;
      }

      // Collect source IDs (most events have sourceID)
      if ('sourceID' in event && event.sourceID) {
        participatingActorIds.add(String(event.sourceID));
      }

      // Collect target IDs (damage, heal, buff events)
      if ('targetID' in event && event.targetID) {
        participatingActorIds.add(String(event.targetID));
      }
    });

    // Filter actors to only NPCs that participated in the fight
    return Object.values(actorsById)
      .filter(
        (actor) =>
          actor.type === 'NPC' &&
          actor.name &&
          actor.id &&
          participatingActorIds.has(String(actor.id))
      )
      .map((actor) => ({ id: actor.id?.toString() || '', name: actor.name || '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [actorsById, events, fight]);

  const handleTargetChange = (event: SelectChangeEvent) => {
    const targetId = event.target.value;
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (targetId) {
        newParams.set('target', targetId);
      } else {
        newParams.delete('target');
      }
      return newParams;
    });
  };

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
      <Typography variant="h6" gutterBottom>
        Fight Details
      </Typography>

      {fight && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Total Fight Time: {((fight.endTime - fight.startTime) / 1000).toFixed(1)} seconds
        </Typography>
      )}

      {/* Target Selection */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Target Enemy</InputLabel>
          <Select
            value={selectedTargetId}
            label="Target Enemy"
            onChange={handleTargetChange}
            displayEmpty
          >
            {targets.map((target) => (
              <MenuItem key={target.id} value={target.id}>
                {target.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <FightDetails fight={fight} selectedTabId={selectedTabId} />
    </Paper>
  );
};

export default ReportFightDetails;
