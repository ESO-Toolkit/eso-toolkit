import { Box, Card, CardContent, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

/**
 * DeathEventPanelSkeleton
 * Precisely mirrors the DeathEventPanelView layout while data loads.
 *
 * Sections matched:
 *   1. Header — "Deaths" title + total‐deaths chip + "across N players" text
 *   2. Summary row — By Player chips + Deadliest Abilities chips (side‐by‐side)
 *   3. Death cards grid — glass cards with avatar, resource bars, killing blow, recent attacks
 */
export const DeathEventPanelSkeleton: React.FC<{
  'data-testid'?: string;
  /** Number of placeholder cards to render (default 4) */
  cardCount?: number;
}> = ({ 'data-testid': dataTestId = 'deaths-skeleton', cardCount = 4 }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  // ── Palette — matches RosterBuilderSkeleton convention ──────────────
  const sk = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const skLight = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

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

  // Accent line color placeholder
  const accentColor = dark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.12)';

  // Section label — matches the uppercase "BY PLAYER" / "DEADLIEST ABILITIES" labels
  const SectionLabel = ({ width }: { width: number }): React.ReactElement => (
    <Skeleton
      variant="text"
      width={width}
      height={10}
      sx={{ bgcolor: skLight, mb: 1 }}
    />
  );

  // Summary chip placeholder — matches the 26px-tall Chip elements
  const SummaryChip = ({ width }: { width: number }): React.ReactElement => (
    <Skeleton
      variant="rounded"
      width={width}
      height={26}
      sx={{
        borderRadius: '13px',
        bgcolor: skLight,
        border: `1px solid ${dark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.15)'}`,
      }}
    />
  );

  // Resource bar skeleton — matches the stat label + thin bar layout
  const ResourceBarSkeleton = ({
    labelWidth,
  }: {
    labelWidth: number;
  }): React.ReactElement => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={labelWidth} height={12} sx={{ bgcolor: skLight }} />
        <Skeleton variant="text" width={28} height={12} sx={{ bgcolor: skLight }} />
      </Box>
      <Skeleton
        variant="rounded"
        width="100%"
        height={3}
        sx={{ borderRadius: '2px', bgcolor: sk, mt: 0.5 }}
      />
    </Box>
  );

  // Attack row skeleton — matches the recent attacks rows
  const AttackRowSkeleton = ({ index }: { index: number }): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 0.75,
        px: 1,
        py: 0.5,
        borderRadius: '8px',
        minHeight: '26px',
        background: dark ? 'rgba(148,163,184,0.02)' : 'rgba(148,163,184,0.02)',
      }}
    >
      <Skeleton
        variant="text"
        width={`${55 + (index % 3) * 12}%`}
        height={12}
        sx={{ bgcolor: skLight }}
      />
      <Skeleton variant="text" width={42} height={12} sx={{ bgcolor: sk, flexShrink: 0 }} />
    </Box>
  );

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
          {/* Numbered avatar */}
          <Skeleton
            variant="circular"
            width={36}
            height={36}
            sx={{ bgcolor: sk, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Player name + duration badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Skeleton
                variant="text"
                width={`${50 + (index % 3) * 10}%`}
                height={18}
                sx={{ bgcolor: sk }}
              />
              {/* Death duration badge */}
              <Skeleton
                variant="rounded"
                width={32}
                height={16}
                sx={{ borderRadius: '5px', bgcolor: skLight, flexShrink: 0 }}
              />
            </Box>
            {/* Replay timestamp link */}
            <Skeleton variant="text" width={65} height={12} sx={{ bgcolor: skLight }} />
          </Box>
        </Box>

        {/* ── Resource Bars ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          <ResourceBarSkeleton labelWidth={120} />
          <ResourceBarSkeleton labelWidth={100} />
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
          {/* "KILLING BLOW" label */}
          <Skeleton variant="text" width={72} height={10} sx={{ bgcolor: skLight, mb: 0.5 }} />
          {/* Ability name */}
          <Skeleton
            variant="text"
            width={`${45 + (index % 4) * 12}%`}
            height={18}
            sx={{ bgcolor: sk }}
          />
          {/* Source + damage row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            {/* "from SourceName" */}
            <Skeleton variant="text" width={90} height={12} sx={{ bgcolor: skLight }} />
            {/* Damage chip */}
            <Skeleton
              variant="rounded"
              width={72}
              height={24}
              sx={{
                borderRadius: '7px',
                bgcolor: dark ? 'rgba(239,68,68,0.08)' : 'rgba(220,38,38,0.05)',
                border: dark
                  ? '1px solid rgba(239,68,68,0.15)'
                  : '1px solid rgba(220,38,38,0.10)',
              }}
            />
          </Box>
        </Box>

        {/* ── Recent Attacks ── */}
        <Box>
          {/* "RECENT ATTACKS" label */}
          <Skeleton variant="text" width={88} height={10} sx={{ bgcolor: skLight, mb: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <AttackRowSkeleton index={0} />
            <AttackRowSkeleton index={1} />
            <AttackRowSkeleton index={2} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // ── Grid layout — matches DeathEventPanelView gridSx ────────────────
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
        {/* "Deaths" title */}
        <Skeleton variant="text" width={72} height={28} sx={{ bgcolor: sk }} />
        {/* Total deaths chip */}
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
          <SectionLabel width={56} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <SummaryChip width={95} />
            <SummaryChip width={108} />
            <SummaryChip width={85} />
            <SummaryChip width={100} />
          </Box>
        </Box>

        {/* Deadliest Abilities */}
        <Box sx={{ flex: '1 1 280px' }}>
          <SectionLabel width={105} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <SummaryChip width={110} />
            <SummaryChip width={90} />
            <SummaryChip width={120} />
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
