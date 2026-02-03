import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import React, { useState } from 'react';

import { DamageTypeFlags } from '../../../types/abilities';

import { DamageTypeHelpModal } from './DamageTypeHelpModal';

interface DamageTypeBreakdown {
  damageType: DamageTypeFlags;
  displayName: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
}

interface DamageTypeBreakdownViewProps {
  damageTypeBreakdown: DamageTypeBreakdown[];
  totalDamage: number;
  isLoading: boolean;
}

// Color mapping for different damage types
const DAMAGE_TYPE_COLORS: Record<DamageTypeFlags, string> = {
  [DamageTypeFlags.BLEED]: '#DC2626', // Bleed - Dark Red
  [DamageTypeFlags.DISEASE]: '#8B5CF6', // Disease - Violet
  [DamageTypeFlags.FIRE]: '#EF4444', // Fire - Red
  [DamageTypeFlags.FROST]: '#3B82F6', // Frost - Blue
  [DamageTypeFlags.GENERIC]: '#6B7280', // Generic - Gray
  [DamageTypeFlags.MAGIC]: '#6366F1', // Magic - Purple
  [DamageTypeFlags.PHYSICAL]: '#8B5A2B', // Physical - Brown
  [DamageTypeFlags.POISON]: '#10B981', // Poison - Green
  [DamageTypeFlags.SHOCK]: '#FBBF24', // Shock - Yellow
};

// Color mapping for custom damage categories by display name
const CUSTOM_DAMAGE_TYPE_COLORS: Record<string, string> = {
  Magic: '#6366F1', // Magic - Purple
  Martial: '#8B5A2B', // Martial - Brown
  Direct: '#F59E0B', // Direct - Amber
  Poison: '#10B981', // Poison - Green
  'Damage over Time': '#EF4444', // DOT - Red
  'Area of Effect': '#8B5CF6', // AOE - Violet
  'Status Effects': '#EC4899', // Status Effects - Pink
  Fire: '#EF4444', // Fire - Red
};

// Icon mapping for different damage types
const DAMAGE_TYPE_ICONS: Record<DamageTypeFlags, string> = {
  [DamageTypeFlags.BLEED]: '🩸', // Bleed
  [DamageTypeFlags.DISEASE]: '🦠', // Disease
  [DamageTypeFlags.FIRE]: '🔥', // Fire
  [DamageTypeFlags.FROST]: '❄️', // Frost
  [DamageTypeFlags.GENERIC]: '💥', // Generic
  [DamageTypeFlags.MAGIC]: '✨', // Magic
  [DamageTypeFlags.PHYSICAL]: '⚔️', // Physical
  [DamageTypeFlags.POISON]: '☠️', // Poison
  [DamageTypeFlags.SHOCK]: '⚡', // Shock
};

// Icon mapping for custom damage categories by display name
const CUSTOM_DAMAGE_TYPE_ICONS: Record<string, string> = {
  Magic: '✨', // Magic
  Martial: '⚔️', // Martial
  Direct: '🎯', // Direct
  Poison: '☠️', // Poison
  'Damage over Time': '🔄', // DOT
  'Area of Effect': '💥', // AOE
  'Status Effects': '🌟', // Status Effects
  Fire: '🔥', // Fire
};

