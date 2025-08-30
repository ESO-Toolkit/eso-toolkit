import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { useReportMasterData } from '../../../hooks';
import { useSelectedFight } from '../../../hooks/useSelectedFight';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { setSelectedTargetId } from '../../../store/ui/uiSlice';
import { useAppDispatch } from '../../../store/useAppDispatch';

export const TargetSelector: React.FC = () => {
  const dispatch = useAppDispatch();

  const fight = useSelectedFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  const handleTargetChange = React.useCallback(
    (event: SelectChangeEvent<number | null>): void => {
      const value = event.target.value;
      dispatch(
        setSelectedTargetId(!value ? null : typeof value === 'string' ? Number(value) : value)
      );
    },
    [dispatch]
  );

  const targetsList = React.useMemo(() => {
    if (!fight?.enemyNPCs) {
      return [];
    }

    const result = [];
    for (const npc of fight?.enemyNPCs) {
      if (!npc?.id) {
        continue;
      }

      const enemy = reportMasterData?.actorsById?.[npc.id];
      if (enemy) {
        result.push({
          id: enemy.id,
          name: enemy.name,
        });
      }
    }

    return result;
  }, [reportMasterData, fight?.enemyNPCs]);

  if (isMasterDataLoading) {
    return null;
  }

  if (!fight?.enemyNPCs?.length) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No players available for selection
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="target-selector-label">Select Target</InputLabel>
        <Select
          labelId="target-selector-label"
          value={selectedTargetId || ''}
          label="Select Target"
          onChange={handleTargetChange}
        >
          <MenuItem value="">
            <em>All Boss Targets</em>
          </MenuItem>
          {targetsList.map((target) => (
            <MenuItem key={target.id} value={target.id || ''}>
              {target.name} (ID: {target.id})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
