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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';
import { selectFightDetailsData } from '../../store/crossSliceSelectors';
import { LogEvent } from '../../types/combatlogEvents';

import BuffUptimesPanel from './buff_uptimes/BuffUptimesPanel';
import CriticalDamagePanel from './critical_damage/CriticalDamagePanel';
import DamageDonePanel from './damage/DamageDonePanel';
import DeathEventPanel from './deaths/DeathEventPanel';
import EventsGrid from './debug/EventsGrid';
import EventsPanel from './debug/EventsPanel';
import LocationHeatmapPanel from './debug/LocationHeatmapPanel';
import HealingDonePanel from './healing/HealingDonePanel';
import InsightsPanel from './insights/InsightsPanel';
import PlayersPanel from './insights/PlayersPanel';
import PenetrationPanel from './penetration/PenetrationPanel';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = Number(searchParams.get('selectedTabId')) || 0;
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  const navigateToTab = React.useCallback(
    (tabIdx: number) => {
      searchParams.set('selectedTabId', String(tabIdx));
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams]
  );

  // OPTIMIZED: Single selector instead of multiple useSelector calls - removed showExperimentalTabs
  const { events, actorsById, eventsLoaded, masterDataLoaded } =
    useSelector(selectFightDetailsData);

  // Calculate total number of available tabs
  const totalTabs = showExperimentalTabs ? 12 : 8;

  // Ensure selectedTab is valid for current tab count
  const validSelectedTab = Math.min(selectedTab, totalTabs - 1);

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
    events.forEach((event: LogEvent) => {
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

  const toggleExperimentalTabs = React.useCallback(() => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (showExperimentalTabs) {
        newParams.delete('experimental');
      } else {
        newParams.set('experimental', 'true');
      }
      return newParams;
    });
  }, [showExperimentalTabs, setSearchParams]);

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
              <Switch checked={showExperimentalTabs} onChange={() => toggleExperimentalTabs()} />
            }
            label="Show Experimental Tabs"
          />
        </Tooltip>
      </Stack>
      <Box mt={2}>
        <Tabs
          key={showExperimentalTabs ? 'experimental' : 'normal'}
          value={validSelectedTab}
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
            <Tooltip title="Location Heatmap">
              <Tab icon={<MapIcon />} />
            </Tooltip>
          )}
          {showExperimentalTabs && (
            <Tooltip title="Raw Events">
              <Tab icon={<ListIcon />} />
            </Tooltip>
          )}
          {showExperimentalTabs && (
            <Tooltip title="Target Events">
              <Tab icon={<GpsFixedIcon />} />
            </Tooltip>
          )}

          {showExperimentalTabs && (
            <Tooltip title="Diagnostics">
              <Tab icon={<BugReportIcon />} />
            </Tooltip>
          )}
        </Tabs>
        {validSelectedTab === 0 && <InsightsPanel fight={fight} />}
        {validSelectedTab === 1 && <PlayersPanel />}
        {validSelectedTab === 2 && <DeathEventPanel fight={fight} />}
        {validSelectedTab === 3 && <DamageDonePanel fight={fight} />}
        {validSelectedTab === 4 && <HealingDonePanel fight={fight} />}
        {validSelectedTab === 5 && <BuffUptimesPanel fight={fight} />}
        {validSelectedTab === 6 && <CriticalDamagePanel fight={fight} />}
        {validSelectedTab === 7 && (
          <PenetrationPanel fight={fight} selectedTargetId={selectedTargetId} />
        )}
        {showExperimentalTabs && validSelectedTab === 8 && <LocationHeatmapPanel fight={fight} />}
        {showExperimentalTabs && validSelectedTab === 9 && <EventsPanel />}
        {showExperimentalTabs && validSelectedTab === 10 && selectedTargetId && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Events for Target:{' '}
              {targets.find((t) => t.id === selectedTargetId)?.name || selectedTargetId}
            </Typography>
            {(() => {
              // Filter events for the selected target during this fight
              const targetEvents = events
                .filter((event: LogEvent) => {
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
                <EventsGrid
                  events={targetEvents}
                  title={`Target Events for ${
                    targets.find((t) => t.id === selectedTargetId)?.name || selectedTargetId
                  }`}
                  height={600}
                />
              );
            })()}
          </Box>
        )}
        {showExperimentalTabs && validSelectedTab === 10 && !selectedTargetId && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Target Events
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please select a target enemy above to view events associated with that target.
            </Typography>
          </Box>
        )}
        {showExperimentalTabs && validSelectedTab === 11 && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Diagnostics
            </Typography>
            <Box mb={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Total Events: {events.length.toLocaleString()}
              </Typography>
            </Box>
            <Box mt={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Events by Type:
              </Typography>
              <List dense>
                {Object.entries(
                  events.reduce(
                    (acc, event) => {
                      const type = event.type.toLowerCase();
                      acc[type] = (acc[type] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                )
                  .sort(([, a], [, b]) => b - a) // Sort by count descending
                  .map(([type, count]) => (
                    <ListItem key={type} sx={{ py: 0.5, px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography component="span">
                            <Typography component="span" sx={{ fontWeight: 'medium', mr: 1 }}>
                              {type}:
                            </Typography>
                            <Typography component="span" color="text.secondary">
                              {count.toLocaleString()}
                            </Typography>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          </Box>
        )}
      </Box>
    </React.Fragment>
  );
};

export default FightDetails;
