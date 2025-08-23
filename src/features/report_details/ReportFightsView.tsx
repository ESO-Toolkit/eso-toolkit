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

const ReportFightsView: React.FC<ReportFightsViewProps> = ({
  fights,
  loading,
  error,
  fightId,
  reportId,
}) => {
  const navigate = useNavigate();

  const handleFightSelect = (id: number) => {
    navigate(`/report/${reportId}/fight/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading fights...</Typography>
      </Box>
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
                  {groupFights.map((fight, idx) => (
                    <ListItem key={fight.id} sx={{ width: 'auto', p: 0 }}>
                      <ListItemButton
                        selected={fightId === String(fight.id)}
                        onClick={() => handleFightSelect(fight.id)}
                        sx={{ minWidth: 48, justifyContent: 'center' }}
                      >
                        <Typography variant="button">Pull {idx + 1}</Typography>
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

export default ReportFightsView;
