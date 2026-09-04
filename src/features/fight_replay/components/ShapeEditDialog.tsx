/**
 * Edit dialog for a drawn shape: label, colour, width, dashed/fill, circle radius, and an optional
 * "show only during a time window" reveal tied to fight playback time. Submits one ShapeEditPatch
 * (a single undo step).
 */
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Slider,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { ReplayShape } from '../types/mapMarkers';
import { portalToFullscreen } from '../utils/fullscreenPortal';
import { ShapeEditPatch } from '../utils/mapMarkerConverters';

type RGBA = [number, number, number, number];

const SWATCHES: Array<{ rgba: RGBA; name: string }> = [
  { rgba: [1, 1, 1, 1], name: 'White' },
  { rgba: [0.9, 0.16, 0.22, 1], name: 'Red' },
  { rgba: [1, 0.5, 0, 1], name: 'Orange' },
  { rgba: [1, 0.8, 0, 1], name: 'Gold' },
  { rgba: [0.3, 0.85, 0.3, 1], name: 'Green' },
  { rgba: [0, 0.9, 0.85, 1], name: 'Cyan' },
  { rgba: [0.2, 0.5, 1, 1], name: 'Blue' },
  { rgba: [1, 0.2, 0.85, 1], name: 'Magenta' },
];

function toCss([r, g, b, a]: RGBA): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

function sameRGB(a: RGBA, b: RGBA): boolean {
  return (
    Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02 && Math.abs(a[2] - b[2]) < 0.02
  );
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ShapeEditDialogProps {
  open: boolean;
  shape: ReplayShape | null;
  /** Fight duration in ms — the upper bound for the time-window slider. */
  fightDurationMs: number;
  onClose: () => void;
  onSubmit: (shapeId: string, patch: ShapeEditPatch) => void;
}

export const ShapeEditDialog: React.FC<ShapeEditDialogProps> = ({
  open,
  shape,
  fightDurationMs,
  onClose,
  onSubmit,
}) => {
  const [label, setLabel] = useState('');
  const [colour, setColour] = useState<RGBA>([1, 0.5, 0, 1]);
  const [width, setWidth] = useState(4);
  const [dashed, setDashed] = useState(false);
  const [fill, setFill] = useState(true);
  const [radius, setRadius] = useState(8);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, fightDurationMs]);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Seed local state from the shape each time the dialog opens for a (new) shape.
  useEffect(() => {
    if (!shape) return;
    setLabel(shape.label ?? '');
    setColour([...shape.style.colour] as RGBA);
    setWidth(shape.style.width);
    setDashed(shape.style.dashed);
    setFill(shape.style.fill);
    setRadius(shape.radius ?? 8);
    setTimeEnabled(!!shape.time);
    setTimeRange(shape.time ? [shape.time[0], shape.time[1]] : [0, fightDurationMs]);
  }, [shape, fightDurationMs]);

  const isClosed = shape
    ? shape.kind === 'polygon' || shape.kind === 'rect' || shape.kind === 'circle'
    : false;

  const duration = useMemo(() => Math.max(1000, fightDurationMs), [fightDurationMs]);

  if (!shape) {
    return null;
  }

  const handleSubmit = (): void => {
    const patch: ShapeEditPatch = {
      style: { colour: [...colour] as RGBA, width, dashed, fill },
      label: label.trim().length > 0 ? label : null,
      time: timeEnabled ? [timeRange[0], timeRange[1]] : null,
    };
    if (shape.kind === 'circle' && Number.isFinite(radius) && radius > 0) {
      patch.radius = radius;
    }
    onSubmit(shape.id, patch);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
      // Inside the fullscreen element so the dialog stays visible in native fullscreen
      // (body portals render underneath the top layer). See fullscreenPortal.
      container={portalToFullscreen()}
    >
      <DialogTitle>Edit shape</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          size="small"
          fullWidth
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
          helperText={label.length > 0 ? `${label.length}/120` : undefined}
        />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Colour
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
            {SWATCHES.map(({ rgba, name }) => {
              const selected = sameRGB(colour, rgba);
              return (
                <Box
                  key={name}
                  component="button"
                  type="button"
                  aria-label={`Colour ${name}`}
                  aria-pressed={selected}
                  onClick={() => setColour([...rgba] as RGBA)}
                  sx={{
                    // 28px meets the WCAG 2.5.8 24px minimum with margin; the glyph stays small.
                    width: 28,
                    height: 28,
                    p: 0,
                    borderRadius: '50%',
                    background: toCss(rgba),
                    cursor: 'pointer',
                    border: selected ? '2px solid' : '1px solid rgba(0,0,0,0.4)',
                    borderColor: selected ? 'primary.main' : 'rgba(0,0,0,0.4)',
                    boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.5)' : 'none',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Width
          </Typography>
          <Slider
            size="small"
            min={1}
            max={10}
            step={1}
            value={width}
            valueLabelDisplay="auto"
            onChange={(_e, value) => setWidth(Array.isArray(value) ? value[0] : value)}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={<Switch checked={dashed} onChange={(e) => setDashed(e.target.checked)} />}
            label="Dashed"
          />
          {isClosed && (
            <FormControlLabel
              control={<Switch checked={fill} onChange={(e) => setFill(e.target.checked)} />}
              label="Fill"
            />
          )}
        </Box>

        {shape.kind === 'circle' && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Radius: {radius.toFixed(1)}m
            </Typography>
            <Slider
              size="small"
              min={1}
              max={50}
              step={0.5}
              value={radius}
              valueLabelDisplay="auto"
              onChange={(_e, value) => setRadius(Array.isArray(value) ? value[0] : value)}
            />
          </Box>
        )}

        <Box>
          <FormControlLabel
            control={
              <Switch checked={timeEnabled} onChange={(e) => setTimeEnabled(e.target.checked)} />
            }
            label="Show only during a time window"
          />
          {timeEnabled && (
            <Box sx={{ px: 1 }}>
              <Slider
                size="small"
                min={0}
                max={duration}
                step={500}
                value={timeRange}
                valueLabelDisplay="auto"
                valueLabelFormat={formatClock}
                onChange={(_e, value) =>
                  Array.isArray(value) && setTimeRange([value[0], value[1]] as [number, number])
                }
              />
              <Typography variant="caption" color="text.secondary">
                {formatClock(timeRange[0])} – {formatClock(timeRange[1])}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
