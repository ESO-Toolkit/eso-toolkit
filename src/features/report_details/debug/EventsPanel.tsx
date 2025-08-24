import React from 'react';
import { useSelector } from 'react-redux';

import { selectAllEvents } from '../../../store/events_data/actions';

import { EventsPanelView } from './EventsPanelView';

export const EventsPanel: React.FC = () => {
  const events = useSelector(selectAllEvents);

  return <EventsPanelView events={events} />;
};
