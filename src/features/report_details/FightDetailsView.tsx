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
import React, { Suspense } from 'react';

import { FightFragment } from '../../graphql/generated';
import { getSkeletonForTab, TAB_IDS, TabId } from '../../utils/getSkeletonForTab';

import { TargetSelector } from './insights/TargetSelector';

// Lazy load heavy panel components for better initial page load performance
const ActorsPanel = React.lazy(() =>
  import('./actors/ActorsPanel').then((module) => ({ default: module.ActorsPanel })),
);
const CriticalDamagePanel = React.lazy(() =>
  import('./critical_damage/CriticalDamagePanel').then((module) => ({
    default: module.CriticalDamagePanel,
  })),
);
const DamageDonePanel = React.lazy(() =>
  import('./damage/DamageDonePanel').then((module) => ({ default: module.DamageDonePanel })),
);
const DamageReductionPanel = React.lazy(() =>
  import('./damage_reduction/DamageReductionPanel').then((module) => ({
    default: module.DamageReductionPanel,
  })),
);
const DeathEventPanel = React.lazy(() =>
  import('./deaths/DeathEventPanel').then((module) => ({ default: module.DeathEventPanel })),
);
const DiagnosticsPanel = React.lazy(() =>
  import('./debug/DiagnosticsPanel').then((module) => ({ default: module.DiagnosticsPanel })),
);
const EventsPanel = React.lazy(() =>
  import('./debug/EventsPanel').then((module) => ({ default: module.EventsPanel })),
);
const LocationHeatmapPanel = React.lazy(() =>
  import('./debug/LocationHeatmapPanel').then((module) => ({
    default: module.LocationHeatmapPanel,
  })),
);
const TargetEventsPanel = React.lazy(() =>
  import('./debug/TargetEventsPanel').then((module) => ({ default: module.TargetEventsPanel })),
);
const HealingDonePanel = React.lazy(() =>
  import('./healing/HealingDonePanel').then((module) => ({ default: module.HealingDonePanel })),
);
const AurasPanel = React.lazy(() =>
  import('./insights/AurasPanel').then((module) => ({ default: module.AurasPanel })),
);
const BuffsOverviewPanel = React.lazy(() =>
  import('./insights/BuffsOverviewPanel').then((module) => ({
    default: module.BuffsOverviewPanel,
  })),
);
const DebuffsOverviewPanel = React.lazy(() =>
  import('./insights/DebuffsOverviewPanel').then((module) => ({
    default: module.DebuffsOverviewPanel,
  })),
);
const InsightsPanel = React.lazy(() =>
  import('./insights/InsightsPanel').then((module) => ({ default: module.InsightsPanel })),
);
const PlayersPanel = React.lazy(() =>
  import('./insights/PlayersPanel').then((module) => ({ default: module.PlayersPanel })),
);
const PenetrationPanel = React.lazy(() =>
  import('./penetration/PenetrationPanel').then((module) => ({ default: module.PenetrationPanel })),
);
const RotationAnalysisPanel = React.lazy(() =>
  import('./rotation/RotationAnalysisPanel').then((module) => ({
    default: module.RotationAnalysisPanel,
  })),
);
const TalentsGridPanel = React.lazy(() =>
  import('./talents/TalentsGridPanel').then((module) => ({ default: module.TalentsGridPanel })),
);

// Panel loading fallback component - uses tab-specific skeleton
const PanelLoadingFallback: React.FC<{ tabId: TabId }> = ({ tabId }) =>
  getSkeletonForTab(tabId, false);

interface FightDetailsViewProps {
  fight: FightFragment;
  selectedTabId?: TabId;
  isLoading: boolean;
  onTabChange: (tabId: TabId) => void;
  showExperimentalTabs: boolean;
}

