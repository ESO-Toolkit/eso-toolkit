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
    document.title = 'Privacy Policy | ESO Toolkit';
  }, []);

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

  const effectiveDate = 'August 23, 2026';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}
          >
            <ShieldIcon sx={{ fontSize: 40 }} color="primary" />
            Privacy Policy
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 1 }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            ESO Toolkit is a web application for analyzing Elder Scrolls Online combat logs and,
            when you choose to use them, publishing builds, rosters, profiles, comments, and votes.
            We process combat data in your browser where possible and explain below when data is
            sent to ESO Toolkit or another service.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>Key points:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              Combat log analysis is performed in your browser. Public ESO Logs data may be
              retrieved through our Cloudflare Worker GraphQL proxy; we do not persist report
              contents there or intentionally store raw combat logs on our servers. The browser
              performs the analysis.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              Optional analytics and error tracking (Google Analytics and Rollbar) run only with
              <strong> your explicit consent</strong>; required service providers are described
              below.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              You can export browser data or delete it locally from this page. Public content you
              publish (such as a roster, build, profile, or comment) must be deleted through its
              feature or by contacting the project.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Legal basis:</strong> Legitimate interest — necessary for the application to
                function.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>What we store in your browser:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>UI preferences:</strong> Theme (dark/light mode), sidebar state, layout
                  settings
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Authentication tokens:</strong> OAuth access and refresh tokens for ESO
                  Logs (esologs.com) are kept in sessionStorage for the current browser tab. A
                  legacy localStorage token is migrated and removed when encountered.
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Loadout &amp; dashboard data:</strong> Your saved builds and dashboard
                  configuration
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Companion imports:</strong> Selected SavedVariables or import files may
                  contain account, character, and build data. Companion parses these files locally,
                  keeps the results only in ephemeral Redux session state, and does not upload them.
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Consent preferences:</strong> Your privacy choices
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Preferences and saved application data are stored locally in your browser.
                Authentication tokens are sent to ESO Logs when you use authenticated features and
                are not included in the export download. You can remove local data and tokens with
                the controls below.
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Legal basis:</strong> Consent (GDPR Article 6(1)(a)).
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Service:</strong> Google Analytics 4 (provided by Google LLC)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>What is collected when enabled:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Page views with anonymized paths (report codes replaced with placeholders)
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Feature usage events (which tools you use, button clicks)
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Application metadata (version, build ID)
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Your numeric ESO Logs user ID (if logged in) — no name or email
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Legal basis:</strong> Consent (GDPR Article 6(1)(a)).
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Service:</strong> Rollbar (provided by Rollbar, Inc.)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>What is collected when enabled:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5 } }}>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  JavaScript error stack traces and error messages
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Browser type, screen resolution, viewport size
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Performance metrics (page load time, memory usage)
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  UI state snapshots (theme, loading states — no personal data)
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
                  Your numeric user ID and username (if logged in) — email is never sent
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                See{' '}
                <Link
                  href="https://rollbar.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    color: 'var(--accent)',
                    transition: 'color 0.15s ease-in-out',
                    '&:hover': { color: 'var(--accent-2)' },
                  }}
                >
                  Rollbar&apos;s Privacy Policy
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>ESO Logs (esologs.com):</strong> When you authenticate, we use OAuth 2.0
                PKCE to obtain an access token. User-specific requests are sent to the ESO Logs user
                API with that token. Public report and game-data requests may use the ESO Toolkit
                Cloudflare Worker GraphQL proxy, which forwards requests to ESO Logs and does not
                intentionally persist report contents. Review the ESO Logs privacy policy for its
                own processing and retention practices.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>ESO Toolkit server features:</strong> If you publish a build or roster, edit
                a profile, upload an avatar, comment, or vote, the submitted content, public display
                name, ESO Logs account identifier, timestamps, and moderation metadata are sent to
                our Cloudflare Worker API and stored in its database. Public profiles, builds,
                rosters, comments, and vote counts can be visible to other visitors. We do not sell
                this data.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Discord:</strong> If you connect Discord to publish to a server, the Discord
                OAuth flow and API may process your Discord account and server identifiers. ESO
                Toolkit requests the permissions shown in the connection dialog, reads the server
                list needed for publishing, and does not read message history. Discord handles its
                own processing under its privacy policy.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                <strong>Self-hosted fonts:</strong> Inter, Space Grotesk Variable, and Material
                Symbols Outlined are bundled with and served by ESO Toolkit. Your browser does not
                request these fonts from Google or another external font provider.
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Under the General Data Protection Regulation (GDPR), you have the following rights:
          </Typography>
          <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>Right of access (Article 15):</strong> You can view all data stored by this
              application using the Export button below.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>Right to rectification (Article 16):</strong> You can edit content you publish
              through the relevant feature. Browser-only preferences can be changed or removed
              locally.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>Right to erasure (Article 17):</strong> Use the &quot;Delete All Data&quot;
              button below to remove all application data from your browser.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              <strong>Right to data portability (Article 20):</strong> Use the &quot;Export
              Data&quot; button to download all your data in JSON format.
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: 'text.secondary' }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
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
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Page views, feature usage, build metadata
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    slotProps={{ input: { 'aria-label': 'Toggle analytics consent' } }}
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
                  Error Tracking (Rollbar)
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Crash reports, performance metrics, bug reports
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={errorTrackingEnabled}
                    onChange={(e) => setErrorTrackingEnabled(e.target.checked)}
                    slotProps={{ input: { 'aria-label': 'Toggle error tracking consent' } }}
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Exercise your data rights. Browser data is stored locally. Exporting gives you a
            snapshot of that local data, while deleting removes it from this browser.
            Server-published content is managed separately through the feature that created it or by
            contacting the project.
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>Local data:</strong> Stored until you clear your browser data or use the delete
            controls above. We do not set expiration on browser storage items.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>Published content:</strong> Builds, rosters, profiles, comments, votes, and
            moderation records remain on the ESO Toolkit API until you delete them through the
            relevant feature, the project removes them under its moderation rules, or you contact us
            with a deletion request. Backups and abuse-prevention records may persist for a limited
            period where required for security or legal obligations.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>Google Analytics:</strong> Standard GA4 properties offer user- and event-level
            retention settings of 2 or 14 months, so this data may be retained for up to 14 months.
            Google explains that aggregated standard reports are not governed by that setting. See
            Google&apos;s{' '}
            <Link
              href="https://support.google.com/analytics/answer/7667196"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              data-retention documentation
            </Link>
            .
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>Rollbar:</strong> Error-event retention depends on the project&apos;s Rollbar
            plan and settings. Rollbar documents a 30-day default for free plans and up to 180 days
            for paid plans, with shorter periods configurable on paid plans. See Rollbar&apos;s{' '}
            <Link
              href="https://docs.rollbar.com/docs/data-retention"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              data-retention documentation
            </Link>
            .
          </Typography>
        </Box>

        {/* Children's privacy */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Children&apos;s Privacy
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            For privacy-related inquiries, deletion requests, or questions about server-stored
            content, you can reach us through the project&apos;s{' '}
            <Link
              href="https://github.com/ESO-Toolkit/eso-toolkit"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
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
