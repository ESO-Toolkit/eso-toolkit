import { BugReport, Send } from '@mui/icons-material';
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
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { BUG_REPORT_CATEGORIES, ManualBugReport, BugReportCategory } from '../config/sentryConfig';
import { submitManualBugReport, addBreadcrumb } from '../utils/sentryUtils';

interface BugReportDialogProps {
  open: boolean;
  onClose: () => void;
  initialCategory?: BugReportCategory;
  initialTitle?: string;
  initialDescription?: string;
}

const steps = ['Bug Details', 'Additional Information', 'Review & Submit'];

export const BugReportDialog: React.FC<BugReportDialogProps> = ({
  open,
  onClose,
  initialCategory = BUG_REPORT_CATEGORIES.OTHER,
  initialTitle = '',
  initialDescription = '',
}) => {
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
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
    ) => {
      const value = event.target.value;
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

  const renderStepContent = (step: number): JSX.Element => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Bug Title"
              value={reportData.title}
              onChange={handleInputChange('title')}
              placeholder="Brief description of the issue"
              required
            />

            <TextField
              fullWidth
              label="Bug Description"
              value={reportData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={4}
              placeholder="Detailed description of what went wrong"
              required
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={reportData.category}
                  onChange={handleInputChange('category')}
                  label="Category"
                >
                  {Object.entries(BUG_REPORT_CATEGORIES).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {key
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={reportData.severity}
                  onChange={handleInputChange('severity')}
                  label="Severity"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Steps to Reproduce (Optional)</Typography>
            {reportData.steps?.map((step, index) => (
              <Stack key={index} direction="row" spacing={1} alignItems="center">
                <Chip label={index + 1} size="small" />
                <TextField
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
            <Button variant="outlined" onClick={addStep} size="small">
              Add Step
            </Button>

            <TextField
              fullWidth
              label="Expected Behavior"
              value={reportData.expectedBehavior}
              onChange={handleInputChange('expectedBehavior')}
              multiline
              rows={2}
              placeholder="What should have happened?"
            />

            <TextField
              fullWidth
              label="Actual Behavior"
              value={reportData.actualBehavior}
              onChange={handleInputChange('actualBehavior')}
              multiline
              rows={2}
              placeholder="What actually happened?"
            />
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Review Your Bug Report</Typography>

            <Alert severity="info">
              Please review your bug report before submitting. This information will help our
              development team identify and fix the issue more quickly.
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

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
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
          <Stack spacing={3} alignItems="center">
            <Typography variant="h5" color="success.main">
              ✓ Bug Report Submitted Successfully!
            </Typography>
            <Typography variant="body1" textAlign="center">
              Thank you for reporting this issue. Our development team has been notified and will
              investigate the problem.
            </Typography>
            <Alert severity="success" sx={{ width: '100%' }}>
              Your bug report has been automatically tagged with relevant system information to help
              with debugging.
            </Alert>
          </Stack>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <BugReport />
          <Typography variant="h6">Report a Bug</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {activeStep < steps.length && (
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        {submitted ? (
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        ) : (
          <Stack
            direction="row"
            spacing={2}
            sx={{ width: '100%', justifyContent: 'space-between' }}
          >
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>

            <Stack direction="row" spacing={1}>
              {activeStep > 0 && (
                <Button onClick={handleBack} disabled={isSubmitting}>
                  Back
                </Button>
              )}

              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!isStepValid(activeStep)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isStepValid(activeStep) || isSubmitting}
                  startIcon={<Send />}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Floating Action Button for quick bug reporting
interface BugReportFabProps {
  position?: {
    bottom?: number;
    right?: number;
  };
}

export const BugReportFab: React.FC<BugReportFabProps> = ({
  position = { bottom: 16, right: 16 },
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = (): void => {
    addBreadcrumb('Bug report FAB clicked', 'ui');
    setDialogOpen(true);
  };

  return (
    <>
      <Zoom in={!dialogOpen}>
        <Fab
          color="secondary"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: position.bottom,
            right: position.right,
            zIndex: 1000,
          }}
        >
          <BugReport />
        </Fab>
      </Zoom>

      <BugReportDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

// Hook for programmatic bug reporting
export const useBugReport = (): {
  openBugReport: (data?: Partial<ManualBugReport>) => void;
  closeBugReport: () => void;
  BugReportDialog: () => JSX.Element;
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

  const BugReportComponent = (): JSX.Element => (
    <BugReportDialog
      open={dialogOpen}
      onClose={closeBugReport}
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
