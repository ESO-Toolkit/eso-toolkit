import {
  Box,
  Typography,
  List,
  ListItem,
  LinearProgress,
  Avatar,
  Skeleton,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  eligibleHitCount: number;
  criticalHits: number;
  criticalRate: number | null;
  criticalDamage: number;
  criticalDamageShare: number | null;
  averageDamage: number;
  damageTypes?: string[];
}

interface DamageBreakdownViewProps {
  damageBreakdown: DamageBreakdown[];
  totalDamage: number;
  isLoading: boolean;
}

export const DamageBreakdownView: React.FC<DamageBreakdownViewProps> = React.memo(
  ({ damageBreakdown, totalDamage, isLoading }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    if (isLoading) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Damage Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total damage dealt by friendly players:{' '}
            <Skeleton variant="text" width="60px" sx={{ display: 'inline-block' }} />
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
          <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
            <List disablePadding>
              {damageBreakdown.slice(0, 15).map((damage) => {
                // A metric with no denominator is unavailable, not zero. Keep the
                // denominator checks here as a final guard for callers that pass a
                // partially populated row (the panel normally omits zero-damage rows).
                const percentage =
                  totalDamage > 0 ? (damage.totalDamage / totalDamage) * 100 : null;
                const hasEligibleHits = damage.eligibleHitCount > 0;
                const hasDamageDenominator = damage.totalDamage > 0;
                const criticalRate = hasEligibleHits ? damage.criticalRate : null;
                const criticalDamageShare = hasDamageDenominator
                  ? damage.criticalDamageShare
                  : null;
                const criticalRateLabel =
                  criticalRate === null
                    ? 'Crit hit rate unavailable'
                    : `Crit hit rate ${criticalRate.toFixed(1)}%`;
                const criticalRateTooltip =
                  criticalRate === null
                    ? 'Critical hit rate is unavailable because no eligible normal or critical hits were recorded.'
                    : `Critical hit rate: ${damage.criticalHits} critical hits out of ${damage.eligibleHitCount} eligible hits.`;
                const criticalDamageShareLabel =
                  criticalDamageShare === null
                    ? 'Crit damage share unavailable'
                    : `Crit damage share ${criticalDamageShare.toFixed(1)}%`;
                const criticalDamageShareTooltip =
                  criticalDamageShare === null
                    ? !hasDamageDenominator
                      ? 'Critical damage share is unavailable because total damage is zero.'
                      : 'Critical damage share is unavailable because one or more hit types are unknown.'
                    : `Critical damage share: ${formatNumber(damage.criticalDamage)} critical damage out of ${formatNumber(damage.totalDamage)} total damage.`;
                const damageShareLabel =
                  percentage === null
                    ? 'Damage share unavailable'
                    : `${percentage.toFixed(1)}% dmg`;
                const damageShareAriaLabel =
                  percentage === null
                    ? 'Damage share unavailable because total damage is zero'
                    : `Damage share: ${percentage.toFixed(1)}% of total damage`;
                return (
                  <ListItem key={damage.abilityGameID} sx={{ py: 1, pl: 0 }} divider>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                      {damage.icon ? (
                        <AbilityIcon
                          abilityId={damage.abilityGameID}
                          fallbackIcon={damage.icon}
                          fallbackName={damage.abilityName}
                        />
                      ) : (
                        <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                          {damage.abilityName.charAt(0)}
                        </Avatar>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 0.5,
                          }}
                        >
                          <Box sx={{ flex: 1, pr: 12 }}>
                            <Box sx={{ mb: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              <Tooltip title={criticalRateTooltip} arrow>
                                <Chip
                                  aria-label={criticalRateTooltip}
                                  label={criticalRateLabel}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.625rem',
                                    backgroundColor: isDarkMode
                                      ? '#4e579857'
                                      : 'rgba(67, 56, 202, 0.12)',
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.87)' : '#3730a3',
                                    border: isDarkMode
                                      ? '1px solid #45566f'
                                      : '1px solid rgba(67, 56, 202, 0.3)',
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title={criticalDamageShareTooltip} arrow>
                                <Chip
                                  aria-label={criticalDamageShareTooltip}
                                  label={criticalDamageShareLabel}
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.625rem',
                                    backgroundColor: isDarkMode
                                      ? '#4e579857'
                                      : 'rgba(67, 56, 202, 0.12)',
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.87)' : '#3730a3',
                                    border: isDarkMode
                                      ? '1px solid #45566f'
                                      : '1px solid rgba(67, 56, 202, 0.3)',
                                  }}
                                />
                              </Tooltip>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {damage.abilityName}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                            }}
                          >
                            <Chip
                              aria-label={damageShareAriaLabel}
                              label={damageShareLabel}
                              size="medium"
                              sx={{
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: 28,
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: isDarkMode
                                  ? '1px solid rgba(94, 234, 255, 0.35)'
                                  : '1px solid rgba(2, 132, 199, 0.3)',
                                boxShadow: isDarkMode
                                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)'
                                  : '0 4px 16px 0 rgba(59, 130, 246, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
                                background: isDarkMode
                                  ? 'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)'
                                  : 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(14, 165, 233, 0.08) 50%, rgba(56, 189, 248, 0.04) 100%)',
                                color: isDarkMode ? '#7ee8ff' : '#0c4a6e',
                                height: 28,
                                '& .MuiChip-label': {
                                  px: 1.25,
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  lineHeight: 1,
                                  color: isDarkMode ? '#ffffff' : '#0c4a6e',
                                  textShadow: isDarkMode
                                    ? '0 1px 3px rgba(0,0,0,0.5)'
                                    : '0 1px 2px rgba(255,255,255,0.8)',
                                },
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: '50%',
                                  background:
                                    'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                                  borderRadius: '28px 28px 100px 100px / 28px 28px 50px 50px',
                                  pointerEvents: 'none',
                                },
                              }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ mt: 0.5 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              flexWrap: 'nowrap',
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: { xs: 'none', sm: 'flex' },
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                {formatNumber(damage.totalDamage)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200 }}
                              >
                                damage
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200 }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                {damage.hitCount}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200 }}
                              >
                                hits
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200 }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                {formatNumber(Math.round(damage.averageDamage))}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200 }}
                              >
                                avg
                              </Typography>
                            </Box>
                            <Box
                              component="span"
                              sx={{
                                display: { xs: 'flex', sm: 'none' },
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500, fontSize: '0.65rem' }}
                              >
                                {formatNumber(damage.totalDamage)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200, fontSize: '0.65rem' }}
                              >
                                dmg
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200, fontSize: '0.65rem' }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500, fontSize: '0.65rem' }}
                              >
                                {damage.hitCount}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200, fontSize: '0.65rem' }}
                              >
                                hits
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200, fontSize: '0.65rem' }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500, fontSize: '0.65rem' }}
                              >
                                {formatNumber(Math.round(damage.averageDamage))}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 200, fontSize: '0.65rem' }}
                              >
                                avg
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(100, percentage ?? 0))}
                          aria-label={
                            percentage === null
                              ? `${damage.abilityName}: damage share unavailable because total damage is zero`
                              : `${damage.abilityName}: ${percentage.toFixed(1)}% of total damage`
                          }
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
                              background:
                                'linear-gradient(90deg,rgb(130, 101, 50) 0%,rgb(223, 139, 44) 100%)',
                            },
                          }}
                        />
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
      </Box>
    );
  },
);

DamageBreakdownView.displayName = 'DamageBreakdownView';
