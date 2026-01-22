import { Box, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import {
  useFightForContext,
  useReportMasterData,
  useResolvedReportFightContext,
} from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectAllEventsSelector } from '../../../store/events_data/actions';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import type { LogEvent } from '../../../types/combatlogEvents';

import { EventsGrid } from './EventsGrid';

interface TargetEventsPanelProps {
  context?: ReportFightContextInput;
}

export const TargetEventsPanel: React.FC<TargetEventsPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const { reportMasterData } = useReportMasterData({ context: resolvedContext });
  const actorsById = reportMasterData.actorsById;
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const allEventsSelector = React.useMemo(
    () => selectAllEventsSelector(resolvedContext),
    [resolvedContext],
  );
  const allEvents = useSelector(allEventsSelector);

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

  // Filter events for the selected target during this fight (if target is selected)
  const targetEvents = React.useMemo(() => {
    if (!selectedTargetId || !fight?.startTime || !fight?.endTime) {
      return [];
    }

    return allEvents
      .filter((event: LogEvent) => {
        if (event.timestamp < fight.startTime || event.timestamp > fight.endTime) return false;

        // Check if this event involves the selected target
        const eventTargetId = 'targetID' in event ? event.targetID : null;
        const eventSourceId = 'sourceID' in event ? event.sourceID : null;

        return eventTargetId === selectedTargetId || eventSourceId === selectedTargetId;
      })
      .sort((a: LogEvent, b: LogEvent) => a.timestamp - b.timestamp);
  }, [selectedTargetId, allEvents, fight]);

  const targetName = selectedTargetId
    ? targets.find((t) => t && t.id === selectedTargetId)?.name || selectedTargetId.toString()
    : '';

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Target Events
        {selectedTargetId && ` for ${targetName}`}
      </Typography>

      <EventsGrid
        events={targetEvents}
        title={selectedTargetId ? `Target Events for ${targetName}` : 'Target Events'}
        height={600}
        isTargetMode={true}
        hasTargetSelected={!!selectedTargetId}
        noTargetMessage="Please select a target enemy above to view events associated with that target."
      />
    </Box>
  );
};
