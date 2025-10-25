/**
 * DebuffChecklist Component
 * Displays a comprehensive checklist of debuffs applied to the trial dummy showing:
 * - Which debuffs the player is applying
 * - Categorized by major/minor/support
 * - Summary of debuff coverage
 */

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { DebuffChecklistResult } from '../types/debuffChecklist';

interface DebuffChecklistProps {
  checklistData: DebuffChecklistResult;
}

export const DebuffChecklist: React.FC<DebuffChecklistProps> = ({ checklistData }) => {
  const { majorDebuffs, minorDebuffs, summary } = checklistData;

  const renderDebuffItem = (
    debuffName: string,
    isAppliedByPlayer: boolean,
    isAppliedByDummy: boolean,
  ): React.ReactElement => {
    return (
      <Box
        key={debuffName}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
          px: 2,
          borderRadius: 1,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography variant="body2" sx={{ minWidth: 180 }}>
            {debuffName}
          </Typography>
        </Box>

        <FormGroup row>
          <Tooltip title="Applied by your character to the trial dummy">
            <FormControlLabel
              control={<Checkbox checked={isAppliedByPlayer} disabled size="small" />}
              label={<Typography variant="caption">Player</Typography>}
            />
          </Tooltip>
          <Tooltip title="Applied by the trial dummy automatically">
            <FormControlLabel
              control={<Checkbox checked={isAppliedByDummy} disabled size="small" />}
              label={<Typography variant="caption">Dummy</Typography>}
            />
          </Tooltip>
        </FormGroup>
      </Box>
    );
  };

  const renderDebuffCategory = (
    title: string,
    debuffs: typeof majorDebuffs,
    color: 'primary' | 'secondary' | 'info',
  ): React.ReactElement | null => {
    if (debuffs.length === 0) return null;

    return (
      <Box key={title} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip label={title} color={color} size="small" />
          <Typography variant="caption" color="text.secondary">
            ({debuffs.length} {debuffs.length === 1 ? 'debuff' : 'debuffs'})
          </Typography>
        </Stack>
        <Stack spacing={0.5}>
          {debuffs.map((item) =>
            renderDebuffItem(item.debuffName, item.isAppliedByPlayer, item.isAppliedByDummy),
          )}
        </Stack>
      </Box>
    );
  };

  if (summary.totalTrackedDebuffs === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <InfoIcon color="action" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          No debuffs detected on the trial dummy.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label={`${summary.totalTrackedDebuffs} Total Debuff${summary.totalTrackedDebuffs === 1 ? '' : 's'}`}
          color="success"
          variant="outlined"
        />
        <Chip label={`${summary.totalPlayerDebuffs} Player`} color="primary" variant="outlined" />
        <Chip label={`${summary.totalDummyDebuffs} Dummy`} color="secondary" variant="outlined" />
      </Stack>

      {/* Debuff Categories */}
      <Stack spacing={2}>
        {renderDebuffCategory('Major Debuffs', majorDebuffs, 'primary')}
        {renderDebuffCategory('Minor Debuffs', minorDebuffs, 'secondary')}
      </Stack>
    </Box>
  );
};
