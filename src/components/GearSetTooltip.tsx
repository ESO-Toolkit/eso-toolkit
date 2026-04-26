import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { Box, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import { getEsoHubSetUrl } from '../utils/esoHubLinks';
import { highlightMetrics } from '../utils/highlightMetrics';

export interface GearSetBonus {
  pieces: string; // "(2 items)", "(5 items)", etc.
  effect: string; // Description of the bonus
  requirement?: string; // Conditions like "Standing still"
  active?: boolean; // Whether this bonus is currently active
}

export interface GearPieceInfo {
  id: number;
  name: string;
  icon: string;
  slot: number;
  quality: number;
  encodedIconUrl: string;
}

export interface GearSetTooltipProps {
  // "Light Armor", "Monster Set", "Mythic" etc.
  headerBadge?: string;
  // Small text in the top-right, e.g. location/category
  lineText?: string;
  // 48x48–64x64 icon for the set (when available)
  iconUrl?: string;
  // Main set name
  setName: string;
  // Array of set bonuses
  setBonuses: GearSetBonus[];
  // Optional lore/additional info
  description?: React.ReactNode;
  // Current pieces worn (e.g. "5/5" or just "5")
  itemCount?: string;
  // Individual gear pieces with detailed info
  gearPieces?: GearPieceInfo[];
  // Individual gear pieces with detailed info (unused)
  _gearPieces?: GearPieceInfo[];
}

/** Gradient fade divider */
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

/**
 * Gear set tooltip card similar to SkillTooltip. Designed to sit inside popovers/menus
 * but also works standalone. Uses the app's dark theme and styling consistent with skill tooltips.
 */
export const GearSetTooltip: React.FC<GearSetTooltipProps> = (props) => {
  const {
    headerBadge,
    lineText,
    iconUrl,
    setName,
    setBonuses,
    description,
    itemCount,
    _gearPieces,
  } = props;

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Determine appropriate colors for bonuses based on active state
  const getBonusColor = (bonus: GearSetBonus): 'success' | 'primary' => {
    if (bonus.active) return 'success';
    return 'primary';
  };

  return (
    <Card
      variant="outlined"
      className="u-fade-in gear-set-tooltip"
      sx={{
        maxWidth: { xs: 280, sm: 340, md: 380 },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* ── Header: Badge + Location ── */}
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
              color="info"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 700,
                letterSpacing: '.04em',
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                borderRadius: '6px',
                height: 22,
                backgroundColor: alpha(theme.palette.info.main, isDark ? 0.1 : 0.08),
                '& .MuiChip-label': { px: 0.75, fontSize: '0.62rem', lineHeight: 1 },
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

        {/* ── Identity Block: Icon + Set Name + Item Count ── */}
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            {iconUrl && (
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
                  src={iconUrl}
                  alt={setName}
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
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      fontWeight: 800,
                      letterSpacing: '-.02em',
                      ...(isDark
                        ? {
                            background:
                              'linear-gradient(135deg, #ffffff 0%, #94d2ff 45%, #c8f0ff 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 1px 2px rgba(148, 210, 255, 0.15))',
                          }
                        : {
                            background:
                              'linear-gradient(135deg, #0c4a8a 0%, #1e6fd4 50%, #3b8fe8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }),
                      lineHeight: 1.15,
                      fontSize: { xs: '0.92rem', sm: '1rem' },
                    }}
                  >
                    {setName}
                  </Typography>
                  <Box
                    component="a"
                    href={getEsoHubSetUrl(setName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    aria-label={`View ${setName} on ESO-Hub`}
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
                {itemCount && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? '#94d2ff' : 'primary.main',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                    }}
                  >
                    {itemCount}
                  </Typography>
                )}
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* ── Set Bonuses ── */}
        {setBonuses && setBonuses.length > 0 && (
          <Box sx={{ mb: 1.25 }}>
            <Stack spacing={0.75}>
              {setBonuses.map((bonus, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box
                      component="span"
                      sx={(theme: Theme) => ({
                        display: 'inline-flex',
                        alignItems: 'center',
                        mt: '2px',
                        px: 0.5,
                        py: 0.15,
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.1,
                        color: theme.palette[getBonusColor(bonus)].main,
                        backgroundColor: alpha(
                          theme.palette[getBonusColor(bonus)].main,
                          isDark ? 0.1 : 0.08,
                        ),
                        border: `1px solid ${alpha(theme.palette[getBonusColor(bonus)].main, isDark ? 0.2 : 0.15)}`,
                        minWidth: 56,
                        justifyContent: 'center',
                        flexShrink: 0,
                      })}
                    >
                      {bonus.pieces}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: bonus.active ? 'text.primary' : 'text.secondary',
                        fontSize: '0.8rem',
                        lineHeight: 1.35,
                        fontWeight: bonus.active ? 500 : 400,
                      }}
                    >
                      {highlightMetrics(bonus.effect, isDark)}
                    </Typography>
                  </Box>
                  {bonus.requirement && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.68rem',
                        fontStyle: 'italic',
                        ml: 1,
                        opacity: 0.75,
                      }}
                    >
                      Requires: {bonus.requirement}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* ── Description ── */}
        {description && (
          <>
            <GradientDivider sx={{ my: 1.25 }} />
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
              }}
            >
              {highlightMetrics(description, isDark)}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};
