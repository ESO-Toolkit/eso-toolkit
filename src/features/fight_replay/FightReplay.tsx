import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaceIcon from '@mui/icons-material/Place';
import { Alert, Box, Button, Chip, Snackbar, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FightFragment } from '@/graphql/gql/graphql';
import { useCurrentFight, useReportFightParams, useTrialChapters } from '@/hooks';
import { useAppDispatch } from '@/store/useAppDispatch';
import { actorPositionsActions } from '@/store/worker_results/taskSlices';
import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';
import { detectMapFromCoordinates } from '@/utils/mapMarkersUtils';

import { useFriendlyBuffEvents } from '../../hooks/events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from '../../hooks/events/useHostileBuffEvents';
import { useMarkerStats } from '../../hooks/useMarkerStats';
import { useReplayPrefs } from '../../hooks/useReplayPrefs';
import { useActorPositionsTask } from '../../hooks/workerTasks/useActorPositionsTask';

import { ChapterRail } from './components/ChapterRail';
import { FightReplay3D, type TrialReplayNav } from './components/FightReplay3D';
import { MapMarkersModal } from './components/MapMarkersModal';
import { ReplayStatePanel } from './components/ReplayStatePanel';
import { useIsMobileReplay } from './hooks/useIsMobileReplay';
import { chapterDisplayName } from './trial_chapters/chapterDisplay';
import { buildTrialTimeline } from './trial_chapters/trialTimeline';
import type { TrialChapter } from './trial_chapters/types';
import { useReplayNavigation } from './trial_chapters/useReplayNavigation';
import { useReplayPrefetch } from './trial_chapters/useReplayPrefetch';
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
    } else if (actorPositionsError) {
      // The new fight's pipeline FAILED. Without this branch the switch never settled —
      // renderArena suppresses the error panel while switching (deliberately, so transient
      // aborts can't unmount the arena), so a hard worker failure left the user parked on an
      // indefinite "Entering…" state with the real error hidden behind it.
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
  }, [isSwitchingFight, lookup, isActorPositionsLoading, actorPositionsError]);

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
  const trialNav: TrialReplayNav | undefined =
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
      : undefined;

  // The arena swaps between loading / error / empty / the live 3D view, while the page shell
  // (header + chapter rail) stays mounted across fight switches. Once the arena has rendered once,
  // FightReplay3D stays mounted through transitions (it shows its own overlay) so fullscreen and
  // continuous play are never interrupted. ReplayStatePanel reserves the arena's height.
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
        onAddMarker={handleAddMarkerAt}
        onRemoveMarker={handleRemoveMarker}
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
          Stays mounted across fight switches so navigation feels continuous. The map-markers
          tool lives in its header (a quiet outlined control — the arena is the page's hero, so
          nothing above it gets contained-primary emphasis), and its title is suppressed when
          the page header already states the same trial name. */}
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
          headerActions={
            fight ? (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<PlaceIcon />}
                onClick={() => setMarkersModalOpen(true)}
                type="button"
              >
                {markersState && markersState.markers.length > 0
                  ? `Markers · ${markersState.markers.length}`
                  : 'Map markers'}
              </Button>
            ) : undefined
          }
          onSelect={handleSelectChapter}
        />
      )}

      {/* Map markers entry point for non-trial replays (no rail to host it). Exports + stats
          live inside the modal. */}
      {fight && !trialChapters.currentRun && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<PlaceIcon />}
            onClick={() => setMarkersModalOpen(true)}
            type="button"
          >
            {markersState && markersState.markers.length > 0
              ? `Markers · ${markersState.markers.length}`
              : 'Map markers'}
          </Button>
          {markersState && markerStats.success && markerStats.removed > 0 && (
            <Chip
              label={`${markerStats.removed} filtered out`}
              color="warning"
              size="small"
              variant="outlined"
            />
          )}
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
          onClearMarkers={handleClearMarkers}
          onExportElms={() => handleExportMarkers('elms')}
          onExportMor={() => handleExportMarkers('mor')}
        />
      )}

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
