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
      switch (marker.type) {
        case 'phase':
          // Flag/diamond cap — a structural beat in the fight.
          return {
            width: 8,
            height: 8,
            top: -6,
            backgroundColor: color,
            transform: 'translateX(-50%) rotate(45deg)',
          };
        case 'death':
          // Downward triangle — a hit/death.
          return {
            width: 0,
            height: 0,
            top: -5,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `5px solid ${color}`,
          };
        case 'custom':
        default:
          // Round pin — user-placed.
          return {
            width: 7,
            height: 7,
            top: -5,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'translateX(-50%)',
          };
      }
    },
    [],
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
        mt: 0.5,
        mb: 0.5,
      }}
    >
      {markers.map((marker) => {
        const position = getMarkerPosition(marker.timestamp);
        const color = getMarkerColor(marker);
        const cap = getMarkerCap(marker, color);

        return (
          <Tooltip key={marker.id} title={getTooltipContent(marker)} placement="top" arrow>
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
                position: 'absolute',
                left: `${position}%`,
                transform: 'translateX(-50%)',
                width: 3,
                height: 24,
                backgroundColor: color,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                zIndex: 1,
                '&:hover': {
                  width: 5,
                  height: 28,
                  marginTop: -2,
                  boxShadow: `0 0 8px ${color}`,
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '1px',
                },
                // Per-type cap (shape channel — see getMarkerCap).
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: '50%',
                  ...cap,
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
