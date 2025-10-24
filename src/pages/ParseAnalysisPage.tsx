/**
 * Parse Analysis Page
 * Analyzes ESO parse logs to provide insights on:
 * - Food/drink usage (stamina or magicka recovery)
 * - Casts per minute (CPM)
 * - Weave accuracy (light attack -> skill pattern)
 * - Trial dummy buffs (active vs missing)
 */

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';
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
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import {
  detectFood,
  calculateCPM,
  analyzeWeaving,
  detectTrialDummyBuffs,
  type FoodDetectionResult,
  type WeaveAnalysisResult,
  type TrialDummyBuffResult,
} from '../features/parse_analysis/utils/parseAnalysisUtils';
import {
  GetReportByCodeDocument,
  GetPlayersForReportDocument,
  type GetReportByCodeQuery,
  type GetPlayersForReportQuery,
} from '../graphql/gql/graphql';
import { useCastEvents } from '../hooks/events/useCastEvents';
import { useDamageEvents } from '../hooks/events/useDamageEvents';
import { useFriendlyBuffEvents } from '../hooks/events/useFriendlyBuffEvents';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { setParseReport } from '../store/parse_analysis/parseAnalysisSlice';
import { useAppDispatch } from '../store/useAppDispatch';

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
  buffResult: TrialDummyBuffResult | null;
}

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

/**
 * Inner component that uses hooks from ReportFightProvider context
 * This must be rendered as a child of ReportFightProvider
 */
