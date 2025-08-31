import AnalyticsIcon from '@mui/icons-material/Analytics';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useEventData, usePlayerData } from '../../../hooks';
// import { useDebuffEvents } from '../../../hooks/useDebuffEvents';
// import { useFriendlyBuffEvents } from '../../../hooks/useFriendlyBuffEvents';

// import { CriticalDamageValidationTutorial } from './CriticalDamageValidationTutorial';

interface CriticalDamageValidationPanelProps {
  fight: FightFragment;
}

export const CriticalDamageValidationPanel: React.FC<CriticalDamageValidationPanelProps> = ({
  fight,
}) => {
  // const [showTutorial, setShowTutorial] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const { damageEvents, combatantInfoEvents, isAnyEventLoading: eventsLoading } = useEventData();
  // const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  // const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { playerData, isPlayerDataLoading: playersLoading } = usePlayerData();
  // const { reportMasterData, isMasterDataLoading: masterDataLoading } = useReportMasterData();

  const isLoading = eventsLoading || playersLoading; // || masterDataLoading || isFriendlyBuffEventsLoading || isDebuffEventsLoading;

  // For now, show a placeholder with basic information
  const damageCount = damageEvents?.length || 0;
  const playerCount = playerData?.playersById ? Object.keys(playerData.playersById).length : 0;
  const combatantCount = combatantInfoEvents?.length || 0;

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon />
          Critical Damage Validation
        </Typography>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Analyzing damage events and calculating validation metrics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnalyticsIcon />
            Critical Damage Validation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare calculated vs actual critical damage to validate our formulas
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<HelpOutlineIcon />}
            onClick={() => {
              /* TODO: Add tutorial when component is ready */
            }}
            disabled
          >
            Tutorial (Coming Soon)
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={showDetailedAnalysis}
                onChange={(e) => setShowDetailedAnalysis(e.target.checked)}
              />
            }
            label="Show Detailed Analysis"
          />
        </Stack>
      </Stack>

      {/* Tutorial Dialog - Coming Soon */}
      {/* <CriticalDamageValidationTutorial open={showTutorial} onClose={() => setShowTutorial(false)} /> */}

      {/* Development Status Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Feature in Development</strong> - Critical Damage Validation is currently being
          developed. This tool will compare our calculated critical damage multipliers against
          actual damage events to verify the accuracy of our formulas.
        </Typography>
      </Alert>

      {/* Data Overview Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6">Damage Events</Typography>
            </Stack>
            <Typography variant="h3" color="primary">
              {damageCount.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total damage events available for analysis
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">Players</Typography>
            </Stack>
            <Typography variant="h3" color="success.main">
              {playerCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Players with combat data
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <InfoIcon color="info" />
              <Typography variant="h6">Combatants</Typography>
            </Stack>
            <Typography variant="h3" color="info.main">
              {combatantCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Combatant info events found
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Planned Features */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Coming Soon
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The Critical Damage Validation tool will provide:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Damage Pair Analysis:</strong> Match critical hits with normal hits for the
              same ability
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Accuracy Metrics:</strong> Compare expected vs actual critical damage
              multipliers
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Statistical Analysis:</strong> Confidence intervals and validation statistics
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Per-Player Results:</strong> Individual accuracy assessment for each player
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Per-Ability Breakdown:</strong> Identify which abilities have calculation
              issues
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Discrepancy Visualization:</strong> Charts showing calculation accuracy
              distribution
            </Typography>
          </li>
        </Box>
      </Paper>

      {/* How It Works */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          How Critical Damage Validation Works
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This tool validates our critical damage calculations by comparing them against actual
          combat data:
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Chip label="Step 1" color="primary" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span">
              Find pairs of critical and normal hits for the same ability and target
            </Typography>
          </Box>
          <Box>
            <Chip label="Step 2" color="primary" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span">
              Calculate expected critical damage multiplier using our formulas at the time of each
              hit
            </Typography>
          </Box>
          <Box>
            <Chip label="Step 3" color="primary" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span">
              Measure actual critical damage multiplier from combat log data
            </Typography>
          </Box>
          <Box>
            <Chip label="Step 4" color="primary" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span">
              Compare expected vs actual values and generate accuracy statistics
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};
