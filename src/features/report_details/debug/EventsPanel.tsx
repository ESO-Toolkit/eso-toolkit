import React from 'react';
import { useSelector } from 'react-redux';

import { useResolvedReportFightContext } from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectAllEventsSelector } from '../../../store/events_data/actions';
import { selectCastEventsEntryForContext } from '../../../store/events_data/castEventsSelectors';
import { selectCombatantInfoEventsEntryForContext } from '../../../store/events_data/combatantInfoEventsSelectors';
import { selectDamageEventsEntryForContext } from '../../../store/events_data/damageEventsSelectors';
import { selectDeathEventsEntryForContext } from '../../../store/events_data/deathEventsSelectors';
import { selectDebuffEventsEntryForContext } from '../../../store/events_data/debuffEventsSelectors';
import { selectFriendlyBuffEventsEntryForContext } from '../../../store/events_data/friendlyBuffEventsSelectors';
import { selectHealingEventsEntryForContext } from '../../../store/events_data/healingEventsSelectors';
import { selectHostileBuffEventsEntryForContext } from '../../../store/events_data/hostileBuffEventsSelectors';
import { selectResourceEventsEntryForContext } from '../../../store/selectors/eventsSelectors';
import type { RootState } from '../../../store/storeWithHistory';

import { resolveDebugEventPanelState } from './EventsGrid';
import { EventsPanelView } from './EventsPanelView';

interface EventsPanelProps {
  context?: ReportFightContextInput;
}

export const EventsPanel: React.FC<EventsPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const eventsSelector = React.useMemo(
    () => selectAllEventsSelector(resolvedContext),
    [resolvedContext],
  );
  const events = useSelector(eventsSelector);
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
  const { state: panelState, detail } = resolveDebugEventPanelState(events, streamEntries);

  return <EventsPanelView events={events} state={panelState} stateDetail={detail} />;
};
