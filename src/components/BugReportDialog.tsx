import { BugReport, Send, Feedback, CheckCircleOutline, Close } from '@mui/icons-material';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Box,
  IconButton,
  CircularProgress,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import {
  BUG_REPORT_CATEGORIES,
  ManualBugReport,
  BugReportCategory,
} from '../config/errorTrackingConfig';
import { useLogger } from '../contexts/LoggerContext';
import { hasErrorTrackingConsent } from '../utils/consentManager';
import { submitManualBugReport, addBreadcrumb } from '../utils/errorTracking';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feedback';
  initialCategory?: BugReportCategory;
  initialTitle?: string;
  initialDescription?: string;
}

// Legacy interface for backward compatibility
interface BugReportDialogProps extends Omit<FeedbackDialogProps, 'initialType'> {
  initialCategory?: BugReportCategory;
  initialTitle?: string;
  initialDescription?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onClose,
  initialType = 'bug',
  initialCategory = BUG_REPORT_CATEGORIES.OTHER,
  initialTitle: _initialTitle = '',
  initialDescription = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const logger = useLogger();
  const isBugReport = initialType === 'bug';
  const isDark = theme.palette.mode === 'dark';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState(initialDescription);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      addBreadcrumb('Bug report dialog closed', 'ui', { submitted });
      onClose();
      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
      }, 200);
    }
  }, [isSubmitting, submitted, onClose]);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    const trimmed = description.trim();
    const autoTitle = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
    const report: ManualBugReport = {
      title: autoTitle || (isBugReport ? 'Bug Report' : 'Feedback'),
      description: trimmed,
      category: initialCategory,
      severity: 'medium',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    try {
      addBreadcrumb('Manual bug report submitted', 'user', {
        category: report.category,
        descriptionLength: trimmed.length,
      });
      submitManualBugReport(report);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error submitting bug report', error);
      } else if (typeof error === 'string') {
        logger.error('Error submitting bug report: ' + error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasConsent = hasErrorTrackingConsent();
  const isValid = description.trim().length > 0;

  // ------- Palette helpers -------
  const accentColor = isBugReport ? '#ef4444' : theme.palette.primary.main;
  const accentColorAlt = isBugReport ? '#dc2626' : theme.palette.secondary.main;
  const accentGradient = `linear-gradient(135deg, ${accentColor} 0%, ${accentColorAlt} 100%)`;

  // ------- Glassmorphism tokens -------
  const panelBg = isDark
    ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(3, 7, 18, 0.85) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.92) 100%)';
  const panelBorder = isDark
    ? `1px solid ${alpha('#38bdf8', 0.12)}`
    : `1px solid ${alpha('#0f172a', 0.08)}`;
  const panelShadow = isDark
    ? '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)';

  // ------- Keyframes (inlined for sx) -------
  const successPulse = {
    '@keyframes successPulse': {
      '0%': { transform: 'scale(0.8)', opacity: 0 },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
  };
  const shimmer = {
    '@keyframes shimmer': {
      '0%': { backgroundPosition: '-200% center' },
      '100%': { backgroundPosition: '200% center' },
    },
  };

  // =====================================================================
  // RENDER — Success view
  // =====================================================================
  const renderSuccess = (): React.JSX.Element => (
    <Grow in timeout={400}>
      <Stack
        spacing={3}
        alignItems="center"
        sx={{
          py: { xs: 4, sm: 5 },
          ...successPulse,
          animation: 'successPulse 0.5s ease-out',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.08)} 100%)`,
            border: `2px solid ${alpha(theme.palette.success.main, 0.35)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <CheckCircleOutline
            sx={{
              fontSize: 38,
              color: 'success.main',
              filter: 'drop-shadow(0 0 6px currentColor)',
            }}
          />
        </Box>

        <Box textAlign="center">
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1.5,
            }}
          >
            {isBugReport ? 'Bug Report Submitted!' : 'Feedback Submitted!'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 360, mx: 'auto', lineHeight: 1.7 }}
          >
            {isBugReport
              ? 'Thank you for reporting this issue. Our team has been notified and will investigate.'
              : 'Thank you for your feedback! We appreciate your input.'}
          </Typography>
        </Box>
      </Stack>
    </Grow>
  );

  // =====================================================================
  // RENDER — Form view
  // =====================================================================
  const renderForm = (): React.JSX.Element => (
    <Fade in timeout={300}>
      <Stack spacing={2.5} sx={{ pt: 1.5 }}>
        {!hasConsent && (
          <Alert
            severity="warning"
            sx={{
              borderRadius: 2,
              backgroundColor: isDark ? alpha('#78350f', 0.25) : alpha('#fff7ed', 0.95),
              border: `1px solid ${isDark ? alpha('#fb923c', 0.35) : alpha('#fb923c', 0.45)}`,
              color: isDark ? '#fdba74' : '#9a3412',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              '& .MuiAlert-icon': {
                color: isDark ? '#fb923c' : '#ea580c',
              },
            }}
          >
            Your privacy settings don&apos;t allow error tracking. Your report won&apos;t be
            submitted until you enable <strong>Error Tracking</strong> in your cookie preferences.
          </Alert>
        )}

        <TextField
          fullWidth
          label={isBugReport ? 'Describe the issue' : 'Your feedback'}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          multiline
          rows={5}
          placeholder={
            isBugReport
              ? 'What went wrong? What were you doing when it happened?'
              : 'Share your thoughts or suggestions…'
          }
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: isDark ? alpha('#0f172a', 0.8) : '#ffffff',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& fieldset': {
                borderColor: isDark ? alpha('#38bdf8', 0.2) : alpha('#0f172a', 0.12),
                transition: 'border-color 0.3s ease',
              },
              '&:hover fieldset': {
                borderColor: isDark ? alpha('#38bdf8', 0.4) : alpha('#0f172a', 0.25),
              },
              '&.Mui-focused fieldset': {
                borderColor: accentColor,
                borderWidth: 2,
              },
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(accentColor, 0.15)}`,
              },
              color: isDark ? '#e5e7eb' : '#1e293b',
              '& textarea::placeholder': {
                color: isDark ? '#94a3b8' : '#64748b',
                opacity: 1,
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 400,
              '&.Mui-focused': {
                color: accentColor,
              },
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 0.5,
            opacity: 0.6,
            transition: 'opacity 0.2s ease',
            '&:hover': { opacity: 0.85 },
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accentGradient,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            We&apos;ll automatically include your current page URL and browser info to help with
            diagnosis.
          </Typography>
        </Stack>
      </Stack>
    </Fade>
  );

  // =====================================================================
  // MAIN RENDER
  // =====================================================================
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Fade}
      transitionDuration={{ enter: 250, exit: 200 }}
      PaperProps={{
        sx: {
          background: panelBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: panelBorder,
          borderRadius: isMobile ? 0 : '14px',
          boxShadow: panelShadow,
          overflow: 'hidden',
          minHeight: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '85vh',
          // Subtle animated top-edge accent (rounded to match Paper corners)
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: accentGradient,
            zIndex: 1,
            ...shimmer,
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          },
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          },
        },
      }}
    >
      {/* ---- Title ---- */}
      <DialogTitle
        sx={{
          py: 2.5,
          px: { xs: 2.5, sm: 3 },
          borderBottom: panelBorder,
          background: isDark
            ? `linear-gradient(135deg, ${alpha(accentColor, 0.06)} 0%, transparent 100%)`
            : 'transparent',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Icon badge */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${alpha(accentColor, 0.18)} 0%, ${alpha(accentColorAlt, 0.1)} 100%)`,
              border: `1px solid ${alpha(accentColor, 0.25)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'scale(1.06)',
                boxShadow: `0 0 16px ${alpha(accentColor, 0.2)}`,
              },
            }}
          >
            {isBugReport ? (
              <BugReport sx={{ color: accentColor, fontSize: 22 }} />
            ) : (
              <Feedback sx={{ color: accentColor, fontSize: 22 }} />
            )}
          </Box>

          {/* Titles */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 600,
                background: accentGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.3,
              }}
            >
              {isBugReport ? 'Report a Bug' : 'Send Feedback'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.65 }}>
              {isBugReport
                ? 'Help us improve by reporting issues'
                : 'Share your thoughts and suggestions'}
            </Typography>
          </Box>

          {/* Close X */}
          {!submitted && (
            <IconButton
              onClick={handleClose}
              size="small"
              aria-label="Close dialog"
              sx={{
                color: 'text.secondary',
                opacity: 0.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  opacity: 1,
                  backgroundColor: alpha(accentColor, 0.08),
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      {/* ---- Content ---- */}
      <DialogContent
        sx={{
          flex: 1,
          px: { xs: 2.5, sm: 3 },
          pt: { xs: 3, sm: 3.5 },
          pb: { xs: 2.5, sm: 3 },
          overflowY: 'auto',
        }}
      >
        {submitted ? renderSuccess() : renderForm()}
      </DialogContent>

      {/* ---- Actions ---- */}
      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          borderTop: panelBorder,
          background: isDark
            ? `linear-gradient(180deg, ${alpha('#0f172a', 0.6)} 0%, ${alpha('#0b1220', 0.8)} 100%)`
            : alpha('#f8fafc', 0.6),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          gap: 1.5,
        }}
      >
        {submitted ? (
          <Button
            onClick={handleClose}
            variant="contained"
            size="large"
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1.2,
              background: accentGradient,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              boxShadow: `0 4px 14px ${alpha(accentColor, 0.3)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(accentColor, 0.45)}`,
                transform: 'translateY(-1px)',
              },
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              size="large"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.2,
                color: 'text.secondary',
                fontWeight: 500,
                textTransform: 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.text.secondary, 0.06),
                },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || !hasConsent}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Send sx={{ fontSize: 18 }} />
                )
              }
              size="large"
              sx={{
                borderRadius: 2,
                px: 3.5,
                py: 1.2,
                background: accentGradient,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem',
                boxShadow: `0 4px 14px ${alpha(accentColor, 0.25)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 6px 20px ${alpha(accentColor, 0.4)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  background: accentGradient,
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
            >
              {isSubmitting ? 'Submitting…' : `Submit ${isBugReport ? 'Bug Report' : 'Feedback'}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Hook for programmatic bug reporting
export const useBugReport = (): {
  openBugReport: (data?: Partial<ManualBugReport>) => void;
  closeBugReport: () => void;
  BugReportDialog: () => React.ReactElement;
  isOpen: boolean;
} => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<ManualBugReport>>({});

  const openBugReport = useCallback((data?: Partial<ManualBugReport>) => {
    addBreadcrumb('Bug report opened programmatically', 'ui', data);
    setInitialData(data || {});
    setDialogOpen(true);
  }, []);

  const closeBugReport = useCallback(() => {
    setDialogOpen(false);
    setInitialData({});
  }, []);

  const BugReportComponent = (): React.ReactElement => (
    <FeedbackDialog
      open={dialogOpen}
      onClose={closeBugReport}
      initialType="bug"
      initialCategory={initialData.category}
      initialTitle={initialData.title}
      initialDescription={initialData.description}
    />
  );

  return {
    openBugReport,
    closeBugReport,
    BugReportDialog: BugReportComponent,
    isOpen: dialogOpen,
  };
};

// Legacy BugReportDialog component for backward compatibility
export const BugReportDialog: React.FC<BugReportDialogProps> = (props) => (
  <FeedbackDialog {...props} initialType="bug" />
);