export const DamageTypeBreakdownView: React.FC<DamageTypeBreakdownViewProps> = ({
  damageTypeBreakdown,
  totalDamage,
  isLoading,
}) => {
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const handleOpenHelp = (): void => {
    setHelpModalOpen(true);
  };

  const handleCloseHelp = (): void => {
    setHelpModalOpen(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">Damage by Type</Typography>
          <Tooltip title="Learn how damage types are calculated" arrow>
            <IconButton
              size="small"
              onClick={handleOpenHelp}
              aria-label="Open damage type help"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Damage breakdown by damage type from friendly players:{' '}
          <Skeleton variant="text" width="60px" sx={{ display: 'inline-block' }} />
        </Typography>
        <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
          {[...Array(4)].map((_, index) => (
            <Box
              key={index}
              sx={{
                py: 1.5,
                pl: 0.5,
                pr: 1.5,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box
                  sx={{
                    position: 'relative',
                    height: 48,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                  }}
                >
                  {/* Emoji icon placeholder */}
                  <Skeleton variant="rounded" width={32} height={32} />

                  {/* Text content */}
                  <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                    <Skeleton variant="text" width="60%" height={16} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                      <Skeleton variant="text" width="40px" height={12} />
                      <Skeleton variant="text" width="40px" height={12} />
                    </Box>
                  </Box>

                  {/* Percentage only (no stack badge for damage types) */}
                  <Skeleton variant="text" width="40px" height={20} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Help Modal */}
        <DamageTypeHelpModal open={helpModalOpen} onClose={handleCloseHelp} />
      </Box>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6">Damage by Type</Typography>
        <Tooltip title="Learn how damage types are calculated" arrow>
          <IconButton
            size="small"
            onClick={handleOpenHelp}
            aria-label="Open damage type help"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Damage breakdown by damage type from friendly players: {formatNumber(totalDamage)}
      </Typography>

      {damageTypeBreakdown.length > 0 ? (
        <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
          <List disablePadding>
            {damageTypeBreakdown.map((damageType, idx) => {
              const percentage = totalDamage > 0 ? (damageType.totalDamage / totalDamage) * 100 : 0;
              // Try custom mapping first (by display name), then fall back to enum-based mapping
              const color =
                CUSTOM_DAMAGE_TYPE_COLORS[damageType.displayName] ||
                DAMAGE_TYPE_COLORS[damageType.damageType] ||
                '#6B7280'; // Default gray
              const icon =
                CUSTOM_DAMAGE_TYPE_ICONS[damageType.displayName] ||
                DAMAGE_TYPE_ICONS[damageType.damageType] ||
                '💥'; // Default explosion

              return (
                <ListItem key={idx} sx={{ py: 1.5, pl: 0.5, pr: 1.5 }} divider>
                  <Box sx={{ width: '100%' }}>
                    {/* Progress bar container with content inside */}
                    <Box
                      sx={{
                        position: 'relative',
                        height: 48,
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Progress bar fill */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${Math.max(0, Math.min(100, percentage))}%`,
                          bgcolor: color,
                          borderRadius: 2,
                          transition: 'width 0.3s ease-in-out',
                        }}
                      />

                      {/* Content overlay */}
                      <Box
                        sx={{
                          position: 'relative',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          px: 2,
                          zIndex: 1,
                        }}
                      >
                        {/* Icon */}
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'transparent',
                            fontSize: '1.2rem',
                            filter:
                              'drop-shadow(0px 0px 2px rgba(0,0,0,0.8)) drop-shadow(0px 0px 4px rgba(255,255,255,0.3))',
                            textShadow:
                              '0px 0px 2px rgba(0,0,0,0.9), 0px 0px 4px rgba(255,255,255,0.4)',
                          }}
                          variant="rounded"
                        >
                          {icon}
                        </Avatar>

                        {/* Labels */}
                        <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'white',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              lineHeight: 1.2,
                            }}
                          >
                            {damageType.displayName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'rgba(255,255,255,0.9)',
                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                fontWeight: 500,
                              }}
                            >
                              {formatNumber(damageType.totalDamage)} dmg
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'rgba(255,255,255,0.7)',
                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                              }}
                            >
                              •
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'rgba(255,255,255,0.9)',
                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                fontWeight: 500,
                              }}
                            >
                              {formatNumber(Math.round(damageType.averageDamage))} avg
                            </Typography>
                          </Box>
                        </Box>

                        {/* Percentage */}
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: 'white',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No damage events found for friendly players.
        </Typography>
      )}

      {/* Help Modal */}
      <DamageTypeHelpModal open={helpModalOpen} onClose={handleCloseHelp} />
    </Box>
  );
};
