import React from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/storeWithHistory';

import EventsPanelView from './EventsPanelView';

const EventsPanel: React.FC = () => {
  const events = useSelector((state: RootState) => state.events.events);

  return <EventsPanelView events={events} />;
};

export default EventsPanel;
