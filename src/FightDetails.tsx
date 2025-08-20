import { Box, Tabs, Tab } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import abilitiesJson from './data/abilities.json';
import BuffUptimesPanel, { Ability } from './features/BuffUptimesPanel';
import DamageDonePanel from './features/DamageDonePanel';
import EventsPanel from './features/EventsPanel';
import { FightFragment } from './graphql/generated';
import { RootState } from './store/storeWithHistory';

interface FightDetailsProps {
  fight: FightFragment;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight }) => {
  const [page, setPage] = React.useState(0);
  const [selectedTab, setSelectedTab] = React.useState(0);
  const EVENTS_PER_PAGE = 25;
  const reduxAbilities = useSelector((state: RootState) => state.abilities.abilities);
  const abilities: Record<string, Ability> = React.useMemo(
    () => ({ ...abilitiesJson, ...reduxAbilities }),
    [reduxAbilities]
  );

  const events = useSelector((state: RootState) => state.events.events);

  return (
    <Box mt={2}>
      <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ mb: 2 }}>
        <Tab label="Damage Done" />
        <Tab label="Buff Uptimes" />
        <Tab label="Raw Events" />
        <Tab label="Diagnostics" />
      </Tabs>
      {selectedTab === 0 && <DamageDonePanel fight={fight} />}
      {selectedTab === 1 && <BuffUptimesPanel abilities={abilities} fight={fight} />}
      {selectedTab === 2 && (
        <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
      )}
      {selectedTab === 3 && (
        <Box mt={2}>
          <strong>Total Events:</strong> {events.length.toLocaleString()}
          <Box mt={2}>
            <strong>Events by Type:</strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {Object.entries(
                events.reduce(
                  (acc, event) => {
                    const type = (
                      event.type ||
                      event._type ||
                      event.eventType ||
                      'unknown'
                    ).toLowerCase();
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([type, count]) => (
                <li key={type}>
                  {type}: {count.toLocaleString()}
                </li>
              ))}
            </ul>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FightDetails;
