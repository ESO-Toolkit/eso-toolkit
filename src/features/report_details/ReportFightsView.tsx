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

import { FightFragment, ReportFragment } from '../../graphql/generated';

// Boss avatar imports
import falgravenpng from '../../assets/vka/falgraven.png';
import vrolpng from '../../assets/vka/vrol.png';
import yandirpng from '../../assets/vka/yandir.png';
import ansuulpng from '../../assets/vse/ansuul.png';
import spiraldescenderpng from '../../assets/vse/spiral-descender.png';
import twelvanepng from '../../assets/vse/twelvane.png';
import yaselapng from '../../assets/vse/yasela.png';
import lokkepng from '../../assets/vss/lokke.png';
import nahvipng from '../../assets/vss/nahvi.png';
import yolnpng from '../../assets/vss/yoln.png';

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

// Boss avatar mapping
const bossAvatars: Record<string, string> = {
  // VKA - Veteran Kyne's Aegis
  'Falgraven': falgravenpng,
  'Captain Vrol': vrolpng,
  'Vrol': vrolpng,
  'Yandir the Butcher': yandirpng,
  // VSE - Veteran Sanity's Edge  
  'Ansuul the Tormentor': ansuulpng,
  'Spiral Descender': spiraldescenderpng,
  'Spiral Skein Descender': spiraldescenderpng,
  'Twelvane': twelvanepng,
  'Yasela the Bonecaller': yaselapng,
  // VSS - Veteran Sunspire
  'Lokke Coast-Ripper': lokkepng,
  'Nahviintaas': nahvipng,
  'Yolnahkriin': yolnpng,
};

