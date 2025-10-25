import { BugReport, Feedback, HelpOutline } from '@mui/icons-material';
import { Button, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';

import { useBugReport } from '../components/BugReportDialog';
import { useSentryTracking } from '../hooks/useSentryTracking';

/**
 * Help & Support button with bug reporting functionality
 * This can be added to any component to provide easy access to bug reporting
 */
export const HelpSupportButton: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { openBugReport, BugReportDialog } = useBugReport();
  const { trackClick, trackFeatureUsage } = useSentryTracking();

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
    trackClick('help-support-menu');
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleBugReport = (): void => {
    trackFeatureUsage('help-support', 'bug-report');
    openBugReport({
      category: undefined,
      url: window.location.href,
    });
    handleClose();
  };

  const handleFeedback = (): void => {
    trackFeatureUsage('help-support', 'feedback');
    // Open feedback form or external link
    window.open('mailto:support@notaguild.com?subject=ESO Toolkit Feedback', '_blank');
    handleClose();
  };

  const handleHelp = (): void => {
    trackFeatureUsage('help-support', 'help');
    // Open help documentation or FAQ
    window.open('https://docs.esologinsights.com', '_blank');
    handleClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="Help and support"
        title="Help & Support"
      >
        <HelpOutline />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 200 },
        }}
      >
        <MenuItem onClick={handleHelp}>
          <ListItemIcon>
            <HelpOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Help & Documentation</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleFeedback}>
          <ListItemIcon>
            <Feedback fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send Feedback</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleBugReport}>
          <ListItemIcon>
            <BugReport fontSize="small" />
          </ListItemIcon>
          <ListItemText>Report a Bug</ListItemText>
        </MenuItem>
      </Menu>

      <BugReportDialog />
    </>
  );
};

/**
 * Quick bug report button for development/testing
 * Shows only in development mode
 */
export const QuickBugReportButton: React.FC = () => {
  const { openBugReport, BugReportDialog } = useBugReport();
  const { trackClick } = useSentryTracking();

  const handleClick = (): void => {
    trackClick('quick-bug-report');
    openBugReport({
      title: 'Development Bug Report',
      url: window.location.href,
    });
  };

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<BugReport />}
        onClick={handleClick}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        Quick Bug Report
      </Button>
      <BugReportDialog />
    </>
  );
};
