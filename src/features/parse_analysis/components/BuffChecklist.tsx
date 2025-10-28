/**
 * BuffChecklist Component
 * Displays a comprehensive checklist of trial dummy buffs showing:
 * - Which buffs are provided by the trial dummy
 * - Which buffs are also provided by the player (redundant)
 * - Summary of buff coverage
 */

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { BuffChecklistResult } from '../types/buffChecklist';

interface BuffChecklistProps {
  checklistData: BuffChecklistResult;
}

export const BuffChecklist: React.FC<BuffChecklistProps> = ({ checklistData }) => {
  const { majorBuffs, minorBuffs, supportBuffs, redundantBuffs, summary } = checklistData;
  const dummySupportBuffs = React.useMemo(
    () => supportBuffs.filter((buff) => buff.isProvidedByDummy),
    [supportBuffs],
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
            {buffName}
          </Typography>
          {isRedundant && (
            <Tooltip title="This buff is provided by both the dummy and your character. Consider removing it from your build.">
              <Chip
                icon={<WarningIcon />}
                label="Redundant"
                size="small"
                color="warning"
                sx={{ fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
        </Box>

        <FormGroup row>
          <Tooltip title="Provided by the trial dummy">
            <FormControlLabel
              control={<Checkbox checked={isProvidedByDummy} disabled size="small" />}
              label={<Typography variant="caption">Trial Dummy</Typography>}
              sx={{ mr: 2 }}
            />
          </Tooltip>
          <Tooltip title="Provided by your character (skills, sets, or passives)">
            <FormControlLabel
              control={<Checkbox checked={isProvidedByPlayer} disabled size="small" />}
              label={<Typography variant="caption">Player</Typography>}
            />
          </Tooltip>
        </FormGroup>
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
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {title}
          <Chip label={buffs.length} size="small" color={color} />
        </Typography>
        <Card variant="outlined">
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            {buffs.map((buff) =>
              renderBuffItem(
                buff.buffName,
                buff.isProvidedByDummy,
                buff.isProvidedByPlayer,
                buff.isRedundant,
              ),
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      {/* Summary Section */}
      <Card sx={{ mb: 3, backgroundColor: 'background.default' }}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <InfoIcon color="primary" />
            Buff Coverage Summary
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${summary.totalDummyBuffs} Dummy Buffs`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${summary.totalPlayerBuffs} Player Buffs`}
              color="secondary"
              variant="outlined"
            />
            {summary.totalRedundantBuffs > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`${summary.totalRedundantBuffs} Redundant`}
                color="warning"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Redundancy Warning */}
      {redundantBuffs.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Redundant Buffs Detected
          </Typography>
          <Typography variant="body2">
            The following buffs are provided by both the trial dummy and your character:{' '}
            <strong>{redundantBuffs.join(', ')}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Consider removing these from your build to optimize your setup, as the trial dummy
            already provides them.
          </Typography>
        </Alert>
      )}

      {/* Buff Categories */}
      {renderBuffCategory('Major Buffs', majorBuffs, 'primary')}
      {renderBuffCategory('Minor Buffs', minorBuffs, 'secondary')}
      {renderBuffCategory('Support Buffs', dummySupportBuffs, 'info')}

      {/* Help Text */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>How to read this checklist:</strong>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>
              <strong>Trial Dummy</strong> checkbox: The buff is provided by the trial dummy
            </li>
            <li>
              <strong>Player</strong> checkbox: The buff is provided by your character (skills,
              sets, or passives)
            </li>
            <li>
              <strong>Redundant</strong> (⚠️): Both sources provide the same buff - consider
              removing it from your build
            </li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
};
