import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import React from 'react';

interface StatusEffectUptime {
  abilityGameID: number;
  abilityName: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

interface StatusEffectUptimesViewProps {
  selectedTargetId: string | null;
  statusEffectUptimes: StatusEffectUptime[];
  isLoading: boolean;
}

const StatusEffectUptimesView: React.FC<StatusEffectUptimesViewProps> = ({
  selectedTargetId,
  statusEffectUptimes,
  isLoading,
}) => {
  if (!selectedTargetId) {
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status Effect Uptimes
        </Typography>
        <Alert severity="info">Please select a target enemy to view status effect uptimes.</Alert>
      </Paper>
    );
  }

  if (isLoading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading status effect data...</Typography>
        </Box>
      </Paper>
    );
  }

  if (statusEffectUptimes.length === 0) {
    return <Alert severity="info">No status effects found for the selected target.</Alert>;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Target ID: {selectedTargetId}
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Effect</TableCell>
              <TableCell align="right">Applications</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell align="right">Uptime %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statusEffectUptimes.map((uptime) => {
              const formatDuration = (seconds: number) => {
                if (seconds < 60) {
                  return `${seconds.toFixed(1)}s`;
                }
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
              };

              const getUptimeColor = (percentage: number) => {
                if (percentage >= 80) return 'success';
                if (percentage >= 60) return 'warning';
                return 'error';
              };

              return (
                <TableRow key={uptime.abilityGameID}>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="medium">
                      {uptime.abilityName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {uptime.abilityGameID}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={uptime.applications} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatDuration(uptime.uptime)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${uptime.uptimePercentage.toFixed(1)}%`}
                      size="small"
                      color={getUptimeColor(uptime.uptimePercentage)}
                      variant="filled"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default StatusEffectUptimesView;
