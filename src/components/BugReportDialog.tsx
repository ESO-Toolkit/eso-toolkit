import { BugReport, Send, Feedback, ChatBubbleOutline } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Chip,
  Fab,
  Zoom,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  SelectChangeEvent,
  styled,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { BUG_REPORT_CATEGORIES, ManualBugReport, BugReportCategory } from '../config/sentryConfig';
import { submitManualBugReport, addBreadcrumb } from '../utils/sentryUtils';

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

const getBugSteps = (): string[] => ['Bug Details', 'Additional Information', 'Review & Submit'];
const getFeedbackSteps = (): string[] => [
  'Feedback Details',
  'Additional Information',
  'Review & Submit',
];

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

const DarkTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.mode === 'dark' ? '#0f172a !important' : '#ffffff !important',
    color: theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
    '& fieldset': {
      borderColor:
        theme.palette.mode === 'dark'
          ? 'rgba(56, 189, 248, 0.3) !important'
          : 'rgba(25, 118, 210, 0.4) !important',
    },
    '&:hover fieldset': {
      borderColor:
        theme.palette.mode === 'dark'
          ? 'rgba(56, 189, 248, 0.5) !important'
          : 'rgba(25, 118, 210, 0.6) !important',
    },
    '&.Mui-focused fieldset': {
      borderColor:
        theme.palette.mode === 'dark'
          ? 'rgba(56, 189, 248, 0.8) !important'
          : 'rgba(25, 118, 210, 0.9) !important',
    },
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? '#0d1430 !important' : '#f5f5f5 !important',
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.mode === 'dark' ? '#0b1220 !important' : '#ffffff !important',
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.mode === 'dark' ? '#38bdf8 !important' : '#1976d2 !important',
    '&.Mui-focused': {
      color: theme.palette.mode === 'dark' ? '#38bdf8 !important' : '#1976d2 !important',
    },
  },
}));

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onClose,
  initialType = 'bug',
  initialCategory = BUG_REPORT_CATEGORIES.OTHER,
  initialTitle = '',
  initialDescription = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const steps = initialType === 'bug' ? getBugSteps() : getFeedbackSteps();
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
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportData, setReportData] = useState<ManualBugReport>({
    title: initialTitle,
    description: initialDescription,
    category: initialCategory,
    severity: 'medium',
    steps: [''],
    expectedBehavior: '',
    actualBehavior: '',
    userAgent: navigator.userAgent,
    url: window.location.href,
  });

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      addBreadcrumb('Bug report dialog closed', 'ui', { submitted });
      onClose();
      // Reset form after a delay to allow dialog animation
      setTimeout(() => {
        setActiveStep(0);
        setSubmitted(false);
        setReportData({
          title: '',
          description: '',
          category: BUG_REPORT_CATEGORIES.OTHER,
          severity: 'medium',
          steps: [''],
          expectedBehavior: '',
          actualBehavior: '',
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      }, 200);
    }
  }, [isSubmitting, submitted, onClose]);

  const handleNext = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = (): void => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange =
    (field: keyof ManualBugReport) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setReportData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelectChange =
    (field: keyof ManualBugReport) => (event: SelectChangeEvent<string>) => {
      const value = event.target.value as string;
      setReportData((prev) => ({ ...prev, [field]: value }));
    };

  const handleStepsChange = (index: number, value: string): void => {
    setReportData((prev) => {
      const newSteps = [...(prev.steps || [])];
      newSteps[index] = value;
      return { ...prev, steps: newSteps };
    });
  };

  const addStep = (): void => {
    setReportData((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), ''],
    }));
  };

  const removeStep = (index: number): void => {
    setReportData((prev) => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      // Add breadcrumb for bug report submission
      addBreadcrumb('Manual bug report submitted', 'user', {
        category: reportData.category,
        severity: reportData.severity,
        titleLength: reportData.title.length,
        descriptionLength: reportData.description.length,
      });

      // Submit to Sentry
      submitManualBugReport(reportData);

      setSubmitted(true);
      setActiveStep(steps.length); // Move to success step
    } catch (error) {
      console.error('Error submitting bug report:', error);
      // Could add error handling UI here
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return reportData.title.trim().length > 0 && reportData.description.trim().length > 0;
      case 1:
        return true; // Optional fields
      case 2:
        return true; // Review step
      default:
        return false;
    }
  };

  const renderStepContent = (step: number): React.JSX.Element => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <DarkTextField
              fullWidth
              label={isBugReport ? 'Bug Title' : 'Feedback Title'}
              value={reportData.title}
              onChange={handleInputChange('title')}
              placeholder={
                isBugReport ? 'Brief description of the issue' : 'Brief summary of your feedback'
              }
              required
            />

            <DarkTextField
              fullWidth
              label={isBugReport ? 'Bug Description' : 'Feedback Description'}
              value={reportData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={4}
              placeholder={
                isBugReport
                  ? 'Detailed description of what went wrong'
                  : 'Share your thoughts, suggestions, or experience'
              }
              required
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>{isBugReport ? 'Category' : 'Feedback Type'}</InputLabel>
                <Select
                  value={reportData.category}
                  onChange={handleSelectChange('category')}
                  label={isBugReport ? 'Category' : 'Feedback Type'}
                >
                  {isBugReport
                    ? Object.entries(BUG_REPORT_CATEGORIES).map(([key, value]) => (
                        <MenuItem key={key} value={value}>
                          {key
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </MenuItem>
                      ))
                    : [
                        { key: 'FEATURE_REQUEST', label: 'Feature Request' },
                        { key: 'IMPROVEMENT', label: 'Improvement Suggestion' },
                        { key: 'USABILITY', label: 'Usability Feedback' },
                        { key: 'DESIGN', label: 'Design Feedback' },
                        { key: 'PERFORMANCE', label: 'Performance Feedback' },
                        { key: 'GENERAL', label: 'General Feedback' },
                        { key: 'COMPLIMENT', label: 'Compliment' },
                      ].map(({ key, label }) => (
                        <MenuItem key={key} value={key.toLowerCase()}>
                          {label}
                        </MenuItem>
                      ))}
                </Select>
              </FormControl>

              {isBugReport && (
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={reportData.severity}
                    onChange={handleSelectChange('severity')}
                    label="Severity"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              )}
              {!isBugReport && (
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={reportData.severity}
                    onChange={handleSelectChange('severity')}
                    label="Priority"
                  >
                    <MenuItem value="low">Low Priority</MenuItem>
                    <MenuItem value="medium">Medium Priority</MenuItem>
                    <MenuItem value="high">High Priority</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">
              {isBugReport ? 'Steps to Reproduce (Optional)' : 'Additional Context (Optional)'}
            </Typography>
            {reportData.steps?.map((step, index) => (
              <Stack
                key={index}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Chip label={index + 1} size="small" />
                <DarkTextField
                  fullWidth
                  value={step}
                  onChange={(e) => handleStepsChange(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                />
                {(reportData.steps?.length || 0) > 1 && (
                  <Button size="small" onClick={() => removeStep(index)} sx={{ minWidth: 'auto' }}>
                    ✕
                  </Button>
                )}
              </Stack>
            ))}
            <Button
              variant="outlined"
              onClick={addStep}
              size="small"
              sx={{
                borderRadius: 2,
                border: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(56, 189, 248, 0.3)'
                    : '1px solid rgba(15, 23, 42, 0.2)',
                color: (theme) => theme.palette.primary.main,
                background: (theme) =>
                  theme.palette.mode === 'dark' ? '#0f172a' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.1)'
                      : 'rgba(15, 23, 42, 0.05)',
                  borderColor: (theme) => theme.palette.primary.main,
                  transform: 'translateY(-1px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.15)'
                      : '0 4px 12px rgba(15, 23, 42, 0.1)',
                },
              }}
            >
              Add Step
            </Button>

            <DarkTextField
              fullWidth
              label={isBugReport ? 'Expected Behavior' : 'What would you like to see?'}
              value={reportData.expectedBehavior}
              onChange={handleInputChange('expectedBehavior')}
              multiline
              rows={2}
              placeholder={
                isBugReport
                  ? 'What should have happened?'
                  : 'Describe your ideal solution or outcome'
              }
            />

            <DarkTextField
              fullWidth
              label={isBugReport ? 'Actual Behavior' : 'Current Experience'}
              value={reportData.actualBehavior}
              onChange={handleInputChange('actualBehavior')}
              multiline
              rows={2}
              placeholder={
                isBugReport
                  ? 'What actually happened?'
                  : 'Describe the current state or your experience'
              }
            />
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={2}>
            <Typography variant="h6">
              {isBugReport ? 'Review Your Bug Report' : 'Review Your Feedback'}
            </Typography>

            <Alert severity="info">
              {isBugReport
                ? 'Please review your bug report before submitting. This information will help our development team identify and fix the issue more quickly.'
                : 'Please review your feedback before submitting. We value your input and will use it to improve the application.'}
            </Alert>

            <Box
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                <strong>{reportData.title}</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {reportData.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip label={reportData.category} size="small" color="primary" />
                <Chip label={reportData.severity} size="small" color="secondary" />
              </Stack>

              {reportData.steps && reportData.steps.some((s) => s.trim()) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Steps to Reproduce:
                  </Typography>
                  <ol>
                    {reportData.steps
                      .filter((s) => s.trim())
                      .map((step, index) => (
                        <li key={index}>
                          <Typography variant="body2">{step}</Typography>
                        </li>
                      ))}
                  </ol>
                </Box>
              )}
            </Box>
          </Stack>
        );

      default:
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
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: (theme) =>
                    `conic-gradient(from 0deg, ${theme.palette.success.main}40, transparent, ${theme.palette.success.main}40)`,
                  animation: 'spin 3s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                  zIndex: -1,
                },
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: 'success.main',
                  filter: 'drop-shadow(0 0 8px currentColor)',
                }}
              >
                ✓
              </Typography>
            </Box>

            <Box textAlign="center">
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontWeight: 600,
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
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 400, lineHeight: 1.6 }}
              >
                {isBugReport
                  ? 'Thank you for reporting this issue. Our development team has been notified and will investigate the problem.'
                  : 'Thank you for your feedback! We appreciate your input and will use it to improve the application.'}
              </Typography>
            </Box>

            <Alert
              severity="success"
              sx={{
                width: '100%',
                borderRadius: 2,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)',
                border: (theme) => `1px solid ${theme.palette.success.main}30`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                '& .MuiAlert-icon': {
                  filter: 'drop-shadow(0 0 4px currentColor)',
                },
                '& .MuiAlert-message': {
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                },
              }}
            >
              {isBugReport
                ? 'Your bug report has been automatically tagged with relevant system information to help with debugging.'
                : 'Your feedback has been recorded with relevant context information to help us understand your experience better.'}
            </Alert>
          </Stack>
        );
    }
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
          minHeight: isMobile ? '100vh' : '60vh',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 60px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(0, 225, 255, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.05) 0%, rgba(30, 41, 59, 0.03) 100%)',
          borderBottom: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.2)'
              : '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
          overflow: 'hidden',
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
                fontWeight: 600,
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>
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
        }}
      >
        {activeStep < steps.length && (
          <Box
            sx={{
              mb: { xs: 2, sm: 4 },
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #0f172a 0%, #0d1430 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.1)'
                  : '1px solid rgba(15, 23, 42, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {isMobile ? (
              // Compact mobile progress indicator
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'primary.main',
                    }}
                  >
                    Step {activeStep + 1} of {steps.length}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(15, 23, 42, 0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${((activeStep + 1) / steps.length) * 100}%`,
                        background: (theme) =>
                          `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        borderRadius: 2,
                        transition: 'width 0.3s ease-in-out',
                      }}
                    />
                  </Box>
                </Stack>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {steps[activeStep]}
                </Typography>
              </Box>
            ) : (
              // Desktop stepper
              <Stepper
                activeStep={activeStep}
                sx={{
                  '& .MuiStepLabel-root': {
                    fontFamily: 'Inter, system-ui',
                  },
                  '& .MuiStepIcon-root': {
                    fontSize: '1.5rem',
                    '&.Mui-active': {
                      color: (theme) => theme.palette.primary.main,
                      filter: 'drop-shadow(0 0 8px currentColor)',
                    },
                    '&.Mui-completed': {
                      color: (theme) => theme.palette.success.main,
                    },
                  },
                  '& .MuiStepConnector-line': {
                    borderColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(15, 23, 42, 0.2)',
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontSize: '0.95rem',
                          fontWeight: 500,
                        },
                        '& .MuiStepLabel-label.Mui-active': {
                          color: (theme) => theme.palette.primary.main,
                          fontWeight: 600,
                        },
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </Box>
        )}

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
            minHeight: { xs: 300, sm: 400 },
          }}
        >
          {renderStepContent(activeStep)}
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
          borderRadius: '0 0 24px 24px',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 4px 20px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              fontWeight: 600,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 6px 30px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                    : '0 6px 30px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
              },
              '&:active': {
                transform: 'translateY(-1px)',
              },
            }}
          >
            Close
          </Button>
        ) : (
          <Stack
            direction="row"
            spacing={2}
            sx={{ width: '100%', justifyContent: 'space-between' }}
          >
            <Button
              onClick={handleClose}
              disabled={isSubmitting}
              size="large"
              sx={{
                borderRadius: 2,
                px: { xs: 2.5, sm: 3 },
                py: { xs: 1.2, sm: 1.5 },
                color: 'text.secondary',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                fontWeight: 500,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.1)'
                      : 'rgba(15, 23, 42, 0.05)',
                  color: (theme) => theme.palette.primary.main,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Cancel
            </Button>

            <Stack direction="row" spacing={1}>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  disabled={isSubmitting}
                  variant="outlined"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: { xs: 2.5, sm: 3 },
                    py: { xs: 1.2, sm: 1.5 },
                    border: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '1px solid rgba(56, 189, 248, 0.3)'
                        : '1px solid rgba(15, 23, 42, 0.2)',
                    color: (theme) => theme.palette.primary.main,
                    background: (theme) =>
                      theme.palette.mode === 'dark' ? '#0f172a' : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    fontWeight: 500,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(56, 189, 248, 0.1)'
                          : 'rgba(15, 23, 42, 0.05)',
                      borderColor: (theme) => theme.palette.primary.main,
                      transform: 'translateY(-1px)',
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '0 4px 15px rgba(56, 189, 248, 0.2)'
                          : '0 4px 15px rgba(15, 23, 42, 0.1)',
                    },
                  }}
                >
                  Back
                </Button>
              )}

              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!isStepValid(activeStep)}
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: { xs: 3, sm: 4 },
                    py: { xs: 1.2, sm: 1.5 },
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 4px 20px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        : '0 4px 20px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '0 6px 30px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                          : '0 6px 30px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      opacity: 0.6,
                      transform: 'none',
                    },
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isStepValid(activeStep) || isSubmitting}
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
                    boxShadow: (theme) =>
                      isBugReport
                        ? '0 4px 20px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        : theme.palette.mode === 'dark'
                          ? '0 4px 20px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          : '0 4px 20px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: (theme) =>
                        isBugReport
                          ? '0 6px 30px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                          : theme.palette.mode === 'dark'
                            ? '0 6px 30px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                            : '0 6px 30px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      opacity: 0.6,
                      transform: 'none',
                    },
                  }}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : `Submit ${isBugReport ? 'Bug Report' : 'Feedback'}`}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

