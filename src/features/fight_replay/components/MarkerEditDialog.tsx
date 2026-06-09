/**
 * Dialog for editing a single map marker: icon (Elms template), label, colour, and size.
 * Submits one atomic MarkerEdit so the change is a single undo step.
 */
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

import { MorMarker } from '@/types/mapMarkers';
import { ELMS_ICON_MAP } from '@/utils/elmsMarkersDecoder';

import { ReplayMarker } from '../types/mapMarkers';
import { COMMON_MARKER_GROUPS, MarkerEdit } from '../utils/mapMarkerConverters';

import { MarkerSpritePreview } from './MarkerSpritePreview';

const MIN_SIZE_METERS = 0.5;
const MAX_SIZE_METERS = 5;

/** Quick-pick swatches mirroring the Elms marker palette. */
const COLOUR_SWATCHES: Array<{ label: string; rgb: [number, number, number] }> = [
  { label: 'White', rgb: [1, 1, 1] },
  { label: 'Blue', rgb: [0, 0, 1] },
  { label: 'Green', rgb: [0, 1, 0] },
  { label: 'Orange', rgb: [1, 0.5, 0] },
  { label: 'Pink', rgb: [1, 0, 0.9] },
  { label: 'Red', rgb: [1, 0, 0] },
  { label: 'Yellow', rgb: [1, 0.8, 0] },
];

function rgbToHexInput([r, g, b]: [number, number, number]): string {
  const toHex = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexInputToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }
  const value = parseInt(match[1], 16);
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

interface MarkerEditDialogProps {
  /** The marker being edited; null closes the dialog. */
  marker: ReplayMarker | null;
  onClose: () => void;
  /** Apply the edit (single undo step) and close. */
  onApply: (markerId: string, edit: MarkerEdit) => void;
  /** Delete the marker and close. */
  onDelete: (markerId: string) => void;
}

export const MarkerEditDialog: React.FC<MarkerEditDialogProps> = ({
  marker,
  onClose,
  onApply,
  onDelete,
}) => {
  const theme = useTheme();
  // Full-screen on phones (same breakpoint as MapMarkersModal) — the icon grid needs the room.
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [iconKey, setIconKey] = useState<number | undefined>(undefined);
  const [text, setText] = useState('');
  const [rgb, setRgb] = useState<[number, number, number]>([1, 1, 1]);
  const [size, setSize] = useState(1);

  // Seed the form whenever a (different) marker opens the dialog.
  useEffect(() => {
    if (!marker) {
      return;
    }
    setIconKey(marker.elmsIconKey);
    setText(marker.text ?? '');
    setRgb([marker.colour[0], marker.colour[1], marker.colour[2]]);
    setSize(Math.min(MAX_SIZE_METERS, Math.max(MIN_SIZE_METERS, marker.size)));
  }, [marker]);

  // Picking an icon previews its template values in the form; the user can then override them.
  const handlePickIcon = useCallback((nextIconKey: number) => {
    const template: Partial<MorMarker> | undefined = ELMS_ICON_MAP[nextIconKey];
    if (!template) {
      return;
    }
    setIconKey(nextIconKey);
    setText(template.text ?? '');
    const colour = template.colour ?? [1, 1, 1, 1];
    setRgb([colour[0], colour[1], colour[2]]);
    setSize(template.size ?? 1);
  }, []);

  const handleApply = useCallback(() => {
    if (!marker) {
      return;
    }

    const alpha = marker.colour[3];
    onApply(marker.id, {
      iconKey,
      text,
      colour: [rgb[0], rgb[1], rgb[2], alpha],
      size,
    });
    onClose();
  }, [iconKey, marker, onApply, onClose, rgb, size, text]);

  const handleDelete = useCallback(() => {
    if (!marker) {
      return;
    }
    onDelete(marker.id);
    onClose();
  }, [marker, onClose, onDelete]);

  return (
    <Dialog
      open={Boolean(marker)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Edit Marker</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Icon picker */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Icon
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {COMMON_MARKER_GROUPS.map((group) => (
              <Box key={group.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 110, flexShrink: 0 }}
                >
                  {group.label}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {group.options.map((option) => (
                    <Box
                      key={option.iconKey}
                      component="button"
                      type="button"
                      onClick={() => handlePickIcon(option.iconKey)}
                      aria-label={`Use icon ${option.label}`}
                      aria-pressed={iconKey === option.iconKey}
                      sx={{
                        p: 0.25,
                        background: 'none',
                        border: '2px solid',
                        borderColor: iconKey === option.iconKey ? 'primary.main' : 'transparent',
                        borderRadius: 1,
                        cursor: 'pointer',
                        display: 'inline-flex',
                      }}
                    >
                      <MarkerSpritePreview iconKey={option.iconKey} label={option.label} />
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Label */}
        <TextField
          label="Label"
          value={text}
          onChange={(e) => setText(e.target.value)}
          size="small"
          fullWidth
          helperText="Shown on the marker. Custom labels export via the M0R format only."
        />

        {/* Colour */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Colour
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            {COLOUR_SWATCHES.map((swatch) => {
              const selected = rgbToHexInput(swatch.rgb) === rgbToHexInput(rgb);
              return (
                <Tooltip key={swatch.label} title={swatch.label}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setRgb(swatch.rgb)}
                    aria-label={`Set colour ${swatch.label}`}
                    aria-pressed={selected}
                    sx={{
                      // 36px hits the comfortable touch-target floor without crowding desktop.
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      backgroundColor: rgbToHexInput(swatch.rgb),
                      cursor: 'pointer',
                      p: 0,
                    }}
                  />
                </Tooltip>
              );
            })}
            <Box
              component="input"
              type="color"
              value={rgbToHexInput(rgb)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const parsed = hexInputToRgb(e.target.value);
                if (parsed) {
                  setRgb(parsed);
                }
              }}
              aria-label="Custom colour"
              sx={{
                width: 48,
                height: 36,
                p: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
            />
          </Box>
        </Box>

        {/* Size */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Size: {size.toFixed(2)}m
          </Typography>
          <Slider
            value={size}
            onChange={(_event, value) => setSize(value as number)}
            min={MIN_SIZE_METERS}
            max={MAX_SIZE_METERS}
            step={0.25}
            valueLabelDisplay="auto"
            aria-label="Marker size in meters"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleDelete} color="error" type="button">
          Delete
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit" type="button">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" type="button">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
