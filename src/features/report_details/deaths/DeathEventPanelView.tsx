import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Avatar,
  useTheme,
  Link as MuiLink,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';

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
      ? 'linear-gradient(165deg, rgba(15,23,42,0.88) 0%, rgba(10,15,30,0.72) 100%)'
      : 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)',
    border: 'none',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: isDark(mode)
      ? '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 40px rgba(0,0,0,0.5)'
      : '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 8px 40px rgba(0,0,0,0.06)',
  }) as const;

/** Compact stat badge */
const statBadge = (mode: string, hue: string): Record<string, unknown> => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    green: {
      bg: isDark(mode) ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)',
      border: isDark(mode) ? 'rgba(34,197,94,0.20)' : 'rgba(34,197,94,0.15)',
      text: isDark(mode) ? '#4ade80' : '#059669',
    },
    red: {
      bg: isDark(mode) ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.05)',
      border: isDark(mode) ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.15)',
      text: isDark(mode) ? '#f87171' : '#dc2626',
    },
    orange: {
      bg: isDark(mode) ? 'rgba(251,146,60,0.10)' : 'rgba(251,146,60,0.05)',
      border: isDark(mode) ? 'rgba(251,146,60,0.20)' : 'rgba(251,146,60,0.15)',
      text: isDark(mode) ? '#fb923c' : '#ea580c',
    },
    blue: {
      bg: isDark(mode) ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.05)',
      border: isDark(mode) ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.15)',
      text: isDark(mode) ? '#38bdf8' : '#0284c7',
    },
  };
  const c = colors[hue] || colors.red;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    px: 1,
    py: 0.4,
    borderRadius: '8px',
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: '0.72rem',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
  };
};

