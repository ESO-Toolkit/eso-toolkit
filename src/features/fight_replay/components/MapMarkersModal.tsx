/**
 * Modal dialog for importing Map Markers (M0R and Elms formats)
 */
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useMarkerStats } from '../../../hooks/useMarkerStats';
import { isElmsMarkersFormat } from '../../../utils/elmsMarkersDecoder';
import { MapMarkersState } from '../types/mapMarkers';

import { MarkerSpritePreview } from './MarkerSpritePreview';

/** Verified-decodable Elms sample (zone 636 Hel Ra Citadel, lands inside the map bounding box) */
const ELMS_SAMPLE = '/636//80000,15000,70000,21//636//90000,15000,80000,18/';

interface MapMarkersModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current fight data */
  fight: FightFragment;
  /** Current markers state */
  markersState: MapMarkersState | null;
  /** Callback when markers are loaded */
  onLoadMarkers: (markersString: string) => void;
  /** Callback when markers are cleared */
  onClearMarkers: () => void;
  /** Optional: copy currently-loaded markers as an Elms string */
  onExportElms?: () => void;
  /** Optional: copy currently-loaded markers as an M0R string */
  onExportMor?: () => void;
}

/**
 * Modal for importing Map Markers (M0R and Elms formats) into the fight replay
 */