function getBossAvatar(bossName: string): string | null {
  // Remove instance numbers and extra text to match avatar keys
  const cleanName = bossName.replace(/#\d+$/, '').trim();
  return bossAvatars[cleanName] || null;
}

function getTrialNameFromBoss(bossName: string, reportData: any): string {
  // Determine trial name based on boss name
  const cleanBossName = bossName.replace(/#\d+$/, '').trim();
  
  // VKA - Veteran Kyne's Aegis
  if (['Lord Falgravn', 'Falgraven', 'Captain Vrol', 'Vrol', 'Yandir the Butcher'].includes(cleanBossName)) {
    return "Kyne's Aegis";
  }
  
  // VSE - Veteran Sanity's Edge
  if ([
    'Ansuul the Tormentor', 'Spiral Descender', 'Spiral Skein Descender', 
    'Twelvane', 'Archwizard Twelvane', 'Exarchanic Yaseyla', 'Yasela the Bonecaller',
    'Cavot Agnan', 'Orphic Shattered Shard'
  ].includes(cleanBossName)) {
    return "Sanity's Edge";
  }
  
  // VSS - Veteran Sunspire  
  if (['Lokke Coast-Ripper', 'Nahviintaas', 'Yolnahkriin'].includes(cleanBossName)) {
    return 'Sunspire';
  }
  
  // VLC - Veteran Lucent Citadel
  if ([
    'Xoryn', 'Count Ryelaz', 'Zilyesset', 'Baron Rize', 'Jresazzel', 'Xynizata'
  ].includes(cleanBossName)) {
    return 'Lucent Citadel';
  }
  
  // VCR - Veteran Cloudrest
  if (['Z\'Maja', 'Galenwe', 'Relequen', 'Siroria'].includes(cleanBossName)) {
    return 'Cloudrest';
  }
  
  // VAS - Veteran Asylum Sanctorium
  if (['Saint Llothis', 'Saint Felms', 'Saint Olms'].includes(cleanBossName)) {
    return 'Asylum Sanctorium';
  }
  
  // VRG - Veteran Rockgrove
  if (['Oaxiltso', 'Flame-Herald Bahsei', 'Xalvakka'].includes(cleanBossName)) {
    return 'Rockgrove';
  }
  
  // VDSR - Veteran Dreadsail Reef
  if (['Lylanar and Turlassil', 'Reef Guardian', 'Tideborn Taleria'].includes(cleanBossName)) {
    return 'Dreadsail Reef';
  }
  
  // VHOF - Veteran Halls of Fabrication
  if (['Hunter-Killer Fabricant', 'Pinnacle Factotum', 'Archcustodian'].includes(cleanBossName)) {
    return 'Halls of Fabrication';
  }
  
  // VMOL - Veteran Maw of Lorkhaj
  if (['Zhaj\'hassa the Forgotten', 'Vashai', 'Rakkhat'].includes(cleanBossName)) {
    return 'Maw of Lorkhaj';
  }
  
  // VSO - Veteran Sanctum Ophidia
  if (['Possessed Manticora', 'Stonebreaker', 'Ozara', 'Serpent'].includes(cleanBossName)) {
    return 'Sanctum Ophidia';
  }
  
  // VHRC - Veteran Hel Ra Citadel
  if (['Ra Kotu', 'Yokeda Rok\'dun', 'The Warrior'].includes(cleanBossName)) {
    return 'Hel Ra Citadel';
  }
  
  // VAA - Veteran Aetherian Archive
  if (['Storm Atronach', 'Stone Atronach', 'Varlariel', 'The Mage'].includes(cleanBossName)) {
    return 'Aetherian Archive';
  }
  
  // Fallback to zone name if boss not recognized
  return reportData?.zone?.name || 'Unknown Trial';
}

function getDifficultyLabel(difficulty: number | null, trialName: string): string | null {
  if (difficulty === null || difficulty === undefined) {
    return null;
  }
  
  const isCloudrest = trialName.includes("Cloudrest") || trialName.includes("CR");
  const isAsylum = trialName.includes("Asylum") || trialName.includes("AS");
  
  // Handle normal/veteran first
  if (difficulty < 10) {
    return 'Normal';
  } else if (difficulty < 110) {
    return 'Veteran';
  }
  
  // Handle veteran hard modes (difficulty >= 110)
  if (isCloudrest || isAsylum) {
    // Cloudrest/Asylum mini-boss logic
    if (difficulty === 125) return 'Veteran +3';
    if (difficulty === 124) return 'Veteran +2';
    if (difficulty === 123) return 'Veteran +1';
    if (difficulty === 122) return 'Veteran +0';
    if (difficulty === 121) return 'Veteran';
  }
  
  // Default for other veteran hard modes
  return 'Veteran';
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
    const trialRuns: {
      id: string;
      name: string;
      encounters: Encounter[];
    }[] = [];

    // Track trial names by run to handle mixed trials in one report
    const trialNamesByRun: Record<number, string> = {};

    for (let i = 0; i < bossFights.length; i++) {
      const currentBoss = bossFights[i];
      const nextBoss = bossFights[i + 1];
      const bossName = currentBoss.name || 'Unknown Boss';
      const instanceCount = currentBoss.enemyNPCs?.[0]?.instanceCount || 1;
      const bossInstanceKey = `${bossName}-${instanceCount}`;

      // Determine trial name from boss name
      const trialName = getTrialNameFromBoss(bossName, reportData);
      
      // Check if this represents a reset (going back to an earlier boss after progressing)
      let shouldStartNewRun = false;
      
      // Special handling for trials with variable boss mechanics
      const isCloudrest = trialName.includes("Cloudrest");
      const isAsylum = trialName.includes("Asylum Sanctorium");
      
      if (bossInstancesSeen.has(bossInstanceKey)) {
        // We've seen this exact boss instance before
        // Check if we've progressed past it to other bosses
        const lastSeenIndex = bossProgressionOrder.lastIndexOf(bossInstanceKey);
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
        } else {
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

      // Track boss progression and trial name for this run
      bossProgressionOrder.push(bossInstanceKey);
      bossInstancesSeen.add(bossInstanceKey);
      trialNamesByRun[currentRunNumber] = trialName;

      const trialRunId = `${trialName}-run-${currentRunNumber}`;
      const isTrialWithMinis = trialName.includes("Cloudrest") || trialName.includes("Asylum Sanctorium");
      const trialRunName = currentRunNumber > 1 
        ? (isTrialWithMinis ? `${trialName} #${currentRunNumber}` : `${trialName} Run ${currentRunNumber}`)
        : trialName;

      // Find or create the trial run
      let currentTrialRun = trialRuns.find((run) => run.id === trialRunId);
      
      if (!currentTrialRun) {
        // Determine difficulty label from the first boss fight
        const difficultyLabel = getDifficultyLabel(currentBoss.difficulty, trialName);
        const nameWithDifficulty = difficultyLabel ? `${trialRunName} (${difficultyLabel})` : trialRunName;
        
        // Debug logging
        console.log('Creating trial run:', {
          bossName: currentBoss.name,
          difficulty: currentBoss.difficulty,
          difficultyLabel,
          nameWithDifficulty
        });
        
        currentTrialRun = {
          id: trialRunId,
          name: nameWithDifficulty,
          encounters: [],
        };
        trialRuns.push(currentTrialRun);
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

      // Use instanceCount to distinguish separate boss instances
      // Each unique combination of boss name + instanceCount represents a separate encounter
      let bossEncounter = currentTrialRun.encounters.find((enc) => enc.id === `${trialRunId}-${bossInstanceKey}`);
      
      if (!bossEncounter) {
        // Create display name without instance numbers
        const displayName = bossName;
        
        const newEncounter: Encounter = {
          id: `${trialRunId}-${bossInstanceKey}`,
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
    const zoneRunCounts = trialRuns.reduce((acc, run) => {
      const baseName = run.name.replace(/ Run \d+$/, ''); // Remove existing run numbers
      acc[baseName] = (acc[baseName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Update trial run names to only show numbers when there are duplicates
    const updatedTrialRuns = trialRuns.map((run) => {
      const baseName = run.name.replace(/ Run \d+$/, '');
      const runMatch = run.name.match(/ Run (\d+)$/);
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

    return updatedTrialRuns;
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
        <Skeleton variant="text" width={180} height={32} sx={{ mb: 1 }} />
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
          Select a Fight
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
                    const runMatch = trialRun.name.match(/#\d+/);
                    return runMatch ? (
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {runMatch[0]}
                      </Box>
                    ) : null;
                  })()}
                </Typography>
                {(() => {
                  // Count killed bosses (boss percentage <= 0.01 or false positive wipes)
                  const killedBosses = trialRun.encounters.reduce((count, encounter) => {
                    const hasKill = encounter.bossFights.some(fight => {
                      const rawIsWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
                      const isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
                      return !rawIsWipe || isFalsePositive; // Kill if not a wipe or false positive
                    });
                    return count + (hasKill ? 1 : 0);
                  }, 0);
                  
                  const encounteredBosses = trialRun.encounters.length;
                  
                  // Determine expected total bosses based on zone name
                  const zoneName = trialRun.name.replace(/#\d+/, '').trim();
                  let expectedTotalBosses = encounteredBosses; // default fallback
                  
                  // Known trial boss counts
                  if (zoneName.includes("Kyne's Aegis")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Cloudrest")) {
                    // Cloudrest has variable bosses: 1 main (Z'Maja) + 0-3 minis
                    // Use actual encountered count since minis can be skipped
                    expectedTotalBosses = encounteredBosses;
                  }
                  else if (zoneName.includes("Sunspire")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Rockgrove")) expectedTotalBosses = 4;
                  else if (zoneName.includes("Dreadsail Reef")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Sanity's Edge")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Lucent Citadel")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Asylum Sanctorium")) {
                    // Asylum has variable bosses: 1 main + 0-2 minis
                    // Use actual encountered count since minis can be skipped
                    expectedTotalBosses = encounteredBosses;
                  }
                  else if (zoneName.includes("Halls of Fabrication")) expectedTotalBosses = 5;
                  else if (zoneName.includes("Maw of Lorkhaj")) expectedTotalBosses = 3;
                  else if (zoneName.includes("Aetherian Archive")) expectedTotalBosses = 4;
                  else if (zoneName.includes("Hel Ra Citadel")) expectedTotalBosses = 4;
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
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)',
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
                      {getBossAvatar(encounter.name) && (
                        <Avatar
                          src={getBossAvatar(encounter.name)!}
                          alt={encounter.name}
                          sx={{ width: 32, height: 32 }}
                        />
                      )}
                      <Typography
                        variant="subtitle2"
                        sx={{ color: 'text.primary', fontWeight: 'medium' }}
                      >
                        {encounter.name}{' '}
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
