import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import PlaceIcon from '@mui/icons-material/Place';
import { Alert, Box, Button, Chip, Snackbar, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportFightParams } from '@/hooks';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useMarkerStats } from '../../hooks/useMarkerStats';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { FightReplay3D } from './components/FightReplay3D';
import { MapMarkersModal } from './components/MapMarkersModal';
import { MarkerEditDialog } from './components/MarkerEditDialog';
import { MarkersPanel } from './components/MarkersPanel';
import { ReplayStatePanel } from './components/ReplayStatePanel';
import { useMapMarkersManager } from './hooks/useMapMarkersManager';
import { encodeMarkersToElms, encodeMarkersToMor } from './utils/mapMarkerConverters';

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** True when the keydown target is a text-entry element (don't steal undo/redo from inputs). */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true
  );
}

export const FightReplay: React.FC = () => {
  const navigate = useNavigate();
  const { reportId, fightId } = useReportFightParams();
  const { lookup, isActorPositionsLoading, actorPositionsError } = useActorPositionsTask();
  const { fight, isFightLoading } = useCurrentFight();

  React.useEffect(() => {
    document.title = 'Fight Replay | ESO Toolkit';
  }, []);

  const [markersModalOpen, setMarkersModalOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleMarkersError = useCallback((message: string) => {
    setCopySnackbar({ type: 'error', message });
  }, []);

  // Map Markers (M0R or Elms format): CRUD + per-zone persistence + undo/redo.
  const {
    markersState,
    restoredCount,
    canUndo,
    canRedo,
    loadFromString,
    clearMarkers,
    addMarkerAt,
    removeMarker,
    moveMarker,
    editMarker,
    undo,
    redo,
  } = useMapMarkersManager({ fight, onError: handleMarkersError });

  // Marker edit mode: enables plain right-click placement, drag-to-move, and right-click editing
  // in the 3D arena (the Alt+right-click chords keep working regardless, for muscle memory).
  const [markersEditMode, setMarkersEditMode] = useState(false);

  // The marker currently open in the edit dialog (from the context menu or the panel list).
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const editingMarker = useMemo(
    () => markersState?.markers.find((marker) => marker.id === editingMarkerId) ?? null,
    [markersState, editingMarkerId],
  );

  // Surface restored-from-storage marker sets so users know why markers appeared.
  useEffect(() => {
    if (restoredCount > 0) {
      setCopySnackbar({
        type: 'info',
        message: `Restored ${restoredCount} saved marker${restoredCount === 1 ? '' : 's'} for this zone.`,
      });
    }
  }, [restoredCount]);

  // Undo/redo keyboard shortcuts while edit mode is on (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y).
  useEffect(() => {
    if (!markersEditMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || isTextEntryTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [markersEditMode, undo, redo]);

  // Handle loading markers from modal
  const handleLoadMarkers = useCallback(
    (markersString: string): void => {
      loadFromString(markersString);
      setMarkersModalOpen(false);
    },
    [loadFromString],
  );

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

  // Shared back action for the state screens (only navigable when we have the ids).
  const stateBackAction =
    reportId && fightId ? { actionLabel: 'Back to Fight', onAction: handleBackToFight } : {};

  // Non-render states share one cohesive panel (spinner / error / empty) wrapped in the
  // same page padding so the chrome is consistent with the loaded view.
  if (isInitialLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <ReplayStatePanel
          kind="loading"
          title="Loading replay"
          detail="Reconstructing actor positions and combat events for the 3D arena…"
        />
      </Box>
    );
  }

  if (actorPositionsError) {
    return (
      <Box sx={{ p: 3 }}>
        <ReplayStatePanel
          kind="error"
          title="Couldn't load the replay"
          detail={`Error loading actor positions: ${actorPositionsError}`}
          {...stateBackAction}
        />
      </Box>
    );
  }

  if (!fight) {
    return (
      <Box sx={{ p: 3 }}>
        <ReplayStatePanel
          kind="empty"
          title="No fight selected"
          detail="Pick a fight from the report to watch its 3D replay."
          {...stateBackAction}
        />
      </Box>
    );
  }

  if (!lookup) {
    return (
      <Box sx={{ p: 3 }}>
        <ReplayStatePanel
          kind="empty"
          title="No position data for this fight"
          detail="This fight doesn't have the actor-position data needed to render the 3D replay."
          {...stateBackAction}
        />
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

          <Button
            variant={markersEditMode ? 'contained' : 'outlined'}
            color="secondary"
            startIcon={<EditLocationAltIcon />}
            onClick={() => setMarkersEditMode((prev) => !prev)}
            type="button"
            aria-pressed={markersEditMode}
          >
            {markersEditMode ? 'Done Editing' : 'Edit Markers'}
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

        {/* Edit-mode hint: surfaces the gestures, which are otherwise invisible. */}
        {markersEditMode && (
          <Typography variant="caption" color="text.secondary">
            Right-click the map to place a marker · drag a marker to move it · right-click a marker
            to edit or remove it · Ctrl+Z to undo
          </Typography>
        )}

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

        {/* Marker management list: edit/delete each marker, undo/redo, clear all. */}
        {(markersEditMode || (markersState && markersState.markers.length > 0)) && (
          <MarkersPanel
            markersState={markersState}
            editMode={markersEditMode}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onEditMarker={setEditingMarkerId}
            onRemoveMarker={removeMarker}
            onClearMarkers={clearMarkers}
          />
        )}
      </Box>

      {/* Map Markers Modal (M0R and Elms formats) */}
      <MapMarkersModal
        open={markersModalOpen}
        onClose={() => setMarkersModalOpen(false)}
        fight={fight || ({} as FightFragment)}
        markersState={markersState}
        onLoadMarkers={handleLoadMarkers}
        onClearMarkers={clearMarkers}
        onExportElms={() => handleExportMarkers('elms')}
        onExportMor={() => handleExportMarkers('mor')}
      />

      {/* Per-marker edit dialog (icon / label / colour / size, plus delete) */}
      <MarkerEditDialog
        marker={editingMarker}
        onClose={() => setEditingMarkerId(null)}
        onApply={editMarker}
        onDelete={removeMarker}
      />

      {/* 3D Arena */}
      <FightReplay3D
        selectedFight={fight}
        allBuffEvents={allBuffEvents}
        showActorNames={true}
        markersState={markersState}
        onAddMarker={addMarkerAt}
        onRemoveMarker={removeMarker}
        markersEditMode={markersEditMode}
        onMarkerMove={moveMarker}
        onEditMarker={setEditingMarkerId}
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
