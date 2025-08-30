// Third-party imports
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Skeleton,
  Collapse,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Boss avatar URL mappings using public folder paths
const bossAvatars: Record<string, string> = {
  // Kyne's Aegis
  'Lord Falgravn': '/src/assets/Kyne\'s%20Aegis/Boss%20Avatars/Lord%20Falgravn.png',
  'Falgraven': '/src/assets/Kyne\'s%20Aegis/Boss%20Avatars/Lord%20Falgravn.png',
  'Captain Vrol': '/src/assets/Kyne\'s%20Aegis/Boss%20Avatars/Captain%20Vrol.png',
  'Vrol': '/src/assets/Kyne\'s%20Aegis/Boss%20Avatars/Captain%20Vrol.png',
  'Yandir the Butcher': '/src/assets/Kyne\'s%20Aegis/Boss%20Avatars/Yandir%20the%20Butcher.png',
  
  // Ossein Cage
  'Blood Drinker Thisa': '/src/assets/Ossein%20Cage/Boss%20Avatars/blood%20drinker%20thisa.png',
  'Hall of Fleshcraft': '/src/assets/Ossein%20Cage/Boss%20Avatars/hall%20of%20fleshcraft.png',
  'Jynorah and Skorkhif': '/src/assets/Ossein%20Cage/Boss%20Avatars/jynorah%20and%20skorkhif.png',
  'Overfiend Kazpian': '/src/assets/Ossein%20Cage/Boss%20Avatars/overfiend%20kazpian.png',
  'Red Witch Gedna Relvel': '/src/assets/Ossein%20Cage/Boss%20Avatars/red%20witch%20gedna%20relvel.png',
  'Tortured Ranyu': '/src/assets/Ossein%20Cage/Boss%20Avatars/tortued%20ranyu.png',
  
  // Dreadsail Reef
  'Bow Breaker': '/src/assets/Dreadsail%20Reef/Boss%20Avatars/Bow%20Breaker.png',
  'Lylanar and Turlassil': '/src/assets/Dreadsail%20Reef/Boss%20Avatars/Lylanar%20and%20Turlassil.png',
  'Reef Guardian': '/src/assets/Dreadsail%20Reef/Boss%20Avatars/Reef%20Guardian.png',
  'Sail Ripper': '/src/assets/Dreadsail%20Reef/Boss%20Avatars/Sail%20Ripper.png',
  'Tideborn Taleria': '/src/assets/Dreadsail%20Reef/Boss%20Avatars/Tideborn%20Taleria.png',
  
  // Hel Ra Citadel
  'Ra Kotu': '/src/assets/Hel%20Ra%20Citadel/Boss%20Avatars/ra%20kotu.png',
  'The Warrior': '/src/assets/Hel%20Ra%20Citadel/Boss%20Avatars/the%20warrior.png',
  'The Yokedas': '/src/assets/Hel%20Ra%20Citadel/Boss%20Avatars/the%20yokedas.png',
  "Yokeda Rok'dun": '/src/assets/Hel%20Ra%20Citadel/Boss%20Avatars/the%20yokedas.png',
  'Yokedas': '/src/assets/Hel%20Ra%20Citadel/Boss%20Avatars/the%20yokedas.png',
  
  // Asylum Sanctorium
  'Saint Felms the Bold': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20felms%20the%20bold.png',
  'Lord Felms': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20felms%20the%20bold.png',
  'Saint Felms': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20felms%20the%20bold.png',
  'Saint Llothis the Pious': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20llothis%20the%20pious.png',
  'Saint Llothis': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20llothis%20the%20pious.png',
  'Saint Olms the Just': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20olms%20the%20just.png',
  'Saint Olms': '/src/assets/Asylum%20Sanctorium/Boss%20Avatars/saint%20olms%20the%20just.png',
  
  // Rockgrove
  'Ash Titan': '/src/assets/Rockgrove/Boss%20Avatars/ash%20titan.png',
  'Basks-in-Snakes': '/src/assets/Rockgrove/Boss%20Avatars/basks-in-snakes.png',
  'Basks-In-Snakes': '/src/assets/Rockgrove/Boss%20Avatars/basks-in-snakes.png',
  'Flame-Herald Bahsei': '/src/assets/Rockgrove/Boss%20Avatars/flame-herald%20bahsei.png',
  'Oaxiltso': '/src/assets/Rockgrove/Boss%20Avatars/oaxiltso.png',
  'Xalvakka': '/src/assets/Rockgrove/Boss%20Avatars/xalvakka.png',
  
  // Aetherian Archive
  'Foundation Stone Atronach': '/src/assets/Aetherian%20Archive/Boss%20Avatars/foundation%20stone%20atronach.png',
  'Storm Atronach': '/src/assets/Aetherian%20Archive/Boss%20Avatars/foundation%20stone%20atronach.png',
  'Lightning Storm Atronach': '/src/assets/Aetherian%20Archive/Boss%20Avatars/lightning%20storm%20atronach.png',
  'Stone Atronach': '/src/assets/Aetherian%20Archive/Boss%20Avatars/lightning%20storm%20atronach.png',
  'The Mage': '/src/assets/Aetherian%20Archive/Boss%20Avatars/the%20mage.png',
  'Varlariel': '/src/assets/Aetherian%20Archive/Boss%20Avatars/varariel.png',
  
  // Cloudrest
  'Shade of Galenwe': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20galenwe.png',
  'Galenwe': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20galenwe.png',
  'Shade of Relequen': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20relequen.png',
  'Relequen': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20relequen.png',
  'Shade of Siroria': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20siroria.png',
  'Siroria': '/src/assets/Cloudrest/Boss%20Avatars/shade%20of%20siroria.png',
  "Z'maja": '/src/assets/Cloudrest/Boss%20Avatars/z\'maja.png',
  
  // Sanctum Ophidia
  'Ozara': '/src/assets/Sanctum%20Ophidia/Boss%20Avatars/ozara.png',
  'Possessed Manticora': '/src/assets/Sanctum%20Ophidia/Boss%20Avatars/possessed%20mantikora.png',
  'Stonebreaker': '/src/assets/Sanctum%20Ophidia/Boss%20Avatars/stonebreaker.png',
  'The Serpent': '/src/assets/Sanctum%20Ophidia/Boss%20Avatars/the%20serpent.png',
  'Serpent': '/src/assets/Sanctum%20Ophidia/Boss%20Avatars/the%20serpent.png',
  
  // Halls of Fabrication
  'Archcustodian': '/src/assets/The%20Halls%20of%20Fabrication/Boss%20Avatars/archcustodian.png',
  'Assembly General': '/src/assets/The%20Halls%20of%20Fabrication/Boss%20Avatars/assembly%20general.png',
  'Hunter-Killer Fabricant': '/src/assets/The%20Halls%20of%20Fabrication/Boss%20Avatars/the%20hunter%20killers.png',
  'Pinnacle Factotum': '/src/assets/The%20Halls%20of%20Fabrication/Boss%20Avatars/pinnacle%20factotum.png',
  'The Refabrication Committee': '/src/assets/The%20Halls%20of%20Fabrication/Boss%20Avatars/the%20refabrication%20committee.png',
  
  // Lucent Citadel
  'Cavot Agnan': '/src/assets/Lucent%20Citadel/Boss%20Avatars/cavot%20agnan.png',
  'Dariel Lemonds': '/src/assets/Lucent%20Citadel/Boss%20Avatars/dariel%20lemonds.png',
  'Count Ryelaz': '/src/assets/Lucent%20Citadel/Boss%20Avatars/dariel%20lemonds.png',
  'Orphic Shattered Shard': '/src/assets/Lucent%20Citadel/Boss%20Avatars/orphic%20shattered%20shard.png',
  'Xoryn': '/src/assets/Lucent%20Citadel/Boss%20Avatars/xoryn.png',
  'Zilyseet': '/src/assets/Lucent%20Citadel/Boss%20Avatars/zilyseet.png',
  'Zilyesset': '/src/assets/Lucent%20Citadel/Boss%20Avatars/zilyseet.png',
  'Baron Rize': '/src/assets/Lucent%20Citadel/Boss%20Avatars/xoryn.png',
  'Jresazzel': '/src/assets/Lucent%20Citadel/Boss%20Avatars/orphic%20shattered%20shard.png',
  'Xynizata': '/src/assets/Lucent%20Citadel/Boss%20Avatars/cavot%20agnan.png',
  
  // Maw of Lorkhaj
  "Zhaj'hassa the Forgotten": '/src/assets/Maw%20of%20Lorkhaj/Boss%20Avatars/Zhaj\'hassa%20the%20forgotten.png',
  'Rakkhat': '/src/assets/Maw%20of%20Lorkhaj/Boss%20Avatars/rakkhat.png',
  'The Twins': '/src/assets/Maw%20of%20Lorkhaj/Boss%20Avatars/the%20twins.png',
  'Vashai': '/src/assets/Maw%20of%20Lorkhaj/Boss%20Avatars/the%20twins.png',
};
import { FightFragment, ReportFragment } from '../../graphql/generated';

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
  const durationSeconds = durationMs / 1000;

  // More aggressive heuristics for false positive detection:

  // 1. Very short fights (< 45 seconds) with high boss health are likely false positives
  if (durationSeconds < 45 && fight.bossPercentage >= 95) {
    return true;
  }

  // 2. Exactly 100.0% is very suspicious (ESO bug)
  if (Math.abs(fight.bossPercentage - 100) < 0.1) {
    return true;
  }

  // 3. Any fight with 100% that lasted more than 10 seconds but less than 5 minutes
  if (fight.bossPercentage >= 99.9 && durationSeconds > 10 && durationSeconds < 300) {
    return true;
  }

  // 4. Normal/veteran difficulty with very high boss health in reasonable time
  if (
    (fight.difficulty >= 1 && fight.difficulty < 10) &&
    fight.bossPercentage >= 98 &&
    durationSeconds > 15 &&
    durationSeconds < 600
  ) {
    return true;
  }

  return false;
}

