import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';

export interface StatusEffectUptime {
  abilityGameID: number;
  abilityName: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
  isDebuff: boolean;
}

interface StatusEffectUptimesViewProps {
  selectedTargetId: string | null;
  statusEffectUptimes: StatusEffectUptime[];
  isLoading: boolean;
  reportId: string | null;
  fightId: string | null;
  showingBossTargets: boolean;
}

export const StatusEffectUptimesView: React.FC<StatusEffectUptimesViewProps> = ({
  selectedTargetId,
  statusEffectUptimes,
  isLoading,
  reportId,
  fightId,
  showingBossTargets,
}) => {
  const createEsoLogsUrl = (abilityGameID: number, isDebuff: boolean): string | null => {
    // Only create URL for specific selected targets, not when showing all boss targets
    if (!reportId || !fightId) return null;

    let url = `https://www.esologs.com/reports/${reportId}?fight=${fightId}&type=auras&hostility=1&ability=${abilityGameID}`;

    if (isDebuff) {
      url += '&spells=debuffs';
    }

    if (selectedTargetId) {
      url += `&source=${selectedTargetId}`;
    }

    return url;
  };
  if (!selectedTargetId && !showingBossTargets) {
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
    const message = showingBossTargets
      ? 'No status effects found for boss targets.'
      : 'No status effects found for the selected target.';
    return <Alert severity="info">{message}</Alert>;
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {showingBossTargets
          ? 'Showing status effects for all boss targets'
          : `Target ID: ${selectedTargetId}`}
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Effect</TableCell>
              <TableCell align="right">Applications</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell align="right">Uptime %</TableCell>
              <TableCell align="right">ESO Logs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statusEffectUptimes.map((uptime) => {
              const formatDuration = (seconds: number): string => {
                if (seconds < 60) {
                  return `${seconds.toFixed(1)}s`;
                }
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
              };

              const getUptimeColor = (percentage: number): 'success' | 'warning' | 'error' => {
                if (percentage >= 80) return 'success';
                if (percentage >= 40) return 'warning';
                return 'error';
              };

              const esoLogsUrl = createEsoLogsUrl(uptime.abilityGameID, uptime.isDebuff);

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
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {esoLogsUrl ? (
                      <Tooltip title="View on ESO Logs">
                        <IconButton
                          size="small"
                          onClick={() => window.open(esoLogsUrl, '_blank')}
                          sx={{ color: 'primary.main' }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        -
                      </Typography>
                    )}
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
