import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectCastEvents,
  selectCombatantInfoEvents,
  selectDamageEvents,
  selectDeathEvents,
  selectDebuffEvents,
  selectFriendlyBuffEvents,
  selectHealingEvents,
  selectHostileBuffEvents,
  selectResourceEvents,
} from '../../../store/selectors/eventsSelectors';

export const DiagnosticsPanel: React.FC = () => {
  const damageEvents = useSelector(selectDamageEvents);
  const healingEvents = useSelector(selectHealingEvents);
  const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);
  const hostileBuffEvents = useSelector(selectHostileBuffEvents);
  const deathEvents = useSelector(selectDeathEvents);
  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const debuffEvents = useSelector(selectDebuffEvents);
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);

  // Combine all events for type analysis
  const allEvents = React.useMemo(() => {
    return [
      ...damageEvents,
      ...healingEvents,
      ...friendlyBuffEvents,
      ...hostileBuffEvents,
      ...deathEvents,
      ...combatantInfoEvents,
      ...debuffEvents,
      ...castEvents,
      ...resourceEvents,
    ];
  }, [
    damageEvents,
    healingEvents,
    friendlyBuffEvents,
    hostileBuffEvents,
    deathEvents,
    combatantInfoEvents,
    debuffEvents,
    castEvents,
    resourceEvents,
  ]);

  const eventCounts = React.useMemo(() => {
    return {
      damage: damageEvents.length,
      healing: healingEvents.length,
      friendlyBuffs: friendlyBuffEvents.length,
      hostileBuffs: hostileBuffEvents.length,
      deaths: deathEvents.length,
      combatantInfo: combatantInfoEvents.length,
      debuffs: debuffEvents.length,
      casts: castEvents.length,
      resources: resourceEvents.length,
    };
  }, [
    damageEvents.length,
    healingEvents.length,
    friendlyBuffEvents.length,
    hostileBuffEvents.length,
    deathEvents.length,
    combatantInfoEvents.length,
    debuffEvents.length,
    castEvents.length,
    resourceEvents.length,
  ]);

  const totalEventsCount = React.useMemo(() => {
    return Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  }, [eventCounts]);

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Diagnostics
      </Typography>
      <Box mb={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Total Events: {totalEventsCount.toLocaleString()}
        </Typography>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Events by Category:
        </Typography>
        <List dense>
          {Object.entries(eventCounts)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([category, count]) => (
              <ListItem key={category} sx={{ py: 0.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Typography component="span">
                      <Typography component="span" sx={{ fontWeight: 'medium', mr: 1 }}>
                        {category}:
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        {count.toLocaleString()}
                      </Typography>
                    </Typography>
                  }
                />
              </ListItem>
            ))}
        </List>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Events by Type:
        </Typography>
        <List dense>
          {(
            Object.entries(
              allEvents.reduce(
                (acc, event) => {
                  const type = event.type.toLowerCase();
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )
            ) as Array<[string, number]>
          )
            .sort(([, a], [, b]) => b - a) // Sort by count descending
            .map(([type, count]) => (
              <ListItem key={type} sx={{ py: 0.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Typography component="span">
                      <Typography component="span" sx={{ fontWeight: 'medium', mr: 1 }}>
                        {type}:
                      </Typography>
                      <Typography component="span" color="text.secondary">
                        {count.toLocaleString()}
                      </Typography>
                    </Typography>
                  }
                />
              </ListItem>
            ))}
        </List>
      </Box>
    </Box>
  );
};
