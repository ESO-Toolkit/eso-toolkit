import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Stack, Typography, useTheme, Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { useLogger } from '@/hooks/useLogger';

import { useSkillScribingData } from '../features/scribing/hooks/useScribingDetection';
import type { ScribedSkillAffixInfo } from '../features/scribing/types';
import { getEsoHubSkillLineUrl } from '../utils/esoHubLinks';
import { highlightMetrics } from '../utils/highlightMetrics';

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
  // 48x48–64x64 icon URL for the skill - required unless iconSlug is provided
  iconUrl?: string;
  // RPG Logs ability icon slug, e.g. "ability_arcanist_005_a"; iconUrl is derived automatically - required unless iconUrl is provided
  iconSlug?: string;
  // ESO Logs ability id for reference (icon resolution must be handled by caller)
  abilityId?: number;
  // ESO Logs ability id for reference (unused)
  _abilityId?: number;
  // Main skill name
  name: string;
  // Optional morph lineage text
  morphOf?: string;
  // Small set of key stats (e.g. Cost, Target, Duration)
  stats?: SkillStat[];
  // Rich description body; accept ReactNode so callers can colorize parts
  description: React.ReactNode;
  // Pre-resolved scribing data from the tooltip mapper (name-based detection)
  scribedSkillData?: import('../features/scribing/types').ScribedSkillData;
  // Fight and player context for automatic scribing detection
  fightId?: string;
  playerId?: number;
}

type PaletteKey = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

const getEffectTypeIndicator = (type: string, theme: Theme): { color: string } => {
  switch (type) {
    case 'buff':
      return { color: theme.palette.success.main };
    case 'debuff':
      return { color: theme.palette.error.main };
    case 'damage':
      return { color: theme.palette.warning.main };
    case 'heal':
      return { color: theme.palette.info.main };
    case 'aura':
      return { color: theme.palette.secondary.main };
    case 'resource':
      return { color: theme.palette.primary.main };
    default:
      return { color: theme.palette.text.secondary };
  }
};

function inferPaletteFromStat(label: string, value: string): PaletteKey {
  const v = value.toLowerCase();
  if (v.includes('magicka')) return 'info';
  if (v.includes('stamina')) return 'success';
  if (v.includes('ultimate')) return 'warning';
  if (label.toLowerCase().includes('duration')) return 'secondary';
  return 'primary';
}

/** Gradient fade divider — replaces plain MUI Divider for a more refined look */
const GradientDivider: React.FC<{ sx?: object }> = ({ sx }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, transparent 0%, rgba(148, 210, 255, 0.18) 30%, rgba(148, 210, 255, 0.18) 70%, transparent 100%)'
          : 'linear-gradient(90deg, transparent 0%, rgba(15, 23, 42, 0.12) 30%, rgba(15, 23, 42, 0.12) 70%, transparent 100%)',
        ...sx,
      }}
    />
  );
};

/** Small section label used in the scribing area */
const ScribingSectionLabel: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => (
  <Typography
    variant="caption"
    sx={{
      color,
      fontFamily: 'Space Grotesk, Inter, system-ui',
      fontWeight: 700,
      letterSpacing: '.04em',
      fontSize: '0.68rem',
      textTransform: 'uppercase',
      display: 'block',
      mb: 0.5,
    }}
  >
    {children}
  </Typography>
);

