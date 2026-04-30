/**
 * DebuffChecklist Component
 * Displays a comprehensive checklist of debuffs applied to the trial dummy showing:
 * - Which debuffs the player is applying
 * - Categorized by major/minor/support
 * - Summary of debuff coverage
 */

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Box, Chip, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

import { DebuffChecklistResult } from '../types/debuffChecklist';

interface DebuffChecklistProps {
  checklistData: DebuffChecklistResult;
}

export const DebuffChecklist: React.FC<DebuffChecklistProps> = ({ checklistData }) => {
  const { majorDebuffs, minorDebuffs, summary } = checklistData;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const StatusDot: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
    <Tooltip title={label}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {active ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: 'success.main' }} />
        ) : (
          <RadioButtonUncheckedIcon
            sx={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}
          />
        )}
        <Typography
          variant="caption"
          color={active ? 'text.primary' : 'text.secondary'}
          sx={{ fontSize: '0.65rem' }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );

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
          py: 0.75,
          px: 1.5,
          borderRadius: 1,
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          },
        }}
      >
        <Typography variant="caption" fontWeight={500} sx={{ flex: 1 }}>
          {debuffName}
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <StatusDot active={isAppliedByPlayer} label="Player" />
          <StatusDot active={isAppliedByDummy} label="Dummy" />
        </Stack>
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
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            label={title}
            color={color}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
          <Typography variant="caption" color="text.secondary">
            {debuffs.length}
          </Typography>
        </Stack>
        <Stack spacing={0}>
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
        <InfoIcon color="action" sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="caption" color="text.secondary" display="block">
          No debuffs detected on the trial dummy.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip
          label={`${summary.totalTrackedDebuffs} Total`}
          size="small"
          color="success"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
        <Chip
          label={`${summary.totalPlayerDebuffs} Player`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
        <Chip
          label={`${summary.totalDummyDebuffs} Dummy`}
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
      </Stack>

      {/* Debuff categories */}
      {renderDebuffCategory('Major Debuffs', majorDebuffs, 'primary')}
      {renderDebuffCategory('Minor Debuffs', minorDebuffs, 'secondary')}
    </Box>
  );
};
