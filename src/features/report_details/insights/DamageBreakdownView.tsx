import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Avatar,
  Skeleton,
  Chip,
} from '@mui/material';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';

// Color mapping for different damage types
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  Physical: '#8B5A2B',
  Magic: '#6366F1',
  Fire: '#EF4444',
  Frost: '#3B82F6',
  Shock: '#FBBF24',
  Poison: '#10B981',
  Disease: '#8B5CF6',
  Generic: '#6B7280',
  Drown: '#0EA5E9',
  Bleed: '#DC2626',
  None: '#9CA3AF',
};

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
  damageTypes?: string[];
}

interface DamageBreakdownViewProps {
  damageBreakdown: DamageBreakdown[];
  totalDamage: number;
  isLoading: boolean;
}

export const DamageBreakdownView: React.FC<DamageBreakdownViewProps> = ({
  damageBreakdown,
  totalDamage,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Damage Breakdown
        </Typography>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2 }} />
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
      <Typography variant="h6" gutterBottom>
        Damage Breakdown
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total damage dealt by friendly players: {formatNumber(totalDamage)}
      </Typography>

      {damageBreakdown.length > 0 ? (
        <List disablePadding>
          {damageBreakdown.slice(0, 15).map((damage) => {
            const percentage = totalDamage > 0 ? (damage.totalDamage / totalDamage) * 100 : 0;
            return (
              <ListItem key={damage.abilityGameID} sx={{ py: 1 }} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                  {damage.icon ? (
                    <AbilityIcon abilityId={damage.abilityGameID} />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                      {damage.abilityName.charAt(0)}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={damage.abilityName}
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(damage.totalDamage)} damage
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {damage.hitCount} hits
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(Math.round(damage.averageDamage))} avg
                          </Typography>
                          {damage.criticalRate > 0 && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip
                                label={`${damage.criticalRate.toFixed(1)}% crit`}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.625rem',
                                  bgcolor: 'warning.main',
                                  color: 'warning.contrastText',
                                }}
                              />
                            </>
                          )}
                          {damage.damageTypes && damage.damageTypes.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, ml: 0.5 }}>
                              {damage.damageTypes.map((damageType) => (
                                <Chip
                                  key={damageType}
                                  label={damageType}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.625rem',
                                    bgcolor:
                                      DAMAGE_TYPE_COLORS[damageType] || DAMAGE_TYPE_COLORS.Generic,
                                    color: 'white',
                                    '& .MuiChip-label': {
                                      px: 0.5,
                                      fontWeight: 500,
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                        sx: { fontWeight: 600 },
                      }}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, Math.min(100, percentage))}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        mt: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ width: 60, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No damage events found for friendly players.
        </Typography>
      )}
    </Box>
  );
};
