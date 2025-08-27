import { Box, Paper, Typography, List, ListItem, ListItemButton, Skeleton, Collapse, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { FightFragment } from '../../graphql/generated';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: 'numeric', 
    minute: '2-digit'
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
  if ((fight.difficulty === 0 || fight.difficulty === 1) && 
      fight.bossPercentage >= 98 && 
      durationSeconds > 15 && 
      durationSeconds < 600) {
    return true;
  }
  
  return false;
}

interface ReportFightsViewProps {
  fights: FightFragment[] | null | undefined;
  loading: boolean;
  fightId: string | undefined | null;
  reportId: string | undefined | null;
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  fightId,
  reportId,
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
      .filter(fight => fight.startTime && fight.endTime && fight.endTime > fight.startTime)
      .sort((a, b) => a.startTime - b.startTime);

    // Separate boss fights and trash fights
    const bossFights = validFights.filter(fight => fight.difficulty != null);
    const trashFights = validFights.filter(fight => fight.difficulty == null);

    // Create encounter objects with trial instance detection
    const encounterList: {
      id: string;
      name: string;
      bossFights: FightFragment[];
      preTrash: FightFragment[];
      postTrash: FightFragment[];
    }[] = [];
    
    // Track encounter instances by name
    const encounterInstances: Record<string, number> = {};
    
    for (let i = 0; i < bossFights.length; i++) {
      const currentBoss = bossFights[i];
      const nextBoss = bossFights[i + 1];
      const baseName = currentBoss.name || 'Unknown Boss';
      
      // Find trash before this boss (after previous boss or from start)
      const prevBossEnd = i > 0 ? bossFights[i - 1].endTime : 0;
      const preTrash = trashFights.filter(trash => 
        trash.startTime >= prevBossEnd && trash.startTime < currentBoss.startTime
      );
      
      // Find trash after this boss (before next boss or until end)
      const nextBossStart = nextBoss ? nextBoss.startTime : Number.MAX_SAFE_INTEGER;
      const postTrash = trashFights.filter(trash => 
        trash.startTime > currentBoss.endTime && trash.startTime < nextBossStart
      );
      
      // Check if this should be a new instance of the same encounter
      const existingEncounter = encounterList.find(enc => enc.name.startsWith(baseName));
      let shouldCreateNewInstance = false;
      
      if (existingEncounter) {
        // Get the last fight from the existing encounter
        const lastFight = existingEncounter.bossFights[existingEncounter.bossFights.length - 1];
        
        // Calculate time gap
        const timeGapMinutes = (currentBoss.startTime - lastFight.endTime) / (1000 * 60);
        
        // Check if there are other boss fights in between (different encounter)
        const fightsBetween = bossFights.filter(fight => 
          fight.startTime > lastFight.endTime && 
          fight.startTime < currentBoss.startTime &&
          fight.name !== baseName
        );
        
        // Check if the group made significant progress past this boss before resetting
        // Look for successful kills of different bosses after the last attempt
        const progressMade = bossFights.some(fight => 
          fight.startTime > lastFight.endTime && 
          fight.startTime < currentBoss.startTime &&
          fight.name !== baseName &&
          (!fight.bossPercentage || fight.bossPercentage < 0.01) // Successful kill
        );
        
        // Create new instance if:
        // 1. Long time gap (>15 minutes) - likely different session
        // 2. Different bosses killed in between - progressed past this encounter
        // 3. Significant progress made (killed other bosses successfully)
        shouldCreateNewInstance = timeGapMinutes > 15 || progressMade || 
          (fightsBetween.length > 0 && fightsBetween.some(f => !f.bossPercentage || f.bossPercentage < 0.01));
      }
      
      if (existingEncounter && !shouldCreateNewInstance) {
        // Add to existing encounter
        existingEncounter.bossFights.push(currentBoss);
        existingEncounter.preTrash.push(...preTrash);
        existingEncounter.postTrash.push(...postTrash);
      } else {
        // Create new encounter instance
        if (!encounterInstances[baseName]) {
          encounterInstances[baseName] = 1;
        } else {
          encounterInstances[baseName]++;
        }
        
        const instanceNumber = encounterInstances[baseName];
        const displayName = instanceNumber > 1 ? `${baseName} (Run ${instanceNumber})` : baseName;
        
        encounterList.push({
          id: `encounter-${baseName}-${instanceNumber}`,
          name: displayName,
          bossFights: [currentBoss],
          preTrash,
          postTrash
        });
      }
    }
    
    // Handle any remaining trash that doesn't fit near bosses
    const allCategorizedTrash = encounterList.flatMap(enc => [...enc.preTrash, ...enc.postTrash]);
    const uncategorizedTrash = trashFights.filter(trash => 
      !allCategorizedTrash.some(cat => cat.id === trash.id)
    );
    
