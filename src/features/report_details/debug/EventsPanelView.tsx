import React from 'react';

import { LogEvent } from '../../../types/combatlogEvents';

import EventsGrid from './EventsGrid';

interface EventsPanelViewProps {
  events: LogEvent[] | null;
}

const EventsPanelView: React.FC<EventsPanelViewProps> = ({ events }) => {
  return <EventsGrid events={events || []} />;
};

export default EventsPanelView;
