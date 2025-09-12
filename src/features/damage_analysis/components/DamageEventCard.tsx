import { Avatar, Box, Card, CardContent, Chip, Grid, Tooltip, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { DamageEvent, HitType } from '../../../types/combatlogEvents';
import { abilityIdMapper } from '../../../utils/abilityIdMapper';

interface BuffDebuffInfo {
  abilityGameID: number;
  extraAbilityGameID?: number;
  name: string;
  extraAbilityName?: string;
  icon: string;
  extraAbilityIcon?: string;
  timestamp: number;
}

interface DamageEventCardProps {
  event: DamageEvent;
  activeBuffs: BuffDebuffInfo[];
  activeDebuffs: BuffDebuffInfo[];
  fight: FightFragment;
}

export const DamageEventCard: React.FC<DamageEventCardProps> = ({
  event,
  activeBuffs,
  activeDebuffs,
  fight,
}) => {
  // Get ability data
  const abilityData = React.useMemo(() => {
    return abilityIdMapper.getAbilityById(event.abilityGameID);
  }, [event.abilityGameID]);

  // Calculate relative timestamp from fight start
  const relativeTimestamp = (event.timestamp - fight.startTime) / 1000;

  // Calculate predicted damage (placeholder algorithm)
  const calculatePredictedDamage = React.useCallback(() => {
    const baseDamage = event.amount;
    let multiplier = 1.0;

    // Simple damage prediction based on active buffs/debuffs
    // This is a basic example - you can implement more sophisticated algorithms

    // Damage increase from buffs (example: each buff adds 5% damage)
    multiplier += activeBuffs.length * 0.05;

    // Damage increase from debuffs on target (example: each debuff adds 3% damage)
    multiplier += activeDebuffs.length * 0.03;

    // Critical hit multiplier
    if (event.hitType === HitType.Critical) {
      multiplier *= 1.5;
    }

    return Math.round(baseDamage * multiplier);
  }, [event.amount, event.hitType, activeBuffs.length, activeDebuffs.length]);

  const predictedDamage = calculatePredictedDamage();
  const actualDamage = event.amount;
  const accuracyPercentage =
    actualDamage > 0
      ? Math.round(
          (Math.min(predictedDamage, actualDamage) / Math.max(predictedDamage, actualDamage)) * 100,
        )
      : 0;

  return (
    <Card sx={{ width: '100%', mb: 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={2} alignItems="center">
          {/* Ability Info */}
          {/* @ts-expect-error - MUI Grid item prop typing issue */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {abilityData?.icon && (
                <Avatar
                  src={abilityData.icon}
                  alt={abilityData.name || 'Ability'}
                  sx={{ width: 32, height: 32 }}
                />
              )}
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {abilityData?.name || `Ability ${event.abilityGameID}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {relativeTimestamp.toFixed(1)}s
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Damage Numbers */}
          {/* @ts-expect-error - MUI Grid item prop typing issue */}
          <Grid item xs={12} sm={3}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {actualDamage.toLocaleString()}
                </Typography>
                {event.hitType === HitType.Critical && (
                  <Chip
                    label="CRIT"
                    size="small"
                    color="warning"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                {event.blocked && (
                  <Chip
                    label="BLOCKED"
                    size="small"
                    color="error"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Predicted: {predictedDamage.toLocaleString()} ({accuracyPercentage}% accuracy)
              </Typography>
            </Box>
          </Grid>

          {/* Active Buffs */}
          {/* @ts-expect-error - MUI Grid item prop typing issue */}
          <Grid item xs={12} sm={2.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Buffs ({activeBuffs.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {activeBuffs.slice(0, 4).map((buff, index) => {
                  const displayName = buff.extraAbilityName
                    ? `${buff.name} (${buff.extraAbilityName})`
                    : buff.name;
                  const displayIcon = buff.extraAbilityIcon || buff.icon;

                  return (
                    <Tooltip
                      key={`${buff.abilityGameID}-${buff.extraAbilityGameID || 0}-${index}`}
                      title={displayName}
                    >
                      <Avatar src={displayIcon} alt={displayName} sx={{ width: 20, height: 20 }} />
                    </Tooltip>
                  );
                })}
                {activeBuffs.length > 4 && (
                  <Typography variant="caption" color="text.secondary">
                    +{activeBuffs.length - 4}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Active Debuffs */}
          {/* @ts-expect-error - MUI Grid item prop typing issue */}
          <Grid item xs={12} sm={2.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Debuffs ({activeDebuffs.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {activeDebuffs.slice(0, 4).map((debuff, index) => {
                  const displayName = debuff.extraAbilityName
                    ? `${debuff.name} (${debuff.extraAbilityName})`
                    : debuff.name;
                  const displayIcon = debuff.extraAbilityIcon || debuff.icon;

                  return (
                    <Tooltip
                      key={`${debuff.abilityGameID}-${debuff.extraAbilityGameID || 0}-${index}`}
                      title={displayName}
                    >
                      <Avatar src={displayIcon} alt={displayName} sx={{ width: 20, height: 20 }} />
                    </Tooltip>
                  );
                })}
                {activeDebuffs.length > 4 && (
                  <Typography variant="caption" color="text.secondary">
                    +{activeDebuffs.length - 4}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Additional Details (collapsible/expandable in future) */}
        {(activeBuffs.length > 0 || activeDebuffs.length > 0) && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2}>
              {activeBuffs.length > 0 && (
                // @ts-expect-error - MUI Grid item prop typing issue
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Active Buffs:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {activeBuffs.map((buff, index) => {
                      const displayName = buff.extraAbilityName
                        ? `${buff.name} (${buff.extraAbilityName})`
                        : buff.name;

                      return (
                        <Chip
                          key={`${buff.abilityGameID}-${buff.extraAbilityGameID || 0}-${index}`}
                          label={displayName}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
              )}

              {activeDebuffs.length > 0 && (
                // @ts-expect-error - MUI Grid item prop typing issue
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Active Debuffs:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {activeDebuffs.map((debuff, index) => {
                      const displayName = debuff.extraAbilityName
                        ? `${debuff.name} (${debuff.extraAbilityName})`
                        : debuff.name;

                      return (
                        <Chip
                          key={`${debuff.abilityGameID}-${debuff.extraAbilityGameID || 0}-${index}`}
                          label={displayName}
                          size="small"
                          variant="outlined"
                          color="secondary"
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
