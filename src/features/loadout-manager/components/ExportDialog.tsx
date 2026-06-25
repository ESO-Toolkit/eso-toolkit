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
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '@/features/auth/AuthContext';
import { useLogger } from '@/hooks/useLogger';

import { TRIALS } from '../data/trialConfigs';
import { selectCurrentTrial, selectCurrentSetups, selectLoadoutState } from '../store/selectors';
import { downloadTextFile } from '../utils/downloadFile';
import { validateGearConfig } from '../utils/itemSlotValidator';
import { generateAlphaGearLua, generateWizardWardrobeLua } from '../utils/loadoutLuaFiles';

import { WizardWardrobeTransferPanel } from './WizardWardrobeTransferPanel';

type ExportFormat = 'json' | 'wizard' | 'wizard-file' | 'alphagear';
/** Formats that produce an addon SavedVariables (.lua) file keyed to an account. */
const LUA_FILE_FORMATS: ExportFormat[] = ['wizard-file', 'alphagear'];

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Opens the install guide (where blank starters + step-by-step live). */
  onOpenInstallGuide?: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onOpenInstallGuide,
}) => {
  const logger = useLogger('ExportDialog');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const glassTextField = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      backdropFilter: 'blur(12px)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      },
      '&.Mui-focused': {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderColor: theme.palette.primary.main,
      },
    },
  };
  const currentTrialId = useSelector(selectCurrentTrial);
  const setups = useSelector(selectCurrentSetups);
  const loadoutState = useSelector(selectLoadoutState);
  const { currentUser } = useAuth();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [accountName, setAccountName] = useState('');
  const [copied, setCopied] = useState(false);
  // The account id this field was last prefilled for, so a shared-browser sign-in
  // as a DIFFERENT user resets the prefill instead of leaking the prior user's
  // name into the new user's export, while a same-user update keeps a manual edit.
  const prefillUserId = React.useRef<string | number | undefined>(undefined);

  // Prefill the account name from the signed-in ESO Logs name (often, but not
  // always, the in-game @UserID — the user can correct it).
  React.useEffect(() => {
    if (!currentUser) return; // signed out — leave the field as the user left it
    const uid = currentUser.id;
    if (prefillUserId.current !== uid) {
      // First prefill, or a different account on this shared browser: drop any
      // carried-over value and seed this account's name. Record the identity now so
      // a late name update — or the user's own manual edit — isn't reset again.
      prefillUserId.current = uid;
      setAccountName(currentUser.name ?? '');
    } else if (currentUser.name) {
      // Same account, name (re)available: fill an empty field but keep a manual edit.
      setAccountName((prev) => prev || currentUser.name);
    }
  }, [currentUser]);

  const currentTrial = TRIALS.find((t) => t.id === currentTrialId);
  const currentCharacterName =
    loadoutState.characters.find((ch) => ch.id === loadoutState.currentCharacter)?.name ??
    loadoutState.currentCharacter ??
    undefined;
  const isLuaFileFormat = LUA_FILE_FORMATS.includes(exportFormat);
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

  // The "wizard" option is a paste-in import code per setup (handled by
  // WizardWardrobeTransferPanel); "wizard-file" and "alphagear" produce a full
  // SavedVariables (.lua) file from the whole library, keyed to the account.
  const getExportData = (): string => {
    if (exportFormat === 'wizard-file')
      return generateWizardWardrobeLua(loadoutState, accountName, currentCharacterName).contents;
    if (exportFormat === 'alphagear')
      return generateAlphaGearLua(loadoutState, accountName).contents;
    return generateJSON();
  };

  const getExportFilename = (): string => {
    if (exportFormat === 'wizard-file')
      return generateWizardWardrobeLua(loadoutState, accountName, currentCharacterName).filename;
    if (exportFormat === 'alphagear')
      return generateAlphaGearLua(loadoutState, accountName).filename;
    return `loadout-${currentTrialId}-${Date.now()}.json`;
  };

  const handleExport = (): void => {
    if (exportBlocked) {
      return;
    }
    const data = getExportData();
    const filename = getExportFilename();
    const mimeType = isLuaFileFormat ? 'text/plain' : 'application/json';
    downloadTextFile(filename, data, mimeType);
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            backgroundColor: isDarkMode ? 'rgba(15,15,25,0.9)' : 'rgba(255,255,255,0.94)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 700,
        }}
      >
        Export Loadout
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Trial Info */}
          <Alert
            severity="info"
            sx={{
              borderRadius: '12px',
              backgroundColor: isDarkMode ? 'rgba(13, 110, 253, 0.1)' : 'rgba(13, 110, 253, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(13, 110, 253, 0.3)' : 'rgba(13, 110, 253, 0.2)'}`,
            }}
          >
            {isLuaFileFormat ? (
              <>
                Exporting <strong>your whole library</strong> (all trials) as a SavedVariables file.
              </>
            ) : (
              <>
                Exporting <strong>{setups.length} setups</strong> from{' '}
                <strong>{currentTrial?.name || 'Unknown Trial'}</strong>
              </>
            )}
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
          <FormControl fullWidth sx={glassTextField}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              size="small"
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
                  <Typography variant="body1">Wizard&apos;s Wardrobe — paste code</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paste-in import code per setup — no file needed
                  </Typography>
                </Stack>
              </MenuItem>
              <MenuItem value="wizard-file">
                <Stack>
                  <Typography variant="body1">Wizard&apos;s Wardrobe — .lua file</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Full SavedVariables file (all trials) to drop into your ESO folder
                  </Typography>
                </Stack>
              </MenuItem>
              <MenuItem value="alphagear">
                <Stack>
                  <Typography variant="body1">AlphaGear 2 — .lua file</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lua saved variables for the AlphaGear 2 addon
                  </Typography>
                </Stack>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Account name + install help for the .lua file formats. */}
          {isLuaFileFormat && (
            <Stack spacing={1}>
              <TextField
                label="Your ESO account name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="@YourAccount"
                size="small"
                fullWidth
                sx={glassTextField}
                helperText="Your in-game @UserID — the file is keyed to this so the addon loads it."
              />
              {onOpenInstallGuide && (
                <Typography variant="caption" color="text.secondary">
                  Don’t have the addon file yet, or need install steps?{' '}
                  <Box
                    component="button"
                    type="button"
                    onClick={onOpenInstallGuide}
                    sx={{
                      background: 'none',
                      border: 'none',
                      p: 0,
                      color: 'primary.main',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      font: 'inherit',
                    }}
                  >
                    Open the install guide
                  </Box>
                  .
                </Typography>
              )}
            </Stack>
          )}

          {exportFormat === 'wizard' ? (
            <WizardWardrobeTransferPanel setups={setups} disabled={exportBlocked} />
          ) : (
            <>
              {/* Preview */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Preview:
                </Typography>
                <TextField
                  multiline
                  fullWidth
                  rows={12}
                  value={getPreview()}
                  slotProps={{
                    input: {
                      readOnly: true,
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        bgcolor: 'background.paper',
                      },
                    },
                  }}
                />
              </Paper>

              {copied && (
                <Alert severity="success" onClose={() => setCopied(false)}>
                  Copied to clipboard!
                </Alert>
              )}

              {/* Help text for the Lua SavedVariables file formats */}
              {isLuaFileFormat && (
                <Alert severity="warning">
                  <Typography variant="caption" component="div">
                    <strong>Back up first.</strong> Quit ESO, then save this file to:
                    <br />
                    <code style={{ fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                      {getESOSavedVarsPath()}
                      {getExportFilename()}
                    </code>
                    Replacing an existing file overwrites the setups already in it — copy the old
                    one somewhere safe first. Log in and use <code>/reloadui</code> to load.
                    {exportFormat === 'wizard-file' && (
                      <>
                        {' '}
                        These export into Wizard’s Wardrobe’s <strong>Account-Wide</strong> storage
                        — switch WW to “Account-Wide” in-game to see them.
                      </>
                    )}
                  </Typography>
                </Alert>
              )}
            </>
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
        <Button onClick={onClose}>{exportFormat === 'wizard' ? 'Close' : 'Cancel'}</Button>
        {/* Wizard's Wardrobe uses per-setup copy buttons in the panel above. */}
        {exportFormat !== 'wizard' && (
          <>
            <Button
              startIcon={<ContentCopy />}
              onClick={handleCopy}
              variant="outlined"
              disabled={exportBlocked}
              sx={{
                borderRadius: '20px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                },
              }}
            >
              Copy to Clipboard
            </Button>
            <Button
              startIcon={<Download />}
              onClick={handleExport}
              variant="contained"
              disabled={exportBlocked}
              sx={{
                borderRadius: '20px',
              }}
            >
              Download File
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
