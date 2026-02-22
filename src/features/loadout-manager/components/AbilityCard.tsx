/**
 * Ability Card Component
 * Displays a single ability as a clickable card in the picker grid
 */

import { CheckCircle, Cancel } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import React, { useMemo } from 'react';

import type { SkillData } from '../../../data/types/skill-line-types';

interface AbilityCardProps {
  skill: SkillData;
  isSelected?: boolean;
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const AbilityCard: React.FC<AbilityCardProps> = ({
  skill,
  isSelected = false,
  onClick,
  size = 'medium',
}) => {
  const theme = useTheme();

  // Size configurations
  const sizeConfig = useMemo(
    () => ({
      small: { cardSize: 64, iconSize: 40, fontSize: '0.65rem', padding: 0.5 },
      medium: { cardSize: 90, iconSize: 52, fontSize: '0.7rem', padding: 0.75 },
      large: { cardSize: 110, iconSize: 64, fontSize: '0.75rem', padding: 1 },
    }),
    []
  );

  const config = sizeConfig[size];

  // Determine border color based on skill type
  const borderColor = useMemo(() => {
    if (isSelected) return theme.palette.primary.main;
    if (skill.isUltimate) return theme.palette.secondary.main;
    return 'divider';
  }, [isSelected, skill.isUltimate, theme]);

  // Card background with hover effect
  const cardSx = {
    width: config.cardSize,
    height: config.cardSize + 24, // Extra space for name
    minWidth: config.cardSize,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    border: `2px solid ${borderColor}`,
    bgcolor: isSelected
      ? alpha(theme.palette.primary.main, 0.1)
      : 'background.paper',
    boxShadow: isSelected
      ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`
      : '0 1px 3px rgba(0,0,0,0.12)',
    position: 'relative' as const,
    overflow: 'visible',
    '&:hover': {
      transform: 'scale(1.08)',
      borderColor: isSelected ? theme.palette.primary.main : theme.palette.primary.light,
      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
      zIndex: 2,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  };

  return (
    <Card onClick={onClick} sx={cardSx}>
      <CardContent
        sx={{
          p: config.padding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          '&:last-child': { pb: config.padding },
        }}
      >
        {/* Skill Icon */}
        <Box
          sx={{
            width: config.iconSize,
            height: config.iconSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            bgcolor: alpha(theme.palette.action.hover, 0.5),
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {skill.icon ? (
            <Box
              component="img"
              src={`https://eso-hub.com/storage/icons/${skill.icon}.png`}
              alt={skill.name}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                // Show fallback
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent && !parent.querySelector('span')) {
                  const fallback = document.createElement('span');
                  fallback.textContent = '?';
                  fallback.style.fontSize = '1.5rem';
                  fallback.style.color = theme.palette.text.secondary;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'text.secondary',
              }}
            >
              ?
            </Box>
          )}

          {/* Selected indicator */}
          {isSelected && (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
            </Box>
          )}
        </Box>

        {/* Skill Name */}
        <Typography
          variant="caption"
          sx={{
            fontSize: config.fontSize,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? 'primary.main' : 'text.primary',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
            mt: 0.5,
            lineHeight: 1.2,
            maxHeight: 14,
          }}
          title={skill.name}
        >
          {skill.name}
        </Typography>
      </CardContent>
    </Card>
  );
};
