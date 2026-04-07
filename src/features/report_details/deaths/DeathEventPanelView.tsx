import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  useTheme,
  Link as MuiLink,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';

import { DeathEventPanelSkeleton } from '@/components/DeathEventPanelSkeleton';

import { timestampToFightTime } from '@/utils/fightTimeUtils';

import { FightFragment, ReportActorFragment } from '../../../graphql/gql/graphql';
import { useRoleColors } from '../../../hooks';
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
  individualAttacks?: Array<{
    abilityName: string;
    amount: number;
    timestamp: number;
  }>;
  attackerWasTaunted?: boolean | null;
}

interface DeathInfo {
  playerId: string;
  timestamp: number;
  killingBlow: AttackEvent | null;
  lastAttacks: AttackEvent[];
  stamina: number | null;
  maxStamina: number | null;
  health: number | null;
  maxHealth: number | null;
  killingBlowDamage: number | null;
  wasBlocking: boolean | null;
  deathDurationMs: number | null;
  resurrectionTime: number | null;
  killerWasTaunted?: boolean | null;
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
  fight: FightFragment;
  isLoading?: boolean;
}

// --- Shared style helpers ---
const isDark = (mode: string): boolean => mode === 'dark';

/** Glass card base for both skeleton and real cards */
const glassCard = (mode: string) =>
  ({
    borderRadius: '16px',
    background: isDark(mode)
      ? 'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)'
      : 'linear-gradient(135deg, rgb(110 170 240 / 18%) 0%, rgb(152 131 227 / 10%) 50%, rgb(173 192 255 / 6%) 100%)',
    border: isDark(mode)
      ? '1px solid rgba(255, 255, 255, 0.15)'
      : '1px solid rgba(59, 130, 246, 0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  }) as const;

/** Compact stat label — muted label with monospace values */
const statLabel = (mode: string): Record<string, unknown> => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.72rem',
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
  color: isDark(mode) ? '#94a3b8' : '#64748b',
});

/** Thin progress bar with contextual color */
const resourceBar = (
  pct: number,
  color: string,
  mode: string,
): Record<string, unknown> => ({
  position: 'relative',
  height: '3px',
  borderRadius: '2px',
  background: isDark(mode) ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.10)',
  overflow: 'hidden',
  mt: 0.5,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    borderRadius: '2px',
    background: color,
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
});

