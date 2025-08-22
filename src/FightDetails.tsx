// Import MUI icons
import BugReportIcon from '@mui/icons-material/BugReport';
import DangerousIcon from '@mui/icons-material/Dangerous';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import HealingIcon from '@mui/icons-material/Healing';
import InsightsIcon from '@mui/icons-material/Insights';
import ListIcon from '@mui/icons-material/List';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import SwordsIcon from '@mui/icons-material/SportsMartialArts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Typography,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControlLabel,
  Switch,
  Stack,
} from '@mui/material';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import BuffUptimesPanel from './features/BuffUptimesPanel';
import CriticalDamagePanel from './features/CriticalDamagePanel';
import DamageDonePanel from './features/DamageDonePanel';
import DeathEventPanel from './features/DeathEventPanel';
import EventsPanel from './features/EventsPanel';
import HealingDonePanel from './features/HealingDonePanel';
import InsightsPanel from './features/InsightsPanel';
import LocationHeatmapPanel from './features/LocationHeatmapPanel';
import PenetrationPanel from './features/PenetrationPanel';
import PlayersPanel from './features/PlayersPanel';
import { FightFragment } from './graphql/generated';
import { RootState } from './store/storeWithHistory';
import { toggleExperimentalTabs } from './store/uiSlice';
import { EventType } from './types/combatlogEvents';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [page, setPage] = React.useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = Number(searchParams.get('selectedTabId')) || 0;
  const dispatch = useDispatch();

  const navigateToTab = React.useCallback(
    (tabIdx: number) => {
      searchParams.set('selectedTabId', String(tabIdx));
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams]
  );
  const EVENTS_PER_PAGE = 25;

  // All useSelector calls must be before any return
  const events = useSelector((state: RootState) => state.events.events);
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const eventsLoaded = useSelector((state: RootState) => state.events.loaded);
  const masterDataLoaded = useSelector((state: RootState) => state.masterData.loaded);
  const showExperimentalTabs = useSelector((state: RootState) => state.ui.showExperimentalTabs);

  // Handle experimental tabs toggle - if user is on experimental tab and turns off toggle, go to first tab
  React.useEffect(() => {
    if (!showExperimentalTabs && selectedTab >= 8) {
      navigateToTab(0);
    }
  }, [showExperimentalTabs, selectedTab, navigateToTab]);

  // Get selected target from URL params
  const selectedTargetId = searchParams.get('target') || '';

  // Get available targets (NPCs/Bosses that participated in this fight)
  const targets = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) {
      return [];
    }

    // Get all actor IDs that participated in this fight
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const participatingActorIds = new Set<string>();

    // Filter events for this fight's timeframe and collect participating actors
    events.forEach((event: EventType) => {
      if (event.timestamp < fightStart || event.timestamp > fightEnd) {
        return;
      }

      switch (event.type) {
        // Ignore these types of events
        case 'begincast':
        case 'cast':
        case 'applybuff':
        case 'removebuff':
        case 'applydebuff':
        case 'removedebuff':
        case 'applybuffstack':
          return;
        default:
          break;
      }

      // Collect source IDs (most events have sourceID)
      if ('sourceID' in event && event.sourceID) {
        participatingActorIds.add(String(event.sourceID));
      }

      // Collect target IDs (damage, heal, buff events)
      if ('targetID' in event && event.targetID) {
        participatingActorIds.add(String(event.targetID));
      }
    });

    // Filter actors to only NPCs that participated in the fight
    return Object.values(actorsById)
      .filter(
        (actor) =>
          actor.type === 'NPC' &&
          actor.name &&
          actor.id &&
          participatingActorIds.has(String(actor.id))
      )
      .map((actor) => ({ id: actor.id?.toString() || '', name: actor.name || '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [actorsById, events, fight]);

  const handleTargetChange = (event: SelectChangeEvent) => {
    const targetId = event.target.value;
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (targetId) {
        newParams.set('target', targetId);
      } else {
        newParams.delete('target');
      }
      return newParams;
    });
  };

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
    <React.Fragment>
      {/* Target Selection and Experimental Toggle */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Target Enemy</InputLabel>
          <Select
            value={selectedTargetId}
            label="Target Enemy"
            onChange={handleTargetChange}
            displayEmpty
          >
            {targets.map((target) => (
              <MenuItem key={target.id} value={target.id}>
                {target.name} ({target.id})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title="Enable experimental tabs: Location Heatmap, Raw Events, Target Events, and Diagnostics">
          <FormControlLabel
            control={
              <Switch
                checked={showExperimentalTabs}
                onChange={() => dispatch(toggleExperimentalTabs())}
              />
            }
            label="Show Experimental Tabs"
          />
        </Tooltip>
      </Stack>
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
          {showExperimentalTabs && (
            <>
              <Tooltip title="Location Heatmap">
                <Tab icon={<MapIcon />} />
              </Tooltip>
              <Tooltip title="Raw Events">
                <Tab icon={<ListIcon />} />
              </Tooltip>
              <Tooltip title="Target Events">
                <Tab icon={<GpsFixedIcon />} />
              </Tooltip>
              <Tooltip title="Diagnostics">
                <Tab icon={<BugReportIcon />} />
              </Tooltip>
            </>
          )}
        </Tabs>
        {selectedTab === 0 && <InsightsPanel fight={fight} />}
        {selectedTab === 1 && <PlayersPanel />}
        {selectedTab === 2 && <DeathEventPanel fight={fight} />}
        {selectedTab === 3 && <DamageDonePanel fight={fight} />}
        {selectedTab === 4 && <HealingDonePanel fight={fight} />}
        {selectedTab === 5 && <BuffUptimesPanel fight={fight} />}
        {selectedTab === 6 && <CriticalDamagePanel fight={fight} />}
        {selectedTab === 7 && <PenetrationPanel fight={fight} selectedTargetId={selectedTargetId} />}
        {showExperimentalTabs && selectedTab === 8 && <LocationHeatmapPanel fight={fight} />}
        {showExperimentalTabs && selectedTab === 9 && (
          <EventsPanel page={page} setPage={setPage} EVENTS_PER_PAGE={EVENTS_PER_PAGE} />
        )}
        {showExperimentalTabs && selectedTab === 10 && selectedTargetId && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Events for Target:{' '}
              {targets.find((t) => t.id === selectedTargetId)?.name || selectedTargetId}
            </Typography>
            {(() => {
              // Filter events for the selected target during this fight
              const targetEvents = events
                .filter((event: EventType) => {
                  if (!fight?.startTime || !fight?.endTime) return false;
                  if (event.timestamp < fight.startTime || event.timestamp > fight.endTime)
                    return false;

                  // Check if this event involves the selected target
                  const eventTargetId = 'targetID' in event ? String(event.targetID || '') : '';
                  const eventSourceId = 'sourceID' in event ? String(event.sourceID || '') : '';

                  return eventTargetId === selectedTargetId || eventSourceId === selectedTargetId;
                })
                .sort((a, b) => a.timestamp - b.timestamp);

              return (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Found {targetEvents.length.toLocaleString()} events involving this target
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 600,
                      overflow: 'auto',
                      border: '1px solid #ccc',
                      borderRadius: 1,
                      p: 2,
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    {targetEvents.slice(0, 1000).map((event, index) => (
                      <Box
                        key={index}
                        sx={{ mb: 1, fontSize: '0.875rem', fontFamily: 'monospace' }}
                      >
                        <strong>[{new Date(event.timestamp).toISOString().substr(11, 12)}]</strong>{' '}
                        <span style={{ color: '#1976d2' }}>{event.type}</span>{' '}
                        {JSON.stringify(event, null, 0)}
                      </Box>
                    ))}
                    {targetEvents.length > 1000 && (
                      <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                        Showing first 1000 events of {targetEvents.length.toLocaleString()} total
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })()}
          </Box>
        )}
        {showExperimentalTabs && selectedTab === 10 && !selectedTargetId && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Target Events
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please select a target enemy above to view events associated with that target.
            </Typography>
          </Box>
        )}
        {showExperimentalTabs && selectedTab === 11 && (
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
    </React.Fragment>
  );
};

export default FightDetails;
