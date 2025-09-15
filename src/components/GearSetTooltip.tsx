import { Box, Card, CardContent, Chip, Divider, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

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
}

/**
 * Gear set tooltip card similar to SkillTooltip. Designed to sit inside popovers/menus
 * but also works standalone. Uses the app's dark theme and styling consistent with skill tooltips.
 */
export const GearSetTooltip: React.FC<GearSetTooltipProps> = ({
  headerBadge,
  lineText,
  iconUrl,
  setName,
  setBonuses,
  description,
  itemCount,
  gearPieces,
}) => {
  const theme = useTheme();

  // Determine appropriate colors for bonuses based on active state
  const getBonusColor = (bonus: GearSetBonus): 'success' | 'primary' => {
    if (bonus.active) return 'success';
    return 'primary';
  };

  return (
    <Card
      variant="outlined"
      className="u-fade-in gear-set-tooltip"
      sx={(theme) => ({
        maxWidth: { xs: 280, sm: 340, md: 380 },
        backgroundColor:
          theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border:
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: 'none',
        borderRadius: '10px',
      })}
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
              color="info"
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
            {iconUrl && (
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
                  src={iconUrl}
                  alt={setName}
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
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
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
                            'linear-gradient(135deg,rgb(0, 98, 255) 0%, #0f172a 50%, #334155 100%)',
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
                  {setName}
                </Typography>
                {itemCount && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
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

        {setBonuses && setBonuses.length > 0 && (
          <Box sx={{ mt: 0.5, mb: 1 }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: 'inline-block',
                        px: 0.5,
                        py: 0.1,
                        borderRadius: 0.75,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        lineHeight: 1.05,
                        color: theme.palette[getBonusColor(bonus)].main,
                        backgroundColor: alpha(theme.palette[getBonusColor(bonus)].main, 0.1),
                        border: `1px solid ${alpha(theme.palette[getBonusColor(bonus)].main, 0.18)}`,
                        minWidth: 'fit-content',
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
                        lineHeight: 1.3,
                        fontWeight: bonus.active ? 500 : 400,
                      }}
                    >
                      {bonus.effect}
                    </Typography>
                  </Box>
                  {bonus.requirement && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        fontStyle: 'italic',
                        ml: 1,
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

        {description && (
          <>
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
              }}
            >
              {description}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};
