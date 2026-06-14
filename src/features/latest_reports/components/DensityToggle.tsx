import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import { IconButton, Tooltip } from '@mui/material';
import React from 'react';

import type { ReportDensity } from '../hooks/useReportViewPrefs';

interface DensityToggleProps {
  value: ReportDensity;
  onChange: (density: ReportDensity) => void;
}

/** Toggles row/card density between comfortable and compact. */
export const DensityToggle: React.FC<DensityToggleProps> = ({ value, onChange }) => {
  const isCompact = value === 'compact';
  const nextLabel = isCompact ? 'Switch to comfortable density' : 'Switch to compact density';

  return (
    <Tooltip title={nextLabel} arrow>
      <IconButton
        size="small"
        onClick={() => onChange(isCompact ? 'comfortable' : 'compact')}
        aria-label={nextLabel}
        aria-pressed={isCompact}
        color={isCompact ? 'primary' : 'default'}
      >
        {isCompact ? <DensitySmallIcon fontSize="small" /> : <DensityMediumIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};
