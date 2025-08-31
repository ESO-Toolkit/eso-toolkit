import { Box, Typography, Card, CardContent, Chip, Skeleton, Avatar } from '@mui/material';
import React from 'react';

import { ReportActorFragment } from '../../../graphql/generated';
import { resolveActorName } from '../../../utils/resolveActorName';

interface AttackEvent {
  abilityName?: string | null;
  abilityId?: number | null;
  sourceName?: string | null;
  sourceID?: number | null;
  timestamp?: number | null;
  type?: string | null;
  amount?: number | null;
  wasBlocked?: boolean | null;
}

interface DeathInfo {
  playerId: string;
  timestamp: number;
  killingBlow: AttackEvent | null;
  lastAttacks: AttackEvent[];
  stamina: number | null;
  maxStamina: number | null;
  wasBlocking: boolean | null;
  deathDurationMs: number | null;
  resurrectionTime: number | null;
}

interface PlayerData {
  id: string;
  name: string;
  role?: string;
}

interface DeathEventPanelViewProps {
  deathInfos: DeathInfo[];
  actorsById: Record<string | number, ReportActorFragment>;
  players?: PlayerData[];
  reportId?: string | null;
  fightId?: number;
  fight: { startTime?: number; endTime?: number };
  isLoading?: boolean;
}

// Get color based on player role
const getPlayerColor = (role?: string): string => {
  if (!role) return '#ff8b61'; // Default to DPS color if role is not provided
  
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case 'tank':
    case 'tanks':
      return '#62baff'; // Blue for tanks
    case 'healer':
    case 'healers':
      return '#b970ff'; // Purple for healers
    case 'dps':
    default:
      return '#ff8b61'; // Orange for DPS (default)
  }
};

