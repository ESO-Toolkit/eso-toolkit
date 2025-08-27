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
                  const fightLabel = isWipe ? `WIPE ${fightNumber}` : `CLEAR ${fightNumber}`;
                  
                  // Calculate bottom border width based on damage dealt
                  // If boss has 60% health, show 40% width (100% - 60%)
                  const damageDealtPercent = isWipe ? (100 - bossHealthPercent) : 100;
                  
                  return (
                    <ListItem key={fight.id} sx={{ p: 0 }}>
                      <ListItemButton
                        selected={fightId === String(fight.id)}
                        onClick={() => handleFightSelect(fight.id)}
                        sx={{
                          width: '100%',
                          height: 64,
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
                            right: `${100 - damageDealtPercent}%`,
                            background: isWipe
                              ? 'linear-gradient(90deg, rgba(255, 99, 71, 0.65) 0%, rgba(255, 165, 0, 0.55) 100%)'
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
                        {/* Wipe badge in the corner (keeps height compact) */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            px: 0.6,
                            py: 0.1,
                            fontSize: '0.66rem',
                            lineHeight: 1.1,
                            borderRadius: 10,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            background:
                              isWipe
                                ? 'linear-gradient(135deg, rgba(255, 82, 82, 0.22) 0%, rgba(255, 149, 0, 0.14) 100%)'
                                : 'transparent',
                            border: '1px solid rgba(255,255,255,0.18)',
                            boxShadow:
                              isWipe
                                ? '0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25)'
                                : 'none',
                            color: isWipe ? '#ffb199' : 'transparent',
                            textShadow: isWipe ? '0 1px 2px rgba(0,0,0,0.45)' : 'none',
                            pointerEvents: 'none',
                            transition: 'opacity 120ms ease',
                            opacity: isWipe ? 1 : 0,
                          }}
                        >
                          {bossHealthPercent}%
                        </Box>
                        <Typography variant="button" sx={{ color: '#ffffff', mb: 0.25, position: 'relative', zIndex: 2, fontSize: '0.78rem', lineHeight: 1.1, letterSpacing: 0.2 }}>
                          {fightLabel}
                        </Typography>
                        {fight.startTime && fight.endTime && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.68rem',
                              lineHeight: 1.1,
                              position: 'relative',
                              zIndex: 2
                            }}
                          >
                            {formatTimestamp(fight.startTime)} • {formatDuration(fight.startTime, fight.endTime)}
                          </Typography>
                        )}
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