// Modern Floating Feedback Button with glassmorphism design
interface ModernFeedbackFabProps {
  position?: {
    bottom?: number;
    right?: number;
  };
}

export const ModernFeedbackFab: React.FC<ModernFeedbackFabProps> = ({
  position = { bottom: 24, right: 24 },
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback'>('bug');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBugReportClick = (): void => {
    addBreadcrumb('Modern feedback FAB clicked - Bug Report', 'ui');
    setFeedbackType('bug');
    setDialogOpen(true);
    setIsExpanded(false);
  };

  const handleFeedbackClick = (): void => {
    addBreadcrumb('Modern feedback FAB clicked - General Feedback', 'ui');
    setFeedbackType('feedback');
    setDialogOpen(true);
    setIsExpanded(false);
  };

  const toggleExpanded = (): void => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: position.bottom || 24 },
          right: { xs: 16, sm: position.right || 24 },
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1.5,
          // Add iOS Safari specific fixes
          WebkitTransform: 'translateZ(0)', // Force hardware acceleration
          transform: 'translateZ(0)',
          willChange: 'transform', // Optimize for animations
          // Ensure container maintains its layout during theme transitions
          minWidth: '56px',
          minHeight: '56px',
        }}
      >
        {/* Expanded Action Buttons */}
        <Zoom in={isExpanded && !dialogOpen}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 0.8, sm: 1 },
              alignItems: 'flex-end',
            }}
          >
            <Fab
              size="small"
              onClick={handleFeedbackClick}
              sx={{
                // Blue gradient for feedback button
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : '1px solid rgba(29, 78, 216, 0.3)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 4px 16px rgba(59, 130, 246, 0.2)'
                    : '0 4px 16px rgba(59, 130, 246, 0.15)',
                color: '#ffffff',
                transition: 'all 0.2s ease-out',
                borderRadius: '50%',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-1px) scale(1.03)',
                  // Lighter blue gradient on hover
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 6px 20px rgba(59, 130, 246, 0.3)'
                      : '0 6px 20px rgba(59, 130, 246, 0.25)',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(96, 165, 250, 0.5)'
                      : 'rgba(59, 130, 246, 0.5)',
                },
              }}
            >
              <ChatBubbleOutline />
            </Fab>

            <Fab
              size="small"
              onClick={handleBugReportClick}
              sx={{
                // Red gradient for bug report button
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(220, 38, 38, 0.3)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 4px 16px rgba(239, 68, 68, 0.2)'
                    : '0 4px 16px rgba(239, 68, 68, 0.15)',
                color: '#ffffff',
                transition: 'all 0.2s ease-out',
                borderRadius: '50%',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-1px) scale(1.03)',
                  // Lighter red gradient on hover
                  background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 6px 20px rgba(239, 68, 68, 0.3)'
                      : '0 6px 20px rgba(239, 68, 68, 0.25)',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(248, 113, 113, 0.5)'
                      : 'rgba(239, 68, 68, 0.5)',
                },
              }}
            >
              <BugReport />
            </Fab>
          </Box>
        </Zoom>

        {/* Main Floating Action Button */}
        <Zoom in={!dialogOpen}>
          <Fab
            onClick={toggleExpanded}
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              // Purple gradient as main color matching site aesthetic
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              border: (theme) =>
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(139, 92, 246, 0.3)'
                  : '1px solid rgba(168, 85, 247, 0.3)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(139, 92, 246, 0.25)'
                  : '0 8px 24px rgba(139, 92, 246, 0.15)',
              color: '#ffffff',
              transition: 'all 0.2s ease-out',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-2px) scale(1.05)',
                // Lighter purple gradient on hover
                background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 12px 32px rgba(139, 92, 246, 0.4)'
                    : '0 12px 32px rgba(139, 92, 246, 0.25)',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(167, 139, 250, 0.5)'
                    : 'rgba(192, 132, 252, 0.5)',
              },
              '&:active': {
                transform: 'translateY(-1px) scale(1.02)',
              },
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-out',
                // Force hardware acceleration for smoother rotation on iOS
                WebkitTransform: isExpanded
                  ? 'rotate(45deg) translateZ(0)'
                  : 'rotate(0deg) translateZ(0)',
                willChange: 'transform',
                width: '100%',
                height: '100%',
              }}
            >
              {isExpanded ? (
                <Box sx={{ fontSize: 28, lineHeight: 1 }}>✕</Box>
              ) : (
                <Feedback sx={{ fontSize: 28 }} />
              )}
            </Box>
          </Fab>
        </Zoom>
      </Box>

      <FeedbackDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialType={feedbackType}
      />
    </>
  );
};

// Legacy export for backward compatibility
export const BugReportFab = ModernFeedbackFab;

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
