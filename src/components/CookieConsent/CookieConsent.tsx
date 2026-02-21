/**
 * CookieConsent Component
 *
 * GDPR-compliant consent banner with granular category controls.
 * Allows users to independently opt-in to Analytics and Error Tracking.
 * Essential storage (preferences, auth) is always enabled.
 */

import {
  Close as CloseIcon,
  Cookie as CookieIcon,
  ExpandMore as ExpandMoreIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Slide,
  Switch,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import React from 'react';

import {
  acceptAllConsent,
  declineAllConsent,
  getConsentState,
  saveConsentPreferences,
} from '../../utils/consentManager';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const CookieConsent: React.FC = () => {
  const theme = useTheme();
  const [showBanner, setShowBanner] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);
  const [errorTrackingEnabled, setErrorTrackingEnabled] = React.useState(false);

  React.useEffect(() => {
    const consent = getConsentState();
    if (consent) {
      // Valid consent exists — don't show banner
      setShowBanner(false);
      setAnalyticsEnabled(consent.preferences.analytics);
      setErrorTrackingEnabled(consent.preferences.errorTracking);
    } else {
      // No valid consent — show banner
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = (): void => {
    acceptAllConsent();
    setShowBanner(false);
    setShowDetails(false);
    // Notify listeners so App.tsx can reinitialize services
    window.dispatchEvent(new Event('consent-changed'));
  };

  const handleDeclineAll = (): void => {
    declineAllConsent();
    setShowBanner(false);
    setShowDetails(false);
    window.dispatchEvent(new Event('consent-changed'));
  };

  const handleSavePreferences = (): void => {
    saveConsentPreferences({
      analytics: analyticsEnabled,
      errorTracking: errorTrackingEnabled,
    });
    setShowBanner(false);
    setShowDetails(false);
    window.dispatchEvent(new Event('consent-changed'));
  };

  const handleCustomize = (): void => {
    setShowDetails(true);
  };

  const handleCloseDetails = (): void => {
    setShowDetails(false);
  };

  if (!showBanner && !showDetails) {
    return null;
  }

  return (
    <>
      {/* Consent Banner */}
      {showBanner && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.snackbar,
            borderRadius: 0,
            borderTop:
              theme.palette.mode === 'dark'
                ? '2px solid rgba(56, 189, 248, 0.25)'
                : '2px solid rgba(15, 23, 42, 0.1)',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(3,7,18,0.96) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 -8px 30px rgba(0, 0, 0, 0.25)'
                : '0 -4px 12px rgba(15, 23, 42, 0.06), 0 -1px 3px rgba(15, 23, 42, 0.03)',
            transition: 'all 0.3s ease',
          }}
        >
          <Box
            sx={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
            }}
          >
            {/* Cookie Icon */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CookieIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            </Box>

            {/* Message */}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CookieIcon
                  sx={{
                    display: { xs: 'inline', sm: 'none' },
                    fontSize: 24,
                    color: theme.palette.primary.main,
                  }}
                />
                We Value Your Privacy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                We use essential storage (localStorage) for app functionality. Optional analytics
                and error tracking help us improve your experience. You choose which categories to
                enable.{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleCustomize}
                  underline="hover"
                  sx={{
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease-in-out',
                    '&:hover': { color: 'var(--accent-2)' },
                  }}
                >
                  Customize
                </Link>{' '}
                |{' '}
                <Link
                  component="a"
                  href="/privacy"
                  variant="body2"
                  underline="hover"
                  sx={{
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease-in-out',
                    '&:hover': { color: 'var(--accent-2)' },
                  }}
                >
                  Privacy Policy
                </Link>
              </Typography>
            </Box>

            {/* Actions */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexShrink: 0,
                width: { xs: '100%', md: 'auto' },
              }}
            >
              <Button
                variant="outlined"
                onClick={handleDeclineAll}
                sx={{
                  flex: { xs: 1, md: 'initial' },
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  borderRadius: '8px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                  },
                }}
              >
                Decline All
              </Button>
              <Button
                variant="outlined"
                onClick={handleCustomize}
                sx={{
                  flex: { xs: 1, md: 'initial' },
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  borderRadius: '8px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                Customize
              </Button>
              <Button
                variant="contained"
                onClick={handleAcceptAll}
                sx={{
                  flex: { xs: 1, md: 'initial' },
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.mode === 'dark' ? '#00e1ff' : theme.palette.primary.dark})`,
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Accept All
              </Button>
            </Box>

            {/* Close = Decline */}
            <IconButton
              size="small"
              onClick={handleDeclineAll}
              aria-label="close"
              sx={{
                position: { xs: 'absolute', md: 'relative' },
                top: { xs: 8, md: 'auto' },
                right: { xs: 8, md: 'auto' },
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.text.primary,
                  backgroundColor: alpha(theme.palette.text.primary, 0.05),
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Granular Preferences Dialog */}
      <Dialog
        open={showDetails}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" />
            Privacy Preferences
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which categories of data processing you consent to. Essential storage is always
            enabled for the app to function. You can change these preferences at any time from the
            privacy page.
          </Typography>

          {/* Essential — always on */}
          <Accordion defaultExpanded disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                  Essential
                </Typography>
                <Chip label="Always Active" size="small" color="success" variant="outlined" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Required for core functionality. Stores your UI preferences (theme, layout), ESO
                Logs authentication tokens, and this consent choice in your browser&apos;s
                localStorage. No data is sent to external servers.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Analytics */}
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                  Analytics
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={analyticsEnabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        setAnalyticsEnabled(e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label=""
                  sx={{ mr: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Google Analytics 4 helps us understand which features are used most, so we can focus
                development efforts. We track page views (with report codes anonymized), feature
                usage events, and build metadata. Your numeric user ID may be sent if you are logged
                in. We do <strong>not</strong> track your name, email, or browsing history outside
                this app.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Error Tracking */}
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                  Error Tracking
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={errorTrackingEnabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        setErrorTrackingEnabled(e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label=""
                  sx={{ mr: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Sentry monitors runtime errors and performance so we can quickly fix bugs. When
                enabled, crash reports include browser info, UI state (no personal data), and
                performance metrics. Your numeric user ID and username may be attached to help us
                reproduce issues. We do <strong>not</strong> send your email address.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              For full details, see our{' '}
              <Link href="/privacy" color="primary" underline="hover">
                Privacy Policy
              </Link>
              . You can also manage your data (export or delete) from that page.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleDeclineAll} color="inherit">
            Decline All
          </Button>
          <Button onClick={handleAcceptAll} variant="outlined">
            Accept All
          </Button>
          <Button onClick={handleSavePreferences} variant="contained" autoFocus>
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