function getBossAvatar(bossName: string): string | null {
  // Remove instance numbers and extra text to match avatar keys
  const cleanName = bossName.replace(/#\d+$/, '').trim();
  return bossAvatars[cleanName] || null;
}

function getTrialNameFromBoss(bossName: string, reportData: ReportFragment | null | undefined): string {
  const zone = reportData?.zone;
  const zoneName = (zone?.name || '').toLowerCase();
  
  // Check boss names FIRST to handle mixed-trial reports
  const cleanBossName = bossName.toLowerCase();
  
  // DEBUG: Log boss name matching
  console.log('🎯 BOSS NAME DEBUG:', {
    originalBossName: bossName,
    cleanBossName,
    zoneName
  });
  
  // Sanity's Edge bosses
  if (['ansuul', 'spiral', 'twelvane', 'yaseyla', 'yasela'].some(name => 
      cleanBossName.includes(name))) {
    return "Sanity's Edge";
  }
  
  // Kyne's Aegis bosses
  if (['falgravn', 'vrol', 'yandir'].some(name => cleanBossName.includes(name))) {
    return "Kyne's Aegis";
  }
  
  // Other trials... (keep existing boss checks but update to use includes for partial matches)
  if (['lokke', 'nahviintaas', 'yolnahkriin'].some(name => cleanBossName.includes(name))) {
    return 'Sunspire';
  }
  
  if (['z\'maja', 'galenwe', 'relequen', 'siroria'].some(name => cleanBossName.includes(name))) {
    return 'Cloudrest';
  }
  
  if (['lord felms', 'saint felms', 'saint llothis', 'saint olms'].some(name => cleanBossName.includes(name))) {
    return 'Asylum Sanctorium';
  }
  
  if (['xoryn', 'count ryelaz', 'zilyesset', 'cavot agnan', 'orphic shattered shard', 'cavot', 'orphic'].some(name => cleanBossName.includes(name))) {
    return 'Lucent Citadel';
  }
  
  if (['oaxiltso', 'flame-herald bahsei', 'xalvakka', 'ash titan', 'basks-in-snakes', 'basks'].some(name => cleanBossName.includes(name))) {
    return 'Rockgrove';
  }
  
  if (['lylanar and turlassil', 'sail ripper', 'bow breaker', 'reef guardian', 'tideborn taleria'].some(name => cleanBossName.includes(name))) {
    return 'Dreadsail Reef';
  }
  
  if (['hunter-killer fabricant', 'pinnacle factotum', 'archcustodian', 'assembly general', 'refabrication committee'].some(name => cleanBossName.includes(name))) {
    return 'Halls of Fabrication';
  }
  
  if (['zhaj\'hassa the forgotten', 'vashai', 'rakkhat', 'twins', 'zhaj\'hassa'].some(name => cleanBossName.includes(name))) {
    return 'Maw of Lorkhaj';
  }
  
  if (['possessed manticora', 'stonebreaker', 'ozara', 'serpent', 'manticora'].some(name => cleanBossName.includes(name))) {
    return 'Sanctum Ophidia';
  }
  
  if (['ra kotu', 'yokeda rok\'dun', 'yokedas', 'the warrior'].some(name => cleanBossName.includes(name))) {
    console.log('✅ BOSS MATCH: Hel Ra Citadel for', bossName);
    return 'Hel Ra Citadel';
  }
  
  if (['storm atronach', 'stone atronach', 'varlariel', 'the mage', 'foundation stone atronach', 'lightning storm atronach'].some(name => cleanBossName.includes(name))) {
    return 'Aetherian Archive';
  }
  
  // Check for trial names in zone name as fallback
  const trialFromZone = [
    { names: ["sanity's edge", "vse"], id: "Sanity's Edge" },
    { names: ["kyne's aegis", "vka"], id: "Kyne's Aegis" },
    { names: ["sunspire", "vss"], id: "Sunspire" },
    { names: ["cloudrest", "vcr"], id: "Cloudrest" },
    { names: ["asylum", "vas"], id: "Asylum Sanctorium" },
    { names: ["rockgrove", "vrg"], id: "Rockgrove" },
    { names: ["dreadsail", "vdsr"], id: "Dreadsail Reef" },
    { names: ["halls of fabrication", "vhof"], id: "Halls of Fabrication" },
    { names: ["maw of lorkhaj", "vmol"], id: "Maw of Lorkhaj" },
    { names: ["sanctum ophidia", "vso"], id: "Sanctum Ophidia" },
    { names: ["hel ra", "vhrc"], id: "Hel Ra Citadel" },
    { names: ["aetherian", "vaa"], id: "Aetherian Archive" },
    { names: ["ossein cage"], id: "Ossein Cage" },
    { names: ["eye of the storm"], id: "Eye of the Storm" }
  ].find(trial => trial.names.some(name => zoneName.includes(name)));
  
  if (trialFromZone) {
    console.log('🏛️ ZONE FALLBACK MATCH:', { zoneName, matchedTrial: trialFromZone.id, bossName });
    return trialFromZone.id;
  }
  
  // Final fallback to zone name if boss not recognized
  return reportData?.zone?.name || 'Unknown Trial';
}

// Helper function to determine if a trial has per-boss HM or final-boss-only HM
function getTrialHMType(trialName: string): 'per-boss' | 'final-boss-only' | 'special' {
  const perBossHMTrials = [
    'Sunspire', 'Kyne\'s Aegis', 'Rockgrove', 'Dreadsail Reef', 
    'Sanity\'s Edge', 'Lucent Citadel', 'Ossein Cage'
  ];
  
  const specialTrials = ['Cloudrest', 'Asylum'];
  
  if (specialTrials.some(trial => trialName.includes(trial))) {
    return 'special';
  }
  
  if (perBossHMTrials.some(trial => trialName.includes(trial))) {
    return 'per-boss';
  }
  
  return 'final-boss-only';
}

function getDifficultyLabel(difficulty: number | null, trialName: string): string | null {
  if (!difficulty || difficulty < 10) {
    return 'Normal';
  }
  
  // Special handling for Cloudrest and Asylum Sanctorium
  const isCloudrest = trialName.includes("Cloudrest") || trialName.includes("CR");
  const isAsylum = trialName.includes("Asylum") || trialName.includes("AS");
  
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

// Helper function to determine trial run difficulty based on all bosses in the run
function getTrialRunDifficulty(fights: FightFragment[], trialName: string): { difficulty: number | null, label: string | null } {
  const hmType = getTrialHMType(trialName);
  
  if (hmType === 'final-boss-only') {
    // For final-boss-only HM trials, check if the final boss was attempted in HM
    const finalBoss = fights[fights.length - 1];
    const difficulty = finalBoss?.difficulty ?? null;
    return {
      difficulty,
      label: getDifficultyLabel(difficulty, trialName)
    };
  } else if (hmType === 'per-boss') {
    // For per-boss HM trials, check if any boss was HM
    // Special handling for mini-bosses that can't be HM in Rockgrove
    const nonHMBosses = ['Basks-In-Snakes', 'Basks-in-Snakes', 'Ash Titan'];
    
    // If this is a single boss encounter, handle it directly
    if (fights.length === 1) {
      const fight = fights[0];
      const isMiniBoss = nonHMBosses.includes(fight.name);
      
      
      // For mini-bosses, return their actual difficulty without HM logic
      if (isMiniBoss) {
        const difficulty = fight.difficulty ?? 121;
        const label = getDifficultyLabel(difficulty, trialName);
        return { difficulty, label };
      }
      
      // For regular bosses, apply HM logic
      const difficulty = fight.difficulty ?? 121;
      const label = getDifficultyLabel(difficulty, trialName);
      return { difficulty, label };
    }
    
    // For multiple fights (full trial run), filter out mini-bosses from HM calculation
    const hmCapableFights = fights.filter(fight => !nonHMBosses.includes(fight.name));
    const hasHM = hmCapableFights.some(fight => fight.difficulty === 122);
    const hasVet = hmCapableFights.some(fight => fight.difficulty === 121);
    
    
    if (hasHM) {
      return { difficulty: 122, label: 'Veteran HM' };
    } else if (hasVet) {
      return { difficulty: 121, label: 'Veteran' };
    } else {
      // Check for normal in all fights
      const hasNormal = fights.some(fight => (fight.difficulty ?? 0) < 10);
      return { difficulty: hasNormal ? 0 : 121, label: hasNormal ? 'Normal' : 'Veteran' };
    }
  } else {
    // Special trials (Cloudrest/Asylum) - use existing logic
    const maxDifficulty = Math.max(...fights.map(f => f.difficulty ?? 0));
    return {
      difficulty: maxDifficulty,
      label: getDifficultyLabel(maxDifficulty, trialName)
    };
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

  const handleFightSelect = React.useCallback(
    (id: number) => {
      navigate(`/report/${reportId}/fight/${id}`);
    },
    [navigate, reportId]
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
      const instanceCount = currentBoss.enemyNPCs?.[0]?.instanceCount || 1;
      // Use boss name without instance count for progression tracking
      // Instance count should only be used for encounter IDs, not for determining resets
      const bossProgressionKey = bossName; // Just the boss name, not including instance count
      const bossInstanceKey = `${bossName}-${instanceCount}`; // For unique encounter IDs

      // Determine trial name from boss name
      const trialName = getTrialNameFromBoss(bossName, reportData);
      
      // DEBUG: Log difficulty mapping data
      console.log('🔍 DIFFICULTY DEBUG:', {
        bossName,
        trialName,
        difficulty: currentBoss.difficulty,
        startTime: new Date(currentBoss.startTime).toLocaleTimeString(),
        endTime: new Date(currentBoss.endTime).toLocaleTimeString(),
        instanceCount,
        bossPercentage: currentBoss.bossPercentage,
        currentDifficultyLabel: getDifficultyLabel(currentBoss.difficulty ?? null, trialName)
      });
      
      // Check if this represents a reset (going back to an earlier boss after progressing)
      let shouldStartNewRun = false;
      
      // Special handling for trials with variable boss mechanics
      const isCloudrest = trialName.includes("Cloudrest");
      const isAsylum = trialName.includes("Asylum Sanctorium");
      const isLucentCitadel = trialName.includes("Lucent Citadel") || trialName.includes("Sanity's Edge");
      
      if (bossInstancesSeen.has(bossProgressionKey)) {
        // We've seen this boss name before (regardless of instance count)
        // Check if we've progressed past it to other bosses
        const lastSeenIndex = bossProgressionOrder.lastIndexOf(bossProgressionKey);
        const bossesAfterLastSeen = bossProgressionOrder.slice(lastSeenIndex + 1);
        const uniqueBossesAfter = [...new Set(bossesAfterLastSeen)];
        
        // For Cloudrest and Asylum, be more lenient about "resets"
        // These trials allow repeated attempts at the main boss with different mini combinations
        if (isCloudrest || isAsylum) {
          // Only consider it a reset if there's a significant time gap (> 10 minutes)
          // or if we're clearly starting from the beginning again
          const timeSinceLastSeen = currentBoss.startTime - (bossFights.find(f => 
            `${f.name}-${f.enemyNPCs?.[0]?.instanceCount || 1}` === bossInstanceKey
          )?.endTime || 0);
          
          const isMainBoss = (isCloudrest && bossName.includes("Z'Maja")) || 
                           (isAsylum && bossName.includes("Saint Olms"));
          
          // Only start new run if it's been > 10 minutes OR we're going back to first mini after main boss
          shouldStartNewRun = timeSinceLastSeen > 600000 || // 10 minutes
                             (!isMainBoss && uniqueBossesAfter.some(boss => 
                               boss.includes("Z'Maja") || boss.includes("Saint Olms")
                             ));
        } 
        // Special handling for Lucent Citadel/Sanity's Edge
        else if (isLucentCitadel) {
          // For Lucent Citadel, we need to be smart about detecting actual trial resets
          // 1. If we're seeing the first boss again after seeing later bosses, it's likely a new run
          // 2. If the boss order is out of sequence, it might be a new run
          // 3. If there's a significant time gap, it might be a new run
          
          // Get the last time we saw this boss
          const lastSeenFight = bossFights.find(f => 
            f.name === currentBoss.name && 
            (f.enemyNPCs?.[0]?.instanceCount || 1) === (currentBoss.enemyNPCs?.[0]?.instanceCount || 1)
          );
          
          if (lastSeenFight) {
            const timeSinceLastSeen = currentBoss.startTime - lastSeenFight.endTime;
            
            // Check if we've seen other bosses since we last saw this one
            const lastSeenIndex = bossProgressionOrder.lastIndexOf(bossProgressionKey);
            const bossesAfterLastSeen = bossProgressionOrder.slice(lastSeenIndex + 1);
            
            // If we've seen other bosses since this one, it's likely a new run
            shouldStartNewRun = bossesAfterLastSeen.length > 0;
            
            // If it's been a long time (> 30 minutes), it's definitely a new run
            if (!shouldStartNewRun && timeSinceLastSeen > 1800000) { // 30 minutes
              shouldStartNewRun = true;
            }
          }
        }
        else {
          // Original logic for other trials
          shouldStartNewRun = uniqueBossesAfter.length > 0;
        }
      }

      if (shouldStartNewRun) {
        
        // Reset progression tracking
        currentRunNumber++;
        bossInstancesSeen.clear();
        bossProgressionOrder.length = 0;
      }

      // Check if we're switching to a different trial - if so, start a new run
      const currentRunTrialName = trialNamesByRun[currentRunNumber];
      if (currentRunTrialName && currentRunTrialName !== trialName) {
        console.log('🔄 TRIAL SWITCH DETECTED:', {
          currentRunTrialName,
          newTrialName: trialName,
          bossName,
          startingNewRun: true
        });
        
        // Start a new run for the different trial
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
      const isTrialWithMinis = trialName.includes("Cloudrest") || trialName.includes("Asylum Sanctorium");
      const trialRunName = `${trialName} #${currentRunNumber}`;

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
          encounters: []
        };
        
        trialRuns.push(newTrialRun);
        currentTrialRun = newTrialRun;
      }

      // Find trash before this boss (after previous boss or from start)
      const prevBossEnd = i > 0 ? bossFights[i - 1].endTime : 0;
      const preTrash = trashFights.filter(
        (trash) => trash.startTime >= prevBossEnd && trash.startTime < currentBoss.startTime
      );

      // Find trash after this boss (before next boss or until end)
      const nextBossStart = nextBoss ? nextBoss.startTime : Number.MAX_SAFE_INTEGER;
      const postTrash = trashFights.filter(
        (trash) => trash.startTime > currentBoss.endTime && trash.startTime < nextBossStart
      );

      // Ensure currentTrialRun is defined before proceeding
      if (!currentTrialRun) {
        console.error('No trial run found for boss:', currentBoss);
        continue; // Skip to next boss if no trial run is available
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
      if (!currentTrialRun.fights.some(f => f.id === currentBoss.id)) {
        currentTrialRun.fights.push(currentBoss);
      }
      
      // Only add post-trash if there's a next boss (not the final boss)
      if (nextBoss) {
        bossEncounter.postTrash.push(...postTrash);
      }
    }

    // Handle any remaining trash that doesn't fit near bosses
    const allCategorizedTrash = trialRuns.flatMap((run) => 
      run.encounters.flatMap((enc) => [...enc.preTrash, ...enc.postTrash])
    );
    const uncategorizedTrash = trashFights.filter(
      (trash) => !allCategorizedTrash.some((cat) => cat.id === trash.id)
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
        encounters: [{
          id: 'misc-trash-encounter',
          name: 'Miscellaneous Trash',
          bossFights: [],
          preTrash: uncategorizedTrash,
          postTrash: [],
        }],
      });
    }

    // Post-process to only show run numbers when there are multiple runs of the same zone
    const zoneRunCounts = trialRuns?.reduce((acc, run) => {
      const baseName = run.name.replace(/ #\d+$/, ''); // Remove existing run numbers
      acc[baseName] = (acc[baseName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Update trial run names to only show numbers when there are duplicates
    const updatedTrialRuns = trialRuns?.map((run) => {
      const baseName = run.name.replace(/ #\d+$/, '');
      const runMatch = run.name.match(/ #(\d+)$/);
      const runNumber = runMatch ? parseInt(runMatch[1]) : 1;
      
      if (zoneRunCounts[baseName] > 1) {
        return {
          ...run,
          name: `${baseName} #${runNumber}`
        };
      } else {
        return {
          ...run,
          name: baseName
        };
      }
    });

    // Calculate trial difficulty for each individual run based on its own fights
    const calculateTrialDifficulty = (runFights: FightFragment[], trialName: string): { difficulty: number; label: string } => {
      // Get HM type for this trial
      const hmType = getTrialHMType(trialName);
      const nonHMBosses = ['Basks-In-Snakes', 'Basks-in-Snakes', 'Ash Titan'];
      
      if (hmType === 'per-boss') {
        // For per-boss HM trials, analyze all HM-capable bosses in this run
        const hmCapableFights = runFights.filter(fight => !nonHMBosses.includes(fight.name));
        
        if (hmCapableFights.length === 0) {
          return { difficulty: 121, label: 'Veteran' };
        }
        
        const hmBosses = hmCapableFights.filter(fight => fight.difficulty === 122);
        const vetBosses = hmCapableFights.filter(fight => fight.difficulty === 121);
        const normalBosses = hmCapableFights.filter(fight => (fight.difficulty ?? 0) < 10);
        
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
        const hasHM = runFights.some(fight => fight.difficulty === 122);
        const hasVet = runFights.some(fight => fight.difficulty === 121);
        const hasNormal = runFights.some(fight => (fight.difficulty ?? 0) < 10);
        
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
        const hasHM = runFights.some(fight => (fight.difficulty ?? 0) >= 123);
        const hasVet = runFights.some(fight => fight.difficulty === 121);
        const hasNormal = runFights.some(fight => (fight.difficulty ?? 0) < 10);
        
        if (hasHM) {
          return { difficulty: 122, label: 'Veteran HM' };
        } else if (hasVet) {
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
    };

    // Apply difficulty labels to each individual trial run
    const finalizedTrialRuns = updatedTrialRuns.map((run, index) => {
      const baseName = run.name.split(' (')[0]; // Remove existing difficulty label
      const trialDifficulty = calculateTrialDifficulty(run.fights, run.trialName);
      const finalName = `${baseName} (${trialDifficulty.label})`;
      
      const hmCapableFights = run.fights.filter(f => !['Basks-In-Snakes', 'Basks-in-Snakes', 'Ash Titan'].includes(f.name));
      console.log('🏃 RUN:', run.name, 'BOSS:', run.fights[0]?.name, 'DIFF:', run.fights[0]?.difficulty, 'CALCULATED:', trialDifficulty.label);
      
      return {
        ...run,
        name: finalName,
        difficulty: trialDifficulty.difficulty,
        difficultyLabel: trialDifficulty.label
      };
    });

    return finalizedTrialRuns;
  }, [fights, reportData]);

  const [expandedEncounters, setExpandedEncounters] = React.useState<Set<string>>(new Set());
  const [showTrashForEncounter, setShowTrashForEncounter] = React.useState<Set<string>>(new Set());

  // Auto-expand accordion if there's only 1 encounter
  React.useEffect(() => {
    if (encounters.length === 1) {
      setExpandedEncounters(new Set([encounters[0].id]));
    }
  }, [encounters]);

  const toggleEncounter = (encounterId: string): void => {
    setExpandedEncounters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(encounterId)) {
        newSet.delete(encounterId);
      } else {
        newSet.add(encounterId);
      }
      return newSet;
    });
  };

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
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Skeleton variant="rounded" width={200} height={40} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={160} height={40} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Paper key={i} sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1.5 }} />
                  <Skeleton variant="text" width={120} height={24} />
                </Box>
                <Skeleton variant="rounded" width="100%" height={120} sx={{ mb: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width={80} height={20} />
                  <Skeleton variant="text" width={60} height={20} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={100} height={20} />
                  <Skeleton variant="text" width={40} height={20} />
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
        <Skeleton variant="text" width={260} sx={{ mb: 2 }} />
        {[...Array(3)].map((_, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Skeleton variant="text" width={140} height={28} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[...Array(6)].map((__, j) => (
                <Skeleton key={j} variant="rounded" width={88} height={36} />
              ))}
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  if (!fights?.length) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1">No fights available</Typography>
      </Paper>
    );
  }

  const renderFightCard = (fight: FightFragment, idx: number): JSX.Element => {
    // Debug logging for Hall of Fleshcraft
    if (fight.name && fight.name.includes('Hall of Fleshcraft')) {
      console.log('Hall of Fleshcraft fight data:', {
        name: fight.name,
        bossPercentage: fight.bossPercentage,
        difficulty: fight.difficulty,
        startTime: fight.startTime,
        endTime: fight.endTime,
        isBoss: fight.difficulty != null,
        isTrash: fight.difficulty == null
      });
    }

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
      bossWasKilled = fight.bossPercentage !== null && fight.bossPercentage !== undefined && fight.bossPercentage <= 1.0;
      rawIsWipe = fight.bossPercentage !== null && fight.bossPercentage !== undefined && fight.bossPercentage > 1.0;
      isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
      isWipe = rawIsWipe && !isFalsePositive;
      bossHealthPercent = fight.bossPercentage !== null && fight.bossPercentage !== undefined ? Math.round(fight.bossPercentage) : 0;
      
      // If boss was killed, show full green bar, otherwise show health percentage for wipes
      backgroundFillPercent = bossWasKilled ? 100 : (isWipe ? bossHealthPercent : 100);
      
      // Debug logging for Hall of Fleshcraft boss fight
      if (fight.name && fight.name.includes('Hall of Fleshcraft')) {
        console.log('Hall of Fleshcraft boss fight logic:', {
          bossWasKilled,
          rawIsWipe,
          isFalsePositive,
          isWipe,
          bossHealthPercent,
          backgroundFillPercent
        });
      }
    } else {
      // Trash fight logic - assume successful completion
      bossWasKilled = false;
      rawIsWipe = false;
      isFalsePositive = false;
      isWipe = false;
      bossHealthPercent = 0;
      backgroundFillPercent = 100; // Always show as completed for trash
      
      // Debug logging for Hall of Fleshcraft trash fight
      if (fight.name && fight.name.includes('Hall of Fleshcraft')) {
        console.log('Hall of Fleshcraft trash fight logic:', {
          bossWasKilled,
          rawIsWipe,
          isFalsePositive,
          isWipe,
          bossHealthPercent,
          backgroundFillPercent
        });
      }
    }

    return (
      <ListItem key={fight.id} sx={{ p: 0 }}>
        <ListItemButton
          selected={fightId === String(fight.id)}
          onClick={() => handleFightSelect(fight.id)}
          sx={{
            width: '100%',
            height: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            py: 0.5,
            px: 1,
            position: 'relative',
            backgroundColor: 'transparent',
            transition:
              'background-color 120ms ease, transform 120ms ease, border-color 120ms ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.025)',
            },
            '&:active': {
              transform: 'translateY(0.5px)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: `${100 - backgroundFillPercent}%`,
              background: isWipe
                ? (() => {
                    const healthPercent = bossHealthPercent;
                    if (healthPercent >= 80) {
                      return 'linear-gradient(90deg, rgba(220, 38, 38, 0.7) 0%, rgba(239, 68, 68, 0.6) 100%)';
                    } else if (healthPercent >= 50) {
                      return 'linear-gradient(90deg, rgba(239, 68, 68, 0.65) 0%, rgba(251, 146, 60, 0.55) 100%)';
                    } else if (healthPercent >= 20) {
                      return 'linear-gradient(90deg, rgba(251, 146, 60, 0.6) 0%, rgba(252, 211, 77, 0.5) 100%)';
                    } else if (healthPercent >= 8) {
                      return 'linear-gradient(90deg, rgba(252, 211, 77, 0.55) 0%, rgba(253, 230, 138, 0.45) 100%)';
                    } else {
                      return 'linear-gradient(90deg, rgba(252, 211, 77, 0.55) 0%, rgba(163, 230, 53, 0.45) 100%)';
                    }
                  })()
                  : fight.difficulty == null 
                  ? 'linear-gradient(90deg, rgb(23 43 48 / 30%) 0%, rgb(0 0 0 / 85%) 100%)'
                  : isFalsePositive
                    ? 'linear-gradient(90deg, rgb(221 158 35 / 65%) 0%, rgb(255 126 0 / 62%) 100%)'
                    : 'linear-gradient(90deg, rgba(76, 217, 100, 0.65) 0%, rgba(94, 234, 255, 0.55) 100%)',
              boxShadow: isWipe
                ? '0 0 6px rgba(255, 99, 71, 0.45)'
                : fight.difficulty == null
                  ? '0 0 6px rgba(189, 195, 199, 0.35)'
                  : '0 0 6px rgba(76, 217, 100, 0.45)',
              borderRadius: `4px ${!isWipe ? '4px' : '0'} ${!isWipe ? '4px' : '0'} 4px`,
              opacity: 0.15,
              zIndex: 0,
            },
          }}
        >
          {/* Wipe badge */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -120%)',
              px: 0.6,
              py: 0.15,
              fontSize: '0.65rem',
              lineHeight: 1,
              textAlign: 'center',
              borderRadius: 10,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: isWipe
                ? (() => {
                    const healthPercent = bossHealthPercent;
                    if (healthPercent >= 80) {
                      return 'linear-gradient(135deg, rgba(220, 38, 38, 0.28) 0%, rgba(239, 68, 68, 0.18) 100%)';
                    } else if (healthPercent >= 50) {
                      return 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(251, 146, 60, 0.16) 100%)';
                    } else if (healthPercent >= 20) {
                      return 'linear-gradient(135deg, rgba(251, 146, 60, 0.22) 0%, rgba(252, 211, 77, 0.14) 100%)';
                    } else if (healthPercent >= 8) {
                      return 'linear-gradient(135deg, rgba(252, 211, 77, 0.20) 0%, rgba(253, 230, 138, 0.12) 100%)';
                    } else {
                      return 'linear-gradient(135deg, rgba(252, 211, 77, 0.20) 0%, rgba(163, 230, 53, 0.12) 100%)';
                    }
                  })()
                  : 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: isWipe
                ? '0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25)'
                : 'none',
              color: isWipe
                ? (() => {
                    const healthPercent = bossHealthPercent;
                    if (healthPercent >= 80) {
                      return '#ffb3b3';
                    } else if (healthPercent >= 50) {
                      return '#ffcc99';
                    } else if (healthPercent >= 20) {
                      return '#ffe066';
                    } else if (healthPercent >= 8) {
                      return '#ffed99';
                    } else {
                      return '#ccff99';
                    }
                  })()
                : 'transparent',
              textShadow: isWipe ? '0 1px 2px rgba(0,0,0,0.45)' : 'none',
              pointerEvents: 'none',
              transition: 'opacity 120ms ease',
              opacity: isWipe || bossWasKilled ? 1 : 0,
            }}
          >
            {bossHealthPercent}%
          </Box>
          {!isWipe && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -120%)',
                width: 24,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                background: isFalsePositive
                  ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 87, 34, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)',
                border: isFalsePositive
                  ? '1px solid rgba(255, 152, 0, 0.4)'
                  : '1px solid rgba(76, 217, 100, 0.3)',
                boxShadow: isFalsePositive
                  ? '0 4px 12px rgba(255, 152, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 12px rgba(76, 217, 100, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                zIndex: 2,
              }}
            >
              <Typography
                sx={{
                  color: isFalsePositive ? '#ff9800' : '#4ade80',
                  fontSize: '0.75rem',
                  lineHeight: 1,
                  fontWeight: 600,
                }}
              >
                {isFalsePositive ? '⚠' : '✓'}
              </Typography>
            </Box>
          )}
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.66rem',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              position: 'absolute',
              bottom: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
            }}
          >
            {fight.startTime && fight.endTime && reportStartTime && (
              <>
                {formatTimestamp(fight.startTime, reportStartTime)}
                {'\u00A0'}•{'\u00A0'}
                {formatDuration(fight.startTime, fight.endTime)}
              </>
            )}
          </Typography>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {reportData?.title || 'Report Details'}
        </Typography>
        {encounters.map((trialRun) => (
          <Accordion
            key={trialRun.id}
            expanded={expandedEncounters.has(trialRun.id)}
            onChange={() => toggleEncounter(trialRun.id)}
            sx={{ mb: 2, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  pr: 2,
                }}
              >
                <Typography 
                  variant="h6"
                  sx={{ 
                    fontWeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {(() => {
                    // Split trial name and difficulty for styling
                    const fullName = trialRun.name.replace(/#\d+/, '');
                    const difficultyMatch = fullName.match(/^(.+?)\s*\((.+)\)$/);
                    
                    if (difficultyMatch) {
                      const [, baseName, difficulty] = difficultyMatch;
                      return (
                        <>
                          {baseName.trim()}{' '}
                          <Box component="span" sx={{ fontWeight: 700 }}>
                            ({difficulty})
                          </Box>
                        </>
                      );
                    }
                    
                    return fullName;
                  })()}
                  {(() => {
                    const runMatch = trialRun.name.match(/#(\d+)/);
                    return runMatch ? (
                      <Box 
                        component="span" 
                        sx={{ 
                          fontWeight: 700,
                          color: '#00bcd4', // Modern cyan color
                          backgroundColor: 'rgba(0, 188, 212, 0.1)',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          ml: 1,
                          fontSize: '0.9em'
                        }}
                      >
                        #{runMatch[1]}
                      </Box>
                    ) : null;
                  })()}
                </Typography>
                {(() => {
                  // Count killed bosses (boss percentage <= 0.01 or false positive wipes)
                  const killedBosses = trialRun.encounters.reduce((count, encounter) => {
                    const hasKill = encounter.bossFights.some(fight => {
                      // Use the same kill logic as individual fight cards
                      const isBossFight = fight.difficulty != null;
                      if (isBossFight) {
                        const bossWasKilled = fight.bossPercentage !== null && fight.bossPercentage !== undefined && fight.bossPercentage <= 1.0;
                        const rawIsWipe = fight.bossPercentage !== null && fight.bossPercentage !== undefined && fight.bossPercentage > 1.0;
                        const isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
                        return bossWasKilled || isFalsePositive; // Kill if boss was killed or false positive wipe
                      } else {
                        // For trash fights, assume successful completion
                        return true;
                      }
                    });
                    return count + (hasKill ? 1 : 0);
                  }, 0);
                  
                  const encounteredBosses = trialRun.encounters.length;
                  
                  // Determine expected total bosses based on zone name
                  const zoneName = trialRun.name.replace(/#\d+/, '').trim();
                  
                  // Debug logging for Ossein Cage
                  if (zoneName.includes("Ossein Cage")) {
                    console.log('Ossein Cage trial data:', {
                      zoneName,
                      encounteredBosses,
                      killedBosses,
                      encounters: trialRun.encounters.map(e => ({ name: e.name, bossFights: e.bossFights.length }))
                    });
                  }
                  
                  let expectedTotalBosses = encounteredBosses; // default fallback
                  
                  // Known trial boss counts
                  if (zoneName.includes("Kyne's Aegis")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Cloudrest")) {
                    // Cloudrest has variable bosses: 1 main (Z'Maja) + 0-3 minis
                    // Use actual encountered count since minis can be skipped
                    expectedTotalBosses = encounteredBosses;
                  }
                  else if (zoneName.includes("Ossein Cage")) {
                    // Ossein Cage has variable bosses: 1 main + 0-3 optional minis
                    // Minis don't affect boss naming, use actual encountered count
                    expectedTotalBosses = encounteredBosses;
                  }
                  else if (zoneName.includes("Sunspire")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Rockgrove")) expectedTotalBosses = 4;
                  else if (zoneName.includes("Dreadsail Reef")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Sanity's Edge")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Lucent Citadel")) expectedTotalBosses = 4;
                  else if (zoneName.includes("Asylum Sanctorium")) {
                    // Asylum has variable bosses: 1 main + 0-2 minis
                    // Use actual encountered count since minis can be skipped
                    expectedTotalBosses = encounteredBosses;
                  }
                  else if (zoneName.includes("Halls of Fabrication")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Maw of Lorkhaj")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Aetherian Archive")) expectedTotalBosses = 4;
                  else if (zoneName.includes("Hel Ra Citadel")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Sanctum Ophidia")) expectedTotalBosses = 5;
                  
                  // Determine color based on completion against expected total
                  let color = '#ff9800'; // orange - default for low completion
                  if (killedBosses === expectedTotalBosses) {
                    color = '#4caf50'; // green - ALL expected bosses killed
                  } else if (expectedTotalBosses === 5 && killedBosses >= 3) {
                    color = '#ffeb3b'; // yellow - 3-4 kills in 5-boss trial
                  } else if (expectedTotalBosses === 4 && killedBosses >= 2) {
                    color = '#ffeb3b'; // yellow - 2-3 kills in 4-boss trial
                  } else if (expectedTotalBosses === 3 && killedBosses >= 2) {
                    color = '#ffeb3b'; // yellow - 2 kills in 3-boss trial
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
                        border: `1px solid ${color}`,
                        boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: color,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        background: `linear-gradient(135deg, ${color}33 0%, ${color}1a 50%, ${color}14 100%)`,
                        transition: 'all 0.3s ease',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
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
            </AccordionSummary>
            <AccordionDetails>
              {trialRun.encounters.map((encounter) => (
                <Box 
                  key={encounter.id} 
                  sx={{ 
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.0)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1)',
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {(() => {
                        const avatarSrc = getBossAvatar(encounter.name);
                        return avatarSrc && (
                          <Avatar
                            src={avatarSrc}
                            alt={encounter.name}
                            sx={{ 
                              width: 32, 
                              height: 32,
                              border: '1.5px solid #b3b3b3f2',
                              boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                            }}
                          />
                        );
                      })()}
                      <Typography
                        variant="subtitle2"
                        sx={{ color: 'text.primary', fontWeight: 'medium' }}
                      >
                        {encounter.name}{' '}
                        {(() => {
                          // Get difficulty from the first boss fight
                          const bossFight = encounter.bossFights.find(f => f.difficulty != null);
                          if (bossFight && bossFight.difficulty != null) {
                            const trialName = trialRun.trialName || '';
                            const difficultyLabel = getDifficultyLabel(bossFight.difficulty, trialName);
                            return (
                              <Box component="span" sx={{ fontWeight: 700, color: difficultyLabel === 'Veteran HM' ? '#fbbf24' : '#94a3b8' }}>
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
                    in={showTrashForEncounter.has(encounter.id) && encounter.preTrash.length > 0}
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
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 1,
                    }}
                  >
                    {encounter.bossFights.map((fight, idx) => renderFightCard(fight, idx))}
                  </List>
                  
                  {/* Post-encounter trash */}
                  <Collapse
                    in={showTrashForEncounter.has(encounter.id) && encounter.postTrash.length > 0}
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}
                      >
                        Post-encounter trash
                      </Typography>
                      <List
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                          gap: 1,
                        }}
                      >
                        {encounter.postTrash.map((fight, idx) => renderFightCard(fight, idx))}
                      </List>
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </>
  );
};
