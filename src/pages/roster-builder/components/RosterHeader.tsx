/**
 * Roster Header Component
 * Displays title, mode toggle, and roster name input
 */

import { Box, Typography, TextField } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import React from 'react';

interface RosterHeaderProps {
  mode: 'simple' | 'advanced';
  onModeChange: (mode: 'simple' | 'advanced') => void;
  rosterName: string;
  onRosterNameChange: (name: string) => void;
}

export const RosterHeader: React.FC<RosterHeaderProps> = ({
  mode,
  onModeChange,
  rosterName,
  onRosterNameChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
      }}
    >
      <Typography variant="h4" component="h1">
        Roster Builder
      </Typography>

      {/* Simple/Advanced Mode Toggle */}
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_event, newMode) => {
          if (newMode !== null) {
            onModeChange(newMode);
          }
        }}
        size="small"
        color="primary"
      >
        <ToggleButton value="simple">Simple Mode</ToggleButton>
        <ToggleButton value="advanced">Advanced Mode</ToggleButton>
      </ToggleButtonGroup>
    </Box>

    <TextField
      fullWidth
      label="Roster Name"
      value={rosterName}
      onChange={(e) => onRosterNameChange(e.target.value)}
      sx={{ maxWidth: 400 }}
    />
  );
};