export const MapMarkersModal: React.FC<MapMarkersModalProps> = ({
  open,
  onClose,
  fight,
  markersState,
  onLoadMarkers,
  onClearMarkers,
  onExportElms,
  onExportMor,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [mapMarkersInput, setMapMarkersInput] = useState('');

  const trimmedInput = mapMarkersInput.trim();

  // Live validation of the raw input string — drives the Load gate and live feedback.
  const inputStats = useMarkerStats(trimmedInput, fight);
  // Stats for the already-committed markers — drives the "Currently Loaded" section only.
  const committedStats = useMarkerStats(markersState ?? undefined, fight);

  const hasInput = trimmedInput.length > 0;
  const inputFailed = hasInput && !inputStats.success;
  // Load is only safe to fire when the live preview validates AND has matching markers,
  // because the parent closes the modal on load.
  const canLoad = inputStats.success && inputStats.filtered > 0;

  const detectedFormat = useMemo(
    () => (hasInput ? (isElmsMarkersFormat(trimmedInput) ? 'Elms' : 'M0R') : null),
    [hasInput, trimmedInput],
  );

  // Distinct Elms icon keys present in the committed markers (for the loaded preview).
  const committedIconKeys = useMemo(() => {
    if (!markersState) {
      return [] as number[];
    }
    const keys = new Set<number>();
    for (const marker of markersState.markers) {
      if (typeof marker.elmsIconKey === 'number') {
        keys.add(marker.elmsIconKey);
      }
    }
    return Array.from(keys).slice(0, 24);
  }, [markersState]);

  const handleLoadMarkers = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (!canLoad) {
        return;
      }

      onLoadMarkers(trimmedInput);
      setMapMarkersInput('');
    },
    [canLoad, trimmedInput, onLoadMarkers],
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

  const hasCommittedMarkers = Boolean(markersState && markersState.markers.length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="map-markers-dialog-title"
      onKeyDown={handleKeyDown}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      slotProps={{
        paper: {
          component: 'div', // Ensure Dialog doesn't create a form
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
      }}
    >
      <DialogTitle id="map-markers-dialog-title">Import Map Markers (M0R or Elms)</DialogTitle>

      <DialogContent>
        <form
          onSubmit={handleFormSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}
        >
          {/* Instructions */}
          <Typography variant="body2" color="text.secondary">
            Paste a markers string exported from <strong>M0RMarkers</strong> or{' '}
            <strong>EnchantedMapsLite (Elms)</strong> below. Markers are auto-detected, filtered to
            the current map, and rendered in the 3D arena.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            In <strong>M0RMarkers</strong>, open the markers menu and use Export/Share to copy the
            string. In <strong>EnchantedMapsLite</strong>, use its export to copy the
            <code> /zone//x,y,z,iconKey/ </code> string. Then paste it here.
          </Typography>

          {/* Format reference + copyable sample */}
          <Accordion
            disableGutters
            elevation={0}
            sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Format reference &amp; sample</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Elms grammar:{' '}
                  <Box component="code" sx={{ fontFamily: 'monospace' }}>
                    /zone//x,y,z,iconKey/
                  </Box>{' '}
                  (one segment per marker). Copyable example:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    p: 1,
                    mt: 0.5,
                    mb: 0,
                    bgcolor: 'background.default',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {ELMS_SAMPLE}
                </Box>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  type="button"
                  sx={{ mt: 0.5 }}
                  onClick={() => setMapMarkersInput(ELMS_SAMPLE)}
                >
                  Use sample
                </Button>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  M0R grammar:{' '}
                  <Box component="code" sx={{ fontFamily: 'monospace' }}>
                    &lt;zone]timestamp]minX:minY:minZ]...]positions&gt;
                  </Box>
                  . Export the full string directly from the M0RMarkers addon (it is too long to
                  hand-write).
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Input Field */}
          <TextField
            label="Markers String"
            placeholder="M0R: <1196]...]...> or Elms: /1196//x,y,z,iconKey/"
            multiline
            rows={6}
            fullWidth
            value={mapMarkersInput}
            error={inputFailed}
            helperText={inputFailed ? inputStats.error : undefined}
            onChange={(e) => setMapMarkersInput(e.target.value)}
            onKeyDown={(e) => {
              // Prevent modal close on Escape when typing
              if (e.key === 'Escape') {
                e.stopPropagation();
              }
            }}
          />

          {/* Live status line for the pasted input */}
          {hasInput && inputStats.success && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                Detected <strong>{detectedFormat}</strong> format ·{' '}
                {inputStats.totalDecoded} decoded · {inputStats.filtered} match this map
                {inputStats.mapName ? ` (${inputStats.mapName})` : ''}
              </Typography>
            </Box>
          )}

          {/* Live validation: zone mismatch / decode failure */}
          {inputFailed && <Alert severity="error">{inputStats.error}</Alert>}

          {/* Live validation: decoded but nothing matches this map */}
          {hasInput && inputStats.success && inputStats.filtered === 0 && (
            <Alert severity="warning">
              No markers in this string match the current map
              {inputStats.mapName ? ` (${inputStats.mapName})` : ''}.
              {inputStats.totalDecoded > 0 && ' All markers were filtered out by bounding box.'}
            </Alert>
          )}

          {/* Live validation: ready-to-load summary */}
          {canLoad && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={`${inputStats.filtered} / ${inputStats.totalDecoded} markers`}
                color="success"
                size="small"
                variant="outlined"
              />
              {inputStats.is3D && (
                <Chip label="3D Filtering" color="info" size="small" variant="outlined" />
              )}
              {inputStats.removed > 0 && (
                <Chip
                  label={`${inputStats.removed} filtered out`}
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          )}

          {/* Currently Loaded markers (already committed) */}
          {hasCommittedMarkers && committedStats.success && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Currently Loaded:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={`${committedStats.filtered} / ${committedStats.totalDecoded} markers`}
                  color="success"
                  size="small"
                  variant="outlined"
                />
                {committedStats.is3D && (
                  <Chip label="3D Filtering" color="info" size="small" variant="outlined" />
                )}
                {committedStats.removed > 0 && (
                  <Chip
                    label={`${committedStats.removed} filtered out`}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              {committedIconKeys.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                  {committedIconKeys.map((iconKey) => (
                    <MarkerSpritePreview key={iconKey} iconKey={iconKey} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          type="button"
          sx={{ '&:hover': { color: 'error.main' } }}
        >
          Close
        </Button>
        {hasCommittedMarkers && onExportElms && (
          <Button
            onClick={onExportElms}
            color="secondary"
            variant="outlined"
            type="button"
            startIcon={<ContentCopyIcon />}
          >
            Copy Elms
          </Button>
        )}
        {hasCommittedMarkers && onExportMor && (
          <Button
            onClick={onExportMor}
            color="secondary"
            variant="outlined"
            type="button"
            startIcon={<ContentCopyIcon />}
          >
            Copy M0R
          </Button>
        )}
        {hasCommittedMarkers && (
          <Button onClick={handleClearMarkers} color="secondary" variant="outlined" type="button">
            Clear Markers
          </Button>
        )}
        <Button
          onClick={handleLoadMarkers}
          variant="contained"
          color="primary"
          disabled={!canLoad}
          type="button"
        >
          Load Markers
        </Button>
      </DialogActions>
    </Dialog>
  );
};
