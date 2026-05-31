/**
 * TimelineLegend Component
 *
 * Compact key for the timeline event markers. Explains the shape + color vocabulary
 * used by TimelineMarkers so users don't have to reverse-engineer it by hovering.
 * Only renders the marker types actually present on the current timeline.
 *
 * @module TimelineLegend
 */

import { Box, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { TimelineAnnotation } from '../../../types/timelineAnnotations';

interface TimelineLegendProps {
  /** Markers currently on the timeline — drives which legend entries appear. */
  markers: TimelineAnnotation[];
}

type LegendKey = 'phase' | 'friendly-death' | 'enemy-death' | 'custom' | 'cluster';

interface LegendEntry {
  key: LegendKey;
  label: string;
  /** theme.palette path resolved via sx tokens */
  color: string;
  shape: 'diamond' | 'triangle' | 'pin' | 'stack';
}

const LEGEND_ENTRIES: Record<LegendKey, LegendEntry> = {
  phase: { key: 'phase', label: 'Phase', color: 'primary.main', shape: 'diamond' },
  'friendly-death': {
    key: 'friendly-death',
    label: 'Ally death',
    color: 'error.main',
    shape: 'triangle',
  },
  'enemy-death': {
    key: 'enemy-death',
    label: 'Enemy death',
    color: 'warning.main',
    shape: 'triangle',
  },
  custom: { key: 'custom', label: 'Marker', color: 'info.main', shape: 'pin' },
  // A cluster can group any type, so its swatch is hue-neutral; the hollow stacked square
  // (matching the on-rail cluster cap) is what keys it.
  cluster: { key: 'cluster', label: 'Grouped events', color: 'text.secondary', shape: 'stack' },
};

/** Small shape swatch matching the on-rail marker caps. */
const LegendSwatch: React.FC<{ color: string; shape: LegendEntry['shape'] }> = ({
  color,
  shape,
}) => {
  if (shape === 'triangle') {
    return (
      <Box
        component="span"
        sx={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '7px solid',
          borderTopColor: color,
          display: 'inline-block',
        }}
      />
    );
  }
  if (shape === 'stack') {
    // Hollow outlined square — mirrors the on-rail cluster cap.
    return (
      <Box
        component="span"
        sx={{
          width: 9,
          height: 9,
          border: '2px solid',
          borderColor: color,
          borderRadius: '2px',
          display: 'inline-block',
          boxSizing: 'border-box',
        }}
      />
    );
  }
  return (
    <Box
      component="span"
      sx={{
        width: 9,
        height: 9,
        backgroundColor: color,
        borderRadius: shape === 'pin' ? '50%' : 0,
        transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
        display: 'inline-block',
      }}
    />
  );
};

const TimelineLegendComponent: React.FC<TimelineLegendProps> = ({ markers }) => {
  // Which legend entries are relevant to the current markers.
  const presentKeys = useMemo(() => {
    const keys = new Set<LegendKey>();
    for (const m of markers) {
      if (m.type === 'phase') keys.add('phase');
      else if (m.type === 'custom') keys.add('custom');
      else if (m.type === 'death') keys.add(m.isFriendly ? 'friendly-death' : 'enemy-death');
      else if (m.type === 'cluster') keys.add('cluster');
    }
    return keys;
  }, [markers]);

  if (presentKeys.size === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        rowGap: 0.5,
        mt: 0.25,
      }}
      aria-label="Timeline marker legend"
    >
      {(Object.keys(LEGEND_ENTRIES) as LegendKey[])
        .filter((k) => presentKeys.has(k))
        .map((k) => {
          const entry = LEGEND_ENTRIES[k];
          return (
            <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LegendSwatch color={entry.color} shape={entry.shape} />
              <Typography variant="caption" color="text.secondary">
                {entry.label}
              </Typography>
            </Box>
          );
        })}
    </Box>
  );
};

/**
 * Memoized — its only prop is the stable `markers` array, so it never re-renders during
 * playback (consistent with TimelineMarkers).
 */
export const TimelineLegend = React.memo(TimelineLegendComponent);