export const FightDetailsView: React.FC<FightDetailsViewProps> = ({
  fight,
  selectedTabId,
  onTabChange,
  showExperimentalTabs,
}) => {
  // Ensure we always have a valid selectedTabId
  const validSelectedTabId = selectedTabId || TAB_IDS.INSIGHTS;

  return (
    <React.Fragment>
      {/* Target Selection */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200, overflow: 'visible' }}>
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
          overflow: 'visible',
        }}
      >
        <Tabs
          value={validSelectedTabId}
          onChange={(_, v) => {
            onTabChange(v as TabId);
          }}
          sx={{
            minWidth: 'auto',
            flexGrow: 1,
            minHeight: 'auto',
            overflow: 'visible !important',
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
          <Tab
            value={TAB_IDS.INSIGHTS}
            icon={
              <Tooltip title="Insights">
                <InsightsIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.PLAYERS}
            icon={
              <Tooltip title="Players">
                <PeopleIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.DAMAGE_DONE}
            icon={
              <Tooltip title="Damage Done">
                <Icon
                  baseClassName="material-symbols-outlined"
                  sx={{ fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24' }}
                >
                  swords
                </Icon>
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.HEALING_DONE}
            icon={
              <Tooltip title="Healing Done">
                <HealingIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.DEATHS}
            icon={
              <Tooltip title="Deaths">
                <Icon
                  baseClassName="material-symbols-outlined"
                  sx={{ fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24' }}
                >
                  skull
                </Icon>
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.CRITICAL_DAMAGE}
            icon={
              <Tooltip title="Critical Damage">
                <WhatshotIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.PENETRATION}
            icon={
              <Tooltip title="Penetration">
                <SecurityIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TAB_IDS.DAMAGE_REDUCTION}
            icon={
              <Tooltip title="Damage Reduction">
                <ShieldIcon />
              </Tooltip>
            }
          />

          {showExperimentalTabs && (
            <>
              <Tab
                value={TAB_IDS.LOCATION_HEATMAP}
                icon={
                  <Tooltip title="Location Heatmap">
                    <MapIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.RAW_EVENTS}
                icon={
                  <Tooltip title="Raw Events">
                    <ListIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.TARGET_EVENTS}
                icon={
                  <Tooltip title="Target Events">
                    <GpsFixedIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.DIAGNOSTICS}
                icon={
                  <Tooltip title="Diagnostics">
                    <BugReportIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.ACTORS}
                icon={
                  <Tooltip title="Actors">
                    <Person />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.TALENTS}
                icon={
                  <Tooltip title="Talents">
                    <StarIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.ROTATION_ANALYSIS}
                icon={
                  <Tooltip title="Rotation Analysis">
                    <RepeatIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.AURAS_OVERVIEW}
                icon={
                  <Tooltip title="Auras Overview">
                    <AutoAwesomeIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.BUFFS_OVERVIEW}
                icon={
                  <Tooltip title="Buffs Overview">
                    <FlareIcon />
                  </Tooltip>
                }
              />
              <Tab
                value={TAB_IDS.DEBUFFS_OVERVIEW}
                icon={
                  <Tooltip title="Debuffs Overview">
                    <Icon
                      baseClassName="material-symbols-outlined"
                      sx={{ fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24' }}
                    >
                      shield_with_heart
                    </Icon>
                  </Tooltip>
                }
              />
            </>
          )}
        </Tabs>

        {/* Experimental Toggle */}
        <Tooltip
          title={
            <Box>
              <Box>Toggle experimental features</Box>
              <Box sx={{ fontSize: '0.8em', opacity: 0.8, mt: 0.5 }}>
                Includes: Location Heatmap, Raw Events, Target Events, Diagnostics, Actors, Talents,
                Rotation Analysis, Auras Overview, Buffs Overview, and Debuffs Overview
              </Box>
            </Box>
          }
        >
          <FormControlLabel
            control={<Switch checked={showExperimentalTabs} size="small" />}
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
      <Box sx={{ mt: 2, minHeight: '600px' }}>
        {validSelectedTabId === TAB_IDS.INSIGHTS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.INSIGHTS} />}>
            <InsightsPanel fight={fight} />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.PLAYERS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.PLAYERS} />}>
            <PlayersPanel />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.DAMAGE_DONE && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.DAMAGE_DONE} />}>
            <DamageDonePanel />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.HEALING_DONE && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.HEALING_DONE} />}>
            <HealingDonePanel fight={fight} />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.DEATHS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.DEATHS} />}>
            <DeathEventPanel fight={fight} />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.CRITICAL_DAMAGE && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.CRITICAL_DAMAGE} />}>
            <CriticalDamagePanel />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.PENETRATION && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.PENETRATION} />}>
            <PenetrationPanel fight={fight} />
          </Suspense>
        )}
        {validSelectedTabId === TAB_IDS.DAMAGE_REDUCTION && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.DAMAGE_REDUCTION} />}>
            <DamageReductionPanel fight={fight} />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.LOCATION_HEATMAP && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.LOCATION_HEATMAP} />}>
            <LocationHeatmapPanel fight={fight} />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.RAW_EVENTS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.RAW_EVENTS} />}>
            <EventsPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.TARGET_EVENTS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.TARGET_EVENTS} />}>
            <TargetEventsPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.DIAGNOSTICS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.DIAGNOSTICS} />}>
            <DiagnosticsPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.ACTORS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.ACTORS} />}>
            <ActorsPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.TALENTS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.TALENTS} />}>
            <TalentsGridPanel fight={fight} />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.ROTATION_ANALYSIS && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.ROTATION_ANALYSIS} />}>
            <RotationAnalysisPanel fight={fight} />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.AURAS_OVERVIEW && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.AURAS_OVERVIEW} />}>
            <AurasPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.BUFFS_OVERVIEW && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.BUFFS_OVERVIEW} />}>
            <BuffsOverviewPanel />
          </Suspense>
        )}
        {showExperimentalTabs && validSelectedTabId === TAB_IDS.DEBUFFS_OVERVIEW && (
          <Suspense fallback={<PanelLoadingFallback tabId={TAB_IDS.DEBUFFS_OVERVIEW} />}>
            <DebuffsOverviewPanel />
          </Suspense>
        )}
      </Box>
    </React.Fragment>
  );
};
