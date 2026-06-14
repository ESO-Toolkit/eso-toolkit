import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import React from 'react';

import type { ReportViewMode } from '../hooks/useReportViewPrefs';

interface ViewToggleProps {
  value: ReportViewMode;
  onChange: (mode: ReportViewMode) => void;
}

/** Desktop-only table/cards layout switch. */
export const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_event, next: ReportViewMode | null) => {
        if (next) onChange(next);
      }}
      aria-label="Report list layout"
    >
      <ToggleButton value="table" aria-label="Table view">
        <Tooltip title="Table view" arrow>
          <ViewListIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="cards" aria-label="Card view">
        <Tooltip title="Card view" arrow>
          <GridViewIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
};
