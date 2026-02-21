/**
 * PrivacyPolicyPage
 *
 * Comprehensive GDPR-compliant privacy policy with:
 * - Full disclosure of data categories and legal bases
 * - Inline consent management (change preferences without re-prompting banner)
 * - Data export (Article 20) and data deletion (Article 17) controls
 * - Contact information for data protection inquiries
 */

import {
  CloudDownload as DownloadIcon,
  DeleteForever as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import React from 'react';

import {
  getConsentPreferences,
  saveConsentPreferences,
  exportUserData,
  deleteAllUserData,
  clearConsent,
} from '../utils/consentManager';

export const PrivacyPolicyPage: React.FC = () => {
  const theme = useTheme();
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);
  const [errorTrackingEnabled, setErrorTrackingEnabled] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteComplete, setDeleteComplete] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

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
    window.dispatchEvent(new Event('consent-changed'));
  };

  const effectiveDate = 'February 21, 2026';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}
          >
            <ShieldIcon sx={{ fontSize: 40 }} color="primary" />
            Privacy Policy
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            How ESO Toolkit handles your data. Effective {effectiveDate}.
          </Typography>
        </Box>

        {/* Overview */}
        <Paper
          elevation={0}
          sx={{
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
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ESO Toolkit is a client-side web application for analyzing Elder Scrolls Online combat
            logs. We are committed to protecting your privacy and being transparent about how your
            data is used.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Key points:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
            <Typography component="li" variant="body2" color="text.secondary">
              All combat log data is processed <strong>entirely in your browser</strong> — we never
              upload or store it on our servers.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              We use third-party services (Google Analytics, Sentry){' '}
              <strong>only with your explicit consent</strong>.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              You can export or delete all your data at any time from this page.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              We do not sell, rent, or share your personal data with third parties for marketing
              purposes.
            </Typography>
          </Box>
        </Paper>

        {/* Data Categories */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Data We Process
          </Typography>

          <Accordion defaultExpanded disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  1. Essential Data (Always Active)
                </Typography>
                <Chip label="Required" size="small" color="success" variant="outlined" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Legal basis:</strong> Legitimate interest — necessary for the application to
                function.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>What we store (in your browser&apos;s localStorage):</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>UI preferences:</strong> Theme (dark/light mode), sidebar state, layout
                  settings
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>Authentication tokens:</strong> OAuth access and refresh tokens for ESO
                  Logs (esologs.com)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>Loadout &amp; dashboard data:</strong> Your saved builds and dashboard
                  configuration
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  <strong>Consent preferences:</strong> Your privacy choices
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This data is stored locally in your browser and is never transmitted to our servers.
                You can clear it by clearing your browser data or using the controls below.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                2. Analytics Data (Optional)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Legal basis:</strong> Consent (GDPR Article 6(1)(a)).
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Service:</strong> Google Analytics 4 (provided by Google LLC)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>What is collected when enabled:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Page views with anonymized paths (report codes replaced with placeholders)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Feature usage events (which tools you use, button clicks)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Application metadata (version, build ID)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Your numeric ESO Logs user ID (if logged in) — no name or email
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Google may set cookies (_ga, _gid) when analytics is enabled. See{' '}
                <Link
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    color: 'var(--accent)',
                    transition: 'color 0.15s ease-in-out',
                    '&:hover': { color: 'var(--accent-2)' },
                  }}
                >
                  Google&apos;s Privacy Policy
                </Link>
                .
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                3. Error Tracking Data (Optional)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Legal basis:</strong> Consent (GDPR Article 6(1)(a)).
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Service:</strong> Sentry (provided by Functional Software, Inc.)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>What is collected when enabled:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  JavaScript error stack traces and error messages
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Browser type, screen resolution, viewport size
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Performance metrics (page load time, memory usage)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  UI state snapshots (theme, loading states — no personal data)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Your numeric user ID and username (if logged in) — email is never sent
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                See{' '}
                <Link
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    color: 'var(--accent)',
                    transition: 'color 0.15s ease-in-out',
                    '&:hover': { color: 'var(--accent-2)' },
                  }}
                >
                  Sentry&apos;s Privacy Policy
                </Link>
                .
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                4. Third-Party Services
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>ESO Logs (esologs.com):</strong> When you authenticate, we use OAuth 2.0
                PKCE flow to obtain access tokens. We query the ESO Logs API for your reports and
                combat data. Your authentication tokens are stored locally and sent directly to
                esologs.com — we do not proxy or store them on our servers.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Google Fonts:</strong> We load Inter and Space Grotesk fonts from
                Google&apos;s CDN. This results in requests to fonts.googleapis.com and
                fonts.gstatic.com, which may log your IP address per Google&apos;s privacy policy.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>

        <Divider />

        {/* Your Rights */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Your Rights Under GDPR
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Under the General Data Protection Regulation (GDPR), you have the following rights:
          </Typography>
          <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Right of access (Article 15):</strong> You can view all data stored by this
              application using the Export button below.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Right to rectification (Article 16):</strong> Since all data is stored
              locally, you can modify it directly through your browser&apos;s developer tools.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Right to erasure (Article 17):</strong> Use the &quot;Delete All Data&quot;
              button below to remove all application data from your browser.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Right to data portability (Article 20):</strong> Use the &quot;Export
              Data&quot; button to download all your data in JSON format.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              <strong>Right to withdraw consent (Article 7):</strong> You can change your consent
              preferences at any time using the controls below.
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Consent Management */}
        <Paper
          elevation={0}
          sx={{
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
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <SettingsIcon /> Consent Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Change which optional data processing categories you consent to. Changes take effect
            immediately.
          </Typography>

          <Stack spacing={2}>
            <Box
              sx={{
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
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Essential
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  App preferences, authentication, consent
                </Typography>
              </Box>
              <Chip label="Always Active" size="small" color="success" variant="outlined" />
            </Box>

            <Box
              sx={{
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
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Analytics (Google Analytics 4)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Page views, feature usage, build metadata
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  />
                }
                label=""
                sx={{ mr: 0 }}
              />
            </Box>

            <Box
              sx={{
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
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Error Tracking (Sentry)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Crash reports, performance metrics, bug reports
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={errorTrackingEnabled}
                    onChange={(e) => setErrorTrackingEnabled(e.target.checked)}
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

        {/* Data Management */}
        <Paper
          elevation={0}
          sx={{
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
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Your Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Exercise your data rights. All data is stored locally in your browser — exporting gives
            you a snapshot, and deleting removes everything permanently.
          </Typography>

          {deleteComplete && (
            <Alert severity="info" sx={{ mb: 3 }}>
              All application data has been deleted. You will be prompted for consent preferences on
              your next visit. You may need to log in again.
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

        {/* Data retention */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Data Retention
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Local data:</strong> Stored until you clear your browser data or use the delete
            controls above. We do not set expiration on localStorage items.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Google Analytics:</strong> Data retention is set by Google&apos;s default
            policies (typically 14 months). We do not control data retention on Google&apos;s
            servers.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Sentry:</strong> Error events are retained for 90 days by default per
            Sentry&apos;s data retention policy.
          </Typography>
        </Box>

        {/* Children's privacy */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Children&apos;s Privacy
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This application is not directed at children under 16 years of age. We do not knowingly
            collect personal data from children. If you believe a child has provided data through
            this application, please contact us.
          </Typography>
        </Box>

        {/* Changes */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Changes to This Policy
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            When we make material changes to this policy, we will update the consent version number,
            which will prompt you to review and re-confirm your preferences. The effective date at
            the top of this page indicates when the policy was last updated.
          </Typography>
        </Box>

        {/* Contact */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Contact
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            For privacy-related inquiries, you can reach us through the project&apos;s{' '}
            <Link
              href="https://github.com/ESO-Toolkit/eso-toolkit"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                color: 'var(--accent)',
                transition: 'color 0.15s ease-in-out',
                '&:hover': { color: 'var(--accent-2)' },
              }}
            >
              GitHub repository
            </Link>
            .
          </Typography>
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
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
