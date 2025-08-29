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
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
    (fight.difficulty === 0 || fight.difficulty === 1) &&
    fight.bossPercentage >= 98 &&
    durationSeconds > 15 &&
    durationSeconds < 600
  ) {
    return true;
  }

  return false;
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

    // Get zone name from the report data
    const zoneName = reportData?.zone?.name || 'Unknown Zone';

    for (let i = 0; i < bossFights.length; i++) {
      const currentBoss = bossFights[i];
      const nextBoss = bossFights[i + 1];
      const bossName = currentBoss.name || 'Unknown Boss';
      const instanceCount = currentBoss.enemyNPCs?.[0]?.instanceCount || 1;
      const bossInstanceKey = `${bossName}-${instanceCount}`;

      // Check if this represents a reset (going back to an earlier boss after progressing)
      let shouldStartNewRun = false;
      
      if (bossInstancesSeen.has(bossInstanceKey)) {
        // We've seen this exact boss instance before
        // Check if we've progressed past it to other bosses
        const lastSeenIndex = bossProgressionOrder.lastIndexOf(bossInstanceKey);
        const bossesAfterLastSeen = bossProgressionOrder.slice(lastSeenIndex + 1);
        const uniqueBossesAfter = [...new Set(bossesAfterLastSeen)];
        
        // Only start new run if we've progressed to different bosses after this one
        shouldStartNewRun = uniqueBossesAfter.length > 0;
      }

      if (shouldStartNewRun) {
        // Reset progression tracking for new run
        currentRunNumber++;
        bossProgressionOrder.length = 0;
        bossInstancesSeen.clear();
      }

      // Track this boss in progression
      bossProgressionOrder.push(bossInstanceKey);
      bossInstancesSeen.add(bossInstanceKey);

      const trialRunId = `${zoneName}-run-${currentRunNumber}`;
      const trialRunName = currentRunNumber > 1 ? `${zoneName} Run ${currentRunNumber}` : zoneName;

      // Find or create the trial run
      let currentTrialRun = trialRuns.find((run) => run.id === trialRunId);
      
      if (!currentTrialRun) {
        currentTrialRun = {
          id: trialRunId,
          name: trialRunName,
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
        // Create display name - add instance number if > 1
        const displayName = instanceCount > 1 ? `${bossName} #${instanceCount}` : bossName;
        
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
    const rawIsWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
    const isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
    const isWipe = rawIsWipe && !isFalsePositive;
    const bossHealthPercent = fight.bossPercentage ? Math.round(fight.bossPercentage) : 0;

    const backgroundFillPercent = isWipe ? bossHealthPercent : 100;

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
              opacity: isWipe ? 1 : 0,
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
                  <Box>
                    {trialRun.name.replace(/#\d+/, '')}
                    {(() => {
                      const runMatch = trialRun.name.match(/#\d+/);
                      return runMatch ? (
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {runMatch[0]}
                        </Box>
                      ) : null;
                    })()}
                  </Box>
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
                    else if (zoneName.includes("Cloudrest")) expectedTotalBosses = 4;
                    else if (zoneName.includes("Sunspire")) expectedTotalBosses = 3;
                    else if (zoneName.includes("Rockgrove")) expectedTotalBosses = 3;
                    else if (zoneName.includes("Dreadsail Reef")) expectedTotalBosses = 3;
                    else if (zoneName.includes("Sanity's Edge")) expectedTotalBosses = 3;
                    else if (zoneName.includes("Lucent Citadel")) expectedTotalBosses = 3;
                    else if (zoneName.includes("Asylum Sanctorium")) expectedTotalBosses = 4;
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
                    
                    // Modern gradient styling based on PlayersPanelView
                    const getProgressCircleStyles = (killedBosses: number, expectedTotal: number) => {
                      if (killedBosses === expectedTotal) {
                        // Green - complete
                        return {
                          background: 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
                          borderColor: 'rgba(76, 217, 100, 0.3)',
                          color: '#5ce572',
                        };
                      } else if (
                        (expectedTotal === 5 && killedBosses >= 3) ||
                        (expectedTotal === 4 && killedBosses >= 2) ||
                        (expectedTotal === 3 && killedBosses >= 2)
                      ) {
                        // Gold/Yellow - good progress
                        return {
                          background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
                          borderColor: 'rgba(255, 193, 7, 0.35)',
                          color: '#ffd54f',
                        };
                      } else {
                        // Orange - low progress
                        return {
                          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 152, 0, 0.15) 50%, rgba(255, 152, 0, 0.08) 100%)',
                          borderColor: 'rgba(255, 152, 0, 0.3)',
                          color: '#ff9800',
                        };
                      }
                    };

                    const circleStyles = getProgressCircleStyles(killedBosses, expectedTotalBosses);

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
                          border: `1px solid ${circleStyles.borderColor}`,
                          boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: circleStyles.color,
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          background: circleStyles.background,
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
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {trialRun.encounters.map((encounter) => (
                <Box key={encounter.id} sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: 'text.primary', fontWeight: 'medium' }}
                  >
                    {encounter.name} ({encounter.bossFights.length} attempts)
                  </Typography>
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
                      label={`Show Trash (${encounter.preTrash.length + encounter.postTrash.length})`}
                      sx={{ ml: 'auto', mr: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
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
