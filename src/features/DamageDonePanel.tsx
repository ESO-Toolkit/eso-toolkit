import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface DamageDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const players = useSelector((state: RootState) => state.events.players);
  const characters = useSelector((state: RootState) => state.events.characters);
  const masterData = useSelector((state: RootState) => state.masterData);
  const damageByPlayer: Record<number, number> = {};
  const damageEventsBySource: Record<number, number> = {};
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
      if (!damageEventsBySource[playerId]) {
        damageEventsBySource[playerId] = 0;
      }
      damageEventsBySource[playerId]++;
    }
  });
  const isPlayerActor = (id: string | number) => {
    const actor = masterData.actorsById[id];
    return actor && actor.type === 'Player';
  };
  const damageRows = Object.entries(damageByPlayer)
    .filter(([id]) => isPlayerActor(id))
    .map(([id, total]) => {
      let name: string | undefined;
      // Prefer masterData actor name if available
      const actor = masterData.actorsById[id];
      if (actor) {
        name = actor.displayName ?? actor.name ?? `Player ${id}`;
      } else {
        // Fallback to previous logic
        const playerInfo = players[id] || {};
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
      }
      return {
        id,
        name,
        total,
        dps: fightDuration > 0 ? total / fightDuration : 0,
      };
    })
    .sort((a, b) => b.dps - a.dps);

  return (
    <Box>
      <Typography variant="h6">Damage Done by Player</Typography>
      {damageRows.length > 0 ? (
        <List>
          {damageRows.map((row) => {
            const actor = masterData.actorsById[row.id];
            const iconUrl = actor?.icon
              ? `https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`
              : undefined;
            return (
              <ListItem key={row.id} divider>
                <ListItemText
                  primary={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {iconUrl && (
                        <img
                          src={iconUrl}
                          alt="icon"
                          style={{ width: 24, height: 24, borderRadius: '50%' }}
                        />
                      )}
                      {row.name} (ID: {row.id})
                    </span>
                  }
                  secondary={`Total Damage: ${row.total.toLocaleString()} | DPS: ${row.dps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography>No damage events found.</Typography>
      )}
    </Box>
  );
};

export default DamageDonePanel;
