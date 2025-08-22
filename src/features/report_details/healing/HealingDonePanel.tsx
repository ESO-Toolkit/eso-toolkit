import { Box, Typography, List, ListItem, ListItemText, Avatar } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectHealingPanelData } from '../../../store/crossSliceSelectors';

interface HealingDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

const HealingDonePanel: React.FC<HealingDonePanelProps> = ({ fight }) => {
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { events, players, characters, masterData } = useSelector(selectHealingPanelData);

  // Memoize healing calculations to prevent unnecessary recalculations
  const healingStatistics = useMemo(() => {
    const healingByPlayer: Record<number, { raw: number; overheal: number }> = {};

    // OPTIMIZED: Events are already filtered to healing events by the selector
    events.forEach((event) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
        const overheal = 'overheal' in event ? Number(event.overheal) || 0 : 0;
        if (!healingByPlayer[playerId]) {
          healingByPlayer[playerId] = { raw: 0, overheal: 0 };
        }
        healingByPlayer[playerId].raw += amount;
        healingByPlayer[playerId].overheal += overheal;
      }
    });

    return healingByPlayer;
  }, [events]);

  const fightDuration = useMemo(() => {
    if (fight && fight.startTime != null && fight.endTime != null) {
      return (Number(fight.endTime) - Number(fight.startTime)) / 1000;
    }
    return 1;
  }, [fight]);

  const isPlayerActor = useMemo(() => {
    return (id: string | number) => {
      const actor = masterData.actorsById[id];
      return actor && actor.type === 'Player';
    };
  }, [masterData.actorsById]);

  const healingRows = Object.entries(healingStatistics)
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {iconUrl && (
                        <Avatar src={iconUrl} alt="icon" sx={{ width: 24, height: 24 }} />
                      )}
                      <Typography component="span">
                        {row.name} (ID: {row.id})
                      </Typography>
                    </Box>
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