/** Thin progress bar for resource visualization */
const resourceBar = (pct: number, color: string, bgColor: string): Record<string, unknown> => ({
  position: 'relative',
  height: '3px',
  borderRadius: '2px',
  background: bgColor,
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
    return (
      <Box mt={2}>
        {/* Header skeleton */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Skeleton variant="rounded" width={180} height={28} sx={{ borderRadius: '8px' }} />
          <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: '8px' }} />
          <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '8px' }} />
        </Box>

        {/* Summary chips skeleton */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={70 + i * 12}
              height={26}
              sx={{ borderRadius: '8px' }}
            />
          ))}
        </Box>

        {/* Card grid skeleton */}
        <Box sx={gridSx}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} sx={{ ...glassCard(theme.palette.mode), overflow: 'hidden' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={18} />
                    <Skeleton variant="text" width="35%" height={14} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
                  <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '8px' }} />
                  <Skeleton variant="rounded" width={95} height={24} sx={{ borderRadius: '8px' }} />
                </Box>
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={56}
                  sx={{ borderRadius: '10px', mb: 1.5 }}
                />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton
                    key={j}
                    variant="rounded"
                    width="100%"
                    height={20}
                    sx={{ borderRadius: '6px', mb: 0.5 }}
                  />
                ))}
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
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Deaths
        </Typography>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background: dark
              ? 'linear-gradient(165deg, rgba(34,197,94,0.06) 0%, rgba(10,15,30,0.4) 100%)'
              : 'linear-gradient(165deg, rgba(34,197,94,0.04) 0%, rgba(240,253,244,0.6) 100%)',
            border: dark ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(34,197,94,0.10)',
            backdropFilter: 'blur(20px)',
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
            background: dark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            color: dark ? '#f87171' : '#dc2626',
            border: dark ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(220,38,38,0.15)',
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
                    background: dark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
                    border: dark
                      ? '1px solid rgba(239,68,68,0.18)'
                      : '1px solid rgba(220,38,38,0.12)',
                    color: theme.palette.text.primary,
                    cursor: link ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    '&:hover': link
                      ? {
                          background: dark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(239,68,68,0.15)',
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
                          background: dark ? 'rgba(251,146,60,0.20)' : 'rgba(234,88,12,0.10)',
                          color: dark ? '#fb923c' : '#ea580c',
                        }}
                      >
                        {data.count}
                      </Box>
                    </Box>
                  }
                  size="small"
                  sx={{
                    height: 26,
                    background: dark
                      ? i === 0
                        ? 'rgba(251,146,60,0.10)'
                        : 'rgba(148,163,184,0.06)'
                      : i === 0
                        ? 'rgba(251,146,60,0.06)'
                        : 'rgba(241,245,249,0.6)',
                    border: dark
                      ? `1px solid ${i === 0 ? 'rgba(251,146,60,0.25)' : 'rgba(148,163,184,0.12)'}`
                      : `1px solid ${i === 0 ? 'rgba(234,88,12,0.18)' : 'rgba(148,163,184,0.18)'}`,
                    color: theme.palette.text.primary,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: dark
                        ? '0 2px 8px rgba(251,146,60,0.12)'
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

          // Determine health % color
          const healthPct =
            info.health !== null && info.maxHealth
              ? Math.round((info.health / info.maxHealth) * 100)
              : null;
          const healthHue =
            healthPct === null
              ? 'red'
              : healthPct === 0
                ? 'red'
                : healthPct < 25
                  ? 'orange'
                  : 'green';

          return (
            <Card
              key={idx}
              sx={{
                ...glassCard(theme.palette.mode),
                position: 'relative',
                overflow: 'hidden',
                transition:
                  'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                // Top accent gradient bar
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, ${playerColor} 0%, ${dark ? 'rgba(239,68,68,0.6)' : 'rgba(220,38,38,0.4)'} 50%, transparent 100%)`,
                },
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: dark
                    ? `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(148,163,184,0.08), inset 0 1px 0 rgba(255,255,255,0.05)`
                    : `0 12px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.95)`,
                },
              }}
            >
              <CardContent sx={{ p: 2.5, pt: 3 }}>
                {/* ── Player Header ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(145deg, ${playerColor} 0%, ${playerColor}99 100%)`,
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                        color: '#fff',
                        border: `2px solid ${playerColor}60`,
                        boxShadow: `0 2px 12px ${playerColor}30`,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {idx + 1}
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
                              lineHeight: 1,
                              background: info.resurrectionTime
                                ? dark
                                  ? 'rgba(34,197,94,0.12)'
                                  : 'rgba(34,197,94,0.08)'
                                : dark
                                  ? 'rgba(148,163,184,0.10)'
                                  : 'rgba(148,163,184,0.08)',
                              border: info.resurrectionTime
                                ? dark
                                  ? '1px solid rgba(34,197,94,0.22)'
                                  : '1px solid rgba(34,197,94,0.15)'
                                : dark
                                  ? '1px solid rgba(148,163,184,0.15)'
                                  : '1px solid rgba(148,163,184,0.12)',
                              color: info.resurrectionTime
                                ? dark
                                  ? '#4ade80'
                                  : '#059669'
                                : theme.palette.text.secondary,
                              cursor: 'help',
                              flexShrink: 0,
                            }}
                          >
                            {info.resurrectionTime ? '↻' : '⏱'} {deathDuration}
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
                        <Box sx={statBadge(theme.palette.mode, healthHue)}>
                          HP {info.health.toLocaleString()}/{info.maxHealth.toLocaleString()}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                            color:
                              healthHue === 'red'
                                ? dark
                                  ? '#f87171'
                                  : '#dc2626'
                                : healthHue === 'orange'
                                  ? dark
                                    ? '#fb923c'
                                    : '#ea580c'
                                  : dark
                                    ? '#4ade80'
                                    : '#059669',
                          }}
                        >
                          {healthPct}%
                        </Typography>
                      </Box>
                      <Box
                        sx={resourceBar(
                          healthPct ?? 0,
                          healthHue === 'red'
                            ? dark
                              ? '#ef4444'
                              : '#dc2626'
                            : healthHue === 'orange'
                              ? dark
                                ? '#fb923c'
                                : '#ea580c'
                              : dark
                                ? '#4ade80'
                                : '#059669',
                          dark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.10)',
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
                        <Box sx={statBadge(theme.palette.mode, 'green')}>
                          STA {info.stamina.toLocaleString()}/{info.maxStamina.toLocaleString()}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                            color: dark ? '#4ade80' : '#059669',
                          }}
                        >
                          {Math.round((info.stamina / info.maxStamina) * 100)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={resourceBar(
                          Math.round((info.stamina / info.maxStamina) * 100),
                          dark ? '#4ade80' : '#059669',
                          dark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.10)',
                        )}
                      />
                    </Box>
                  )}

                  {/* Inline badges row */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
                    {info.wasBlocking && (
                      <Box sx={statBadge(theme.palette.mode, 'blue')}>BLOCKING</Box>
                    )}
                  </Box>
                </Box>

                {/* ── Killing Blow Panel ── */}
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: '12px',
                    background: dark
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,23,42,0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.03) 0%, rgba(254,242,242,0.4) 100%)',
                    border: dark
                      ? '1px solid rgba(239,68,68,0.12)'
                      : '1px solid rgba(220,38,38,0.08)',
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
                        ? 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, transparent 70%)'
                        : 'linear-gradient(90deg, rgba(220,38,38,0.15) 0%, transparent 70%)',
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
                            color: dark ? 'rgba(248,113,113,0.7)' : 'rgba(220,38,38,0.5)',
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
                                color: dark ? '#f674ab' : '#be185d',
                                cursor: 'help',
                                borderBottom: `1px dashed ${dark ? 'rgba(246,116,171,0.3)' : 'rgba(190,24,93,0.2)'}`,
                                transition: 'border-color 0.15s',
                                '&:hover': {
                                  borderBottomColor: dark
                                    ? 'rgba(246,116,171,0.6)'
                                    : 'rgba(190,24,93,0.4)',
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
                              color: dark ? '#f674ab' : '#be185d',
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
                                color: dark ? '#f9a8d4' : '#9d174d',
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
                              px: 1,
                              py: 0.3,
                              borderRadius: '7px',
                              background: dark ? 'rgba(239,68,68,0.10)' : 'rgba(220,38,38,0.06)',
                              border: dark
                                ? '1px solid rgba(239,68,68,0.18)'
                                : '1px solid rgba(220,38,38,0.12)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                                color: dark ? '#f87171' : '#dc2626',
                                lineHeight: 1,
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
                                  color: '#fff',
                                  background: dark
                                    ? 'linear-gradient(135deg, #f97316, #ef4444)'
                                    : 'linear-gradient(135deg, #ea580c, #dc2626)',
                                  px: 0.5,
                                  py: 0.15,
                                  borderRadius: '3px',
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
                            background: info.killingBlow.attackerWasTaunted
                              ? dark
                                ? 'rgba(34,197,94,0.10)'
                                : 'rgba(34,197,94,0.06)'
                              : dark
                                ? 'rgba(239,68,68,0.08)'
                                : 'rgba(239,68,68,0.04)',
                            border: info.killingBlow.attackerWasTaunted
                              ? dark
                                ? '1px solid rgba(34,197,94,0.18)'
                                : '1px solid rgba(34,197,94,0.12)'
                              : dark
                                ? '1px solid rgba(239,68,68,0.15)'
                                : '1px solid rgba(239,68,68,0.10)',
                            color: info.killingBlow.attackerWasTaunted
                              ? dark
                                ? '#4ade80'
                                : '#059669'
                              : dark
                                ? '#f87171'
                                : '#dc2626',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              backgroundColor: 'currentColor',
                              opacity: 0.8,
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
                                      ? 'rgba(251,146,60,0.06)'
                                      : 'rgba(251,146,60,0.04)',
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
                                        width: 14,
                                        mr: '3px',
                                        fontSize: '0.55rem',
                                        color: dark ? '#38bdf8' : '#0284c7',
                                        fontWeight: 700,
                                      }}
                                    >
                                      BLK
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
                                        color: dark ? '#4ade80' : '#059669',
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
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      fontFamily:
                                        '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
                                      flexShrink: 0,
                                      color: dark ? '#fb923c' : '#ea580c',
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
