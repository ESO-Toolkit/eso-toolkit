/**
 * PrivacySettingsPage
 *
 * Focused consent management and data control hub (ESO-572).
 * Provides a quick, user-friendly view of:
 * - Current consent status for each optional category
 * - Controls to change cookie / tracking preferences
 * - A summary of what data is stored locally in this browser
 * - Data export (GDPR Article 20) and data deletion (GDPR Article 17)
 *
 * For the full legal privacy policy see /privacy.
 */

import {
  CheckCircle as CheckCircleIcon,
  CloudDownload as DownloadIcon,
  DeleteForever as DeleteIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  RemoveCircle as RemoveCircleIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Link,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  clearConsent,
  deleteAllUserData,
  exportUserData,
  getConsentPreferences,
  saveConsentPreferences,
} from '../utils/consentManager';

/** Human-readable labels and descriptions for each known localStorage key */
const STORAGE_KEY_META: Record<string, { label: string; description: string; category: string }> = {
  'persist:root': {
    label: 'App State (Redux)',
    description: 'UI preferences, saved builds, dashboard layout, loadout data',
    category: 'Essential',
  },
  access_token: {
    label: 'Access Token',
    description: 'ESO Logs OAuth access token (used for API authentication)',
    category: 'Essential',
  },
  refresh_token: {
    label: 'Refresh Token',
    description: 'ESO Logs OAuth refresh token (used to renew sessions)',
    category: 'Essential',
  },
  eso_code_verifier: {
    label: 'PKCE Code Verifier',
    description: 'Temporary value used during the OAuth login flow',
    category: 'Essential',
  },
  eso_intended_destination: {
    label: 'Post-Login Redirect',
    description: 'Remembers the page to return to after logging in',
    category: 'Essential',
  },
  'eso-log-aggregator-cookie-consent': {
    label: 'Consent Preferences',
    description: 'Your privacy choices (analytics, error tracking, version)',
    category: 'Essential',
  },
  'eso-logger-level': {
    label: 'Logger Level',
    description: 'Debug verbosity setting for the in-app logger',
    category: 'Essential',
  },
};

const ALL_STORAGE_KEYS = Object.keys(STORAGE_KEY_META);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStorageEntries(): Array<{
  key: string;
  label: string;
  description: string;
  category: string;
  present: boolean;
  size: number;
}> {
  return ALL_STORAGE_KEYS.map((key) => {
    const meta = STORAGE_KEY_META[key];
    let present = false;
    let size = 0;
    try {
      const value = localStorage.getItem(key);
      present = value !== null;
      size = value ? new Blob([value]).size : 0;
    } catch {
      // localStorage may be unavailable
    }
    return { key, ...meta, present, size };
  });
}

