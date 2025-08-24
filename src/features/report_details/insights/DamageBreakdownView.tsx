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

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
}

interface DamageBreakdownViewProps {
  damageBreakdown: DamageBreakdown[];
  totalDamage: number;
  isLoading: boolean;
}

const DamageBreakdownView: React.FC<DamageBreakdownViewProps> = ({
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
                    <Avatar
                      src={`https://assets.rpglogs.com/img/eso/abilities/${damage.icon}.png`}
                      alt={damage.abilityName}
                      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                      {damage.abilityName.charAt(0)}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={damage.abilityName}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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

export default DamageBreakdownView;
