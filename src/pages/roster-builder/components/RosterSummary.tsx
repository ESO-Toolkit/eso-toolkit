/**
 * Roster Summary Component
 * Shows composition overview, filled slots, and validation warnings
 */

import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Alert,
  Avatar,
  Button,
} from '@mui/material';
import { Shield as TankIcon, Favorite as HealerIcon, FlashOn as DPSIcon, Add as AddIcon } from '@mui/icons-material';
import React from 'react';

import { UseRosterValidationReturn } from '../hooks/useRosterValidation';
import { getRoleColorSolid } from '../../../utils/roleColors';

interface RosterSummaryProps {
  validation: UseRosterValidationReturn['validation'];
  filledSlots: UseRosterValidationReturn['filledSlots'];
  isEmpty: UseRosterValidationReturn['isEmpty'];
  onCreateNew: () => void;
  onImportFromLogs: () => void;
}

export const RosterSummary: React.FC<RosterSummaryProps> = ({
  validation,
  filledSlots,
  isEmpty,
  onCreateNew,
  onImportFromLogs,
}) => {
  const themeMode = 'dark'; // Could get from theme context

  if (isEmpty) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          border: `2px dashed ${getRoleColorSolid('dps', true)}`,
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              mb: 3,
              bgcolor: 'action.hover',
            }}
          >
            <AddIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Avatar>
        </Box>
        <Typography variant="h5" gutterBottom>
          Start Building Your Roster
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create a 12-player raid roster with tanks, healers, and DPS assignments.
          Configure gear sets, ultimates, and skill lines.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onCreateNew}>
            Create New Roster
          </Button>
          <Button variant="outlined" size="large" startIcon={<AddIcon />} onClick={onImportFromLogs}>
            Import from ESO Logs
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Roster Composition
      </Typography>

      {/* Filled Slots Summary */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TankIcon sx={{ color: getRoleColorSolid('tank', themeMode) }} />
          <Typography variant="body1">
            Tanks: <strong>{filledSlots.tanks}/2</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealerIcon sx={{ color: getRoleColorSolid('healer', themeMode) }} />
          <Typography variant="body1">
            Healers: <strong>{filledSlots.healers}/2</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DPSIcon sx={{ color: getRoleColorSolid('dps', themeMode) }} />
          <Typography variant="body1">
            DPS: <strong>{filledSlots.dps}/8</strong>
          </Typography>
        </Box>
      </Box>

      {/* Total Players */}
      <Typography variant="body2" color="text.secondary">
        Total Players: <strong>{filledSlots.total}/12</strong>
      </Typography>

      {/* Completion Status */}
      {filledSlots.total === 12 && (
        <Chip
          label="Roster Complete"
          color="success"
          size="small"
          sx={{ mt: 1 }}
        />
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <>
          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Warnings ({validation.warningCount})
            </Typography>
            <Stack spacing={1}>
              {validation.warnings.map((warning, index) => (
                <Alert
                  key={index}
                  severity={warning.severity === 'error' ? 'error' : 'warning'}
                  sx={{ py: 0.5, mb: warning.severity === 'error' ? 1 : 0 }}
                >
                  {warning.message}
                </Alert>
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* Empty State Action */}
      {filledSlots.total === 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No players assigned. Start by filling in player names or importing from ESO Logs.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
