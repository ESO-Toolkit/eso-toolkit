import { Box, Paper, Typography, List, ListItem, ListItemButton, Skeleton } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  const groups = React.useMemo(() => {
    const result: Record<string, FightFragment[]> = {};
    if (!fights) {
      return {};
    }

    fights.forEach((fight: FightFragment) => {
      // Filter out invalid fights (no start/end time or invalid duration)
      if (!fight.startTime || !fight.endTime || fight.endTime <= fight.startTime) {
        return;
      }
      
      const groupName = fight.difficulty == null ? 'Trash' : fight.name || 'Unknown';
      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(fight);
    });

    return result;
  }, [fights]);

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

  return (
    <>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Select a Fight
        </Typography>
        {Object.entries(groups).map(([groupName, groupFights]) => (
          <Box key={groupName} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {groupName}
            </Typography>
            <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
              {(() => {
                // Sort fights by startTime to get chronological order
                const sortedFights = [...groupFights].sort((a, b) => a.startTime - b.startTime);
                
                return sortedFights.map((fight, idx) => {
                  const isWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
                  const bossHealthPercent = fight.bossPercentage ? Math.round(fight.bossPercentage) : 0;
                  
                  // Sequential numbering across all fights
                  const fightNumber = idx + 1;
                  
                  // Calculate background fill based on boss health remaining
                  // If boss has 96% health, show 96% width
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
                                  // Create gradient based on boss health % (higher health = more red, lower health = more green)
                                  const healthPercent = bossHealthPercent;
                                  
                                  // Red zone (80-100% boss health): Deep red to red-orange
                                  if (healthPercent >= 80) {
                                    return `linear-gradient(90deg, rgba(220, 38, 38, 0.7) 0%, rgba(239, 68, 68, 0.6) 100%)`;
                                  }
                                  // Orange zone (50-79% boss health): Red-orange to orange
                                  else if (healthPercent >= 50) {
                                    return `linear-gradient(90deg, rgba(239, 68, 68, 0.65) 0%, rgba(251, 146, 60, 0.55) 100%)`;
                                  }
                                  // Yellow-orange zone (20-49% boss health): Orange to yellow-orange
                                  else if (healthPercent >= 20) {
                                    return `linear-gradient(90deg, rgba(251, 146, 60, 0.6) 0%, rgba(252, 211, 77, 0.5) 100%)`;
                                  }
                                  // Yellow zone (8-19% boss health): Yellow; no green yet
                                  else if (healthPercent >= 8) {
                                    return `linear-gradient(90deg, rgba(252, 211, 77, 0.55) 0%, rgba(253, 230, 138, 0.45) 100%)`;
                                  }
                                  // Yellow-green zone (1-7% boss health): Yellow to yellowish-green
                                  else {
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
                        {/* Wipe badge centered above fight label */}
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
                            background:
                              isWipe
                                ? (() => {
                                    const healthPercent = bossHealthPercent;
                                    
                                    // Red zone (80-100% boss health): Deep red
                                    if (healthPercent >= 80) {
                                      return 'linear-gradient(135deg, rgba(220, 38, 38, 0.28) 0%, rgba(239, 68, 68, 0.18) 100%)';
                                    }
                                    // Orange zone (50-79% boss health): Red-orange to orange
                                    else if (healthPercent >= 50) {
                                      return 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(251, 146, 60, 0.16) 100%)';
                                    }
                                    // Yellow-orange zone (20-49% boss health): Orange to yellow-orange
                                    else if (healthPercent >= 20) {
                                      return 'linear-gradient(135deg, rgba(251, 146, 60, 0.22) 0%, rgba(252, 211, 77, 0.14) 100%)';
                                    }
                                    // Yellow zone (8-19% boss health): Yellow only
                                    else if (healthPercent >= 8) {
                                      return 'linear-gradient(135deg, rgba(252, 211, 77, 0.20) 0%, rgba(253, 230, 138, 0.12) 100%)';
                                    }
                                    // Yellow-green zone (1-7% boss health): Yellow to yellowish-green
                                    else {
                                      return 'linear-gradient(135deg, rgba(252, 211, 77, 0.20) 0%, rgba(163, 230, 53, 0.12) 100%)';
                                    }
                                  })()
                                : 'transparent',
                            border: '1px solid rgba(255,255,255,0.18)',
                            boxShadow:
                              isWipe
                                ? '0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25)'
                                : 'none',
                            color: isWipe 
                              ? (() => {
                                  const healthPercent = bossHealthPercent;
                                  
                                  // Red zone (80-100% boss health): Light red text
                                  if (healthPercent >= 80) {
                                    return '#ffb3b3';
                                  }
                                  // Orange zone (50-79% boss health): Light orange text
                                  else if (healthPercent >= 50) {
                                    return '#ffcc99';
                                  }
                                  // Yellow-orange zone (20-49% boss health): Light yellow text
                                  else if (healthPercent >= 20) {
                                    return '#ffe066';
                                  }
                                  // Yellow zone (8-19% boss health): Light yellow text (no green yet)
                                  else if (healthPercent >= 8) {
                                    return '#ffed99';
                                  }
                                  // Yellow-green zone (1-7% boss health): Light yellow-green text
                                  else {
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
                              background: 'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)',
                              border: '1px solid rgba(76, 217, 100, 0.3)',
                              boxShadow: '0 4px 12px rgba(76, 217, 100, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                              zIndex: 2
                            }}
                          >
                            <Typography sx={{ color: '#4ade80', fontSize: '0.75rem', lineHeight: 1, fontWeight: 600 }}>
                              ✓
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
                });
              })()}
            </List>
          </Box>
        ))}
      </Paper>
    </>
  );
};
