/**
 * WorkInProgressDisclaimer Component
 * Displays a banner to inform users about features under active development
 */

import { Alert } from '@mui/material';
import React from 'react';

interface WorkInProgressDisclaimerProps {
  /**
   * Custom message to display in the disclaimer
   * If not provided, a default message will be shown
   */
  message?: string;
  /**
   * Name of the feature being developed (e.g., "Raid Dashboard", "Parse Analysis")
   */
  featureName?: string;
  /**
   * Custom sx prop for styling
   */
  sx?: React.ComponentProps<typeof Alert>['sx'];
}

export const WorkInProgressDisclaimer: React.FC<WorkInProgressDisclaimerProps> = ({
  message,
  featureName,
  sx,
}) => {
  const defaultMessage = featureName
    ? `This ${featureName} is currently being developed and tested. Features may change, and some functionality may be incomplete. Please report any issues or suggestions!`
    : 'This feature is currently being developed and tested. Features may change, and some functionality may be incomplete. Please report any issues or suggestions!';

  return (
    <Alert severity="info" sx={sx}>
      <strong>🚧 Under Active Development</strong> - {message || defaultMessage}
    </Alert>
  );
};
