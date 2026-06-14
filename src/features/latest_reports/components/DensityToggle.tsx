import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import { Box, Tooltip, useTheme } from '@mui/material';
import React from 'react';

import type { ReportDensity } from '../hooks/useReportViewPrefs';
import { segmentedButtonSx, segmentedTrackSx } from '../latestReportsStyles';

interface DensityToggleProps {
  value: ReportDensity;
  onChange: (density: ReportDensity) => void;
}

const OPTIONS: ReadonlyArray<{
  density: ReportDensity;
  label: string;
  Icon: typeof DensityMediumIcon;
}> = [
  { density: 'comfortable', label: 'Comfortable density', Icon: DensityMediumIcon },
  { density: 'compact', label: 'Compact density', Icon: DensitySmallIcon },
];

/**
 * Row/card density switch, styled as a gradient pill segmented control to match
 * the View toggle and the Roster Hub sort toggle.
 */
export const DensityToggle: React.FC<DensityToggleProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box role="group" aria-label="Report density" sx={segmentedTrackSx(isDark)}>
      {OPTIONS.map(({ density, label, Icon }) => {
        const active = value === density;
        return (
          <Tooltip key={density} title={label} arrow>
            <Box
              component="button"
              type="button"
              onClick={() => onChange(density)}
              aria-pressed={active}
              aria-label={label}
              sx={segmentedButtonSx(isDark, active)}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};
