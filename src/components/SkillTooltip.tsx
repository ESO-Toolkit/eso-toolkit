import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  useTheme,
  Theme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { useLogger } from '@/hooks/useLogger';
import { useSkillScribingData } from '@features/scribing/hooks/useScribingDetection';

export interface SkillStat {
  label: string;
  value: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'inherit';
}

export interface ScribedSkillEffect {
  /** The ability ID of the effect */
  abilityId: number;
  /** The name of the effect */
  abilityName: string;
  /** Type of effect: buff, debuff, damage, heal, aura, or resource */
  type: 'buff' | 'debuff' | 'damage' | 'heal' | 'aura' | 'resource';
  /** Number of times this effect was applied/triggered */
  count: number;
}

export interface ScribedSkillData {
  /** The grimoire this scribed skill belongs to */
  grimoireName: string;
  /** List of effects this scribed skill produces */
  effects: ScribedSkillEffect[];
  /** Whether this skill was actually cast in the current fight */
  wasCastInFight?: boolean;
  /** Enhanced recipe information with focus script details */
  recipe?: {
    grimoire: string;
    transformation: string;
    transformationType: string;
    confidence: number;
    matchMethod: string;
    recipeSummary: string;
    tooltipInfo: string;
  };
  /** Detected signature script information */
  signatureScript?: {
    name: string;
    confidence: number;
    detectionMethod: string;
    evidence: string[];
  };
  /** Detected affix scripts information */
  affixScripts?: Array<{
    id: string;
    name: string;
    description: string;
    confidence: number;
    detectionMethod: string;
    evidence: {
      buffIds: number[];
      debuffIds: number[];
      abilityNames: string[];
      occurrenceCount: number;
    };
  }>;
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
  // Optional scribed skill data for enhanced tooltips
  scribedSkillData?: ScribedSkillData;
  // Enhanced scribing detection options
  useUnifiedDetection?: boolean;
  fightId?: string;
  playerId?: number;
}

type PaletteKey = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Utility functions for scribed skill effects
const getEffectTypeColor = (type: string, theme: Theme): string => {
  switch (type) {
    case 'buff':
      return theme.palette.success.main;
    case 'debuff':
      return theme.palette.error.main;
    case 'damage':
      return theme.palette.warning.main;
    case 'heal':
      return theme.palette.info.main;
    case 'aura':
      return theme.palette.secondary.main;
    case 'resource':
      return theme.palette.primary.main;
    default:
      return theme.palette.text.secondary;
  }
};

