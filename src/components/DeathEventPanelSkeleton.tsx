import { Box, Card, CardContent, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

/**
 * DeathEventPanelSkeleton
 * Precisely mirrors the DeathEventPanelView layout while data loads.
 *
 * Sections matched:
 *   1. Header — "Deaths" title + total‑deaths chip + "across N players" text
 *   2. Summary row — By Player chips + Deadliest Abilities chips (side‑by‑side)
 *   3. Death cards grid — glass cards with avatar, resource bars, killing blow, recent attacks
 */
export const DeathEventPanelSkeleton: React.FC<{
  'data-testid'?: string;
  /** Number of placeholder cards to render (default 4) */
  cardCount?: number;
}> = ({ 'data-testid': dataTestId = 'deaths-skeleton', cardCount = 4 }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  // ── Palette — matches the real component's color tokens ─────────────
  const sk = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const skLight = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const chipBg = dark ? 'rgba(148,163,184,0.06)' : 'rgba(241,245,249,0.6)';
  const chipBorder = dark
    ? '1px solid rgba(148,163,184,0.12)'
    : '1px solid rgba(148,163,184,0.15)';
  const badgeBg = dark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)';
  const badgeBorder = dark
    ? '1px solid rgba(148,163,184,0.12)'
    : '1px solid rgba(148,163,184,0.10)';
  const barTrack = dark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.10)';
  const barFill = dark ? 'rgba(148,163,184,0.20)' : 'rgba(100,116,139,0.18)';
  const muted = dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.12)';

  // Glass card — identical to the real glassCard() helper in DeathEventPanelView
  const glassCardSx = {
    borderRadius: '16px',
    background: dark
      ? 'linear-gradient(165deg, rgba(15,23,42,0.88) 0%, rgba(10,15,30,0.72) 100%)'
      : 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)',
    border: 'none',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: dark
      ? '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 40px rgba(0,0,0,0.5)'
      : '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 8px 40px rgba(0,0,0,0.06)',
  } as const;

  // Accent line placeholder
  const accentColor = dark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.12)';

  // ── Player summary chip — dot + name bar + count ────────────────────
  const PlayerChip = ({ width, dotColor }: { width: number; dotColor: string }): React.ReactElement => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        height: 26,
        px: 1,
        borderRadius: '13px',
        background: chipBg,
        border: chipBorder,
      }}
    >
      {/* Role color dot */}
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: dotColor,
          flexShrink: 0,
        }}
      />
      {/* Player name */}
      <Skeleton variant="text" width={width - 40} height={12} sx={{ bgcolor: muted }} />
      {/* Death count */}
      <Skeleton variant="text" width={12} height={12} sx={{ bgcolor: muted, flexShrink: 0 }} />
    </Box>
  );

  // ── Ability summary chip — name bar + count badge ───────────────────
  const AbilityChip = ({ width }: { width: number }): React.ReactElement => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        height: 26,
        px: 1,
        borderRadius: '13px',
        background: chipBg,
        border: chipBorder,
      }}
    >
      {/* Ability name */}
      <Skeleton variant="text" width={width - 36} height={12} sx={{ bgcolor: muted }} />
      {/* Count badge */}
      <Box
        sx={{
          minWidth: 16,
          height: 16,
          borderRadius: '4px',
          bgcolor: dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.10)',
          flexShrink: 0,
        }}
      />
    </Box>
  );

  // ── Resource bar — static Box matching real resourceBar() helper ─────
  const ResourceBarSkeleton = ({
    labelWidth,
    fillPct,
  }: {
    labelWidth: number;
    fillPct: number;
  }): React.ReactElement => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={labelWidth} height={12} sx={{ bgcolor: skLight }} />
        <Skeleton variant="text" width={28} height={12} sx={{ bgcolor: skLight }} />
      </Box>
      {/* Static bar track + fill — no pulse animation, matches the real thin bar */}
      <Box
        sx={{
          position: 'relative',
          height: '3px',
          borderRadius: '2px',
          bgcolor: barTrack,
          overflow: 'hidden',
          mt: 0.5,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${fillPct}%`,
            borderRadius: '2px',
            bgcolor: barFill,
          },
        }}
      />
    </Box>
  );

  // ── Attack row — with subtle ::before fill bar hint ──────────────────
  const AttackRowSkeleton = ({ index }: { index: number }): React.ReactElement => {
    const fillPct = [65, 42, 28][index % 3];
    return (
      <Box
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
          // Damage bar fill — matches the real ::before pattern
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillPct}%`,
            background: dark ? 'rgba(148,163,184,0.04)' : 'rgba(148,163,184,0.03)',
            borderRadius: '8px',
          },
        }}
      >
        <Skeleton
          variant="text"
          width={`${55 + (index % 3) * 12}%`}
          height={12}
          sx={{ bgcolor: skLight, position: 'relative' }}
        />
        <Skeleton
          variant="text"
          width={42}
          height={12}
          sx={{ bgcolor: sk, flexShrink: 0, position: 'relative' }}
        />
      </Box>
    );
  };

  // Muted dot colors for player chip placeholders
  const dotColors = [
    dark ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.35)',
    dark ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.35)',
    dark ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.35)',
    dark ? 'rgba(251,191,36,0.5)' : 'rgba(251,191,36,0.35)',
  ];

  // ── Death card skeleton ─────────────────────────────────────────────
  const DeathCardSkeleton = ({ index }: { index: number }): React.ReactElement => (
    <Card sx={{ ...glassCardSx, position: 'relative', overflow: 'hidden' }}>
      {/* Top accent line — matches the real ::before */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${accentColor} 0%, transparent 60%)`,
        }}
      />

      <CardContent sx={{ p: 2.5, pt: 3 }}>
        {/* ── Player Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
          {/* Numbered avatar — with subtle border matching real Avatar */}
          <Box sx={{ position: 'relative' }}>
            <Skeleton
              variant="circular"
              width={36}
              height={36}
              sx={{
                bgcolor: sk,
                flexShrink: 0,
                border: `1.5px solid ${muted}`,
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Player name + duration badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Skeleton
                variant="text"
                width={`${50 + (index % 3) * 10}%`}
                height={18}
                sx={{ bgcolor: sk }}
              />
              {/* Death duration badge — with border matching real */}
              <Box
                sx={{
                  width: 32,
                  height: 18,
                  borderRadius: '5px',
                  bgcolor: badgeBg,
                  border: badgeBorder,
                  flexShrink: 0,
                }}
              />
            </Box>
            {/* Replay timestamp link */}
            <Skeleton variant="text" width={65} height={12} sx={{ bgcolor: skLight }} />
          </Box>
        </Box>

        {/* ── Resource Bars ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          <ResourceBarSkeleton labelWidth={120} fillPct={35} />
          <ResourceBarSkeleton labelWidth={100} fillPct={68} />
        </Box>

        {/* ── Killing Blow Panel ── */}
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: '12px',
            background: dark ? 'rgba(239,68,68,0.04)' : 'rgba(220,38,38,0.02)',
            border: dark
              ? '1px solid rgba(239,68,68,0.10)'
              : '1px solid rgba(220,38,38,0.06)',
          }}
        >
          {/* "KILLING BLOW" label + ability name — single baseline row like real */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            <Skeleton
              variant="text"
              width={72}
              height={10}
              sx={{ bgcolor: skLight, mr: 0.5 }}
            />
            <Skeleton
              variant="text"
              width={`${45 + (index % 4) * 12}%`}
              height={16}
              sx={{ bgcolor: sk }}
            />
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
            {/* "from SourceName" */}
            <Skeleton variant="text" width={90} height={12} sx={{ bgcolor: skLight }} />
            {/* Damage chip — matches real px:1, py:0.3, borderRadius:'7px' */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                px: 1,
                py: 0.3,
                borderRadius: '7px',
                background: dark ? 'rgba(239,68,68,0.08)' : 'rgba(220,38,38,0.05)',
                border: dark
                  ? '1px solid rgba(239,68,68,0.15)'
                  : '1px solid rgba(220,38,38,0.10)',
              }}
            >
              <Skeleton
                variant="text"
                width={48}
                height={14}
                sx={{ bgcolor: dark ? 'rgba(239,68,68,0.20)' : 'rgba(220,38,38,0.12)' }}
              />
              <Skeleton
                variant="text"
                width={20}
                height={10}
                sx={{ bgcolor: dark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)' }}
              />
            </Box>
          </Box>
        </Box>

        {/* ── Recent Attacks ── */}
        <Box>
          {/* "RECENT ATTACKS" label — display:block like real */}
          <Skeleton
            variant="text"
            width={88}
            height={10}
            sx={{ bgcolor: skLight, mb: 1, display: 'block' }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <AttackRowSkeleton index={0} />
            <AttackRowSkeleton index={1} />
            <AttackRowSkeleton index={2} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // ── Grid layout — matches DeathEventPanelView gridSx exactly ────────
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

  return (
    <Box mt={2} data-testid={dataTestId}>
      {/* ═══ Header ═══ */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        {/* "Deaths" title — with mr:0.5 matching real Typography */}
        <Skeleton variant="text" width={72} height={28} sx={{ bgcolor: sk, mr: 0.5 }} />
        {/* Total deaths chip — matches real Chip height:24, minWidth:24 */}
        <Skeleton
          variant="rounded"
          width={28}
          height={24}
          sx={{
            borderRadius: '12px',
            bgcolor: dark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)',
            border: dark
              ? '1px solid rgba(239,68,68,0.18)'
              : '1px solid rgba(220,38,38,0.12)',
          }}
        />
        {/* "across N players" */}
        <Skeleton variant="text" width={100} height={14} sx={{ bgcolor: skLight }} />
      </Box>

      {/* ═══ Summary Row — By Player + Deadliest Abilities ═══ */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3.5 }}>
        {/* By Player */}
        <Box sx={{ flex: '1 1 280px' }}>
          {/* "BY PLAYER" section label — display:block, uppercase style */}
          <Skeleton
            variant="text"
            width={56}
            height={10}
            sx={{ bgcolor: skLight, mb: 1, display: 'block' }}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <PlayerChip width={95} dotColor={dotColors[0]} />
            <PlayerChip width={108} dotColor={dotColors[1]} />
            <PlayerChip width={85} dotColor={dotColors[2]} />
            <PlayerChip width={100} dotColor={dotColors[3]} />
          </Box>
        </Box>

        {/* Deadliest Abilities */}
        <Box sx={{ flex: '1 1 280px' }}>
          {/* "DEADLIEST ABILITIES" section label */}
          <Skeleton
            variant="text"
            width={105}
            height={10}
            sx={{ bgcolor: skLight, mb: 1, display: 'block' }}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <AbilityChip width={110} />
            <AbilityChip width={90} />
            <AbilityChip width={120} />
          </Box>
        </Box>
      </Box>

      {/* ═══ Death Cards Grid ═══ */}
      <Box sx={gridSx}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <DeathCardSkeleton key={i} index={i} />
        ))}
      </Box>
    </Box>
  );
};
