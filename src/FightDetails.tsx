// Import MUI icons
import BugReportIcon from '@mui/icons-material/BugReport';
import DangerousIcon from '@mui/icons-material/Dangerous';
import HealingIcon from '@mui/icons-material/Healing';
import InsightsIcon from '@mui/icons-material/Insights';
import ListIcon from '@mui/icons-material/List';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import SwordsIcon from '@mui/icons-material/SportsMartialArts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Tabs, Tab, CircularProgress, Typography, Tooltip } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import BuffUptimesPanel from './features/BuffUptimesPanel';
import CriticalDamagePanel from './features/CriticalDamagePanel';
import DamageDonePanel from './features/DamageDonePanel';
import DeathEventPanel from './features/DeathEventPanel';
import EventsPanel from './features/EventsPanel';
import HealingDonePanel from './features/HealingDonePanel';
import InsightsPanel from './features/InsightsPanel';
import PenetrationPanel from './features/PenetrationPanel';
import PlayersPanel from './features/PlayersPanel';
import { FightFragment } from './graphql/generated';
import { RootState } from './store/storeWithHistory';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  React.useEffect(() => {
    document.title = 'ESO Log Insights by NotaGuild';
  }, []);

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
        <Tooltip title="Insights">
          <Tab icon={<InsightsIcon />} />
        </Tooltip>
        <Tooltip title="Players">
          <Tab icon={<PeopleIcon />} />
        </Tooltip>
        <Tooltip title="Deaths">
          <Tab icon={<DangerousIcon />} />
        </Tooltip>
        <Tooltip title="Damage Done">
          <Tab icon={<SwordsIcon />} />
        </Tooltip>
        <Tooltip title="Healing Done">
          <Tab icon={<HealingIcon />} />
        </Tooltip>
        <Tooltip title="Buff Uptimes">
          <Tab icon={<TrendingUpIcon />} />
        </Tooltip>
        <Tooltip title="Critical Damage">
          <Tab icon={<WhatshotIcon />} />
        </Tooltip>
        <Tooltip title="Penetration">
          <Tab icon={<SecurityIcon />} />
        </Tooltip>
        <Tooltip title="Raw Events">
          <Tab icon={<ListIcon />} />
        </Tooltip>
        <Tooltip title="Diagnostics">
          <Tab icon={<BugReportIcon />} />
        </Tooltip>
      </Tabs>
      {selectedTab === 0 && <InsightsPanel fight={fight} />}
      {selectedTab === 1 && <PlayersPanel />}
      {selectedTab === 2 && <DeathEventPanel fight={fight} />}
      {selectedTab === 3 && <DamageDonePanel fight={fight} />}
      {selectedTab === 4 && <HealingDonePanel fight={fight} />}
      {selectedTab === 5 && <BuffUptimesPanel fight={fight} />}
      {selectedTab === 6 && <CriticalDamagePanel fight={fight} />}
      {selectedTab === 7 && <PenetrationPanel fight={fight} />}
      {selectedTab === 8 && (
        <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
      )}
      {selectedTab === 9 && (
        <Box mt={2}>
          <strong>Total Events:</strong> {events.length.toLocaleString()}
          <Box mt={2}>
            <strong>Events by Type:</strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {Object.entries(
                events.reduce(
                  (acc, event) => {
                    const type = event.type.toLowerCase();
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
