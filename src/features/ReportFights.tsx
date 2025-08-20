import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
          <List>
            {fights.map((fight: FightFragment) => (
              <ListItem key={fight.id} divider>
                <ListItemButton
                  selected={fightId === fight.id}
                  onClick={() => handleFightSelect(fight.id)}
                >
                  <ListItemText
                    primary={fight.name}
                    secondary={`Time: ${fight.startTime} - ${fight.endTime}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </>
  );
};

export default ReportFights;
