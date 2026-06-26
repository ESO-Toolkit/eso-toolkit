/**
 * Loading skeleton for the Scribing simulator ("Inscription Bench").
 *
 * Shown in two places so the swap is seamless: as the Suspense fallback while
 * the Scribing tab's lazy chunk streams in (CalculatorPage), and as the
 * in-component `isLoading` placeholder while the scribing data loads
 * (ScribingSimulator). It mirrors the real frame — the build-control row, the
 * two-column Bench + Altar grid (grimoire grid + the three script-slot pickers
 * on the left; the scribed-skill card on the right) — so the layout doesn't jump
 * when the real UI mounts. Surfaces (glass panel, slot accents, radii) are kept
 * in lock-step with `ScribingSimulator.tsx` / `scribingStyles.ts`.
 *
 * Replaces the previous CircularProgress spinner so the Scribing tab matches the
 * skeleton-based loaders the Stats and Ultimate tabs already use.
 */

import { Box, Container, Skeleton, Stack, alpha, useTheme } from '@mui/material';
import React from 'react';

import { SLOT_ORDER, SLOT_COLORS, glassPanelSx } from './scribingStyles';

interface ScribingSimulatorSkeletonProps {
  /** Test ID for testing / skeleton detection. */
  'data-testid'?: string;
  /** Forwarded to the outer Container so it matches the real component's frame. */
  className?: string;
}

