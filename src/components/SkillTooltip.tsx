import { Box, Card, CardContent, Chip, Divider, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import iconOverrides from '../data/abilityIconOverrides.json';

export interface SkillStat {
  label: string;
  value: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'inherit';
}

export interface SkillTooltipProps {
  // "Active" | "Passive" etc.
  headerBadge?: string;
  // Small text in the top-right, e.g. class/skill line
  lineText?: string;
  // 48x48–64x64 icon for the skill
  iconUrl?: string;
  // RPG Logs ability icon slug, e.g. "ability_arcanist_005_a"; when provided, iconUrl is derived automatically
  iconSlug?: string;
  // ESO Logs ability id for reference (icon resolution must be handled by caller)
  abilityId?: number;
  // Main skill name
  name: string;
  // Optional morph lineage text
  morphOf?: string;
  // Small set of key stats (e.g. Cost, Target, Duration)
  stats?: SkillStat[];
  // Rich description body; accept ReactNode so callers can colorize parts
  description: React.ReactNode;
}

type PaletteKey = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

function inferPaletteFromStat(label: string, value: string): PaletteKey {
  const v = value.toLowerCase();
  if (v.includes('magicka')) return 'info';
  if (v.includes('stamina')) return 'success';
  if (v.includes('ultimate')) return 'warning';
  if (label.toLowerCase().includes('duration')) return 'secondary';
  return 'primary';
}

/**
 * Minimal, reusable tooltip card for ESO skills. Designed to sit inside popovers/menus
 * but also works standalone in a column layout. Uses the app's dark theme and subtle
 * gradients/borders from the global MUI theme overrides.
 */
export const SkillTooltip: React.FC<SkillTooltipProps> = ({
  headerBadge = 'Active',
  lineText,
  iconUrl,
  iconSlug,
  abilityId,
  name,
  morphOf,
  stats,
  description,
}) => {
  const theme = useTheme();
  // Fallback by name via small override map (case-sensitive key, keep simple)
  const slugFromName = (name && (iconOverrides as Record<string, string>)[name]) || undefined;
  const resolvedIconUrl =
    iconUrl ??
    (iconSlug ? `https://assets.rpglogs.com/img/eso/abilities/${iconSlug}.png` : undefined) ??
    (slugFromName ? `https://assets.rpglogs.com/img/eso/abilities/${slugFromName}.png` : undefined);
  // Stats row layout control: prefer full text by default. If <=3 stats and they overflow, abbreviate.
  // If >3 stats, allow wrapping to second line first; abbreviate only if still overflowing.
  const statsCount = stats?.length ?? 0;
  const statsRowRef = React.useRef<HTMLDivElement | null>(null);
  const [wrapStats, setWrapStats] = React.useState<boolean>(false);
  const [abbrevStats, setAbbrevStats] = React.useState<boolean>(false);
  const laidOutRef = React.useRef<boolean>(false);
  const [statsReady, setStatsReady] = React.useState<boolean>(false);

  const runLayout = React.useCallback(() => {
    if (laidOutRef.current) return;
    const el = statsRowRef.current;
    if (!el) return;
    const isOverflowing = (node: HTMLElement): boolean => node.scrollWidth - node.clientWidth > 1;
    // Pass 1: baseline (no wrap, no abbrev)
    setWrapStats(false);
    setAbbrevStats(false);
    requestAnimationFrame(() => {
      const el1 = statsRowRef.current;
      if (!el1) return;
      if (!isOverflowing(el1)) {
        laidOutRef.current = true;
        setStatsReady(true);
        return;
      } // fits, we're done
      if (statsCount > 3) {
        // Pass 2a: allow wrap
        setWrapStats(true);
        requestAnimationFrame(() => {
          const el2 = statsRowRef.current;
          if (!el2) return;
          if (!isOverflowing(el2)) {
            laidOutRef.current = true;
            setStatsReady(true);
            return;
          } // fits when wrapped
          // Pass 2b: still overflowing -> abbreviate
          setAbbrevStats(true);
          laidOutRef.current = true;
          setStatsReady(true);
        });
      } else {
        // <=3 stats: abbreviate to keep on one line
        setAbbrevStats(true);
        laidOutRef.current = true;
        setStatsReady(true);
      }
    });
  }, [statsCount]);

  React.useLayoutEffect(() => {
    // One-time layout before first paint to minimize popper jitter
    requestAnimationFrame(runLayout);
  }, [runLayout]);
  return (
    <Card
      variant="outlined"
      className="u-fade-in"
      sx={{
        maxWidth: { xs: 260, sm: 320, md: 360 },
      }}
    >
      <CardContent sx={{ p: 1.25 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          {headerBadge ? (
            <Chip
              size="small"
              label={headerBadge}
              variant="outlined"
              color={
                /passive/i.test(headerBadge)
                  ? 'info'
                  : /active/i.test(headerBadge)
                    ? 'success'
                    : 'default'
              }
              sx={{
                fontWeight: 600,
                letterSpacing: '.02em',
                '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem', lineHeight: 1.2 },
              }}
            />
          ) : (
            <span />
          )}
          {lineText && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '.02em',
                fontSize: '0.72rem',
              }}
            >
              {lineText}
            </Typography>
          )}
        </Box>

        <Box
          sx={(theme) => ({
            p: 0.75,
            pt: 0.5,
            borderRadius: '10px',
            backgroundColor: alpha(theme.palette.common.white, 0.02),
            border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
            mb: 1,
          })}
        >
          <Stack direction="row" spacing={1.75} alignItems="flex-start">
            {resolvedIconUrl && (
              <Box
                sx={(theme) => ({
                  width: { xs: 40, sm: 44 },
                  height: { xs: 40, sm: 44 },
                  borderRadius: '7px',
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.common.white, 0.04),
                  overflow: 'hidden',
                  display: 'inline-block',
                  flex: '0 0 auto',
                })}
              >
                <Box
                  component="img"
                  src={resolvedIconUrl}
                  alt={name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'cover',
                    borderRadius: 'inherit !important',
                  }}
                />
              </Box>
            )}
            <Box sx={{ minWidth: 0, pt: 0.25, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-.01em',
                  ...(theme.palette.mode === 'dark'
                    ? {
                        background:
                          'linear-gradient(135deg, #ffffff 0%, rgb(149 223 255 / 89%) 50%, rgb(200 243 255) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }
                    : {
                        background:
                          'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #334155 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 1px 3px rgba(15, 23, 42, 0.3)',
                      }),
                  lineHeight: 1.1,
                  fontSize: { xs: '0.86rem', sm: '0.92rem' },
                  mb: 0,
                }}
              >
                {name}
              </Typography>
              {morphOf && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    display: 'block',
                    mt: 0,
                    lineHeight: 1.3,
                    fontSize: '0.7rem',
                  }}
                >
                  Morph of:{' '}
                  <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {morphOf}
                  </Box>
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        {stats && stats.length > 0 && (
          <Box sx={{ mt: 0.5, mb: 1 }}>
            <Box
              ref={statsRowRef}
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: wrapStats
                  ? 'repeat(auto-fit, minmax(120px, 1fr))'
                  : 'repeat(auto-fit, minmax(160px, 1fr))',
                columnGap: 0.8,
                rowGap: 0.5,
                alignItems: 'center',
                minWidth: 0,
                visibility: statsReady ? 'visible' : 'hidden',
              })}
            >
              {stats.map((s) => {
                const paletteKey =
                  s.color && s.color !== 'inherit'
                    ? (s.color as PaletteKey)
                    : inferPaletteFromStat(s.label, s.value);
                const displayLabel = abbrevStats
                  ? s.label === 'Duration'
                    ? 'Dur'
                    : s.label === 'Target'
                      ? 'Tgt'
                      : s.label === 'Cost'
                        ? 'Cost'
                        : s.label
                  : s.label;
                const compactNumber = (str: string): string =>
                  str.replace(/\b(\d{4,})\b/g, (m) => {
                    const n = parseInt(m, 10);
                    if (!isNaN(n) && n >= 1000) {
                      const v = n % 1000 === 0 ? (n / 1000).toFixed(0) : (n / 1000).toFixed(1);
                      return `${v}k`;
                    }
                    return m;
                  });
                const shortValue = compactNumber(s.value)
                  .replace(/\bseconds?\b/i, 's')
                  .replace(/\bMagicka\b/i, 'Mag')
                  .replace(/\bStamina\b/i, 'Sta')
                  .replace(/\bUltimate\b/i, 'Ult');
                const displayValue = abbrevStats ? shortValue : s.value;
                return (
                  <Box
                    key={s.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      gap: 0.4,
                      width: '100%',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        display: 'inline',
                        fontSize: '0.58rem',
                        letterSpacing: '.005em',
                        flexShrink: 0,
                      }}
                    >
                      {displayLabel}
                    </Typography>
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: 'inline-block',
                        px: 0.38,
                        py: 0.1,
                        borderRadius: 0.75,
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        lineHeight: 1.05,
                        color: theme.palette[paletteKey].main,
                        backgroundColor: alpha(theme.palette[paletteKey].main, 0.1),
                        border: `1px solid ${alpha(theme.palette[paletteKey].main, 0.18)}`,
                      })}
                    >
                      {displayValue}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <Divider
          sx={(theme) => ({ my: 1, borderColor: alpha(theme.palette.common.white, 0.08) })}
        />

        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.4,
            fontSize: { xs: '0.78rem', sm: '0.82rem' },
            wordBreak: 'break-word',
            '& p': { m: 0, mb: '6px' },
            '& p:last-child': { mb: 0 },
            '& ul, & ol': { m: 0, mb: '6px', ml: '1.1rem', p: 0 },
            '& li': { mb: '4px' },
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};