/** Format death duration to human-readable string */
const formatDeathDuration = (ms: number | null): string | null => {
  if (ms === null || ms <= 0) return null;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(0)}s`;
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec % 60);
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
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
  const theme = useTheme();
  const dark = isDark(theme.palette.mode);

  const roleColors = useRoleColors();
  // Create a map of player IDs to their data for quick lookup
  const playerMap = React.useMemo(() => {
    const map = new Map<string, PlayerData>();
    players.forEach((player) => {
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

  // Helper function to generate replay URL with death timestamp and player ID
  const generateReplayUrl = (timestamp: number, playerId: string): string => {
    if (!reportId) return '#';
    const fightRelativeTime = timestampToFightTime(timestamp, fight);
    return `/report/${reportId}/fight/${fight.id}/replay?time=${Math.round(fightRelativeTime)}&actorId=${playerId}`;
  };

  // Calculate skills summary for killing blows
  const skillsSummary = React.useMemo(() => {
    const skillCounts: Record<string, { count: number; abilityId?: number }> = {};

    deathInfos.forEach((info) => {
      if (info.killingBlow?.abilityName) {
        const abilityName = info.killingBlow.abilityName;
        if (skillCounts[abilityName]) {
          skillCounts[abilityName].count++;
        } else {
          skillCounts[abilityName] = {
            count: 1,
            abilityId: info.killingBlow.abilityId || undefined,
          };
        }
      }
    });

    // Sort by count (descending) and then by name
    return Object.entries(skillCounts).sort(([nameA, dataA], [nameB, dataB]) => {
      if (dataB.count !== dataA.count) {
        return dataB.count - dataA.count;
      }
      return nameA.localeCompare(nameB);
    });
  }, [deathInfos]);

  // -- Shared grid layout for death cards --
  const gridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: '1fr',
      md: 'repeat(2, 1fr)',
      xl: 'repeat(3, 1fr)',
    },
    gap: 2.5,
  };

  // Show skeleton loading while data is being fetched
  if (isLoading) {
    return <DeathEventPanelSkeleton />;
  }

  if (deathInfos.length === 0) {
    return (
      <Box mt={2}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Deaths
        </Typography>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background: dark
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 50%, rgba(76, 175, 80, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(220, 252, 231, 0.6) 100%)',
            border: dark ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: dark
              ? '0 4px 16px rgba(76, 175, 80, 0.15)'
              : '0 2px 8px rgba(34, 197, 94, 0.1)',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: dark ? '#4ade80' : '#059669',
              mb: 0.5,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Flawless
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, fontSize: '0.78rem', opacity: 0.8 }}
          >
            No deaths recorded in this fight.
          </Typography>
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
    {} as Record<string, number>,
  );

  const totalDeaths = deathInfos.length;
  const uniquePlayers = Object.keys(deathSummary).length;

  return (
    <Box mt={2}>
      {/* ─── Header ─── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            mr: 0.5,
            letterSpacing: '-0.02em',
          }}
        >
          Deaths
        </Typography>

        {/* Total deaths badge */}
        <Chip
          label={totalDeaths}
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
            height: 24,
            minWidth: 24,
            background: dark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)',
            color: dark ? '#f87171' : '#dc2626',
            border: dark
              ? '1px solid rgba(239,68,68,0.18)'
              : '1px solid rgba(220,38,38,0.12)',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />

        {/* Player count */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.72rem',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            opacity: 0.8,
          }}
        >
          across {uniquePlayers} player{uniquePlayers !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* ─── Death Summary + Skills Summary — side by side ─── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3.5 }}>
        {/* Per-player summary */}
        <Box sx={{ flex: '1 1 280px' }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1,
              fontWeight: 700,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: theme.palette.text.secondary,
              opacity: 0.7,
            }}
          >
            By Player
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {Object.entries(deathSummary).map(([playerId, count]) => {
              const actor = actorsById[playerId];
              const playerName = resolveActorName(actor, playerId);
              const playerRole = playerMap.get(playerId)?.role;
              const playerColor = roleColors.getPlayerColor(
                playerRole as 'dps' | 'healer' | 'tank',
              );
              const link =
                reportId && fightId
                  ? `https://www.esologs.com/reports/${reportId}?fight=${fightId}&source=${playerId}&type=deaths`
                  : undefined;

              const chip = (
                <Chip
                  label={
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: playerColor,
                          flexShrink: 0,
                        }}
                      />
                      {playerName}
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          ml: '2px',
                          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                          color: dark ? '#f87171' : '#dc2626',
                        }}
                      >
                        {count}
                      </Box>
                    </Box>
                  }
                  size="small"
                  sx={{
                    height: 26,
                    background: dark ? 'rgba(148,163,184,0.06)' : 'rgba(241,245,249,0.6)',
                    border: dark
                      ? '1px solid rgba(148,163,184,0.12)'
                      : '1px solid rgba(148,163,184,0.15)',
                    color: theme.palette.text.primary,
                    cursor: link ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    '&:hover': link
                      ? {
                          background: dark ? 'rgba(148,163,184,0.12)' : 'rgba(241,245,249,0.9)',
                          transform: 'translateY(-1px)',
                          boxShadow: dark
                            ? '0 2px 8px rgba(0,0,0,0.2)'
                            : '0 2px 8px rgba(0,0,0,0.06)',
                        }
                      : {},
                    '& .MuiChip-label': { px: 1 },
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
                  {chip}
                </a>
              ) : (
                <Box key={playerId}>{chip}</Box>
              );
            })}
          </Box>
        </Box>

        {/* Skills summary */}
        {skillsSummary.length > 0 && (
          <Box sx={{ flex: '1 1 280px' }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1,
                fontWeight: 700,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: theme.palette.text.secondary,
                opacity: 0.7,
              }}
            >
              Deadliest Abilities
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {skillsSummary.map(([skillName, data], i) => (
                <Chip
                  key={skillName}
                  label={
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      {skillName}
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          minWidth: 16,
                          height: 16,
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                          background: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.10)',
                          color: dark ? '#e5e7eb' : '#1e293b',
                        }}
                      >
                        {data.count}
                      </Box>
                    </Box>
                  }
                  size="small"
                  sx={{
                    height: 26,
                    background: dark ? 'rgba(148,163,184,0.06)' : 'rgba(241,245,249,0.6)',
                    border: dark
                      ? '1px solid rgba(148,163,184,0.12)'
                      : '1px solid rgba(148,163,184,0.15)',
                    color: theme.palette.text.primary,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: dark
                        ? '0 2px 8px rgba(0,0,0,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.06)',
                    },
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* ─── Death Cards Grid ─── */}
      <Box sx={gridSx}>
        {deathInfos.map((info, idx) => {
          const actor = actorsById[info.playerId];
          const playerName = resolveActorName(actor, info.playerId);
          const playerRole = playerMap.get(info.playerId)?.role as
            | 'dps'
            | 'healer'
            | 'tank'
            | undefined;
          const playerColor = roleColors.getPlayerColor(playerRole);
          const deathDuration = formatDeathDuration(info.deathDurationMs);

          // Get source name for killing blow
          const killingBlowSourceActor = info.killingBlow?.sourceID
            ? actorsById[info.killingBlow.sourceID]
            : undefined;
          const killingBlowSourceName = resolveActorName(
            killingBlowSourceActor,
            info.killingBlow?.sourceID,
            info.killingBlow?.sourceName,
          );

          const healthPct =
            info.health !== null && info.maxHealth
              ? Math.round((info.health / info.maxHealth) * 100)
              : null;

          return (
            <Card
              key={idx}
              sx={{
                ...glassCard(theme.palette.mode),
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                // Shimmer sweep on hover
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: dark
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)',
                  transform: 'skewX(-15deg)',
                  transformOrigin: 'center center',
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
              <CardContent sx={{ p: 2.5, pt: 3, position: 'relative', zIndex: 1 }}>
                {/* ── Player Header ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: `linear-gradient(145deg, ${playerColor} 0%, ${playerColor}99 50%, ${playerColor}55 100%)`,
                        fontSize: '0.9rem',
                        fontWeight: 900,
                        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                        color: '#fff',
                        textShadow: dark
                          ? '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.3)'
                          : '0 2px 4px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)',
                        border: `2px solid ${playerColor}80`,
                        boxShadow: `0 4px 12px ${playerColor}50`,
                        transform: 'perspective(50px) rotateX(5deg)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'perspective(50px) rotateX(5deg) scale(1.1)',
                          boxShadow: `0 6px 16px ${playerColor}60`,
                        },
                      }}
                    >
                      #{idx + 1}
                    </Avatar>
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: playerColor,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.3,
                          textShadow: dark
                            ? '0 1px 3px rgba(0,0,0,0.5)'
                            : '0 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {playerName}
                      </Typography>

                      {/* Death duration badge */}
                      {deathDuration && (
                        <Tooltip
                          title={
                            info.resurrectionTime
                              ? `Resurrected after ${deathDuration}`
                              : `Dead for ${deathDuration} (no res)`
                          }
                          arrow
                          placement="top"
                        >
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '5px',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                              lineHeight: 1,
                              background: dark
                                ? 'rgba(148,163,184,0.08)'
                                : 'rgba(148,163,184,0.06)',
                              border: dark
                                ? '1px solid rgba(148,163,184,0.12)'
                                : '1px solid rgba(148,163,184,0.10)',
                              color: dark ? '#94a3b8' : '#64748b',
                              cursor: 'help',
                              flexShrink: 0,
                            }}
                          >
                            {deathDuration}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                    <MuiLink
                      component={Link}
                      to={generateReplayUrl(info.timestamp, info.playerId)}
                      variant="caption"
                      sx={{
                        color: theme.palette.primary.main,
                        opacity: 0.85,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'opacity 0.15s',
                        '&:hover': { textDecoration: 'underline', opacity: 1 },
                      }}
                      title="View in replay at this time"
                    >
                      {formatTimeFromFightStart(info.timestamp)} ▶
                    </MuiLink>
                  </Box>
                </Box>

                {/* ── Resource Bars + Badges ── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                  {/* Health bar */}
                  {info.health !== null && info.maxHealth !== null && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={statLabel(theme.palette.mode)}>
                          HP {info.health.toLocaleString()}/{info.maxHealth.toLocaleString()}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                            color:
                              healthPct !== null && healthPct <= 25
                                ? dark
                                  ? '#f87171'
                                  : '#dc2626'
                                : dark
                                  ? '#94a3b8'
                                  : '#64748b',
                          }}
                        >
                          {healthPct}%
                        </Typography>
                      </Box>
                      <Box
                        sx={resourceBar(
                          healthPct ?? 0,
                          healthPct !== null && healthPct <= 25
                            ? dark
                              ? '#ef4444'
                              : '#dc2626'
                            : dark
                              ? 'rgba(148,163,184,0.35)'
                              : 'rgba(100,116,139,0.30)',
                          theme.palette.mode,
                        )}
                      />
                    </Box>
                  )}

                  {/* Stamina bar */}
                  {info.stamina !== null && info.maxStamina !== null && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={statLabel(theme.palette.mode)}>
                          STA {info.stamina.toLocaleString()}/{info.maxStamina.toLocaleString()}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                            color: dark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          {Math.round((info.stamina / info.maxStamina) * 100)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={resourceBar(
                          Math.round((info.stamina / info.maxStamina) * 100),
                          dark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.30)',
                          theme.palette.mode,
                        )}
                      />
                    </Box>
                  )}

                  {/* Inline badges row */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
                    {info.wasBlocking && (
                      <Box sx={statLabel(theme.palette.mode)}>BLOCKING</Box>
                    )}
                  </Box>
                </Box>

                {/* ── Killing Blow Panel ── */}
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: '16px',
                    background: dark
                      ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(220, 38, 38, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(254, 226, 226, 0.8) 0%, rgba(252, 242, 242, 0.9) 100%)',
                    border: dark
                      ? '1px solid rgba(244, 67, 54, 0.3)'
                      : '1px solid rgba(220, 38, 38, 0.2)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: dark
                      ? '0 2px 8px rgba(244, 67, 54, 0.15)'
                      : '0 1px 4px rgba(220, 38, 38, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: dark
                        ? 'linear-gradient(90deg, rgba(244,67,54,0.4) 0%, transparent 70%)'
                        : 'linear-gradient(90deg, rgba(220,38,38,0.2) 0%, transparent 70%)',
                    },
                  }}
                >
                  {info.killingBlow ? (
                    <>
                      {/* Ability name + source */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.6rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: dark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.5)',
                            mr: 0.5,
                          }}
                        >
                          Killing Blow
                        </Typography>
                        {info.killingBlow.individualAttacks ? (
                          <Tooltip
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    mb: 0.75,
                                    fontSize: '0.72rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Simultaneous Attacks
                                </Typography>
                                {info.killingBlow.individualAttacks.map((attack, atkIdx) => (
                                  <Box
                                    key={atkIdx}
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: 2,
                                      mb: 0.25,
                                      fontSize: '0.7rem',
                                      '&:last-child': { mb: 0 },
                                    }}
                                  >
                                    <span>{attack.abilityName}</span>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontFamily: '"JetBrains Mono", monospace',
                                      }}
                                    >
                                      {attack.amount.toLocaleString()}
                                    </span>
                                  </Box>
                                ))}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 700,
                                    mt: 0.75,
                                    pt: 0.75,
                                    fontSize: '0.72rem',
                                    borderTop: '1px solid rgba(255,255,255,0.12)',
                                    fontFamily: '"JetBrains Mono", monospace',
                                  }}
                                >
                                  <span>Total</span>
                                  <span>{info.killingBlowDamage?.toLocaleString()}</span>
                                </Box>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: dark ? '#e5e7eb' : '#1e293b',
                                cursor: 'help',
                                borderBottom: dark
                                  ? '1px dashed rgba(148,163,184,0.25)'
                                  : '1px dashed rgba(148,163,184,0.30)',
                                transition: 'border-color 0.15s',
                                '&:hover': {
                                  borderBottomColor: dark
                                    ? 'rgba(148,163,184,0.5)'
                                    : 'rgba(148,163,184,0.6)',
                                },
                              }}
                            >
                              {info.killingBlow.abilityName || 'Unknown'}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: dark ? '#e5e7eb' : '#1e293b',
                            }}
                          >
                            {info.killingBlow.abilityName || 'Unknown'}
                          </Typography>
                        )}
                      </Box>

                      {/* Source + damage row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 0.75,
                          mt: 0.5,
                        }}
                      >
                        {killingBlowSourceName && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.72rem',
                              color: theme.palette.text.secondary,
                            }}
                          >
                            from{' '}
                            <span
                              style={{
                                fontWeight: 600,
                                color: dark ? '#e5e7eb' : '#1e293b',
                              }}
                            >
                              {killingBlowSourceName}
                            </span>
                          </Typography>
                        )}

                        {/* Damage chip */}
                        {info.killingBlowDamage != null && info.killingBlowDamage > 0 && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              px: 1.25,
                              py: 0.5,
                              borderRadius: '12px',
                              background: dark
                                ? 'linear-gradient(135deg, rgba(255, 87, 34, 0.15) 0%, rgba(244, 67, 54, 0.08) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 241, 220, 0.8) 0%, rgba(254, 245, 238, 0.9) 100%)',
                              border: dark
                                ? '1px solid rgba(255, 87, 34, 0.3)'
                                : '1px solid rgba(255, 87, 34, 0.2)',
                              backdropFilter: 'blur(8px)',
                              boxShadow: dark
                                ? '0 2px 8px rgba(255, 87, 34, 0.15)'
                                : '0 1px 4px rgba(255, 87, 34, 0.1)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                                color: dark ? '#f87171' : '#dc2626',
                                lineHeight: 1,
                                textShadow: dark
                                  ? '0 1px 2px rgba(0,0,0,0.8)'
                                  : '0 1px 0 rgba(255,255,255,0.7)',
                              }}
                            >
                              {info.killingBlowDamage.toLocaleString()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.58rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: theme.palette.text.secondary,
                                lineHeight: 1,
                                opacity: 0.7,
                              }}
                            >
                              dmg
                            </Typography>
                            {info.maxHealth && info.killingBlowDamage >= info.maxHealth && (
                              <Box
                                sx={{
                                  fontSize: '0.5rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  color: dark ? '#ef4444' : '#dc2626',
                                  px: 0.5,
                                  py: 0.15,
                                  lineHeight: 1.2,
                                }}
                              >
                                ONE-SHOT
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* Taunt indicator */}
                      {info.killingBlow.attackerWasTaunted !== null && (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            mt: 0.75,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: '5px',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            background: dark
                              ? 'rgba(148,163,184,0.06)'
                              : 'rgba(148,163,184,0.04)',
                            border: dark
                              ? '1px solid rgba(148,163,184,0.10)'
                              : '1px solid rgba(148,163,184,0.08)',
                            color: dark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              backgroundColor: 'currentColor',
                              opacity: 0.5,
                            }}
                          />
                          {info.killingBlow.attackerWasTaunted ? 'Taunted' : 'Not taunted'}
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.text.secondary, fontSize: '0.78rem' }}
                    >
                      No killing blow information
                    </Typography>
                  )}
                </Box>

                {/* ── Recent Attacks ── */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mb: 1,
                      fontWeight: 700,
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: theme.palette.text.secondary,
                      opacity: 0.8,
                    }}
                  >
                    Recent Attacks
                  </Typography>
                  {info.lastAttacks.length > 0 ? (
                    (() => {
                      const attacks = info.lastAttacks.slice(0, 3);
                      const maxDmg = Math.max(
                        ...attacks.map((a) => (typeof a.amount === 'number' ? a.amount : 0)),
                        1,
                      );
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {attacks.map((attack, i) => {
                            const attackSourceActor = attack.sourceID
                              ? actorsById[attack.sourceID]
                              : undefined;
                            const attackSourceName = resolveActorName(
                              attackSourceActor,
                              attack.sourceID,
                              attack.sourceName,
                            );
                            const sourceId = attack.sourceID?.toString();
                            const sourceRole = sourceId ? playerMap.get(sourceId)?.role : undefined;
                            const sourceColor = roleColors.getPlayerColor(
                              sourceRole as 'dps' | 'healer' | 'tank',
                            );
                            const dmgPct =
                              typeof attack.amount === 'number'
                                ? (attack.amount / maxDmg) * 100
                                : 0;

                            return (
                              <Box
                                key={i}
                                sx={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 0.75,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  minHeight: '26px',
                                  // Damage bar background fill
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    width: `${dmgPct}%`,
                                    background: dark
                                      ? 'rgba(148,163,184,0.05)'
                                      : 'rgba(148,163,184,0.04)',
                                    borderRadius: '8px',
                                    transition: 'width 0.3s ease',
                                  },
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    position: 'relative',
                                    color: theme.palette.text.primary,
                                    fontSize: '0.7rem',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  {attack.wasBlocked && (
                                    <Box
                                      component="span"
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: '3px',
                                        fontSize: '0.65rem',
                                        lineHeight: 1,
                                      }}
                                    >
                                      🛡️
                                    </Box>
                                  )}
                                  <span style={{ fontWeight: 500 }}>
                                    {attack.abilityName || 'Unknown'}
                                  </span>
                                  <span style={{ opacity: 0.4, margin: '0 3px' }}>{'/'}</span>
                                  {attack.attackerWasTaunted && (
                                    <span
                                      style={{
                                        marginRight: '2px',
                                        fontSize: '0.55rem',
                                        color: dark ? '#94a3b8' : '#64748b',
                                        fontWeight: 700,
                                      }}
                                      title="Attacker was taunted"
                                    >
                                      TAUNT
                                    </span>
                                  )}
                                  <span style={{ color: sourceColor, fontWeight: 600 }}>
                                    {attackSourceName}
                                  </span>
                                </Typography>
                                {typeof attack.amount === 'number' && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      position: 'relative',
                                      fontSize: '0.75rem',
                                      fontWeight: 900,
                                      fontFamily:
                                        '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                                      flexShrink: 0,
                                      color: dark ? '#ff845a' : '#c2410c',
                                      ...(dark && {
                                        background: 'linear-gradient(180deg, #ffb199, #ff6b35)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                      }),
                                    }}
                                  >
                                    {attack.amount.toLocaleString()}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      );
                    })()
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: '0.72rem',
                        fontStyle: 'italic',
                        opacity: 0.7,
                      }}
                    >
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
