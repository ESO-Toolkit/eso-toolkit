/**
 * Export Dialog Component
 * Allows exporting loadout data to JSON or Wizard's Wardrobe format
 */

import { Download, ContentCopy } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Paper,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { TRIALS } from '../data/trialConfigs';
import { selectCurrentTrial, selectCurrentSetups } from '../store/selectors';
import { WizardWardrobeExport } from '../types/loadout.types';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const currentTrialId = useSelector(selectCurrentTrial);
  const setups = useSelector(selectCurrentSetups);
  const [exportFormat, setExportFormat] = useState<'json' | 'wizard'>('json');
  const [copied, setCopied] = useState(false);

  const currentTrial = TRIALS.find((t) => t.id === currentTrialId);

  const generateJSON = (): string => {
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      trial: {
        id: currentTrialId,
        name: currentTrial?.name || 'Unknown',
      },
      setups: setups,
    };
    return JSON.stringify(exportData, null, 2);
  };

  const generateWizardWardrobe = (): string => {
    // Convert to Wizard's Wardrobe format
    const wizardData: WizardWardrobeExport = {
      version: 1,
      selectedZoneTag: currentTrialId || '',
      setups: {
        [currentTrialId || 'default']: setups.map((setup, index) => ({
          [index + 1]: setup,
        })),
      },
      pages: {
        [currentTrialId || 'default']: [{ selected: 1 }],
      },
    };
    return JSON.stringify(wizardData, null, 2);
  };

  const handleExport = () => {
    const data = exportFormat === 'json' ? generateJSON() : generateWizardWardrobe();
    const filename =
      exportFormat === 'json'
        ? `loadout-${currentTrialId}-${Date.now()}.json`
        : `wizard-wardrobe-${currentTrialId}-${Date.now()}.json`;

    // Create blob and download
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const data = exportFormat === 'json' ? generateJSON() : generateWizardWardrobe();
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getPreview = (): string => {
    const data = exportFormat === 'json' ? generateJSON() : generateWizardWardrobe();
    // Show first 500 characters as preview
    return data.length > 500 ? data.substring(0, 500) + '\n...' : data;
  };

  // Get the ESO SavedVariables path using Documents folder from environment
  const getESOSavedVarsPath = (): string => {
    // This is a hint for the user, not actually used by the browser
    if (typeof window !== 'undefined' && (window as any).electron) {
      // If running in Electron, we could potentially use this
      return 'Documents\\Elder Scrolls Online\\live\\SavedVariables\\';
    }
    return 'Documents\\Elder Scrolls Online\\live\\SavedVariables\\';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Export Loadout</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Trial Info */}
          <Alert severity="info">
            Exporting <strong>{setups.length} setups</strong> from{' '}
            <strong>{currentTrial?.name || 'Unknown Trial'}</strong>
          </Alert>

          {/* Format Selector */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'wizard')}
            >
              <MenuItem value="json">
                <Stack>
                  <Typography variant="body1">JSON (Loadout Manager)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Native format with all metadata
                  </Typography>
                </Stack>
              </MenuItem>
              <MenuItem value="wizard">
                <Stack>
                  <Typography variant="body1">Wizard's Wardrobe (ESO Addon)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compatible with in-game addon
                  </Typography>
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Preview */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Preview:
            </Typography>
            <TextField
              multiline
              fullWidth
              rows={12}
              value={getPreview()}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  bgcolor: 'background.paper',
                },
              }}
            />
          </Paper>

          {copied && (
            <Alert severity="success" onClose={() => setCopied(false)}>
              Copied to clipboard!
            </Alert>
          )}

          {/* Help text for Wizard's Wardrobe format */}
          {exportFormat === 'wizard' && (
            <Alert severity="info">
              <Typography variant="caption" component="div">
                <strong>To use in-game:</strong> Save this file to your ESO folder at:
                <br />
                <code style={{ fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                  {getESOSavedVarsPath()}WizardWardrobe.lua
                </code>
                <br />
                Then use <code>/reloadui</code> in-game to load your changes.
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button startIcon={<ContentCopy />} onClick={handleCopy} variant="outlined">
          Copy to Clipboard
        </Button>
        <Button startIcon={<Download />} onClick={handleExport} variant="contained">
          Download File
        </Button>
      </DialogActions>
    </Dialog>
  );
};
