import { Box, Paper, Typography, List, ListItem, ListItemButton, Skeleton } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: 'numeric', 
    minute: '2-digit'
  });
}

function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

interface ReportFightsViewProps {
  fights: FightFragment[] | null | undefined;
  loading: boolean;
  fightId: string | undefined | null;
  reportId: string | undefined | null;
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  fightId,
  reportId,
}) => {
  const navigate = useNavigate();

  const handleFightSelect = React.useCallback(
    (id: number) => {
      navigate(`/report/${reportId}/fight/${id}`);
    },
    [navigate, reportId]
  );

  const groups = React.useMemo(() => {
    const result: Record<string, FightFragment[]> = {};
    if (!fights) {
      return {};
    }

    fights.forEach((fight: FightFragment) => {
      // Filter out invalid fights (no start/end time or invalid duration)
      if (!fight.startTime || !fight.endTime || fight.endTime <= fight.startTime) {
        return;
      }
      
      const groupName = fight.difficulty == null ? 'Trash' : fight.name || 'Unknown';
      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(fight);
    });

    return result;
  }, [fights]);

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Skeleton variant="text" width={180} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={260} sx={{ mb: 2 }} />
        {[...Array(3)].map((_, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Skeleton variant="text" width={140} height={28} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[...Array(6)].map((__, j) => (
                <Skeleton key={j} variant="rounded" width={88} height={36} />
              ))}
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  if (!fights?.length) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1">No fights available</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Select a Fight
        </Typography>
        {Object.entries(groups).map(([groupName, groupFights]) => (
          <Box key={groupName} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {groupName}
            </Typography>
            <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {groupFights.map((fight, idx) => {
                const isWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
                const fightLabel = isWipe ? `Wipe ${idx + 1}` : `Clear ${idx + 1}`;
                return (
                  <ListItem key={fight.id} sx={{ width: 'auto', p: 0 }}>
                    <ListItemButton
                      selected={fightId === String(fight.id)}
                      onClick={() => handleFightSelect(fight.id)}
                      sx={{
                        minWidth: 140,
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        py: 1,
                        px: 1.5,
                      }}
                    >
                      <Typography variant="button" color={isWipe ? 'error' : 'success'} sx={{ mb: 0.5 }}>
                        {fightLabel}
                      </Typography>
                      {fight.startTime && fight.endTime && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            lineHeight: 1
                          }}
                        >
                          {formatTimestamp(fight.startTime)} • {formatDuration(fight.startTime, fight.endTime)}
                        </Typography>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Paper>
    </>
  );
};
