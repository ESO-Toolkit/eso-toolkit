/**
 * Loading skeleton for the Ultimate Calculator tab.
 *
 * The Ultimate tab lazy-loads a heavy chunk; while it streams in we show this
 * placeholder. It mirrors the real component's frame so the layout doesn't jump
 * when the calculator mounts: the intro row, the full-width headline hero
 * (one dominant number + three stat tiles), and the two-column body that splits
 * into a left input panel and a right results stack (ultimate picker, per-source
 * breakdown table, "verify against your log" panel) — the results stack sticking
 * to the top on wide screens exactly like the real one.
 *
 * Surfaces (panel gradients, accent, radii) are kept in lock-step with
 * `UltimateCalculator.tsx` (panelSx / hero / table) so the swap is seamless.
 */

import { Box, Paper, Skeleton, Stack, useTheme, alpha } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React from 'react';

interface UltimateCalculatorSkeletonProps {
  /** Test ID for testing/skeleton detection. */
  'data-testid'?: string;
}

/** Mirror of UltimateCalculator's `panelSx` so the skeleton panels match. */
const panelSx = (theme: Theme): SxProps<Theme> => ({
  p: { xs: 2, sm: 2.5 },
  borderRadius: 2.8, // 28px — panel tier
  border: `1px solid ${
    theme.palette.mode === 'dark' ? 'rgba(56,189,248,0.12)' : theme.palette.divider
  }`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(14,22,42,0.74) 0%, rgba(3,9,20,0.82) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 14px 36px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
});