const getEffectTypeIcon = (type: string): string => {
  switch (type) {
    case 'buff':
      return '⬆️';
    case 'debuff':
      return '⬇️';
    case 'damage':
      return '⚔️';
    case 'heal':
      return '❤️';
    case 'aura':
      return '🔮';
    case 'resource':
      return '⚡';
    default:
      return '◯';
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
  useUnifiedDetection = false,
  fightId,
  playerId,
}) => {
  const theme = useTheme();
  const logger = useLogger();
  
  // Use unified scribing detection if enabled
  const { scribedSkillData: detectedScribingData, loading: scribingLoading } = useSkillScribingData(
    useUnifiedDetection ? fightId : undefined,
    useUnifiedDetection ? playerId : undefined, 
    useUnifiedDetection ? abilityId : undefined,
  );
  
  // Use detected data if available, otherwise fall back to provided data
  const finalScribedData = useUnifiedDetection ? detectedScribingData : scribedSkillData;

  // Ensure at least one icon source is provided
  if (!iconUrl && !iconSlug) {
    logger.warn(
      `SkillTooltip: No icon provided for "${name}". Please provide either iconUrl or iconSlug.`,
    );
  }

  const resolvedIconUrl =
    iconUrl ??
    (iconSlug ? `https://assets.rpglogs.com/img/eso/abilities/${iconSlug}.png` : undefined);
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
      className="u-fade-in skill-tooltip"
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
                          'linear-gradient(135deg, #68acfb 0%, #2474c4 50%, #439cdc 70%, #5191ff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 1px 2px rgba(36, 116, 196, 0.2)',
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
              sx={(_theme) => ({
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
          sx={(theme) => ({
            my: 1,
            borderColor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.08)
                : alpha(theme.palette.common.black, 0.08),
          })}
        />

        {finalScribedData && (
          <>
            <Box sx={{ mb: 1.5 }}>
              {/* Grimoire Header - always show */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 700,
                    letterSpacing: '.02em',
                    fontSize: '0.78rem',
                  }}
                >
                  📖 Grimoire: {finalScribedData.grimoireName}
                </Typography>
                
                {/* Enhanced Detection Badge */}
                {useUnifiedDetection && (
                  <Chip
                    size="small"
                    label={scribingLoading ? "Analyzing..." : "Enhanced AI"}
                    variant="outlined"
                    sx={{
                      fontSize: '0.6rem',
                      height: '18px',
                      color: scribingLoading ? 'warning.main' : 'success.main',
                      borderColor: scribingLoading ? 'warning.main' : 'success.main',
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.6rem',
                      },
                    }}
                  />
                )}
              </Stack>

              {/* Show message when skill wasn't cast */}
              {finalScribedData.wasCastInFight === false ? (
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'warning.main',
                      fontWeight: 700,
                      letterSpacing: '.02em',
                      fontSize: '0.75rem',
                      mb: 0.5,
                      display: 'block',
                    }}
                  >
                    ⚠️ Script Analysis Unavailable
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontStyle: 'italic',
                      display: 'block',
                    }}
                  >
                    This scribing skill was not cast during this fight, so the complete recipe could not be detected.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Focus Script Recipe */}
                  {finalScribedData.recipe && (
                    <Box sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'secondary.main',
                          fontWeight: 700,
                          letterSpacing: '.02em',
                          fontSize: '0.75rem',
                          mb: 0.5,
                          display: 'block',
                        }}
                      >
                        🧪 Focus Script
                      </Typography>
                      <Stack spacing={0.3} sx={{ mb: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.primary',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          🔄 {finalScribedData.recipe.transformation} ({finalScribedData.recipe.transformationType})
                        </Typography>
                        {finalScribedData.recipe.confidence < 1.0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.65rem',
                              fontStyle: 'italic',
                            }}
                          >
                            🎯 {Math.round(finalScribedData.recipe.confidence * 100)}% match confidence
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}
                </>
              )}

              {/* Signature Script Section */}
              {finalScribedData.wasCastInFight !== false && (
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      letterSpacing: '.02em',
                      fontSize: '0.75rem',
                      mb: 0.5,
                      display: 'block',
                    }}
                  >
                    📜 Signature Script
                  </Typography>
                  <Stack spacing={0.3} sx={{ mb: 1 }}>
                    {finalScribedData.signatureScript ? (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.primary',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          🖋️ {finalScribedData.signatureScript.name}
                        </Typography>
                        {finalScribedData.signatureScript.evidence && finalScribedData.signatureScript.evidence.length > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.65rem',
                              fontStyle: 'italic',
                            }}
                          >
                            🔍 Evidence: {finalScribedData.signatureScript.evidence.join(', ')}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          fontStyle: 'italic',
                        }}
                      >
                        ❓ No signature script detected
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Affix Scripts Section */}
              {finalScribedData.wasCastInFight !== false && finalScribedData.affixScripts && finalScribedData.affixScripts.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'secondary.main',
                      fontWeight: 700,
                      letterSpacing: '.02em',
                      fontSize: '0.75rem',
                      mb: 0.5,
                      display: 'block',
                    }}
                  >
                    🎭 Affix Scripts
                  </Typography>
                  <Stack spacing={0.3} sx={{ mb: 1 }}>
                    {finalScribedData.affixScripts.map((affixScript, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.primary',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        >
                          ✨ {affixScript.name}
                        </Typography>
                        {affixScript.confidence < 1.0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.6rem',
                              fontStyle: 'italic',
                            }}
                          >
                            ({Math.round(affixScript.confidence * 100)}%)
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              
              {/* Effects List - only show if skill was cast */}
              {finalScribedData.wasCastInFight !== false && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {finalScribedData.effects.map((effect, index) => (
                  <Chip
                    key={index}
                    size="small"
                    icon={
                      <span style={{ fontSize: '0.7rem' }}>{getEffectTypeIcon(effect.type)}</span>
                    }
                    label={`${effect.abilityName} (${effect.count})`}
                    variant="outlined"
                    sx={(theme) => ({
                      fontSize: '0.65rem',
                      height: '22px',
                      color: getEffectTypeColor(effect.type, theme),
                      borderColor: alpha(getEffectTypeColor(effect.type, theme), 0.3),
                      backgroundColor: alpha(getEffectTypeColor(effect.type, theme), 0.05),
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.65rem',
                        lineHeight: 1.2,
                      },
                      '& .MuiChip-icon': {
                        marginLeft: '4px',
                        marginRight: '-2px',
                      },
                    })}
                  />
                  ))}
                </Box>
              )}
            </Box>
            <Divider
              sx={(theme) => ({
                my: 1,
                borderColor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.08)
                    : alpha(theme.palette.common.black, 0.08),
              })}
            />
          </>
        )}

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
