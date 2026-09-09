import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { useResolvedReportFightContext } from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectCastEventsEntryForContext } from '../../../store/events_data/castEventsSelectors';
import { selectCombatantInfoEventsEntryForContext } from '../../../store/events_data/combatantInfoEventsSelectors';
import { selectDamageEventsEntryForContext } from '../../../store/events_data/damageEventsSelectors';
import { selectDeathEventsEntryForContext } from '../../../store/events_data/deathEventsSelectors';
import { selectDebuffEventsEntryForContext } from '../../../store/events_data/debuffEventsSelectors';
import { selectFriendlyBuffEventsEntryForContext } from '../../../store/events_data/friendlyBuffEventsSelectors';
import { selectHealingEventsEntryForContext } from '../../../store/events_data/healingEventsSelectors';
import { selectHostileBuffEventsEntryForContext } from '../../../store/events_data/hostileBuffEventsSelectors';
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
  selectResourceEventsEntryForContext,
} from '../../../store/selectors/eventsSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { AnalyzerPanelState } from '../AnalyzerPanelState';

import { resolveDebugEventPanelState } from './EventsGrid';

interface DiagnosticsPanelProps {
  context?: ReportFightContextInput;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const damageEvents = useSelector(selectDamageEvents);
  const healingEvents = useSelector(selectHealingEvents);
  const friendlyBuffEvents = useSelector(selectFriendlyBuffEvents);
  const hostileBuffEvents = useSelector(selectHostileBuffEvents);
  const deathEvents = useSelector(selectDeathEvents);
  const combatantInfoEvents = useSelector(selectCombatantInfoEvents);
  const debuffEvents = useSelector(selectDebuffEvents);
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);
  const streamEntries = useSelector((state: RootState) => [
    selectDamageEventsEntryForContext(state, resolvedContext),
    selectHealingEventsEntryForContext(state, resolvedContext),
    selectFriendlyBuffEventsEntryForContext(state, resolvedContext),
    selectHostileBuffEventsEntryForContext(state, resolvedContext),
    selectDeathEventsEntryForContext(state, resolvedContext),
    selectCombatantInfoEventsEntryForContext(state, resolvedContext),
    selectDebuffEventsEntryForContext(state, resolvedContext),
    selectCastEventsEntryForContext(state, resolvedContext),
    selectResourceEventsEntryForContext(state, resolvedContext),
  ]);

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
  const { state: panelState, detail } = resolveDebugEventPanelState(allEvents, streamEntries);

  return (
    <AnalyzerPanelState title="Diagnostics" state={panelState} detail={detail}>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Diagnostics
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Total Events: {totalEventsCount.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
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
                        <Typography component="span" sx={{ color: 'text.secondary' }}>
                          {count.toLocaleString()}
                        </Typography>
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Box>

        <Box sx={{ mt: 2 }}>
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
                  {} as Record<string, number>,
                ),
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
                        <Typography component="span" sx={{ color: 'text.secondary' }}>
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
    </AnalyzerPanelState>
  );
};
