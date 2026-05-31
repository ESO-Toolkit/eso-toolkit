import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaceIcon from '@mui/icons-material/Place';
import { Alert, Box, Button, Chip, Snackbar, Typography } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportFightParams } from '@/hooks';
import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';
import { detectMapFromCoordinates } from '@/utils/mapMarkersUtils';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useMarkerStats } from '../../hooks/useMarkerStats';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { FightReplay3D } from './components/FightReplay3D';
import { MapMarkersModal } from './components/MapMarkersModal';
import { MapMarkersState } from './types/mapMarkers';
import {
  createMarkerFromElmsIcon,
  encodeMarkersToElms,
  encodeMarkersToMor,
  parseMarkersInput,
  withNewMarker,
  withoutMarker,
} from './utils/mapMarkerConverters';

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function resolveActiveMapData(
  fight: FightFragment | null,
  markersState: MapMarkersState | null,
): ZoneScaleData | null {
  if (!fight?.gameZone?.id) {
    return null;
  }

  const zoneId = fight.gameZone.id;
  const zoneMaps = ZONE_SCALE_DATA[zoneId];

  if (!zoneMaps || zoneMaps.length === 0) {
    return null;
  }

  const fightMapId = fight.maps?.[0]?.id;
  if (fightMapId) {
    const map = zoneMaps.find((candidate) => candidate.mapId === fightMapId);
    if (map) {
      return map;
    }
  }

  const marker = markersState?.markers[0];
  if (marker) {
    const detected = detectMapFromCoordinates(zoneId, marker.x, marker.z);
    if (detected) {
      return detected;
    }
  }

  return zoneMaps[0] ?? null;
}

