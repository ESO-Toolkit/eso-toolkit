/**
 * Dialog for editing a single map marker: icon (Elms template), label, colour, and size.
 * Submits one atomic MarkerEdit so the change is a single undo step.
 */
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { portalToFullscreen } from '../utils/fullscreenPortal';
import { MarkerEdit } from '../utils/mapMarkerConverters';

import { MarkerIconGrid } from './MarkerIconGrid';

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

  // Seed the form whenever a (different) marker opens the dialog. Size is seeded UNclamped:
  // imported M0R markers can legitimately sit outside the slider range (e.g. 0.3 or 33.5),
  // and a label-only edit must not silently rewrite them. Only the slider track display is
  // clamped; the value submits as-is unless the user actually drags the slider.
  useEffect(() => {
    if (!marker) {
      return;
    }
    setIconKey(marker.elmsIconKey);
    setText(marker.text ?? '');
    setRgb([marker.colour[0], marker.colour[1], marker.colour[2]]);
    setSize(marker.size);
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

  // Imported M0R markers can legitimately sit outside the slider range; the slider track clamps
  // its display but the value is preserved. Flag that so the clamped track doesn't silently
  // contradict the true size shown in the label.
  const sizeOutOfRange = size < MIN_SIZE_METERS || size > MAX_SIZE_METERS;
  // The colour editor only exposes RGB; the marker's alpha is preserved verbatim through Save
  // (handleApply re-attaches marker.colour[3]). Surface it so a translucent marker isn't a
  // silent surprise. Defaults to 1 (fully opaque) when unset.
  const markerAlpha = marker?.colour[3] ?? 1;

  return (
    <Dialog
      open={Boolean(marker)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      // "Edit marker…" is reachable from the in-replay marker menu while in desktop native
      // fullscreen; portal the dialog into that subtree so it isn't invisible there.
      container={portalToFullscreen}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1.5 }}>
        <Box component="span" sx={{ flexGrow: 1 }}>
          Edit Marker
        </Box>
        {/* Full-screen on phones, so the dialog needs an exit at the top — reaching the
            bottom Cancel one-handed is a stretch. */}
        <IconButton aria-label="Close" onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Icon picker */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Icon
          </Typography>
          <MarkerIconGrid selectedIconKey={iconKey} onPick={handlePickIcon} touch={fullScreen} />
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
          {markerAlpha < 1 && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}
            >
              Opacity ({Math.round(markerAlpha * 100)}%) is preserved from the original marker.
            </Typography>
          )}
        </Box>

        {/* Size */}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ mb: 0.5, color: sizeOutOfRange ? 'warning.main' : undefined }}
          >
            Size: {size.toFixed(2)}m
            {sizeOutOfRange && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'warning.main' }}>
                (outside the slider range — preserved as imported)
              </Typography>
            )}
          </Typography>
          <Slider
            // Display clamps an out-of-range size to the track edge; `size` itself stays
            // untouched until the user drags, so Save preserves the original value.
            value={Math.min(MAX_SIZE_METERS, Math.max(MIN_SIZE_METERS, size))}
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
