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
import FastfoodIcon from '@mui/icons-material/Fastfood';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import InfoIcon from '@mui/icons-material/Info';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
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
import { useAbilityIdMapper } from '../contexts/AbilityIdMapperContext';
import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import { BuffChecklist } from '../features/parse_analysis/components/BuffChecklist';
import { BuildIssuesPanel } from '../features/parse_analysis/components/BuildIssuesPanel';
import { DebuffChecklist } from '../features/parse_analysis/components/DebuffChecklist';
import { TRIAL_DUMMY_TARGET_NAMES } from '../features/parse_analysis/constants/trialDummyConstants';
import { BuffChecklistResult } from '../features/parse_analysis/types/buffChecklist';
import { DebuffChecklistResult } from '../features/parse_analysis/types/debuffChecklist';
import { analyzeBuffChecklist } from '../features/parse_analysis/utils/buffChecklistUtils';
import { analyzeDebuffChecklist } from '../features/parse_analysis/utils/debuffChecklistUtils';
import {
  detectFood,
  calculateCPM,
  calculateActivePercentage,
  calculateDPS,
  analyzeRotation,
  analyzeWeaving,
  type FoodDetectionResult,
  type WeaveAnalysisResult,
  type DPSResult,
  type RotationAnalysisResult,
  type ActivePercentageResult,
} from '../features/parse_analysis/utils/parseAnalysisUtils';
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
import { useSelectedReportAndFight } from '../ReportFightContext';
import { setParseReport, clearParseReport } from '../store/parse_analysis/parseAnalysisSlice';
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

const logger = new Logger({
  level: LogLevel.DEBUG,
  contextPrefix: 'ParseAnalysisPage',
});

/**
 * Inner component that uses hooks from ReportFightProvider context
 * This must be rendered as a child of ReportFightProvider
 */