export const FightReplay: React.FC = () => {
  const navigate = useNavigate();
  const { reportId, fightId } = useReportFightParams();
  const { lookup, isActorPositionsLoading, actorPositionsError } = useActorPositionsTask();
  const { fight, isFightLoading } = useCurrentFight();

  React.useEffect(() => {
    document.title = 'Fight Replay | ESO Toolkit';
  }, []);

  // Map Markers state (M0R or Elms format)
  const [markersState, setMarkersState] = useState<MapMarkersState | null>(null);
  const [markersModalOpen, setMarkersModalOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Handle loading markers from modal
  const handleLoadMarkers = useCallback((markersString: string): void => {
    const parsed = parseMarkersInput(markersString);
    setMarkersState(parsed);
    setMarkersModalOpen(false);
  }, []);

  // Handle clearing markers
  const handleClearMarkers = useCallback((): void => {
    setMarkersState(null);
  }, []);

  const activeMapData = useMemo(
    () => resolveActiveMapData(fight ?? null, markersState),
    [fight, markersState],
  );

  const handleAddMarkerAt = useCallback(
    (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => {
      if (!fight?.gameZone?.id) {
        setCopySnackbar({ type: 'error', message: 'Fight zone information is unavailable.' });
        return;
      }

      const mapData = activeMapData;
      if (!mapData) {
        setCopySnackbar({
          type: 'error',
          message: 'Map scale data is unavailable for this fight.',
        });
        return;
      }

      const zoneId = markersState?.zoneId ?? fight.gameZone.id;

      const clamp = (value: number): number => Math.min(100, Math.max(0, value));
      const clampedX = clamp(arenaPoint.x);
      const clampedZ = clamp(arenaPoint.z);

      const normalizedX = (100 - clampedX) / 100;
      const normalizedZ = (100 - clampedZ) / 100;

      const x = normalizedX * (mapData.maxX - mapData.minX) + mapData.minX;
      const z = normalizedZ * (mapData.maxZ - mapData.minZ) + mapData.minZ;
      const y = mapData.y ?? markersState?.markers[0]?.y ?? 0;

      try {
        const newMarker = createMarkerFromElmsIcon(iconKey, { x, y, z });

        setMarkersState((prev) => {
          const baseState: MapMarkersState = prev ?? {
            format: 'elms',
            zoneId,
            markers: [],
            originalEncodedString: undefined,
          };

          const adjustedState =
            baseState.zoneId === zoneId ? baseState : { ...baseState, zoneId, markers: [] };

          return withNewMarker(adjustedState, newMarker, 'elms');
        });
      } catch (error) {
        setCopySnackbar({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to add marker.',
        });
      }
    },
    [activeMapData, fight, markersState],
  );

  const handleRemoveMarker = useCallback((markerId: string) => {
    setMarkersState((prev) => (prev ? withoutMarker(prev, markerId) : prev));
  }, []);

  const handleExportMarkers = useCallback(
    async (format: 'elms' | 'mor') => {
      if (!markersState || markersState.markers.length === 0) {
        setCopySnackbar({ type: 'error', message: 'No markers available to export.' });
        return;
      }

      const successMessage =
        format === 'elms'
          ? 'Elms markers copied to clipboard.'
          : 'M0R markers copied to clipboard.';
      const fallbackFailureMessage =
        format === 'elms'
          ? 'Unable to copy Elms markers to clipboard right now.'
          : 'Unable to copy M0R markers to clipboard right now.';

      try {
        const encoded =
          format === 'elms' ? encodeMarkersToElms(markersState) : encodeMarkersToMor(markersState);

        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(encoded);
          setCopySnackbar({ type: 'success', message: successMessage });
          return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = encoded;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        let fallbackSucceeded = false;
        try {
          fallbackSucceeded = document.execCommand('copy');
        } finally {
          document.body.removeChild(textArea);
        }

        if (fallbackSucceeded) {
          setCopySnackbar({ type: 'success', message: successMessage });
          return;
        }

        throw new Error(fallbackFailureMessage);
      } catch (error) {
        setCopySnackbar({
          type: 'error',
          message: error instanceof Error ? error.message : fallbackFailureMessage,
        });
      }
    },
    [markersState],
  );

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
  const markerStats = useMarkerStats(markersState ?? undefined, fight || ({} as FightFragment));

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
      <Box sx={{ p: 3 }} aria-live="polite">
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
      <Box sx={{ p: 3 }} aria-live="polite">
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
      <Box sx={{ p: 3 }} aria-live="polite">
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
      <Box sx={{ p: 3 }} aria-live="polite">
        <Typography variant="h5" gutterBottom>
          Fight Replay - 3D View
        </Typography>
        <Alert severity="warning">No actor position data available for this fight.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header: back action + one title cluster (no competing headings — "3D View"
          already lives in the document title). Title is the map name, falling back to
          the fight/encounter name; the fight name becomes a subtitle and the duration a
          chip, so the metadata reads as a hierarchy instead of three stacked lines. */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToFight}
          disabled={!reportId || !fightId}
          type="button"
          sx={{ ml: -1, mb: 1 }}
        >
          Back to Fight
        </Button>

        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
          {fight.maps?.[0]?.name || fight.name}
        </Typography>

        <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {fight.maps?.[0]?.name && fight.name && fight.maps[0].name !== fight.name && (
            <Typography variant="subtitle1" color="text.secondary">
              {fight.name}
            </Typography>
          )}
          <Chip
            label={formatDuration(fight.endTime - fight.startTime)}
            size="small"
            variant="outlined"
            icon={<AccessTimeIcon />}
          />
        </Box>
      </Box>

      {/* Map markers: a primary action grouped with its export buttons, and the
          status chips on their own line so actions and read-outs don't compete. */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlaceIcon />}
            onClick={() => setMarkersModalOpen(true)}
            type="button"
          >
            {markersState ? 'Manage Map Markers' : 'Import Map Markers'}
          </Button>

          {markersState && markersState.markers.length > 0 && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ContentCopyIcon />}
                onClick={() => handleExportMarkers('elms')}
                type="button"
              >
                Copy Elms
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ContentCopyIcon />}
                onClick={() => handleExportMarkers('mor')}
                type="button"
              >
                Copy M0R
              </Button>
            </>
          )}
        </Box>

        {/* Marker Statistics */}
        {markersState && markerStats.success && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
          </Box>
        )}
      </Box>

      {/* Map Markers Modal (M0R and Elms formats) */}
      <MapMarkersModal
        open={markersModalOpen}
        onClose={() => setMarkersModalOpen(false)}
        fight={fight || ({} as FightFragment)}
        markersState={markersState}
        onLoadMarkers={handleLoadMarkers}
        onClearMarkers={handleClearMarkers}
        onExportElms={() => handleExportMarkers('elms')}
        onExportMor={() => handleExportMarkers('mor')}
      />

      {/* 3D Arena */}
      <FightReplay3D
        selectedFight={fight}
        allBuffEvents={allBuffEvents}
        showActorNames={true}
        markersState={markersState}
        onAddMarker={handleAddMarkerAt}
        onRemoveMarker={handleRemoveMarker}
        showPlayerPaths={true}
        initialSelectedPlayerIds={[]} // Empty initially, user can select via HUD
      />

      {copySnackbar && (
        <Snackbar
          open
          autoHideDuration={3000}
          onClose={() => setCopySnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setCopySnackbar(null)}
            severity={copySnackbar.type}
            sx={{ width: '100%' }}
          >
            {copySnackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};
