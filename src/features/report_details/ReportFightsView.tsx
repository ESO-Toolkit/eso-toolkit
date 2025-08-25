import { Box, Paper, Typography, List, ListItem, ListItemButton, Skeleton } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

interface ReportFightsViewProps {
  fights: Array<FightFragment | null> | undefined | null;
  loading: boolean;
  error: string | null;
  fightId: string | undefined;
  reportId: string | undefined;
  reportStartTime?: number;
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  error,
  fightId,
  reportId,
  reportStartTime,
}) => {
  const navigate = useNavigate();

  const handleFightSelect = (id: number): void => {
    navigate(`/report/${reportId}/fight/${id}`);
  };

  const formatClock = (msEpoch: number): string => {
    // Use browser locale and timezone; show 12-hour time with AM/PM, no seconds
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(msEpoch));
    } catch {
      // Fallback without Intl
      const d = new Date(msEpoch);
      let h = d.getHours() % 12;
      if (h === 0) h = 12;
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
      return `${h}:${m} ${ampm}`;
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m === 0 ? `${s}s` : `${m}:${String(s).padStart(2, '0')}`;
  };

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

  // Fallback when nothing is loading and there are no fights to show
  if (!fights?.length) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Could not find requested fight.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste an ESO Logs report URL above and click "Load Log" to view fights.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {fights.length > 0 && fightId == null && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Select a Fight
          </Typography>
          {(() => {
            const groups: { [key: string]: FightFragment[] } = {};
            fights.forEach((fight: FightFragment | null) => {
              if (fight === null) {
                return;
              }

              const groupName = fight.difficulty == null ? 'Trash' : fight.name || 'Unknown';
              if (!groups[groupName]) groups[groupName] = [];
              groups[groupName].push(fight);
            });
            return Object.entries(groups).map(([groupName, groupFights]) => (
              <Box key={groupName} sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {groupName}
                </Typography>
                <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {groupFights.map((fight, idx) => (
                    <ListItem key={fight.id} sx={{ width: 'auto', p: 0 }}>
                      <ListItemButton
                        selected={fightId === String(fight.id)}
                        onClick={() => handleFightSelect(fight.id)}
                        sx={{
                          minWidth: 96,
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexDirection: 'column',
                          py: 1,
                          transition: 'border-radius 120ms ease',
                          '&:hover': {
                            borderRadius: '8px',
                          },
                        }}
                      >
                        <Typography variant="button">Pull {idx + 1}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reportStartTime != null
                            ? `${formatClock(reportStartTime + fight.startTime)} • `
                            : ''}
                          <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
                            {formatDuration(fight.endTime - fight.startTime)}
                          </Typography>
                        </Typography>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ));
          })()}
        </Paper>
      )}
    </>
  );
};
