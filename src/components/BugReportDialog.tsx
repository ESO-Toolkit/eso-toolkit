import { BugReport, Send, Feedback } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Box,
  styled,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import {
  BUG_REPORT_CATEGORIES,
  ManualBugReport,
  BugReportCategory,
} from '../config/errorTrackingConfig';
import { useLogger } from '../contexts/LoggerContext';
import { submitManualBugReport, addBreadcrumb } from '../utils/errorTracking';


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



// Create styled components with forced dark mode styling
const StyledDialog = styled(Dialog)(({ theme }) => ({
  // Target all possible MUI Dialog paper classes with maximum specificity
  '&.MuiDialog-root .MuiDialog-paper.MuiPaper-root': {
    backgroundColor:
      theme.palette.mode === 'dark' ? '#0b1220 !important' : 'rgba(255, 255, 255, 0.95) !important',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #0b1220 0%, #0d1430 100%) !important'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%) !important',
    color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'rgba(0, 0, 0, 0.87) !important',
  },
  '& .MuiDialog-paper': {
    backgroundColor:
      theme.palette.mode === 'dark' ? '#0b1220 !important' : 'rgba(255, 255, 255, 0.95) !important',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #0b1220 0%, #0d1430 100%) !important'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%) !important',
    color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'rgba(0, 0, 0, 0.87) !important',
  },
  // Target by specific CSS classes that might be generated
  '& .MuiPaper-root': {
    backgroundColor:
      theme.palette.mode === 'dark' ? '#0b1220 !important' : 'rgba(255, 255, 255, 0.95) !important',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #0b1220 0%, #0d1430 100%) !important'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%) !important',
    color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'rgba(0, 0, 0, 0.87) !important',
  },
  // Try to override by elevation classes as well
  '& .MuiPaper-elevation24': {
    backgroundColor:
      theme.palette.mode === 'dark' ? '#0b1220 !important' : 'rgba(255, 255, 255, 0.95) !important',
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #0b1220 0%, #0d1430 100%) !important'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%) !important',
  },
}));

