import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import * as React from 'react';
import { useSelector } from 'react-redux';

import {
  selectDamageEvents,
  selectHealingEvents,
  selectBuffEvents,
  selectDeathEvents,
  selectCombatantInfoEvents,
  selectDebuffEvents,
  selectCastEvents,
  selectResourceEvents,
} from '../../../store/events_data/actions';

export const Diagnostics: React.FC = () => {
  // SIMPLIFIED: Use individual selectors instead of complex combined selector
  const damageEvents = useSelector(selectDamageEvents);
  const healingEvents = useSelector(selectHealingEvents);
  const buffEvents = useSelector(selectBuffEvents);
  const deathEvents = useSelector(selectDeathEvents);
  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const debuffEvents = useSelector(selectDebuffEvents);
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);

  const totalEvents = React.useMemo(() => {
    return (
      damageEvents.length +
      healingEvents.length +
      buffEvents.length +
      deathEvents.length +
      combatantInfoEvents.length +
      debuffEvents.length +
      castEvents.length +
      resourceEvents.length
    );
  }, [
    damageEvents.length,
    healingEvents.length,
    buffEvents.length,
    deathEvents.length,
    combatantInfoEvents.length,
    debuffEvents.length,
    castEvents.length,
    resourceEvents.length,
  ]);

  const eventCounts = React.useMemo(
    () => [
      { type: 'damageEvents', count: damageEvents.length },
      { type: 'healingEvents', count: healingEvents.length },
      { type: 'buffEvents', count: buffEvents.length },
      { type: 'deathEvents', count: deathEvents.length },
      { type: 'combatantInfoEvents', count: combatantInfoEvents.length },
      { type: 'debuffEvents', count: debuffEvents.length },
      { type: 'castEvents', count: castEvents.length },
      { type: 'resourceEvents', count: resourceEvents.length },
    ],
    [
      damageEvents.length,
      healingEvents.length,
      buffEvents.length,
      deathEvents.length,
      combatantInfoEvents.length,
      debuffEvents.length,
      castEvents.length,
      resourceEvents.length,
    ]
  );

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Diagnostics
      </Typography>
      <Box mb={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Total Events: {totalEvents}
        </Typography>
      </Box>
      <Box mt={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Events by Type:
        </Typography>
        <List dense>
          {eventCounts.map(({ type, count }) => (
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
