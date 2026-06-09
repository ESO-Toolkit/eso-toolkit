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

import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { Box, Switch, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  // Display settings (mirrors the desktop toggles)
  showTrails: boolean;
  onToggleTrails: () => void;
  namesEnabled: boolean;
  onToggleNames: () => void;
  performanceMode: boolean;
  onTogglePerformance: () => void;
  statsPanelEnabled: boolean;
  onToggleStats: () => void;
  /** Whether the camera is locked onto a player (gates the stats-panel toggle, as on desktop). */
  following: boolean;
}

type SheetId = 'chapters' | 'settings' | null;

/** A settings row: leading icon + label/description, trailing control. Generous 56px tap target. */
const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  control: React.ReactNode;
  onActivate?: () => void;
  active?: boolean;
}> = ({ icon, label, description, control, onActivate, active }) => (
  <Box
    component={onActivate ? 'button' : 'div'}
    type={onActivate ? 'button' : undefined}
    onClick={onActivate}
    sx={(theme) => ({
      appearance: 'none',
      width: '100%',
      textAlign: 'left',
      font: 'inherit',
      cursor: onActivate ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      minHeight: 56,
      px: 1.5,
      py: 1,
      borderRadius: 2.5,
      border: '1px solid',
      borderColor: active ? alpha(theme.palette.primary.main, 0.5) : 'transparent',
      backgroundColor: active
        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1)
        : theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.03)',
      transition: 'background-color 120ms ease, border-color 120ms ease',
      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    })}
  >
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        flex: '0 0 auto',
        borderRadius: 2,
        color: active ? 'primary.main' : 'text.secondary',
        backgroundColor: active
          ? alpha(theme.palette.primary.main, 0.16)
          : theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.05)',
      })}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.25 }} noWrap>
        {label}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.3 }} noWrap>
          {description}
        </Typography>
      )}
    </Box>
    <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>{control}</Box>
  </Box>
);

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
  namesEnabled,
  onToggleNames,
  performanceMode,
  onTogglePerformance,
  statsPanelEnabled,
  onToggleStats,
  following,
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
      sx={(theme) => ({
        appearance: 'none',
        border: 'none',
        background: active ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        width: 56,
        height: 48,
        borderRadius: 2,
        color: active ? 'primary.main' : 'text.secondary',
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
      })}
    >
      {icon}
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>{label}</Typography>
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        flex: '0 0 auto',
        px: { xs: 1.25, sm: 2 },
        pt: 0.75,
        pb: 'calc(env(safe-area-inset-bottom) + 8px)',
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(8,11,20,0.94)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          gap: 1.5,
          mt: 0.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: isScrubbingMode || isDragging ? 'info.main' : 'text.primary',
            flex: '0 0 auto',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(displayTime)}
          <Box
            component="span"
            sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.68rem' }}
          >
            {' / '}
            {formatTime(duration)}
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

      {/* Settings sheet — playback speed · display toggles · share */}
      <MobileSheet open={sheet === 'settings'} title="Settings" onClose={() => setSheet(null)}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}
        >
          Playback speed
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 0.75,
            mt: 1,
            mb: 2.5,
          }}
        >
          {PLAYBACK_SPEEDS.map((sp) => {
            const active = sp === playbackSpeed;
            return (
              <Box
                key={sp}
                component="button"
                type="button"
                onClick={() => onSpeedChange(sp)}
                aria-pressed={active}
                sx={(theme) => ({
                  appearance: 'none',
                  cursor: 'pointer',
                  height: 44,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  backgroundColor: active ? alpha(theme.palette.primary.main, 0.16) : 'transparent',
                  color: active ? 'primary.main' : 'text.primary',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.82rem',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'background-color 120ms ease, border-color 120ms ease',
                })}
              >
                {sp}×
              </Box>
            );
          })}
        </Box>

        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}
        >
          Display
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1, mb: 2.5 }}>
          <SettingRow
            icon={<LabelRoundedIcon fontSize="small" />}
            label="Name tags"
            description="Floating player & boss labels"
            active={namesEnabled}
            control={<Switch checked={namesEnabled} onChange={onToggleNames} />}
          />
          <SettingRow
            icon={<RouteRoundedIcon fontSize="small" />}
            label="Player trails"
            description="Movement paths over time"
            active={showTrails}
            control={<Switch checked={showTrails} onChange={onToggleTrails} />}
          />
          {following && (
            <SettingRow
              icon={<InsightsRoundedIcon fontSize="small" />}
              label="Player stats"
              description="Live readout for the followed player"
              active={statsPanelEnabled}
              control={<Switch checked={statsPanelEnabled} onChange={onToggleStats} />}
            />
          )}
          <SettingRow
            icon={<BoltRoundedIcon fontSize="small" />}
            label="Performance mode"
            description="Drop shadows for smoother large fights"
            active={performanceMode}
            control={<Switch checked={performanceMode} onChange={onTogglePerformance} />}
          />
        </Box>

        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}
        >
          Share
        </Typography>
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            mt: 1,
            px: 1.5,
            py: 1,
            minHeight: 56,
            borderRadius: 2.5,
            backgroundColor:
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          })}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.25 }}>
              Share this view
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.3 }}>
              Copies a link to the current moment
            </Typography>
          </Box>
          <ShareButton
            reportId={reportId}
            fightId={fightId}
            currentTime={currentTime}
            selectedActorIdRef={selectedActorIdRef}
            timeRef={timeRef}
          />
        </Box>
      </MobileSheet>
    </Box>
  );
};

export const MobileReplayDock = React.memo(MobileReplayDockComponent);
