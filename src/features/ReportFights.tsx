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
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../AuthContext';
import { FightFragment } from '../graphql/generated';
import { useReportFightParams } from '../hooks/useReportFightParams';
import { fetchReportData } from '../store/reportSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

const ReportFights: React.FC = () => {
  const { reportId, fightId } = useReportFightParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const fights = useSelector((state: RootState) => state.report.fights);
  const loading = useSelector((state: RootState) => state.report.loading);
  const error = useSelector((state: RootState) => state.report.error);

  React.useEffect(() => {
    if (reportId && accessToken && fights.length === 0 && !loading && !error) {
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [reportId, accessToken, fights.length, loading, error, dispatch]);

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
                        selected={fightId === fight.id}
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

export default ReportFights;
