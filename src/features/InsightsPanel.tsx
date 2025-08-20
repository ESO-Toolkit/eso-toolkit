import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../graphql/generated';
import { RootState } from '../store/storeWithHistory';

interface InsightsPanelProps {
  fight: FightFragment;
}

const ABILITY_NAMES = ['Glacial Colossus', 'Summon Charged Atronach', 'Aggressive Horn'];
const CHAMPION_POINT_NAMES = ['Enlivening Overflow', 'From the Brink'];

const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight }) => {
  const durationSeconds = (fight.endTime - fight.startTime) / 1000;
  const players = useSelector((state: RootState) => state.events.players);
  // Find equipped abilities and champion points from combatantInfo
  const abilityEquipped: Record<string, string[]> = {};
  const cpEquipped: Record<string, string[]> = {};
  Object.values(players).forEach((player: any) => {
    const talents = player?.combatantInfo?.talents || [];
    ABILITY_NAMES.forEach((name) => {
      if (talents.some((talent: any) => talent.name?.toLowerCase() === name.toLowerCase())) {
        if (!abilityEquipped[name]) abilityEquipped[name] = [];
        abilityEquipped[name].push(player.displayName || player.name || String(player.id));
      }
    });
    CHAMPION_POINT_NAMES.forEach((name) => {
      if (talents.some((talent: any) => talent.name?.toLowerCase() === name.toLowerCase())) {
        if (!cpEquipped[name]) cpEquipped[name] = [];
        cpEquipped[name].push(player.displayName || player.name || String(player.id));
      }
    });
  });
  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Fight Insights
      </Typography>
      <Box>
        <Typography>
          <strong>Duration:</strong> {durationSeconds.toFixed(1)} seconds
        </Typography>
        <Box mt={2}>
          <Typography variant="subtitle1">Abilities Equipped:</Typography>
          <List dense>
            {ABILITY_NAMES.map((name) => (
              <ListItem key={name}>
                <ListItemText
                  primary={name}
                  secondary={
                    abilityEquipped[name]?.length ? abilityEquipped[name].join(', ') : 'None'
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
        <Box mt={2}>
          <Typography variant="subtitle1">Champion Points Equipped:</Typography>
          <List dense>
            {CHAMPION_POINT_NAMES.map((name) => (
              <ListItem key={name}>
                <ListItemText
                  primary={name}
                  secondary={cpEquipped[name]?.length ? cpEquipped[name].join(', ') : 'None'}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Paper>
  );
};

export default InsightsPanel;
