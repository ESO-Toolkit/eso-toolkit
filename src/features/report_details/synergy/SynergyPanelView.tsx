import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  Avatar,
  Box,
  Chip,
  FormControlLabel,
  Link as MuiLink,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState } from 'react';

import { MetricPill } from '@/components/MetricPill';
import { SynergyPanelSkeleton } from '@/components/SynergyPanelSkeleton';

import type { FightFragment, ReportActorFragment } from '../../../graphql/gql/graphql';

import { ALKOSH_SYNERGY_IDS, filterSynergyData } from './synergyUtils';
import type { SynergyByAbility, SynergyByPlayer, SynergyPanelData } from './synergyUtils';

// Format ms offset as m:ss
function formatFightTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const MONO_FONT = '"JetBrains Mono", "Fira Code", "SF Mono", monospace';

const glassSurface = (mode: 'light' | 'dark') =>
  ({
    borderRadius: '16px',
    background:
      mode === 'dark'
        ? 'linear-gradient(135deg, rgb(110 170 240 / 20%) 0%, rgb(152 131 227 / 12%) 50%, rgb(173 192 255 / 6%) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.78) 100%)',
    border:
      mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(59,130,246,0.22)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow:
      mode === 'dark'
        ? '0 8px 32px 0 rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.16)'
        : '0 4px 16px 0 rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  }) as const;

/** Rank badge colors for top contributors. */
const rankPalette: Record<number, { bg: string; border: string; text: string }> = {
  1: {
    bg: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    border: 'rgba(251,191,36,0.6)',
    text: '#fff',
  },
  2: {
    bg: 'linear-gradient(145deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%)',
    border: 'rgba(209,213,219,0.55)',
    text: '#fff',
  },
  3: {
    bg: 'linear-gradient(145deg, #fbbf24 0%, #b45309 50%, #78350f 100%)',
    border: 'rgba(180,83,9,0.5)',
    text: '#fff',
  },
};

const defaultRank = {
  bg: 'linear-gradient(145deg, #38bdf8 0%, #0284c7 50%, #075985 100%)',
  border: 'rgba(56,189,248,0.5)',
  text: '#fff',
};

interface SynergyPanelViewProps {
  data: SynergyPanelData;
  fight: FightFragment;
  isLoading: boolean;
  actorsById: Record<string | number, ReportActorFragment>;
  reportCode: string | null;
  fightId: number | null;
}

export const SynergyPanelView: React.FC<SynergyPanelViewProps> = ({
  data,
  fight,
  isLoading,
  actorsById,
  reportCode,
  fightId,
}) => {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const isDark = mode === 'dark';
  const [alkoshOnly, setAlkoshOnly] = useState(false);

  const filteredData = useMemo(
    () => (alkoshOnly ? filterSynergyData(data, ALKOSH_SYNERGY_IDS) : data),
    [data, alkoshOnly],
  );

  const topSynergy = filteredData.byAbility[0];
  const topPlayer = filteredData.byPlayer[0];
  const maxAbilityCount = topSynergy?.totalCount ?? 1;
  const maxPlayerCount = topPlayer?.totalCount ?? 1;

  if (isLoading) {
    return <SynergyPanelSkeleton />;
  }

  if (data.totalCount === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Synergies
        </Typography>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            ...glassSurface(mode),
          }}
        >
          <HandshakeIcon
            sx={{
              fontSize: 44,
              color: isDark ? 'rgba(148,163,184,0.5)' : 'rgba(71,85,105,0.5)',
              mb: 1,
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: isDark ? '#e5e7eb' : '#1e293b',
              mb: 0.5,
            }}
          >
            No synergies activated
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, fontSize: '0.78rem', opacity: 0.85 }}
          >
            No players activated any synergy abilities during this fight.
          </Typography>
        </Box>
      </Box>
    );
  }

  const allSynergiesUrl = buildAllSynergiesUrl(reportCode, fightId);

  return (
    <Box sx={{ mt: 2 }}>
      {/* ─── Header ─── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            mr: 0.5,
          }}
        >
          Synergies
        </Typography>

        <Chip
          label={filteredData.totalCount}
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            fontFamily: MONO_FONT,
            height: 24,
            minWidth: 24,
            background: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.08)',
            color: isDark ? '#7dd3fc' : '#0369a1',
            border: isDark ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(14,165,233,0.2)',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />

        <Typography
          variant="caption"
          sx={{
            fontSize: '0.72rem',
            fontWeight: 500,
            color: theme.palette.text.secondary,
            opacity: 0.8,
          }}
        >
          across {filteredData.byPlayer.length} player
          {filteredData.byPlayer.length !== 1 ? 's' : ''} and {filteredData.byAbility.length} abilit
          {filteredData.byAbility.length !== 1 ? 'ies' : 'y'}
        </Typography>

        <Box sx={{ flex: 1, minWidth: 8 }} />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={alkoshOnly}
              onChange={(_, checked) => setAlkoshOnly(checked)}
            />
          }
          label={
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.03em',
                color: theme.palette.text.secondary,
              }}
            >
              Alkosh only
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />

        {allSynergiesUrl && (
          <Chip
            icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            label="ESO Logs"
            size="small"
            clickable
            onClick={() => window.open(allSynergiesUrl, '_blank', 'noopener,noreferrer')}
            sx={{
              height: 26,
              fontWeight: 600,
              fontSize: '0.72rem',
              background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(241,245,249,0.6)',
              border: isDark
                ? '1px solid rgba(148,163,184,0.14)'
                : '1px solid rgba(148,163,184,0.2)',
              color: theme.palette.text.primary,
              transition: 'all 0.15s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(241,245,249,0.9)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
              },
              '& .MuiChip-icon': { color: 'inherit', ml: 0.75 },
            }}
          />
        )}
      </Box>

      {/* ─── Stats Row ─── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 1.25,
          mb: 3,
        }}
      >
        <MetricPill
          label="Activations"
          value={filteredData.totalCount}
          intent="info"
          variant="solid"
        />
        <MetricPill
          label="Synergies"
          value={filteredData.byAbility.length}
          intent="info"
          variant="outline"
        />
        <MetricPill
          label="Players"
          value={filteredData.byPlayer.length}
          intent="info"
          variant="outline"
        />
        <MetricPill
          label="Top Synergy"
          value={topSynergy?.abilityName ?? '—'}
          intent="success"
          variant="solid"
          tooltip={
            topSynergy
              ? `${topSynergy.abilityName ?? 'Ability'} — ${topSynergy.totalCount} activation${topSynergy.totalCount !== 1 ? 's' : ''}`
              : undefined
          }
        />
        <MetricPill
          label="Most Active"
          value={topPlayer?.playerName ?? '—'}
          intent="success"
          variant="solid"
          tooltip={
            topPlayer
              ? `${topPlayer.playerName} — ${topPlayer.totalCount} synergy activation${topPlayer.totalCount !== 1 ? 's' : ''}`
              : undefined
          }
        />
      </Box>

      {/* ─── Who is taking synergies? ─── */}
      <SectionHeader
        icon={<GroupsIcon sx={{ fontSize: 18 }} />}
        title="Who is taking synergies?"
        subtitle={`${filteredData.byPlayer.length} contributor${filteredData.byPlayer.length !== 1 ? 's' : ''}`}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            xl: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3.5,
        }}
      >
        {filteredData.byPlayer.map((player, idx) => (
          <PlayerSynergyCard
            key={player.playerID}
            player={player}
            rank={idx + 1}
            maxCount={maxPlayerCount}
            mode={mode}
            reportCode={reportCode}
            fightId={fightId}
          />
        ))}
      </Box>

      {/* ─── Synergy Abilities ─── */}
      <SectionHeader
        icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
        title="Synergy Abilities"
        subtitle={`${filteredData.byAbility.length} used`}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            xl: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3.5,
        }}
      >
        {filteredData.byAbility.map((ability) => (
          <AbilityCard
            key={ability.abilityGameID}
            ability={ability}
            maxCount={maxAbilityCount}
            actorsById={actorsById}
            mode={mode}
          />
        ))}
      </Box>

      {/* ─── Activation Timeline ─── */}
      <SectionHeader
        icon={<TimelineIcon sx={{ fontSize: 18 }} />}
        title="Activation Timeline"
        subtitle={`${filteredData.activations.length} event${filteredData.activations.length !== 1 ? 's' : ''}`}
      />
      <ActivationTimeline
        activations={filteredData.activations}
        fight={fight}
        actorsById={actorsById}
        mode={mode}
      />
    </Box>
  );
};

