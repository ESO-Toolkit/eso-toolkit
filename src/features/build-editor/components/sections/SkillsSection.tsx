/**
 * Skills Section — front bar + back bar, each with 5 abilities + 1 ultimate.
 * Reuses searchSkills / getSkillById from loadout-manager data utilities.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import type { SkillData } from '../../../../data/types/skill-line-types';
import { getSkillById, searchSkills } from '../../../loadout-manager/data/skillLineSkills';
import type { SkillsConfig } from '../../../loadout-manager/types/loadout.types';
import { setSkills } from '../../store/buildEditorSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILL_SLOTS = [3, 4, 5, 6, 7];
const ULTIMATE_SLOT = 8;
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];
const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const SLOT_LABELS: Record<number, string> = { 3: '1', 4: '2', 5: '3', 6: '4', 7: '5', 8: 'Ult' };

// ─── Single Skill Slot ────────────────────────────────────────────────────────

interface SkillSlotProps {
  slotIndex: number;
  barIndex: 0 | 1;
  abilityId: number | undefined;
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillSlot: React.FC<SkillSlotProps> = ({
  slotIndex,
  barIndex,
  abilityId,
  onSelect,
  onRemove,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const skill = abilityId ? getSkillById(abilityId) : null;

  const [inputValue, setInputValue] = useState('');

  const options = useMemo<SkillData[]>(() => {
    if (inputValue.length < MIN_SEARCH) return [];
    return searchSkills(inputValue).slice(0, MAX_RESULTS);
  }, [inputValue]);

  const handleInputChange = (
    _: React.SyntheticEvent,
    val: string,
    reason: AutocompleteInputChangeReason,
  ): void => {
    if (reason !== 'reset') setInputValue(val);
  };

  const isUltimate = slotIndex === ULTIMATE_SLOT;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1,
        px: 1.5,
        borderRadius: 1.5,
        background: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
        border: `1px solid ${isDark ? alpha('#fff', 0.07) : alpha('#000', 0.06)}`,
      }}
    >
      {/* Slot badge */}
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isUltimate
            ? alpha('#ffb300', isDark ? 0.2 : 0.15)
            : isDark
            ? alpha('#38bdf8', 0.12)
            : alpha('#0f172a', 0.07),
          border: `1px solid ${
            isUltimate
              ? alpha('#ffb300', 0.4)
              : isDark
              ? alpha('#38bdf8', 0.25)
              : alpha('#0f172a', 0.15)
          }`,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            lineHeight: 1,
            color: isUltimate ? '#ffb300' : 'text.secondary',
            fontSize: 10,
          }}
        >
          {SLOT_LABELS[slotIndex]}
        </Typography>
      </Box>

      {/* Search / display */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Autocomplete
          size="small"
          options={options}
          getOptionLabel={(o: SkillData) => o.name}
          filterOptions={(x) => x}
          inputValue={skill ? skill.name : inputValue}
          onInputChange={handleInputChange}
          onChange={(_, val: SkillData | null) => {
            if (val) {
              onSelect(barIndex, slotIndex, val.id);
              setInputValue('');
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Empty Slot"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'transparent',
                  fontSize: 13,
                },
              }}
            />
          )}
          renderOption={(props, option: SkillData) => (
            <Box component="li" {...props} key={option.id}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                {option.skillLineName && (
                  <Typography variant="caption" color="text.disabled">
                    {option.skillLineName}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          noOptionsText={
            inputValue.length < MIN_SEARCH
              ? `Type ${MIN_SEARCH}+ chars to search`
              : 'No skills found'
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          sx={{ width: '100%' }}
        />
      </Box>

      {/* Remove */}
      {abilityId && (
        <Tooltip title="Remove skill">
          <IconButton
            size="small"
            onClick={() => onRemove(barIndex, slotIndex)}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// ─── Skill Bar ────────────────────────────────────────────────────────────────

interface SkillBarProps {
  label: string;
  barIndex: 0 | 1;
  bar: { [slotIndex: number]: number };
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillBar: React.FC<SkillBarProps> = ({ label, barIndex, bar, onSelect, onRemove }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.75, display: 'block' }}>
      {label}
    </Typography>
    <Stack spacing={0.75} divider={<Divider sx={{ opacity: 0.25 }} />}>
      {ALL_SLOTS.map((slot) => (
        <SkillSlot
          key={slot}
          slotIndex={slot}
          barIndex={barIndex}
          abilityId={bar[slot]}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </Stack>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SkillsSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const handleSelect = useCallback(
    (barIndex: 0 | 1, slotIndex: number, abilityId: number): void => {
      const updated: SkillsConfig = {
        ...setup.skills,
        [barIndex]: { ...setup.skills[barIndex], [slotIndex]: abilityId },
      };
      dispatch(setSkills(updated));
    },
    [dispatch, setup.skills],
  );

  const handleRemove = useCallback(
    (barIndex: 0 | 1, slotIndex: number): void => {
      const bar = { ...setup.skills[barIndex] };
      delete bar[slotIndex];
      dispatch(setSkills({ ...setup.skills, [barIndex]: bar }));
    },
    [dispatch, setup.skills],
  );

  return (
    <Stack spacing={3}>
      <SkillBar
        label="Frontbar"
        barIndex={0}
        bar={setup.skills[0]}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />
      <Divider />
      <SkillBar
        label="Backbar"
        barIndex={1}
        bar={setup.skills[1]}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />
    </Stack>
  );
};
