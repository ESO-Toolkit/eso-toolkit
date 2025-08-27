// Import MUI icons
import BugReportIcon from '@mui/icons-material/BugReport';
import DangerousIcon from '@mui/icons-material/Dangerous';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import HealingIcon from '@mui/icons-material/Healing';
import InsightsIcon from '@mui/icons-material/Insights';
import ListIcon from '@mui/icons-material/List';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import Person from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import SwordsIcon from '@mui/icons-material/SportsMartialArts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import {
  Box,
  Tabs,
  Tab,
  Tooltip,
  FormControl,
  FormControlLabel,
  Switch,
  Stack,
  Skeleton,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/generated';

import { ActorsPanel } from './actors/ActorsPanel';
import { CriticalDamagePanel } from './critical_damage/CriticalDamagePanel';
import { DamageDonePanel } from './damage/DamageDonePanel';
import { DeathEventPanel } from './deaths/DeathEventPanel';
import { DiagnosticsPanel } from './debug/DiagnosticsPanel';
import { EventsPanel } from './debug/EventsPanel';
import { LocationHeatmapPanel } from './debug/LocationHeatmapPanel';
import { TargetEventsPanel } from './debug/TargetEventsPanel';
import { HealingDonePanel } from './healing/HealingDonePanel';
import { InsightsPanel } from './insights/InsightsPanel';
import { PlayersPanel } from './insights/PlayersPanel';
import { TargetSelector } from './insights/TargetSelector';
import { PenetrationPanel } from './penetration/PenetrationPanel';

interface FightDetailsViewProps {
  fight: FightFragment;
  selectedTabId?: number;
  validSelectedTab: number;
  showExperimentalTabs: boolean;
  targets: Array<{ id: string; name: string }>;
  loading: boolean;
  onNavigateToTab: (tabIdx: number) => void;
  onToggleExperimentalTabs: () => void;
}

export const FightDetailsView: React.FC<FightDetailsViewProps> = ({
  fight,
  validSelectedTab,
  showExperimentalTabs,
  loading,
  onNavigateToTab,
  onToggleExperimentalTabs,
}) => {
  // Only render content when events for the current fight are loaded
  if (loading) {
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
          <TargetSelector />
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

          {showExperimentalTabs && (
            <Tooltip title="Actors">
              <Tab icon={<Person />} />
            </Tooltip>
          )}
        </Tabs>
        {validSelectedTab === 0 && <InsightsPanel fight={fight} />}
        {validSelectedTab === 1 && <PlayersPanel />}
        {validSelectedTab === 2 && <DeathEventPanel fight={fight} />}
        {validSelectedTab === 3 && <DamageDonePanel fight={fight} />}
        {validSelectedTab === 4 && <HealingDonePanel fight={fight} />}
        {validSelectedTab === 6 && <CriticalDamagePanel fight={fight} />}
        {validSelectedTab === 7 && <PenetrationPanel fight={fight} />}
        {showExperimentalTabs && validSelectedTab === 8 && <LocationHeatmapPanel fight={fight} />}
        {showExperimentalTabs && validSelectedTab === 9 && <EventsPanel />}
        {showExperimentalTabs && validSelectedTab === 10 && <TargetEventsPanel />}
        {showExperimentalTabs && validSelectedTab === 11 && <DiagnosticsPanel />}
        {showExperimentalTabs && validSelectedTab === 12 && <ActorsPanel />}
      </Box>
    </React.Fragment>
  );
};
