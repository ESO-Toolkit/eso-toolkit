import { BugReport as BugReportIcon } from '@mui/icons-material';
import { Fab, Tooltip } from '@mui/material';
import React, { useState } from 'react';

import { LoggerDebugPanel } from './LoggerDebugPanel';

interface LoggerDebugButtonProps {
  /** Position of the debug button */
  position?: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
  /** Show only in development mode */
  developmentOnly?: boolean;
  /** Custom tooltip text */
  tooltip?: string;
}

export const LoggerDebugButton: React.FC<LoggerDebugButtonProps> = ({
  position = { bottom: 16, right: 16 },
  developmentOnly = false,
  tooltip = 'Open Logger Debug Panel',
}) => {
  const [open, setOpen] = useState(false);

  // Hide in production if developmentOnly is true
  if (developmentOnly && process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      <Tooltip title={tooltip}>
        <Fab
          color="secondary"
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            zIndex: 1300,
            ...position,
          }}
        >
          <BugReportIcon fontSize="small" />
        </Fab>
      </Tooltip>

      <LoggerDebugPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
};
