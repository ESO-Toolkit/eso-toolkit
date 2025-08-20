import { Box, Tabs, Tab, CircularProgress, Typography } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

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
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [page, setPage] = React.useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = Number(searchParams.get('selectedTabId')) || 0;
  const navigateToTab = (tabIdx: number) => {
    searchParams.set('selectedTabId', String(tabIdx));
    setSearchParams(searchParams);
  };
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
        onChange={(_, v) => navigateToTab(v)}
        sx={{ mb: 2, overflowX: 'auto', minWidth: 0 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Insights" />
        <Tab label="Players" />
        <Tab label="Damage Done" />
        <Tab label="Healing Done" />
        <Tab label="Buff Uptimes" />
        <Tab label="Raw Events" />
        <Tab label="Diagnostics" />
      </Tabs>
      {selectedTab === 0 && <InsightsPanel fight={fight} />}
      {selectedTab === 1 && <PlayersPanel />}
      {selectedTab === 2 && <DamageDonePanel fight={fight} />}
      {selectedTab === 3 && <HealingDonePanel fight={fight} />}
      {selectedTab === 4 && <BuffUptimesPanel fight={fight} />}
      {selectedTab === 5 && (
        <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
      )}
      {selectedTab === 6 && (
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
