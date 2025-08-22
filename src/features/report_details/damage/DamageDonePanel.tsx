import { Box, Typography, List, ListItem, ListItemText, Avatar } from '@mui/material';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectDamagePanelData } from '../../../store/crossSliceSelectors';

interface DamageDonePanelProps {
  fight: { startTime?: number; endTime?: number };
}

const DamageDonePanel: React.FC<DamageDonePanelProps> = ({ fight }) => {
  // OPTIMIZED: Single selector instead of multiple useSelector calls
  const { events, players, characters, masterData } = useSelector(selectDamagePanelData);

  // Memoize damage calculations to prevent unnecessary recalculations
  const damageStatistics = useMemo(() => {
    const damageByPlayer: Record<number, number> = {};
    const damageEventsBySource: Record<number, number> = {};

    // OPTIMIZED: Events are already filtered to damage events by the selector
    events.forEach((event) => {
      if ('sourceID' in event && event.sourceID != null) {
        const playerId = Number(event.sourceID);
        const amount = 'amount' in event ? Number(event.amount) || 0 : 0;
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

    return { damageByPlayer, damageEventsBySource };
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
  const damageRows = Object.entries(damageStatistics.damageByPlayer)
    .filter(([id]) => isPlayerActor(id))
    .map(([id, total]) => {
      const totalDamage = Number(total);
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
        total: totalDamage,
        dps: fightDuration > 0 ? totalDamage / fightDuration : 0,
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {iconUrl && (
                        <Avatar src={iconUrl} alt="icon" sx={{ width: 24, height: 24 }} />
                      )}
                      <Typography component="span">
                        {row.name} (ID: {row.id})
                      </Typography>
                    </Box>
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
