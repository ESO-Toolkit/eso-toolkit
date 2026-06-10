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
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { Box, Switch, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOptimizedTimelineScrubbing } from '../../../../hooks/useOptimizedTimelineScrubbing';
import { useTimelineMarkers } from '../../../../hooks/useTimelineMarkers';
import type { TrialChapter } from '../../trial_chapters/types';
import { ChapterList } from '../ChapterList';
import type { TrialReplayNav } from '../FightReplay3D';
import { PlaybackButtons } from '../PlaybackButtons';
import { ShareButton } from '../ShareButton';
import { TimelineSlider } from '../TimelineSlider';
import { TrialTimeline, type TrialTimelineSeekTarget } from '../TrialTimeline';

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
  /** Manual chapter navigation (pushes a history entry, unlike the continuous-flow seek). */
  onChapterSelect?: (chapter: TrialChapter) => void;
  /** Real start time of the loaded fight (anchors the sheet scrubber when off-timeline). */
  currentFightStartTime?: number;
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
  /** Reports whether a sheet is open (the host pauses chrome auto-hide while one is). */
  onSheetOpenChange?: (open: boolean) => void;
}

type SheetId = 'chapters' | 'settings' | null;

/**
 * A settings row: leading icon + label/description, trailing control. Generous 56px tap target.
 * Rendered as a <label> when it wraps a Switch (no onActivate), so tapping anywhere on the row
 * toggles the control — the native settings-row convention. The switch itself still needs an
 * aria-label at the call site (a wrapping label would fold the description into the name).
 */
