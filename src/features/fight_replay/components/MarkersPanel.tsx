/**
 * Compact management panel listing the loaded map markers with per-marker edit/delete,
 * plus undo/redo and clear-all. Rendered on the fight replay page while markers exist
 * or marker edit mode is active.
 */
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
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

import { MorMarker } from '@/types/mapMarkers';

import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';

import { MarkerSpritePreview } from './MarkerSpritePreview';

function toCssColour(colour: MorMarker['colour']): string {
  const [r, g, b, a] = colour;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Math.max(
    0,
    Math.min(1, a),
  ).toFixed(3)})`;
}

/** Sprite preview for template markers; a colour chip with the label for fully custom ones. */
const MarkerGlyph: React.FC<{ marker: ReplayMarker }> = ({ marker }) => {
  if (typeof marker.elmsIconKey === 'number') {
    return <MarkerSpritePreview iconKey={marker.elmsIconKey} label={marker.text} />;
  }

  return (
    <span
      role="img"
      aria-label={marker.text ? `Marker ${marker.text}` : 'Custom marker'}
      style={{
        width: 32,
        height: 32,
        minWidth: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: toCssColour(marker.colour),
        border: '1px solid rgba(12, 12, 18, 0.6)',
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: 700,
        fontSize: '0.7rem',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {marker.text?.slice(0, 3) ?? null}
    </span>
  );
};

function describeMarker(marker: ReplayMarker): string {
  if (marker.text && marker.text.trim().length > 0) {
    return marker.text.trim();
  }
  return marker.source === 'imported' ? 'Imported marker' : 'Marker';
}

function describePosition(marker: ReplayMarker): string {
  // World coordinates are centimeters; meters are the human-scale unit used everywhere else.
  return `${Math.round(marker.x / 100)}m, ${Math.round(marker.z / 100)}m · ${marker.size.toFixed(1)}m`;
}

interface MarkersPanelProps {
  markersState: MapMarkersState | null;
  /** Auto-expand while edit mode is on. */
  editMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onEditMarker: (markerId: string) => void;
  onRemoveMarker: (markerId: string) => void;
  onClearMarkers: () => void;
}

export const MarkersPanel: React.FC<MarkersPanelProps> = ({
  markersState,
  editMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onEditMarker,
  onRemoveMarker,
  onClearMarkers,
}) => {
  const markers = markersState?.markers ?? [];

  if (markers.length === 0 && !canUndo && !canRedo) {
    return null;
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={editMode}
      sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Markers ({markers.length})</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton size="small" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <span>
              <IconButton size="small" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          {markers.length > 0 && (
            <Button size="small" color="secondary" onClick={onClearMarkers} type="button">
              Clear all
            </Button>
          )}
        </Box>

        <List dense disablePadding sx={{ maxHeight: 260, overflowY: 'auto' }}>
          {markers.map((marker) => (
            <ListItem
              key={marker.id}
              disableGutters
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <Tooltip title="Edit marker">
                    <IconButton
                      size="small"
                      onClick={() => onEditMarker(marker.id)}
                      aria-label={`Edit ${describeMarker(marker)}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete marker">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveMarker(marker.id)}
                      aria-label={`Delete ${describeMarker(marker)}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
              sx={{ pr: 9 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <MarkerGlyph marker={marker} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {describeMarker(marker)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {describePosition(marker)}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>

        {markers.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No markers yet. Right-click the map in edit mode to place one.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
