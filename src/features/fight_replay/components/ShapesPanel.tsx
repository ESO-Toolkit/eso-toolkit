/**
 * Management list for the drawn shapes: per-shape edit/delete plus clear-all. Rendered below the
 * markers panel while shapes exist (or a draw tool is armed). Undo/redo live in the markers panel
 * (shared history), so this panel stays focused on the shape list.
 */
import CropSquareIcon from '@mui/icons-material/CropSquare';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import PolylineIcon from '@mui/icons-material/Polyline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StraightenIcon from '@mui/icons-material/Straighten';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { ReplayShape, ShapeKind } from '../types/mapMarkers';
import { pathLengthMeters } from '../utils/shapeGeometry';

const KIND_ICON: Record<ShapeKind, React.ReactNode> = {
  polyline: <PolylineIcon fontSize="small" />,
  polygon: <PentagonOutlinedIcon fontSize="small" />,
  circle: <RadioButtonUncheckedIcon fontSize="small" />,
  rect: <CropSquareIcon fontSize="small" />,
  ruler: <StraightenIcon fontSize="small" />,
};

const KIND_LABEL: Record<ShapeKind, string> = {
  polyline: 'Line',
  polygon: 'Zone',
  circle: 'Circle',
  rect: 'Rectangle',
  ruler: 'Ruler',
};

function toCss(colour: ReplayShape['style']['colour']): string {
  const [r, g, b, a] = colour;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

function describeShape(shape: ReplayShape): string {
  if (shape.label && shape.label.trim().length > 0) {
    return shape.label.trim();
  }
  if (shape.kind === 'circle' && shape.radius) {
    return `${KIND_LABEL.circle} · ${shape.radius.toFixed(1)}m`;
  }
  if (shape.kind === 'ruler') {
    return `${KIND_LABEL.ruler} · ${pathLengthMeters(shape.vertices).toFixed(1)}m`;
  }
  return KIND_LABEL[shape.kind];
}

interface ShapesPanelProps {
  shapes: ReplayShape[];
  onEditShape: (shapeId: string) => void;
  onRemoveShape: (shapeId: string) => void;
  onClearShapes: () => void;
}

export const ShapesPanel: React.FC<ShapesPanelProps> = ({
  shapes,
  onEditShape,
  onRemoveShape,
  onClearShapes,
}) => {
  if (shapes.length === 0) {
    return null;
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Shapes ({shapes.length})</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" color="secondary" onClick={onClearShapes} type="button">
            Clear all
          </Button>
        </Box>

        <List dense disablePadding sx={{ maxHeight: 260, overflowY: 'auto' }}>
          {shapes.map((shape) => (
            <ListItem
              key={shape.id}
              disableGutters
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <Tooltip title="Edit shape">
                    <IconButton
                      size="small"
                      onClick={() => onEditShape(shape.id)}
                      aria-label={`Edit ${describeShape(shape)}`}
                      sx={{ p: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete shape">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveShape(shape.id)}
                      aria-label={`Delete ${describeShape(shape)}`}
                      sx={{ p: 1 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
              sx={{ pr: 10 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    color: toCss(shape.style.colour),
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {KIND_ICON[shape.kind]}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {describeShape(shape)}
                    {shape.time && (
                      <Tooltip title="Shown only during a time window">
                        <ScheduleIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                      </Tooltip>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {KIND_LABEL[shape.kind]}
                    {shape.style.dashed ? ' · dashed' : ''}
                    {shape.style.fill && shape.kind !== 'polyline' && shape.kind !== 'ruler'
                      ? ' · filled'
                      : ''}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
};