const ParseAnalysisPageContent: React.FC = () => {
  const theme = useTheme();
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportId: contextReportId, fightId: contextFightId } = useSelectedReportAndFight();
  const [logUrl, setLogUrl] = useState('');
  
  // Use event hooks - they automatically fetch based on context
  const { castEvents } = useCastEvents();
  const { friendlyBuffEvents } = useFriendlyBuffEvents();
  const { damageEvents } = useDamageEvents();
  
  const [state, setState] = useState<ParseAnalysisState>({
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
    buffResult: null,
  });

  // Core analysis function - fetches and analyzes report data
  const analyzeReport = useCallback(async (reportId: string, fightId: string | null): Promise<void> => {
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

    // Validate that the target is a trial dummy (Target Iron Atronach)
    if (!selectedFight.name?.includes('Target Iron Atronach')) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `This parse analysis tool requires fights against "Target Iron Atronach" (trial dummy). Found: "${selectedFight.name || 'Unknown target'}"`,
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
    if (!rawPlayerDetails || typeof rawPlayerDetails !== 'object') {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'No player data found in this fight.',
      }));
      return;
    }

    // Extract player details from the nested structure
    const playerDetails = (rawPlayerDetails as any)?.data?.playerDetails;
    if (!playerDetails) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'No player data found in this fight.',
      }));
      return;
    }

    // Collect all players from all roles
    const allPlayers = [
      ...(playerDetails.dps || []),
      ...(playerDetails.healers || []),
      ...(playerDetails.tanks || []),
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
    const mainPlayer = allPlayers[0];

    if (!mainPlayer) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Could not identify the main player in this report.',
      }));
      return;
    }

    const mainPlayerId = mainPlayer.gameID;
    const mainPlayerName = mainPlayer.name || 'Unknown';

    const fightStartTime = selectedFight.startTime;
    const fightEndTime = selectedFight.endTime;

    // Step 3: Events are already fetched via hooks (castEvents, friendlyBuffEvents, damageEvents)
    // Just use them directly from the component state

    // Step 4: Analyze the data
    const foodResult = detectFood(friendlyBuffEvents, mainPlayerId, fightStartTime, fightEndTime);
    const cpm = calculateCPM(castEvents, mainPlayerId, fightStartTime, fightEndTime);
    const weaveResult = analyzeWeaving(
      castEvents,
      damageEvents,
      mainPlayerId,
      fightStartTime,
      fightEndTime,
    );
    const buffResult = detectTrialDummyBuffs(
      friendlyBuffEvents,
      mainPlayerId,
      fightStartTime,
      fightEndTime,
    );

    setState((prev) => ({
      ...prev,
      loading: false,
      reportCode: reportId,
      fightId: selectedFight.id,
      fightName: selectedFight.name || `Fight ${selectedFight.id}`,
      playerId: mainPlayerId,
      playerName: mainPlayerName,
      fightStartTime,
      fightEndTime,
      foodResult,
      cpm,
      weaveResult,
      buffResult,
    }));
  }, [client, dispatch, logUrl, castEvents, friendlyBuffEvents, damageEvents]);

  // Handler for analyzing from URL parameters
  const handleAnalyzeFromParams = useCallback(async (reportId: string, fightId: string | null): Promise<void> => {
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
      buffResult: null,
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
  }, [analyzeReport]);

  // Initialize from URL parameters on mount
  useEffect(() => {
    if (contextReportId) {
      // Construct a URL for display
      const constructedUrl = `https://www.esologs.com/reports/${contextReportId}${contextFightId ? `#fight=${contextFightId}` : ''}`;
      setLogUrl(constructedUrl);
      // Auto-analyze if we have a report ID from URL
      void handleAnalyzeFromParams(contextReportId, contextFightId ?? null);
    }
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
      buffResult: null,
    }));

    try {
      // Update URL if we're using a new report
      if (reportInfo.reportId !== contextReportId) {
        const newPath = `/parse-analysis/${reportInfo.reportId}${reportInfo.fightId ? `/${reportInfo.fightId}` : ''}`;
        navigate(newPath, { replace: true });
      }
      
      await analyzeReport(reportInfo.reportId, reportInfo.fightId);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Failed to analyze parse: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [logUrl, analyzeReport, navigate, contextReportId]);

  const handleLogUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setLogUrl(e.target.value);
  };

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
                {foodType === 'stamina' && 'Stamina Recovery Food'}
                {foodType === 'magicka' && 'Magicka Recovery Food'}
                {foodType === 'health-stamina' && 'Health + Stamina Food'}
                {foodType === 'health-magicka' && 'Health + Magicka Food'}
                {foodType === 'other' && 'Other Food/Drink'}
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
            <Typography variant="h3" color={isExcellentCPM ? 'success.main' : isGoodCPM ? 'warning.main' : 'error.main'}>
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

  const renderWeaveAnalysis = (): React.ReactElement | null => {
    if (!state.weaveResult) return null;

    const { totalSkills, lightAttacks, properWeaves, weaveAccuracy, missedWeaves, averageWeaveTiming } =
      state.weaveResult;

    const isGoodWeaving = weaveAccuracy >= 80;
    const isExcellentWeaving = weaveAccuracy >= 90;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <FlashOnIcon color={isGoodWeaving ? 'success' : 'warning'} />
            <Typography variant="h6">Weave Accuracy</Typography>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h3" color={isExcellentWeaving ? 'success.main' : isGoodWeaving ? 'warning.main' : 'error.main'}>
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

  const renderBuffAnalysis = (): React.ReactElement | null => {
    if (!state.buffResult) return null;

    const { activeBuffs, missingBuffs, buffDetails } = state.buffResult;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <ShieldIcon color={missingBuffs.length === 0 ? 'success' : 'warning'} />
            <Typography variant="h6">Trial Dummy Buffs</Typography>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Active: {activeBuffs.length} / {buffDetails.length}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(activeBuffs.length / buffDetails.length) * 100}
              color={missingBuffs.length === 0 ? 'success' : 'warning'}
            />
          </Box>

          <Stack spacing={1} sx={{ mb: 2 }}>
            {buffDetails.map((buff) => (
              <Box
                key={buff.abilityId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: buff.isActive
                    ? theme.palette.success.main + '20'
                    : theme.palette.error.main + '20',
                }}
              >
                <Typography variant="body2">{buff.name}</Typography>
                <Chip
                  label={buff.isActive ? 'Active' : 'Missing'}
                  size="small"
                  color={buff.isActive ? 'success' : 'error'}
                  icon={buff.isActive ? <CheckCircleIcon /> : <ErrorIcon />}
                />
              </Box>
            ))}
          </Stack>

          {missingBuffs.length > 0 && (
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Missing buffs:</strong> {missingBuffs.join(', ')}. Make sure you&apos;re using
                a 21M or 51M trial dummy to get all buffs.
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
          Analyze your ESO parse logs to check food usage, casts per minute, weave accuracy, and
          trial dummy buffs. Paste your ESOLogs report URL below.
        </Typography>
      </Box>

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
              {state.loading ? <CircularProgress size={24} /> : 'Analyze Parse'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

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
              <Typography variant="h6" gutterBottom>
                {state.fightName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Player: <strong>{state.playerName}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Report: {state.reportCode} | Fight: {state.fightId}
              </Typography>
            </CardContent>
          </Card>

          {renderFoodAnalysis()}
          {renderCPMAnalysis()}
          {renderWeaveAnalysis()}
          {renderBuffAnalysis()}
        </>
      )}
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
