import { Box, Container, Paper, Skeleton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

/**
 * RosterBuilderSkeleton
 * Mirrors the actual Roster Builder page layout while the lazy chunk loads.
 * Matches: Container maxWidth="lg", Paper elevation={2}, pill toolbar groups,
 * segmented mode toggle, 3-column set assignment grid, and ESOtk banner.
 */
export const RosterBuilderSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));

  // ── Palette ──────────────────────────────────────────────────────────
  const sk = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const skLight = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderFaint = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const pillBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const toggleBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  // Role tint colors (tank/flex/healer)
  const roleTints = {
    tank: isDark ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.025)',
    flex: isDark ? 'rgba(168,85,247,0.04)' : 'rgba(168,85,247,0.025)',
    healer: isDark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.025)',
  };
  const roleBorders = {
    tank: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)',
    flex: isDark ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.12)',
    healer: isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)',
  };
  const roleBadgeBg = {
    tank: isDark ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.06)',
    flex: isDark ? 'rgba(168,85,247,0.10)' : 'rgba(168,85,247,0.06)',
    healer: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.06)',
  };

  // ── Reusable: pill button group ──────────────────────────────────────
  const PillGroup = ({
    widths,
    height = 36,
  }: {
    widths: number[];
    height?: number;
  }): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '10px',
        background: pillBg,
        border: `1px solid ${pillBorder}`,
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        flex: isMd ? 1 : '0 0 auto',
        minHeight: isMobile ? 44 : 'auto',
      }}
    >
      {widths.map((w, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <Box
              sx={{
                width: '1px',
                my: 0.625,
                background: borderFaint,
                flexShrink: 0,
              }}
            />
          )}
          <Skeleton
            variant="rectangular"
            width={isMobile ? undefined : w}
            height={height}
            sx={{
              bgcolor: 'transparent',
              flex: isMobile ? 1 : 'none',
            }}
          />
        </React.Fragment>
      ))}
    </Box>
  );

  // ── Reusable: role badge ─────────────────────────────────────────────
  const RoleBadge = ({
    width,
    role,
  }: {
    width: number;
    role: 'tank' | 'flex' | 'healer';
  }): React.ReactElement => (
    <Skeleton
      variant="rounded"
      width={width}
      height={22}
      sx={{
        borderRadius: '6px',
        bgcolor: roleBadgeBg[role],
        border: `1px solid ${roleBorders[role]}`,
      }}
    />
  );

  // ── Reusable: gear set chip ──────────────────────────────────────────
  const SetChip = ({ width = '70%' }: { width?: string }): React.ReactElement => (
    <Skeleton
      variant="rounded"
      width={width}
      height={28}
      sx={{ borderRadius: '8px', bgcolor: skLight, m: 0.5 }}
    />
  );

  // ── Reusable: role column in set assignment grid ─────────────────────
  const RoleColumn = ({
    role,
    badgeWidth,
    chipCount,
  }: {
    role: 'tank' | 'flex' | 'healer';
    badgeWidth: number;
    chipCount: number;
  }): React.ReactElement => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        bgcolor: roleTints[role],
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1.5,
          pb: 1,
          px: 1.5,
          pt: 1.5,
          borderBottom: `1px solid ${roleBorders[role]}`,
        }}
      >
        <RoleBadge width={badgeWidth} role={role} />
      </Box>
      {/* Set chips */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 0.5, pb: 1.5, flex: 1 }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <SetChip key={i} width={`${55 + ((i * 13) % 35)}%`} />
        ))}
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* WIP Disclaimer banner */}
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: '10px', bgcolor: sk, mb: 3 }} />

      {/* Roster Hub banner link */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: isMobile ? 1.5 : 2,
          py: 1,
          mb: 3,
          borderRadius: '10px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(110,170,240,0.06) 0%, rgba(11,18,32,0.3) 100%)'
            : 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(255,255,255,0.5) 100%)',
          border: `1px solid ${borderFaint}`,
        }}
      >
        <Skeleton
          variant="rounded"
          width={28}
          height={28}
          sx={{ borderRadius: '7px', bgcolor: skLight, flexShrink: 0 }}
        />
        <Skeleton variant="text" width={160} height={16} sx={{ bgcolor: skLight }} />
        <Box sx={{ flex: 1 }} />
        <Skeleton
          variant="circular"
          width={18}
          height={18}
          sx={{ bgcolor: skLight, flexShrink: 0 }}
        />
      </Box>

      {/* ═══ Main content Paper ═══ */}
      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {/* ── Row 1: Title lockup + Mode toggle ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 1.5 : 1,
            mb: 2.5,
          }}
        >
          {/* Title lockup: icon + label/title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Skeleton
              variant="rounded"
              width={32}
              height={32}
              sx={{ borderRadius: '9px', bgcolor: sk, flexShrink: 0 }}
            />
            <Box>
              <Skeleton
                variant="text"
                width={42}
                height={10}
                sx={{ bgcolor: skLight, mb: 0.375 }}
              />
              <Skeleton variant="text" width={130} height={20} sx={{ bgcolor: sk }} />
            </Box>
          </Box>

          {/* Mode toggle — segmented pill */}
          <Box
            sx={{
              display: 'flex',
              borderRadius: '10px',
              padding: '3px',
              minWidth: isMobile ? 'auto' : 220,
              background: toggleBg,
              border: `1px solid ${borderFaint}`,
            }}
          >
            {['Simple', 'Full'].map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={28}
                sx={{
                  flex: '1 1 auto',
                  borderRadius: '8px',
                  bgcolor:
                    i === 0
                      ? isDark
                        ? 'rgba(255,255,255,0.09)'
                        : 'rgba(255,255,255,0.85)'
                      : 'transparent',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* ── Row 2: Roster name input ── */}
        <Skeleton
          variant="rounded"
          height={40}
          sx={{
            borderRadius: '10px',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${borderFaint}`,
            mb: 2,
          }}
        />

        {/* ── Row 3: Action toolbar ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            mb: 2,
          }}
        >
          {/* Top row: pill groups */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMd ? 'column' : 'row',
              alignItems: isMd ? 'stretch' : 'center',
              gap: 1,
            }}
          >
            {/* Import / Export / Quick Fill */}
            <PillGroup widths={[80, 78, 90]} />

            {/* Spacer (desktop only) */}
            {!isMd && <Box sx={{ flexGrow: 1 }} />}

            {/* Discord compound */}
            <PillGroup widths={[85, 65]} />

            {/* Share / Publish / Save */}
            <PillGroup widths={[68, 75, 62]} />
          </Box>

          {/* ESOtk Addon banner */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: '10px',
              border: isDark ? '1px solid rgba(251,191,36,0.18)' : '1px solid rgba(161,98,7,0.18)',
              background: isDark
                ? 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(11,18,32,0.25) 100%)'
                : 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, rgba(255,255,255,0.4) 100%)',
            }}
          >
            <Skeleton
              variant="rounded"
              width={36}
              height={36}
              sx={{
                borderRadius: '9px',
                bgcolor: isDark ? 'rgba(251,191,36,0.10)' : 'rgba(161,98,7,0.06)',
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width={140} height={14} sx={{ bgcolor: skLight }} />
              <Skeleton
                variant="text"
                width="75%"
                height={11}
                sx={{ bgcolor: skLight, mt: 0.25 }}
              />
            </Box>
            <Skeleton
              variant="circular"
              width={16}
              height={16}
              sx={{ bgcolor: skLight, flexShrink: 0 }}
            />
          </Box>
        </Box>

        {/* ── Divider ── */}
        <Box sx={{ height: '1px', background: borderFaint, my: 3 }} />

        {/* ── Roster Setup section header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={32}
            height={32}
            sx={{ borderRadius: '9px', bgcolor: sk, flexShrink: 0 }}
          />
          <Box>
            <Skeleton variant="text" width={42} height={10} sx={{ bgcolor: skLight, mb: 0.375 }} />
            <Skeleton variant="text" width={145} height={20} sx={{ bgcolor: sk }} />
          </Box>
        </Box>

        {/* ── Roster Setup card ── */}
        <Box
          sx={{
            borderRadius: '12px',
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)',
            border: `1px solid ${borderFaint}`,
            p: 2,
            mb: 3,
          }}
        >
          {/* Role composition placeholder */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {[85, 72, 65].map((w, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={w}
                height={34}
                sx={{ borderRadius: '8px', bgcolor: skLight }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ═══ Set Assignment Manager (separate Paper) ═══ */}
      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        {/* Header: title + tabs */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 1.5 : 0,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Skeleton
              variant="rounded"
              width={32}
              height={32}
              sx={{ borderRadius: '9px', bgcolor: sk, flexShrink: 0 }}
            />
            <Box>
              <Skeleton
                variant="text"
                width={42}
                height={10}
                sx={{ bgcolor: skLight, mb: 0.375 }}
              />
              <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: sk }} />
            </Box>
          </Box>

          {/* Tab pills */}
          <Box
            sx={{
              display: 'flex',
              borderRadius: '10px',
              padding: '3px',
              minWidth: isMobile ? 'auto' : 200,
              background: toggleBg,
              border: `1px solid ${borderFaint}`,
            }}
          >
            {[0, 1].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={28}
                sx={{
                  flex: '1 1 auto',
                  borderRadius: '8px',
                  bgcolor:
                    i === 0
                      ? isDark
                        ? 'rgba(255,255,255,0.09)'
                        : 'rgba(255,255,255,0.85)'
                      : 'transparent',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* ── 5-Piece Sets — 3-column grid ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 1.5 : 2,
            mb: 2,
          }}
        >
          <RoleColumn role="tank" badgeWidth={48} chipCount={5} />
          <RoleColumn role="flex" badgeWidth={62} chipCount={3} />
          <RoleColumn role="healer" badgeWidth={55} chipCount={3} />
        </Box>

        {/* ── Monster & Mythic divider ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ flex: 1, height: '1px', background: borderFaint }} />
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: '20px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${borderFaint}`,
            }}
          >
            <Skeleton variant="text" width={100} height={14} sx={{ bgcolor: skLight }} />
            <Skeleton
              variant="rounded"
              width={18}
              height={16}
              sx={{ borderRadius: '6px', bgcolor: sk }}
            />
          </Box>
          <Box sx={{ flex: 1, height: '1px', background: borderFaint }} />
        </Box>

        {/* ── Monster/Mythic 3-column grid ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 1.5 : 2,
            mb: 2,
          }}
        >
          <RoleColumn role="tank" badgeWidth={48} chipCount={3} />
          <RoleColumn role="flex" badgeWidth={62} chipCount={2} />
          <RoleColumn role="healer" badgeWidth={55} chipCount={2} />
        </Box>

        {/* ── Ultimates section ── */}
        <Box sx={{ height: '1px', background: borderFaint, my: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Tank Ultimates */}
          <Box>
            <RoleBadge width={110} role="tank" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              {[0, 1].map((row) => (
                <Box
                  key={row}
                  sx={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 0.75,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    width={isMobile ? '100%' : 55}
                    height={26}
                    sx={{
                      borderRadius: '6px',
                      bgcolor: roleBadgeBg.tank,
                      border: `1px solid ${roleBorders.tank}`,
                      flexShrink: 0,
                    }}
                  />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                      gap: 0.75,
                      flex: 1,
                    }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rounded"
                        height={34}
                        sx={{ borderRadius: '8px', bgcolor: skLight }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Healer Ultimates */}
          <Box>
            <RoleBadge width={120} role="healer" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              {[0, 1].map((row) => (
                <Box
                  key={row}
                  sx={{
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 0.75,
                  }}
                >
                  <Skeleton
                    variant="rounded"
                    width={isMobile ? '100%' : 55}
                    height={26}
                    sx={{
                      borderRadius: '6px',
                      bgcolor: roleBadgeBg.healer,
                      border: `1px solid ${roleBorders.healer}`,
                      flexShrink: 0,
                    }}
                  />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                      gap: 0.75,
                      flex: 1,
                    }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rounded"
                        height={34}
                        sx={{ borderRadius: '8px', bgcolor: skLight }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Champion Points ── */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {[0, 1].map((i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: isMobile ? 'stretch' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 0.75,
                }}
              >
                <Skeleton
                  variant="rounded"
                  width={isMobile ? '100%' : 85}
                  height={26}
                  sx={{ borderRadius: '6px', bgcolor: skLight, flexShrink: 0 }}
                />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 0.75,
                    flex: 1,
                  }}
                >
                  {[0, 1].map((j) => (
                    <Skeleton
                      key={j}
                      variant="rounded"
                      height={34}
                      sx={{ borderRadius: '8px', bgcolor: skLight }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Quick Stats footer ── */}
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: `1px solid ${borderFaint}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.875,
              px: 1.5,
              py: 0.75,
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${borderFaint}`,
            }}
          >
            <Skeleton variant="text" width={85} height={14} sx={{ bgcolor: skLight }} />
            <Skeleton
              variant="rounded"
              width={22}
              height={20}
              sx={{ borderRadius: '6px', bgcolor: sk }}
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
