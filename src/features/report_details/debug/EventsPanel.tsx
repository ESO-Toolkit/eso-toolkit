import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/storeWithHistory';

import EventsGrid from './EventsGrid';

const EventsPanel: React.FC = () => {
  const events = useSelector((state: RootState) => state.events.events);

  return <EventsGrid events={events} />;
};

export default EventsPanel;
