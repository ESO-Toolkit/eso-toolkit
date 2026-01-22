import React from 'react';
import { useSelector } from 'react-redux';

import { useResolvedReportFightContext } from '../../../hooks';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { selectAllEventsSelector } from '../../../store/events_data/actions';

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

  return <EventsPanelView events={events} />;
};
