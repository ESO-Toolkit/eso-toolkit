<<<<<<< HEAD
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

interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

interface BuffUptimesViewProps {
  selectedTargetId: string | null;
  buffUptimes: BuffUptime[];
  isLoading: boolean;
}

export const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({
  selectedTargetId,
  buffUptimes,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Buff Uptimes
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
          Buff Uptimes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Shows buffs applied by friendly players to the selected target
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a target to view buff uptimes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Buff Uptimes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows buffs applied by friendly players to the selected target
      </Typography>

      {buffUptimes.length > 0 ? (
        <List disablePadding>
          {buffUptimes.map((buff) => {
            const pct = Math.max(0, Math.min(100, buff.uptimePercentage));
            return (
              <ListItem key={buff.abilityGameID} sx={{ py: 1 }} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                  {buff.icon ? (
                    <Avatar
                      src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
                      alt={buff.abilityName}
                      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                      {buff.abilityName.charAt(0)}
                    </Avatar>
                  )}
                  <ListItemText
                    primary={buff.abilityName}
                    secondary={`${buff.applications} applications • ${buff.uptime.toFixed(1)}s total`}
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
                          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
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
          No friendly buff events found for the selected target.
        </Typography>
      )}
    </Box>
  );
};
=======
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

interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

interface BuffUptimesViewProps {
  selectedTargetId: string | null;
  buffUptimes: BuffUptime[];
  isLoading: boolean;
}

const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({
  selectedTargetId,
  buffUptimes,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Buff Uptimes
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
          Buff Uptimes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Shows buffs applied by friendly players to the selected target
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a target to view buff uptimes.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Buff Uptimes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows buffs applied by friendly players to the selected target
      </Typography>

      {buffUptimes.length > 0 ? (
        <List disablePadding>
          {buffUptimes.map((buff) => {
            const pct = Math.max(0, Math.min(100, buff.uptimePercentage));
            return (
              <ListItem key={buff.abilityGameID} sx={{ py: 1 }} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.25 }}>
                  {buff.icon ? (
                    <Avatar
                      src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
                      alt={buff.abilityName}
                      sx={{ width: 32, height: 32, borderRadius: 1, boxShadow: 1 }}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }} variant="rounded">
                      {buff.abilityName.charAt(0)}
                    </Avatar>
                  )}
                  <ListItemText
                    primary={buff.abilityName}
                    secondary={`${buff.applications} applications • ${buff.uptime.toFixed(1)}s total`}
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
                          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
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
          No friendly buff events found for the selected target.
        </Typography>
      )}
    </Box>
  );
};

export default BuffUptimesView;
>>>>>>> pr-21
