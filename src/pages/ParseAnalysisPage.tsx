/**
 * Parse Analysis Page
 * Analyzes ESO parse logs to provide insights on:
 * - Food/drink usage (stamina or magicka recovery)
 * - Casts per minute (CPM)
 * - Weave accuracy (light attack -> skill pattern)
 * - Buff source analysis (trial dummy vs player buffs)
 */

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { AbilityIcon } from '../components/AbilityIcon';
import { WorkInProgressDisclaimer } from '../components/WorkInProgressDisclaimer';
import { useAbilityIdMapper } from '../contexts/AbilityIdMapperContext';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { BuffChecklist } from '../features/parse_analysis/components/BuffChecklist';
import { BuildIssuesPanel } from '../features/parse_analysis/components/BuildIssuesPanel';
import { DebuffChecklist } from '../features/parse_analysis/components/DebuffChecklist';
import { ParseChecklist } from '../features/parse_analysis/components/ParseChecklist';
import { TRIAL_DUMMY_TARGET_NAMES } from '../features/parse_analysis/constants/trialDummyConstants';
import { BuffChecklistResult } from '../features/parse_analysis/types/buffChecklist';
import { DebuffChecklistResult } from '../features/parse_analysis/types/debuffChecklist';
import type { ParseChecklistItem } from '../features/parse_analysis/types/parseChecklist';
import { analyzeBuffChecklist } from '../features/parse_analysis/utils/buffChecklistUtils';
import { analyzeDebuffChecklist } from '../features/parse_analysis/utils/debuffChecklistUtils';
import {
  detectFood,
  calculateCPM,
  calculateActivePercentage,
  calculateDPS,
  analyzeRotation,
  analyzeWeaving,
  analyzeBarSwaps,
  analyzeUltimateUsage,
  analyzeDotUptime,
  detectMundusStone,
  analyzeResourceSustain,
  estimatePenCritCap,
  type FoodDetectionResult,
  type WeaveAnalysisResult,
  type DPSResult,
  type RotationAnalysisResult,
  type ActivePercentageResult,
  type BarSwapAnalysisResult,
  type UltimateUsageResult,
  type DotUptimeResult,
  type MundusStoneResult,
  type ResourceSustainResult,
  type PenCritCapResult,
} from '../features/parse_analysis/utils/parseAnalysisUtils';
import { buildParseChecklist } from '../features/parse_analysis/utils/parseChecklistUtils';
import {
  GetReportByCodeDocument,
  GetPlayersForReportDocument,
  type GetReportByCodeQuery,
  type GetPlayersForReportQuery,
} from '../graphql/gql/graphql';
import { useCastEvents } from '../hooks/events/useCastEvents';
import { useCombatantInfoEvents } from '../hooks/events/useCombatantInfoEvents';
import { useDamageEvents } from '../hooks/events/useDamageEvents';
import { useDebuffEvents } from '../hooks/events/useDebuffEvents';
import { useFriendlyBuffEvents } from '../hooks/events/useFriendlyBuffEvents';
import { useReportData } from '../hooks/useReportData';
import { useReportMasterData } from '../hooks/useReportMasterData';
import { useRoleColors } from '../hooks/useRoleColors';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { setParseReport, clearParseReport } from '../store/parse_analysis/parseAnalysisSlice';
import { setReportData } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';
import { createBuffLookup } from '../utils/BuffLookupUtils';
import { detectBuildIssues, type BuildIssue } from '../utils/detectBuildIssues';
import { Logger, LogLevel } from '../utils/logger';

interface ParseAnalysisState {
  loading: boolean;
  error: string | null;
  reportCode: string | null;
  fightId: number | null;
  fightName: string | null;
  playerId: number | null;
  playerName: string | null;
  fightStartTime: number | null;
  fightEndTime: number | null;
  foodResult: FoodDetectionResult | null;
  cpm: number | null;
  weaveResult: WeaveAnalysisResult | null;
  buffChecklist: BuffChecklistResult | null;
  debuffChecklist: DebuffChecklistResult | null;
  dpsResult: DPSResult | null;
  rotationResult: RotationAnalysisResult | null;
  activeTimeResult: ActivePercentageResult | null;
  buildIssues: BuildIssue[] | null;
  parseChecklist: ParseChecklistItem[] | null;
  barSwapResult: BarSwapAnalysisResult | null;
  ultimateResult: UltimateUsageResult | null;
  dotUptimeResult: DotUptimeResult | null;
  mundusResult: MundusStoneResult | null;
  resourceSustainResult: ResourceSustainResult | null;
  penCritCapResult: PenCritCapResult | null;
}

interface PlayerRoleEntry {
  id: number | null;
  name: string | null;
}

interface PlayerDetailsGroup {
  dps: PlayerRoleEntry[];
  healers: PlayerRoleEntry[];
  tanks: PlayerRoleEntry[];
}

const extractPlayerDetailsGroup = (rawPlayerDetails: unknown): PlayerDetailsGroup | null => {
  if (!rawPlayerDetails || typeof rawPlayerDetails !== 'object') {
    return null;
  }

  const payload = (rawPlayerDetails as { data?: unknown }).data;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const details = (payload as { playerDetails?: unknown }).playerDetails;
  if (!details || typeof details !== 'object') {
    return null;
  }

  const normalizeGroup = (group: unknown): PlayerRoleEntry[] => {
    if (!Array.isArray(group)) {
      return [];
    }

    return group
      .filter(
        (entry): entry is Record<string, unknown> => entry != null && typeof entry === 'object',
      )
      .map((entry) => {
        const typedEntry = entry as { id?: unknown; name?: unknown };
        return {
          id: typeof typedEntry.id === 'number' ? typedEntry.id : null,
          name: typeof typedEntry.name === 'string' ? typedEntry.name : null,
        };
      });
  };

  const structured = details as { dps?: unknown; healers?: unknown; tanks?: unknown };

  return {
    dps: normalizeGroup(structured.dps),
    healers: normalizeGroup(structured.healers),
    tanks: normalizeGroup(structured.tanks),
  };
};

