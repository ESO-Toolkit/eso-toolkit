/**
 * Grouped grid of the common Elms marker icons (Numbers / Arrows / Squares / Hexagons),
 * shared by the add-marker picker and the marker edit dialog. Every option is visible at
 * once — no nested menus — and each cell is a real button, so the grid works the same for
 * touch, mouse, and keyboard.
 */
import { Box, Tooltip, Typography } from '@mui/material';
import React from 'react';

import { COMMON_MARKER_GROUPS } from '../utils/mapMarkerConverters';

import { MarkerSpritePreview } from './MarkerSpritePreview';

interface MarkerIconGridProps {
  /** Highlights the matching cell (edit dialog); omit for one-shot pickers. */
  selectedIconKey?: number;
  onPick: (iconKey: number) => void;
  /** Finger-sized cells (≥48px) for touch surfaces; compact cells for pointer use. */
  touch?: boolean;
}

export const MarkerIconGrid: React.FC<MarkerIconGridProps> = ({
  selectedIconKey,
  onPick,
  touch = false,
}) => {
  const cellSize = touch ? 48 : 38;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: touch ? 1.5 : 1 }}>
      {COMMON_MARKER_GROUPS.filter((group) => group.options.length > 0).map((group) => (
        <Box key={group.key}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
          >
            {group.label}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: touch ? 1 : 0.5 }}>
            {group.options.map((option) => {
              const selected = selectedIconKey === option.iconKey;
              return (
                <Tooltip key={option.iconKey} title={option.label}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onPick(option.iconKey)}
                    aria-label={`Use icon ${option.label}`}
                    aria-pressed={selectedIconKey !== undefined ? selected : undefined}
                    sx={{
                      width: cellSize,
                      height: cellSize,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: '2px solid',
                      borderColor: selected ? 'primary.main' : 'transparent',
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      p: 0,
                      WebkitTapHighlightColor: 'transparent',
                      '&:hover': { backgroundColor: 'action.hover' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                    }}
                  >
                    <MarkerSpritePreview iconKey={option.iconKey} label={option.label} />
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
