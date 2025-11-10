/**
 * Champion Points Selector Component
 * Placeholder for CP selection - full implementation coming soon
 */

import { Construction } from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import React from 'react';

import { ChampionPointsConfig } from '../types/loadout.types';

interface ChampionPointSelectorProps {
  championPoints: ChampionPointsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// CP slot indices (1-12)
const CP_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// CP Tree names (placeholder)
const CP_TREES = {
  craft: 'Craft',
  warfare: 'Warfare',
  fitness: 'Fitness',
};

export const ChampionPointSelector: React.FC<ChampionPointSelectorProps> = ({
  championPoints,
}) => {
  // Group slots by tree (placeholder logic - 4 slots per tree)
  const slotsByTree = {
    craft: CP_SLOTS.slice(0, 4),
    warfare: CP_SLOTS.slice(4, 8),
    fitness: CP_SLOTS.slice(8, 12),
  };

  const getSlotStatus = (slotIndex: number): 'empty' | 'filled' => {
    return championPoints[slotIndex] ? 'filled' : 'empty';
  };

  const getFilledCount = (): number => {
    return Object.keys(championPoints).length;
  };

  return (
    <Stack spacing={3}>
      {/* Placeholder Alert */}
      <Alert
        severity="info"
        icon={<Construction />}
        sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          🚧 Champion Points - Coming Soon
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          This is a placeholder for the Champion Points selection system. Full implementation
          with CP trees, star selection, and slottable management will be added in the next phase.
        </Typography>
      </Alert>

      {/* Progress Summary */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Champion Points Selected</Typography>
          <Chip
            label={`${getFilledCount()} / ${CP_SLOTS.length} slots filled`}
            color={getFilledCount() === CP_SLOTS.length ? 'success' : 'default'}
          />
        </Stack>
      </Paper>

      {/* CP Trees Grid */}
      <Grid container spacing={2}>
        {Object.entries(slotsByTree).map(([treeName, slots]) => (
          <Grid size={{ xs: 12, md: 4 }} key={treeName}>
            <CPTree
              treeName={CP_TREES[treeName as keyof typeof CP_TREES]}
              slots={slots}
              championPoints={championPoints}
              getSlotStatus={getSlotStatus}
            />
          </Grid>
        ))}
      </Grid>

      {/* Implementation Notes */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Planned Features:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="body2">
            Browse and select CP stars from each tree
          </Typography>
          <Typography component="li" variant="body2">
            Multi-select interface for slottable abilities (up to 12 slots)
          </Typography>
          <Typography component="li" variant="body2">
            Visual tree representation with star icons
          </Typography>
          <Typography component="li" variant="body2">
            Search and filter CP stars by name or effect
          </Typography>
          <Typography component="li" variant="body2">
            Import/export CP configurations
          </Typography>
        </Box>
      </Paper>
    </Stack>
  );
};

interface CPTreeProps {
  treeName: string;
  slots: number[];
  championPoints: ChampionPointsConfig;
  getSlotStatus: (slotIndex: number) => 'empty' | 'filled';
}

const CPTree: React.FC<CPTreeProps> = ({ treeName, slots, championPoints, getSlotStatus }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {treeName}
        </Typography>
        <Stack spacing={1}>
          {slots.map((slotIndex) => {
            const status = getSlotStatus(slotIndex);
            const cpId = championPoints[slotIndex];

            return (
              <Paper
                key={slotIndex}
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: status === 'filled' ? 'success.light' : 'grey.100',
                  borderColor: status === 'filled' ? 'success.main' : 'grey.300',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Slot {slotIndex}</Typography>
                  {cpId ? (
                    <Chip label={`CP ID: ${cpId}`} size="small" color="success" />
                  ) : (
                    <Chip label="Empty" size="small" variant="outlined" />
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