const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  control: React.ReactNode;
  onActivate?: () => void;
  active?: boolean;
}> = ({ icon, label, description, control, onActivate, active }) => (
  <Box
    component={onActivate ? 'button' : 'label'}
    type={onActivate ? 'button' : undefined}
    onClick={onActivate}
    sx={(theme) => ({
      appearance: 'none',
      width: '100%',
      textAlign: 'left',
      font: 'inherit',
      cursor: 'pointer',
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

/**
 * A bottom-dock tool button (icon over a tiny label). Module-scope so its component identity is
 * stable across the dock's per-tick re-renders — defining it inside the dock body made it a new
 * type every render, remounting all three buttons each tick.
 */
const DockButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  /** True for buttons that open a bottom sheet (announced as a dialog launcher, not a toggle). */
  opensSheet?: boolean;
}> = ({ icon, label, active, onClick, opensSheet }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={opensSheet ? undefined : active}
    aria-haspopup={opensSheet ? 'dialog' : undefined}
    aria-expanded={opensSheet ? active : undefined}
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
      minWidth: 56,
      height: 46,
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
  onChapterSelect,
  currentFightStartTime,
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
  onSheetOpenChange,
}) => {
  const [sheet, setSheet] = useState<SheetId>(null);

  // The host pauses the tap-to-toggle chrome auto-hide while a sheet is up. The cleanup
  // matters: if the dock (or the sheet's host gate) unmounts while a sheet is open, the host
  // would otherwise be stranded with sheetOpen=true and never auto-hide chrome again.
  useEffect(() => {
    onSheetOpenChange?.(sheet !== null);
    return () => onSheetOpenChange?.(false);
  }, [sheet, onSheetOpenChange]);

  // A chapter tap / cross-fight scrub commit closes the sheet so the "Entering <area>"
  // transition lands in full view (same-fight seeks keep the sheet for fine-tuning).
  const handleSheetTrialSeek = useCallback(
    (target: TrialTimelineSeekTarget) => {
      onTrialSeek?.(target);
      if (!target.sameFight) setSheet(null);
    },
    [onTrialSeek],
  );

  const handleChapterSelect = useCallback(
    (chapter: TrialChapter) => {
      const sameFight = chapter.fightId === trialNav?.currentFightId;
      if (sameFight) {
        // Restart the current chapter in place.
        onTrialSeek?.({ fightId: chapter.fightId, localMs: 0, sameFight: true });
      } else if (onChapterSelect) {
        // Manual navigation — pushes a history entry so Back returns here.
        onChapterSelect(chapter);
      } else {
        onTrialSeek?.({ fightId: chapter.fightId, localMs: 0, sameFight: false });
      }
      // Close either way: a chapter tap is a navigation, not a fine-tuning scrub.
      setSheet(null);
    },
    [onTrialSeek, onChapterSelect, trialNav?.currentFightId],
  );

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

  // Chapters surfaces exist whenever a run exists — NOT gated on the filtered timeline's entry
  // count, or toggling "Include trash" off inside the sheet could unmount the sheet (and the
  // toggle) out from under the user's finger.
  const hasChapters = Boolean(trialNav);

  // Belt-and-braces: if the chapters surface does vanish while its sheet is open (run change,
  // breakpoint flip), heal the sheet state instead of stranding it.
  useEffect(() => {
    if (!hasChapters && sheet === 'chapters') setSheet(null);
  }, [hasChapters, sheet]);

  return (
    <Box
      sx={(theme) => ({
        flex: '0 0 auto',
        px: { xs: 1.25, sm: 2 },
        pt: 0.75,
        pb: 'calc(env(safe-area-inset-bottom) + 10px)',
        // Solid (NOT a backdrop blur): a blur layer over the live WebGL canvas forces a full-screen
        // readback + re-blur on every animation frame, which tanks tap latency on iOS. A near-opaque
        // fill reads the same over the dark arena and is cheap to composite. NOTE: deliberately NO
        // `transform` here — the bottom sheets render as position:fixed children, and a transform on
        // this ancestor would make IT their containing block (breaking their full-viewport sizing).
        // The dock only repaints ~10Hz as the slider thumb moves, so it doesn't need its own layer.
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(8,11,20,0.96)' : 'rgba(255,255,255,0.97)',
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

      {/* Transport — its OWN centered row so the play orb sits dead-center horizontally (it can't be
          centered on a row it shares with the asymmetric timecode + tool buttons) and clear of the
          bottom edge. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 0.25 }}>
        <PlaybackButtons
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onSkipToStart={onSkipToStart}
          onSkipToEnd={onSkipToEnd}
          onSkipBackward10={onSkipBackward10}
          onSkipForward10={onSkipForward10}
          compact
        />
      </Box>

      {/* Tools row — timecode (left) + the sheet buttons (right). */}
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
              opensSheet
              onClick={() => setSheet((s) => (s === 'chapters' ? null : 'chapters'))}
            />
          )}
          <DockButton
            icon={<TuneRoundedIcon fontSize="small" />}
            label="Settings"
            active={sheet === 'settings'}
            opensSheet
            onClick={() => setSheet((s) => (s === 'settings' ? null : 'settings'))}
          />
        </Box>
      </Box>

      {/* Chapters sheet — autoplay controls, the trial scrubber, and a real tappable chapter
          LIST (boss avatars, kill/wipe, duration — the Netflix episodes surface). The body is
          rendered ONLY while the sheet is open: it gets `currentLocalMs` (the playback tick), and
          keeping it mounted while closed re-reconciled it behind the arena, stealing main-thread
          time from the 60fps render loop. */}
      {hasChapters && trialNav && (
        <MobileSheet
          open={sheet === 'chapters'}
          title={
            trialNav.runCount > 1
              ? `${trialNav.runName} · ${trialNav.runIndex + 1}/${trialNav.runCount}`
              : trialNav.runName
          }
          onClose={() => setSheet(null)}
        >
          {sheet === 'chapters' && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
                <SettingRow
                  icon={<PlaylistPlayRoundedIcon fontSize="small" />}
                  label="Autoplay"
                  description="Continue into the next fight automatically"
                  active={trialNav.continuousEnabled}
                  control={
                    <Switch
                      checked={trialNav.continuousEnabled}
                      onChange={trialNav.onToggleContinuous}
                      slotProps={{ input: { 'aria-label': 'Autoplay the whole trial' } }}
                    />
                  }
                />
                {trialNav.hasTrash && (
                  <SettingRow
                    icon={<DeleteSweepRoundedIcon fontSize="small" />}
                    label="Include trash"
                    description="Walk the pulls between bosses too"
                    active={trialNav.includeTrash}
                    control={
                      <Switch
                        checked={trialNav.includeTrash}
                        onChange={trialNav.onToggleIncludeTrash}
                        slotProps={{ input: { 'aria-label': 'Include trash fights' } }}
                      />
                    }
                  />
                )}
              </Box>

              {trialNextUpLabel && trialNav.continuousEnabled && (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                  noWrap
                >
                  Up next:{' '}
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {trialNextUpLabel}
                  </Box>
                </Typography>
              )}

              {/* Whole-run scrubber — the tall touch variant (≥44px interactive band). */}
              <Box sx={{ mb: 1.5 }}>
                <TrialTimeline
                  timeline={trialNav.timeline}
                  currentFightId={trialNav.currentFightId}
                  currentFightStartTime={currentFightStartTime}
                  currentLocalMs={currentTime}
                  onSeek={handleSheetTrialSeek}
                  variant="sheet"
                />
              </Box>

              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}
              >
                Chapters
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <ChapterList
                  chapters={trialNav.timeline.entries.map((e) => e.chapter)}
                  currentFightId={trialNav.currentFightId}
                  onSelect={handleChapterSelect}
                />
              </Box>
            </>
          )}
        </MobileSheet>
      )}

      {/* Settings sheet — playback speed · display toggles · share. Body rendered only while open
          (same reason as above: its ShareButton takes `currentTime`, so a mounted-but-closed sheet
          reconciled at the playback tick). */}
      <MobileSheet open={sheet === 'settings'} title="Settings" onClose={() => setSheet(null)}>
        {sheet === 'settings' && (
          <>
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
                      backgroundColor: active
                        ? alpha(theme.palette.primary.main, 0.16)
                        : 'transparent',
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
                control={
                  <Switch
                    checked={namesEnabled}
                    onChange={onToggleNames}
                    slotProps={{ input: { 'aria-label': 'Name tags' } }}
                  />
                }
              />
              <SettingRow
                icon={<RouteRoundedIcon fontSize="small" />}
                label="Player trails"
                description="Movement paths over time"
                active={showTrails}
                control={
                  <Switch
                    checked={showTrails}
                    onChange={onToggleTrails}
                    slotProps={{ input: { 'aria-label': 'Player trails' } }}
                  />
                }
              />
              {following && (
                <SettingRow
                  icon={<InsightsRoundedIcon fontSize="small" />}
                  label="Player stats"
                  description="Live readout for the followed player"
                  active={statsPanelEnabled}
                  control={
                    <Switch
                      checked={statsPanelEnabled}
                      onChange={onToggleStats}
                      slotProps={{ input: { 'aria-label': 'Player stats' } }}
                    />
                  }
                />
              )}
              <SettingRow
                icon={<BoltRoundedIcon fontSize="small" />}
                label="Performance mode"
                description="Drop shadows for smoother large fights"
                active={performanceMode}
                control={
                  <Switch
                    checked={performanceMode}
                    onChange={onTogglePerformance}
                    slotProps={{ input: { 'aria-label': 'Performance mode' } }}
                  />
                }
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
          </>
        )}
      </MobileSheet>
    </Box>
  );
};

export const MobileReplayDock = React.memo(MobileReplayDockComponent);