const extractReportInfo = (url: string): { reportId: string; fightId: string | null } | null => {
  const reportMatch = url.match(/reports\/([A-Za-z0-9]+)/);
  if (!reportMatch) return null;

  const reportId = reportMatch[1];
  let fightId: string | null = null;

  const hashFightMatch = url.match(/#fight=(\d+)/);
  if (hashFightMatch) {
    fightId = hashFightMatch[1];
  }

  const queryFightMatch = url.match(/[?&]fight=(\d+)/);
  if (queryFightMatch) {
    fightId = queryFightMatch[1];
  }

  const pathFightMatch = url.match(/reports\/[A-Za-z0-9]+\/(\d+)/);
  if (pathFightMatch) {
    fightId = pathFightMatch[1];
  }

  return { reportId, fightId };
};

/** How often to poll for new fights added to the report while the page is open */
const POLL_INTERVAL_MS = 15_000;

/**
 * Public demo log users can explore the parse analysis tool without their own log.
 * Report: https://www.esologs.com/reports/KxZcrWHAjLaYvm38?fight=1
 */
const DEMO_LOG_REPORT_ID = 'KxZcrWHAjLaYvm38';
const DEMO_LOG_FIGHT_ID = '1';
const DEMO_LOG_URL = `https://www.esologs.com/reports/${DEMO_LOG_REPORT_ID}?fight=${DEMO_LOG_FIGHT_ID}`;

const logger = new Logger({
  level: LogLevel.DEBUG,
  contextPrefix: 'ParseAnalysisPage',
});

/** Readable food type labels — avoids a 10-level ternary chain */
const FOOD_TYPE_LABELS: Record<string, string> = {
  'tri-stat': 'Tri-Stat Food (Max Health, Magicka & Stamina)',
  stamina: 'Stamina Recovery Food',
  magicka: 'Magicka Recovery Food',
  'health-stamina': 'Health + Stamina Food',
  'health-magicka': 'Health + Magicka Food',
  'magicka-stamina': 'Magicka + Stamina Food',
  'stamina-magicka-recovery': 'Max Stamina + Magicka Recovery Food',
  'health-regen': 'Health + Regeneration Food',
  event: 'Event Food/Drink',
  'xp-boost': 'Experience Boost Food',
};

/**
 * Inner component that uses hooks from ReportFightProvider context
 * This must be rendered as a child of ReportFightProvider
 */
const ParseAnalysisPageContent: React.FC = () => {
  const roleColors = useRoleColors();
  const theme = useTheme();

  React.useEffect(() => {
    document.title = 'Parse Analysis | ESO Toolkit';
  }, []);

  /**
   * Get theme-aware semantic color for text display.
   * Dark mode uses brighter tints than MUI's auto-generated .light variants
   * for sufficient contrast on dark backgrounds (~#111827).
   */
  const getMetricColor = (excellent: boolean, good: boolean): string => {
    const isDark = theme.palette.mode === 'dark';
    if (excellent) {
      return isDark ? '#4ade80' : theme.palette.success.main; // green-400
    }
    if (good) {
      return isDark ? '#fbbf24' : theme.palette.warning.main; // amber-400
    }
    return isDark ? '#f87171' : theme.palette.error.main; // red-400
  };

  /** Shared glass-card styles */
  const glassCardSx = {
    ...roleColors.getAccordionStyles(),
  } as const;

  /** Accordion variant — adds the MUI default-divider suppression */
  const glassAccordionSx = {
    ...glassCardSx,
    '&:before': { display: 'none' },
  };
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportId: contextReportId, fightId: contextFightId } = useSelectedReportAndFight();
  const [logUrl, setLogUrl] = useState('');
  const abilityMapper = useAbilityIdMapper();
  const { castEvents, isCastEventsLoading, isCastEventsLoaded } = useCastEvents({
    restrictToFightWindow: false,
  });
  const { damageEvents, isDamageEventsLoading } = useDamageEvents({ restrictToFightWindow: false });
  const { friendlyBuffEvents } = useFriendlyBuffEvents({ restrictToFightWindow: false });
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents({
    restrictToFightWindow: false,
  });
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents({ restrictToFightWindow: false });

  const createInitialParseState = useCallback(
    (): ParseAnalysisState => ({
      loading: false,
      error: null,
      reportCode: null,
      fightId: null,
      fightName: null,
      playerId: null,
      playerName: null,
      fightStartTime: null,
      fightEndTime: null,
      foodResult: null,
      cpm: null,
      weaveResult: null,
      buffChecklist: null,
      debuffChecklist: null,
      dpsResult: null,
      rotationResult: null,
      activeTimeResult: null,
      buildIssues: null,
      parseChecklist: null,
      barSwapResult: null,
      ultimateResult: null,
      dotUptimeResult: null,
      mundusResult: null,
      resourceSustainResult: null,
      penCritCapResult: null,
    }),
    [],
  );

  // Debug: Log context changes
  useEffect(() => {
    logger.debug('ReportFightContext updated', {
      reportId: contextReportId,
      fightId: contextFightId,
    });
  }, [contextReportId, contextFightId]);

  // CRITICAL: Load report data (including fights) - this is needed for event hooks to work
  const { reportData, isReportLoading } = useReportData();

  // Load master data (abilities and actors) - needed for ability name resolution
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  useEffect(() => {
    logger.debug('Report data load status', {
      isLoading: isReportLoading,
      fightsCount: reportData?.fights?.length ?? 0,
    });
  }, [reportData, isReportLoading]);

  useEffect(() => {
    logger.debug('Master data load status', {
      isLoading: isMasterDataLoading,
      abilitiesCount: Object.keys(reportMasterData.abilitiesById).length,
      actorsCount: Object.keys(reportMasterData.actorsById).length,
      loaded: reportMasterData.loaded,
    });
  }, [reportMasterData, isMasterDataLoading]);

  useEffect(() => {
    logger.debug('Ability mapper availability check', {
      isLoaded: abilityMapper.isDataLoaded(),
      sampleAbility: abilityMapper.getAbilityById(1234),
    });
  }, [abilityMapper]);

  // Track the last report/fight combo we auto-loaded from URL parameters
  const lastAutoLoadedContextRef = React.useRef<string | null>(null);

  // Modal state for weave details
  const [weaveDetailsOpen, setWeaveDetailsOpen] = useState(false);

  const [state, setState] = useState<ParseAnalysisState>(() => createInitialParseState());
  const fightDurationMs =
    state.activeTimeResult?.fightDurationMs ??
    (state.fightStartTime != null && state.fightEndTime != null
      ? Math.max(0, state.fightEndTime - state.fightStartTime)
      : null);

  const formatDuration = React.useCallback((ms: number): string => {
    if (!Number.isFinite(ms) || ms < 0) {
      return 'Unknown';
    }

    const totalSeconds = ms / 1000;
    const roundedSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const seconds = roundedSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }, []);

  // Track when we're waiting for events to load for analysis
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    playerId: number;
    playerName: string;
    fightStartTime: number;
    fightEndTime: number;
    dummyId: number; // Trial dummy ID for buff analysis
  } | null>(null);

  /** Supported dummy fights found in the current report — drives the navigation strip and polling */
  const [availableFights, setAvailableFights] = useState<Array<{ id: number; name: string }>>([]);

  /** Fight IDs excluded from the visible fight list via the dismiss (x) button */
  const [excludedFightIds, setExcludedFightIds] = useState<Set<number>>(new Set());

  const excludeFight = useCallback((fightId: number) => {
    setExcludedFightIds((prev) => {
      const next = new Set(prev);
      next.add(fightId);
      return next;
    });
  }, []);

  const resetExcludedFights = useCallback(() => {
    setExcludedFightIds(new Set());
  }, []);

  // Core analysis function - fetches fight/player data and triggers event loading
  const analyzeReport = useCallback(
    async (reportId: string, fightId: string | null): Promise<void> => {
      // Check if client is ready
      if (!client || !isReady || !isLoggedIn) {
        logger.warn(
          'Cannot analyze report because client is not ready or user is not authenticated',
        );
        setState((prev) => ({
          ...prev,
          error: 'Please log in to analyze reports',
        }));
        return;
      }

      // Step 1: Fetch report data to get fights
      const reportResponse = await client.query<GetReportByCodeQuery>({
        query: GetReportByCodeDocument,
        variables: {
          code: reportId,
        },
        fetchPolicy: 'no-cache',
      });

      const report = reportResponse.reportData?.report;
      if (!report || !report.fights || report.fights.length === 0) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No fights found in this report.',
        }));
        return;
      }

      // Collect all supported dummy fights in this report for fight navigation
      const allSupportedFights = (report.fights ?? []).filter(
        (f): f is NonNullable<typeof f> =>
          f != null && TRIAL_DUMMY_TARGET_NAMES.some((name) => f.name?.includes(name)),
      );
      setAvailableFights(
        allSupportedFights.map((f) => ({ id: f.id, name: f.name ?? `Fight ${f.id}` })),
      );

      // Get the latest fight (or the specified fight)
      let selectedFight;
      if (fightId) {
        selectedFight = report.fights.find((f) => f?.id.toString() === fightId);
        if (!selectedFight) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: `Fight ${fightId} not found in this report.`,
          }));
          return;
        }
      } else {
        selectedFight = report.fights[report.fights.length - 1];
      }

      if (!selectedFight) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Could not determine fight to analyze.',
        }));
        return;
      }

      // Validate that the target is one of the supported trial dummies
      const isSupportedTarget = TRIAL_DUMMY_TARGET_NAMES.some((name) =>
        selectedFight.name?.includes(name),
      );

      if (!isSupportedTarget) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: `This parse analysis tool requires fights against a supported trial dummy (${TRIAL_DUMMY_TARGET_NAMES.join(' or ')}). Found: "${selectedFight.name || 'Unknown target'}"`,
        }));
        return;
      }

      // Store report info in Redux
      dispatch(
        setParseReport({
          reportId: reportId,
          fightId: selectedFight.id,
          reportUrl: logUrl,
        }),
      );

      // CRITICAL: Push the freshly-fetched report data into the report slice so that
      // useFightForContext can resolve the fight (including any newly-added fight).
      // Without this the event hooks see selectedFight=null and never fetch events.
      dispatch(setReportData(report));

      // CRITICAL: Ensure the URL reflects the resolved fight ID so event hooks
      // (useCastEvents, useDamageEvents, etc.) can resolve the correct fight context.
      // Without this, when fightId was absent or non-numeric (e.g. #fight=last),
      // useFightForContext returns null and no events are ever fetched.
      const targetPath = `/parse-analysis/${reportId}/${selectedFight.id}`;
      if (window.location.pathname !== targetPath) {
        logger.debug('Updating URL to fight-specific path', { targetPath });
        navigate(targetPath, { replace: true });
      }

      // Step 2: Fetch player data to get the main player
      const playersResponse = await client.query<GetPlayersForReportQuery>({
        query: GetPlayersForReportDocument,
        variables: {
          code: reportId,
          fightIDs: [selectedFight.id],
        },
        fetchPolicy: 'no-cache',
      });

      const rawPlayerDetails = playersResponse.reportData?.report?.playerDetails;
      const playerDetailsGroup = extractPlayerDetailsGroup(rawPlayerDetails);

      if (!playerDetailsGroup) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No player data found in this fight.',
        }));
        return;
      }

      // Collect all players from all roles
      const allPlayers = [
        ...playerDetailsGroup.dps,
        ...playerDetailsGroup.healers,
        ...playerDetailsGroup.tanks,
      ];

      if (allPlayers.length === 0) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No players found in this fight.',
        }));
        return;
      }

      // Get the first player
      const mainPlayer = allPlayers.find((player) => player.id != null) ?? null;

      if (!mainPlayer) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Could not identify the main player in this report.',
        }));
        return;
      }

      // Player ID is in the 'id' field, not 'gameID'
      const mainPlayerId = mainPlayer.id;
      if (mainPlayerId == null) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Main player ID is missing in this report.',
        }));
        return;
      }
      const mainPlayerName = mainPlayer.name || 'Unknown';

      logger.debug('Main player identified for analysis', {
        playerId: mainPlayerId,
        playerName: mainPlayerName,
      });

      const fightStartTime = selectedFight.startTime;
      const fightEndTime = selectedFight.endTime;

      // Get the trial dummy ID (first enemy NPC)
      const dummyId = selectedFight.enemyNPCs?.[0]?.id || 3; // Default to 3 if not found

      logger.debug('Fight metadata for analysis', {
        fightId: selectedFight.id,
        fightName: selectedFight.name,
        dummyId,
        enemyNPCs: selectedFight.enemyNPCs,
      });

      // Step 3: Set up state and trigger event loading via context
      // The actual analysis will happen in a useEffect once events are loaded
      setState((prev) => ({
        ...prev,
        loading: true, // Keep loading until events are fetched
        reportCode: reportId,
        fightId: selectedFight.id,
        fightName: selectedFight.name || `Fight ${selectedFight.id}`,
        playerId: mainPlayerId,
        playerName: mainPlayerName,
        fightStartTime,
        fightEndTime,
        // Clear previous results
        foodResult: null,
        cpm: null,
        weaveResult: null,
        buffChecklist: null,
        debuffChecklist: null,
        dpsResult: null,
        rotationResult: null,
        activeTimeResult: null,
      }));

      // Set pending analysis - this will trigger the useEffect to run analysis once events load
      setPendingAnalysis({
        playerId: mainPlayerId,
        playerName: mainPlayerName,
        fightStartTime,
        fightEndTime,
        dummyId,
      });
    },
    [client, dispatch, logUrl, isReady, isLoggedIn, navigate],
  );

  // Effect to run analysis once events are loaded
  useEffect(() => {
    logger.debug('Parse analysis effect status', {
      hasPendingAnalysis: !!pendingAnalysis,
      isCastEventsLoading,
      isCastEventsLoaded,
      isDamageEventsLoading,
      isCombatantInfoEventsLoading,
      isDebuffEventsLoading,
      castEventsCount: castEvents.length,
      damageEventsCount: damageEvents.length,
      buffEventsCount: friendlyBuffEvents.length,
      combatantInfoEventsCount: combatantInfoEvents.length,
      debuffEventsCount: debuffEvents.length,
    });

    // Only run if we have pending analysis and events are not loading
    if (
      !pendingAnalysis ||
      isCastEventsLoading ||
      isDamageEventsLoading ||
      isCombatantInfoEventsLoading ||
      isDebuffEventsLoading
    ) {
      return;
    }

    // IMPORTANT: We need cast events to be fully loaded before running analysis.
    // castEvents may legitimately be empty (e.g. no cast data for a fight),
    // so we check isCastEventsLoaded (succeeded/failed) rather than castEvents.length.
    if (!isCastEventsLoaded) {
      logger.debug('Cast events not yet available; delaying analysis until next update');
      return;
    }

    logger.debug('Running parse analysis with loaded events', {
      castEvents: castEvents.length,
      damageEvents: damageEvents.length,
      buffEvents: friendlyBuffEvents.length,
      combatantInfoEvents: combatantInfoEvents.length,
      debuffEvents: debuffEvents.length,
    });

    const { playerId, fightStartTime, fightEndTime, dummyId } = pendingAnalysis;

    logger.debug('Pending analysis context', {
      playerId,
      dummyId,
      fightStartTime,
      fightEndTime,
    });

    // Run the actual analysis
    const foodResult = detectFood(
      friendlyBuffEvents,
      playerId,
      fightStartTime,
      fightEndTime,
      combatantInfoEvents,
    );
    const cpm = calculateCPM(castEvents, playerId, fightStartTime, fightEndTime, abilityMapper);
    const dpsResult = calculateDPS(damageEvents, playerId, fightStartTime, fightEndTime);
    const rotationResult = analyzeRotation(
      castEvents,
      playerId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );
    const weaveResult = analyzeWeaving(
      castEvents,
      damageEvents,
      playerId,
      fightStartTime,
      fightEndTime,
    );
    const activeTimeResult = calculateActivePercentage(
      castEvents,
      damageEvents,
      playerId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );
    const buffChecklist = analyzeBuffChecklist(
      friendlyBuffEvents,
      combatantInfoEvents,
      playerId,
      dummyId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );
    const debuffChecklist = analyzeDebuffChecklist(
      debuffEvents,
      playerId,
      dummyId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );

    let buildIssues: BuildIssue[] = [];
    if (fightStartTime != null && fightEndTime != null) {
      const playerCombatantSnapshots = combatantInfoEvents.filter(
        (event) => event.sourceID === playerId,
      );
      const playerCombatantInfo =
        playerCombatantSnapshots.find(
          (event) => event.timestamp >= fightStartTime && event.timestamp <= fightEndTime,
        ) || playerCombatantSnapshots[0];

      const playerGear = playerCombatantInfo?.gear;
      const playerAuras = playerCombatantInfo?.auras ?? [];

      const playerBuffEvents = friendlyBuffEvents.filter(
        (event) =>
          event.targetID === playerId &&
          event.timestamp >= fightStartTime &&
          event.timestamp <= fightEndTime,
      );
      const buffLookup =
        playerBuffEvents.length > 0 ? createBuffLookup(playerBuffEvents, fightEndTime) : undefined;

      const playerDamageEvents = damageEvents.filter(
        (event) =>
          event.sourceID === playerId &&
          event.timestamp >= fightStartTime &&
          event.timestamp <= fightEndTime,
      );

      const resourceEvent = playerDamageEvents.find((event) => event.sourceResources);
      const playerResources = resourceEvent
        ? {
            magicka: resourceEvent.sourceResources.magicka,
            maxMagicka: resourceEvent.sourceResources.maxMagicka,
            stamina: resourceEvent.sourceResources.stamina,
            maxStamina: resourceEvent.sourceResources.maxStamina,
          }
        : undefined;

      buildIssues = detectBuildIssues(
        playerGear,
        buffLookup,
        fightStartTime,
        fightEndTime,
        playerAuras,
        'dps',
        playerDamageEvents,
        playerId,
        playerResources,
      );
    }

    // New analysis functions
    const barSwapResult = analyzeBarSwaps(castEvents, playerId, fightStartTime, fightEndTime);
    const ultimateResult = analyzeUltimateUsage(
      castEvents,
      playerId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );
    const dotUptimeResult = analyzeDotUptime(
      damageEvents,
      playerId,
      fightStartTime,
      fightEndTime,
      abilityMapper,
    );
    const mundusResult = detectMundusStone(combatantInfoEvents, playerId);
    const resourceSustainResult = analyzeResourceSustain(
      damageEvents,
      playerId,
      fightStartTime,
      fightEndTime,
    );
    const penCritCapResult = estimatePenCritCap(combatantInfoEvents, playerId);

    const parseChecklist = buildParseChecklist({
      fightName: state.fightName,
      foodResult,
      activeTimeResult,
      cpm,
      weaveResult,
      rotationResult,
      buffChecklist,
      debuffChecklist,
      buildIssues,
      mundusResult,
      barSwapResult,
      ultimateResult,
      dotUptimeResult,
      penCritCapResult,
      resourceSustainResult,
      potionUse: null,
    });

    // Update state with analysis results
    setState((prev) => ({
      ...prev,
      loading: false,
      foodResult,
      cpm,
      dpsResult,
      rotationResult,
      weaveResult,
      buffChecklist,
      debuffChecklist,
      activeTimeResult,
      buildIssues,
      parseChecklist,
      barSwapResult,
      ultimateResult,
      dotUptimeResult,
      mundusResult,
      resourceSustainResult,
      penCritCapResult,
    }));

    // Clear pending analysis
    setPendingAnalysis(null);
  }, [
    pendingAnalysis,
    castEvents,
    damageEvents,
    friendlyBuffEvents,
    combatantInfoEvents,
    debuffEvents,
    isCastEventsLoading,
    isCastEventsLoaded,
    isDamageEventsLoading,
    isCombatantInfoEventsLoading,
    isDebuffEventsLoading,
    abilityMapper,
    state.fightName,
  ]);

  // Handler for analyzing from URL parameters
  const handleAnalyzeFromParams = useCallback(
    async (reportId: string, fightId: string | null): Promise<void> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        reportCode: null,
        fightId: null,
        fightName: null,
        playerId: null,
        playerName: null,
        fightStartTime: null,
        fightEndTime: null,
        foodResult: null,
        cpm: null,
        weaveResult: null,
        buffChecklist: null,
        debuffChecklist: null,
        dpsResult: null,
        rotationResult: null,
        activeTimeResult: null,
        parseChecklist: null,
        barSwapResult: null,
        ultimateResult: null,
        dotUptimeResult: null,
        mundusResult: null,
        resourceSustainResult: null,
        penCritCapResult: null,
      }));

      try {
        await analyzeReport(reportId, fightId);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to analyze report',
        }));
      }
    },
    [analyzeReport],
  );

  // Initialize from URL parameters on mount
  useEffect(() => {
    if (!contextReportId) {
      lastAutoLoadedContextRef.current = null;
      return;
    }

    const contextKey = contextReportId ? `${contextReportId}:${contextFightId ?? 'latest'}` : null;

    if (!contextKey) {
      lastAutoLoadedContextRef.current = null;
      return;
    }

    if (lastAutoLoadedContextRef.current === contextKey) {
      return;
    }

    lastAutoLoadedContextRef.current = contextKey;

    const constructedUrl = `https://www.esologs.com/reports/${contextReportId}${contextFightId ? `#fight=${contextFightId}` : ''}`;
    setLogUrl(constructedUrl);

    void handleAnalyzeFromParams(contextReportId, contextFightId ?? null);
  }, [contextReportId, contextFightId, handleAnalyzeFromParams]);

  const handleAnalyze = useCallback(async (): Promise<void> => {
    const reportInfo = extractReportInfo(logUrl);
    if (!reportInfo) {
      setState((prev) => ({
        ...prev,
        error: 'Invalid ESOLogs report URL. Please provide a valid URL.',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      reportCode: null,
      fightId: null,
      fightName: null,
      playerId: null,
      playerName: null,
      fightStartTime: null,
      fightEndTime: null,
      foodResult: null,
      cpm: null,
      weaveResult: null,
      buffChecklist: null,
      debuffChecklist: null,
      dpsResult: null,
      rotationResult: null,
      activeTimeResult: null,
      parseChecklist: null,
      barSwapResult: null,
      ultimateResult: null,
      dotUptimeResult: null,
      mundusResult: null,
      resourceSustainResult: null,
      penCritCapResult: null,
    }));

    try {
      // Navigate to ensure URL params are set correctly
      // This updates the ReportFightContext which triggers event hooks to fetch data
      const newPath = `/parse-analysis/${reportInfo.reportId}${reportInfo.fightId ? `/${reportInfo.fightId}` : ''}`;
      const currentPath = window.location.pathname;

      if (currentPath !== newPath) {
        logger.debug('Navigating to parse analysis path', { newPath });
        navigate(newPath, { replace: true });
        // Wait for navigation to complete and context to update
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        logger.debug('Already on desired parse analysis path', { currentPath });
      }

      // Then call analyzeReport which will set up pending analysis
      // The useEffect will run analysis once events are loaded
      await analyzeReport(reportInfo.reportId, reportInfo.fightId);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Failed to analyze parse: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [logUrl, analyzeReport, navigate]);

  /** Seconds until the next poll fires — shown in the navigation strip */
  const [pollCountdown, setPollCountdown] = useState(POLL_INTERVAL_MS / 1000);

  // Poll for new fights added to the report while the page is open.
  // Restarts when the report changes or loading state flips; uses closure-captured values
  // so the interval always reflects the latest fight count.
  useEffect(() => {
    if (!state.reportCode || !client || !isReady || !isLoggedIn) return;

    const reportCode = state.reportCode;
    const currentFightCount = availableFights.length;
    const intervalSec = POLL_INTERVAL_MS / 1000;

    setPollCountdown(intervalSec);

    // 1-second countdown tick
    const countdownId = setInterval(() => {
      setPollCountdown((prev) => (prev <= 1 ? intervalSec : prev - 1));
    }, 1000);

    const timerId = setInterval(() => {
      if (state.loading) {
        setPollCountdown(intervalSec); // reset visual while loading
        return;
      }
      void (async () => {
        try {
          const response = await client.query<GetReportByCodeQuery>({
            query: GetReportByCodeDocument,
            variables: { code: reportCode },
            fetchPolicy: 'no-cache',
          });
          const fights = response.reportData?.report?.fights ?? [];
          const supported = fights.filter(
            (f): f is NonNullable<typeof f> =>
              f != null && TRIAL_DUMMY_TARGET_NAMES.some((n) => f.name?.includes(n)),
          );
          if (supported.length > currentFightCount) {
            logger.debug('New fight detected via polling', {
              previous: currentFightCount,
              current: supported.length,
            });
            setAvailableFights(
              supported.map((f) => ({ id: f.id, name: f.name ?? `Fight ${f.id}` })),
            );
            const newFight = supported[supported.length - 1];
            if (newFight) {
              logger.info(`Auto-analyzing new fight #${newFight.id}`);
              void handleAnalyzeFromParams(reportCode, newFight.id.toString());
            }
          }
        } catch (err) {
          logger.debug('Fight poll error (ignored)', { error: err });
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(countdownId);
      clearInterval(timerId);
    };
  }, [
    state.reportCode,
    state.loading,
    availableFights.length,
    client,
    isReady,
    isLoggedIn,
    handleAnalyzeFromParams,
  ]);

  const handleSelectFight = useCallback(
    (fightId: number): void => {
      if (!state.reportCode || fightId === state.fightId || state.loading) return;
      void handleAnalyzeFromParams(state.reportCode, fightId.toString());
    },
    [state.reportCode, state.fightId, state.loading, handleAnalyzeFromParams],
  );

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

  const handleLoadDemo = useCallback(async (): Promise<void> => {
    setLogUrl(DEMO_LOG_URL);
    await analyzeReport(DEMO_LOG_REPORT_ID, DEMO_LOG_FIGHT_ID);
  }, [analyzeReport]);

  const handleReset = useCallback((): void => {
    setState(createInitialParseState());
    setPendingAnalysis(null);
    setAvailableFights([]);
    setLogUrl('');
    setWeaveDetailsOpen(false);
    dispatch(clearParseReport());
    navigate('/parse-analysis', { replace: true });
  }, [createInitialParseState, dispatch, navigate]);

  const renderFoodAnalysis = (): React.ReactElement | null => {
    if (!state.foodResult) return null;

    const { hasFood, foodType } = state.foodResult;
    const foodLabel = FOOD_TYPE_LABELS[foodType] ?? 'Other Food/Drink';

    const semanticColor = hasFood ? 'success' : 'error';

    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: roleColors.isDarkMode
            ? hasFood
              ? 'rgba(46, 125, 50, 0.10)'
              : 'rgba(211, 47, 47, 0.10)'
            : hasFood
              ? 'rgba(46, 125, 50, 0.05)'
              : 'rgba(211, 47, 47, 0.05)',
          border: '1px solid',
          borderColor: hasFood ? 'success.light' : 'error.light',
          borderTop: '3px solid',
          borderTopColor: hasFood ? 'success.main' : 'error.main',
          mb: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <FastfoodIcon color={semanticColor} sx={{ fontSize: 20 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {hasFood ? 'Food Buff Detected' : 'No Food/Drink Detected'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hasFood
                ? `${foodLabel}${state.foodResult?.foodNames.length > 0 ? `: ${state.foodResult.foodNames.join(', ')}` : ''}`
                : 'Food or drink buff is recommended for optimal parse performance'}
            </Typography>
          </Box>
          <Chip
            label={hasFood ? 'Active' : 'Missing'}
            size="small"
            color={hasFood ? 'success' : 'error'}
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        </Stack>
      </Box>
    );
  };

  const renderParseChecklist = (): React.ReactElement | null => {
    if (!state.parseChecklist || state.parseChecklist.length === 0) return null;

    return <ParseChecklist items={state.parseChecklist} />;
  };

  const renderActiveTimeAnalysis = (): React.ReactElement | null => {
    const activeResult = state.activeTimeResult;
    if (!activeResult) return null;

    const {
      activePercentage,
      activeSeconds,
      fightDurationMs,
      totalCasts,
      baseActiveSeconds,
      channelExtraSeconds,
      downtimeSeconds,
    } = activeResult;

    const percentDisplay = activePercentage.toFixed(1);
    const isExcellent = activePercentage >= 95;
    const isGood = activePercentage >= 85;
    const progressValue = Math.min(100, activePercentage);
    const progressColor = isExcellent ? 'success' : isGood ? 'warning' : 'error';
    const activityColor = getMetricColor(isExcellent, isGood);

    return (
      <Card
        sx={{
          ...glassCardSx,
          borderTop: '3px solid',
          borderTopColor: activityColor,
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: roleColors.isDarkMode
                  ? `linear-gradient(135deg, ${activityColor}33 0%, ${activityColor}11 100%)`
                  : `linear-gradient(135deg, ${activityColor}1a 0%, ${activityColor}0a 100%)`,
                border: '1px solid',
                borderColor: roleColors.isDarkMode ? `${activityColor}33` : `${activityColor}26`,
              }}
            >
              <AccessTimeIcon color={progressColor} sx={{ fontSize: '1rem' }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
              Activity Uptime
            </Typography>
          </Stack>

          <Typography
            variant="h3"
            sx={{
              color: activityColor,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontSize: '2rem',
              mb: 1.5,
            }}
          >
            {percentDisplay}%
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progressValue}
            color={progressColor}
            sx={{
              ...roleColors.getProgressBarStyles(),
              mb: 2,
            }}
          />

          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Active Time
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {activeSeconds.toFixed(1)}s /{' '}
                {fightDurationMs != null ? (fightDurationMs / 1000).toFixed(1) : '?'}s
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Casts
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {totalCasts} ({baseActiveSeconds.toFixed(1)}s)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Channel Bonus
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                +{channelExtraSeconds.toFixed(1)}s
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Downtime
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color:
                    downtimeSeconds <= 5
                      ? theme.palette.mode === 'dark'
                        ? '#4ade80'
                        : theme.palette.success.main
                      : theme.palette.mode === 'dark'
                        ? '#f87171'
                        : theme.palette.error.main,
                }}
              >
                {downtimeSeconds.toFixed(1)}s
              </Typography>
            </Box>
          </Stack>

          {!isGood && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 1.5,
                p: 1,
                borderRadius: 1,
                backgroundColor: roleColors.isDarkMode
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
              }}
            >
              Keep your rotation tight and avoid idle gaps longer than the 1s GCD.
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCPMAnalysis = (): React.ReactElement | null => {
    if (state.cpm === null) return null;

    const cpm = state.cpm;
    const isGoodCPM = cpm >= 50;
    const isExcellentCPM = cpm >= 60;

    const cpmColor = getMetricColor(isExcellentCPM, isGoodCPM);

    return (
      <Card
        sx={{
          ...glassCardSx,
          borderTop: '3px solid',
          borderTopColor: cpmColor,
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: roleColors.isDarkMode
                  ? `linear-gradient(135deg, ${cpmColor}33 0%, ${cpmColor}11 100%)`
                  : `linear-gradient(135deg, ${cpmColor}1a 0%, ${cpmColor}0a 100%)`,
                border: '1px solid',
                borderColor: roleColors.isDarkMode ? `${cpmColor}33` : `${cpmColor}26`,
              }}
            >
              <SpeedIcon color={isGoodCPM ? 'success' : 'warning'} sx={{ fontSize: '1rem' }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
              Casts Per Minute
            </Typography>
          </Stack>

          <Typography
            variant="h3"
            sx={{
              color: cpmColor,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontSize: '2rem',
              mb: 1.5,
            }}
          >
            {cpm.toFixed(1)}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={Math.min((cpm / 70) * 100, 100)}
            color={isExcellentCPM ? 'success' : isGoodCPM ? 'warning' : 'error'}
            sx={{
              ...roleColors.getProgressBarStyles(),
              mb: 1.5,
            }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {isExcellentCPM && 'Excellent — very high APM'}
            {isGoodCPM && !isExcellentCPM && 'Good — room for improvement'}
            {!isGoodCPM && 'Low — try to cast more frequently'}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderDPSAnalysis = (): React.ReactElement | null => {
    if (state.dpsResult === null) return null;

    const { totalDamage, dps, durationMs } = state.dpsResult;

    return (
      <Card
        sx={{
          ...glassCardSx,
          borderTop: '3px solid',
          borderTopColor: 'primary.main',
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: roleColors.isDarkMode
                  ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(25, 118, 210, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(25, 118, 210, 0.04) 100%)',
                border: '1px solid',
                borderColor: roleColors.isDarkMode
                  ? 'rgba(25, 118, 210, 0.2)'
                  : 'rgba(25, 118, 210, 0.15)',
              }}
            >
              <FlashOnIcon color="primary" sx={{ fontSize: '1rem' }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
              Damage Per Second
            </Typography>
          </Stack>

          <Typography
            variant="h3"
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontSize: '2rem',
              mb: 1.5,
            }}
          >
            {Math.round(dps).toLocaleString()}
          </Typography>

          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Total Damage
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {totalDamage.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fight Duration
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {(durationMs / 60000).toFixed(1)} min
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const renderRotationAnalysis = (): React.ReactElement | null => {
    if (!state.rotationResult) return null;

    const {
      opener,
      rotation,
      rotationPattern,
      patternRepetitions,
      spammableAbilities,
      skillIntervals,
      recommendedRotation,
    } = state.rotationResult;

    return (
      <Accordion defaultExpanded={true} disableGutters sx={glassAccordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <RotateRightIcon color="info" fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Rotation Analysis
            </Typography>
            {spammableAbilities && spammableAbilities.length > 0 && (
              <Chip
                label={`${spammableAbilities.length} spammable${spammableAbilities.length > 1 ? 's' : ''}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            {/* Opener */}
            {opener.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Opener (First {Math.round(state.rotationResult.openerDuration)}s)
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {opener.map((cast, index) => (
                    <React.Fragment key={`opener-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      )}
                      <AbilityIcon abilityId={cast.abilityId} />
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}

            {/* Recommended Rotation */}
            {recommendedRotation && recommendedRotation.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Recommended Order
                  </Typography>
                  <Chip
                    label="Based on intervals"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </Stack>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {recommendedRotation.map((cast, index) => (
                    <React.Fragment key={`recommended-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      )}
                      <AbilityIcon abilityId={cast.abilityId} />
                    </React.Fragment>
                  ))}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mt: 1, display: 'block' }}
                >
                  Maintains optimal cast intervals for each skill
                </Typography>
              </Box>
            )}

            {rotationPattern && rotationPattern.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Detected Pattern
                  </Typography>
                  {patternRepetitions && patternRepetitions > 1 && (
                    <Chip
                      label={`×${patternRepetitions}`}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Stack>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {rotationPattern.map((cast, index) => (
                    <React.Fragment key={`pattern-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      )}
                      <AbilityIcon abilityId={cast.abilityId} />
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}

            {spammableAbilities && spammableAbilities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Frequently Used
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {spammableAbilities.map((ability) => (
                    <Chip
                      key={ability.abilityId}
                      label={`${ability.abilityName} • ${ability.percentage}%`}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Skill Intervals */}
            {skillIntervals && skillIntervals.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Skill Cast Intervals
                </Typography>
                <Stack spacing={0.5}>
                  {skillIntervals.slice(0, 10).map((skill) => (
                    <Box
                      key={skill.abilityId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: roleColors.isDarkMode
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                        },
                      }}
                    >
                      <Typography variant="caption" sx={{ minWidth: { xs: 80, sm: 160 }, fontWeight: 500 }}>
                        {skill.abilityName}
                      </Typography>
                      <Chip
                        label={`${skill.avgInterval} casts between`}
                        size="small"
                        color={
                          skill.isExecute
                            ? 'error'
                            : skill.isRotationSkill
                              ? 'primary'
                              : skill.isSpammable
                                ? 'warning'
                                : 'default'
                        }
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                      {skill.isExecute && (
                        <Chip
                          label={`Execute ${skill.firstCastPercent}%`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        ×{skill.castCount}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mt: 1, display: 'block' }}
                >
                  Average casts of other abilities between each use
                </Typography>
              </Box>
            )}

            {opener.length === 0 && rotation.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No rotation data available
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderWeaveAnalysis = (): React.ReactElement | null => {
    if (!state.weaveResult) return null;

    const {
      totalSkills,
      lightAttacks,
      properWeaves,
      weaveAccuracy,
      missedWeaves,
      averageWeaveTiming,
    } = state.weaveResult;

    const isGoodWeaving = weaveAccuracy >= 80;
    const isExcellentWeaving = weaveAccuracy >= 90;
    const weaveColor = getMetricColor(isExcellentWeaving, isGoodWeaving);

    return (
      <Card
        sx={{
          ...glassCardSx,
          borderTop: '3px solid',
          borderTopColor: weaveColor,
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: roleColors.isDarkMode
                    ? `linear-gradient(135deg, ${weaveColor}33 0%, ${weaveColor}11 100%)`
                    : `linear-gradient(135deg, ${weaveColor}1a 0%, ${weaveColor}0a 100%)`,
                  border: '1px solid',
                  borderColor: roleColors.isDarkMode ? `${weaveColor}33` : `${weaveColor}26`,
                }}
              >
                <FlashOnIcon
                  color={isGoodWeaving ? 'success' : 'warning'}
                  sx={{ fontSize: '1rem' }}
                />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                Weave Accuracy
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setWeaveDetailsOpen(true)}
              title="View detailed cast breakdown"
              aria-label="View detailed cast breakdown"
              sx={{ opacity: 0.7 }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography
            variant="h3"
            sx={{
              color: weaveColor,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontSize: '2rem',
              mb: 1.5,
            }}
          >
            {weaveAccuracy.toFixed(1)}%
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            {properWeaves} / {totalSkills} skills had a light attack before them
          </Typography>

          <LinearProgress
            variant="determinate"
            value={weaveAccuracy}
            color={isExcellentWeaving ? 'success' : isGoodWeaving ? 'warning' : 'error'}
            sx={{
              ...roleColors.getProgressBarStyles(),
              mb: 2,
            }}
          />

          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Light Attacks
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {lightAttacks}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Proper Weaves
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                {properWeaves}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Missed Weaves
              </Typography>
              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                {missedWeaves}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Avg. Timing
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {averageWeaveTiming.toFixed(0)}ms
              </Typography>
            </Box>
          </Stack>

          {!isGoodWeaving && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 1.5,
                p: 1,
                borderRadius: 1,
                backgroundColor: roleColors.isDarkMode
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
              }}
            >
              Practice: Light Attack → Skill → Light Attack → Skill
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            mb: 0.75,
          }}
        >
          ESO Toolkit
        </Typography>
        <Typography
          variant="h1"
          sx={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: roleColors.isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}
        >
          Parse Analysis
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Analyze your ESO parse logs — food, uptime, CPM, weaving, buffs, and rotation.
          {!state.reportCode && ' Paste your ESOLogs report URL below to get started.'}
        </Typography>
      </Box>

      {/* Work in Progress Banner */}
      <WorkInProgressDisclaimer featureName="Parse Analysis" sx={{ mb: 3 }} />

      {/* URL input form */}
      {!state.reportCode && !state.loading && (
        <Card
          sx={{
            mb: 4,
            ...glassCardSx,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <TextField
                label="ESOLogs.com Report URL"
                variant="outlined"
                fullWidth
                value={logUrl}
                onChange={handleLogUrlChange}
                placeholder="https://www.esologs.com/reports/ABC123XYZ"
                disabled={state.loading}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: roleColors.isDarkMode
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                    '& fieldset': {
                      borderColor: roleColors.isDarkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.12)',
                    },
                    '&:hover fieldset': {
                      borderColor: roleColors.isDarkMode
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyze}
                disabled={!logUrl || state.loading}
                fullWidth
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  px: 2,
                  py: 1,
                  borderRadius: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: roleColors.isDarkMode
                    ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.9) 0%, rgba(33, 150, 243, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(63, 81, 181, 0.9) 0%, rgba(33, 150, 243, 0.8) 100%)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: roleColors.isDarkMode
                    ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 6px rgba(66, 133, 244, 0.2)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(63, 81, 181, 0.15)',
                  transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: roleColors.isDarkMode
                      ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(66, 133, 244, 0.3)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(63, 81, 181, 0.25)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: roleColors.isDarkMode
                      ? 'inset 0 1px 2px rgba(255,255,255,0.08), 0 1px 3px rgba(66, 133, 244, 0.15)'
                      : 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 3px rgba(63, 81, 181, 0.1)',
                  },
                  '&:disabled': {
                    background: roleColors.isDarkMode
                      ? 'rgba(66, 133, 244, 0.3)'
                      : 'rgba(63, 81, 181, 0.15)',
                    color: roleColors.isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                  },
                }}
              >
                Analyze Parse
              </Button>
              <Button
                variant="outlined"
                size="medium"
                onClick={() => void handleLoadDemo()}
                disabled={state.loading}
                fullWidth
                startIcon={<PlayCircleOutlineIcon />}
                sx={{ mt: 0.5 }}
              >
                Try Demo Log
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Setup instructions — shown only when no report is loaded */}
      {!state.reportCode && !state.loading && (
        <Accordion defaultExpanded={false} disableGutters sx={{ mb: 4, ...glassAccordionSx }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              {/* Icon lockup */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: roleColors.isDarkMode
                    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.04) 100%)',
                  border: '1px solid',
                  borderColor: roleColors.isDarkMode
                    ? 'rgba(76, 175, 80, 0.2)'
                    : 'rgba(76, 175, 80, 0.15)',
                }}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: '14px' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                How to set up a live parse
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ pt: 1 }}>
              <Stack spacing={2.5}>
                {(
                  [
                    {
                      step: 1,
                      title: 'Download the ESOLogs uploader',
                      body: (
                        <>
                          Download and install the desktop client from{' '}
                          <Link
                            href="https://www.esologs.com/client/download"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                          >
                            esologs.com/client/download
                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                          </Link>
                          .
                        </>
                      ),
                    },
                    {
                      step: 2,
                      title: 'Start a Live Log',
                      body: 'Open the uploader, select your ESO Logs directory and guild, then click Go! to begin uploading.',
                    },
                    {
                      step: 3,
                      title: 'Copy your report URL',
                      body: 'Once the upload starts you will see a View Report button. Click it to open your live report, then copy the URL from your browser and paste it into the field above.',
                    },
                    {
                      step: 4,
                      title: 'Enable encounter logging in-game',
                      body: (
                        <>
                          In the ESO chat box run the command{' '}
                          <Box
                            component="code"
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                            }}
                          >
                            /encounterlog
                          </Box>
                          . You should see the message{' '}
                          <Box component="em">Encounter log enabled.</Box>
                        </>
                      ),
                    },
                    {
                      step: 5,
                      title: 'Parse on a 21M trial dummy',
                      body: 'Attack a 21,000,000 HP trial dummy. Make sure your gear and food are set up as you intend to parse.',
                    },
                    {
                      step: 6,
                      title: 'Wait for automatic upload',
                      body: 'Logs upload automatically ~10 seconds after combat ends (the ESO combat status timer). This page will poll for new fights and refresh automatically once your parse is available.',
                    },
                  ] as { step: number; title: string; body: React.ReactNode }[]
                ).map(({ step, title, body }) => (
                  <Stack key={step} direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: roleColors.isDarkMode
                          ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(25, 118, 210, 0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(25, 118, 210, 0.04) 100%)',
                        border: '1px solid',
                        borderColor: roleColors.isDarkMode
                          ? 'rgba(25, 118, 210, 0.2)'
                          : 'rgba(25, 118, 210, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1 }}
                      >
                        {step}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {state.error && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 1.5,
            borderTop: '2px solid',
            borderTopColor: 'error.main',
            backgroundColor: roleColors.isDarkMode
              ? 'rgba(244, 67, 54, 0.08)'
              : 'rgba(244, 67, 54, 0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 20, mt: 0.25, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: 'error', fontWeight: 500 }}>
            {state.error}
          </Typography>
        </Box>
      )}

      {/* Fight navigation — visible whenever multiple supported fights are available, even while loading */}
      {availableFights.length > 0 && !!state.reportCode && (
        <Card
          sx={{
            mb: 3,
            ...glassCardSx,
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            {/* Section Label */}
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 1.5,
              }}
            >
              Fight Selection
            </Typography>

            {/* Header with Icon Lockup */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              {/* Icon Lockup: 24×24 with gradient background */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: roleColors.isDarkMode
                    ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(33, 150, 243, 0.04) 100%)',
                  border: '1px solid',
                  borderColor: roleColors.isDarkMode
                    ? 'rgba(33, 150, 243, 0.2)'
                    : 'rgba(33, 150, 243, 0.15)',
                }}
              >
                <RotateRightIcon color="info" sx={{ fontSize: '14px' }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {availableFights.length === 1 ? 'Latest Fight' : 'Available Fights'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                — next check in {pollCountdown}s
              </Typography>
            </Stack>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {availableFights
                .filter((fight) => !excludedFightIds.has(fight.id))
                .map((fight) => (
                  <Chip
                    key={fight.id}
                    label={`#${fight.id} — ${fight.name}`}
                    onClick={() => handleSelectFight(fight.id)}
                    onDelete={() => excludeFight(fight.id)}
                    deleteIcon={
                      <IconButton size="small" sx={{ p: 0, ml: -0.25 }} aria-label="Exclude fight">
                        <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                      </IconButton>
                    }
                    color={state.fightId === fight.id ? 'primary' : 'default'}
                    variant={state.fightId === fight.id ? 'filled' : 'outlined'}
                    size="small"
                    disabled={state.loading}
                  />
                ))}
              {excludedFightIds.size > 0 && (
                <Chip
                  icon={<RestoreIcon sx={{ fontSize: 14 }} />}
                  label={`${excludedFightIds.size} hidden — Reset`}
                  onClick={resetExcludedFights}
                  size="small"
                  variant="outlined"
                  color="warning"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {state.loading && (
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Fight info header skeleton */}
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={180} height={22} />
                <Skeleton variant="text" width={120} height={14} />
              </Box>
              <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: '12px' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[80, 90, 70].map((w, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={w}
                  height={26}
                  sx={{ borderRadius: '12px' }}
                />
              ))}
            </Box>
          </Card>
          {/* Analysis results skeleton */}
          <Card sx={{ p: 2.5 }}>
            <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  gap: 2,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Skeleton variant="text" width={`${30 + ((i * 11) % 25)}%`} height={16} />
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="text" width={60} height={16} />
                <Skeleton variant="rounded" width={48} height={20} sx={{ borderRadius: '4px' }} />
              </Box>
            ))}
          </Card>
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Analyzing combat events…
          </Typography>
        </Box>
      )}

      {state.reportCode && state.playerName && !state.loading && (
        <>
          {/* Fight Info Header */}
          <Card
            sx={{
              mb: 3,
              ...glassCardSx,
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    {state.fightName}
                  </Typography>

                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      icon={<PersonIcon sx={{ fontSize: 14 }} />}
                      label={state.playerName}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                    <Chip
                      icon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
                      label={state.reportCode}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                    <Chip
                      icon={<FlashOnIcon sx={{ fontSize: 14 }} />}
                      label={`Fight ${state.fightId}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                    {fightDurationMs != null && (
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                        label={formatDuration(fightDurationMs)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, fontSize: '0.75rem' }}
                      />
                    )}
                  </Stack>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleReset}
                  sx={{
                    alignSelf: { xs: 'stretch', sm: 'center' },
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    px: 2,
                    py: 0.75,
                    borderRadius: 1.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: roleColors.isDarkMode
                      ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.9) 0%, rgba(33, 150, 243, 0.8) 100%)'
                      : 'linear-gradient(135deg, rgba(63, 81, 181, 0.9) 0%, rgba(33, 150, 243, 0.8) 100%)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: roleColors.isDarkMode
                      ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 6px rgba(66, 133, 244, 0.2)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(63, 81, 181, 0.15)',
                    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: roleColors.isDarkMode
                        ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(66, 133, 244, 0.3)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(63, 81, 181, 0.25)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                      boxShadow: roleColors.isDarkMode
                        ? 'inset 0 1px 2px rgba(255,255,255,0.08), 0 1px 3px rgba(66, 133, 244, 0.15)'
                        : 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 3px rgba(63, 81, 181, 0.1)',
                    },
                  }}
                >
                  New Analysis
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Food Status (inline, not a full card) */}
          {renderFoodAnalysis()}

          {/* Parse Checklist Summary */}
          {renderParseChecklist()}

          {/* Key Stats Grid */}
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 1,
            }}
          >
            Performance Metrics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {renderDPSAnalysis()}
            {renderCPMAnalysis()}
            {renderActiveTimeAnalysis()}
            {renderWeaveAnalysis()}
          </Box>

          {/* Expandable Detail Sections */}
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 1,
            }}
          >
            Detailed Insights
          </Typography>
          <Stack spacing={2} useFlexGap sx={{ mb: 3 }}>
            {renderRotationAnalysis()}

            {state.buildIssues && state.buildIssues.length > 0 && (
              <Accordion
                defaultExpanded={state.buildIssues.length > 0}
                disableGutters
                sx={glassAccordionSx}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: roleColors.isDarkMode
                          ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 152, 0, 0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 152, 0, 0.12) 0%, rgba(255, 152, 0, 0.04) 100%)',
                        border: '1px solid',
                        borderColor: roleColors.isDarkMode
                          ? 'rgba(255, 152, 0, 0.2)'
                          : 'rgba(255, 152, 0, 0.15)',
                      }}
                    >
                      <ErrorIcon color="warning" sx={{ fontSize: '14px' }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Build Issues
                    </Typography>
                    <Chip
                      label={state.buildIssues.length}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <BuildIssuesPanel issues={state.buildIssues} />
                </AccordionDetails>
              </Accordion>
            )}
            {state.buildIssues && state.buildIssues.length === 0 && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'success.main',
                  borderTop: '3px solid',
                  borderTopColor: 'success.main',
                  backgroundColor: roleColors.isDarkMode
                    ? 'rgba(46, 125, 50, 0.08)'
                    : 'rgba(46, 125, 50, 0.04)',
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    No build issues detected
                  </Typography>
                </Stack>
              </Box>
            )}

            {state.buffChecklist && (
              <Accordion disableGutters sx={glassAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: roleColors.isDarkMode
                          ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.2) 0%, rgba(25, 118, 210, 0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(25, 118, 210, 0.04) 100%)',
                        border: '1px solid',
                        borderColor: roleColors.isDarkMode
                          ? 'rgba(25, 118, 210, 0.2)'
                          : 'rgba(25, 118, 210, 0.15)',
                      }}
                    >
                      <CheckCircleIcon color="primary" sx={{ fontSize: '14px' }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Buff Source Analysis
                    </Typography>
                    {state.buffChecklist.summary.totalRedundantBuffs > 0 && (
                      <Chip
                        label={`${state.buffChecklist.summary.totalRedundantBuffs} redundant`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <BuffChecklist checklistData={state.buffChecklist} />
                </AccordionDetails>
              </Accordion>
            )}

            {state.debuffChecklist && (
              <Accordion disableGutters sx={glassAccordionSx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: roleColors.isDarkMode
                          ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.08) 100%)'
                          : 'linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(33, 150, 243, 0.04) 100%)',
                        border: '1px solid',
                        borderColor: roleColors.isDarkMode
                          ? 'rgba(33, 150, 243, 0.2)'
                          : 'rgba(33, 150, 243, 0.15)',
                      }}
                    >
                      <InfoIcon color="info" sx={{ fontSize: '14px' }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Debuffs Applied to Target
                    </Typography>
                    <Chip
                      label={`${state.debuffChecklist.summary.totalTrackedDebuffs} tracked`}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <DebuffChecklist checklistData={state.debuffChecklist} />
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        </>
      )}

      {/* Weave Details Modal */}
      <Dialog
        open={weaveDetailsOpen}
        onClose={() => setWeaveDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Detailed Cast Breakdown</DialogTitle>
        <DialogContent>
          {state.weaveResult?.castDetails && state.weaveResult.castDetails.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Skill Cast</TableCell>
                    <TableCell>Preceding Cast</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Time Gap (ms)</TableCell>
                    <TableCell align="center">Weaved?</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.weaveResult.castDetails.map((detail, index) => {
                    const skillAbility = abilityMapper.getAbilityById(detail.skillAbilityId);
                    const precedingAbility = detail.precedingCastAbilityId
                      ? abilityMapper.getAbilityById(detail.precedingCastAbilityId)
                      : null;

                    return (
                      <TableRow
                        key={index}
                        sx={{
                          '&': {
                            backgroundColor: detail.isProperWeave
                              ? 'rgba(46, 125, 50, 0.15)'
                              : 'rgba(211, 47, 47, 0.15)',
                          },
                          '&:hover': {
                            backgroundColor: detail.isProperWeave
                              ? 'rgba(46, 125, 50, 0.25)'
                              : 'rgba(211, 47, 47, 0.25)',
                          },
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{detail.timestamp.toLocaleString()}</TableCell>
                        <TableCell>
                          {skillAbility?.name || `Unknown (${detail.skillAbilityId})`}
                        </TableCell>
                        <TableCell>
                          {precedingAbility?.name ||
                            (detail.precedingCastAbilityId
                              ? `Unknown (${detail.precedingCastAbilityId})`
                              : 'None')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={detail.precedingCastType}
                            size="small"
                            color={
                              detail.precedingCastType === 'light'
                                ? 'success'
                                : detail.precedingCastType === 'heavy'
                                  ? 'warning'
                                  : detail.precedingCastType === 'skill'
                                    ? 'info'
                                    : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {detail.timeSincePrecedingCast !== null
                            ? detail.timeSincePrecedingCast.toFixed(0)
                            : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {detail.isProperWeave ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <ErrorIcon color="error" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No cast details available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeaveDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

/**
 * Outer shell component - exported for routing
 * The actual content with hooks is rendered as a child component
 * to ensure it's within the ReportFightProvider context
 */
export const ParseAnalysisPage: React.FC = () => {
  return <ParseAnalysisPageContent />;
};