/** Section header with icon + title + subtitle. */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '8px',
          background:
            theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.08)',
          color: theme.palette.mode === 'dark' ? '#7dd3fc' : '#0369a1',
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          fontSize: '0.92rem',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.68rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.palette.text.secondary,
            opacity: 0.7,
            ml: 0.5,
          }}
        >
          · {subtitle}
        </Typography>
      )}
    </Box>
  );
};

/** Build an ESO Logs URL filtered to casts of a specific ability by a specific player. */
function buildEsoLogsUrl(
  reportCode: string | null,
  fightId: number | null,
  abilityId: number,
  sourceId: number,
): string | null {
  if (!reportCode || fightId == null) return null;
  return `https://www.esologs.com/reports/${reportCode}?fight=${fightId}&type=casts&ability=${abilityId}&source=${sourceId}`;
}

/**
 * The pins expression for ESO Logs that filters to all synergy ability IDs.
 * Format: `2$Off$#244F4B$expression$ability.id IN (id1,/*Name1* /id2,/*Name2* /...)`
 * Pre-encoded for use in a URL query parameter.
 */
const SYNERGY_PINS_EXPRESSION =
  '2%24Off%24%23244F4B%24expression%24ability.id+IN+%28' +
  '41963%2C%2F*Blood+Feast*%2F' +
  '41994%2C%2F*Black+Widow*%2F' +
  '41838%2C%2F*Radiate*%2F' +
  '42194%2C%2F*Spinal+Surge*%2F' +
  '39301%2C%2F*Combustion*%2F' +
  '63507%2C%2F*Healing+Combustion*%2F' +
  '32910%2C%2F*Shackle*%2F' +
  '32974%2C%2F*Ignite*%2F' +
  '48076%2C%2F*Charged+Lightning*%2F' +
  '23196%2C%2F*Conduit*%2F' +
  '37729%2C%2F*Hidden+Refresh*%2F' +
  '26832%2C%2F*Blessed+Shards*%2F' +
  '95922%2C%2F*Holy+Shards*%2F' +
  '22269%2C%2F*Purify*%2F' +
  '115548%2C%2F*Grave+Robber*%2F' +
  '85572%2C%2F*Harvest*%2F' +
  '191078%2F*Runebreak*%2F' +
  '%29';

