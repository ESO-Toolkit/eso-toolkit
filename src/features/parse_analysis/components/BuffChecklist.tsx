/**
 * BuffChecklist Component
 * Displays a comprehensive checklist of trial dummy buffs showing:
 * - Which buffs are provided by the trial dummy
 * - Which buffs are also provided by the player (redundant)
 * - Summary of buff coverage
 */

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningIcon from '@mui/icons-material/Warning';
import { Box, Chip, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';

import { BuffChecklistResult } from '../types/buffChecklist';

interface BuffChecklistProps {
  checklistData: BuffChecklistResult;
}

export const BuffChecklist: React.FC<BuffChecklistProps> = ({ checklistData }) => {
  const { majorBuffs, minorBuffs, supportBuffs, redundantBuffs, summary } = checklistData;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const dummySupportBuffs = React.useMemo(
    () => supportBuffs.filter((buff) => buff.isProvidedByDummy),
    [supportBuffs],
  );

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

  const renderBuffItem = (
    buffName: string,
    isProvidedByDummy: boolean,
    isProvidedByPlayer: boolean,
    isRedundant: boolean,
  ): React.ReactElement => {
    return (
      <Box
        key={buffName}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 0.75,
          px: 1.5,
          borderRadius: 1,
          borderLeft: isRedundant ? '3px solid' : '3px solid transparent',
          borderLeftColor: isRedundant ? 'warning.main' : 'transparent',
          backgroundColor: isRedundant
            ? isDark
              ? 'rgba(255, 152, 0, 0.06)'
              : 'rgba(255, 152, 0, 0.04)'
            : 'transparent',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" fontWeight={500}>
            {buffName}
          </Typography>
          {isRedundant && (
            <Tooltip title="Both dummy and player provide this buff. Consider removing from your build.">
              <Chip
                icon={<WarningIcon sx={{ fontSize: '12px !important' }} />}
                label="Redundant"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.6rem', '& .MuiChip-icon': { ml: 0.5 } }}
              />
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <StatusDot active={isProvidedByDummy} label="Dummy" />
          <StatusDot active={isProvidedByPlayer} label="Player" />
        </Stack>
      </Box>
    );
  };

  const renderBuffCategory = (
    title: string,
    buffs: typeof majorBuffs,
    color: 'primary' | 'secondary' | 'info',
  ): React.ReactElement | null => {
    if (buffs.length === 0) return null;

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
            {buffs.length}
          </Typography>
        </Stack>
        <Stack spacing={0}>
          {buffs.map((buff) =>
            renderBuffItem(
              buff.buffName,
              buff.isProvidedByDummy,
              buff.isProvidedByPlayer,
              buff.isRedundant,
            ),
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Box>
      {/* Summary chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip
          label={`${summary.totalDummyBuffs} Dummy`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
        <Chip
          label={`${summary.totalPlayerBuffs} Player`}
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
        {summary.totalRedundantBuffs > 0 && (
          <Chip
            icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
            label={`${summary.totalRedundantBuffs} Redundant`}
            size="small"
            color="warning"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        )}
      </Stack>

      {/* Redundancy callout */}
      {redundantBuffs.length > 0 && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1.5,
            borderLeft: '3px solid',
            borderLeftColor: 'warning.main',
            backgroundColor: isDark ? 'rgba(255, 152, 0, 0.06)' : 'rgba(255, 152, 0, 0.04)',
          }}
        >
          <Typography variant="caption" fontWeight={600} color="warning.main">
            Redundant Buffs
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            {redundantBuffs.join(', ')} — already provided by the trial dummy
          </Typography>
        </Box>
      )}

      {/* Buff categories */}
      {renderBuffCategory('Major', majorBuffs, 'primary')}
      {renderBuffCategory('Minor', minorBuffs, 'secondary')}
      {renderBuffCategory('Support', dummySupportBuffs, 'info')}
    </Box>
  );
};
