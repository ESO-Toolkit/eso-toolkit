/**
 * CookieConsent Component
 *
 * GDPR-compliant consent banner with granular category controls.
 * Allows users to independently opt-in to Analytics and Error Tracking.
 * Essential storage (preferences, auth) is always enabled.
 */

import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
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
  Slide,
  Switch,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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

/** Floating glassmorphism banner container */
const BannerRoot = styled('div')(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: theme.zIndex.snackbar,
  width: 'calc(100% - 32px)',
  maxWidth: 720,
  borderRadius: 14,
  border: `1px solid ${theme.palette.divider}`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(3,7,18,0.88) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.96) 100%)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(56, 189, 248, 0.06)'
      : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
  overflow: 'hidden',
  animation: 'bannerSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',

  '@keyframes bannerSlideUp': {
    from: { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
    to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
  },

  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },

  [theme.breakpoints.down('sm')]: {
    bottom: 16,
    width: 'calc(100% - 24px)',
    maxWidth: 'none',
  },
}));

/** Decorative gradient accent line at top of banner */
const AccentBar = styled('div')(({ theme }) => ({
  height: 2,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, transparent, #38bdf8, #00e1ff, #38bdf8, transparent)'
      : 'linear-gradient(90deg, transparent, #0f172a, #1e293b, #0f172a, transparent)',
}));

/** Shield icon container with subtle glow */
const ShieldBadge = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 10,
  flexShrink: 0,
  background: theme.palette.mode === 'dark' ? alpha('#38bdf8', 0.1) : alpha('#0f172a', 0.06),
  color: theme.palette.mode === 'dark' ? '#38bdf8' : '#0f172a',
}));

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
      {/* Consent Banner — hidden when preferences dialog is open */}
      {showBanner && !showDetails && (
        <BannerRoot>
          <AccentBar />

          <Box sx={{ p: { xs: 2, sm: 2.5 }, position: 'relative' }}>
            {/* Close button */}
            <IconButton
              size="small"
              onClick={handleDeclineAll}
              aria-label="Close"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: theme.palette.text.secondary,
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  color: theme.palette.text.primary,
                  backgroundColor: alpha(theme.palette.text.primary, 0.05),
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Header row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, pr: 4 }}>
              <ShieldBadge>
                <SecurityIcon sx={{ fontSize: 22 }} />
              </ShieldBadge>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  letterSpacing: '-0.01em',
                }}
              >
                Privacy & Cookies
              </Typography>
            </Box>

            {/* Description */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6, mb: 2, pr: 4 }}
            >
              We use essential storage for app functionality. Optional analytics and error tracking
              help us improve.{' '}
              <Link
                href="/privacy"
                variant="body2"
                underline="hover"
                sx={{
                  color: 'var(--accent)',
                  transition: 'color 0.15s ease-in-out',
                  '&:hover': { color: 'var(--accent-2)' },
                }}
              >
                Privacy Policy
              </Link>
            </Typography>

            {/* Actions */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Button
                size="small"
                variant="outlined"
                onClick={handleDeclineAll}
                sx={{
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  borderRadius: '8px',
                  px: 2,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  fontWeight: 500,
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
                size="small"
                variant="outlined"
                onClick={handleCustomize}
                sx={{
                  borderColor: alpha(theme.palette.primary.main, 0.4),
                  color: theme.palette.primary.main,
                  borderRadius: '8px',
                  px: 2,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  },
                }}
              >
                Customize
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleAcceptAll}
                sx={{
                  borderRadius: '8px',
                  px: 2.5,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #38bdf8, #00e1ff)'
                      : 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: theme.palette.mode === 'dark' ? '#0b1220' : '#ffffff',
                  boxShadow: 'none',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? '0 4px 16px rgba(56, 189, 248, 0.25)'
                        : '0 4px 16px rgba(15, 23, 42, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Accept All
              </Button>
            </Box>
          </Box>
        </BannerRoot>
      )}

      {/* Granular Preferences Dialog */}
      <Dialog
        open={showDetails}
        keepMounted
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        slots={{ transition: Transition }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: `1px solid ${theme.palette.divider}`,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.98) 100%)'
                  : theme.palette.background.paper,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 8px 30px rgba(0, 0, 0, 0.25)'
                  : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShieldIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                letterSpacing: '-0.01em',
              }}
            >
              Privacy Preferences
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: theme.palette.divider }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            Choose which categories of data processing you consent to. You can change these
            preferences at any time from the{' '}
            <Link href="/privacy" color="primary" underline="hover">
              privacy page
            </Link>
            .
          </Typography>

          {/* Essential — always on */}
          <Accordion
            defaultExpanded
            disableGutters
            sx={{
              '&:before': { display: 'none' },
              borderRadius: '12px !important',
              mb: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              background:
                theme.palette.mode === 'dark' ? alpha('#22c55e', 0.04) : alpha('#059669', 0.03),
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  Essential
                </Typography>
                <Chip
                  label="Always Active"
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    borderRadius: '28px',
                    color: theme.palette.mode === 'dark' ? '#22c55e' : '#059669',
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? alpha('#22c55e', 0.12)
                        : alpha('#059669', 0.1),
                    border: `1px solid ${
                      theme.palette.mode === 'dark' ? alpha('#22c55e', 0.2) : alpha('#059669', 0.2)
                    }`,
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Required for core functionality. Stores your UI preferences (theme, layout), ESO
                Logs authentication tokens, and this consent choice in your browser&apos;s
                localStorage. No data is sent to external servers.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Analytics */}
          <Accordion
            disableGutters
            sx={{
              '&:before': { display: 'none' },
              borderRadius: '12px !important',
              mb: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  Analytics
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={analyticsEnabled}
                      size="small"
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
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Google Analytics 4 helps us understand which features are used most, so we can focus
                development efforts. We track page views (with report codes anonymized), feature
                usage events, and build metadata. Your numeric user ID may be sent if you are logged
                in. We do <strong>not</strong> track your name, email, or browsing history outside
                this app.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Error Tracking */}
          <Accordion
            disableGutters
            sx={{
              '&:before': { display: 'none' },
              borderRadius: '12px !important',
              mb: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  Error Tracking
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={errorTrackingEnabled}
                      size="small"
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
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Sentry monitors runtime errors and performance so we can quickly fix bugs. When
                enabled, crash reports include browser info, UI state (no personal data), and
                performance metrics. Your numeric user ID and username may be attached to help us
                reproduce issues. We do <strong>not</strong> send your email address.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            onClick={handleDeclineAll}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.05) },
            }}
          >
            Decline All
          </Button>
          <Button
            onClick={handleAcceptAll}
            variant="outlined"
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '8px',
              borderColor: alpha(theme.palette.primary.main, 0.4),
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
              },
            }}
          >
            Accept All
          </Button>
          <Button
            onClick={handleSavePreferences}
            variant="contained"
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #38bdf8, #00e1ff)'
                  : 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: theme.palette.mode === 'dark' ? '#0b1220' : '#ffffff',
              boxShadow: 'none',
              '&:hover': {
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 4px 16px rgba(56, 189, 248, 0.25)'
                    : '0 4px 16px rgba(15, 23, 42, 0.2)',
              },
            }}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
