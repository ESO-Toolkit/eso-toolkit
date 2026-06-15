import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PlaceIcon from '@mui/icons-material/Place';
import { Alert, Box, Button, Chip, Collapse, Snackbar, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportFightParams, useTrialChapters } from '@/hooks';
import { useAppDispatch } from '@/store/useAppDispatch';
import { actorPositionsActions } from '@/store/worker_results/taskSlices';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useMarkerStats } from '../../hooks/useMarkerStats';
import { useReplayPrefs } from '../../hooks/useReplayPrefs';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { ChapterRail } from './components/ChapterRail';
import { FightReplay3D, type TrialReplayNav } from './components/FightReplay3D';
import { MapMarkersModal } from './components/MapMarkersModal';
import { MarkerEditDialog } from './components/MarkerEditDialog';
import { MarkerExportButton } from './components/MarkerExportButton';
import { MarkersPanel } from './components/MarkersPanel';
import { ReplayStatePanel } from './components/ReplayStatePanel';
import { markerDeckSurface } from './constants/replayDesign';
import { useIsMobileReplay } from './hooks/useIsMobileReplay';
import { useMapMarkersManager } from './hooks/useMapMarkersManager';
import { chapterDisplayName } from './trial_chapters/chapterDisplay';
import { buildTrialTimeline } from './trial_chapters/trialTimeline';
import type { TrialChapter } from './trial_chapters/types';
import { useReplayNavigation } from './trial_chapters/useReplayNavigation';
import { useReplayPrefetch } from './trial_chapters/useReplayPrefetch';
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

  // Map Markers (M0R or Elms format): CRUD + per-zone persistence + undo/redo. The hook owns the
  // marker state, storage, map-scale resolution and history; the page just renders the controls.
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
  // On touch the same mode maps to long-press gestures instead of right-clicks.
  const [markersEditMode, setMarkersEditMode] = useState(false);
  const toggleMarkersEditMode = useCallback(() => setMarkersEditMode((prev) => !prev), []);

  // Markers tools live behind a collapsed toggle so the deck no longer permanently shoulders the
  // arena down the page (most viewers never place a marker). Default collapsed; auto-open whenever
  // there's something to act on — edit mode is active or markers are loaded — so the tools and the
  // edit-mode gesture hints are never hidden when they're actually needed.
  const [markersDeckOpen, setMarkersDeckOpen] = useState(false);
  const toggleMarkersDeck = useCallback(() => setMarkersDeckOpen((prev) => !prev), []);
  const hasMarkers = !!markersState && markersState.markers.length > 0;
  React.useEffect(() => {
    if (markersEditMode || hasMarkers) {
      setMarkersDeckOpen(true);
    }
  }, [markersEditMode, hasMarkers]);

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

  // Trial chapter navigation — lets the viewer skip between bosses (and trash) without
  // leaving the replay. The run/rail come from report data, so they're available even
  // while a specific fight's positions are still computing.
  const trialChapters = useTrialChapters();
  const { goToFight } = useReplayNavigation();

  const handleSelectChapter = useCallback(
    (chapter: TrialChapter) => {
      // Already on this fight — nothing to do (avoids a redundant history entry).
      if (chapter.fightId === fightId) return;
      goToFight(chapter.fightId);
    },
    [goToFight, fightId],
  );

  // Warm the adjacent bosses' events once the current fight is interactive, so the next
  // skip starts without waiting on the network (positions still compute on arrival, but a
  // previously-viewed fight returns instantly from the worker's LRU result cache).
  //
  // Disabled on mobile: phones are memory-constrained, and holding several fights' event sets
  // in the store adds pressure (a likely contributor to mobile tab reloads); the marginal speed-up
  // isn't worth it there.
  const isMobileReplay = useIsMobileReplay();
  useReplayPrefetch(
    trialChapters.nextBoss,
    trialChapters.prevBoss,
    !isMobileReplay && Boolean(lookup) && !isActorPositionsLoading,
  );

  // Switching fights in-place leaves the actor-position result slot holding the previous
  // fight's positions (it isn't cleared until the next compute resolves). Reset it on a
  // fight change so the arena shows a loader rather than a frame of stale positions;
  // resetTask preserves the LRU result cache, so a revisit is still instant.
  //
  // `isSwitchingFight` bridges the brief window between the fight change and the new
  // fight's data pipeline engaging, so the arena never flashes the "no position data"
  // empty state mid-transition. It clears once the new positions arrive, or once the
  // pipeline has run and settled (covering a fight that genuinely has no position data).
  const dispatch = useAppDispatch();
  const prevFightIdRef = useRef(fightId);
  const [isSwitchingFight, setIsSwitchingFight] = useState(false);
  const loadingSeenRef = useRef(false);

  useEffect(() => {
    if (prevFightIdRef.current !== fightId) {
      // Free the previous fight's positions on switch. On mobile, FULLY clear the worker's LRU
      // result cache (clearResult) so several fights' large position datasets can't accumulate and
      // OOM-reload the tab (the "whole page refresh"); on desktop, resetTask keeps the cache so a
      // revisit stays instant.
      dispatch(
        isMobileReplay ? actorPositionsActions.clearResult() : actorPositionsActions.resetTask(),
      );
      prevFightIdRef.current = fightId;
      loadingSeenRef.current = false;
      setIsSwitchingFight(true);
    }
  }, [fightId, dispatch, isMobileReplay]);

  useEffect(() => {
    if (!isSwitchingFight) return;
    if (lookup) {
      // New fight's positions are ready.
      loadingSeenRef.current = false;
      setIsSwitchingFight(false);
    } else if (isActorPositionsLoading) {
      // Pipeline has engaged for the new fight.
      loadingSeenRef.current = true;
    } else if (loadingSeenRef.current) {
      // Pipeline ran and settled without positions (fight has no position data).
      loadingSeenRef.current = false;
      setIsSwitchingFight(false);
    }
  }, [isSwitchingFight, lookup, isActorPositionsLoading]);

  // Keyboard skip to the previous / next boss ( [ and ] ). Distinct from FightReplay3D's
  // in-fight transport keys, so the two handlers never collide. Guards mirror the
  // transport's: yield to focused widgets, ignore text inputs and OS/browser modifier chords.
  const { nextBoss, prevBoss } = trialChapters;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === ']' && nextBoss) {
        goToFight(nextBoss.fightId);
        event.preventDefault();
      } else if (event.key === '[' && prevBoss) {
        goToFight(prevBoss.fightId);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextBoss, prevBoss, goToFight]);

  // Continuous "play the whole trial" preferences (persisted). The shell owns these (it drives
  // navigation); FightReplay3D renders the controls so they're reachable in fullscreen.
  const { initialPrefs, persistPrefs } = useReplayPrefs();
  const [continuousPlay, setContinuousPlay] = useState(initialPrefs.continuousPlay);
  const [includeTrash, setIncludeTrash] = useState(initialPrefs.continuousIncludeTrash);
  useEffect(() => {
    persistPrefs({ continuousPlay, continuousIncludeTrash: includeTrash });
  }, [persistPrefs, continuousPlay, includeTrash]);

  const handleToggleContinuous = useCallback(() => setContinuousPlay((v) => !v), []);
  const handleToggleIncludeTrash = useCallback(() => setIncludeTrash((v) => !v), []);

  // Auto-advance / cross-segment scrub navigation. Defaults to replacing the history entry so
  // the continuous flow doesn't pile up Back steps; manual chapter jumps (popover rows, boss-skip
  // buttons, the mobile chapter list) pass replace:false so Back returns to the previous fight,
  // matching the page rail and the [ ] keys. A cross-fight scrub carries its dragged offset
  // through as ?time= — refresh/share-safe, and FightReplay3D seeds playback from it so the seek
  // lands at the promised moment, not 0:00.
  const handleAdvanceToFight = useCallback(
    (targetFightId: string, options?: { localMs?: number; replace?: boolean }) => {
      if (targetFightId === fightId) return;
      goToFight(targetFightId, { replace: options?.replace ?? true, time: options?.localMs });
    },
    [goToFight, fightId],
  );

  const hasTrash = useMemo(
    () => trialChapters.segments.some((s) => s.kind === 'trash'),
    [trialChapters.segments],
  );

  // The continuous trial timeline (one gapless axis for the whole run), filtered by the trash
  // toggle. Drives both the unified scrubber and continuous auto-advance.
  const trialTimeline = useMemo(
    () => buildTrialTimeline(trialChapters.segments, includeTrash),
    [trialChapters.segments, includeTrash],
  );

  // Keep FightReplay3D mounted once the arena has rendered, so fullscreen and the continuous
  // transition overlay survive fight switches (it shows its own loading state in place).
  const hasRenderedArenaRef = useRef(false);
  useEffect(() => {
    if (lookup && fight) hasRenderedArenaRef.current = true;
  }, [lookup, fight]);

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

  // The arena is busy whenever the report/fight is still resolving, a fight switch is in
  // flight, or the current fight's positions are computing.
  const isArenaLoading = isInitialLoading || isSwitchingFight || isActorPositionsLoading;

  // Continuous trial-replay bundle handed to FightReplay3D — present only for a multi-segment
  // run, so a single isolated fight behaves exactly as before. The label shown while entering a
  // fight is the segment/fight name (the new fight resolves from report data before its
  // positions), trash-disambiguated so "Entering Trash · X" can't read as a boss pull.
  const enteringLabel = trialChapters.currentSegment
    ? chapterDisplayName(trialChapters.currentSegment)
    : (fight?.name ?? null);
  const killedBosses = trialChapters.bossChapters.filter((b) => b.isKill).length;
  // Gate on the UNFILTERED run size, not the filtered timeline: with the trash filter on, a
  // 1-boss-plus-trash run collapses to a single timeline entry, and gating on that unmounted
  // every trial surface — including the include-trash toggle itself — making the filter
  // irreversible inside fullscreen / mobile immersive.
  // Memoized so the bundle keeps a stable identity across the ~10Hz `currentTime` re-renders that
  // playback drives in FightReplay3D. Without this, a fresh `trialNav` object every render would
  // break the React.memo on every consumer it flows into (the transport's chapter popover, the
  // trial mini-map, the chapter rail), re-rendering the whole trial UI on every playback tick —
  // which collapsed playback to a fraction of the framerate on multi-fight trial runs.
  const trialNav: TrialReplayNav | undefined = useMemo(
    () =>
      trialChapters.currentRun && trialChapters.segments.length > 1
        ? {
            timeline: trialTimeline,
            currentFightId: fightId,
            continuousEnabled: continuousPlay,
            includeTrash,
            hasTrash,
            runName: trialChapters.currentRun.trialName,
            runIndex: trialChapters.runIndex,
            runCount: trialChapters.runCount,
            bossSummary:
              trialChapters.bossChapters.length > 0
                ? `${killedBosses} / ${trialChapters.bossChapters.length} bosses`
                : null,
            prevBoss: trialChapters.prevBoss,
            nextBoss: trialChapters.nextBoss,
            isFightDataLoading: isArenaLoading,
            enteringLabel,
            onAdvanceToFight: handleAdvanceToFight,
            onToggleContinuous: handleToggleContinuous,
            onToggleIncludeTrash: handleToggleIncludeTrash,
          }
        : undefined,
    [
      trialChapters.currentRun,
      trialChapters.segments.length,
      trialChapters.bossChapters.length,
      trialChapters.runIndex,
      trialChapters.runCount,
      trialChapters.prevBoss,
      trialChapters.nextBoss,
      trialTimeline,
      fightId,
      continuousPlay,
      includeTrash,
      hasTrash,
      killedBosses,
      isArenaLoading,
      enteringLabel,
      handleAdvanceToFight,
      handleToggleContinuous,
      handleToggleIncludeTrash,
    ],
  );

  // The arena swaps between loading / error / empty / the live 3D view, while the page shell
  // (header + chapter rail + marker tools) stays mounted across fight switches. Once the arena has
  // rendered once, FightReplay3D stays mounted through transitions (it shows its own overlay) so
  // fullscreen and continuous play are never interrupted. ReplayStatePanel reserves the height.
  const renderArena = (): React.ReactNode => {
    // Surface a hard error only when we're NOT mid-switch. A transient worker abort/error during a
    // fight switch must not swap out FightReplay3D — that would unmount it and drop fullscreen (the
    // "page refresh" on mobile). Genuine errors still render here once the switch settles.
    if (actorPositionsError && !isSwitchingFight) {
      return (
        <ReplayStatePanel
          kind="error"
          title="Couldn't load the replay"
          detail={`Error loading actor positions: ${actorPositionsError}`}
          {...stateBackAction}
        />
      );
    }

    if (!fight) {
      return isArenaLoading ? (
        <ReplayStatePanel
          kind="loading"
          title="Loading replay"
          detail="Reconstructing actor positions and combat events for the 3D arena…"
        />
      ) : (
        <ReplayStatePanel
          kind="empty"
          title="No fight selected"
          detail="Pick a fight from the report to watch its 3D replay."
          {...stateBackAction}
        />
      );
    }

    // Before the very first successful render, keep the cohesive full panel (FightReplay3D not yet
    // mounted). After that, FightReplay3D stays mounted across switches and handles its own
    // loading/transition overlay — so we never unmount it (which would drop fullscreen).
    if (!lookup && !hasRenderedArenaRef.current) {
      return isArenaLoading ? (
        <ReplayStatePanel
          kind="loading"
          title="Loading replay"
          detail="Reconstructing actor positions and combat events for the 3D arena…"
        />
      ) : (
        <ReplayStatePanel
          kind="empty"
          title="No position data for this fight"
          detail="This fight doesn't have the actor-position data needed to render the 3D replay."
          {...stateBackAction}
        />
      );
    }

    return (
      <FightReplay3D
        selectedFight={fight}
        allBuffEvents={allBuffEvents}
        showActorNames={true}
        markersState={markersState}
        onAddMarker={addMarkerAt}
        onRemoveMarker={removeMarker}
        markersEditMode={markersEditMode}
        onToggleMarkersEditMode={toggleMarkersEditMode}
        onMarkerMove={moveMarker}
        onEditMarker={setEditingMarkerId}
        canUndoMarkers={canUndo}
        onUndoMarkers={undo}
        canRedoMarkers={canRedo}
        onRedoMarkers={redo}
        showPlayerPaths={true}
        initialSelectedPlayerIds={[]} // Empty initially, user can select via HUD
        trialNav={trialNav}
      />
    );
  };

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

        {fight ? (
          <>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
              {fight.maps?.[0]?.name || fight.name}
            </Typography>

            <Box
              sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
            >
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
          </>
        ) : (
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
            Fight Replay
          </Typography>
        )}
      </Box>

      {/* Trial chapter rail — skip between bosses (and trash) without leaving the replay.
          Stays mounted across fight switches so navigation feels continuous. Its title is
          suppressed when the page header already states the same trial name. The map-markers
          tools live in their own quiet toolbar below, so the rail stays focused on navigation. */}
      {trialChapters.currentRun && (
        <ChapterRail
          segments={trialChapters.segments}
          bossChapters={trialChapters.bossChapters}
          currentFightId={fightId}
          trialName={trialChapters.currentRun.trialName}
          hideTitle={
            !!fight && trialChapters.currentRun.trialName === (fight.maps?.[0]?.name || fight.name)
          }
          includeTrash={includeTrash}
          onToggleIncludeTrash={handleToggleIncludeTrash}
          onSelect={handleSelectChapter}
        />
      )}

      {/* Map markers toolbar — the single home for marker tools in both trial and isolated-fight
          layouts. Wrapped in a quiet glass "control deck" (matching the replay's lit-surface
          language) so the marker tools read as one intentional cluster instead of naked buttons
          on the page, while staying calm enough never to compete with the arena hero below. The
          actions stay quiet/outlined; the Edit toggle flips to contained only to signal its
          active state. */}
      {fight && (
        <Box sx={{ mb: 2 }}>
          {/* Collapsed by default: one quiet toggle keeps the markers tools (a power feature most
              viewers never touch) from permanently pushing the arena down the page. It expands the
              full deck on demand, and auto-opens while editing / when markers are loaded. */}
          <Button
            variant="text"
            color="inherit"
            onClick={toggleMarkersDeck}
            type="button"
            aria-expanded={markersDeckOpen}
            startIcon={<PlaceIcon fontSize="small" sx={{ color: 'secondary.main' }} />}
            endIcon={
              <KeyboardArrowDownRoundedIcon
                sx={{
                  transition: 'transform 0.2s ease',
                  transform: markersDeckOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            }
            sx={{
              ml: -1,
              color: 'text.primary',
              fontWeight: 700,
              letterSpacing: 0.2,
              textTransform: 'none',
            }}
          >
            Map Markers
            {hasMarkers && (
              <Chip
                label={markersState?.markers.length}
                size="small"
                color="success"
                variant="outlined"
                sx={{ ml: 1, height: 20, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
          </Button>

          <Collapse in={markersDeckOpen} unmountOnExit>
            <Box sx={{ mt: 1 }}>
              <Box
                sx={(theme) => ({
                  ...markerDeckSurface(theme),
                  p: { xs: 1.5, sm: 2 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                })}
              >
                {/* Live marker-stat chips — a status readout for this surface. The cluster's identity
                ("Map Markers") now lives on the toggle above, so the header is just the stats
                (and renders nothing until markers are loaded). */}
                {markersState && markerStats.success && (
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
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

                {/* Actions. A clear hierarchy instead of three lookalike buttons: the primary entry
                point (Manage) is filled, Edit is a quiet outlined toggle, and Export is its own
                grouped split control on the row below. The manage/edit pair share one row with
                equal flex + `stretch` so they are always the same width AND the same height (no
                ragged single-vs-double-line wrap); on phones they stack full width. */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'stretch',
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlaceIcon />}
                      onClick={() => setMarkersModalOpen(true)}
                      type="button"
                      sx={{ flex: 1, whiteSpace: 'nowrap' }}
                    >
                      {markersState ? 'Manage Map Markers' : 'Import Map Markers'}
                    </Button>

                    <Button
                      variant={markersEditMode ? 'contained' : 'outlined'}
                      color="secondary"
                      startIcon={<EditLocationAltIcon />}
                      onClick={toggleMarkersEditMode}
                      type="button"
                      aria-pressed={markersEditMode}
                      sx={{ flex: 1, whiteSpace: 'nowrap' }}
                    >
                      {markersEditMode ? 'Done Editing' : 'Edit Markers'}
                    </Button>
                  </Box>

                  {markersState && markersState.markers.length > 0 && (
                    <MarkerExportButton onExport={handleExportMarkers} sx={{ width: '100%' }} />
                  )}
                </Box>

                {/* Edit-mode hint: surfaces the gestures, which are otherwise invisible. Touch and
                mouse get their own wording — right-click and Ctrl+Z don't exist on a phone. It
                sits in a tinted well so it reads as inline guidance, not body copy. */}
                {markersEditMode && (
                  <Box
                    sx={(theme) => ({
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.secondary.main, 0.08)
                          : alpha(theme.palette.primary.main, 0.05),
                      border: '1px solid',
                      borderColor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.secondary.main, 0.22)
                          : 'divider',
                    })}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {isMobileReplay
                        ? 'Press and hold the map to place a marker · drag a marker to move it · press and hold a marker to edit or remove it'
                        : 'Right-click the map to place a marker · drag a marker to move it · right-click a marker to edit or remove it · Ctrl+Z to undo'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Marker management list: edit/delete each marker, undo/redo, clear all. Kept just
              below the deck (its own accordion surface) so the deck stays a compact command strip
              and the per-marker detail expands separately. */}
              {(markersEditMode || (markersState && markersState.markers.length > 0)) && (
                <Box sx={{ mt: 1.5 }}>
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
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Map Markers Modal (M0R and Elms formats) */}
      {fight && (
        <MapMarkersModal
          open={markersModalOpen}
          onClose={() => setMarkersModalOpen(false)}
          fight={fight}
          markersState={markersState}
          onLoadMarkers={handleLoadMarkers}
          onClearMarkers={clearMarkers}
        />
      )}

      {/* Per-marker edit dialog (icon / label / colour / size, plus delete) */}
      <MarkerEditDialog
        marker={editingMarker}
        onClose={() => setEditingMarkerId(null)}
        onApply={editMarker}
        onDelete={removeMarker}
      />

      {/* 3D Arena (swaps state inline; the shell + rail persist). */}
      {renderArena()}

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
