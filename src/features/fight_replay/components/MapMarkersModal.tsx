/**
 * Modal dialog for importing Map Markers (M0R and Elms formats)
 */
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useMarkerStats } from '../../../hooks/useMarkerStats';

interface MapMarkersModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current fight data */
  fight: FightFragment;
  /** Current map markers string (M0R or Elms format) */
  mapMarkersString: string | null;
  /** Callback when markers are loaded */
  onLoadMarkers: (markersString: string) => void;
  /** Callback when markers are cleared */
  onClearMarkers: () => void;
}

/**
 * Modal for importing Map Markers (M0R and Elms formats) into the fight replay
 */
export const MapMarkersModal: React.FC<MapMarkersModalProps> = ({
  open,
  onClose,
  fight,
  mapMarkersString,
  onLoadMarkers,
  onClearMarkers,
}) => {
  const [mapMarkersInput, setMapMarkersInput] = useState('');

  // Calculate marker statistics
  const markerStats = useMarkerStats(mapMarkersString || undefined, fight);

  const handleLoadMarkers = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const trimmedInput = mapMarkersInput.trim();
      if (!trimmedInput) {
        return;
      }

      onLoadMarkers(trimmedInput);
      setMapMarkersInput(''); // Clear input after successful load
    },
    [mapMarkersInput, onLoadMarkers],
  );

  const handleClearMarkers = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      onClearMarkers();
      setMapMarkersInput('');
    },
    [onClearMarkers],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }
    },
    [handleClose],
  );

  const handleFormSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      PaperProps={{
        component: 'div', // Ensure Dialog doesn't create a form
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }}
    >
      <DialogTitle>Import M0R Markers</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          onSubmit={handleFormSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          {/* Instructions */}
          <Typography variant="body2" color="text.secondary">
            Paste your M0R Markers or Elms Markers string below. The markers will be automatically
            filtered to match the current map and displayed in the 3D arena.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Supported formats: M0R Markers (&lt;zone]...) or Elms Markers (/zone//x,y,z,iconKey/)
          </Typography>

          {/* Input Field */}
          <TextField
            label="Markers String"
            placeholder="M0R: <1196]...]...> or Elms: /1196//x,y,z,iconKey/"
            multiline
            rows={6}
            fullWidth
            value={mapMarkersInput}
            onChange={(e) => setMapMarkersInput(e.target.value)}
            onKeyDown={(e) => {
              // Prevent modal close on Escape when typing
              if (e.key === 'Escape') {
                e.stopPropagation();
              }
            }}
          />

          {/* Current Markers Status */}
          {mapMarkersString && markerStats.success && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Currently Loaded:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={`${markerStats.filtered} / ${markerStats.totalDecoded} markers`}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 'medium' }}
                />
                {markerStats.is3D && (
                  <Chip label="3D Filtering" color="info" size="small" variant="outlined" />
                )}
                {markerStats.removed > 0 && (
                  <Chip
                    label={`${markerStats.removed} filtered out`}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Error State */}
          {mapMarkersString && !markerStats.success && (
            <Alert severity="error">{markerStats.error}</Alert>
          )}

          {/* No Matches Warning */}
          {mapMarkersString && markerStats.success && markerStats.filtered === 0 && (
            <Alert severity="warning">
              No markers match the current map ({markerStats.mapName}).
              {markerStats.totalDecoded > 0 && ' All markers were filtered out by bounding box.'}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" type="button">
          Close
        </Button>
        {mapMarkersString && (
          <Button onClick={handleClearMarkers} color="secondary" variant="outlined" type="button">
            Clear Markers
          </Button>
        )}
        <Button
          onClick={handleLoadMarkers}
          variant="contained"
          color="primary"
          disabled={!mapMarkersInput.trim()}
          type="button"
        >
          Load Markers
        </Button>
      </DialogActions>
    </Dialog>
  );
};
