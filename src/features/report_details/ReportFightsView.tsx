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

import { BossAvatar } from './BossAvatar';

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

/**
 * Detects if a fight marked as 100% wipe is likely a false positive (actually a kill)
 * Uses heuristics based on fight duration, difficulty, and boss percentage
 */
function isFalsePositiveWipe(fight: FightFragment): boolean {
  if (!fight.bossPercentage || fight.bossPercentage < 99.5) {
    return false; // Not a 100% wipe
  }

  const durationMs = fight.endTime - fight.startTime;

  // More aggressive heuristics for false positive detection:

  // 1. Very short fights (< 45 seconds) with high boss health are likely false positives
  if (durationMs < 45000 && fight.bossPercentage >= 95) {
    return true;
  }

  // 2. Exactly 100.0% is very suspicious (ESO bug)
  if (Math.abs(fight.bossPercentage - 100) < 0.1) {
    return true;
  }

  // 3. Any fight with 100% that lasted more than 10 seconds but less than 5 minutes
  if (fight.bossPercentage >= 99.9 && durationMs > 10000 && durationMs < 300000) {
    return true;
  }

  // 4. Normal/veteran difficulty with very high boss health in reasonable time
  if (
    fight.difficulty != null &&
    fight.difficulty >= 1 &&
    fight.difficulty < 10 &&
    fight.bossPercentage >= 98 &&
    durationMs > 15000 &&
    durationMs < 600000
  ) {
    return true;
  }

  return false;
}

/**
 * Smoothly interpolates a wipe color based on boss health % remaining.
 * 100% health remaining (players died fast) → red
 * 0% health remaining (almost killed boss) → green
 * Uses HSL so the transition is continuous through orange → yellow → lime,
 * but returns a hex string so existing `${color}30`-style alpha concatenation
 * (borders, shadows, hover tints) keeps producing valid CSS.
 */
function getWipeHealthGradientColor(percentage: number): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const hue = ((100 - clamped) / 100) * 120; // 100% → 0 (red), 0% → 120 (green)
  return hslToHex(hue, 80, 55);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    const value = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * Smoothly interpolates a wipe background gradient based on boss health % remaining.
 * Returns a two-stop linear-gradient that matches the accent color tone.
 */
function getWipeHealthGradientBackground(percentage: number, darkMode: boolean): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const hue = ((100 - clamped) / 100) * 120;
  if (darkMode) {
    return `linear-gradient(135deg, hsla(${hue}, 80%, 55%, 0.7) 0%, hsla(${hue}, 75%, 38%, 0.55) 100%)`;
  }
  return `linear-gradient(135deg, hsla(${hue}, 85%, 93%, 0.8) 0%, hsla(${hue}, 85%, 88%, 0.6) 100%)`;
}

