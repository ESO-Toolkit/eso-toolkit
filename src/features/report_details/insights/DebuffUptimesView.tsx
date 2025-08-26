import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Avatar,
  Skeleton,
} from '@mui/material';
import React from 'react';

interface DebuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

interface DebuffUptimesViewProps {
  selectedTargetId: string | null;
  debuffUptimes: DebuffUptime[];
  isLoading: boolean;
}

export const DebuffUptimesView: React.FC<DebuffUptimesViewProps> = ({
  selectedTargetId,
  debuffUptimes,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Debuff Uptimes
        </Typography>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!selectedTargetId) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Debuff Uptimes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Shows debuffs applied by friendly players to the selected target
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a target to view debuff uptimes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Debuff Uptimes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows debuffs applied by friendly players to the selected target
      </Typography>

      {debuffUptimes.length > 0 ? (
        <List disablePadding>
          {debuffUptimes.map((debuff) => {
            const pct = Math.max(0, Math.min(100, debuff.uptimePercentage));
            return (
              <ListItem key={debuff.abilityGameID} sx={{ py: 1 }} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                  {debuff.icon ? (
                    <Avatar
                      src={`https://assets.rpglogs.com/img/eso/abilities/${debuff.icon}.png`}
                      alt={debuff.abilityName}
                      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                      {debuff.abilityName.charAt(0)}
                    </Avatar>
                  )}
                  <ListItemText
                    primary={debuff.abilityName}
                    secondary={`${debuff.applications} applications • ${debuff.uptime.toFixed(1)}s total`}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                      sx: { fontWeight: 600 },
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      color: 'text.secondary',
                    }}
                    sx={{ flex: '0 0 240px', mr: 1 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 12,
                        borderRadius: 999,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ width: 48, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {Math.round(pct)}%
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No friendly debuff events found for the selected target.
        </Typography>
      )}
    </Box>
  );
};
