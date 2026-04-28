import { Box, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { LazySkillTooltip as SkillTooltipCard } from '../../../components/LazySkillTooltip';
import { getSkillById } from '../../loadout-manager/data/skillLineSkills';
import { buildTooltipPropsFromAbilityId } from '../../../utils/skillTooltipMapper';

export const SKILL_ICON_URL = 'https://eso-hub.com/storage/icons/';

export const resolveIconUrl = (icon: string): string =>
  icon.startsWith('http') ? icon : `${SKILL_ICON_URL}${icon}.png`;

export const TILE_SIZE = 58;
export const TILE_SIZE_MOBILE = 40;
export const ULT_SIZE = 66;
export const ULT_SIZE_MOBILE = 48;
export const ULTIMATE_SLOT = 5;
export const SLOT_LABELS: Record<number, string> = { 0: '1', 1: '2', 2: '3', 3: '4', 4: '5', 5: 'R' };

interface SkillSlotProps {
  slotIndex: number;
  abilityId: number;
  isUltimate?: boolean;
  /** CSS accent color override — falls back to --be-accent-rgb CSS var */
  accentRgb?: string;
  /** Compact mode for inline chat rendering */
  compact?: boolean;
}

export const SkillSlot: React.FC<SkillSlotProps> = ({
  slotIndex,
  abilityId,
  isUltimate = false,
  accentRgb,
  compact = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const skill = abilityId ? getSkillById(abilityId) : null;
  const iconUrl = skill?.icon ? resolveIconUrl(skill.icon) : null;

  const tileSize = compact ? TILE_SIZE_MOBILE : isUltimate
    ? isMobile ? ULT_SIZE_MOBILE : ULT_SIZE
    : isMobile ? TILE_SIZE_MOBILE : TILE_SIZE;
  const label = SLOT_LABELS[slotIndex] ?? String(slotIndex);

  const richProps = React.useMemo(
    () => (abilityId ? buildTooltipPropsFromAbilityId(abilityId) : null),
    [abilityId],
  );

  const accentVar = accentRgb ?? 'var(--be-accent-rgb, 56,189,248)';
  const accentA = (a: number): string =>
    isUltimate ? `rgba(255,179,0,${a})` : `rgba(${accentVar},${a})`;

  const tooltipTitle = richProps ? (
    <SkillTooltipCard
      {...richProps}
      iconUrl={richProps.iconUrl || iconUrl || undefined}
      abilityId={abilityId}
    />
  ) : (
    `Slot ${label}${isUltimate ? ' (Ultimate)' : ''}`
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        flex: isUltimate ? undefined : 1,
        maxWidth: compact
          ? TILE_SIZE_MOBILE
          : { xs: isUltimate ? ULT_SIZE_MOBILE : TILE_SIZE_MOBILE, sm: isUltimate ? ULT_SIZE : TILE_SIZE + 16 },
        minWidth: compact
          ? TILE_SIZE_MOBILE
          : { xs: isUltimate ? ULT_SIZE_MOBILE : TILE_SIZE_MOBILE, sm: isUltimate ? ULT_SIZE : TILE_SIZE },
      }}
    >
      <Tooltip
        title={tooltipTitle}
        arrow
        placement="top"
        enterTouchDelay={0}
        leaveTouchDelay={3000}
        slotProps={{
          tooltip: {
            sx: richProps
              ? {
                  maxWidth: 320,
                  p: 0,
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
                  boxShadow: 'none !important',
                }
              : {},
          },
          arrow: richProps ? { sx: { display: 'none' } } : {},
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: tileSize,
            height: tileSize,
            borderRadius: isUltimate && !compact ? '14px' : '12px',
            overflow: 'hidden',
            flexShrink: 0,
            border: `${isUltimate && !compact ? 2 : 1.5}px solid ${
              skill ? accentA(0.45) : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
            }`,
            background: skill
              ? isDark ? accentA(0.08) : accentA(0.04)
              : isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
            boxShadow: skill
              ? isDark
                ? `0 0 14px ${accentA(0.12)}, inset 0 1px 0 rgba(255,255,255,0.04)`
                : 'inset 0 1px 0 rgba(255,255,255,0.5)'
              : isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
                : 'inset 0 1px 0 rgba(255,255,255,0.4)',
            transition: 'all 180ms ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.08)',
              borderColor: accentA(0.7),
              background: isDark ? accentA(0.14) : accentA(0.08),
              boxShadow: isDark
                ? `0 6px 20px rgba(0,0,0,0.30), 0 0 18px ${accentA(0.16)}`
                : '0 6px 16px rgba(0,0,0,0.08)',
            },
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={skill?.name ?? `Ability ${abilityId}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography
                sx={{
                  fontSize: isUltimate ? 16 : 13,
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  letterSpacing: 0.4,
                  color: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {label}
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>

      {skill && !isMobile && !compact && (
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 600,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)',
            lineHeight: 1.15,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            maxWidth: tileSize + 8,
            userSelect: 'none',
          }}
        >
          {skill.name}
        </Typography>
      )}
    </Box>
  );
};
