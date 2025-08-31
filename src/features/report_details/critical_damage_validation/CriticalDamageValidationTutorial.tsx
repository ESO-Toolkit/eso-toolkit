import CheckIcon from '@mui/icons-material/Check';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import React, { useState } from 'react';

interface CriticalDamageValidationTutorialProps {
  open: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    label: 'What is Critical Damage Validation?',
    content: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Critical Damage Validation is a tool that compares our calculated critical damage multipliers
          against actual damage events from combat logs to verify the accuracy of our formulas.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Why is this important?</strong> ESO has many sources of critical damage bonuses
            (gear, abilities, buffs, debuffs). Our calculations attempt to account for all known sources,
            but this tool helps us identify any missing or incorrect calculations.
          </Typography>
        </Alert>
        <Typography variant="body2">
          The validation works by finding pairs of normal hits and critical hits for the same ability
          and comparing the actual damage ratio with our expected critical damage multiplier.
        </Typography>
      </Box>
    ),
  },
  {
    label: 'How the Validation Process Works',
    content: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The validation process follows these steps:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <Typography variant="body2" color="primary" fontWeight="bold">1</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Find Damage Pairs"
              secondary="Identify critical hits and their corresponding normal hits for the same ability and target within a time window"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="body2" color="primary" fontWeight="bold">2</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Calculate Expected Multiplier"
              secondary="Use our formulas to calculate the expected critical damage multiplier at the time of the critical hit"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="body2" color="primary" fontWeight="bold">3</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Measure Actual Multiplier"
              secondary="Calculate the actual multiplier by dividing critical damage by normal damage"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Typography variant="body2" color="primary" fontWeight="bold">4</Typography>
            </ListItemIcon>
            <ListItemText
              primary="Compare and Analyze"
              secondary="Calculate discrepancy percentages and statistical confidence intervals"
            />
          </ListItem>
        </List>
      </Box>
    ),
  },
  {
    label: 'Understanding the Results',
    content: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The validation results provide several key metrics:
        </Typography>
        
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon fontSize="small" />
            Overall Accuracy
          </Typography>
          <Typography variant="body2">
            Percentage of comparisons where our calculation is within 5% of the actual value.
            Higher is better - 95%+ indicates excellent accuracy.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Confidence Level
          </Typography>
          <Typography variant="body2">
            Statistical confidence in our calculations:
            <br />• <strong>HIGH</strong>: ≥95% accuracy - Formulas are very reliable
            <br />• <strong>MEDIUM</strong>: 85-94% accuracy - Generally good with some edge cases
            <br />• <strong>LOW</strong>: &lt;85% accuracy - Significant issues that need investigation
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Average Discrepancy
          </Typography>
          <Typography variant="body2">
            How much our calculations deviate from actual values on average.
            Lower is better - less than 5% is considered very good.
          </Typography>
        </Paper>
      </Box>
    ),
  },
  {
    label: 'Interpreting Player Results',
    content: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Each player's results are analyzed individually:
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Comparisons
          </Typography>
          <Typography variant="body2">
            Number of critical/normal damage pairs found for analysis. More comparisons provide
            better statistical confidence.
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Accuracy Percentage
          </Typography>
          <Typography variant="body2">
            Percentage of this player's comparisons within the 5% tolerance. Color-coded:
            <br />• <Chip label="90%+" color="success" size="small" sx={{ mx: 0.5 }} /> Excellent
            <br />• <Chip label="75-89%" color="warning" size="small" sx={{ mx: 0.5 }} /> Good
            <br />• <Chip label="<75%" color="error" size="small" sx={{ mx: 0.5 }} /> Needs attention
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Average Discrepancy
          </Typography>
          <Typography variant="body2">
            How much our calculations typically differ from actual values for this player.
            Positive values mean we underestimate, negative means we overestimate.
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            Confidence Interval
          </Typography>
          <Typography variant="body2">
            Statistical margin of error for this player's discrepancy. Smaller intervals
            indicate more consistent results.
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    label: 'Using Detailed Analysis',
    content: (
      <Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          When you enable "Show Detailed Analysis" and click on a player, you can access:
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <PlayArrowIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Per-Ability Breakdown"
              secondary="See which abilities have the most accurate calculations and which need improvement"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PlayArrowIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Discrepancy Distribution Chart"
              secondary="Visualize how discrepancies are distributed - helps identify systematic vs random errors"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PlayArrowIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Individual Comparisons"
              secondary="Examine specific critical/normal damage pairs to understand edge cases"
            />
          </ListItem>
        </List>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Pro Tip:</strong> If you find consistent discrepancies for specific abilities
            or players, this indicates potential missing critical damage sources or calculation errors
            in our formulas that should be investigated.
          </Typography>
        </Alert>
      </Box>
    ),
  },
];

export const CriticalDamageValidationTutorial: React.FC<CriticalDamageValidationTutorialProps> = ({
  open,
  onClose,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = (): void => {
    setActiveStep((prev) => prev + 1);
  };

  const handlePrevious = (): void => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = (): void => {
    setActiveStep(0);
  };

  const handleClose = (): void => {
    setActiveStep(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpOutlineIcon />
        Critical Damage Validation Tutorial
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 1 }}>
          {TUTORIAL_STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === TUTORIAL_STEPS.length - 1 ? (
                    <Typography variant="caption">Last step</Typography>
                  ) : null
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                    disabled={index === TUTORIAL_STEPS.length - 1}
                  >
                    {index === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handlePrevious}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === TUTORIAL_STEPS.length && (
          <Paper square elevation={0} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Tutorial Complete!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You're now ready to use the Critical Damage Validation tool effectively.
              Remember to check back regularly as we improve our formulas based on validation results.
            </Typography>
            <Button onClick={handleReset} sx={{ mr: 1 }}>
              Review Tutorial
            </Button>
            <Button variant="contained" onClick={handleClose}>
              Start Using Tool
            </Button>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === TUTORIAL_STEPS.length ? 'Close' : 'Skip Tutorial'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