export const UltimateCalculatorSkeleton: React.FC<UltimateCalculatorSkeletonProps> = ({
  'data-testid': dataTestId = 'ultimate-calculator-skeleton',
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const accent = dark ? 'rgb(56, 189, 248)' : 'rgb(40, 145, 200)';

  /** Accent eyebrow + title, matching SectionHeader (30×30 icon chip + title). */
  const sectionHeader = (titleWidth: number, action?: React.ReactNode): React.JSX.Element => (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{
            width: 30,
            height: 30,
            borderRadius: 2,
            background: `${accent}1f`,
            border: `1px solid ${accent}33`,
            flexShrink: 0,
          }}
        />
        <Skeleton variant="text" width={titleWidth} height={24} />
      </Stack>
      {action}
    </Stack>
  );

  /** A hero stat tile (matches StatBlock surface: 14px card on the panel). */
  const statTile = (key: number): React.JSX.Element => (
    <Box
      key={key}
      sx={{
        minWidth: 0,
        px: { xs: 1.25, sm: 1.75 },
        py: { xs: 1.25, sm: 1.5 },
        borderRadius: 1.4, // 14px — card tier
        height: '100%',
        background: dark
          ? 'linear-gradient(180deg, rgba(56,189,248,0.09) 0%, rgba(56,189,248,0.02) 100%)'
          : 'rgba(255,255,255,0.6)',
        border: `1px solid ${dark ? 'rgba(56,189,248,0.16)' : theme.palette.divider}`,
        boxShadow: dark
          ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 16px rgba(0,0,0,0.34)'
          : '0 2px 8px rgba(15,23,42,0.05)',
      }}
    >
      <Skeleton variant="text" width="70%" height={10} sx={{ mb: 0.75 }} />
      <Skeleton variant="text" width={64} height={26} />
      <Skeleton variant="text" width="55%" height={11} sx={{ mt: 0.25 }} />
    </Box>
  );

  /** One per-source breakdown table row (label + mini-bar + three numbers). */
  const tableRow = (key: number, opts?: { total?: boolean }): React.JSX.Element => {
    const total = opts?.total ?? false;
    return (
      <Box
        key={key}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 56px', sm: '1fr 56px 64px 64px' },
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1,
          minHeight: 48,
          ...(total
            ? {
                borderTop: `2px solid ${alpha(accent, 0.4)}`,
                background: alpha(accent, dark ? 0.16 : 0.1),
              }
            : {
                backgroundColor: alpha(accent, key % 2 === 0 ? 0.07 : 0.025),
              }),
        }}
      >
        {/* Source cell: label + share bar + % */}
        <Box sx={{ minWidth: 0 }}>
          <Skeleton variant="text" width={total ? 56 : `${60 + ((key * 7) % 30)}%`} height={16} />
          {!total && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={5}
                sx={{ borderRadius: 3, flex: 1 }}
              />
              <Skeleton variant="text" width={28} height={12} />
            </Stack>
          )}
        </Box>
        <Skeleton
          variant="text"
          width={36}
          height={16}
          sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
        />
        <Skeleton
          variant="text"
          width={36}
          height={16}
          sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
        />
        <Skeleton variant="text" width={40} height={16} sx={{ ml: 'auto' }} />
      </Box>
    );
  };

  return (
    <Box data-testid={dataTestId} sx={{ width: '100%' }}>
      {/* ===================== INTRO ===================== */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 2.5,
            background: dark
              ? 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(0,225,255,0.08))'
              : 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(0,225,255,0.06))',
            border: `1px solid ${accent}40`,
            boxShadow: dark ? '0 0 22px rgba(56,189,248,0.18)' : 'none',
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Skeleton variant="text" width={210} height={30} />
          <Skeleton variant="text" width={150} height={12} />
        </Box>
      </Stack>
      <Box sx={{ mb: 2.5, maxWidth: 640 }}>
        <Skeleton variant="text" width="88%" height={16} />
        <Skeleton variant="text" width="52%" height={16} />
      </Box>

      {/* ===================== HEADLINE HERO (full width) ===================== */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.75 },
          mb: 2.5,
          borderRadius: 2.8,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${dark ? 'rgba(56,189,248,0.18)' : theme.palette.divider}`,
          background: dark
            ? 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(13,22,42,0.6) 50%, rgba(3,8,18,0.72) 100%)'
            : 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(248,250,252,0.85) 60%, rgba(255,255,255,0.95) 100%)',
          boxShadow: dark
            ? '0 18px 50px rgba(0,0,0,0.46), 0 0 80px rgba(56,189,248,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 6px 20px rgba(15,23,42,0.07)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 3 },
            alignItems: { md: 'stretch' },
          }}
        >
          {/* PRIMARY — dominant number + gauge */}
          <Box
            sx={{
              flex: { md: '0 0 40%' },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              px: { xs: 0.5, sm: 1 },
            }}
          >
            <Skeleton variant="text" width={130} height={12} />
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'baseline', mt: 0.5 }}>
              <Skeleton variant="text" width={150} height={56} />
              <Skeleton variant="text" width={42} height={18} />
            </Stack>
            <Box sx={{ mt: 1.25 }}>
              <Skeleton variant="rectangular" width="100%" height={7} sx={{ borderRadius: 4 }} />
              <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.6 }}>
                <Skeleton variant="text" width={140} height={12} />
                <Skeleton variant="text" width={80} height={12} />
              </Stack>
            </Box>
          </Box>

          {/* SECONDARY — three stat tiles, 3-up at every breakpoint */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'grid',
              gap: { xs: 1, sm: 1.25 },
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {[0, 1, 2].map((i) => statTile(i))}
          </Box>
        </Box>
      </Paper>

      {/* ===================== TWO-COLUMN BODY ===================== */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
        {/* ----------------------- LEFT: inputs ----------------------- */}
        <Paper elevation={0} sx={{ ...panelSx(theme), flex: '1 1 420px', minWidth: 0 }}>
          {sectionHeader(140)}

          {/* Context toggle (Solo / Group / PvP) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0.5,
              mb: 2,
            }}
          >
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: '10px' }} />
            ))}
          </Box>

          {/* Class + Role selects */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={40} sx={{ flex: 1, borderRadius: '10px' }} />
            <Skeleton variant="rectangular" height={40} sx={{ flex: 1, borderRadius: '10px' }} />
          </Stack>

          {/* Fight duration */}
          <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: '10px' }} />

          {/* Decisive trait toggle */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
            <Skeleton variant="rectangular" width={34} height={20} sx={{ borderRadius: 10 }} />
            <Skeleton variant="text" width={170} height={16} />
          </Stack>

          {/* Divider + "ULTIMATE SOURCES" eyebrow */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Skeleton variant="text" width={120} height={12} />
            <Box sx={{ flex: 1, height: '1px', backgroundColor: theme.palette.divider }} />
          </Stack>

          {/* Source category groups (first expanded showing a source card + slider) */}
          {[0, 1, 2, 3, 4].map((g) => (
            <Box key={g} sx={{ mb: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', py: 0.75 }}>
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: accent,
                    flexShrink: 0,
                  }}
                />
                <Skeleton variant="text" width={120 + ((g * 11) % 40)} height={14} />
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="circular" width={16} height={16} />
              </Stack>
              {g === 0 && (
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {[0, 1].map((s) => (
                    <Box
                      key={s}
                      sx={{
                        borderRadius: 1.4,
                        px: 1.5,
                        py: 1.25,
                        border: `1px solid ${s === 0 ? 'rgba(56,189,248,0.5)' : theme.palette.divider}`,
                        background:
                          s === 0
                            ? dark
                              ? 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.04) 100%)'
                              : 'linear-gradient(135deg, rgba(40,145,200,0.08) 0%, rgba(40,145,200,0.02) 100%)'
                            : dark
                              ? 'rgba(2,6,16,0.35)'
                              : 'rgba(15,23,42,0.015)',
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', minWidth: 0 }}
                        >
                          <Skeleton
                            variant="rectangular"
                            width={34}
                            height={20}
                            sx={{ borderRadius: 10 }}
                          />
                          <Skeleton variant="text" width={150} height={15} />
                        </Stack>
                        <Skeleton variant="text" width={36} height={12} />
                      </Stack>
                      {s === 0 && (
                        <Box sx={{ px: '12px', mt: 1 }}>
                          <Skeleton
                            variant="rectangular"
                            width="100%"
                            height={6}
                            sx={{ borderRadius: 3 }}
                          />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          ))}

          {/* Reset button */}
          <Skeleton variant="text" width={130} height={16} sx={{ mt: 1.5 }} />
        </Paper>

        {/* ----------------------- RIGHT: results (sticky on lg) ----------------------- */}
        <Stack
          spacing={2.5}
          sx={{
            flex: '1 1 480px',
            minWidth: 0,
            alignSelf: { lg: 'flex-start' },
            position: { lg: 'sticky' },
            top: { lg: 16 },
          }}
        >
          {/* Card 1 — Which ultimate? */}
          <Paper elevation={0} sx={panelSx(theme)}>
            {sectionHeader(150)}

            {/* Cost readout */}
            <Box
              sx={{
                mb: 2,
                px: 2,
                py: 1.5,
                borderRadius: 1.4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                border: `1px solid ${dark ? 'rgba(56,189,248,0.28)' : 'rgba(40,145,200,0.3)'}`,
                background: dark
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.02))'
                  : 'linear-gradient(135deg, rgba(40,145,200,0.06), rgba(40,145,200,0.01))',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Skeleton variant="text" width={80} height={12} />
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
                  <Skeleton variant="text" width={56} height={40} />
                  <Skeleton variant="text" width={26} height={16} />
                </Stack>
              </Box>
              <Skeleton variant="rectangular" width={48} height={22} sx={{ borderRadius: 999 }} />
            </Box>

            {/* Ultimate select + Starting ultimate */}
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: '10px' }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: '10px' }} />
            </Stack>
          </Paper>

          {/* Card 2 — Per-source breakdown table */}
          <Paper elevation={0} sx={panelSx(theme)}>
            {sectionHeader(
              170,
              <Skeleton
                variant="rectangular"
                width={120}
                height={30}
                sx={{ borderRadius: '8px' }}
              />,
            )}

            <Box
              sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${alpha(accent, 0.28)}`,
              }}
            >
              {/* Branded blue header bar */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 56px', sm: '1fr 56px 64px 64px' },
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  background: `linear-gradient(180deg, ${alpha(accent, 0.22)}, ${alpha(accent, 0.1)})`,
                  borderBottom: `1px solid ${alpha(accent, 0.35)}`,
                }}
              >
                <Skeleton variant="text" width={60} height={14} />
                <Skeleton
                  variant="text"
                  width={32}
                  height={14}
                  sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
                />
                <Skeleton
                  variant="text"
                  width={44}
                  height={14}
                  sx={{ ml: 'auto', display: { xs: 'none', sm: 'block' } }}
                />
                <Skeleton variant="text" width={36} height={14} sx={{ ml: 'auto' }} />
              </Box>

              {/* Body rows + total */}
              {[0, 1, 2, 3, 4, 5].map((r) => tableRow(r))}
              {tableRow(99, { total: true })}
            </Box>
          </Paper>

          {/* Card 3 — Verify against your own log (collapsed accordion) */}
          <Paper elevation={0} sx={{ ...panelSx(theme), p: 0, overflow: 'hidden' }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2, py: 1.75 }}>
              <Box
                aria-hidden
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 2,
                  background: `${accent}1f`,
                  border: `1px solid ${accent}33`,
                  flexShrink: 0,
                }}
              />
              <Skeleton variant="text" width={200} height={22} />
              <Skeleton variant="rectangular" width={34} height={18} sx={{ borderRadius: 1 }} />
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="circular" width={22} height={22} />
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};
