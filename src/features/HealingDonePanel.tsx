import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';

interface HealingDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ fight }) => {
  const events = useSelector((state: RootState) => state.events.events);
  const masterData = useSelector((state: RootState) => state.masterData);
  const players = useSelector((state: RootState) => state.events.players);
  const characters = useSelector((state: RootState) => state.events.characters);
  const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};
  let fightDuration = 1;
  if (fight && fight.startTime != null && fight.endTime != null) {
    fightDuration = (Number(fight.endTime) - Number(fight.startTime)) / 1000;
  }
  events.forEach((event) => {
    if (event.type === 'heal' && event.sourceID != null) {
      const playerId = Number(event.sourceID);
      const amount = Number(event.amount) || 0;
      const overheal = Number(event.overheal) || 0;
      if (!healingByPlayer[playerId]) {
        healingByPlayer[playerId] = { raw: 0, overheal: 0 };
      }
      healingByPlayer[playerId].raw += amount;
      healingByPlayer[playerId].overheal += overheal;
    }
  });
  const isPlayerActor = (id: string | number) => {
    const actor = masterData.actorsById[id];
    return actor && actor.type === 'Player';
  };
  const healingRows = Object.entries(healingByPlayer)
    .filter(([id]) => isPlayerActor(id))
    .map(([id, { raw, overheal }]) => {
      let name: string | undefined;
      const actor = masterData.actorsById[id];
      if (actor) {
        name = actor.displayName ?? actor.name ?? `Player ${id}`;
      } else {
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
        raw,
        hps: fightDuration > 0 ? raw / fightDuration : 0,
        overheal,
      };
    })
    .sort((a, b) => b.hps - a.hps);
  return (
    <Box>
      <Typography variant="h6">Healing Done by Player</Typography>
      {healingRows.length > 0 ? (
        <List>
          {healingRows.map((row) => {
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
                  secondary={`Raw Heals: ${row.raw.toLocaleString()} | HPS: ${row.hps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Overheals: ${row.overheal.toLocaleString()}`}
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography>No healing events found.</Typography>
      )}
    </Box>
  );
};

export default HealingDonePanel;