export const PrivacySettingsPage: React.FC = () => {
  const theme = useTheme();
  const accentColor = theme.palette.mode === 'dark' ? '#38bdf8' : '#2563eb';

  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);
  const [errorTrackingEnabled, setErrorTrackingEnabled] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteComplete, setDeleteComplete] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Refresh storage entries when the page is rendered or data is deleted
  const [storageEntries, setStorageEntries] = React.useState(getStorageEntries);

  React.useEffect(() => {
    const prefs = getConsentPreferences();
    setAnalyticsEnabled(prefs.analytics);
    setErrorTrackingEnabled(prefs.errorTracking);
  }, []);

  const handleSavePreferences = (): void => {
    saveConsentPreferences({
      analytics: analyticsEnabled,
      errorTracking: errorTrackingEnabled,
    });
    window.dispatchEvent(new Event('consent-changed'));
    setSaveSuccess(true);
    setStorageEntries(getStorageEntries());
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportData = (): void => {
    const data = exportUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eso-toolkit-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllData = (): void => {
    deleteAllUserData();
    clearConsent();
    setDeleteComplete(true);
    setShowDeleteDialog(false);
    setAnalyticsEnabled(false);
    setErrorTrackingEnabled(false);
    setStorageEntries(getStorageEntries());
    window.dispatchEvent(new Event('consent-changed'));
  };

  const paperSx = {
    p: { xs: 3, md: 4 },
    borderRadius: '14px',
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
        : theme.palette.background.paper,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 8px 30px rgba(0, 0, 0, 0.25)'
        : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
  };

  const consentRowSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 2,
    borderRadius: '12px',
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.paper, 0.3)
        : alpha(theme.palette.background.paper, 0.6),
    transition: 'all 0.15s ease-in-out',
  };

  const presentEntries = storageEntries.filter((e) => e.present);
  const totalSize = presentEntries.reduce((sum, e) => sum + e.size, 0);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        {/* ── Header ───────────────────────────────────────────── */}
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontFamily: 'Space Grotesk,Inter,system-ui',
            }}
          >
            <LockIcon sx={{ fontSize: 40 }} color="primary" />
            Privacy Settings
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Control your consent preferences and manage data stored by this app.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All data is stored locally in your browser — nothing is sent to our servers without your
            consent. Read the{' '}
            <Link
              component={RouterLink}
              to="/privacy"
              underline="hover"
              sx={{ color: accentColor }}
            >
              full Privacy Policy
            </Link>{' '}
            for complete details.
          </Typography>
        </Box>

        {/* ── Consent Status Summary ───────────────────────────── */}
        <Paper elevation={0} sx={paperSx}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: 'Space Grotesk,Inter,system-ui',
            }}
          >
            <ShieldIcon color="primary" /> Consent Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Current active consent for optional data processing categories. Essential storage is
            always enabled — it is required for the app to work.
          </Typography>

          <Stack spacing={1.5}>
            {/* Essential — always on */}
            <Box sx={consentRowSx}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Essential Storage
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  App preferences, authentication tokens, consent record
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                label="Always Active"
                size="small"
                color="success"
                variant="outlined"
              />
            </Box>

            {/* Analytics */}
            <Box sx={consentRowSx}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Analytics (Google Analytics 4)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Page views, feature usage, build metadata
                </Typography>
              </Box>
              {analyticsEnabled ? (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label="Enabled"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<RemoveCircleIcon sx={{ fontSize: 16 }} />}
                  label="Disabled"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Error Tracking */}
            <Box sx={consentRowSx}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Error Tracking (Rollbar)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Crash reports, performance metrics, bug reports
                </Typography>
              </Box>
              {errorTrackingEnabled ? (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label="Enabled"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<RemoveCircleIcon sx={{ fontSize: 16 }} />}
                  label="Disabled"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
          </Stack>
        </Paper>

        <Divider />

        {/* ── Change Preferences ───────────────────────────────── */}
        <Paper elevation={0} sx={paperSx}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: 'Space Grotesk,Inter,system-ui',
            }}
          >
            <ShieldIcon color="primary" /> Cookie &amp; Tracking Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which optional categories you consent to. Changes take effect immediately after
            saving.
          </Typography>

          <Stack spacing={2}>
            {/* Essential — readonly */}
            <Box sx={consentRowSx}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Essential
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  App preferences, authentication, consent record
                </Typography>
              </Box>
              <Chip label="Always Active" size="small" color="success" variant="outlined" />
            </Box>

            {/* Analytics toggle */}
            <Box sx={consentRowSx}>
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Analytics (Google Analytics 4)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Anonymised page views and feature usage events. No personal data.
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    inputProps={{ 'aria-label': 'Toggle analytics consent' }}
                  />
                }
                label=""
                sx={{ mr: 0 }}
              />
            </Box>

            {/* Error Tracking toggle */}
            <Box sx={consentRowSx}>
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Error Tracking (Rollbar)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Crash reports and performance metrics help us fix bugs faster.
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={errorTrackingEnabled}
                    onChange={(e) => setErrorTrackingEnabled(e.target.checked)}
                    inputProps={{ 'aria-label': 'Toggle error tracking consent' }}
                  />
                }
                label=""
                sx={{ mr: 0 }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleSavePreferences}
              sx={{
                alignSelf: 'flex-start',
                borderRadius: '8px',
                fontWeight: 600,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.mode === 'dark' ? '#00e1ff' : theme.palette.primary.dark})`,
                transition: 'all 0.15s ease-in-out',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
            >
              Save Preferences
            </Button>

            {saveSuccess && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Privacy preferences saved successfully.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Divider />

        {/* ── Local Storage Viewer ─────────────────────────────── */}
        <Paper elevation={0} sx={paperSx}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: 'Space Grotesk,Inter,system-ui',
            }}
          >
            <StorageIcon color="primary" /> Data Stored Locally
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Everything this app stores in your browser&apos;s{' '}
            <code style={{ fontFamily: 'monospace' }}>localStorage</code>. No data is stored on
            external servers.
          </Typography>
          {presentEntries.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {presentEntries.length} of {storageEntries.length} keys present · ~
              {formatBytes(totalSize)} total
            </Typography>
          )}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>
                    Description
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {storageEntries.map((entry) => (
                  <TableRow key={entry.key} sx={{ opacity: entry.present ? 1 : 0.45 }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entry.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: { xs: 'block', sm: 'none' } }}
                      >
                        {entry.description}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {entry.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {entry.present ? formatBytes(entry.size) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {entry.present ? (
                        <Chip
                          label="Stored"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ fontSize: '0.68rem' }}
                        />
                      ) : (
                        <Chip
                          label="Empty"
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.68rem', opacity: 0.6 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              background:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.info.main, 0.08)
                  : alpha(theme.palette.info.light, 0.15),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <InfoIcon sx={{ fontSize: 16, color: 'info.main', flexShrink: 0, mt: '1px' }} />
            <Typography variant="caption" color="text.secondary">
              This table only shows data stored by this application. Other sites and browser
              extensions store their own data separately.
            </Typography>
          </Box>
        </Paper>

        <Divider />

        {/* ── Data Management ──────────────────────────────────── */}
        <Paper elevation={0} sx={paperSx}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: 'Space Grotesk,Inter,system-ui',
            }}
          >
            Data Export &amp; Deletion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Exercise your GDPR data rights. Exporting gives you a full snapshot; deleting removes
            everything permanently.
          </Typography>

          {deleteComplete && (
            <Alert severity="info" sx={{ mb: 3 }}>
              All application data has been deleted. You will be prompted for consent preferences on
              your next visit. If you were logged in, you will need to log in again.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportData}
              sx={{
                borderRadius: '8px',
                transition: 'all 0.15s ease-in-out',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
            >
              Export My Data
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteComplete}
              sx={{
                borderRadius: '8px',
                transition: 'all 0.15s ease-in-out',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
            >
              Delete All Data
            </Button>
          </Stack>
        </Paper>
      </Stack>

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete All Application Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove all application data from your browser, including:
          </DialogContentText>
          <Box component="ul" sx={{ pl: 3, mt: 1 }}>
            <Typography component="li" variant="body2">
              Your UI preferences and theme settings
            </Typography>
            <Typography component="li" variant="body2">
              Saved loadouts and dashboard configuration
            </Typography>
            <Typography component="li" variant="body2">
              Authentication tokens (you will need to log in again)
            </Typography>
            <Typography component="li" variant="body2">
              Your consent preferences
            </Typography>
          </Box>
          <DialogContentText sx={{ mt: 2, fontWeight: 600 }}>
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAllData} color="error" variant="contained">
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
