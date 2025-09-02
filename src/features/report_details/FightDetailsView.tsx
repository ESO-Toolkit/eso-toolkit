// Import MUI icons
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BugReportIcon from '@mui/icons-material/BugReport';
import FlareIcon from '@mui/icons-material/Flare';
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
  Skeleton,
  Icon,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/generated';
import { getSkeletonForTab } from '../../utils/getSkeletonForTab';

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
import { AurasPanel } from './insights/AurasPanel';
import { BuffsOverviewPanel } from './insights/BuffsOverviewPanel';
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
        {/* Target Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <Skeleton variant="rounded" width={200} height={56} />
          </FormControl>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flexGrow: 1,
              minWidth: 'auto',
              '& > *': { flexShrink: 0 },
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="circular" width={36} height={36} />
            ))}
          </Box>
          <Skeleton variant="rounded" width={140} height={32} sx={{ ml: 1 }} />
        </Box>

        {/* Content area - show appropriate skeleton for each tab */}
        {getSkeletonForTab(validSelectedTab, false)}
      </Box>
    );
  }

  return (
    <React.Fragment>
      {/* Target Selection */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <TargetSelector />
        </FormControl>
      </Box>

      {/* Tabs with integrated experimental toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Tabs
          key={showExperimentalTabs ? 'experimental' : 'normal'}
          value={validSelectedTab}
          onChange={(_, v) => onNavigateToTab(v)}
          sx={{
            minWidth: 'auto',
            flexGrow: 1,
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              backgroundColor: '#406374',
              transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            },
            '& .MuiTabs-flexContainer': {
              gap: '8px',
              justifyContent: 'flex-start',
              padding: '0 0px',
              margin: 0,
              minHeight: 'auto',
            },
            '& .MuiTabs-scroller': {
              overflow: 'auto !important',
              padding: '0 0px',
              margin: 0,
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
            },
            '& .MuiTabs-scrollButtons': {
              width: 32,
              minWidth: 32,
              padding: 0,
              margin: 0,
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            },
            '& .MuiTab-root': {
              minWidth: 48,
              minHeight: 48,
              padding: '6px 12px',
              margin: 0,
              opacity: 1,
              borderRadius: 100,
            },
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tooltip title="Insights">
            <Tab icon={<InsightsIcon />} />
          </Tooltip>
          <Tooltip title="Players">
            <Tab icon={<PeopleIcon />} />
          </Tooltip>
          <Tooltip title="Damage Done">
            <Tab
              icon={
                <Icon
                  baseClassName="material-symbols-outlined"
                  sx={{ fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24' }}
                >
                  swords
                </Icon>
              }
            />
          </Tooltip>
          <Tooltip title="Healing Done">
            <Tab icon={<HealingIcon />} />
          </Tooltip>
          <Tooltip title="Deaths">
            <Tab
              icon={
                <Icon
                  baseClassName="material-symbols-outlined"
                  sx={{ fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24' }}
                >
                  skull
                </Icon>
              }
            />
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
          {showExperimentalTabs && (
            <Tooltip title="Auras Overview">
              <Tab icon={<AutoAwesomeIcon />} />
            </Tooltip>
          )}
          {showExperimentalTabs && (
            <Tooltip title="Buffs Overview">
              <Tab icon={<FlareIcon />} />
            </Tooltip>
          )}
        </Tabs>

        {/* Experimental Toggle */}
        <Tooltip
          title={
            <Box>
              <Box>Toggle experimental features</Box>
              <Box sx={{ fontSize: '0.8em', opacity: 0.8, mt: 0.5 }}>
                Includes: Location Heatmap, Raw Events, Target Events, Diagnostics, Actors, Talents,
                and Rotation Analysis
              </Box>
            </Box>
          }
        >
          <FormControlLabel
            control={
              <Switch
                checked={showExperimentalTabs}
                onChange={onToggleExperimentalTabs}
                size="small"
              />
            }
            label={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                🧪
              </Box>
            }
            sx={{
              flexShrink: 0,
              margin: 0,
              '& .MuiFormControlLabel-label': { margin: 0, padding: '8px 0' },
            }}
          />
        </Tooltip>
      </Box>

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: validSelectedTab === 0 ? 'block' : 'none' }}>
          <InsightsPanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 1 ? 'block' : 'none' }}>
          <PlayersPanel />
        </Box>
        <Box sx={{ display: validSelectedTab === 2 ? 'block' : 'none' }}>
          <DamageDonePanel />
        </Box>
        <Box sx={{ display: validSelectedTab === 3 ? 'block' : 'none' }}>
          <HealingDonePanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 4 ? 'block' : 'none' }}>
          <DeathEventPanel fight={fight} />
        </Box>
        <Box sx={{ display: validSelectedTab === 5 ? 'block' : 'none' }}>
          <CriticalDamagePanel />
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
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 15 ? 'block' : 'none' }}>
            <AurasPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: validSelectedTab === 16 ? 'block' : 'none' }}>
            <BuffsOverviewPanel />
          </Box>
        )}
      </Box>
    </React.Fragment>
  );
};
