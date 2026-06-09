/**
 * MobileReplayDock
 *
 * The bottom control dock for the mobile replay — the single persistent control surface.
 * Top: a full-width scrub rail. Bottom: timecode · play cluster · three sheet buttons
 * (Players / Chapters / Settings). Everything secondary lives in a {@link MobileSheet} that opens
 * one at a time, so the dock itself stays a fixed, uncluttered height.
 *
 * It owns the timeline-scrubbing wiring directly (rather than going through PlaybackControls) so
 * the mobile layout is fully under its control.
 *
 * @module features/fight_replay/components/mobile/MobileReplayDock
 */

import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOptimizedTimelineScrubbing } from '../../../../hooks/useOptimizedTimelineScrubbing';
import { useTimelineMarkers } from '../../../../hooks/useTimelineMarkers';
import { ContinuousReplayBar } from '../ContinuousReplayBar';
import type { TrialReplayNav } from '../FightReplay3D';
import { PlaybackButtons } from '../PlaybackButtons';
import { ShareButton } from '../ShareButton';
import { TimelineSlider } from '../TimelineSlider';
import type { TrialTimelineSeekTarget } from '../TrialTimeline';

import { MobileSheet } from './MobileSheet';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

const formatTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface MobileReplayDockProps {
  // Transport
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (t: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (s: number) => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onSkipBackward10: () => void;
  onSkipForward10: () => void;
  onPlayingChange?: (p: boolean) => void;
  onScrubbingModeChange?: (s: boolean) => void;
  onDraggingChange?: (d: boolean) => void;
  timeRef?: React.RefObject<number> | { current: number };
  // Share
  reportId?: string;
  fightId?: string;
  selectedActorIdRef?: React.RefObject<number | null>;
  // Trial chapters
  trialNav?: TrialReplayNav;
  onTrialSeek?: (target: TrialTimelineSeekTarget) => void;
  trialNextUpLabel?: string | null;
  // Players sheet (toggles the player list)
  playersOpen: boolean;
  onTogglePlayers: () => void;
  // Settings
  showTrails: boolean;
  onToggleTrails: () => void;
}

type SheetId = 'chapters' | 'settings' | null;

const MobileReplayDockComponent: React.FC<MobileReplayDockProps> = ({
  currentTime,
  duration,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onSkipToStart,
  onSkipToEnd,
  onSkipBackward10,
  onSkipForward10,
  onPlayingChange,
  onScrubbingModeChange,
  onDraggingChange,
  timeRef,
  reportId,
  fightId,
  selectedActorIdRef,
  trialNav,
  onTrialSeek,
  trialNextUpLabel,
  playersOpen,
  onTogglePlayers,
  showTrails,
  onToggleTrails,
}) => {
  const [sheet, setSheet] = useState<SheetId>(null);

  const {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    optimizedStep,
  } = useOptimizedTimelineScrubbing({
    duration,
    currentTime,
    onTimeChange,
    isPlaying,
    onPlayingChange,
    timeRef,
  });

  useEffect(() => {
    onScrubbingModeChange?.(isScrubbingMode);
  }, [isScrubbingMode, onScrubbingModeChange]);
  useEffect(() => {
    onDraggingChange?.(isDragging);
  }, [isDragging, onDraggingChange]);

  const { markers } = useTimelineMarkers();
  // Keep only the structural beats on the thin mobile rail (deaths reachable via clusters/chapters).
  const railMarkers = useMemo(
    () => markers.filter((m) => m.type === 'phase' || m.type === 'cluster'),
    [markers],
  );
  const handleMarkerClick = useCallback((t: number) => onTimeChange(t), [onTimeChange]);

  const hasChapters = Boolean(trialNav && trialNav.timeline.entries.length > 1);

  const DockButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
  }> = ({ icon, label, active, onClick }) => (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      sx={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        px: 0.75,
        py: 0.25,
        minWidth: 52,
        color: active ? 'primary.main' : 'text.secondary',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', borderRadius: 1 },
      }}
    >
      {icon}
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>{label}</Typography>
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        flex: '0 0 auto',
        px: { xs: 1, sm: 1.5 },
        pt: 0.5,
        pb: 'calc(env(safe-area-inset-bottom) + 6px)',
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(10,14,24,0.92)' : 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      <TimelineSlider
        displayTime={displayTime}
        duration={duration}
        isDragging={isDragging}
        isScrubbingMode={isScrubbingMode}
        optimizedStep={optimizedStep}
        onSliderChange={handleSliderChange}
        onSliderChangeEnd={handleSliderChangeEnd}
        onSliderChangeStart={handleSliderChangeStart}
        markers={railMarkers}
        onMarkerClick={handleMarkerClick}
        density="compact"
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mt: 0.25,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: isScrubbingMode || isDragging ? 'info.main' : 'text.primary',
            flex: '0 0 auto',
            minWidth: 64,
          }}
        >
          {formatTime(displayTime)}
          <Box
            component="span"
            sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem' }}
          >
            {' '}
            / {formatTime(duration)}
          </Box>
        </Typography>

        <PlaybackButtons
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onSkipToStart={onSkipToStart}
          onSkipToEnd={onSkipToEnd}
          onSkipBackward10={onSkipBackward10}
          onSkipForward10={onSkipForward10}
          compact
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: '0 0 auto' }}>
          <DockButton
            icon={<GroupRoundedIcon fontSize="small" />}
            label="Players"
            active={playersOpen}
            onClick={onTogglePlayers}
          />
          {hasChapters && (
            <DockButton
              icon={<TimelineRoundedIcon fontSize="small" />}
              label="Chapters"
              active={sheet === 'chapters'}
              onClick={() => setSheet((s) => (s === 'chapters' ? null : 'chapters'))}
            />
          )}
          <DockButton
            icon={<TuneRoundedIcon fontSize="small" />}
            label="Settings"
            active={sheet === 'settings'}
            onClick={() => setSheet((s) => (s === 'settings' ? null : 'settings'))}
          />
        </Box>
      </Box>

      {/* Chapters sheet — the trial scrubber + play-trial controls */}
      {hasChapters && trialNav && (
        <MobileSheet
          open={sheet === 'chapters'}
          title="Trial chapters"
          onClose={() => setSheet(null)}
        >
          <ContinuousReplayBar
            timeline={trialNav.timeline}
            currentFightId={trialNav.currentFightId}
            currentLocalMs={currentTime}
            onSeek={onTrialSeek ?? (() => {})}
            continuousEnabled={trialNav.continuousEnabled}
            onToggleContinuous={trialNav.onToggleContinuous}
            includeTrash={trialNav.includeTrash}
            onToggleIncludeTrash={trialNav.onToggleIncludeTrash}
            hasTrash={trialNav.hasTrash}
            runName={trialNav.runName}
            runIndex={trialNav.runIndex}
            runCount={trialNav.runCount}
            nextUpLabel={trialNextUpLabel ?? null}
            compact
          />
        </MobileSheet>
      )}

      {/* Settings sheet — speed, trails, share */}
      <MobileSheet open={sheet === 'settings'} title="Settings" onClose={() => setSheet(null)}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Playback speed
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5, mb: 1.5 }}>
          {PLAYBACK_SPEEDS.map((sp) => {
            const active = sp === playbackSpeed;
            return (
              <Box
                key={sp}
                component="button"
                type="button"
                onClick={() => onSpeedChange(sp)}
                aria-pressed={active}
                sx={{
                  appearance: 'none',
                  cursor: 'pointer',
                  px: 1.25,
                  py: 0.75,
                  minWidth: 52,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  backgroundColor: active ? 'action.selected' : 'transparent',
                  color: active ? 'primary.main' : 'text.primary',
                  fontWeight: active ? 700 : 500,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {sp}×
              </Box>
            );
          })}
        </Box>

        <FormControlLabel
          sx={{ display: 'flex', ml: 0, justifyContent: 'space-between' }}
          labelPlacement="start"
          control={<Switch checked={showTrails} onChange={onToggleTrails} />}
          label={<Typography variant="body2">Player trails</Typography>}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <ShareButton
            reportId={reportId}
            fightId={fightId}
            currentTime={currentTime}
            selectedActorIdRef={selectedActorIdRef}
            timeRef={timeRef}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Share this view
          </Typography>
        </Box>
      </MobileSheet>
    </Box>
  );
};

export const MobileReplayDock = React.memo(MobileReplayDockComponent);
