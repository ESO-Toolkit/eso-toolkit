import { Box, Typography, Alert } from '@mui/material';
import React, { useMemo } from 'react';

import { useCurrentFight } from '@/hooks';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { FightReplay3D } from './components/FightReplay3D';

export const FightReplay: React.FC = () => {
  const { lookup, isActorPositionsLoading, actorPositionsError } = useActorPositionsTask();
  const { fight, isFightLoading } = useCurrentFight();

  // Get buff events for phase detection using the proper hooks that fetch data
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();

  // Combine buff events for phase detection (phase transitions might be in either)
  const allBuffEvents = useMemo(() => {
    return [...friendlyBuffEvents, ...hostileBuffEvents];
  }, [friendlyBuffEvents, hostileBuffEvents]);

  const isLoading =
    isActorPositionsLoading ||
    isFriendlyBuffEventsLoading ||
    isHostileBuffEventsLoading ||
    isFightLoading;

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Fight Replay - 3D View
        </Typography>
        <Alert severity="info">Loading actor position data...</Alert>
      </Box>
    );
  }

  // Error state
  if (actorPositionsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Fight Replay - 3D View
        </Typography>
        <Alert severity="error">Error loading actor positions: {actorPositionsError}</Alert>
      </Box>
    );
  }

  // No fight selected
  if (!fight) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Fight Replay - 3D View
        </Typography>
        <Alert severity="warning">
          No fight selected. Please select a fight to view the replay.
        </Alert>
      </Box>
    );
  }

  // No lookup data
  if (!lookup) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Fight Replay - 3D View
        </Typography>
        <Alert severity="warning">No actor position data available for this fight.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Fight Replay - 3D View
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {fight.name} - Duration: {Math.floor(fight?.endTime - fight?.startTime / 1000)}s
      </Typography>

      {/* 3D Arena */}
      <FightReplay3D selectedFight={fight} allBuffEvents={allBuffEvents} showActorNames={true} />
    </Box>
  );
};
