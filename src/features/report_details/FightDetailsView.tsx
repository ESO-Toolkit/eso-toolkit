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
  Skeleton,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/generated';
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

interface FightDetailsViewProps {
  fight: FightFragment;
  selectedTabId?: number;
  validSelectedTab: number;
  showExperimentalTabs: boolean;
  targets: Array<{ id: string; name: string }>;
  selectedTargetId: string;
  events: LogEvent[];
  eventsLoaded: boolean;
  masterDataLoaded: boolean;
  onNavigateToTab: (tabIdx: number) => void;
  onTargetChange: (event: SelectChangeEvent) => void;
  onToggleExperimentalTabs: () => void;
}

const FightDetailsView: React.FC<FightDetailsViewProps> = ({
  fight,
  validSelectedTab: propValidSelectedTab,
  showExperimentalTabs,
  targets,
  selectedTargetId,
  events,
  eventsLoaded,
  masterDataLoaded,
  onNavigateToTab,
  onTargetChange,
  onToggleExperimentalTabs,
}) => {
  // Calculate the maximum valid tab index based on whether experimental tabs are shown
  const maxTabIndex = showExperimentalTabs ? 11 : 7;
  
  // Ensure the selected tab is within valid bounds
  const validSelectedTab = Math.min(Math.max(0, propValidSelectedTab || 0), maxTabIndex);
  
  // If the prop value was out of bounds, update it
  React.useEffect(() => {
    if (propValidSelectedTab !== validSelectedTab) {
      onNavigateToTab(validSelectedTab);
    }
  }, [propValidSelectedTab, validSelectedTab, onNavigateToTab]);
  // Only render content when events for the current fight are loaded
  if (!eventsLoaded || !masterDataLoaded) {
    return (
      <Box mt={2}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Skeleton variant="rounded" width={220} height={56} />
          <Skeleton variant="rounded" width={220} height={40} />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="circular" width={36} height={36} />
          ))}
        </Box>
        <Skeleton variant="rectangular" height={360} />
      </Box>
    );
  }

  return (
    <React.Fragment>
      {/* Target Selection and Experimental Toggle */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Target Enemy</InputLabel>
          <Select
            value={selectedTargetId}
            label="Target Enemy"
            onChange={onTargetChange}
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
            control={<Switch checked={showExperimentalTabs} onChange={onToggleExperimentalTabs} />}
            label="Show Experimental Tabs"
          />
        </Tooltip>
      </Stack>
      <Box mt={2}>
        <Tabs
          key={showExperimentalTabs ? 'experimental' : 'normal'}
          value={validSelectedTab}
          onChange={(_, v) => onNavigateToTab(v)}
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
                {(
                  Object.entries(
                    events.reduce(
                      (acc, event) => {
                        const type = event.type.toLowerCase();
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    )
                  ) as Array<[string, number]>
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

export default FightDetailsView;
