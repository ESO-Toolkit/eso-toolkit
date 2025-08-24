import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';

interface ReportFightsViewProps {
  fights: FightFragment[];
  loading: boolean;
  error: string | null;
  fightId: string | undefined;
  reportId: string | undefined;
}

export const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  error,
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading fights...</Typography>
      </Box>
    );
  }

  // Fallback when nothing is loading and there are no fights to show
  if (!loading && fights.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Typography variant="h6" sx={{ mb: 1 }}>
          No data loaded yet
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
                  {groupFights.map((fight, idx) => {
                    const isWipe = fight.bossPercentage && fight.bossPercentage > 0.01;
                    const fightLabel = isWipe ? `Wipe ${idx + 1}` : `Clear ${idx + 1}`;
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
                          <Typography variant="button" color={isWipe ? 'error' : 'success'}>
                            {fightLabel}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            ));
          })()}
        </Paper>
      )}
    </>
  );
};