function getTrialNameFromBoss(
  bossName: string,
  reportData: ReportFragment | null | undefined,
): string {
  const zone = reportData?.zone;
  const zoneName = (zone?.name || '').toLowerCase();

  // Check boss names FIRST to handle mixed-trial reports
  const cleanBossName = bossName.toLowerCase();

  // Opulent Ordeal bosses (single ranked encounter; individual names are trash, not bosses)
  if (cleanBossName.includes('opulent trio')) {
    return 'Opulent Ordeal';
  }

  // Ossein Cage bosses
  if (
    [
      'gedna relvel',
      'hall of fleshcraft',
      'shaper of flesh',
      'shapers of flesh',
      'tortured ranyu',
      'tortured kathutet',
      'tortured amkaos',
      'tortured trio',
      'jynorah',
      'skorkhif',
      'blood drinker thisa',
      'overfiend kazpian',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Ossein Cage';
  }

  // Sanity's Edge bosses
  if (
    ['ansuul', 'spiral', 'twelvane', 'yaseyla', 'yasela'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return "Sanity's Edge";
  }

  // Kyne's Aegis bosses
  if (['falgravn', 'vrol', 'yandir'].some((name) => cleanBossName.includes(name))) {
    return "Kyne's Aegis";
  }

  // Other trials... (keep existing boss checks but update to use includes for partial matches)
  if (['lokke', 'nahviintaas', 'yolnahkriin'].some((name) => cleanBossName.includes(name))) {
    return 'Sunspire';
  }

  if (["z'maja", 'galenwe', 'relequen', 'siroria'].some((name) => cleanBossName.includes(name))) {
    return 'Cloudrest';
  }

  if (
    ['lord felms', 'saint felms', 'saint llothis', 'saint olms'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Asylum Sanctorium';
  }

  if (
    [
      'xoryn',
      'count ryelaz',
      'zilyesset',
      'cavot agnan',
      'orphic shattered shard',
      'cavot',
      'orphic',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Lucent Citadel';
  }

  if (
    ['oaxiltso', 'flame-herald bahsei', 'xalvakka', 'ash titan', 'basks-in-snakes', 'basks'].some(
      (name) => cleanBossName.includes(name),
    )
  ) {
    return 'Rockgrove';
  }

  if (
    [
      'lylanar and turlassil',
      'sail ripper',
      'bow breaker',
      'reef guardian',
      'tideborn taleria',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Dreadsail Reef';
  }

  if (
    [
      'hunter-killer fabricant',
      'pinnacle factotum',
      'archcustodian',
      'assembly general',
      'refabrication committee',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Halls of Fabrication';
  }

  if (
    ["zhaj'hassa the forgotten", 'vashai', 'rakkhat', 'twins', "zhaj'hassa"].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Maw of Lorkhaj';
  }

  if (
    [
      'possessed manticora',
      'possessed mantikora',
      'stonebreaker',
      'ozara',
      'serpent',
      'mantikora',
      'manticora',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Sanctum Ophidia';
  }

  if (
    ['ra kotu', "yokeda rok'dun", 'yokedas', 'the warrior'].some((name) =>
      cleanBossName.includes(name),
    )
  ) {
    return 'Hel Ra Citadel';
  }

  if (
    [
      'storm atronach',
      'stone atronach',
      'varlariel',
      'the mage',
      'foundation stone atronach',
      'lightning storm atronach',
    ].some((name) => cleanBossName.includes(name))
  ) {
    return 'Aetherian Archive';
  }

  // Check for trial names in zone name as fallback
  const trialFromZone = [
    { names: ["sanity's edge", 'vse'], id: "Sanity's Edge" },
    { names: ["kyne's aegis", 'vka'], id: "Kyne's Aegis" },
    { names: ['sunspire', 'vss'], id: 'Sunspire' },
    { names: ['cloudrest', 'vcr'], id: 'Cloudrest' },
    { names: ['asylum', 'vas'], id: 'Asylum Sanctorium' },
    { names: ['rockgrove', 'vrg'], id: 'Rockgrove' },
    { names: ['dreadsail', 'vdsr'], id: 'Dreadsail Reef' },
    { names: ['halls of fabrication', 'vhof'], id: 'Halls of Fabrication' },
    { names: ['maw of lorkhaj', 'vmol'], id: 'Maw of Lorkhaj' },
    { names: ['sanctum ophidia', 'vso'], id: 'Sanctum Ophidia' },
    { names: ['hel ra', 'vhrc'], id: 'Hel Ra Citadel' },
    { names: ['aetherian', 'vaa'], id: 'Aetherian Archive' },
    { names: ['ossein cage'], id: 'Ossein Cage' },
    { names: ['opulent ordeal', 'voo'], id: 'Opulent Ordeal' },
    { names: ['eye of the storm'], id: 'Eye of the Storm' },
  ].find((trial) => trial.names.some((name) => zoneName.includes(name)));

  if (trialFromZone) {
    return trialFromZone.id;
  }

  // Final fallback to zone name if boss not recognized
  return reportData?.zone?.name || 'Unknown Trial';
}

// Helper function to determine if a trial has per-boss HM or final-boss-only HM
function getTrialHMType(trialName: string): 'per-boss' | 'final-boss-only' | 'special' {
  const perBossHMTrials = [
    'Sunspire',
    "Kyne's Aegis",
    'Rockgrove',
    'Dreadsail Reef',
    "Sanity's Edge",
    'Lucent Citadel',
    'Ossein Cage',
    'Opulent Ordeal',
  ];

  const specialTrials = ['Cloudrest', 'Asylum'];

  if (specialTrials.some((trial) => trialName.includes(trial))) {
    return 'special';
  }

  if (perBossHMTrials.some((trial) => trialName.includes(trial))) {
    return 'per-boss';
  }

  return 'final-boss-only';
}

function getDifficultyLabel(difficulty: number | null, trialName: string): string | null {
  if (!difficulty || difficulty < 10) {
    return 'Normal';
  }

  // Special handling for Cloudrest and Asylum Sanctorium
  const isCloudrest = trialName.includes('Cloudrest') || trialName.includes('CR');
  const isAsylum = trialName.includes('Asylum') || trialName.includes('AS');

  if (isCloudrest || isAsylum) {
    if (difficulty === 125) return 'Veteran +3';
    if (difficulty === 124) return 'Veteran +2';
    if (difficulty === 123) return 'Veteran +1';
    if (difficulty === 122) return 'Veteran HM';
    if (difficulty === 121) return 'Veteran';
    return 'Veteran';
  }

  // General difficulty mapping for all other trials
  if (difficulty === 122) return 'Veteran HM';
  if (difficulty === 121) return 'Veteran';

  return 'Veteran';
}

function calculateTrialDifficulty(
  fights: FightFragment[],
  trialName: string,
): { difficulty: number; label: string } {
  // Get HM type for this trial
  const hmType = getTrialHMType(trialName);
  const nonHMBosses = ['Basks-In-Snakes', 'Basks-in-Snakes', 'Ash Titan'];

  if (hmType === 'per-boss') {
    // For per-boss HM trials, analyze all HM-capable bosses in this run
    const hmCapableFights = fights.filter((fight) => !nonHMBosses.includes(fight.name));

    if (hmCapableFights.length === 0) {
      return { difficulty: 121, label: 'Veteran' };
    }

    const hmBosses = hmCapableFights.filter((fight) => fight.difficulty === 122);
    const vetBosses = hmCapableFights.filter((fight) => fight.difficulty === 121);
    const normalBosses = hmCapableFights.filter((fight) => (fight.difficulty ?? 0) < 10);

    // Determine difficulty pattern for this run
    if (normalBosses.length > 0 && hmBosses.length === 0 && vetBosses.length === 0) {
      return { difficulty: 0, label: 'Normal' };
    } else if (hmBosses.length > 0 && vetBosses.length === 0) {
      return { difficulty: 122, label: 'Veteran HM' };
    } else if (hmBosses.length === 0 && vetBosses.length > 0) {
      return { difficulty: 121, label: 'Veteran' };
    } else if (hmBosses.length > 0 && vetBosses.length > 0) {
      return { difficulty: 122, label: 'Partial Veteran HM' };
    } else {
      // Mixed with normal - default to veteran
      return { difficulty: 121, label: 'Veteran' };
    }
  } else if (hmType === 'final-boss-only') {
    // For final-boss-only HM trials, check if ANY boss in this run was HM
    // This handles cases where the final boss was done in HM
    const hasHM = fights.some((fight) => fight.difficulty === 122);
    const hasVet = fights.some((fight) => fight.difficulty === 121);
    const hasNormal = fights.some((fight) => (fight.difficulty ?? 0) < 10);

    if (hasHM) {
      return { difficulty: 122, label: 'Veteran HM' };
    } else if (hasVet) {
      return { difficulty: 121, label: 'Veteran' };
    } else if (hasNormal) {
      return { difficulty: 0, label: 'Normal' };
    } else {
      return { difficulty: 121, label: 'Veteran' };
    }
  } else if (hmType === 'special') {
    // For Cloudrest and Asylum Sanctorium, use difficulty codes for HM detection
    // Difficulty codes: 121=Veteran, 122=Standard HM, 123=+1, 124=+2, 125=+3
    const difficulties = fights.map((fight) => fight.difficulty ?? 0).filter((d) => d > 0);
    const maxDifficulty = Math.max(...difficulties, 0);
    const hasNormal = fights.some((fight) => (fight.difficulty ?? 0) < 10);

    if (maxDifficulty >= 125) {
      return { difficulty: 125, label: 'Veteran HM +3' };
    } else if (maxDifficulty >= 124) {
      return { difficulty: 124, label: 'Veteran HM +2' };
    } else if (maxDifficulty >= 123) {
      return { difficulty: 123, label: 'Veteran HM +1' };
    } else if (maxDifficulty >= 122) {
      return { difficulty: 122, label: 'Veteran HM' };
    } else if (maxDifficulty >= 121) {
      return { difficulty: 121, label: 'Veteran' };
    } else if (hasNormal) {
      return { difficulty: 0, label: 'Normal' };
    } else {
      return { difficulty: 121, label: 'Veteran' };
    }
  } else {
    // Fallback for any unhandled trial types
    return { difficulty: 121, label: 'Veteran' };
  }
}

interface ReportFightsViewProps {
  fights: FightFragment[] | null | undefined;
  loading: boolean;
  fightId: string | undefined | null;
  reportId: string | undefined | null;
  reportStartTime: number | undefined | null;
  reportData: ReportFragment | null | undefined;
}

interface Encounter {
  id: string;
  name: string;
  bossFights: FightFragment[];
  preTrash: FightFragment[];
  postTrash: FightFragment[];
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
        killGradient:
          'linear-gradient(135deg, rgba(56, 189, 248, 0.7) 0%, rgba(34, 211, 238, 0.5) 50%, rgba(16, 185, 129, 0.6) 100%)',
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
        killGradient:
          'linear-gradient(135deg, rgba(224, 247, 250, 0.8) 0%, rgba(224, 242, 241, 0.6) 100%)',
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
    if (!fights) return [];

    // First, filter and sort all valid fights by start time
    const validFights = fights
      .filter((fight) => fight.startTime && fight.endTime && fight.endTime > fight.startTime)
      .sort((a, b) => a.startTime - b.startTime);

    // Separate boss fights and trash fights
    const bossFights = validFights.filter((fight) => fight.difficulty != null);
    const trashFights = validFights.filter((fight) => fight.difficulty == null);

    // Track boss progression to detect trial resets
    const bossProgressionOrder: string[] = [];
    const bossInstancesSeen: Set<string> = new Set();
    let currentRunNumber = 1;

    // Group bosses by zone and detect trial runs
    const trialRuns: Array<{
      id: string;
      name: string;
      encounters: Encounter[];
      startTime: number;
      endTime: number;
      difficulty: number | null;
      difficultyLabel: string | null;
      fights: FightFragment[];
      trialName: string;
      isComplete: boolean;
    }> = [];

    // Process each fight
    const trialNamesByRun: Record<number, string> = {};

    for (let i = 0; i < bossFights.length; i++) {
      const currentBoss = bossFights[i];
      const nextBoss = bossFights[i + 1];
      const bossName = currentBoss.name || 'Unknown Boss';
      // Instance count should only be used for encounter IDs, not for determining resets
      const bossProgressionKey = bossName; // Just the boss name, not including instance count

      // Determine trial name from boss name
      const trialName = getTrialNameFromBoss(bossName, reportData);

      // SIMPLIFIED APPROACH: Don't try to separate trial instances
      // Just group all bosses from the same trial together
      // This avoids all the complex edge cases and false separations
      let shouldStartNewRun = false;

      // Only separate if this is a completely different trial
      const currentRunTrialName = trialNamesByRun[currentRunNumber];
      if (currentRunTrialName && currentRunTrialName !== trialName) {
        shouldStartNewRun = true;
      }

      if (shouldStartNewRun) {
        // Reset progression tracking
        currentRunNumber++;
        bossInstancesSeen.clear();
        bossProgressionOrder.length = 0;
      }

      // Track boss progression and trial name for this run
      bossProgressionOrder.push(bossProgressionKey);
      bossInstancesSeen.add(bossProgressionKey);

      // Set the trial name for this run
      trialNamesByRun[currentRunNumber] = trialName;

      const trialRunId = `${trialName}-run-${currentRunNumber}`;
      const trialRunName = `${trialName}`;

      // Find or create the trial run
      let currentTrialRun = trialRuns.find((run) => run.id === trialRunId);

      if (!currentTrialRun) {
        // For now, use the current boss difficulty as initial difficulty
        // This will be updated later when we finalize the trial run
        const initialDifficulty = currentBoss.difficulty ?? 0;
        const initialDifficultyLabel = getDifficultyLabel(initialDifficulty, trialName);

        const nameWithDifficulty = initialDifficultyLabel
          ? `${trialRunName} (${initialDifficultyLabel})`
          : trialRunName;

        const newTrialRun = {
          id: trialRunId,
          name: nameWithDifficulty,
          startTime: currentBoss.startTime,
          endTime: currentBoss.endTime,
          difficulty: initialDifficulty,
          difficultyLabel: initialDifficultyLabel,
          fights: [currentBoss],
          trialName: trialName,
          isComplete: false,
          encounters: [],
        };

        trialRuns.push(newTrialRun);
        currentTrialRun = newTrialRun;
      }

      // Find trash before this boss (after previous boss or from start)
      const prevBossEnd = i > 0 ? bossFights[i - 1].endTime : 0;
      const preTrash = trashFights.filter(
        (trash) => trash.startTime >= prevBossEnd && trash.startTime < currentBoss.startTime,
      );

      // Find trash after this boss (before next boss or until end)
      const nextBossStart = nextBoss ? nextBoss.startTime : Number.MAX_SAFE_INTEGER;
      const postTrash = trashFights.filter(
        (trash) => trash.startTime > currentBoss.endTime && trash.startTime < nextBossStart,
      );

      // Ensure currentTrialRun is defined before proceeding
      if (!currentTrialRun) {
        // Skip to next boss if no trial run is available
        continue;
      }

      // Group all attempts of the same boss into one encounter
      // Use only boss name (without instance count) for encounter grouping
      const encounterKey = `${trialRunId}-${bossName.replace(/\s+/g, '-').toLowerCase()}`;
      let bossEncounter = currentTrialRun.encounters.find((enc) => enc.id === encounterKey);

      if (!bossEncounter) {
        // Create display name without instance numbers
        const displayName = bossName;

        const newEncounter: Encounter = {
          id: encounterKey,
          name: displayName,
          bossFights: [],
          preTrash: [],
          postTrash: [],
        };
        currentTrialRun.encounters.push(newEncounter);
        bossEncounter = newEncounter;
      }

      // Add boss and pre-trash to the encounter
      bossEncounter.bossFights.push(currentBoss);
      bossEncounter.preTrash.push(...preTrash);

      // Update the trial run's fights array to include all bosses
      if (!currentTrialRun.fights.some((f) => f.id === currentBoss.id)) {
        currentTrialRun.fights.push(currentBoss);
      }

      // Only add post-trash if there's a next boss (not the final boss)
      if (nextBoss) {
        bossEncounter.postTrash.push(...postTrash);
      }
    }

    // Handle any remaining trash that doesn't fit near bosses
    const allCategorizedTrash = trialRuns.flatMap((run) =>
      run.encounters.flatMap((enc) => [...enc.preTrash, ...enc.postTrash]),
    );
    const uncategorizedTrash = trashFights.filter(
      (trash) => !allCategorizedTrash.some((cat) => cat.id === trash.id),
    );

    if (uncategorizedTrash.length > 0) {
      trialRuns.push({
        id: 'misc-trash',
        name: 'Miscellaneous Trash',
        startTime: uncategorizedTrash[0]?.startTime || 0,
        endTime: uncategorizedTrash[uncategorizedTrash.length - 1]?.endTime || 0,
        difficulty: null,
        difficultyLabel: null,
        fights: [],
        trialName: 'Miscellaneous',
        isComplete: true,
        encounters: [
          {
            id: 'misc-trash-encounter',
            name: 'Miscellaneous Trash',
            bossFights: [],
            preTrash: uncategorizedTrash,
            postTrash: [],
          },
        ],
      });
    }

    // Update trial run names to remove any existing run numbers
    const updatedTrialRuns = trialRuns?.map((run) => {
      const baseName = run.name.replace(/#\d+$/, '');

      return {
        ...run,
        name: baseName,
      };
    });

    // Calculate trial difficulty for each individual run based on its own fights
    const finalizedTrialRuns = updatedTrialRuns.map((run, _index) => {
      const baseName = run.name.replace(/#\d+/, '').trim(); // Remove run number for calculation
      const trialDifficulty = calculateTrialDifficulty(run.fights, baseName);

      return {
        ...run,
        difficulty: trialDifficulty.difficulty,
        difficultyLabel: trialDifficulty.label,
      };
    });

    return finalizedTrialRuns;
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
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none' }}
          >
            Go back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderFightCard = (fight: FightFragment, idx: number): React.ReactNode => {
    // Handle both boss fights and trash fights
    const isBossFight = fight.difficulty != null;

    let bossWasKilled: boolean;
    let rawIsWipe: boolean;
    let isFalsePositive: boolean;
    let isWipe: boolean;
    let bossHealthPercent: number;
    let backgroundFillPercent: number;

    if (isBossFight) {
      // Boss fight logic - consider anything <= 1% as a kill (not just 0.01%)
      bossWasKilled =
        fight.bossPercentage !== null &&
        fight.bossPercentage !== undefined &&
        fight.bossPercentage <= 1.0;
      rawIsWipe =
        fight.bossPercentage !== null &&
        fight.bossPercentage !== undefined &&
        fight.bossPercentage > 1.0;
      isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
      isWipe = rawIsWipe && !isFalsePositive;
      bossHealthPercent =
        fight.bossPercentage !== null && fight.bossPercentage !== undefined
          ? Math.round(fight.bossPercentage)
          : 0;

      // Fill represents progress (damage dealt): kills = full, wipes = 100 - health remaining
      backgroundFillPercent = bossWasKilled ? 100 : isWipe ? 100 - bossHealthPercent : 100;
    } else {
      // Trash fight logic - use the kill field to determine success/wipe
      // kill === true means success, kill === false means wipe, kill === null means unknown (treat as successful)
      const wasKilled = fight.kill === true || fight.kill === null;
      bossWasKilled = false; // Trash fights don't have a "boss"
      rawIsWipe = fight.kill === false;
      isFalsePositive = false; // No false positive detection for trash
      isWipe = rawIsWipe;
      bossHealthPercent = 0;
      backgroundFillPercent = wasKilled ? 100 : 0; // Full bar if successful, empty if wipe
    }

    // Accent bar color — smooth gradient by boss health % for wipes
    const accentBarColor = isWipe
      ? getWipeHealthGradientColor(bossHealthPercent)
      : isFalsePositive
        ? darkMode
          ? '#64748b'
          : '#94a3b8'
        : darkMode
          ? '#38bdf8'
          : '#06b6d4';

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
          : 'rgba(56, 189, 248, 0.06)'
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
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
          {/* HUD corner accents — bottom-right */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 3,
              right: 5,
              width: 6,
              height: 6,
              borderBottom: `1px solid ${accentBarColor}40`,
              borderRight: `1px solid ${accentBarColor}40`,
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
              {isBossFight && !isFalsePositive && (
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
                      // Count killed bosses (boss percentage <= 0.01 or false positive wipes)
                      const killedBosses = trialRun.encounters.reduce((count, encounter) => {
                        const hasKill = encounter.bossFights.some((fight) => {
                          // Use the same kill logic as individual fight cards
                          const isBossFight = fight.difficulty != null;
                          if (isBossFight) {
                            const bossWasKilled =
                              fight.bossPercentage !== null &&
                              fight.bossPercentage !== undefined &&
                              fight.bossPercentage <= 1.0;
                            const rawIsWipe =
                              fight.bossPercentage !== null &&
                              fight.bossPercentage !== undefined &&
                              fight.bossPercentage > 1.0;
                            const isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
                            return bossWasKilled || isFalsePositive; // Kill if boss was killed or false positive wipe
                          } else {
                            // For trash fights, use the kill field to determine success
                            // kill === true means success, kill === null means unknown (treat as successful)
                            return fight.kill === true || fight.kill === null;
                          }
                        });
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

                      {/* Boss fights */}
                      <List
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(auto-fill, minmax(100px, 1fr))',
                            sm: 'repeat(auto-fill, minmax(120px, 1fr))',
                            md: 'repeat(auto-fill, minmax(140px, 1fr))',
                            lg: 'repeat(auto-fill, minmax(160px, 1fr))',
                          },
                          gap: { xs: 0.5, sm: 1 },
                          overflow: 'visible',
                        }}
                      >
                        {encounter.bossFights.map((fight, idx) => renderFightCard(fight, idx))}
                      </List>

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
