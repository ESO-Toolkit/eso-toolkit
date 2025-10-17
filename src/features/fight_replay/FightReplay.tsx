import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportFightParams } from '@/hooks';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useMarkerStats } from '../../hooks/useMarkerStats';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { FightReplay3D } from './components/FightReplay3D';
import { MapMarkersModal } from './components/MapMarkersModal';

export const FightReplay: React.FC = () => {
  const navigate = useNavigate();
  const { reportId, fightId } = useReportFightParams();
  const { lookup, isActorPositionsLoading, actorPositionsError } = useActorPositionsTask();
  const { fight, isFightLoading } = useCurrentFight();

  // Map Markers state (M0R or Elms format)
  const [mapMarkersString, setMapMarkersString] = useState<string | null>(null);
  const [markersModalOpen, setMarkersModalOpen] = useState(false);

  // Handle loading markers from modal
  const handleLoadMarkers = useCallback((markersString: string): void => {
    setMapMarkersString(markersString);
    setMarkersModalOpen(false);
  }, []);

  // Handle clearing markers
  const handleClearMarkers = useCallback((): void => {
    setMapMarkersString(null);
  }, []);

  // Handle navigation back to fight details
  const handleBackToFight = useCallback((): void => {
    if (reportId && fightId) {
      navigate(`/report/${reportId}/fight/${fightId}`);
    }
  }, [navigate, reportId, fightId]);

  // Get buff events for phase detection using the proper hooks that fetch data
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();

  // Compute marker statistics
  const markerStats = useMarkerStats(mapMarkersString || undefined, fight || ({} as FightFragment));

  // Determine if we should show the loading panel
  const allBuffEvents = useMemo(() => {
    return [...friendlyBuffEvents, ...hostileBuffEvents];
  }, [friendlyBuffEvents, hostileBuffEvents]);

  // Only show loading if we don't have the necessary data yet
  // Don't show loading if we're just updating markers
  const isInitialLoading =
    (isActorPositionsLoading && !lookup) ||
    (isFriendlyBuffEventsLoading && friendlyBuffEvents.length === 0) ||
    (isHostileBuffEventsLoading && hostileBuffEvents.length === 0) ||
    (isFightLoading && !fight);

  // Loading state - only show if we're actually missing data
  if (isInitialLoading) {
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
      {/* Back to Fight Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToFight}
          disabled={!reportId || !fightId}
          type="button"
        >
          Back to Fight
        </Button>
      </Box>

      {/* Map Name Header */}
      {fight.maps && fight.maps.length > 0 && fight.maps[0]?.name && (
        <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
          {fight.maps[0].name}
        </Typography>
      )}

      <Typography variant="h5" gutterBottom>
        Fight Replay - 3D View
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {fight.name} - Duration: {Math.floor(fight?.endTime - fight?.startTime / 1000)}s
      </Typography>

      {/* Map Markers Import Button and Status (M0R or Elms format) */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setMarkersModalOpen(true)}
          type="button"
        >
          {mapMarkersString ? 'Manage Map Markers' : 'Import Map Markers'}
        </Button>

        {/* Marker Statistics */}
        {mapMarkersString && markerStats.success && (
          <>
            <Chip
              label={`${markerStats.filtered} / ${markerStats.totalDecoded} markers`}
              color="success"
              size="small"
              variant="outlined"
            />
            {markerStats.is3D && (
              <Chip label="3D Filtering" color="info" size="small" variant="outlined" />
            )}
            {markerStats.removed > 0 && (
              <Chip
                label={`${markerStats.removed} filtered out`}
                color="warning"
                size="small"
                variant="outlined"
              />
            )}
          </>
        )}
      </Box>

      {/* Map Markers Modal (M0R and Elms formats) */}
      <MapMarkersModal
        open={markersModalOpen}
        onClose={() => setMarkersModalOpen(false)}
        fight={fight || ({} as FightFragment)}
        mapMarkersString={mapMarkersString}
        onLoadMarkers={handleLoadMarkers}
        onClearMarkers={handleClearMarkers}
      />

      {/* 3D Arena */}
      <FightReplay3D
        selectedFight={fight}
        allBuffEvents={allBuffEvents}
        showActorNames={true}
        mapMarkersString={mapMarkersString || undefined}
      />
    </Box>
  );
};
