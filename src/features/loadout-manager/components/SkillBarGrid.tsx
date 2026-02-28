/**
 * Skill Bar Grid Component
 * Displays 2 rows × 6 columns of skill icons (front/back bar)
 * Matching the mockup's 2x6 grid layout with glowing gem effects
 */

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { getSkillById } from '../data/skillLineSkills';
import { SkillBar, SkillsConfig } from '../types/loadout.types';

import { emptyGemSlotEnhanced, gemIconEnhanced } from './styles/textureStyles';

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;

interface SkillBarGridProps {
  skills?: SkillsConfig;
  iconSize?: number;
}

const resolveAbilityIconUrl = (icon?: string): string | null => {
  if (!icon) return null;
  if (/^https?:\/\//.test(icon)) {
    return icon;
  }
  const sanitized = icon.replace(/\.(dds|png)$/i, '');
  return `https://eso-hub.com/storage/icons/${sanitized}.png`;
};

export const SkillBarGrid: React.FC<SkillBarGridProps> = ({
  skills,
  iconSize = 22,
}) => {
  const frontBar = skills?.[0];
  const backBar = skills?.[1];

  return (
    <Stack spacing={0.5}>
      {/* Front Bar */}
      <SkillRow bar={frontBar} label="F" iconSize={iconSize} />
      {/* Back Bar */}
      <SkillRow bar={backBar} label="B" iconSize={iconSize} />
    </Stack>
  );
};

interface SkillRowProps {
  bar?: SkillBar;
  label: string;
  iconSize: number;
}

const SkillRow: React.FC<SkillRowProps> = ({ bar, label, iconSize }) => {
  // Get all slot icons: 5 skills + ultimate
  const allSlots = [...SKILL_SLOTS, ULTIMATE_SLOT];

  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {/* Bar label */}
      <Typography
        sx={{
          width: 12,
          fontSize: '9px',
          fontWeight: 700,
          color: '#00d9ff',
          opacity: 0.6,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>

      {/* Skill icons */}
      <Stack direction="row" spacing={0.2} useFlexGap>
        {allSlots.map((slot, idx) => (
          <AbilityIcon
            key={slot}
            abilityId={bar?.[slot]}
            size={iconSize}
            isUltimate={idx === allSlots.length - 1}
          />
        ))}
      </Stack>
    </Stack>
  );
};

interface AbilityIconProps {
  abilityId?: number;
  size: number;
  isUltimate?: boolean;
}

const AbilityIcon: React.FC<AbilityIconProps> = ({
  abilityId,
  size,
  isUltimate = false,
}) => {
  const skill = abilityId ? getSkillById(abilityId) : undefined;
  const iconUrl = resolveAbilityIconUrl(skill?.icon);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [iconUrl]);

  const isEmpty = !abilityId || !iconUrl || loadFailed;
  const gemColor = isUltimate ? '#ff9500' : '#00d9ff';

  return (
    <Tooltip title={skill?.name ?? 'Empty slot'} arrow>
      <Box
        sx={{
          width: size,
          height: size,
          ...(isEmpty ? emptyGemSlotEnhanced(isUltimate) : gemIconEnhanced(isUltimate)),
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring easing
          cursor: 'pointer',
        }}
      >
        {iconUrl && !loadFailed ? (
          <Box
            component="img"
            src={iconUrl}
            alt={skill?.name ?? 'Empty slot'}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // Enhance icon with subtle glow
              filter: `drop-shadow(0 0 3px ${gemColor}44)`,
            }}
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <Typography
            sx={{
              fontSize: size * 0.4,
              color: `${gemColor}44`,
              fontWeight: 700,
            }}
          >
            --
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};
