import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { SkillSlot, ULTIMATE_SLOT, ULT_SIZE, ULT_SIZE_MOBILE } from './SkillSlot';

export interface SkillBarSlot {
  slot: number;
  abilityId: number;
}

interface SkillBarDisplayProps {
  label: string;
  weapon?: string;
  skills: SkillBarSlot[];
  /** CSS accent RGB override — e.g. "56,189,248" */
  accentRgb?: string;
  /** Compact mode for inline chat rendering */
  compact?: boolean;
}

export const SkillBarDisplay: React.FC<SkillBarDisplayProps> = ({
  label,
  weapon,
  skills,
  accentRgb,
  compact = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const regular = skills.filter(({ slot }) => slot !== ULTIMATE_SLOT);
  const ultimate = skills.filter(({ slot }) => slot === ULTIMATE_SLOT);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: compact ? 0.75 : 1.5,
          px: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontSize: compact ? '0.6rem' : '0.65rem',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              background: isDark
                ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {label}
          </Typography>
          {weapon && (
            <Typography
              variant="caption"
              sx={{
                fontSize: compact ? '0.55rem' : '0.6rem',
                fontWeight: 500,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                fontFamily: 'Space Grotesk, Inter, system-ui',
              }}
            >
              {weapon}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: '999px',
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 600,
              fontFamily: 'Space Grotesk',
            }}
          >
            {skills.filter(({ abilityId }) => abilityId).length} / 6
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: compact ? 0.375 : { xs: 0.375, sm: 1.25 },
          py: compact ? 0.75 : { xs: 1, sm: 1.5 },
          px: compact ? 0.5 : { xs: 0.5, sm: 1.5 },
          borderRadius: 3,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          flexWrap: 'nowrap',
        }}
      >
        {regular.map(({ slot, abilityId }) => (
          <SkillSlot
            key={slot}
            slotIndex={slot}
            abilityId={abilityId}
            accentRgb={accentRgb}
            compact={compact}
          />
        ))}

        {ultimate.length > 0 && (
          <Box
            sx={{
              width: 1.5,
              height: compact
                ? ULT_SIZE_MOBILE * 0.7
                : { xs: ULT_SIZE_MOBILE * 0.7, sm: ULT_SIZE * 0.7 },
              borderRadius: 1,
              flexShrink: 0,
              alignSelf: 'center',
              background: isDark
                ? 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.40) 50%, transparent 100%)'
                : 'linear-gradient(180deg, transparent 0%, rgba(255,179,0, 0.25) 50%, transparent 100%)',
            }}
          />
        )}

        {ultimate.map(({ slot, abilityId }) => (
          <SkillSlot
            key={slot}
            slotIndex={slot}
            abilityId={abilityId}
            isUltimate
            accentRgb={accentRgb}
            compact={compact}
          />
        ))}
      </Box>
    </Box>
  );
};
