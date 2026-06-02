/**
 * TimelineMarkers Component
 *
 * Renders visual markers on the timeline for phase transitions, death events,
 * and custom markers with tooltips and click-to-jump functionality.
 *
 * @module TimelineMarkers
 */

import { Box, Tooltip, useTheme } from '@mui/material';
import React, { useCallback } from 'react';

import { TimelineAnnotation } from '../../../types/timelineAnnotations';

interface TimelineMarkersProps {
  /** Timeline markers to display */
  markers: TimelineAnnotation[];
  /** Total duration in milliseconds */
  duration: number;
  /** Callback when a marker is clicked */
  onMarkerClick?: (timestamp: number) => void;
  /** Callback when a marker is deleted (custom markers only) */
  onMarkerDelete?: (markerId: string) => void;
}

/**
 * Timeline Markers Component
 *
 * Renders interactive markers on the timeline with:
 * - Visual indicators at specific timestamps
 * - Hover tooltips with event details
 * - Click-to-jump functionality
 * - Color-coded by marker type
 */
const TimelineMarkersComponent: React.FC<TimelineMarkersProps> = ({
  markers,
  duration,
  onMarkerClick,
  onMarkerDelete: _onMarkerDelete,
}) => {
  const theme = useTheme();

  // Calculate position percentage for a marker
  const getMarkerPosition = useCallback(
    (timestamp: number): number => {
      if (duration === 0) return 0;
      return (timestamp / duration) * 100;
    },
    [duration],
  );

  // Format time for tooltip
  const formatTime = useCallback((timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get color for marker
  const getMarkerColor = useCallback(
    (marker: TimelineAnnotation): string => {
      if (marker.color) {
        return marker.color;
      }

      switch (marker.type) {
        case 'phase':
          return theme.palette.primary.main;
        case 'death':
          return marker.isFriendly ? theme.palette.error.main : theme.palette.warning.main;
        case 'custom':
          return theme.palette.info.main;
        case 'cluster':
          // A cluster inherits the color of the type it groups so the hue channel still maps
          // to "what kind of burst" this is.
          switch (marker.clusterType) {
            case 'phase':
              return theme.palette.primary.main;
            case 'death':
              return marker.isFriendly ? theme.palette.error.main : theme.palette.warning.main;
            case 'custom':
              return theme.palette.info.main;
            default:
              return theme.palette.grey[500];
          }
        default:
          return theme.palette.grey[500];
      }
    },
    [theme],
  );

  // Distinguish marker types by SHAPE, not color alone (WCAG 1.4.1). Each type gets a
  // distinct cap so the timeline is readable without relying on hue. Derived per marker
  // inside the render map — no upstream array changes, so TimelineMarkers' memo holds.
  const getMarkerCap = useCallback(
    (marker: TimelineAnnotation, color: string): React.CSSProperties => {
      // Shapes are grid-centered on the rail by the parent (no absolute offsets). Keep
      // `transform` only where the shape itself needs rotating (the diamond).
      switch (marker.type) {
        case 'phase':
          // Diamond cap — a structural beat in the fight. Slightly larger than the
          // single-event caps so phases read as the most important beats at a glance.
          return {
            width: 10,
            height: 10,
            backgroundColor: color,
            transform: 'rotate(45deg)',
          };
        case 'death':
          // Downward triangle — a hit/death.
          return {
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `9px solid ${color}`,
          };
        case 'cluster':
          // Hollow stacked square — reads as "several events here", distinct from the three
          // single-event shapes. Kept in the cluster's inherited hue (see getMarkerColor) and
          // outlined rather than filled so it doesn't masquerade as a single solid marker.
          return {
            width: 11,
            height: 11,
            backgroundColor: theme.palette.background.paper,
            border: `2px solid ${color}`,
            borderRadius: '2px',
          };
        case 'custom':
        default:
          // Round pin — user-placed.
          return {
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: color,
          };
      }
    },
    [theme],
  );

  // Get tooltip content for marker
  const getTooltipContent = useCallback(
    (marker: TimelineAnnotation): string => {
      const timeStr = formatTime(marker.timestamp);

      switch (marker.type) {
        case 'phase':
          return `${marker.label} at ${timeStr}`;
        case 'death':
          return `${marker.label} at ${timeStr}\nKilled by: ${marker.killerName || 'Unknown'}`;
        case 'custom':
          return marker.description
            ? `${marker.label} at ${timeStr}\n${marker.description}`
            : `${marker.label} at ${timeStr}`;
        case 'cluster': {
          // Header line (e.g. "5 deaths at 2:14") + one line per grouped event so the
          // tooltip still surfaces everything the collapsed markers would have shown.
          const lines = marker.members.map((m) => `• ${m.label} (${formatTime(m.timestamp)})`);
          // Cap the listed members so a huge wipe doesn't produce a screen-tall tooltip.
          const MAX_LINES = 8;
          const shown = lines.slice(0, MAX_LINES);
          if (lines.length > MAX_LINES) {
            shown.push(`…and ${lines.length - MAX_LINES} more`);
          }
          return `${marker.label} at ${timeStr}\n${shown.join('\n')}`;
        }
      }
    },
    [formatTime],
  );

  // Handle marker click
  const handleMarkerClick = useCallback(
    (marker: TimelineAnnotation) => {
      if (onMarkerClick) {
        onMarkerClick(marker.timestamp);
      }
    },
    [onMarkerClick],
  );

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 24,
        // No vertical margins: the parent overlay centers this box on the rail line via
        // translateY(-50%); margins would shift that centering and re-introduce the offset.
      }}
    >
      {markers.map((marker) => {
        const position = getMarkerPosition(marker.timestamp);
        const color = getMarkerColor(marker);
        const cap = getMarkerCap(marker, color);

        return (
          <Tooltip
            key={marker.id}
            title={getTooltipContent(marker)}
            placement="top"
            arrow
            // Render the embedded newlines (death "Killed by" + cluster member lists) as
            // actual line breaks instead of collapsing them to spaces.
            slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line' } } }}
          >
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handleMarkerClick(marker)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMarkerClick(marker);
                }
              }}
              aria-label={getTooltipContent(marker)}
              sx={{
                // A transparent, vertically-centered hit-area — NO long colored stem (the
                // proto sits the caps directly on the rail). The cap (shape channel) is the
                // only visible element; the box just gives it a comfortable click/focus
                // target and a tooltip anchor.
                position: 'absolute',
                left: `${position}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 14,
                height: 22,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                zIndex: 1,
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                  borderRadius: '3px',
                },
                // Per-type cap (shape channel — see getMarkerCap), centered on the rail with a
                // soft colored glow; the glow intensifies and the cap lifts slightly on hover.
                '&::before': {
                  content: '""',
                  position: 'static',
                  filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.5)) drop-shadow(0 0 3px ${color})`,
                  transition: 'filter 0.15s ease, transform 0.15s ease',
                  ...cap,
                  // Override the old translateX from getMarkerCap — the cap is now grid-centered.
                  transform: cap.transform?.includes('rotate') ? 'rotate(45deg)' : 'none',
                },
                '&:hover::before': {
                  filter: `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})`,
                  transform: `${cap.transform?.includes('rotate') ? 'rotate(45deg) ' : ''}scale(1.18)`,
                },
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
};

/**
 * Memoized so the marker list (one MUI Tooltip per death/phase event — ~26 for a raid
 * fight) does NOT re-render on every playback tick. Its props are stable during playback:
 * `markers` is a useMemo'd array, `duration` is constant, `onMarkerClick` is a useCallback.
 * The parent (TimelineSlider) re-renders ~10×/sec as the slider thumb moves; without this
 * memo that dragged every Tooltip's layout/popper machinery along, forcing reflow and
 * collapsing playback to single-digit fps. See FIGHT-REPLAY-AUDIT-2026-05-30.md.
 */
export const TimelineMarkers = React.memo(TimelineMarkersComponent);
