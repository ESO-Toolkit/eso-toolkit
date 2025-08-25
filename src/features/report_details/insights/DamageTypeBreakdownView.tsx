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

interface DamageTypeBreakdown {
  damageType: string;
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
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  '1': '#8B5A2B', // Physical - Brown
  '2': '#6366F1', // Magic - Purple
  '3': '#EF4444', // Fire - Red
  '4': '#3B82F6', // Frost - Blue
  '5': '#FBBF24', // Shock - Yellow
  '6': '#10B981', // Poison - Green
  '7': '#8B5CF6', // Disease - Violet
  '8': '#6B7280', // Generic - Gray
  '9': '#0EA5E9', // Drown - Cyan
  '10': '#DC2626', // Bleed - Dark Red
  '11': '#9CA3AF', // None - Light Gray
  Unknown: '#6B7280', // Unknown - Gray
};

// Icon mapping for different damage types
const DAMAGE_TYPE_ICONS: Record<string, string> = {
  '1': '⚔️', // Physical
  '2': '✨', // Magic
  '3': '🔥', // Fire
  '4': '❄️', // Frost
  '5': '⚡', // Shock
  '6': '☠️', // Poison
  '7': '🦠', // Disease
  '8': '💥', // Generic
  '9': '🌊', // Drown
  '10': '🩸', // Bleed
  '11': '⭕', // None
  Unknown: '❓', // Unknown
};

const DamageTypeBreakdownView: React.FC<DamageTypeBreakdownViewProps> = ({
  damageTypeBreakdown,
  totalDamage,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Damage by Type
        </Typography>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={250} sx={{ mt: 2 }} />
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
        Damage by Type
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Damage breakdown by damage type from friendly players: {formatNumber(totalDamage)}
      </Typography>

      {damageTypeBreakdown.length > 0 ? (
        <List disablePadding>
          {damageTypeBreakdown.map((damageType) => {
            const percentage = totalDamage > 0 ? (damageType.totalDamage / totalDamage) * 100 : 0;
            const color =
              DAMAGE_TYPE_COLORS[damageType.damageType] || DAMAGE_TYPE_COLORS['Unknown'];
            const icon = DAMAGE_TYPE_ICONS[damageType.damageType] || DAMAGE_TYPE_ICONS['Unknown'];

            return (
              <ListItem key={damageType.damageType} sx={{ py: 1 }} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: color,
                      fontSize: '1rem',
                    }}
                    variant="rounded"
                  >
                    {icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={damageType.displayName}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(damageType.totalDamage)} damage
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {damageType.hitCount} hits
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatNumber(Math.round(damageType.averageDamage))} avg
                          </Typography>
                          {damageType.criticalRate > 0 && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip
                                label={`${damageType.criticalRate.toFixed(1)}% crit`}
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
                          bgcolor: color,
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

export default DamageTypeBreakdownView;