// Unused styled component - commented out to fix lint warning
// const DarkTextField = styled(TextField)(({ theme }) => ({
//   '& .MuiOutlinedInput-root': {
//     backgroundColor: theme.palette.mode === 'dark' ? '#0f172a !important' : '#ffffff !important',
//     color: theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
//     '& fieldset': {
//       borderColor:
//         theme.palette.mode === 'dark'
//           ? 'rgba(56, 189, 248, 0.3) !important'
//           : 'rgba(75, 85, 99, 0.5) !important', // Dark grey for light mode
//     },
//     '&:hover fieldset': {
//       borderColor:
//         theme.palette.mode === 'dark'
//           ? 'rgba(56, 189, 248, 0.5) !important'
//           : 'rgba(55, 65, 81, 0.7) !important', // Darker grey on hover
//     },
//     '&.Mui-focused fieldset': {
//       borderColor:
//         theme.palette.mode === 'dark'
//           ? 'rgba(56, 189, 248, 0.8) !important'
//           : '#1976d2 !important', // Keep blue focus for accessibility
//     },
//     '&:hover': {
//       backgroundColor: theme.palette.mode === 'dark' ? '#0d1430 !important' : '#f5f5f5 !important',
//     },
//     '&.Mui-focused': {
//       backgroundColor: theme.palette.mode === 'dark' ? '#0b1220 !important' : '#ffffff !important',
//     },
//     // Style placeholder text with higher specificity and multiple selectors
//     '& input::placeholder, & input::-webkit-input-placeholder, & input::-moz-placeholder, & input:-ms-input-placeholder': {
//       color: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//       opacity: '1 !important',
//       WebkitTextFillColor: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//     },
//     '& textarea::placeholder, & textarea::-webkit-input-placeholder, & textarea::-moz-placeholder, & textarea:-ms-input-placeholder': {
//       color: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//       opacity: '1 !important',
//       WebkitTextFillColor: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//     },
//     // Additional selectors for better browser compatibility
//     '& .MuiInputBase-input::placeholder, & .MuiInputBase-input::-webkit-input-placeholder, & .MuiInputBase-input::-moz-placeholder, & .MuiInputBase-input:-ms-input-placeholder': {
//       color: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//       opacity: '1 !important',
//       WebkitTextFillColor: `${theme.palette.mode === 'dark' ? '#94a3b8' : 'rgba(0, 0, 0, 0.6)'} !important`,
//     },
//   },
//   '& .MuiInputLabel-root': {
//     color: theme.palette.mode === 'dark' ? '#38bdf8 !important' : '#1976d2 !important',
//     fontWeight: 400, // Lighter font weight for labels
//     '&.Mui-focused': {
//       color: theme.palette.mode === 'dark' ? '#38bdf8 !important' : '#1976d2 !important',
//     },
//   },
//   // Fix Select dropdown menus
//   '& .MuiSelect-root': {
//     backgroundColor: theme.palette.mode === 'dark' ? '#0f172a !important' : '#ffffff !important',
//     color: theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
//   },
// }));


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

  // Force override dialog background to be transparent and theme-neutral
  React.useEffect(() => {
    if (open) {
      const applyTransparentStyles = (): void => {
        const dialogs = document.querySelectorAll('.MuiDialog-paper');
        dialogs.forEach((dialog: Element) => {
          const element = dialog as HTMLElement;
          if (element) {
            // Apply transparent background that works with both themes
            element.style.setProperty('background-color', 'rgba(255, 255, 255, 0.1)', 'important');
            element.style.setProperty('background', 'rgba(255, 255, 255, 0.1)', 'important');
            element.style.setProperty('backdrop-filter', 'blur(20px)', 'important');
            element.style.setProperty('-webkit-backdrop-filter', 'blur(20px)', 'important');
            // Let text color be handled by theme
            element.style.removeProperty('color');
          }
        });
      };

      // Apply styles multiple times to ensure they take effect
      setTimeout(applyTransparentStyles, 50);
      setTimeout(applyTransparentStyles, 150);
      setTimeout(applyTransparentStyles, 300);
      setTimeout(applyTransparentStyles, 500);
    }
  }, [open, theme.palette.mode]);
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
    // Auto-derive a title from the first sentence / 80 chars of the description
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

  const isValid = description.trim().length > 0;

  const renderContent = (): React.JSX.Element => {
    if (submitted) {
      return (
        <Stack spacing={4} alignItems="center" sx={{ py: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.success.main}20 0%, ${theme.palette.success.main}10 100%)`,
              border: (theme) => `2px solid ${theme.palette.success.main}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="h3"
              sx={{ color: 'success.main', filter: 'drop-shadow(0 0 8px currentColor)' }}
            >
              
            </Typography>
          </Box>

          <Box textAlign="center">
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 500,
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 2,
              }}
            >
              {isBugReport ? 'Bug Report' : 'Feedback'} Submitted!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.6 }}>
              {isBugReport
                ? 'Thank you for reporting this issue. Our team has been notified and will investigate.'
                : 'Thank you for your feedback! We appreciate your input.'}
            </Typography>
          </Box>
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        <TextField
          fullWidth
          label={isBugReport ? 'Describe the issue' : 'Your feedback'}
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          multiline
          rows={5}
          placeholder={
            isBugReport
              ? 'What went wrong? What were you doing when it happened?'
              : 'Share your thoughts or suggestions'
          }
          autoFocus
          slotProps={{
            input: {
              sx: {
                backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
                color: theme.palette.mode === 'dark' ? '#e5e7eb' : '#000000',
                '& textarea::placeholder': {
                  color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                  opacity: 1,
                },
              },
            },
            inputLabel: {
              sx: {
                color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                '&.Mui-focused': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                },
              },
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
          We&apos;ll automatically include your current page URL and browser info to help with diagnosis.
        </Typography>
      </Stack>
    );
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          background: 'rgba(0, 0, 0, 0.1)',
          // Fix mobile viewport issues with browser UI
          minHeight: isMobile ? '100dvh' : '60vh', // Use dvh for mobile
          maxHeight: isMobile ? '100dvh' : '90vh', // Prevent overflow
          height: isMobile ? '100dvh' : 'auto',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: isMobile ? '0px' : '12px', // No border radius on mobile fullscreen
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 60px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          // Position fixes for mobile
          margin: isMobile ? '0' : '32px',
          width: isMobile ? '100vw' : 'auto',
          // Ensure proper overflow handling
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(0, 225, 255, 0.03) 100%)'
              : 'transparent',
          borderBottom: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: isMobile ? '0' : '24px 24px 0 0',
          position: 'relative',
          overflow: 'hidden',
          // Fix mobile title positioning
          flexShrink: 0,
          // Add safe area insets for mobile top area
          paddingTop: { xs: 'max(16px, env(safe-area-inset-top))', sm: 3 },
          paddingLeft: { xs: 'max(16px, env(safe-area-inset-left))', sm: 3 },
          paddingRight: { xs: 'max(16px, env(safe-area-inset-right))', sm: 3 },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: (theme) =>
                isBugReport
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'
                  : `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
              border: (theme) =>
                isBugReport
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : `1px solid ${theme.palette.primary.main}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {isBugReport ? (
              <BugReport sx={{ color: '#ef4444', fontSize: 24 }} />
            ) : (
              <Feedback sx={{ color: 'primary.main', fontSize: 24 }} />
            )}
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 500, // Reduced for better readability
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isBugReport ? 'Report a Bug' : 'Send Feedback'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, opacity: 0.7, fontWeight: 400 }}
            >
              {isBugReport
                ? 'Help us improve by reporting issues'
                : 'Share your thoughts and suggestions'}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 4 },
          background: (theme) =>
            theme.palette.mode === 'dark' ? '#0b1220' : 'rgba(255, 255, 255, 0.5)',
          position: 'relative',
          // Fix mobile scrolling issues
          flex: 1,
          overflowY: 'auto',
          // Add safe area insets for mobile devices with notches/home indicators
          paddingTop: { xs: 'max(16px, env(safe-area-inset-top))', sm: 4 },
          paddingBottom: { xs: 'max(32px, env(safe-area-inset-bottom))', sm: 4 }, // Reduced bottom padding
          paddingLeft: { xs: 'max(16px, env(safe-area-inset-left))', sm: 4 },
          paddingRight: { xs: 'max(16px, env(safe-area-inset-right))', sm: 4 },
          // Ensure content doesn't get cut off by browser UI
          minHeight: isMobile ? 'calc(100dvh - 160px)' : 'auto',
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #0d1430 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            border: (theme) =>
              theme.palette.mode === 'dark'
                ? '1px solid rgba(56, 189, 248, 0.1)'
                : '1px solid rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {renderContent()}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: { xs: 2, sm: 4 },
          pt: { xs: 1.5, sm: 2 },
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #0f172a 0%, #0d1430 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
          borderTop: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.1)'
              : '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: isMobile ? '0' : '0 0 24px 24px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          // Fix mobile positioning at bottom
          flexShrink: 0,
          // Add safe area insets for mobile bottom area
          paddingBottom: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 4 },
          paddingLeft: { xs: 'max(16px, env(safe-area-inset-left))', sm: 4 },
          paddingRight: { xs: 'max(16px, env(safe-area-inset-right))', sm: 4 },
          // Ensure actions stay at bottom on mobile
          position: isMobile ? 'sticky' : 'relative',
          bottom: 0,
          zIndex: 1,
        }}
      >
        {submitted ? (
          <Button
            onClick={handleClose}
            variant="contained"
            color="primary"
            size="large"
            sx={{
              borderRadius: 2,
              px: { xs: 3, sm: 4 },
              py: { xs: 1.2, sm: 1.5 },
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              fontWeight: 500,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
            }}
          >
            Close
          </Button>
        ) : (
          <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              size="large"
              sx={{
                borderRadius: 2,
                px: { xs: 2.5, sm: 3 },
                py: { xs: 1.2, sm: 1.5 },
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              startIcon={<Send sx={{ fontSize: 20 }} />}
              size="large"
              sx={{
                borderRadius: 2,
                px: { xs: 3, sm: 4 },
                py: { xs: 1.2, sm: 1.5 },
                background: (theme) =>
                  isBugReport
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                fontWeight: 500,
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                '&:disabled': { opacity: 0.6 },
              }}
            >
              {isSubmitting ? 'Submitting…' : `Submit ${isBugReport ? 'Bug Report' : 'Feedback'}`}
            </Button>
          </Stack>
        )}
      </DialogActions>
    </StyledDialog>
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
