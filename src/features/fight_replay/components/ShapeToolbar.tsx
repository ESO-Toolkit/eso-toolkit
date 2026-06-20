/**
 * Drawing toolbar for the esotk-native shapes: pick a tool (polyline / zone / circle / rect /
 * ruler), set the style (colour / width / dashed / fill), and read a short how-to hint. Selecting
 * the active tool again disarms it. Owned state (active tool + style) lives in FightReplay.
 */
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import PolylineIcon from '@mui/icons-material/Polyline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import StraightenIcon from '@mui/icons-material/Straighten';
import {
  Box,
  FormControlLabel,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { ShapeKind, ShapeStyle } from '../types/mapMarkers';

type RGBA = [number, number, number, number];

const TOOLS: Array<{ kind: ShapeKind; label: string; icon: React.ReactNode; hint: string }> = [
  {
    kind: 'polyline',
    label: 'Line',
    icon: <PolylineIcon fontSize="small" />,
    hint: 'Click to add points · double-click or Enter to finish · Esc to cancel',
  },
  {
    kind: 'polygon',
    label: 'Zone',
    icon: <PentagonOutlinedIcon fontSize="small" />,
    hint: 'Click to add points · double-click or Enter to close the zone · Esc to cancel',
  },
  {
    kind: 'circle',
    label: 'Circle',
    icon: <RadioButtonUncheckedIcon fontSize="small" />,
    hint: 'Click the centre, then click to set the radius',
  },
  {
    kind: 'rect',
    label: 'Rect',
    icon: <CropSquareIcon fontSize="small" />,
    hint: 'Click one corner, then the opposite corner',
  },
  {
    kind: 'ruler',
    label: 'Ruler',
    icon: <StraightenIcon fontSize="small" />,
    hint: 'Click two points to measure the distance in metres',
  },
];

/** Preset colours offered as swatches (RGBA 0-1). */
const SWATCHES: RGBA[] = [
  [1, 1, 1, 1],
  [0.9, 0.16, 0.22, 1],
  [1, 0.5, 0, 1],
  [1, 0.8, 0, 1],
  [0.3, 0.85, 0.3, 1],
  [0, 0.9, 0.85, 1],
  [0.2, 0.5, 1, 1],
  [1, 0.2, 0.85, 1],
];

function toCss([r, g, b, a]: RGBA): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

function sameRGB(a: RGBA, b: RGBA): boolean {
  return (
    Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02 && Math.abs(a[2] - b[2]) < 0.02
  );
}

interface ShapeToolbarProps {
  activeTool: ShapeKind | null;
  onSelectTool: (tool: ShapeKind | null) => void;
  style: ShapeStyle;
  onStyleChange: (patch: Partial<ShapeStyle>) => void;
  /** Number of shapes currently drawn (for the count chip / clear affordance). */
  shapeCount: number;
  onClearShapes: () => void;
}

export const ShapeToolbar: React.FC<ShapeToolbarProps> = ({
  activeTool,
  onSelectTool,
  style,
  onStyleChange,
  shapeCount,
  onClearShapes,
}) => {
  const hint = activeTool ? TOOLS.find((t) => t.kind === activeTool)?.hint : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          size="small"
          value={activeTool}
          exclusive
          onChange={(_e, value: ShapeKind | null) => onSelectTool(value)}
          aria-label="Shape drawing tool"
        >
          {TOOLS.map((tool) => (
            <ToggleButton key={tool.kind} value={tool.kind} aria-label={tool.label}>
              <Tooltip title={tool.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {tool.icon}
                  <Box component="span" sx={{ fontSize: '0.75rem' }}>
                    {tool.label}
                  </Box>
                </Box>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {shapeCount > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            component="button"
            onClick={onClearShapes}
            sx={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              p: 0,
            }}
          >
            Clear {shapeCount} shape{shapeCount === 1 ? '' : 's'}
          </Typography>
        )}
      </Box>

      {/* Style controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {SWATCHES.map((swatch, i) => {
            const selected = sameRGB(style.colour, swatch);
            return (
              <Box
                key={i}
                role="button"
                aria-label={`Colour ${i + 1}`}
                onClick={() => onStyleChange({ colour: [...swatch] as RGBA })}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: toCss(swatch),
                  cursor: 'pointer',
                  border: selected ? '2px solid' : '1px solid rgba(0,0,0,0.4)',
                  borderColor: selected ? 'primary.main' : 'rgba(0,0,0,0.4)',
                  boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.5)' : 'none',
                }}
              />
            );
          })}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
          <Typography variant="caption" color="text.secondary">
            Width
          </Typography>
          <Slider
            size="small"
            min={1}
            max={10}
            step={1}
            value={style.width}
            onChange={(_e, value) =>
              onStyleChange({ width: Array.isArray(value) ? value[0] : value })
            }
            aria-label="Line width"
            sx={{ flexGrow: 1, minWidth: 80 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={style.dashed}
              onChange={(e) => onStyleChange({ dashed: e.target.checked })}
            />
          }
          label={<Typography variant="caption">Dashed</Typography>}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={style.fill}
              onChange={(e) => onStyleChange({ fill: e.target.checked })}
            />
          }
          label={<Typography variant="caption">Fill</Typography>}
        />
      </Box>

      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
};