export const ScribingSimulatorSkeleton: React.FC<ScribingSimulatorSkeletonProps> = ({
  'data-testid': dataTestId = 'scribing-simulator-skeleton',
  className,
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  /** Numbered step header: a 26×26 chip + a title and hint line. */
  const stepHeader = (titleWidth: number, hintWidth: number): React.JSX.Element => (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: '8px',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.4),
          bgcolor: alpha(theme.palette.primary.main, dark ? 0.14 : 0.08),
        }}
      />
      <Box>
        <Skeleton variant="text" width={titleWidth} height={22} />
        <Skeleton variant="text" width={hintWidth} height={12} />
      </Box>
    </Stack>
  );

  /** A grimoire tile: 36px icon well + name/skill-line (mirrors GrimoireGrid). */
  const grimoireTile = (key: number): React.JSX.Element => (
    <Box
      key={key}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: '14px',
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.55),
        background: dark ? alpha('#ffffff', 0.02) : alpha('#0f172a', 0.015),
      }}
    >
      <Skeleton
        variant="rounded"
        width={36}
        height={36}
        sx={{ borderRadius: '10px', flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Skeleton variant="text" width={`${62 + ((key * 11) % 28)}%`} height={16} />
        <Skeleton variant="text" width={`${42 + ((key * 7) % 22)}%`} height={12} />
      </Box>
    </Box>
  );

  /** A script-slot picker: slot-accent header (glyph + label/role + count chip),
      with a search + a few option rows reserved on md+ (where pickers stay
      expanded). On xs the real pickers collapse to just the header. */
  const scriptPicker = (slot: (typeof SLOT_ORDER)[number]): React.JSX.Element => {
    const accent = SLOT_COLORS[slot];
    return (
      <Box
        key={slot}
        sx={{
          borderRadius: '14px',
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.6),
          background: dark ? alpha('#ffffff', 0.025) : alpha('#0f172a', 0.015),
          overflow: 'hidden',
        }}
      >
        {/* Header band */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: `linear-gradient(90deg, ${alpha(accent, dark ? 0.12 : 0.08)} 0%, transparent 70%)`,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: '9px',
              border: '1px solid',
              borderColor: alpha(accent, 0.5),
              bgcolor: alpha(accent, dark ? 0.16 : 0.1),
            }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={170} height={12} />
          </Box>
          <Skeleton
            variant="rounded"
            width={28}
            height={20}
            sx={{ borderRadius: '10px', flexShrink: 0 }}
          />
        </Box>

        {/* Expanded body (md+ only): search field + a few option rows. */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            borderTop: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.5),
            px: 1.5,
            py: 1.25,
          }}
        >
          <Skeleton variant="rounded" height={36} sx={{ borderRadius: '10px', mb: 1.25 }} />
          <Stack spacing={1}>
            {[0, 1, 2, 3].map((r) => (
              <Stack key={r} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Skeleton variant="circular" width={18} height={18} sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width={`${55 + ((r * 9) % 30)}%`} height={14} />
                  <Skeleton variant="text" width={`${70 + ((r * 5) % 20)}%`} height={11} />
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
    );
  };

  /** One meta row inside the scribed-skill card (label + value). */
  const metaRow = (key: number, labelWidth: number, valueWidth: number): React.JSX.Element => (
    <Stack
      key={key}
      direction="row"
      sx={{ alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}
    >
      <Skeleton variant="text" width={labelWidth} height={13} />
      <Skeleton variant="text" width={valueWidth} height={14} />
    </Stack>
  );

  return (
    <Container maxWidth="lg" className={className} data-testid={dataTestId} aria-busy="true">
      <Box
        role="status"
        aria-live="polite"
        aria-label="Loading scribing simulator"
        sx={{ py: { xs: 2, md: 3 } }}
      >
        {/* ── Build controls — legend (md+) + action buttons ── */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'space-between' },
            gap: 2,
            mb: { xs: 2.5, md: 3 },
          }}
        >
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {SLOT_ORDER.map((slot) => (
              <Skeleton
                key={slot}
                variant="rounded"
                width={96}
                height={28}
                sx={{ borderRadius: '999px' }}
              />
            ))}
          </Stack>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' } }}
          >
            <Skeleton
              variant="rounded"
              height={40}
              sx={{ borderRadius: '999px', flexGrow: { xs: 1, md: 0 }, width: { md: 150 } }}
            />
            <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: '9px' }} />
            <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: '9px' }} />
          </Stack>
        </Box>

        {/* ── Bench + Altar ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.18fr) minmax(0, 1fr)' },
            gap: { xs: 2.5, md: 3 },
            alignItems: 'start',
          }}
        >
          {/* Bench */}
          <Box sx={{ ...glassPanelSx(theme), p: { xs: 2, md: 2.5 } }}>
            {stepHeader(170, 200)}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1,
              }}
            >
              {Array.from({ length: 12 }, (_, i) => grimoireTile(i))}
            </Box>

            <Box sx={{ mt: 3 }}>
              {stepHeader(150, 150)}
              <Stack spacing={1.5}>{SLOT_ORDER.map((slot) => scriptPicker(slot))}</Stack>
            </Box>
          </Box>

          {/* Altar */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}
            >
              <Skeleton variant="text" width={150} height={22} />
              <Stack direction="row" spacing={0.5}>
                {SLOT_ORDER.map((slot) => (
                  <Skeleton key={slot} variant="circular" width={14} height={14} />
                ))}
              </Stack>
            </Stack>

            {/* Scribed-skill card */}
            <Box sx={{ ...glassPanelSx(theme), overflow: 'hidden' }}>
              {/* Header band — 56px skill icon + name/subtitle */}
              <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Skeleton
                  variant="rounded"
                  width={56}
                  height={56}
                  sx={{ borderRadius: '14px', flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="45%" height={14} />
                </Box>
              </Box>

              {/* Meta + description + slot rows */}
              <Box sx={{ px: 2, pb: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.5),
                  }}
                >
                  {metaRow(0, 64, 70)}
                  {metaRow(1, 52, 120)}
                  {metaRow(2, 40, 60)}
                </Box>
                <Skeleton variant="text" width="100%" height={13} />
                <Skeleton variant="text" width="92%" height={13} sx={{ mb: 1.5 }} />

                <Stack spacing={1}>
                  {SLOT_ORDER.map((slot) => (
                    <Stack
                      key={slot}
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: 'center',
                        p: 1,
                        borderRadius: '10px',
                        borderLeft: '3px solid',
                        borderColor: alpha(SLOT_COLORS[slot], 0.7),
                        background: alpha(SLOT_COLORS[slot], dark ? 0.06 : 0.04),
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Skeleton variant="text" width={70} height={11} />
                        <Skeleton variant="text" width="80%" height={14} />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Box>

            {/* "Effects verified…" footer caption */}
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', justifyContent: 'center', mt: 1.5 }}
            >
              <Skeleton variant="circular" width={14} height={14} />
              <Skeleton variant="text" width="60%" height={12} />
            </Stack>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
