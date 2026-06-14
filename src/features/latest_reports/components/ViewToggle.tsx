import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Box, Tooltip, useTheme } from '@mui/material';
import React from 'react';

import type { ReportViewMode } from '../hooks/useReportViewPrefs';
import { segmentedButtonSx, segmentedTrackSx } from '../latestReportsStyles';

interface ViewToggleProps {
  value: ReportViewMode;
  onChange: (mode: ReportViewMode) => void;
}

const OPTIONS: ReadonlyArray<{ mode: ReportViewMode; label: string; Icon: typeof ViewListIcon }> = [
  { mode: 'table', label: 'Table view', Icon: ViewListIcon },
  { mode: 'cards', label: 'Card view', Icon: GridViewIcon },
];

/**
 * Desktop-only table/cards layout switch, styled as a gradient pill segmented
 * control to match the Roster Hub sort toggle.
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box role="group" aria-label="Report list layout" sx={segmentedTrackSx(isDark)}>
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = value === mode;
        return (
          <Tooltip key={mode} title={label} arrow>
            <Box
              component="button"
              type="button"
              onClick={() => onChange(mode)}
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
