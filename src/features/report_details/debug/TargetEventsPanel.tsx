import { Box, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { useCurrentFight } from '../../../hooks/useCurrentFight';
import { selectActorsById } from '../../../store/master_data/masterDataSelectors';
import { selectAllEvents } from '../../../store/selectors/eventsSelectors';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { LogEvent } from '../../../types/combatlogEvents';

import { EventsGrid } from './EventsGrid';

export const TargetEventsPanel: React.FC = () => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const fight = useCurrentFight();
  const actorsById = useSelector(selectActorsById);
  const allEvents = useSelector(selectAllEvents);

  // Get all available targets (enemies + NPCs) from the current fight
  const targets = React.useMemo(() => {
    if (!fight) return [];

    const enemies = (fight.enemyPlayers || [])
      .filter((id): id is number => typeof id === 'number' && id !== null)
      .map((id) => actorsById[id])
      .filter(Boolean);

    const enemyNPCs = (fight.enemyNPCs || [])
      .filter((npc): npc is NonNullable<typeof npc> => npc !== null && npc.id !== null)
      .map((npc) => (npc.id ? actorsById[npc.id] : null))
      .filter(Boolean);

    return [...enemies, ...enemyNPCs];
  }, [fight, actorsById]);

  if (!selectedTargetId) {
    return (
      <Box mt={2}>
        <Typography variant="h6" gutterBottom>
          Target Events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please select a target enemy above to view events associated with that target.
        </Typography>
      </Box>
    );
  }

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Events for Target:{' '}
        {targets.find((t) => t && String(t.id) === selectedTargetId)?.name || selectedTargetId}
      </Typography>
      {(() => {
        // Filter events for the selected target during this fight
        const targetEvents = allEvents
          .filter((event: LogEvent) => {
            if (!fight?.startTime || !fight?.endTime) return false;
            if (event.timestamp < fight.startTime || event.timestamp > fight.endTime) return false;

            // Check if this event involves the selected target
            const eventTargetId = 'targetID' in event ? String(event.targetID || '') : '';
            const eventSourceId = 'sourceID' in event ? String(event.sourceID || '') : '';

            return eventTargetId === selectedTargetId || eventSourceId === selectedTargetId;
          })
          .sort((a: LogEvent, b: LogEvent) => a.timestamp - b.timestamp);

        return (
          <EventsGrid
            events={targetEvents}
            title={`Target Events for ${
              targets.find((t) => t && String(t.id) === selectedTargetId)?.name || selectedTargetId
            }`}
            height={600}
          />
        );
      })()}
    </Box>
  );
};
