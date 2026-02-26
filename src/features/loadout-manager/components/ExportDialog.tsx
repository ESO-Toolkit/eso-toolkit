/**
 * Export Dialog Component
 * Allows exporting loadout data to JSON or Wizard's Wardrobe format
 */

import { Download, ContentCopy } from '@mui/icons-material';
import {
  Box,
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

import { useLogger } from '@/hooks/useLogger';

import { TRIALS } from '../data/trialConfigs';
import { selectCurrentTrial, selectCurrentSetups, selectLoadoutState } from '../store/selectors';
import { WizardWardrobeExport } from '../types/loadout.types';
import { convertLoadoutStateToAlphaGear, serializeAlphaGearToLua } from '../utils/alphaGearConverter';
import { validateGearConfig } from '../utils/itemSlotValidator';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const logger = useLogger('ExportDialog');
  const currentTrialId = useSelector(selectCurrentTrial);
  const setups = useSelector(selectCurrentSetups);
  const loadoutState = useSelector(selectLoadoutState);
  const [exportFormat, setExportFormat] = useState<'json' | 'wizard' | 'alphagear'>('json');
  const [copied, setCopied] = useState(false);

  const currentTrial = TRIALS.find((t) => t.id === currentTrialId);
  const validationReports = React.useMemo(
    () =>
      setups.map((setup, index) => ({
        index,
        name: setup.name || `Setup ${index + 1}`,
        validation: validateGearConfig(setup.gear ?? {}),
      })),
    [setups],
  );
  const blockingErrors = React.useMemo(
    () =>
      validationReports.flatMap((report) =>
        report.validation.errors.map((error) => `${report.name}: ${error}`),
      ),
    [validationReports],
  );
  const warningMessages = React.useMemo(
    () =>
      validationReports.flatMap((report) =>
        report.validation.warnings.map((warning) => `${report.name}: ${warning}`),
      ),
    [validationReports],
  );
  const exportBlocked = blockingErrors.length > 0;

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

  const generateAlphaGear = (): string => {
    const agData = convertLoadoutStateToAlphaGear(loadoutState);
    return serializeAlphaGearToLua(agData);
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

  const getExportData = (): string => {
    if (exportFormat === 'alphagear') return generateAlphaGear();
    if (exportFormat === 'wizard') return generateWizardWardrobe();
    return generateJSON();
  };

  const getExportFilename = (): string => {
    if (exportFormat === 'alphagear') return `AlphaGear.lua`;
    if (exportFormat === 'wizard') return `wizard-wardrobe-${currentTrialId}-${Date.now()}.json`;
    return `loadout-${currentTrialId}-${Date.now()}.json`;
  };

  const handleExport = (): void => {
    if (exportBlocked) {
      return;
    }
    const data = getExportData();
    const filename = getExportFilename();
    const mimeType = exportFormat === 'alphagear' ? 'text/plain' : 'application/json';

    // Create blob and download
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (): Promise<void> => {
    if (exportBlocked) {
      return;
    }
    const data = getExportData();
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to copy export payload', err);
    }
  };

  const getPreview = (): string => {
    const data = getExportData();
    // Show first 500 characters as preview
    return data.length > 500 ? data.substring(0, 500) + '\n...' : data;
  };

  // Get the ESO SavedVariables path using Documents folder from environment
  const getESOSavedVarsPath = (): string => {
    // This is a hint for the user, not actually used by the browser
    if (typeof window !== 'undefined') {
      const electronWindow = window as Window & { electron?: unknown };
      if (electronWindow.electron) {
        // If running in Electron, we could potentially use this
        return 'Documents\\Elder Scrolls Online\\live\\SavedVariables\\';
      }
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

          {blockingErrors.length > 0 && (
            <Alert severity="error">
              <Typography variant="subtitle2" gutterBottom>
                Fix these gear slot issues before exporting:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                {blockingErrors.map((error, index) => (
                  <Typography key={`blocking-${index}`} component="li" variant="caption">
                    {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {warningMessages.length > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Some items are missing slot metadata:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                {warningMessages.map((warning, index) => (
                  <Typography key={`warning-${index}`} component="li" variant="caption">
                    {warning}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {/* Format Selector */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'wizard' | 'alphagear')}
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
              <MenuItem value="alphagear">
                <Stack>
                  <Typography variant="body1">AlphaGear 2 (ESO Addon)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lua saved variables for AlphaGear 2 addon
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

          {/* Help text for Wizard's Wardrobe and AlphaGear formats */}
          {(exportFormat === 'wizard' || exportFormat === 'alphagear') && (
            <Alert severity="info">
              <Typography variant="caption" component="div">
                <strong>To use in-game:</strong> Save this file to your ESO folder at:
                <br />
                <code style={{ fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                  {getESOSavedVarsPath()}{exportFormat === 'alphagear' ? 'AlphaGear.lua' : 'WizardWardrobe.lua'}
                </code>
                <br />
                Then use <code>/reloadui</code> in-game to load your changes.
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          {exportBlocked && (
            <Typography variant="caption" color="error">
              Resolve the errors above to enable exporting.
            </Typography>
          )}
        </Box>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          startIcon={<ContentCopy />}
          onClick={handleCopy}
          variant="outlined"
          disabled={exportBlocked}
        >
          Copy to Clipboard
        </Button>
        <Button
          startIcon={<Download />}
          onClick={handleExport}
          variant="contained"
          disabled={exportBlocked}
        >
          Download File
        </Button>
      </DialogActions>
    </Dialog>
  );
};