export const DeathEventPanelView: React.FC<DeathEventPanelViewProps> = ({
  deathInfos,
  actorsById,
  players = [],
  reportId,
  fightId,
  fight,
  isLoading = false,
}) => {
  // Create a map of player IDs to their data for quick lookup
  const playerMap = React.useMemo(() => {
    const map = new Map<string, PlayerData>();
    players.forEach(player => {
      map.set(player.id, player);
    });
    return map;
  }, [players]);
  // Helper function to convert timestamp to seconds since fight start
  const formatTimeFromFightStart = (timestamp: number): string => {
    if (!fight?.startTime) {
      return timestamp.toString();
    }
    const totalSeconds = (timestamp - fight.startTime) / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  // Show skeleton loading while data is being fetched
  if (isLoading) {
    return (
      <Box mt={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
        💀 Death Events
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(1, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              sx={{
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  if (deathInfos.length === 0) {
    return (
      <Box mt={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
        💀 Death Events
        </Typography>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background:
              'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 50%, rgba(76, 175, 80, 0.08) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#4caf50', mb: 1 }}>
            🎉 Flawless Victory!
          </Typography>
          <Typography sx={{ color: '#ecf0f1' }}>No deaths detected in this fight.</Typography>
        </Box>
      </Box>
    );
  }

  // Calculate death summary for header
  const deathSummary = deathInfos.reduce(
    (acc, info) => {
      acc[info.playerId] = (acc[info.playerId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalDeaths = deathInfos.length;
  const uniquePlayers = Object.keys(deathSummary).length;

  return (
    <Box mt={2}>
      {/* Header with summary */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h6">💀 Death Events</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${totalDeaths} Total Deaths`}
            size="small"
            sx={{
              backgroundColor: 'rgba(244, 67, 54, 0.2)',
              color: '#f44336',
              border: '1px solid rgba(244, 67, 54, 0.3)',
            }}
          />
          <Chip
            label={`${uniquePlayers} Players`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.2)',
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          />
        </Box>
      </Box>

      {/* Death summary chips */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#ecf0f1', fontWeight: 600 }}>
          Death Summary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(deathSummary).map(([playerId, count]) => {
            const actor = actorsById[playerId];
            const playerName = resolveActorName(actor, playerId);
            const link =
              reportId && fightId
                ? `https://www.esologs.com/reports/${reportId}?fight=${fightId}&source=${playerId}&type=deaths`
                : undefined;

            const chipContent = (
              <Chip
                label={`${playerName}: ${count}`}
                size="small"
                sx={{
                  backgroundColor: 'rgb(0 0 0 / 15%)',
                  color: '#d2c7c6',
                  border: '1px solid rgb(255 7 7 / 29%)',
                  '&:hover': link
                    ? {
                        backgroundColor: 'rgba(244, 67, 54, 0.25)',
                        transform: 'translateY(-1px)',
                      }
                    : {},
                }}
              />
            );

            return link ? (
              <a
                key={playerId}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                {chipContent}
              </a>
            ) : (
              <Box key={playerId}>{chipContent}</Box>
            );
          })}
        </Box>
      </Box>

      {/* Death events grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(1, 1fr)',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {deathInfos.map((info, idx) => {
          const actor = actorsById[info.playerId];
          const playerName = resolveActorName(actor, info.playerId);

          // Get source name for killing blow
          const killingBlowSourceActor = info.killingBlow?.sourceID
            ? actorsById[info.killingBlow.sourceID]
            : undefined;
          const killingBlowSourceName = resolveActorName(
            killingBlowSourceActor,
            info.killingBlow?.sourceID,
            info.killingBlow?.sourceName
          );

          return (
            <Card
              key={idx}
              sx={{
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow:
                  '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '50%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  transform: 'skewX(-25deg)',
                  transition: 'left 0.5s ease',
                },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                },
                '&:hover::before': {
                  left: '100%',
                },
              }}
            >
              <CardContent sx={{ p: 2, position: 'relative', zIndex: 1 }}>
                {/* Player header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#f44336',
                      fontSize: '1rem',
                    }}
                  >
                    💀
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: getPlayerColor(playerMap.get(info.playerId)?.role),
                        fontWeight: 600,
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {playerName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#ecf0f1',
                        opacity: 0.8,
                        fontSize: '0.75rem',
                      }}
                    >
                      {formatTimeFromFightStart(info.timestamp)}
                    </Typography>
                  </Box>
                </Box>

                {/* Status chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {info.wasBlocking && (
                    <Chip
                      label="🛡️ Blocking"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        color: '#4caf50',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  )}
                  <Chip
                    label={
                      info.stamina !== null && info.maxStamina !== null
                        ? `⚡ ${info.stamina}/${info.maxStamina} (${Math.round((info.stamina / info.maxStamina) * 100)}%)`
                        : `⚡ ${info.stamina ?? 'Unknown'}`
                    }
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 193, 7, 0.2)',
                      color: '#ffc107',
                      border: '1px solid rgba(255, 193, 7, 0.3)',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>

                {/* Killing blow */}
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#ecf0f1',
                      fontWeight: 600,
                      display: 'block',
                      mb: 0.5,
                      fontSize: '0.75rem',
                    }}
                  >
                    ⚔️ Killing Blow
                  </Typography>
                  {info.killingBlow ? (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#ecf0f1', 
                        opacity: 0.9, 
                        fontSize: '0.8rem', 
                        lineHeight: 1.4 
                      }}
                    >
                      Killed by <strong>{info.killingBlow.abilityName || 'Unknown'}</strong>
                      {killingBlowSourceName && info.killingBlow.sourceID && (
                        <>
                          {' '}
                          by <strong style={{ color: getPlayerColor(playerMap.get(info.killingBlow.sourceID.toString())?.role) }}>
                            {killingBlowSourceName}
                          </strong>
                        </>
                      )}
                      {killingBlowSourceName && !info.killingBlow.sourceID && (
                        <>
                          {' '}
                          by <strong>{killingBlowSourceName}</strong>
                        </>
                      )}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#ecf0f1', opacity: 0.8, fontSize: '0.8rem' }}>
                      No killing blow information
                    </Typography>
                  )}
                </Box>

                {/* Recent attacks */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#ecf0f1',
                      fontWeight: 600,
                      display: 'block',
                      mb: 0.5,
                      fontSize: '0.75rem',
                    }}
                  >
                    🕒 Recent Attacks
                  </Typography>
                  {info.lastAttacks.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {info.lastAttacks.slice(0, 3).map((attack, i) => {
                        const attackSourceActor = attack.sourceID ? actorsById[attack.sourceID] : undefined;
                        const attackSourceName = resolveActorName(attackSourceActor, attack.sourceID, attack.sourceName);
                        const sourceId = attack.sourceID?.toString();
                        const sourceRole = sourceId ? playerMap.get(sourceId)?.role : undefined;
                        const sourceColor = getPlayerColor(sourceRole);
                        
                        return (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: '16px' }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#ecf0f1', 
                                opacity: 0.8, 
                                fontSize: '0.7rem', 
                                lineHeight: 1.2, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap', 
                                flex: 1, 
                                minWidth: 0, 
                                '&::before': { 
                                  content: `'${attack.wasBlocked ? '🛡️' : '✕'}'`, 
                                  display: 'inline-block', 
                                  width: '16px', 
                                  textAlign: 'center', 
                                  marginRight: '4px' 
                                } 
                              }}
                            >
                              {attack.abilityName || 'Unknown'}{' '}
                              by{' '}
                              <span style={{ color: sourceColor }}>
                                {attackSourceName}
                              </span>
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                              {typeof attack.amount === 'number' && (
                                <Typography variant="caption" sx={{ color: '#ff6b35', fontSize: '0.7rem', fontWeight: 600 }}>
                                  {attack.amount.toLocaleString()}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#ecf0f1', opacity: 0.8, fontSize: '0.8rem' }}>
                      No recent attacks recorded
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};
