import {
  Box,
  Typography,
  List,
  ListItem,
  LinearProgress,
  Avatar,
  Skeleton,
  Button,
  Stack,
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
  buffUptimes: BuffUptime[];
  isLoading: boolean;
  showAllBuffs: boolean;
  onToggleShowAll: (showAll: boolean) => void;
}

export const BuffUptimesView: React.FC<BuffUptimesViewProps> = ({ 
  buffUptimes, 
  isLoading, 
  showAllBuffs, 
  onToggleShowAll 
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Buff Uptimes
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            disabled
          >
            Show Important Only
          </Button>
        </Stack>
        <Skeleton variant="rectangular" width="100%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">
          Buff Uptimes
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => onToggleShowAll(!showAllBuffs)}
        >
          {showAllBuffs ? 'Show Important Only' : 'Show All Buffs'}
        </Button>
      </Stack>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows buffs applied by friendly players to the selected target
        {!showAllBuffs && ' (filtered to important buffs only)'}
      </Typography>

      {buffUptimes.length > 0 ? (
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <List disablePadding>
            {buffUptimes.map((buff) => {
              const pct = Math.max(0, Math.min(100, buff.uptimePercentage));
              return (
                <ListItem key={buff.abilityGameID} sx={{ py: 1 }} divider>
                  <Box sx={{ width: '100%', position: 'relative' }}>
                    {/* Background progress bar */}
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 48,
                        borderRadius: 2,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                        },
                      }}
                    />
                    
                    {/* Content overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        gap: 1.5,
                      }}
                    >
                      {/* Icon */}
                      {buff.icon ? (
                        <Avatar
                          src={`https://assets.rpglogs.com/img/eso/abilities/${buff.icon}.png`}
                          alt={buff.abilityName}
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: 1, 
                            boxShadow: 1,
                            flexShrink: 0,
                          }}
                          variant="rounded"
                        />
                      ) : (
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32,
                            flexShrink: 0,
                          }} 
                          variant="rounded"
                        >
                          {buff.abilityName.charAt(0)}
                        </Avatar>
                      )}
                      
                      {/* Text content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'white',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {buff.abilityName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.9)',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                          }}
                        >
                          {buff.applications} applications • {buff.uptime.toFixed(1)}s total
                        </Typography>
                      </Box>
                      
                      {/* Percentage */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                          flexShrink: 0,
                        }}
                      >
                        {Math.round(pct)}%
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {showAllBuffs ? 'No friendly buff events found.' : 'No important buff events found. Try showing all buffs.'}
        </Typography>
      )}
    </Box>
  );
};
