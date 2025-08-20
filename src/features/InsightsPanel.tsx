import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../graphql/generated';
import { PlayerInfo } from '../store/eventsSlice';
import { RootState } from '../store/storeWithHistory';
import { PlayerTalent } from '../types/playerDetails';

interface InsightsPanelProps {
  fight: FightFragment;
}

const ABILITY_NAMES = ['Glacial Colossus', 'Summon Charged Atronach', 'Aggressive Horn'];
const CHAMPION_POINT_NAMES = ['Enlivening Overflow', 'From the Brink'];

const InsightsPanel: React.FC<InsightsPanelProps> = ({ fight }) => {
  const durationSeconds = (fight.endTime - fight.startTime) / 1000;
  const players = useSelector((state: RootState) => state.events.players);
  const events = useSelector((state: RootState) => state.events.events);

  // Memoized calculation of equipped abilities and buff actors
  const masterData = useSelector((state: RootState) => state.masterData);
  const abilityEquipped = React.useMemo(() => {
    const result: Record<string, string[]> = {};
    Object.values(players).forEach((player: PlayerInfo) => {
      const talents = player?.combatantInfo?.talents || [];
      ABILITY_NAMES.forEach((name) => {
        if (
          talents.some((talent: PlayerTalent) => talent.name?.toLowerCase() === name.toLowerCase())
        ) {
          if (!result[name]) result[name] = [];
          result[name].push(String(player.displayName || player.name || player.id));
        }
      });
    });
    return result;
  }, [players]);

  const buffActors = React.useMemo(() => {
    const result: Record<string, Set<string>> = {
      'Enlivening Overflow': new Set(),
      'From the Brink': new Set(),
    };
    const buffAbilityIds: Record<string, Array<string | number | null | undefined>> = {};
    CHAMPION_POINT_NAMES.forEach((name) => {
      buffAbilityIds[name] = Object.values(masterData.abilitiesById)
        .filter((a) => a.name?.toLowerCase() === name.toLowerCase())
        .map((a) => a.gameID)
        .filter((id) => id != null);
    });
    events.forEach((event) => {
      const eventType = (event.type || event._type || event.eventType || '').toLowerCase();
      if (eventType === 'applybuff') {
        CHAMPION_POINT_NAMES.forEach((name) => {
          if (
            buffAbilityIds[name].includes(event.abilityGameID ?? '') ||
            buffAbilityIds[name].includes(event.abilityId ?? '') ||
            buffAbilityIds[name].includes(event.buffId ?? '')
          ) {
            const sourceId = String(event.sourceID);
            if (event.sourceID != null && players[sourceId]) {
              result[name].add(
                String(players[sourceId].displayName || players[sourceId].name || sourceId)
              );
            }
          }
        });
      }
    });
    return result;
  }, [events, masterData, players]);
  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Fight Insights
      </Typography>

      <Box>
        <Typography>
          <strong>Duration:</strong> {durationSeconds.toFixed(1)} seconds
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Abilities Equipped:
        </Typography>
        <List dense>
          {ABILITY_NAMES.map((name) => (
            <ListItem key={name} sx={{ mb: 1 }}>
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

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Champion Points Equipped:
        </Typography>
        <List dense>
          {CHAMPION_POINT_NAMES.map((name) => (
            <ListItem key={name} sx={{ mb: 1 }}>
              <ListItemText
                primary={name}
                secondary={
                  buffActors[name]?.size ? Array.from(buffActors[name]).join(', ') : 'None'
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default InsightsPanel;