/** Build an ESO Logs URL showing all synergy casts for the entire fight. */
function buildAllSynergiesUrl(reportCode: string | null, fightId: number | null): string | null {
  if (!reportCode || fightId == null) return null;
  return `https://www.esologs.com/reports/${reportCode}?fight=${fightId}&type=casts&pins=${SYNERGY_PINS_EXPRESSION}`;
}

/** Glass card showing synergy usage for a single player. */
const PlayerSynergyCard: React.FC<{
  player: SynergyByPlayer;
  rank: number;
  maxCount: number;
  mode: 'light' | 'dark';
  reportCode: string | null;
  fightId: number | null;
}> = ({ player, rank, maxCount, mode, reportCode, fightId }) => {
  const isDark = mode === 'dark';
  const rankStyle = rankPalette[rank] ?? defaultRank;
  const sharePct = Math.max(2, Math.round((player.totalCount / maxCount) * 100));

  const sortedSynergies = useMemo(
    () => Object.entries(player.synergies).sort(([, a], [, b]) => b.count - a.count),
    [player.synergies],
  );

  return (
    <Box
      sx={{
        ...glassSurface(mode),
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        transition: 'all 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: rankStyle.bg,
          opacity: 0.9,
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 8px 24px 0 rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        },
      }}
    >
      {/* Header: rank avatar + name + total */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: rankStyle.bg,
            fontSize: '0.78rem',
            fontWeight: 900,
            fontFamily: MONO_FONT,
            color: rankStyle.text,
            border: `2px solid ${rankStyle.border}`,
            boxShadow: `0 4px 12px ${rankStyle.border}`,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            flexShrink: 0,
          }}
        >
          #{rank}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {player.playerName}
          </Typography>
          {player.displayName && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontSize: '0.68rem',
                color: 'text.secondary',
                opacity: 0.75,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }}
            >
              {player.displayName}
            </Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 800,
              lineHeight: 1,
              fontFamily: MONO_FONT,
              color: isDark ? '#7dd3fc' : '#0369a1',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {player.totalCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'text.secondary',
              opacity: 0.7,
            }}
          >
            total
          </Typography>
        </Box>
      </Box>

      {/* Share bar */}
      <Box
        sx={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)',
          overflow: 'hidden',
          mb: 1.25,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${sharePct}%`,
            borderRadius: 2,
            background: rankStyle.bg,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          },
        }}
      />

      {/* Synergies breakdown */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {sortedSynergies.map(([abilityId, info]) => {
          const esoLogsUrl = buildEsoLogsUrl(
            reportCode,
            fightId,
            Number(abilityId),
            player.playerID,
          );
          const rowContent = (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
                py: 0.25,
                pr: 0.5,
                borderRadius: 1,
                transition: 'background 0.15s ease',
                '&:hover': {
                  background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.08)',
                },
              }}
            >
              {info.abilityIcon && (
                <Avatar
                  src={`https://assets.eso-hub.com/abilities/${info.abilityIcon}.webp`}
                  alt=""
                  sx={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    borderRadius: '4px',
                    border: isDark
                      ? '1px solid rgba(148,163,184,0.2)'
                      : '1px solid rgba(148,163,184,0.25)',
                  }}
                  variant="rounded"
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {info.abilityName ?? `Ability ${abilityId}`}
              </Typography>
              <Box
                component="span"
                sx={{
                  fontFamily: MONO_FONT,
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  color: isDark ? '#e5e7eb' : '#1e293b',
                  fontVariantNumeric: 'tabular-nums',
                  ml: 0.5,
                }}
              >
                {info.count}
              </Box>
              {esoLogsUrl && (
                <OpenInNewIcon
                  sx={{
                    fontSize: 11,
                    opacity: 0.5,
                    color: 'text.secondary',
                  }}
                />
              )}
            </Box>
          );

          return esoLogsUrl ? (
            <MuiLink
              key={abilityId}
              href={esoLogsUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'none', color: 'inherit' }}
            >
              {rowContent}
            </MuiLink>
          ) : (
            <Box key={abilityId}>{rowContent}</Box>
          );
        })}
      </Box>
    </Box>
  );
};

