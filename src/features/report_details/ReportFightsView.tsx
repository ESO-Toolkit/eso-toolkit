// Third-party imports
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Collapse,
  Switch,
  FormControlLabel,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { ReportActionBar } from '../../components/ReportActionBar';
import { ReportFightsSkeleton } from '../../components/ReportFightsSkeleton';
import { FightFragment, ReportFragment } from '../../graphql/gql/graphql';
import { RootState } from '../../store/storeWithHistory';
import {
  getDifficultyLabel,
  getTrialNameFromBoss,
  isFalsePositiveWipe,
} from '../../utils/trialClassification';

import { BossAvatar } from './BossAvatar';
import {
  bossHealthRemaining,
  buildRunEncounters,
  groupFightsIntoRuns,
  isBossFight,
  isResetPull,
  summarizeEncounter,
  uncategorizedTrash,
  wasKill,
  type RunEncounter,
} from './fightGrouping';
import { determineRunDifficulty } from './runDifficulty';

function formatTimestamp(fightStartTime: number, reportStartTime: number): string {
  // Convert fight timestamp (relative ms) + report startTime (Unix timestamp) to actual clock time
  const actualTimestamp = reportStartTime + fightStartTime;
  const date = new Date(actualTimestamp);

  return date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

type RGB = [number, number, number];

function mixRgb(from: RGB, to: RGB, t: number): RGB {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    Math.round(from[0] + (to[0] - from[0]) * clampedT),
    Math.round(from[1] + (to[1] - from[1]) * clampedT),
    Math.round(from[2] + (to[2] - from[2]) * clampedT),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  const toHex = (v: number): string => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Wipe accent anchors: far (boss HP high, died fast) → mid (~50%) → close (boss
// almost dead). Runs red → periwinkle → indigo and never produces green, which
// is reserved exclusively for kills (green = complete).
const WIPE_ANCHORS: [RGB, RGB, RGB] = [
  [226, 85, 85], // red
  [165, 180, 252], // periwinkle
  [99, 102, 241], // indigo
];

/**
 * Maps boss health % remaining to a wipe accent RGB.
 * High % (players died fast) → red; low % (almost killed) → indigo.
 */
function getWipeRgb(percentage: number): RGB {
  const clamped = Math.max(0, Math.min(100, percentage));
  const [far, mid, close] = WIPE_ANCHORS;
  if (clamped >= 50) {
    return mixRgb(far, mid, (100 - clamped) / 50);
  }
  return mixRgb(mid, close, (50 - clamped) / 50);
}

/**
 * Wipe accent color (hex). Returns a hex string so existing `${color}30`-style
 * alpha concatenation (borders, shadows, hover tints) keeps producing valid CSS.
 */
function getWipeHealthGradientColor(percentage: number): string {
  return rgbToHex(getWipeRgb(percentage));
}

/**
 * Two-stop wipe background gradient that matches the accent color tone. Dark
 * mode keeps the saturated color (slightly darkened on the second stop); light
 * mode blends toward white for a soft pastel fill.
 */
function getWipeHealthGradientBackground(percentage: number, darkMode: boolean): string {
  const rgb = getWipeRgb(percentage);
  if (darkMode) {
    const [r, g, b] = rgb;
    const [dr, dg, db] = mixRgb(rgb, [0, 0, 0], 0.28);
    return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.7) 0%, rgba(${dr}, ${dg}, ${db}, 0.55) 100%)`;
  }
  const [lr, lg, lb] = mixRgb(rgb, [255, 255, 255], 0.78);
  const [lr2, lg2, lb2] = mixRgb(rgb, [255, 255, 255], 0.68);
  return `linear-gradient(135deg, rgba(${lr}, ${lg}, ${lb}, 0.85) 0%, rgba(${lr2}, ${lg2}, ${lb2}, 0.65) 100%)`;
}

interface ReportFightsViewProps {
  fights: FightFragment[] | null | undefined;
  loading: boolean;
  fightId: string | undefined | null;
  reportId: string | undefined | null;
  reportStartTime: number | undefined | null;
  reportData: ReportFragment | null | undefined;
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  fightId,
  reportId,
  reportStartTime,
  reportData,
}) => {
  const navigate = useNavigate();
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);

  // Theme-aware color utilities with enhanced light mode support
  const getThemeColors = React.useMemo(() => {
    if (darkMode) {
      return {
        // Dark mode fight card colors — tuned for glass background
        // Kills use a green gradient (green = complete).
        killGradient:
          'linear-gradient(135deg, rgba(74, 222, 128, 0.7) 0%, rgba(34, 197, 94, 0.5) 50%, rgba(16, 185, 129, 0.6) 100%)',
        killShadow: 'none',
        trashGradient:
          'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(71, 85, 105, 0.2) 100%)',
        trashShadow: 'none',
        falsePositiveGradient:
          'linear-gradient(135deg, rgba(251, 191, 36, 0.6) 0%, rgba(245, 158, 11, 0.45) 100%)',
        wipeShadow: 'none',
        hoverBg: 'rgba(255,255,255,0.08)',
        badgeBorder: '1px solid rgba(255,255,255,0.18)',
        badgeBorderKill: '1px solid rgba(76, 217, 100, 0.3)',
        badgeShadow: '0 4px 12px rgba(255, 99, 71, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        badgeShadowKill: '0 4px 12px rgba(76, 217, 100, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
        // Circle counter colors (solid colors for dark mode)
        circleGreen: '#4caf50',
        circleYellow: '#ffc107',
        circleOrange: '#ff7043',
        // Difficulty badge colors
        normalColor: '#4caf50',
        veteranColor: '#2196f3',
        hmColor: '#ff9800',
        partialHmColor: '#ffc107',
      };
    } else {
      return {
        // Light mode fight card colors — subtle tints, let accent bar carry color
        // Kills use a pale green tint (green = complete).
        killGradient:
          'linear-gradient(135deg, rgba(220, 252, 231, 0.8) 0%, rgba(209, 250, 229, 0.6) 100%)',
        killShadow: 'none',
        trashGradient:
          'linear-gradient(135deg, rgba(236, 239, 243, 0.6) 0%, rgba(241, 243, 245, 0.4) 100%)',
        trashShadow: 'none',
        falsePositiveGradient:
          'linear-gradient(135deg, rgba(236, 239, 243, 0.6) 0%, rgba(241, 243, 245, 0.4) 100%)',
        wipeShadow: 'none',
        hoverBg: 'rgba(30, 41, 59, 0.04)',
        badgeBorder: '1px solid rgba(100, 116, 139, 0.4)',
        badgeBorderKill: '1px solid rgba(5, 150, 105, 0.6)',
        badgeShadow: '0 4px 8px rgba(220, 38, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        badgeShadowKill:
          '0 4px 8px rgba(5, 150, 105, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        // Circle counter colors (solid colors for light mode)
        circleGreen: '#059669',
        circleYellow: '#f59e0b',
        circleOrange: '#dc2626',
        // Difficulty badge colors (proper light mode versions)
        normalColor: '#059669',
        veteranColor: '#0284c7',
        hmColor: '#d97706',
        partialHmColor: '#b45309',
      };
    }
  }, [darkMode]);

  const handleFightSelect = React.useCallback(
    (id: number) => {
      try {
        const targetPath = `/report/${reportId}/fight/${id}/insights`;
        navigate(targetPath);
      } catch {
        // Navigation error handled silently
      }
    },
    [navigate, reportId],
  );

  const encounters = React.useMemo(() => {
    // Group fights into trial/dungeon runs using authoritative API data
    // (per-fight gameZone + encounterID). See ./fightGrouping.
    const runs = groupFightsIntoRuns(fights, reportData);

    return runs.map((run) => {
      const runEncounters = buildRunEncounters(run);
      const leftover = uncategorizedTrash(run, runEncounters);

      // Surface trash that isn't tied to a boss (e.g. trailing trash, or a
      // trash-only segment) so it stays reachable via the trash toggle.
      const encountersForRun: RunEncounter[] = [...runEncounters];
      if (leftover.length > 0) {
        if (encountersForRun.length === 0) {
          encountersForRun.push({
            id: `${run.id}-misc-trash`,
            name: 'Trash',
            bossFights: [],
            preTrash: leftover,
            postTrash: [],
          });
        } else {
          const last = encountersForRun.length - 1;
          encountersForRun[last] = {
            ...encountersForRun[last],
            postTrash: [...encountersForRun[last].postTrash, ...leftover],
          };
        }
      }

      const hasBosses = runEncounters.length > 0;
      const trialDifficulty = hasBosses
        ? determineRunDifficulty(encountersForRun, run.zone.name)
        : { difficulty: 0, label: null as string | null };

      return {
        id: run.id,
        name: run.zone.name,
        trialName: run.zone.name,
        contentType: run.zone.type,
        expectedBossCount: run.zone.expectedBossCount,
        difficulty: trialDifficulty.difficulty,
        difficultyLabel: trialDifficulty.label,
        encounters: encountersForRun,
      };
    });
  }, [fights, reportData]);

  const [showTrashForEncounter, setShowTrashForEncounter] = React.useState<Set<string>>(new Set());

  const toggleTrashForEncounter = (encounterId: string): void => {
    setShowTrashForEncounter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(encounterId)) {
        newSet.delete(encounterId);
      } else {
        newSet.add(encounterId);
      }
      return newSet;
    });
  };

  // Attempt organisation: on farm/progression logs an encounter can have dozens
  // of attempts (real logs show 45+ on a single boss). When "Group attempts" is
  // on, those collapse to the kills + best pull, with the rest behind a toggle.
  const [groupAttempts, setGroupAttempts] = React.useState(true);
  const [expandedAttempts, setExpandedAttempts] = React.useState<Set<string>>(new Set());

  const toggleExpandedAttempts = (encounterId: string): void => {
    setExpandedAttempts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(encounterId)) {
        newSet.delete(encounterId);
      } else {
        newSet.add(encounterId);
      }
      return newSet;
    });
  };

  // Boss-fight grid styling, shared between grouped and ungrouped rendering.
  const bossGridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(auto-fill, minmax(100px, 1fr))',
      sm: 'repeat(auto-fill, minmax(120px, 1fr))',
      md: 'repeat(auto-fill, minmax(140px, 1fr))',
      lg: 'repeat(auto-fill, minmax(160px, 1fr))',
    },
    gap: { xs: 0.5, sm: 1 },
    overflow: 'visible',
  } as const;

  // Encounters with more than this many attempts get collapsed when grouping.
  const ATTEMPT_GROUP_THRESHOLD = 4;

  const renderBossAttempts = (encounter: RunEncounter): React.ReactNode => {
    const fights = encounter.bossFights;
    // Stable attempt numbers (#1, #2, …) by chronological order.
    const attemptIndex = new Map(fights.map((f, i) => [f.id, i]));

    const useGrouping = groupAttempts && fights.length > ATTEMPT_GROUP_THRESHOLD;
    if (!useGrouping) {
      return (
        <List sx={bossGridSx}>
          {fights.map((fight) => renderFightCard(fight, attemptIndex.get(fight.id) ?? 0))}
        </List>
      );
    }

    // Pin the kill(s) and the single best non-reset wipe; collapse the rest.
    const killIds = new Set(fights.filter((f) => wasKill(f)).map((f) => f.id));
    const measurableWipes = fights.filter(
      (f) => !wasKill(f) && !isResetPull(f) && bossHealthRemaining(f) != null,
    );
    const bestWipeId = measurableWipes.length
      ? measurableWipes.reduce((a, b) =>
          (bossHealthRemaining(a) ?? 100) <= (bossHealthRemaining(b) ?? 100) ? a : b,
        ).id
      : null;
    const isHighlight = (f: FightFragment): boolean => killIds.has(f.id) || f.id === bestWipeId;

    const highlight = fights.filter(isHighlight);
    const rest = fights.filter((f) => !isHighlight(f));
    const expanded = expandedAttempts.has(encounter.id);

    return (
      <>
        <List sx={bossGridSx}>
          {highlight.map((fight) => renderFightCard(fight, attemptIndex.get(fight.id) ?? 0))}
        </List>
        {rest.length > 0 && (
          <>
            <Button
              size="small"
              onClick={() => toggleExpandedAttempts(encounter.id)}
              sx={{ textTransform: 'none', mt: 0.5 }}
            >
              {expanded ? 'Show fewer' : `Show all ${fights.length} attempts`}
            </Button>
            <Collapse in={expanded}>
              <List sx={{ ...bossGridSx, mt: 0.5 }}>
                {rest.map((fight) => renderFightCard(fight, attemptIndex.get(fight.id) ?? 0))}
              </List>
            </Collapse>
          </>
        )}
      </>
    );
  };

  if (loading) {
    return <ReportFightsSkeleton data-testid="loading-indicator" />;
  }

  if (!fights?.length) {
    return (
      <Card
        elevation={4}
        sx={{
          borderRadius: 2,
          border: (t: Theme) => `1px solid ${t.palette.divider}`,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              No fights available
            </Typography>
            <Chip
              label="Empty Log"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            This log contains no fight data, likely due to an upload or parsing issue on ESO Logs.
            Re-uploading the log on ESO Logs usually fixes it.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none' }}
            >
              Go back
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/latest-reports')}
              sx={{ textTransform: 'none' }}
            >
              Browse latest reports
            </Button>
            {reportId && (
              <Button
                variant="text"
                size="small"
                component="a"
                href={`https://www.esologs.com/reports/${reportId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none' }}
              >
                View on ESO Logs
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  const renderFightCard = (fight: FightFragment, idx: number): React.ReactNode => {
    // Handle both boss fights and trash fights (encounterID-based, see fightGrouping.isBossFight)
    const fightIsBoss = isBossFight(fight);

    let bossWasKilled: boolean;
    let isFalsePositive: boolean;
    let isWipe: boolean;
    let bossHealthPercent: number;
    let backgroundFillPercent: number;

    if (fightIsBoss) {
      // Boss fight logic — use the API's authoritative `kill` flag (see fightGrouping.wasKill).
      // This replaces the old `bossPercentage`-based heuristic + false-positive detection.
      bossWasKilled = wasKill(fight);
      isFalsePositive = false;
      isWipe = !bossWasKilled;
      const remaining = bossHealthRemaining(fight);
      bossHealthPercent = remaining != null ? Math.round(remaining) : 0;

      // Fill represents progress (damage dealt): kills = full, wipes = 100 - health remaining
      backgroundFillPercent = bossWasKilled ? 100 : 100 - bossHealthPercent;
    } else {
      // Trash fight logic - use the kill field to determine success/wipe
      // kill === true means success, kill === false means wipe, kill === null means unknown (treat as successful)
      const wasKilled = fight.kill === true || fight.kill === null;
      bossWasKilled = false; // Trash fights don't have a "boss"
      isFalsePositive = false; // No false positive detection for trash
      isWipe = fight.kill === false;
      bossHealthPercent = 0;
      backgroundFillPercent = wasKilled ? 100 : 0; // Full bar if successful, empty if wipe
    }

    // Accent bar color — smooth gradient by boss health % for wipes,
    // green for kills (green = complete).
    const accentBarColor = isWipe
      ? getWipeHealthGradientColor(bossHealthPercent)
      : isFalsePositive
        ? darkMode
          ? '#64748b'
          : '#94a3b8'
        : darkMode
          ? '#4ade80'
          : '#10b981';

    const accentGlow = accentBarColor + '66';

    // Status color — for wipes, match the smooth accent gradient so the %
    // text gradually shifts from red (high boss HP left) to green (almost killed)
    const statusColor = isWipe
      ? getWipeHealthGradientColor(bossHealthPercent)
      : isFalsePositive
        ? darkMode
          ? '#64748b'
          : '#94a3b8'
        : darkMode
          ? '#4ade80'
          : '#059669';

    // Glass background tint based on status
    const glassBg = darkMode
      ? isWipe
        ? 'rgba(255, 60, 60, 0.06)'
        : isFalsePositive
          ? 'rgba(100, 116, 139, 0.06)'
          : 'rgba(74, 222, 128, 0.06)'
      : 'rgba(255, 255, 255, 0.6)';

    const borderColor = darkMode ? `${accentBarColor}30` : `${accentBarColor}20`;

    return (
      <ListItem key={fight.id} sx={{ p: 0 }}>
        <ListItemButton
          data-testid={`fight-button-${fight.id}`}
          selected={fightId === String(fight.id)}
          onClick={() => handleFightSelect(fight.id)}
          sx={{
            width: '100%',
            height: { xs: 82, sm: 88 },
            display: 'flex',
            alignItems: 'stretch',
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: '8px',
            p: 0,
            position: 'relative',
            backgroundColor: glassBg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            // Hover shimmer pseudo-element
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: darkMode
                ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent 100%)',
              transition: 'left 400ms cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 1,
              pointerEvents: 'none',
            },
            '&:hover': {
              backgroundColor: darkMode ? `${accentBarColor}12` : `${accentBarColor}0a`,
              borderColor: `${accentBarColor}50`,
              boxShadow: darkMode
                ? `0 0 20px ${accentBarColor}25, inset 0 0 20px ${accentBarColor}08`
                : `0 0 16px ${accentBarColor}18`,
              transform: 'translateY(-1px)',
              '&::after': {
                left: '100%',
              },
            },
            '&:active': {
              transform: 'translateY(0.5px)',
            },
            '&.Mui-selected': {
              backgroundColor: darkMode ? `${accentBarColor}18` : `${accentBarColor}12`,
              borderColor: `${accentBarColor}60`,
              boxShadow: darkMode
                ? `0 0 16px ${accentBarColor}30, inset 0 0 16px ${accentBarColor}0a`
                : `0 0 12px ${accentBarColor}20`,
            },
          }}
        >
          {/* Progress gradient background */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: `${100 - backgroundFillPercent}%`,
              background: isWipe
                ? getWipeHealthGradientBackground(bossHealthPercent, darkMode)
                : fight.difficulty == null || isFalsePositive
                  ? getThemeColors.trashGradient
                  : getThemeColors.killGradient,
              borderRadius: '8px',
              opacity: darkMode ? 0.65 : 0.85,
              zIndex: 0,
            }}
          />
          {/* Left accent bar */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 3,
              background: `linear-gradient(180deg, ${accentBarColor}00 0%, ${accentBarColor} 20%, ${accentBarColor} 80%, ${accentBarColor}00 100%)`,
              boxShadow: `0 0 10px ${accentGlow}, 0 0 4px ${accentBarColor}44`,
              zIndex: 3,
            }}
          />
          {/* HUD corner accents — top-left */}
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              left: 5,
              width: 6,
              height: 6,
              borderTop: `1px solid ${accentBarColor}60`,
              borderLeft: `1px solid ${accentBarColor}60`,
              borderTopLeftRadius: '3px',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
          {/* Interior content */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              pl: { xs: 1.25, sm: 1.75 },
              pr: { xs: 0.75, sm: 1 },
              py: { xs: 0.75, sm: 1 },
            }}
          >
            {/* Zone A: Header — pull # + status badge */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(100,116,139,0.5)',
                  lineHeight: 1,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                #{idx + 1}
              </Typography>
              {/* Status badge — hidden for false positives */}
              {fightIsBoss && !isFalsePositive && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.5,
                    py: 0.15,
                    borderRadius: '3px',
                    border: `1px solid ${statusColor}40`,
                    background: darkMode ? `${statusColor}0a` : `${statusColor}08`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: isWipe ? '0.75rem' : '0.65rem',
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: statusColor,
                      lineHeight: 1,
                      letterSpacing: isWipe ? '0.04em' : '0.12em',
                      textTransform: 'uppercase',
                      textShadow: darkMode ? `0 0 8px ${statusColor}88` : 'none',
                    }}
                  >
                    {isWipe ? (
                      bossHealthPercent + '%'
                    ) : (
                      <>
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          KILL
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                          ✓
                        </Box>
                      </>
                    )}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Zone B: Hero duration — fills remaining vertical space */}
            <Typography
              component="div"
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: { xs: '1.35rem', sm: '1.55rem' },
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: darkMode ? '#f1f5f9' : '#0f172a',
                textShadow: darkMode
                  ? `0 0 12px ${accentBarColor}50, 0 1px 3px rgba(0,0,0,0.6)`
                  : `0 1px 2px rgba(0,0,0,0.08)`,
                lineHeight: 1,
                letterSpacing: '0.08em',
              }}
            >
              {fight.startTime && fight.endTime
                ? formatDuration(fight.startTime, fight.endTime)
                : '--'}
            </Typography>

            {/* Zone C: Data strip — timestamp + player count + progress bar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(100,116,139,0.55)',
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {fight.startTime && reportStartTime
                  ? formatTimestamp(fight.startTime, reportStartTime)
                  : ''}
              </Typography>
              {/* Player count — hidden on xs */}
              {fight.friendlyPlayers && fight.friendlyPlayers.filter(Boolean).length > 0 && (
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    color: darkMode ? 'rgba(255,255,255,0.33)' : 'rgba(100,116,139,0.45)',
                    lineHeight: 1,
                    letterSpacing: '0.04em',
                    display: { xs: 'none', sm: 'block' },
                    flexShrink: 0,
                  }}
                >
                  {fight.friendlyPlayers.filter(Boolean).length}p
                </Typography>
              )}
              {/* Progress micro-bar — wipes only, shows damage progress */}
              {isWipe ? (
                <Box
                  sx={{
                    width: { xs: 28, sm: 40 },
                    height: 3,
                    borderRadius: '1.5px',
                    background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${backgroundFillPercent}%`,
                      borderRadius: '1.5px',
                      background: accentBarColor,
                      boxShadow: darkMode ? `0 0 4px ${accentBarColor}66` : 'none',
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ width: { xs: 28, sm: 40 }, flexShrink: 0 }} />
              )}
            </Box>
          </Box>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <>
      <ReportActionBar
        reportId={reportId || ''}
        title={reportData?.title || 'Report Details'}
        activePage="fights"
      />
      <Card
        elevation={4}
        sx={{
          borderRadius: 2,
          border: (t: Theme) => `1px solid ${t.palette.divider}`,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
          boxShadow: (t: Theme) => (t.palette.mode === 'dark' ? t.shadows[6] : t.shadows[4]),
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'visible',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: (t: Theme) =>
              t.palette.mode === 'dark'
                ? '0 8px 32px rgba(56, 189, 248, 0.15)'
                : '0 8px 32px rgba(25, 118, 210, 0.1)',
          },
        }}
      >
        <CardContent
          sx={{
            p: { xs: 2, sm: 4 },
            overflow: 'visible',
            position: 'relative',
          }}
        >
          {encounters.length === 0 && <Typography> No Fights Found </Typography>}
          {encounters.some((run) =>
            run.encounters.some((e) => e.bossFights.length > ATTEMPT_GROUP_THRESHOLD),
          ) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={groupAttempts}
                    onChange={(e) => setGroupAttempts(e.target.checked)}
                    size="small"
                  />
                }
                label="Group attempts"
                slotProps={{ typography: { variant: 'body2', sx: { color: 'text.secondary' } } }}
                data-testid="group-attempts-toggle"
              />
            </Box>
          )}
          <Box data-testid="fight-list">
            {encounters.map((trialRun) => (
              <Box
                key={trialRun.id}
                data-testid={`trial-section-${trialRun.id}`}
                sx={{
                  mb: 2,
                }}
              >
                {/* Trial Header (always visible, no accordion) */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: '1fr auto' },
                    alignItems: 'center',
                    width: '100%',
                    gap: { xs: 1, sm: 2 },
                    pr: 2,
                    mb: 3,
                    p: 2,
                    borderRadius: 2,
                    border: (t: Theme) => `1px solid ${t.palette.divider}`,
                    background: (t: Theme) =>
                      t.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.66) 0%, rgba(3, 7, 18, 0.66) 100%)'
                        : t.palette.background.paper,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: (t: Theme) =>
                      t.palette.mode === 'dark'
                        ? '0 4px 16px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                      }}
                    >
                      {(() => {
                        // Extract base trial name without parenthesis and run number
                        const cleanTrialName = trialRun.name
                          .replace(/\([^)]*\)/g, '') // Remove parenthesis content
                          .replace(/#\d+/, '') // Remove run number
                          .trim();

                        // Get difficulty label from the calculated trial difficulty
                        const difficultyLabel = trialRun.difficultyLabel;

                        // Define colors for different difficulty levels (theme-aware)
                        const getDifficultyColor = (difficulty: string): string => {
                          switch (difficulty) {
                            case 'Normal':
                              return getThemeColors.normalColor;
                            case 'Veteran':
                              return getThemeColors.veteranColor;
                            case 'Veteran HM':
                            case 'Veteran HM +1':
                            case 'Veteran HM +2':
                            case 'Veteran HM +3':
                              return getThemeColors.hmColor;
                            case 'Partial Veteran HM':
                              return getThemeColors.partialHmColor;
                            default:
                              return 'inherit';
                          }
                        };

                        return (
                          <>
                            <Box
                              component="span"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: { xs: 'nowrap', sm: 'normal' },
                              }}
                            >
                              {cleanTrialName}
                            </Box>
                            {difficultyLabel && (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 700,
                                  color: getDifficultyColor(difficultyLabel),
                                  backgroundColor: `${getDifficultyColor(difficultyLabel)}20`,
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 1,
                                  fontSize: '0.85em',
                                  flexShrink: 0,
                                }}
                              >
                                {difficultyLabel}
                              </Box>
                            )}
                          </>
                        );
                      })()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      justifyContent: 'flex-end',
                    }}
                  >
                    {(() => {
                      // Count killed encounters using the authoritative kill detection.
                      const killedBosses = trialRun.encounters.reduce((count, encounter) => {
                        const hasKill = encounter.bossFights.some((fight) =>
                          isBossFight(fight)
                            ? wasKill(fight)
                            : // Trash: kill === null means unknown (treat as successful)
                              fight.kill === true || fight.kill === null,
                        );
                        return count + (hasKill ? 1 : 0);
                      }, 0);

                      const encounteredBosses = trialRun.encounters.length;

                      // Determine expected total bosses based on zone name
                      const zoneName = trialRun.name.replace(/#\d+/, '').trim();

                      let expectedTotalBosses = encounteredBosses; // default fallback

                      // Known trial boss counts
                      if (zoneName.includes("Kyne's Aegis")) expectedTotalBosses = 3;
                      else if (zoneName.includes('Cloudrest')) {
                        // Cloudrest has variable bosses: 1 main (Z'Maja) + 0-3 minis
                        // Use actual encountered count since minis can be skipped
                        expectedTotalBosses = encounteredBosses;
                      } else if (zoneName.includes('Ossein Cage')) {
                        // Ossein Cage has variable bosses: 1 main + 0-3 optional minis
                        // Minis don't affect boss naming, use actual encountered count
                        expectedTotalBosses = encounteredBosses;
                      } else if (zoneName.includes('Sunspire')) expectedTotalBosses = 3;
                      else if (zoneName.includes('Rockgrove')) {
                        // Rockgrove has 4 main bosses + 1 optional mini (Basks-In-Snakes)
                        // Use actual encountered count since mini is optional
                        expectedTotalBosses = encounteredBosses;
                      } else if (zoneName.includes('Dreadsail Reef')) expectedTotalBosses = 5;
                      else if (zoneName.includes("Sanity's Edge")) expectedTotalBosses = 5;
                      else if (zoneName.includes('Lucent Citadel')) expectedTotalBosses = 4;
                      else if (zoneName.includes('Asylum Sanctorium')) {
                        // Asylum has variable bosses: 1 main + 0-2 minis
                        // Use actual encountered count since minis can be skipped
                        expectedTotalBosses = encounteredBosses;
                      } else if (zoneName.includes('Halls of Fabrication')) expectedTotalBosses = 5;
                      else if (zoneName.includes('Maw of Lorkhaj')) expectedTotalBosses = 3;
                      else if (zoneName.includes('Aetherian Archive')) expectedTotalBosses = 4;
                      else if (zoneName.includes('Hel Ra Citadel')) expectedTotalBosses = 3;
                      else if (zoneName.includes('Sanctum Ophidia')) expectedTotalBosses = 5;
                      else if (zoneName.includes('Opulent Ordeal')) expectedTotalBosses = 1;

                      // Determine color based on completion against expected total
                      let color = getThemeColors.circleOrange; // orange - default for low completion
                      if (killedBosses === expectedTotalBosses) {
                        color = getThemeColors.circleGreen; // green - ALL expected bosses killed
                      } else if (expectedTotalBosses === 5 && killedBosses >= 3) {
                        color = getThemeColors.circleYellow; // yellow - 3-4 kills in 5-boss trial
                      } else if (expectedTotalBosses === 4 && killedBosses >= 2) {
                        color = getThemeColors.circleYellow; // yellow - 2-3 kills in 4-boss trial
                      } else if (expectedTotalBosses === 3 && killedBosses >= 2) {
                        color = getThemeColors.circleYellow; // yellow - 2 kills in 3-boss trial
                      }

                      return (
                        <Box
                          sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: `1px solid ${color}66`,
                            boxShadow:
                              '0 4px 16px 0 rgb(168 215 233 / 25%), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: color,
                            textShadow: darkMode
                              ? '0 1px 2px rgba(0,0,0,0.5)'
                              : '0 1px 1px rgba(59, 130, 246, 0.2)',
                            background: `linear-gradient(135deg, ${color}33 0%, ${color}1a 50%, ${color}14 100%)`,
                            transition: 'all 0.3s ease',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '50%',
                              background:
                                'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                              borderRadius: '50% 50% 100px 100px / 50% 50% 50px 50px',
                              pointerEvents: 'none',
                            },
                          }}
                        >
                          {killedBosses}
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>

                {/* Boss Encounters (always visible) */}
                {trialRun.encounters.map((encounter) => {
                  return (
                    <Box
                      key={encounter.id}
                      data-testid={`encounter-${encounter.id}`}
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        overflow: 'visible',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <BossAvatar bossName={encounter.name} size={32} />
                          <Typography
                            variant="subtitle2"
                            sx={{ color: 'text.primary', fontWeight: 'medium' }}
                          >
                            {encounter.name}{' '}
                            {(() => {
                              // Get difficulty from the first boss fight
                              const bossFight = encounter.bossFights.find(
                                (f) => f.difficulty != null,
                              );
                              if (bossFight && bossFight.difficulty != null) {
                                const trialName = trialRun.trialName || '';
                                const difficultyLabel = getDifficultyLabel(
                                  bossFight.difficulty,
                                  trialName,
                                );
                                return (
                                  <Box
                                    component="span"
                                    sx={{
                                      fontWeight: 700,
                                      color:
                                        difficultyLabel === 'Veteran HM'
                                          ? getThemeColors.hmColor
                                          : darkMode
                                            ? '#d2e5ff'
                                            : '#64748b',
                                    }}
                                  >
                                    ({difficultyLabel})
                                  </Box>
                                );
                              }
                              return null;
                            })()}{' '}
                            <Box component="span" sx={{ fontWeight: 200 }}>
                              ({encounter.bossFights.length})
                            </Box>
                          </Typography>
                          {(() => {
                            // Aggregate attempt summary — only meaningful with >1 attempt.
                            const summary = summarizeEncounter(encounter);
                            if (summary.attempts <= 1) return null;
                            const chips: Array<{ label: string; color: string }> = [];
                            if (summary.kills > 1) {
                              chips.push({
                                label: `${summary.kills} kills`,
                                color: getThemeColors.circleGreen,
                              });
                            }
                            if (!summary.killed && summary.bestPercent != null) {
                              chips.push({
                                label: `Best ${Math.round(summary.bestPercent)}%`,
                                color: getThemeColors.circleOrange,
                              });
                            }
                            if (summary.resets > 0) {
                              chips.push({
                                label: `${summary.resets} reset${summary.resets > 1 ? 's' : ''}`,
                                color: darkMode ? '#94a3b8' : '#64748b',
                              });
                            }
                            if (chips.length === 0) return null;
                            return (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {chips.map((chip) => (
                                  <Chip
                                    key={chip.label}
                                    label={chip.label}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 18,
                                      fontSize: '0.62rem',
                                      color: chip.color,
                                      borderColor: `${chip.color}66`,
                                      '& .MuiChip-label': { px: 0.75 },
                                    }}
                                  />
                                ))}
                              </Box>
                            );
                          })()}
                        </Box>
                        {(encounter.preTrash.length > 0 || encounter.postTrash.length > 0) && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={showTrashForEncounter.has(encounter.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleTrashForEncounter(encounter.id);
                                }}
                                size="small"
                                slotProps={{
                                  input: {
                                    'aria-label': `Show ${encounter.preTrash.length + encounter.postTrash.length} trash fights for this encounter`,
                                  },
                                }}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#38bdf8',
                                    '&:hover': {
                                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                                    },
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#38bdf8',
                                  },
                                }}
                              />
                            }
                            label={`🗑️ ${encounter.preTrash.length + encounter.postTrash.length}`}
                            sx={{ ml: 2, mr: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </Box>

                      {/* Pre-encounter trash */}
                      <Collapse
                        in={
                          showTrashForEncounter.has(encounter.id) && encounter.preTrash.length > 0
                        }
                      >
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}
                          >
                            Pre-encounter trash
                          </Typography>
                          <List
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                              gap: 1,
                              overflow: 'visible',
                            }}
                          >
                            {encounter.preTrash.map((fight, idx) => renderFightCard(fight, idx))}
                          </List>
                        </Box>
                      </Collapse>

                      {/* Boss fights (grouped/collapsed for attempt-heavy encounters) */}
                      {renderBossAttempts(encounter)}

                      {/* Post-encounter trash */}
                      <Collapse
                        in={
                          showTrashForEncounter.has(encounter.id) && encounter.postTrash.length > 0
                        }
                      >
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}
                          >
                            Post-encounter trash
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ mb: 1, color: 'text.secondary', display: 'block' }}
                          >
                            Note: These are the same fights shown as pre-encounter trash for the
                            next boss
                          </Typography>
                          <List
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                              gap: 1,
                              overflow: 'visible',
                            }}
                          >
                            {encounter.postTrash.map((fight, idx) => renderFightCard(fight, idx))}
                          </List>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </>
  );
};
