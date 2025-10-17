// Import MUI icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
import TerrainIcon from '@mui/icons-material/Terrain';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import {
  Box,
  Tabs,
  Tab,
  Tooltip,
  FormControl,
  FormControlLabel,
  Switch,
  Icon,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { Suspense } from 'react';

import { AnimatedTabContent } from '../../components/AnimatedTabContent';
import { FightFragment } from '../../graphql/gql/graphql';
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import { getSkeletonForTab, TabId } from '../../utils/getSkeletonForTab';

import { CriticalDamagePanel } from './critical_damage/CriticalDamagePanel';
import { TargetSelector } from './insights/TargetSelector';
import { useFightNavigation } from './ReportFightHeader';

// Lazy load heavy panel components for better initial page load performance
const ActorsPanel = React.lazy(() =>
  import('./actors/ActorsPanel').then((module) => ({ default: module.ActorsPanel })),
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
const MapsPanel = React.lazy(() =>
  import('./maps/MapsPanel').then((module) => ({ default: module.MapsPanel })),
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

// Panel loading fallback component - uses minimal skeleton for tab switching
const PanelLoadingFallback: React.FC<{ tabId: TabId }> = ({ tabId }) => (
  <Box sx={{ minHeight: 400, width: '100%' }}>{getSkeletonForTab(tabId, false, true)}</Box>
);

interface FightDetailsViewProps {
  fight: FightFragment;
  selectedTabId?: TabId;
  isLoading: boolean;
  onTabChange: (tabId: TabId) => void;
  showExperimentalTabs: boolean;
  onToggleExperimentalTabs: (enabled: boolean) => void;
}

export const FightDetailsView: React.FC<FightDetailsViewProps> = ({
  fight,
  selectedTabId,
  onTabChange,
  showExperimentalTabs,
  onToggleExperimentalTabs,
}) => {
  const phaseTransitionInfo = usePhaseTransitions(fight);

  // Define experimental tabs array
  const experimentalTabs: TabId[] = [
    TabId.LOCATION_HEATMAP,
    TabId.RAW_EVENTS,
    TabId.TARGET_EVENTS,
    TabId.DIAGNOSTICS,
    TabId.ACTORS,
    TabId.TALENTS,
    TabId.ROTATION_ANALYSIS,
    TabId.AURAS_OVERVIEW,
    TabId.BUFFS_OVERVIEW,
    TabId.DEBUFFS_OVERVIEW,
    TabId.MAPS,
  ];

  // Ensure we have a valid selectedTabId based on what tabs are actually rendered
  const getValidTabId = (tabId: TabId | undefined): TabId => {
    if (!tabId) return TabId.INSIGHTS;

    // If experimental tabs are disabled and the selected tab is experimental, use INSIGHTS
    if (!showExperimentalTabs && experimentalTabs.includes(tabId)) {
      return TabId.INSIGHTS;
    }

    return tabId;
  };

  const validSelectedTabId = getValidTabId(selectedTabId);

  // Get navigation data and functions
  const {
    navigationMode,
    navigationData,
    navigateToPrevious,
    navigateToNext,
    handleNavigationModeChange,
  } = useFightNavigation();

  // Theme support for light/dark mode
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <React.Fragment>
      {/* Target Selection and Navigation Row */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          gap: { xs: 2, md: 0 },
        }}
      >
        <FormControl
          sx={{
            minWidth: { xs: '100%', sm: 180, md: 200 },
            maxWidth: { xs: '100%', md: 'none' },
            overflow: 'visible',
          }}
        >
          <TargetSelector />
        </FormControl>

        {/* Fight Navigation - aligned with target selector */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: { xs: '10px', md: '12px' },
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
            p: { xs: 0.5, md: 0.75 },
            gap: { xs: 0.25, md: 0.5 },
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-start' },
            minWidth: 0, // Allow shrinking
          }}
        >
          {/* Previous Button */}
          <IconButton
            onClick={navigateToPrevious}
            disabled={!navigationData.previousFight}
            size="small"
            sx={{
              width: { xs: 32, md: 28 },
              height: { xs: 32, md: 28 },
              borderRadius: { xs: '6px', md: '8px' },
              backgroundColor: 'transparent',
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                transform: 'scale(1.05)',
              },
              '&:disabled': {
                opacity: 0.3,
                cursor: 'not-allowed',
              },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          {/* Mode Toggle */}
          <ToggleButtonGroup
            value={navigationMode}
            onChange={handleNavigationModeChange}
            exclusive
            size="small"
            sx={{
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: '8px',
              border: 'none',
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none',
                '&:not(:first-of-type)': {
                  borderLeft: 'none',
                },
                '&:first-of-type': {
                  borderTopLeftRadius: '6px',
                  borderBottomLeftRadius: '6px',
                },
                '&:last-of-type': {
                  borderTopRightRadius: '6px',
                  borderBottomRightRadius: '6px',
                },
              },
              '& .MuiToggleButton-root': {
                px: { xs: 1.25, md: 1.5 },
                py: 0.5,
                fontSize: { xs: '0.75rem', md: '0.75rem' },
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 'auto',
                height: { xs: 32, md: 28 },
                border: 'none',
                borderRadius: '6px',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                },
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #9333ea, #8b5cf6)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(147, 51, 234, 0.4), 0 1px 3px rgba(147, 51, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                    color: 'white',
                    transform: 'scale(1.02)',
                  },
                },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="bosses">Bosses</ToggleButton>
          </ToggleButtonGroup>

          {/* Counter */}
          <Box
            sx={{
              px: { xs: 1, md: 1.5 },
              py: 0.5,
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderRadius: { xs: '6px', md: '8px' },
              minWidth: { xs: '40px', md: '48px' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: { xs: 32, md: 'auto' },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 600,
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.025em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {navigationData.currentIndex >= 0 && navigationData.totalCount > 0
                ? `${navigationData.currentIndex + 1}/${navigationData.totalCount}`
                : navigationData.previousFight || navigationData.nextFight
                  ? `—/${navigationData.totalCount}`
                  : '0/0'}
            </Typography>
          </Box>

          {/* Next Button */}
          <IconButton
            onClick={navigateToNext}
            disabled={!navigationData.nextFight}
            size="small"
            sx={{
              width: { xs: 32, md: 28 },
              height: { xs: 32, md: 28 },
              borderRadius: { xs: '6px', md: '8px' },
              backgroundColor: 'transparent',
              color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                transform: 'scale(1.05)',
              },
              '&:disabled': {
                opacity: 0.3,
                cursor: 'not-allowed',
              },
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>
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
          maxWidth: '100vw',
        }}
      >
        <Tabs
          value={validSelectedTabId}
          onChange={(_, v) => {
            onTabChange(v as TabId);
          }}
          sx={{
            minWidth: 0,
            flexGrow: 1,
            minHeight: 'auto',
            overflow: 'visible',
            maxWidth: 'calc(100vw - 80px)', // Leave space for experimental toggle
            '& .MuiTabs-indicator': {
              display: 'none',
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
              flexShrink: 0,
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
              flexShrink: 0,
            },
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            value={TabId.INSIGHTS}
            icon={
              <Tooltip title="Insights">
                <InsightsIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TabId.PLAYERS}
            icon={
              <Tooltip title="Players">
                <PeopleIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TabId.DAMAGE_DONE}
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
            value={TabId.HEALING_DONE}
            icon={
              <Tooltip title="Healing Done">
                <HealingIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TabId.DEATHS}
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
            value={TabId.CRITICAL_DAMAGE}
            icon={
              <Tooltip title="Critical Damage">
                <WhatshotIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TabId.PENETRATION}
            icon={
              <Tooltip title="Penetration">
                <SecurityIcon />
              </Tooltip>
            }
          />
          <Tab
            value={TabId.DAMAGE_REDUCTION}
            icon={
              <Tooltip title="Damage Reduction">
                <ShieldIcon />
              </Tooltip>
            }
          />

          {/* Always render experimental tabs, but hide them when disabled */}
          <Tab
            value={TabId.LOCATION_HEATMAP}
            icon={
              <Tooltip title="Location Heatmap">
                <MapIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.RAW_EVENTS}
            icon={
              <Tooltip title="Raw Events">
                <ListIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.TARGET_EVENTS}
            icon={
              <Tooltip title="Target Events">
                <GpsFixedIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.DIAGNOSTICS}
            icon={
              <Tooltip title="Diagnostics">
                <BugReportIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.ACTORS}
            icon={
              <Tooltip title="Actors">
                <Person />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.TALENTS}
            icon={
              <Tooltip title="Talents">
                <StarIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.ROTATION_ANALYSIS}
            icon={
              <Tooltip title="Rotation Analysis">
                <RepeatIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.AURAS_OVERVIEW}
            icon={
              <Tooltip title="Auras Overview">
                <AutoAwesomeIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.BUFFS_OVERVIEW}
            icon={
              <Tooltip title="Buffs Overview">
                <FlareIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.DEBUFFS_OVERVIEW}
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
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
          <Tab
            value={TabId.MAPS}
            icon={
              <Tooltip title="Maps">
                <TerrainIcon />
              </Tooltip>
            }
            sx={{ display: showExperimentalTabs ? 'inline-flex' : 'none' }}
          />
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
            control={
              <Switch
                checked={showExperimentalTabs}
                onChange={(e) => onToggleExperimentalTabs(e.target.checked)}
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
      <Box sx={{ mt: 2 }} data-testid="fight-tab-content-container">
        <AnimatedTabContent
          tabKey={validSelectedTabId}
          data-testid={`tab-content-${validSelectedTabId}`}
        >
          {validSelectedTabId === TabId.INSIGHTS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.INSIGHTS} />}>
              <InsightsPanel fight={fight} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.PLAYERS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.PLAYERS} />}>
              <PlayersPanel />
            </Suspense>
          )}
          {validSelectedTabId === TabId.DAMAGE_DONE && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.DAMAGE_DONE} />}>
              <DamageDonePanel phaseTransitionInfo={phaseTransitionInfo} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.HEALING_DONE && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.HEALING_DONE} />}>
              <HealingDonePanel fight={fight} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.DEATHS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.DEATHS} />}>
              <DeathEventPanel fight={fight} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.CRITICAL_DAMAGE && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.CRITICAL_DAMAGE} />}>
              <CriticalDamagePanel phaseTransitionInfo={phaseTransitionInfo} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.PENETRATION && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.PENETRATION} />}>
              <PenetrationPanel fight={fight} phaseTransitionInfo={phaseTransitionInfo} />
            </Suspense>
          )}
          {validSelectedTabId === TabId.DAMAGE_REDUCTION && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.DAMAGE_REDUCTION} />}>
              <DamageReductionPanel fight={fight} phaseTransitionInfo={phaseTransitionInfo} />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.LOCATION_HEATMAP && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.LOCATION_HEATMAP} />}>
              <LocationHeatmapPanel fight={fight} />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.RAW_EVENTS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.RAW_EVENTS} />}>
              <EventsPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.TARGET_EVENTS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.TARGET_EVENTS} />}>
              <TargetEventsPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.DIAGNOSTICS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.DIAGNOSTICS} />}>
              <DiagnosticsPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.ACTORS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.ACTORS} />}>
              <ActorsPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.TALENTS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.TALENTS} />}>
              <TalentsGridPanel fight={fight} />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.ROTATION_ANALYSIS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.ROTATION_ANALYSIS} />}>
              <RotationAnalysisPanel fight={fight} />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.AURAS_OVERVIEW && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.AURAS_OVERVIEW} />}>
              <AurasPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.BUFFS_OVERVIEW && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.BUFFS_OVERVIEW} />}>
              <BuffsOverviewPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.DEBUFFS_OVERVIEW && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.DEBUFFS_OVERVIEW} />}>
              <DebuffsOverviewPanel />
            </Suspense>
          )}
          {showExperimentalTabs && validSelectedTabId === TabId.MAPS && (
            <Suspense fallback={<PanelLoadingFallback tabId={TabId.MAPS} />}>
              <MapsPanel fight={fight} />
            </Suspense>
          )}
        </AnimatedTabContent>
      </Box>
    </React.Fragment>
  );
};