/** Glass card for a single synergy ability. */
const AbilityCard: React.FC<{
  ability: SynergyByAbility;
  maxCount: number;
  actorsById: Record<string | number, { name?: string | null }>;
  mode: 'light' | 'dark';
}> = ({ ability, maxCount, actorsById, mode }) => {
  const theme = useTheme();
  const isDark = mode === 'dark';
  const sharePct = Math.max(2, Math.round((ability.totalCount / maxCount) * 100));

  const playerCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const act of ability.activations) {
      counts.set(act.sourceID, (counts.get(act.sourceID) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [ability.activations]);

  return (
    <Box
      sx={{
        ...glassSurface(mode),
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)'
            : '0 8px 24px 0 rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
        {ability.abilityIcon ? (
          <Avatar
            src={`https://assets.eso-hub.com/abilities/${ability.abilityIcon}.webp`}
            alt=""
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              border: isDark
                ? '1px solid rgba(148,163,184,0.25)'
                : '1px solid rgba(148,163,184,0.3)',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(15,23,42,0.08)',
              flexShrink: 0,
            }}
          />
        ) : (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.1)',
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ability.abilityName ?? `Ability ${ability.abilityGameID}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              opacity: 0.75,
              mt: 0.25,
            }}
          >
            {playerCounts.length} contributor
            {playerCounts.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 800,
              lineHeight: 1,
              fontFamily: MONO_FONT,
              color: isDark ? '#7dd3fc' : '#0369a1',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ability.totalCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'text.secondary',
              opacity: 0.7,
            }}
          >
            casts
          </Typography>
        </Box>
      </Box>

      {/* Progress bar showing share of top ability */}
      <Box
        sx={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)',
          overflow: 'hidden',
          mb: 1.25,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${sharePct}%`,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #38bdf8 0%, #22d3ee 50%, #a78bfa 100%)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          },
        }}
      />

      {/* Contributor chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {playerCounts.map(([playerId, count]) => {
          const name = actorsById[playerId]?.name ?? `Player ${playerId}`;
          return (
            <Chip
              key={playerId}
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  {name}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      minWidth: 16,
                      height: 16,
                      px: 0.5,
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: MONO_FONT,
                      background: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(14,165,233,0.12)',
                      color: isDark ? '#7dd3fc' : '#0369a1',
                    }}
                  >
                    {count}
                  </Box>
                </Box>
              }
              size="small"
              sx={{
                height: 24,
                background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(241,245,249,0.6)',
                border: isDark
                  ? '1px solid rgba(148,163,184,0.14)'
                  : '1px solid rgba(148,163,184,0.2)',
                color: theme.palette.text.primary,
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(241,245,249,0.9)',
                },
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

/** Compact timeline list of all synergy activations. */
const ActivationTimeline: React.FC<{
  activations: SynergyPanelData['activations'];
  fight: FightFragment;
  actorsById: Record<string | number, { name?: string | null }>;
  mode: 'light' | 'dark';
}> = ({ activations, fight, actorsById, mode }) => {
  const theme = useTheme();
  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        ...glassSurface(mode),
        overflow: 'hidden',
        maxHeight: 440,
        overflowY: 'auto',
        p: 0,
        // Subtle scrollbar
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.3)',
          borderRadius: 4,
        },
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '72px 1fr 1.4fr',
          gap: 1.5,
          alignItems: 'center',
          px: 2,
          py: 1.25,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)',
          borderBottom: isDark
            ? '1px solid rgba(148,163,184,0.12)'
            : '1px solid rgba(148,163,184,0.18)',
        }}
      >
        {['Time', 'Player', 'Synergy'].map((label) => (
          <Typography
            key={label}
            variant="caption"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: theme.palette.text.secondary,
              opacity: 0.75,
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      {activations.map((activation, index) => {
        const fightTime = activation.timestamp - fight.startTime;
        const actor = actorsById[activation.sourceID];
        const playerName = actor?.name ?? `Player ${activation.sourceID}`;
        return (
          <Box
            key={`${activation.timestamp}-${activation.sourceID}-${index}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '72px 1fr 1.4fr',
              gap: 1.5,
              alignItems: 'center',
              px: 2,
              py: 1,
              borderBottom:
                index < activations.length - 1
                  ? isDark
                    ? '1px solid rgba(148,163,184,0.06)'
                    : '1px solid rgba(148,163,184,0.1)'
                  : 'none',
              background:
                index % 2 === 0
                  ? 'transparent'
                  : isDark
                    ? 'rgba(148,163,184,0.025)'
                    : 'rgba(148,163,184,0.035)',
              transition: 'background 0.15s ease',
              '&:hover': {
                background: isDark ? 'rgba(56,189,248,0.06)' : 'rgba(14,165,233,0.05)',
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: isDark ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatFightTime(fightTime)}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {playerName}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              {activation.abilityIcon && (
                <Tooltip title={activation.abilityName ?? ''} arrow placement="top">
                  <Avatar
                    src={`https://assets.eso-hub.com/abilities/${activation.abilityIcon}.webp`}
                    alt=""
                    variant="rounded"
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '5px',
                      border: isDark
                        ? '1px solid rgba(148,163,184,0.2)'
                        : '1px solid rgba(148,163,184,0.25)',
                      flexShrink: 0,
                    }}
                  />
                </Tooltip>
              )}
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activation.abilityName ?? `Ability ${activation.abilityGameID}`}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
