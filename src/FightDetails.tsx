import { Box, Tabs, Tab, CircularProgress, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import BuffUptimesPanel from './features/BuffUptimesPanel';
import DamageDonePanel from './features/DamageDonePanel';
import EventsPanel from './features/EventsPanel';
import HealingDonePanel from './features/HealingDonePanel';
import InsightsPanel from './features/InsightsPanel';
import PlayersPanel from './features/PlayersPanel';
import { FightFragment } from './graphql/generated';
import { RootState } from './store/storeWithHistory';

interface FightDetailsProps {
  fight: FightFragment;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight }) => {
  const [page, setPage] = React.useState(0);
  const [selectedTab, setSelectedTab] = React.useState(0);
  const EVENTS_PER_PAGE = 25;

  // All useSelector calls must be before any return
  const events = useSelector((state: RootState) => state.events.events);
  const eventsLoaded = useSelector((state: RootState) => state.events.loaded);
  const masterDataLoaded = useSelector((state: RootState) => state.masterData.loaded);

  // Only render content when events for the current fight are loaded
  if (!eventsLoaded || !masterDataLoaded) {
    return (
      <Box
        mt={2}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Loading events...</Typography>
      </Box>
    );
  }

  // Get players and masterData actors at top level for hooks compliance

  return (
    <Box mt={2}>
      <Tabs
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        sx={{ mb: 2, overflowX: 'auto', minWidth: 0 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Insights" />
        <Tab label="Damage Done" />
        <Tab label="Healing Done" />
        <Tab label="Buff Uptimes" />
        <Tab label="Raw Events" />
        <Tab label="Diagnostics" />
        <Tab label="Players" />
      </Tabs>
      {selectedTab === 0 && <InsightsPanel fight={fight} />}
      {selectedTab === 1 && <DamageDonePanel fight={fight} />}
      {selectedTab === 2 && <HealingDonePanel fight={fight} />}
      {selectedTab === 3 && <BuffUptimesPanel fight={fight} />}
      {selectedTab === 4 && (
        <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
      )}
      {selectedTab === 5 && (
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
      {selectedTab === 6 && <PlayersPanel />}
    </Box>
  );
};

export default FightDetails;
