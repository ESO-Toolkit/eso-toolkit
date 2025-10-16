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
export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
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

        return (
          <Tooltip key={marker.id} title={getTooltipContent(marker)} placement="top" arrow>
            <Box
              onClick={() => handleMarkerClick(marker)}
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
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: `4px solid ${color}`,
                },
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
};