/** Shared gradient text styles for the skill name */
const nameGradientSx = (isDark: boolean): Record<string, unknown> => ({
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 800,
  letterSpacing: '-.02em',
  ...(isDark
    ? {
        background: 'linear-gradient(135deg, #ffffff 0%, #94d2ff 45%, #c8f0ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 1px 2px rgba(148, 210, 255, 0.15))',
      }
    : {
        background: 'linear-gradient(135deg, #0c4a8a 0%, #1e6fd4 50%, #3b8fe8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }),
  lineHeight: 1.15,
  fontSize: { xs: '0.92rem', sm: '1rem' },
});

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
  _abilityId,
  name,
  morphOf,
  stats,
  description,
  scribedSkillData,
  fightId,
  playerId,
}) => {
  const theme = useTheme();
  const logger = useLogger();
  const isDark = theme.palette.mode === 'dark';

  // Try automatic scribing detection when fight and player context available
  const { scribedSkillData: detectedScribingData } = useSkillScribingData(
    fightId,
    playerId,
    abilityId,
  );

  // Prefer hook-detected data, fall back to pre-resolved prop data (from name-based detection)
  const finalScribedData = detectedScribingData ?? scribedSkillData ?? null;

  // Ensure at least one icon source is provided
  if (!iconUrl && !iconSlug) {
    logger.warn(
      `SkillTooltip: No icon provided for "${name}". Please provide either iconUrl or iconSlug.`,
    );
  }

  const resolvedIconUrl =
    iconUrl ??
    (iconSlug ? `https://assets.rpglogs.com/img/eso/abilities/${iconSlug}.png` : undefined);
  // URL map includes both bare skill line names ("Ardent Flame") and composite class keys
  // ("Dragonknight — Ardent Flame") so lineText can be passed directly in either format.
  const skillLineUrl = lineText ? getEsoHubSkillLineUrl(lineText) : undefined;
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

  // Badge color logic
  const badgeColor = /passive/i.test(headerBadge ?? '')
    ? 'info'
    : /ultimate/i.test(headerBadge ?? '')
      ? 'warning'
      : /active/i.test(headerBadge ?? '')
        ? 'success'
        : 'default';

  return (
    <Card
      variant="outlined"
      className="u-fade-in skill-tooltip"
      sx={{
        maxWidth: { xs: 280, sm: 340, md: 380 },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* ── Header: Badge + Skill Line ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.25,
          }}
        >
          {headerBadge ? (
            <Chip
              size="small"
              label={headerBadge}
              variant="outlined"
              color={badgeColor as 'info' | 'warning' | 'success' | 'default'}
              sx={(theme: Theme) => ({
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 700,
                letterSpacing: '.04em',
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                borderRadius: '6px',
                height: 22,
                '& .MuiChip-label': { px: 0.75, fontSize: '0.62rem', lineHeight: 1 },
                ...(badgeColor !== 'default' && {
                  backgroundColor: alpha(
                    theme.palette[badgeColor as PaletteKey].main,
                    isDark ? 0.1 : 0.08,
                  ),
                }),
              })}
            />
          ) : (
            <span />
          )}
          {lineText && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 600,
                letterSpacing: '.02em',
                fontSize: '0.68rem',
                opacity: 0.8,
              }}
            >
              {lineText}
            </Typography>
          )}
        </Box>

        {/* ── Identity Block: Icon + Name + Morph ── */}
        <Box
          sx={{
            p: 1,
            borderRadius: '10px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(148, 210, 255, 0.04) 0%, rgba(56, 189, 248, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(56, 189, 248, 0.02) 100%)',
            border: `1px solid ${isDark ? 'rgba(148, 210, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'}`,
            mb: 1.25,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {resolvedIconUrl && (
              <Box
                sx={{
                  width: { xs: 44, sm: 48 },
                  height: { xs: 44, sm: 48 },
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(148, 210, 255, 0.15)' : 'rgba(15, 23, 42, 0.1)'}`,
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(148, 210, 255, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)'
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.04) 0%, rgba(56, 189, 248, 0.03) 100%)',
                  overflow: 'hidden',
                  flex: '0 0 auto',
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    : '0 2px 6px rgba(15, 23, 42, 0.08)',
                }}
              >
                <img
                  src={resolvedIconUrl}
                  alt={name}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'cover',
                    borderRadius: 'inherit',
                  }}
                />
              </Box>
            )}
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
              {skillLineUrl ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle1" sx={nameGradientSx(isDark)}>
                    {name}
                  </Typography>
                  <Box
                    component="a"
                    href={skillLineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    aria-label={`${name} on ESO-Hub`}
                    title="View on ESO-Hub"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                      flexShrink: 0,
                      lineHeight: 0,
                      '&:hover': {
                        color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
                      },
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </Box>
                </Box>
              ) : (
                <Typography variant="subtitle1" sx={nameGradientSx(isDark)}>
                  {name}
                </Typography>
              )}
              {morphOf && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    display: 'block',
                    lineHeight: 1.3,
                    fontSize: '0.7rem',
                    opacity: 0.85,
                  }}
                >
                  Morph of:{' '}
                  <Box
                    component="span"
                    sx={{
                      color: isDark ? '#94d2ff' : 'primary.main',
                      fontWeight: 600,
                    }}
                  >
                    {morphOf}
                  </Box>
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        {/* ── Stats Grid ── */}
        {stats && stats.length > 0 && (
          <Box sx={{ mb: 1.25 }}>
            <Box
              ref={statsRowRef}
              sx={{
                display: 'grid',
                gridTemplateColumns: wrapStats
                  ? 'repeat(auto-fit, minmax(120px, 1fr))'
                  : 'repeat(auto-fit, minmax(160px, 1fr))',
                columnGap: 0.8,
                rowGap: 0.6,
                alignItems: 'center',
                minWidth: 0,
                visibility: statsReady ? 'visible' : 'hidden',
              }}
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
                      gap: 0.5,
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
                        fontSize: '0.6rem',
                        letterSpacing: '.02em',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                        opacity: 0.75,
                      }}
                    >
                      {displayLabel}
                    </Typography>
                    <Box
                      component="span"
                      sx={(theme: Theme) => ({
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 0.5,
                        py: 0.15,
                        borderRadius: '4px',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.1,
                        color: theme.palette[paletteKey].main,
                        backgroundColor: alpha(theme.palette[paletteKey].main, isDark ? 0.1 : 0.08),
                        border: `1px solid ${alpha(theme.palette[paletteKey].main, isDark ? 0.2 : 0.15)}`,
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

        <GradientDivider sx={{ my: 1.25 }} />

        {/* ── Scribing Detection Section ── */}
        {finalScribedData && (
          <>
            <Box sx={{ mb: 1.25 }}>
              {/* Grimoire Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 1,
                  p: 0.75,
                  borderRadius: '8px',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(148, 210, 255, 0.06) 0%, rgba(0, 225, 255, 0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(15, 23, 42, 0.04) 0%, rgba(56, 189, 248, 0.03) 100%)',
                  border: `1px solid ${isDark ? 'rgba(148, 210, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'}`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isDark
                      ? 'linear-gradient(135deg, #94d2ff, #00e1ff)'
                      : 'linear-gradient(135deg, #0369a1, #38bdf8)',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    color: isDark ? '#94d2ff' : 'primary.main',
                    fontWeight: 700,
                    letterSpacing: '.03em',
                    fontSize: '0.76rem',
                  }}
                >
                  Grimoire: {finalScribedData.grimoireName}
                </Typography>
              </Box>

              {/* Show message when skill wasn't cast */}
              {finalScribedData.wasCastInFight === false ? (
                <Box
                  sx={{
                    p: 0.75,
                    borderRadius: '8px',
                    background: isDark
                      ? alpha(theme.palette.warning.main, 0.06)
                      : alpha(theme.palette.warning.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.warning.main, isDark ? 0.15 : 0.12)}`,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'warning.main',
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      fontWeight: 700,
                      letterSpacing: '.02em',
                      fontSize: '0.72rem',
                      display: 'block',
                      mb: 0.25,
                    }}
                  >
                    Script Analysis Unavailable
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.68rem',
                      fontStyle: 'italic',
                      display: 'block',
                      lineHeight: 1.4,
                    }}
                  >
                    This scribing skill was not cast during this fight, so the complete recipe could
                    not be detected.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Focus Script Recipe */}
                  {finalScribedData.recipe && (
                    <Box sx={{ mb: 1 }}>
                      <ScribingSectionLabel color={theme.palette.secondary.main}>
                        Focus Script
                      </ScribingSectionLabel>
                      <Box
                        sx={{
                          pl: 1,
                          borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.primary',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'block',
                          }}
                        >
                          {finalScribedData.recipe.transformation} (
                          {finalScribedData.recipe.transformationType})
                        </Typography>
                        {finalScribedData.recipe.confidence < 1.0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.64rem',
                              fontStyle: 'italic',
                              opacity: 0.75,
                            }}
                          >
                            {Math.round(finalScribedData.recipe.confidence * 100)}% match confidence
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {/* Signature Script Section */}
              {finalScribedData.signatureScript && (
                <Box sx={{ mb: 1 }}>
                  <ScribingSectionLabel color={theme.palette.primary.main}>
                    Signature Script
                  </ScribingSectionLabel>
                  <Box
                    sx={{
                      pl: 1,
                      borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.primary',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        {finalScribedData.signatureScript.name}
                      </Typography>
                      {finalScribedData.signatureScript.confidence != null &&
                        finalScribedData.signatureScript.confidence < 1.0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontSize: '0.6rem',
                            fontStyle: 'italic',
                            opacity: 0.7,
                          }}
                        >
                          ({Math.round(finalScribedData.signatureScript.confidence * 100)}%)
                        </Typography>
                      )}
                    </Box>
                    {(finalScribedData.signatureScript.detectionMethod ||
                      (finalScribedData.signatureScript.evidence &&
                        finalScribedData.signatureScript.evidence.length > 0)) && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.64rem',
                          fontStyle: 'italic',
                          opacity: 0.75,
                        }}
                      >
                        {[
                          finalScribedData.signatureScript.detectionMethod &&
                            `via ${finalScribedData.signatureScript.detectionMethod}`,
                          finalScribedData.signatureScript.evidence &&
                            finalScribedData.signatureScript.evidence.length > 0 &&
                            finalScribedData.signatureScript.evidence[0],
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {/* Affix Scripts Section */}
              {(finalScribedData.affixScripts && finalScribedData.affixScripts.length > 0) ||
              finalScribedData.wasCastInFight === false ? (
                <Box sx={{ mb: 1 }}>
                  <ScribingSectionLabel color={theme.palette.secondary.main}>
                    Affix Scripts
                  </ScribingSectionLabel>
                  {finalScribedData.wasCastInFight === false ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.68rem',
                        fontStyle: 'italic',
                        pl: 1,
                      }}
                    >
                      Skill was never cast in this fight, so affix scripts could not be detected.
                    </Typography>
                  ) : finalScribedData.affixScripts && finalScribedData.affixScripts.length > 0 ? (
                    <Stack
                      spacing={0.4}
                      sx={{
                        pl: 1,
                        borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                      }}
                    >
                      {finalScribedData.affixScripts.map(
                        (affixScript: ScribedSkillAffixInfo) => (
                          <Box key={affixScript.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.primary',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {affixScript.name}
                              </Typography>
                              {affixScript.confidence != null &&
                                affixScript.confidence < 1.0 && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.6rem',
                                    fontStyle: 'italic',
                                    opacity: 0.7,
                                  }}
                                >
                                  ({Math.round(affixScript.confidence * 100)}%)
                                </Typography>
                              )}
                            </Box>
                            {(affixScript.detectionMethod ||
                              (affixScript.evidence?.abilityNames &&
                                affixScript.evidence.abilityNames.length > 0)) && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.64rem',
                                  fontStyle: 'italic',
                                  opacity: 0.75,
                                  display: 'block',
                                }}
                              >
                                {[
                                  affixScript.detectionMethod &&
                                    `via ${affixScript.detectionMethod}`,
                                  affixScript.evidence?.abilityNames &&
                                    affixScript.evidence.abilityNames.length > 0 &&
                                    `Sources: ${affixScript.evidence.abilityNames.join(', ')}`,
                                  affixScript.evidence?.occurrenceCount != null &&
                                    affixScript.evidence.occurrenceCount > 0 &&
                                    `(${affixScript.evidence.occurrenceCount} occurrences)`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Typography>
                            )}
                          </Box>
                        ),
                      )}
                    </Stack>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.68rem',
                        fontStyle: 'italic',
                        pl: 1,
                      }}
                    >
                      No affix script detected
                    </Typography>
                  )}
                </Box>
              ) : null}

              {/* Effects List - only show if skill was cast */}
              {finalScribedData.wasCastInFight !== false && (
                <Box>
                  <ScribingSectionLabel color={theme.palette.text.primary}>
                    Effects
                  </ScribingSectionLabel>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {finalScribedData.effects.map(
                      (
                        effect: {
                          type: string;
                          abilityName: string;
                          abilityId?: number;
                          count?: number;
                        },
                        index: number,
                      ) => {
                        const indicator = getEffectTypeIndicator(effect.type, theme);
                        return (
                          <Chip
                            key={index}
                            size="small"
                            label={`${effect.abilityName} (${effect.count})`}
                            variant="outlined"
                            sx={{
                              fontSize: '0.62rem',
                              height: '22px',
                              color: indicator.color,
                              borderColor: alpha(indicator.color, 0.3),
                              backgroundColor: alpha(indicator.color, isDark ? 0.08 : 0.06),
                              fontWeight: 600,
                              borderRadius: '6px',
                              '& .MuiChip-label': {
                                px: 0.5,
                                pl: 1.25,
                                fontSize: '0.62rem',
                                lineHeight: 1.2,
                                position: 'relative',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  left: 2,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  backgroundColor: indicator.color,
                                  boxShadow: `0 0 4px ${alpha(indicator.color, 0.5)}`,
                                },
                              },
                            }}
                          />
                        );
                      },
                    )}
                  </Box>
                </Box>
              )}
            </Box>
            <GradientDivider sx={{ my: 1.25 }} />
          </>
        )}

        {/* ── Description ── */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.5,
            fontSize: { xs: '0.78rem', sm: '0.82rem' },
            wordBreak: 'break-word',
            opacity: 0.92,
            '& p': { m: 0, mb: '6px' },
            '& p:last-child': { mb: 0 },
            '& ul, & ol': { m: 0, mb: '6px', ml: '1.1rem', p: 0 },
            '& li': { mb: '4px' },
          }}
        >
          {highlightMetrics(description, isDark)}
        </Typography>
        {skillLineUrl && (
          <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'flex-end' }}>
            <Box
              component="a"
              href={skillLineUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label="View skill on ESO-Hub"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.3,
                color: 'text.disabled',
                fontSize: '0.62rem',
                fontWeight: 500,
                textDecoration: 'none',
                letterSpacing: '.02em',
                lineHeight: 1,
                '&:hover': { color: 'text.secondary' },
              }}
            >
              ESO-Hub
              <OpenInNewIcon sx={{ fontSize: 9 }} />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
