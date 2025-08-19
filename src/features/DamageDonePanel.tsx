import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store';

interface DamageDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const players = useSelector((state: RootState) => state.events.players);
  const characters = useSelector((state: RootState) => state.events.characters);
  const damageByPlayer: Record<number, number> = {};
  let fightDuration = 1;
  if (fight && fight.startTime != null && fight.endTime != null) {
    fightDuration = (Number(fight.endTime) - Number(fight.startTime)) / 1000;
  }
  events.forEach((event) => {
    const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
    if (eventType === 'damage' && event.sourceID != null) {
      const playerId = Number(event.sourceID);
      const amount = Number(event.amount) || 0;
      if (!damageByPlayer[playerId]) {
        damageByPlayer[playerId] = 0;
      }
      damageByPlayer[playerId] += amount;
    }
  });
  const damageRows = Object.entries(damageByPlayer)
    .map(([id, total]) => {
      const playerInfo = players[id] || {};
      let name: string;
      // Prefer character name if available
      const charId = Number(id);
      if (characters[charId]) {
        const charName = characters[charId].name;
        const displayName = playerInfo.displayName || characters[charId].displayName;
        name = displayName ? `${charName} (${displayName})` : charName;
      } else if (typeof playerInfo.name === 'string') {
        const displayName = playerInfo.displayName;
        name = displayName ? `${playerInfo.name} (${displayName})` : playerInfo.name;
      } else {
        name = `Player ${id}`;
      }
      return {
        id,
        name,
        total,
        dps: fightDuration > 0 ? total / fightDuration : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
  return (
    <Box>
      <Typography variant="h6">Damage Done by Player</Typography>
      {damageRows.length > 0 ? (
        <List>
          {damageRows.map((row) => (
            <ListItem key={row.id} divider>
              <ListItemText
                primary={`${row.name} (ID: ${row.id})`}
                secondary={`Total Damage: ${row.total.toLocaleString()} | DPS: ${row.dps.toFixed(2)}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No damage events found.</Typography>
      )}
    </Box>
  );
};

export default DamageDonePanel;