const ParseAnalysisPageContent: React.FC = () => {
  const theme = useTheme();
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportId: contextReportId, fightId: contextFightId } = useSelectedReportAndFight();
  const [logUrl, setLogUrl] = useState('');
  const abilityMapper = useAbilityIdMapper();
  const { castEvents, isCastEventsLoading } = useCastEvents({ restrictToFightWindow: false });
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
  const fightDurationSeconds =
    state.activeTimeResult?.fightDurationSeconds ??
    (state.fightStartTime != null && state.fightEndTime != null
      ? Math.max(0, (state.fightEndTime - state.fightStartTime) / 1000)
      : null);

  const formatDuration = React.useCallback((totalSeconds: number): string => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return 'Unknown';
    }

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

      // Note: Master data and ability mapper are automatically managed by context providers

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
    [client, dispatch, logUrl, isReady, isLoggedIn],
  );

  // Effect to run analysis once events are loaded
  useEffect(() => {
    logger.debug('Parse analysis effect status', {
      hasPendingAnalysis: !!pendingAnalysis,
      isCastEventsLoading,
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

    // IMPORTANT: We need cast events to run weave analysis
    // Don't wait for both - cast events are sufficient
    if (castEvents.length === 0) {
      // Cast events haven't loaded yet, wait for next render
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
    isDamageEventsLoading,
    isCombatantInfoEventsLoading,
    isDebuffEventsLoading,
    abilityMapper,
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

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

  const handleReset = useCallback((): void => {
    setState(createInitialParseState());
    setPendingAnalysis(null);
    setLogUrl('');
    setWeaveDetailsOpen(false);
    dispatch(clearParseReport());
    navigate('/parse-analysis', { replace: true });
  }, [createInitialParseState, dispatch, navigate]);

  const renderFoodAnalysis = (): React.ReactElement | null => {
    if (!state.foodResult) return null;

    const { hasFood, foodType } = state.foodResult;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <FastfoodIcon color={hasFood ? 'success' : 'error'} />
            <Typography variant="h6">Food/Drink Analysis</Typography>
          </Stack>

          {hasFood ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="body2">
                <strong>Food detected:</strong>{' '}
                {foodType === 'tri-stat' && 'Tri-Stat Food (Max Health, Magicka & Stamina)'}
                {foodType === 'stamina' && 'Stamina Recovery Food'}
                {foodType === 'magicka' && 'Magicka Recovery Food'}
                {foodType === 'health-stamina' && 'Health + Stamina Food'}
                {foodType === 'health-magicka' && 'Health + Magicka Food'}
                {foodType === 'magicka-stamina' && 'Magicka + Stamina Food'}
                {foodType === 'stamina-magicka-recovery' && 'Max Stamina + Magicka Recovery Food'}
                {foodType === 'health-regen' && 'Health + Regeneration Food'}
                {foodType === 'event' && 'Event Food/Drink'}
                {foodType === 'xp-boost' && 'Experience Boost Food'}
                {foodType === 'other' && 'Other Food/Drink'}
                {state.foodResult?.foodNames.length > 0 &&
                  ` (${state.foodResult.foodNames.join(', ')})`}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error" icon={<ErrorIcon />}>
              <Typography variant="body2">
                <strong>No food detected!</strong> Using stamina or magicka recovery food is
                recommended for parses.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActiveTimeAnalysis = (): React.ReactElement | null => {
    const activeResult = state.activeTimeResult;
    if (!activeResult) return null;

    const {
      activePercentage,
      activeSeconds,
      fightDurationSeconds,
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

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <AccessTimeIcon color={progressColor} />
            <Typography variant="h6">Activity Uptime</Typography>
          </Stack>

          <Typography
            variant="h4"
            color={isExcellent ? 'success.main' : isGood ? 'warning.main' : 'error.main'}
            sx={{ mb: 1 }}
          >
            {percentDisplay}% Active
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progressValue}
            color={progressColor}
            sx={{ height: 8, borderRadius: 4, mb: 2 }}
          />

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total Active Time:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {activeSeconds.toFixed(1)}s / {fightDurationSeconds.toFixed(1)}s
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Base (casts):</Typography>
              <Typography variant="body2" fontWeight="bold">
                {baseActiveSeconds.toFixed(1)}s ({totalCasts} casts)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Channel Bonus:</Typography>
              <Typography variant="body2" fontWeight="bold">
                +{channelExtraSeconds.toFixed(1)}s
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Downtime:</Typography>
              <Typography
                variant="body2"
                fontWeight="bold"
                color={downtimeSeconds <= 5 ? 'success.main' : 'error.main'}
              >
                {downtimeSeconds.toFixed(1)}s
              </Typography>
            </Box>
          </Stack>

          {!isGood && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Keep your rotation tight and avoid idle gaps longer than the 1 second global
                cooldown to raise your uptime.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCPMAnalysis = (): React.ReactElement | null => {
    if (state.cpm === null) return null;

    const cpm = state.cpm;
    const isGoodCPM = cpm >= 50; // 50+ CPM is generally considered good
    const isExcellentCPM = cpm >= 60; // 60+ CPM is excellent

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <SpeedIcon color={isGoodCPM ? 'success' : 'warning'} />
            <Typography variant="h6">Casts Per Minute (CPM)</Typography>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h3"
              color={isExcellentCPM ? 'success.main' : isGoodCPM ? 'warning.main' : 'error.main'}
            >
              {cpm.toFixed(1)}
            </Typography>
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isExcellentCPM && '🎯 Excellent! Your APM is very high.'}
                {isGoodCPM && !isExcellentCPM && '✅ Good CPM. Room for improvement.'}
                {!isGoodCPM && '⚠️ Low CPM. Try to cast more frequently.'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((cpm / 70) * 100, 100)}
                color={isExcellentCPM ? 'success' : isGoodCPM ? 'warning' : 'error'}
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDPSAnalysis = (): React.ReactElement | null => {
    if (state.dpsResult === null) return null;

    const { totalDamage, dps, duration } = state.dpsResult;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <FlashOnIcon color="primary" />
            <Typography variant="h6">Damage Per Second (DPS)</Typography>
          </Stack>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h3" color="primary.main">
                {Math.round(dps).toLocaleString()}
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  DPS
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(duration / 60).toFixed(1)} minute fight
                </Typography>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Damage Dealt
              </Typography>
              <Typography variant="h5" color="text.primary">
                {totalDamage.toLocaleString()}
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
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <RotateRightIcon color="info" />
            <Typography variant="h6">Rotation Analysis</Typography>
          </Stack>

          <Stack spacing={3}>
            {/* Opener */}
            {opener.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Opener (First {Math.round(state.rotationResult.openerDuration)} seconds)
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {opener.map((cast, index) => (
                    <React.Fragment key={`opener-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
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
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Recommended Rotation Order
                  <Chip
                    label="Based on skill intervals"
                    size="small"
                    color="success"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {recommendedRotation.map((cast, index) => (
                    <React.Fragment key={`recommended-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      )}
                      <AbilityIcon abilityId={cast.abilityId} />
                    </React.Fragment>
                  ))}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  This rotation order maintains the optimal cast intervals for each skill
                </Typography>
              </Box>
            )}

            {rotationPattern && rotationPattern.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Detected Rotation Pattern
                  {patternRepetitions && patternRepetitions > 1 && (
                    <Chip
                      label={`Repeats ×${patternRepetitions}`}
                      size="small"
                      color="info"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  {rotationPattern.map((cast, index) => (
                    <React.Fragment key={`pattern-${index}`}>
                      {index > 0 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      )}
                      <AbilityIcon abilityId={cast.abilityId} />
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            )}

            {spammableAbilities && spammableAbilities.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Frequently Used Abilities
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {spammableAbilities.map((ability) => (
                    <Chip
                      key={ability.abilityId}
                      label={`${ability.abilityName} • ${ability.percentage}% of casts`}
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Skill Intervals Table */}
            {skillIntervals && skillIntervals.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Skill Cast Intervals
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {skillIntervals.slice(0, 10).map((skill) => (
                    <Box
                      key={skill.abilityId}
                      sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ minWidth: 200 }}>
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
                        sx={{ minWidth: 140 }}
                      />
                      {skill.isExecute && (
                        <Chip
                          label={`Execute (${skill.firstCastPercent}% into fight)`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        ({skill.castCount} times)
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  Average number of other abilities cast between each use of this skill
                </Typography>
              </Box>
            )}

            {opener.length === 0 && rotation.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No rotation data available
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
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

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <FlashOnIcon color={isGoodWeaving ? 'success' : 'warning'} />
              <Typography variant="h6">Weave Accuracy</Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setWeaveDetailsOpen(true)}
              title="View detailed cast breakdown"
            >
              <InfoIcon />
            </IconButton>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography
              variant="h3"
              color={
                isExcellentWeaving ? 'success.main' : isGoodWeaving ? 'warning.main' : 'error.main'
              }
            >
              {weaveAccuracy.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {properWeaves} out of {totalSkills} skills had a light attack before them
            </Typography>
            <LinearProgress
              variant="determinate"
              value={weaveAccuracy}
              color={isExcellentWeaving ? 'success' : isGoodWeaving ? 'warning' : 'error'}
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total Light Attacks:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {lightAttacks}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Proper Weaves:</Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                {properWeaves}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Missed Weaves:</Typography>
              <Typography variant="body2" fontWeight="bold" color="error.main">
                {missedWeaves}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Avg. Weave Timing:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {averageWeaveTiming.toFixed(0)}ms
              </Typography>
            </Box>
          </Stack>

          {!isGoodWeaving && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> Practice weaving by pressing light attack immediately before
                each skill. Aim for the pattern: Light Attack → Skill → Light Attack → Skill.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Parse Analysis Tool
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Analyze your ESO parse logs to check food usage, activity uptime, casts per minute, weave
          accuracy, and buff sources.
          {!state.reportCode && ' Paste your ESOLogs report URL below.'}
        </Typography>
      </Box>

      {/* Only show URL input form if no report is loaded */}
      {!state.reportCode && !state.loading && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="ESOLogs.com Report URL"
                variant="outlined"
                fullWidth
                value={logUrl}
                onChange={handleLogUrlChange}
                placeholder="https://www.esologs.com/reports/ABC123XYZ"
                disabled={state.loading}
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyze}
                disabled={!logUrl || state.loading}
                fullWidth
              >
                Analyze Parse
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {state.loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {state.reportCode && state.playerName && !state.loading && (
        <>
          <Card sx={{ mb: 3, bgcolor: theme.palette.primary.main + '10' }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {state.fightName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Player: <strong>{state.playerName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Report: {state.reportCode} | Fight: {state.fightId}
                  </Typography>
                  {fightDurationSeconds != null && (
                    <Typography variant="body2" color="text.secondary">
                      Fight Length: {formatDuration(fightDurationSeconds)}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                >
                  Load Different Fight
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {renderFoodAnalysis()}
          {renderActiveTimeAnalysis()}
          {renderCPMAnalysis()}
          {renderDPSAnalysis()}
          {renderRotationAnalysis()}
          {renderWeaveAnalysis()}

          {state.buildIssues && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Build Issues
                </Typography>
                <BuildIssuesPanel issues={state.buildIssues} />
              </CardContent>
            </Card>
          )}

          {/* Buff Checklist - Shows which buffs are from dummy vs player */}
          {state.buffChecklist && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Buff Source Analysis
                </Typography>
                <BuffChecklist checklistData={state.buffChecklist} />
              </CardContent>
            </Card>
          )}

          {/* Debuff Checklist - Shows which debuffs are applied to the dummy */}
          {state.debuffChecklist && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Debuffs Applied to Target
                </Typography>
                <DebuffChecklist checklistData={state.debuffChecklist} />
              </CardContent>
            </Card>
          )}
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
