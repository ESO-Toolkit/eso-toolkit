/**
 * Setup List Component
 * Displays a list of all setups for the current trial/page
 */

import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Box,
  Paper,
} from '@mui/material';
import React from 'react';

import { LoadoutSetup } from '../types/loadout.types';

interface SetupListProps {
  setups: LoadoutSetup[];
  selectedIndex: number | null;
  onSelectSetup: (index: number) => void;
}

export const SetupList: React.FC<SetupListProps> = ({
  setups,
  selectedIndex,
  onSelectSetup,
}) => {
  return (
    <Paper variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Setups</Typography>
        <Typography variant="caption" color="text.secondary">
          {setups.length} setup{setups.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
      <List sx={{ p: 0 }}>
        {setups.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">No setups available</Typography>
          </Box>
        ) : (
          setups.map((setup, index) => {
            const isBoss = setup.condition.boss && setup.condition.boss !== 'Trash';
            const isTrash = setup.condition.trash !== undefined;

            return (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  selected={selectedIndex === index}
                  onClick={() => onSelectSetup(index)}
                  disabled={setup.disabled}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                          {setup.name}
                        </Typography>
                        {isBoss && (
                          <Chip
                            label="Boss"
                            size="small"
                            color="error"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {isTrash && (
                          <Chip
                            label="Trash"
                            size="small"
                            color="default"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      setup.disabled ? 'Disabled' : getSetupProgress(setup)
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        )}
      </List>
    </Paper>
  );
};

/**
 * Get a brief progress summary for a setup
 */
function getSetupProgress(setup: LoadoutSetup): string {
  const sections: string[] = [];

  // Check skills
  const frontBarSkills = Object.keys(setup.skills[0] || {}).length;
  const backBarSkills = Object.keys(setup.skills[1] || {}).length;
  if (frontBarSkills > 0 || backBarSkills > 0) {
    sections.push(`${frontBarSkills + backBarSkills} skills`);
  }

  // Check CP
  const cpCount = Object.keys(setup.cp || {}).length;
  if (cpCount > 0) {
    sections.push(`${cpCount} CP`);
  }

  // Check food
  if (setup.food?.id) {
    sections.push('Food');
  }

  // Check gear
  const gearCount = Object.keys(setup.gear || {}).filter(key => key !== 'mythic').length;
  if (gearCount > 0) {
    sections.push(`${gearCount} gear`);
  }

  return sections.length > 0 ? sections.join(', ') : 'Empty';
}
