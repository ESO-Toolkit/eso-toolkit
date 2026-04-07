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
const isDark = (mode: string) => mode === 'dark';

/** Glass card base for both skeleton and real cards */
const glassCard = (mode: string) =>
  ({
    borderRadius: '14px',
    background: isDark(mode)
      ? 'linear-gradient(160deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.60) 100%)'
      : 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.80) 100%)',
    border: isDark(mode) ? '1px solid rgba(148,163,184,0.12)' : '1px solid rgba(148,163,184,0.22)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: isDark(mode)
      ? '0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  }) as const;

/** Compact stat badge */
const statBadge = (mode: string, hue: string) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    green: {
      bg: isDark(mode) ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
      border: isDark(mode) ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.18)',
      text: isDark(mode) ? '#4ade80' : '#059669',
    },
    red: {
      bg: isDark(mode) ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
      border: isDark(mode) ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.18)',
      text: isDark(mode) ? '#f87171' : '#dc2626',
    },
    orange: {
      bg: isDark(mode) ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.06)',
      border: isDark(mode) ? 'rgba(251,146,60,0.25)' : 'rgba(251,146,60,0.18)',
      text: isDark(mode) ? '#fb923c' : '#ea580c',
    },
    blue: {
      bg: isDark(mode) ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.06)',
      border: isDark(mode) ? 'rgba(56,189,248,0.22)' : 'rgba(56,189,248,0.18)',
      text: isDark(mode) ? '#38bdf8' : '#0284c7',
    },
  };
  const c = colors[hue] || colors.red;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    px: 1.25,
    py: 0.5,
    borderRadius: '8px',
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  };
};

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
    gap: 2,
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
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Death Events
        </Typography>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '14px',
            background: dark
              ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(240,253,244,0.8) 100%)',
            border: dark ? '1px solid rgba(34,197,94,0.20)' : '1px solid rgba(34,197,94,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: dark ? '#4ade80' : '#059669', mb: 0.5, fontWeight: 700 }}
          >
            Flawless Victory
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            No deaths detected in this fight.
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
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 0.5 }}>
          Death Events
        </Typography>

        {/* Total deaths badge */}
        <Chip
          label={`${totalDeaths} Death${totalDeaths !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 26,
            background: dark
              ? 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.10) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(254,226,226,0.6) 100%)',
            color: dark ? '#f87171' : '#dc2626',
            border: dark ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(220,38,38,0.20)',
            backdropFilter: 'blur(8px)',
            '& .MuiChip-label': { px: 1.25 },
          }}
        />

        {/* Player count badge */}
        <Chip
          label={`${uniquePlayers} Player${uniquePlayers !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            height: 26,
            background: dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.06)',
            color: theme.palette.text.secondary,
            border: dark ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(148,163,184,0.20)',
            '& .MuiChip-label': { px: 1.25 },
          }}
        />
      </Box>

      {/* ─── Death Summary + Skills Summary — side by side ─── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Per-player summary */}
        <Box sx={{ flex: '1 1 280px' }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1,
              fontWeight: 700,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: theme.palette.text.secondary,
            }}
          >
            Deaths by Player
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
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: theme.palette.text.secondary,
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
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                // Left accent bar
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '3px',
                  height: '100%',
                  background: `linear-gradient(180deg, ${dark ? '#ef4444' : '#dc2626'} 0%, ${dark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.10)'} 100%)`,
                },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: dark
                    ? '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
                },
              }}
            >
              <CardContent sx={{ p: 2, pl: 2.5 }}>
                {/* ── Player Header ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      background: dark
                        ? 'linear-gradient(145deg, #dc2626 0%, #991b1b 100%)'
                        : 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#fff',
                      border: dark
                        ? '2px solid rgba(239,68,68,0.35)'
                        : '2px solid rgba(220,38,38,0.40)',
                      boxShadow: dark
                        ? '0 2px 8px rgba(220,38,38,0.25)'
                        : '0 2px 8px rgba(220,38,38,0.30)',
                    }}
                  >
                    #{idx + 1}
                  </Avatar>
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

                {/* ── Compact Stat Badges Row ── */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  {/* Blocking badge */}
                  {info.wasBlocking && (
                    <Box sx={statBadge(theme.palette.mode, 'blue')}>
                      <span style={{ fontSize: '0.7rem' }}>🛡️</span> Blocking
                    </Box>
                  )}

                  {/* Stamina badge */}
                  <Box sx={statBadge(theme.palette.mode, 'green')}>
                    <span style={{ fontSize: '0.7rem' }}>⚡</span>
                    {info.stamina !== null && info.maxStamina !== null ? (
                      <span>
                        {info.stamina.toLocaleString()}/{info.maxStamina.toLocaleString()}{' '}
                        <strong>{Math.round((info.stamina / info.maxStamina) * 100)}%</strong>
                      </span>
                    ) : (
                      <span>{info.stamina ?? '?'}</span>
                    )}
                  </Box>

                  {/* Health badge */}
                  {info.health !== null && info.maxHealth !== null && (
                    <Box sx={statBadge(theme.palette.mode, healthHue)}>
                      <span style={{ fontSize: '0.7rem' }}>❤️</span>
                      <span>
                        {info.health.toLocaleString()}/{info.maxHealth.toLocaleString()}{' '}
                        <strong>{healthPct}%</strong>
                      </span>
                    </Box>
                  )}
                </Box>

                {/* ── Killing Blow Panel ── */}
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1.25,
                    borderRadius: '10px',
                    background: dark
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(254,242,242,0.5) 100%)',
                    border: dark
                      ? '1px solid rgba(239,68,68,0.15)'
                      : '1px solid rgba(220,38,38,0.10)',
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
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: theme.palette.text.secondary,
                            mr: 0.5,
                          }}
                        >
                          Killing Blow
                        </Typography>
                        {info.killingBlow.individualAttacks ? (
                          <Tooltip
                            title={
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700, mb: 0.75, fontSize: '0.75rem' }}
                                >
                                  Simultaneous Attacks
                                </Typography>
                                {info.killingBlow.individualAttacks.map((attack, atkIdx) => (
                                  <Typography
                                    key={atkIdx}
                                    variant="body2"
                                    sx={{ fontSize: '0.7rem', mb: 0.25, '&:last-child': { mb: 0 } }}
                                  >
                                    {attack.abilityName}: {attack.amount.toLocaleString()}
                                  </Typography>
                                ))}
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    mt: 0.75,
                                    pt: 0.75,
                                    fontSize: '0.7rem',
                                    borderTop: '1px solid rgba(255,255,255,0.15)',
                                  }}
                                >
                                  Total: {info.killingBlowDamage?.toLocaleString()}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: dark ? '#f674ab' : '#be185d',
                                cursor: 'help',
                                borderBottom: '1px dotted currentColor',
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
                              fontSize: '0.85rem',
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
                              gap: '4px',
                              px: 1,
                              py: 0.25,
                              borderRadius: '6px',
                              background: dark ? 'rgba(239,68,68,0.14)' : 'rgba(220,38,38,0.08)',
                              border: dark
                                ? '1px solid rgba(239,68,68,0.25)'
                                : '1px solid rgba(220,38,38,0.15)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                color: dark ? '#f87171' : '#dc2626',
                                lineHeight: 1,
                              }}
                            >
                              {info.killingBlowDamage.toLocaleString()}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.6rem',
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                lineHeight: 1,
                              }}
                            >
                              dmg
                            </Typography>
                            {info.maxHealth && info.killingBlowDamage >= info.maxHealth && (
                              <Box
                                sx={{
                                  fontSize: '0.55rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  color: dark ? '#fb923c' : '#ea580c',
                                  ml: '2px',
                                }}
                              >
                                EXEC
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* Taunt indicator */}
                      {info.killingBlow.attackerWasTaunted !== null && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: info.killingBlow.attackerWasTaunted
                              ? dark
                                ? '#4ade80'
                                : '#059669'
                              : dark
                                ? '#94a3b8'
                                : '#64748b',
                          }}
                        >
                          {info.killingBlow.attackerWasTaunted
                            ? '🎯 Killer was taunted'
                            : '🔴 Killer was NOT taunted'}
                        </Typography>
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
                      mb: 0.75,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    Recent Attacks
                  </Typography>
                  {info.lastAttacks.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {info.lastAttacks.slice(0, 3).map((attack, i) => {
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

                        return (
                          <Box
                            key={i}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 0.75,
                              px: 1,
                              py: 0.5,
                              borderRadius: '6px',
                              background:
                                i % 2 === 0
                                  ? dark
                                    ? 'rgba(148,163,184,0.04)'
                                    : 'rgba(148,163,184,0.03)'
                                  : 'transparent',
                              minHeight: '22px',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
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
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '14px',
                                  textAlign: 'center',
                                  marginRight: '4px',
                                  fontSize: '0.6rem',
                                  opacity: 0.7,
                                }}
                              >
                                {attack.wasBlocked ? '🛡️' : '✕'}
                              </span>
                              {attack.abilityName || 'Unknown'}
                              <span style={{ opacity: 0.5 }}>{' by '}</span>
                              {attack.attackerWasTaunted && (
                                <span
                                  style={{ marginRight: '2px', fontSize: '0.6rem' }}
                                  title="Attacker was taunted"
                                >
                                  🎯
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
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
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
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}
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