    if (uncategorizedTrash.length > 0) {
      encounterList.push({
        id: 'misc-trash',
        name: 'Miscellaneous Trash',
        bossFights: [],
        preTrash: uncategorizedTrash,
        postTrash: []
      });
    }

    return encounterList;
  }, [fights]);

  const [expandedEncounters, setExpandedEncounters] = React.useState<Set<string>>(new Set());
  const [showTrashForEncounter, setShowTrashForEncounter] = React.useState<Set<string>>(new Set());

  const toggleEncounter = (encounterId: string) => {
    setExpandedEncounters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(encounterId)) {
        newSet.delete(encounterId);
      } else {
        newSet.add(encounterId);
      }
      return newSet;
    });
  };

  const toggleTrashForEncounter = (encounterId: string) => {
    setShowTrashForEncounter(prev => {
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

  const renderFightCard = (fight: FightFragment, idx: number) => {
    const rawIsWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
    const isFalsePositive = rawIsWipe && isFalsePositiveWipe(fight);
    const isWipe = rawIsWipe && !isFalsePositive;
    const bossHealthPercent = fight.bossPercentage ? Math.round(fight.bossPercentage) : 0;
    
    // Debug logging for false positive detection
    if (rawIsWipe && bossHealthPercent >= 99) {
      console.log(`Fight ${fight.id}: rawIsWipe=${rawIsWipe}, isFalsePositive=${isFalsePositive}, isWipe=${isWipe}, bossHealth=${bossHealthPercent}%, duration=${Math.round((fight.endTime - fight.startTime) / 1000)}s, difficulty=${fight.difficulty}`);
    }
    
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
            transition: 'background-color 120ms ease, transform 120ms ease, border-color 120ms ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.025)'
            },
            '&:active': {
              transform: 'translateY(0.5px)'
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
                      return `linear-gradient(90deg, rgba(220, 38, 38, 0.7) 0%, rgba(239, 68, 68, 0.6) 100%)`;
                    } else if (healthPercent >= 50) {
                      return `linear-gradient(90deg, rgba(239, 68, 68, 0.65) 0%, rgba(251, 146, 60, 0.55) 100%)`;
                    } else if (healthPercent >= 20) {
                      return `linear-gradient(90deg, rgba(251, 146, 60, 0.6) 0%, rgba(252, 211, 77, 0.5) 100%)`;
                    } else if (healthPercent >= 8) {
                      return `linear-gradient(90deg, rgba(252, 211, 77, 0.55) 0%, rgba(253, 230, 138, 0.45) 100%)`;
                    } else {
                      return `linear-gradient(90deg, rgba(252, 211, 77, 0.55) 0%, rgba(163, 230, 53, 0.45) 100%)`;
                    }
                  })()
                : 'linear-gradient(90deg, rgba(76, 217, 100, 0.65) 0%, rgba(94, 234, 255, 0.55) 100%)',
              boxShadow: isWipe
                ? '0 0 6px rgba(255, 99, 71, 0.45)'
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
                  ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(76, 217, 100, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)',
                border: isFalsePositive 
                  ? '1px solid rgba(255, 193, 7, 0.4)'
                  : '1px solid rgba(76, 217, 100, 0.3)',
                boxShadow: isFalsePositive
                  ? '0 4px 12px rgba(255, 193, 7, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 12px rgba(76, 217, 100, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                zIndex: 2
              }}
            >
              <Typography sx={{ 
                color: isFalsePositive ? '#ffc107' : '#4ade80', 
                fontSize: '0.75rem', 
                lineHeight: 1, 
                fontWeight: 600 
              }}>
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
              zIndex: 2
            }}
          >
            {fight.startTime && fight.endTime && (
              <>
                {formatTimestamp(fight.startTime)}{'\u00A0'}•{'\u00A0'}{formatDuration(fight.startTime, fight.endTime)}
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
        {encounters.map((encounter) => (
          <Accordion 
            key={encounter.id} 
            expanded={expandedEncounters.has(encounter.id)}
            onChange={() => toggleEncounter(encounter.id)}
            sx={{ mb: 2, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6">
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
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Pre-boss trash */}
              <Collapse in={showTrashForEncounter.has(encounter.id) && encounter.preTrash.length > 0}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                    Pre-encounter trash
                  </Typography>
                  <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                    {encounter.preTrash.map((fight, idx) => renderFightCard(fight, idx))}
                  </List>
                </Box>
              </Collapse>

              {/* Boss fights */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 'medium' }}>
                  Boss attempts
                </Typography>
                <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                  {encounter.bossFights.map((fight, idx) => renderFightCard(fight, idx))}
                </List>
              </Box>

              {/* Post-boss trash */}
              <Collapse in={showTrashForEncounter.has(encounter.id) && encounter.postTrash.length > 0}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                    Post-encounter trash
                  </Typography>
                  <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                    {encounter.postTrash.map((fight, idx) => renderFightCard(fight, idx))}
                  </List>
                </Box>
              </Collapse>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </>
  );
};
