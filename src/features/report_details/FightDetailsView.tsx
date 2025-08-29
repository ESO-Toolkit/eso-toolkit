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
import RepeatIcon from '@mui/icons-material/Repeat';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import SwordsIcon from '@mui/icons-material/SportsMartialArts';
import StarIcon from '@mui/icons-material/Star';
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
import { DamageReductionPanel } from './damage_reduction/DamageReductionPanel';
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
import { RotationAnalysisPanel } from './rotation/RotationAnalysisPanel';
import { TalentsGridPanel } from './talents/TalentsGridPanel';

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
        <Tooltip title="Enable experimental tabs: Location Heatmap, Raw Events, Target Events, Diagnostics, Actors, Talents, and Rotation Analysis">
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
          <Tooltip title="Critical Damage">
            <Tab icon={<WhatshotIcon />} />
          </Tooltip>
          <Tooltip title="Penetration">
            <Tab icon={<SecurityIcon />} />
          </Tooltip>
          <Tooltip title="Damage Reduction">
            <Tab icon={<ShieldIcon />} />
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

          {showExperimentalTabs && (
            <Tooltip title="Talents">
              <Tab icon={<StarIcon />} />
            </Tooltip>
          )}

          {showExperimentalTabs && (
            <Tooltip title="Rotation Analysis">
              <Tab icon={<RepeatIcon />} />
            </Tooltip>
          )}
        </Tabs>
        <Box sx={{ display: validSelectedTab === 0 ? 'block' : 'none' }}>
          <InsightsPanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 1 ? 'block' : 'none' }}>
          <PlayersPanel />
        </Box>
        <Box sx={{ display: validSelectedTab === 2 ? 'block' : 'none' }}>
          <DeathEventPanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 3 ? 'block' : 'none' }}>
          <DamageDonePanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 4 ? 'block' : 'none' }}>
          <HealingDonePanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 5 ? 'block' : 'none' }}>
          <CriticalDamagePanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 6 ? 'block' : 'none' }}>
          <PenetrationPanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 7 ? 'block' : 'none' }}>
          <DamageReductionPanel fight={fight} />
        </Box>
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 8 ? 'block' : 'none' }}>
            <LocationHeatmapPanel fight={fight} />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 9 ? 'block' : 'none' }}>
            <EventsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 10 ? 'block' : 'none' }}>
            <TargetEventsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 11 ? 'block' : 'none' }}>
            <DiagnosticsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 12 ? 'block' : 'none' }}>
            <ActorsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 13 ? 'block' : 'none' }}>
            <TalentsGridPanel fight={fight} />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 14 ? 'block' : 'none' }}>
            <RotationAnalysisPanel fight={fight} />
          </Box>
        )}
      </Box>
    </React.Fragment>
  );
};
