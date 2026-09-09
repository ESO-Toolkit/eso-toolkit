import React from 'react';

import { LogEvent } from '../../../types/combatlogEvents';
import type { AnalyzerPanelStateKind } from '../AnalyzerPanelState';

import { EventsGrid } from './EventsGrid';

interface EventsPanelViewProps {
  events: LogEvent[] | null;
  state?: AnalyzerPanelStateKind;
  stateDetail?: string;
}

export const EventsPanelView: React.FC<EventsPanelViewProps> = ({ events, state, stateDetail }) => {
  return <EventsGrid events={events || []} state={state} stateDetail={stateDetail} />;
};
