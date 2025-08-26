import { Box, Paper, Typography, List, ListItem, ListItemButton, Skeleton } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';

import { FightFragment } from '../../graphql/generated';

interface ReportFightsViewProps {
  fights: FightFragment[] | null | undefined;
  loading: boolean;
<<<<<<< HEAD
  fightId: string | undefined;
  reportId: string | undefined;
  reportStartTime: number | null | undefined;
=======
  fightId: string | undefined | null;
  reportId: string | undefined | null;
<<<<<<< HEAD
>>>>>>> 66d4400 (Fixed report fights not loading (#35))
=======
  reportStartTime: number | null | undefined;
>>>>>>> ca1e706 (ReportFights list: show start time and duration; pass reportStartTime from report data)
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  fightId,
  reportId,
  reportStartTime,
}) => {
  const navigate = useNavigate();

  const handleFightSelect = React.useCallback(
    (id: number) => {
      navigate(`/report/${reportId}/fight/${id}`);
    },
    [navigate, reportId]
  );

<<<<<<< HEAD
  // Outcome resolver for subtle coloring
  const getFightOutcome = (f: FightFragment | null | undefined): 'kill' | 'wipe' | 'trash' => {
    const p = f?.bossPercentage;
    if (p == null) return 'trash';
    // Treat small float variance as kill
    if (p <= 0.1) return 'kill';
    return 'wipe';
  };

=======
>>>>>>> ca1e706 (ReportFights list: show start time and duration; pass reportStartTime from report data)
  const formatDuration = React.useCallback((ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
<<<<<<< HEAD
    return `${hours}:${remMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const formatClock = React.useCallback((ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
=======
    return `${hours}:${remMinutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
>>>>>>> ca1e706 (ReportFights list: show start time and duration; pass reportStartTime from report data)
  }, []);

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

  return (
    <>
      {fights?.length && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Select a Fight
          </Typography>
          {(() => {
            const groups: { [key: string]: FightFragment[] } = {};
            fights.forEach((fight: FightFragment) => {
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
<<<<<<< HEAD
                  {groupFights.map((fight, idx) => (
                    <ListItem key={fight.id} sx={{ width: 'auto', p: 0 }}>
                      <ListItemButton
                        selected={fightId === String(fight.id)}
                        onClick={() => handleFightSelect(fight.id)}
                        sx={(theme) => {
                          const outcome = getFightOutcome(fight);
                          const baseColor =
                            outcome === 'kill'
                              ? theme.palette.success.main
                              : outcome === 'wipe'
                              ? theme.palette.error.main
                              : theme.palette.grey[500];
                          const bg = alpha(baseColor, 0.08);
                          const bgHover = alpha(baseColor, 0.14);
                          return {
                            minWidth: 96,
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            py: 1,
                            px: 1.25,
                            borderRadius: '4px',
                            backgroundColor: bg,
                            transition: 'border-radius 120ms ease, background-color 120ms ease',
                            '&:hover': {
                              borderRadius: '4px',
                              backgroundColor: bgHover,
                            },
                            '&&.Mui-selected': {
                              backgroundColor: bg,
                              borderRadius: '4px',
                            },
                            '&&.Mui-selected:hover': {
                              backgroundColor: bgHover,
                              borderRadius: '4px',
                            },
                          };
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
=======
                  {groupFights.map((fight, idx) => {
                    const isWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
                    const fightLabel = isWipe ? `Wipe ${idx + 1}` : `Clear ${idx + 1}`;
                    const startText =
                      reportStartTime != null
                        ? new Date(reportStartTime + fight.startTime).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : null;
                    const durationText = formatDuration(fight.endTime - fight.startTime);
                    return (
                      <ListItem key={fight.id} sx={{ width: 'auto', p: 0 }}>
                        <ListItemButton
                          selected={fightId === String(fight.id)}
                          onClick={() => handleFightSelect(fight.id)}
                          sx={{
                            minWidth: 48,
                            justifyContent: 'center',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1 }}>
                            <Typography variant="button" color={isWipe ? 'error' : 'success'}>
                              {fightLabel}
                            </Typography>
                            {startText && (
                              <Typography variant="caption" color="text.secondary">
                                {startText} • {durationText}
                              </Typography>
                            )}
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
>>>>>>> ca1e706 (ReportFights list: show start time and duration; pass reportStartTime from report data)
                </List>
              </Box>
            ));
          })()}
        </Paper>
      )}
    </>
  );
};
