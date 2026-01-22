/**
 * CookieConsent Component
 * Displays a banner to inform users about cookie/storage usage and obtain consent
 * Complies with GDPR and privacy regulations
 */

import { Close as CloseIcon, Cookie as CookieIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Slide,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import React from 'react';

const COOKIE_CONSENT_KEY = 'eso-log-aggregator-cookie-consent';
const COOKIE_CONSENT_VERSION = '1'; // Increment when consent terms change

interface ConsentState {
  accepted: boolean;
  version: string;
  timestamp: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const CookieConsent: React.FC = () => {
  const theme = useTheme();
  const [showBanner, setShowBanner] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    // Check if user has already consented
    try {
      const consentStr = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (consentStr) {
        const consent: ConsentState = JSON.parse(consentStr);
        // Check if consent is for current version
        if (consent.accepted && consent.version === COOKIE_CONSENT_VERSION) {
          setShowBanner(false);
          return;
        }
      }
      // No valid consent found, show banner
      setShowBanner(true);
    } catch {
      // If localStorage is not available or parsing fails, show banner to be safe
      setShowBanner(true);
    }
  }, []);

  const handleAccept = (): void => {
    try {
      const consent: ConsentState = {
        accepted: true,
        version: COOKIE_CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
      setShowBanner(false);
      setShowDetails(false);
    } catch {
      // If localStorage is not available, still hide the banner
      // The app will work without analytics/storage
      setShowBanner(false);
      setShowDetails(false);
    }
  };

  const handleDecline = (): void => {
    try {
      const consent: ConsentState = {
        accepted: false,
        version: COOKIE_CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
      setShowBanner(false);
      setShowDetails(false);
    } catch {
      // If localStorage is not available, still hide the banner
      setShowBanner(false);
      setShowDetails(false);
    }
  };

  const handleLearnMore = (): void => {
    setShowDetails(true);
  };

  const handleCloseDetails = (): void => {
    setShowDetails(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.snackbar,
          borderRadius: 0,
          borderTop: `3px solid ${theme.palette.primary.main}`,
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`
              : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          backdropFilter: 'blur(10px)',
          boxShadow: `0 -4px 20px ${alpha(theme.palette.common.black, 0.2)}`,
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
            <CookieIcon
              sx={{
                fontSize: 40,
                color: theme.palette.primary.main,
              }}
            />
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
              This application uses browser storage (localStorage) to save your preferences and
              provide analytics to improve your experience. We do not collect personal data on our
              servers.{' '}
              <Link
                component="button"
                variant="body2"
                onClick={handleLearnMore}
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': {
                    color: theme.palette.primary.dark,
                  },
                }}
              >
                Learn more
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
              onClick={handleDecline}
              sx={{
                flex: { xs: 1, md: 'initial' },
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: theme.palette.text.primary,
                  backgroundColor: alpha(theme.palette.text.primary, 0.05),
                },
              }}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              onClick={handleAccept}
              sx={{
                flex: { xs: 1, md: 'initial' },
                fontWeight: 600,
                boxShadow: theme.shadows[2],
                '&:hover': {
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              Accept
            </Button>
          </Box>

          {/* Close Button */}
          <IconButton
            size="small"
            onClick={handleDecline}
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

      {/* Details Dialog */}
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
            <CookieIcon color="primary" />
            Privacy & Cookie Policy
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText component="div">
            <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
              What We Use
            </Typography>
            <Typography variant="body2" paragraph>
              This application uses browser localStorage to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                <strong>Save your preferences:</strong> Theme settings, layout preferences, and
                application state
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Authentication tokens:</strong> Securely store your ESO Logs authentication
                to keep you logged in
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Analytics:</strong> Google Analytics to understand how users interact with
                the application and improve features
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Error tracking:</strong> Sentry for monitoring and fixing bugs to improve
                application stability
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Your Privacy
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                <strong>No server-side storage:</strong> All your data stays in your browser
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>No personal data collection:</strong> We don&apos;t collect names, emails,
                or other personal information
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Third-party services:</strong> Google Analytics and Sentry may use cookies
                per their privacy policies
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Control your data:</strong> You can clear your browser&apos;s localStorage
                at any time to remove all data
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Your Choices
            </Typography>
            <Typography variant="body2" paragraph>
              By clicking &quot;Accept&quot;, you consent to our use of browser storage and
              third-party analytics services. You can decline and still use the application, but
              some features may not work optimally without storage access.
            </Typography>
            <Typography variant="body2" paragraph>
              You can change your browser settings to block or delete localStorage and cookies at
              any time.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDetails} color="inherit">
            Close
          </Button>
          <Button onClick={handleDecline} variant="outlined">
            Decline
          </Button>
          <Button onClick={handleAccept} variant="contained" autoFocus>
            Accept
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Check if user has accepted cookies
 */
export const hasAcceptedCookies = (): boolean => {
  try {
    const consentStr = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentStr) return false;

    const consent: ConsentState = JSON.parse(consentStr);
    return consent.accepted && consent.version === COOKIE_CONSENT_VERSION;
  } catch {
    return false;
  }
};

/**
 * Get consent state
 */
export const getConsentState = (): ConsentState | null => {
  try {
    const consentStr = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentStr) return null;

    return JSON.parse(consentStr);
  } catch {
    return null;
  }
};

/**
 * Clear consent (for testing or reset)
 */
export const clearConsent = (): void => {
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    // Ignore errors
  }
};
