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
import { getSkeletonForTab, TAB_IDS, TabId } from '../../utils/getSkeletonForTab';

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
import { DebuffsOverviewPanel } from './insights/DebuffsOverviewPanel';
import { InsightsPanel } from './insights/InsightsPanel';
import { PlayersPanel } from './insights/PlayersPanel';
import { TargetSelector } from './insights/TargetSelector';
import { PenetrationPanel } from './penetration/PenetrationPanel';
import { RotationAnalysisPanel } from './rotation/RotationAnalysisPanel';
import { TalentsGridPanel } from './talents/TalentsGridPanel';

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
  isLoading,
  onTabChange,
  showExperimentalTabs,
}) => {
  // Ensure we always have a valid selectedTabId
  const validSelectedTabId = selectedTabId || TAB_IDS.INSIGHTS;

  // Debug the selectedTabId value
  console.log(
    'FightDetailsView render - selectedTabId:',
    selectedTabId,
    'type:',
    typeof selectedTabId,
  );
  console.log(
    'FightDetailsView render - validSelectedTabId:',
    validSelectedTabId,
    'type:',
    typeof validSelectedTabId,
  );
  console.log('Expected TAB_IDS.INSIGHTS:', TAB_IDS.INSIGHTS);
  console.log('Are they equal?', validSelectedTabId === TAB_IDS.INSIGHTS);

  // Only render content when events for the current fight are loaded
  if (isLoading) {
    return (
      <Box mt={2}>
        {/* Target Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200, overflow: 'visible' }}>
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
        {getSkeletonForTab(selectedTabId, false)}
      </Box>
    );
  }

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
            console.log('Tab clicked, value:', v, 'type:', typeof v);
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
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: selectedTabId === TAB_IDS.INSIGHTS ? 'block' : 'none' }}>
          <InsightsPanel fight={fight} />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.PLAYERS ? 'block' : 'none' }}>
          <PlayersPanel />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.DAMAGE_DONE ? 'block' : 'none' }}>
          <DamageDonePanel />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.HEALING_DONE ? 'block' : 'none' }}>
          <HealingDonePanel fight={fight} />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.DEATHS ? 'block' : 'none' }}>
          <DeathEventPanel fight={fight} />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.CRITICAL_DAMAGE ? 'block' : 'none' }}>
          <CriticalDamagePanel />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.PENETRATION ? 'block' : 'none' }}>
          <PenetrationPanel fight={fight} />
        </Box>
        <Box sx={{ display: selectedTabId === TAB_IDS.DAMAGE_REDUCTION ? 'block' : 'none' }}>
          <DamageReductionPanel fight={fight} />
        </Box>
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.LOCATION_HEATMAP ? 'block' : 'none' }}>
            <LocationHeatmapPanel fight={fight} />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.RAW_EVENTS ? 'block' : 'none' }}>
            <EventsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.TARGET_EVENTS ? 'block' : 'none' }}>
            <TargetEventsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.DIAGNOSTICS ? 'block' : 'none' }}>
            <DiagnosticsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.ACTORS ? 'block' : 'none' }}>
            <ActorsPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.TALENTS ? 'block' : 'none' }}>
            <TalentsGridPanel fight={fight} />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.ROTATION_ANALYSIS ? 'block' : 'none' }}>
            <RotationAnalysisPanel fight={fight} />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.AURAS_OVERVIEW ? 'block' : 'none' }}>
            <AurasPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.BUFFS_OVERVIEW ? 'block' : 'none' }}>
            <BuffsOverviewPanel />
          </Box>
        )}
        {showExperimentalTabs && (
          <Box sx={{ display: selectedTabId === TAB_IDS.DEBUFFS_OVERVIEW ? 'block' : 'none' }}>
            <DebuffsOverviewPanel />
          </Box>
        )}
      </Box>
    </React.Fragment>
  );
};
