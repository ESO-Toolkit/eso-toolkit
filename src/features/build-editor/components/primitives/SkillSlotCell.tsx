/**
 * SkillSlotCell
 * Game-style skill slot with glow on hover and empty-state pulsing.
 * Used inside the skill bar — each cell represents one ability or ultimate slot.
 */

import { Close as CloseIcon } from '@mui/icons-material';
import { Autocomplete, Box, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import type { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useMemo, useState } from 'react';

import type { SkillData } from '../../../../data/types/skill-line-types';
import { getSkillById, searchSkills } from '../../../loadout-manager/data/skillLineSkills';

const MIN_SEARCH = 2;
const MAX_RESULTS = 100;

const SLOT_LABELS: Record<number, string> = {
  3: '1',
  4: '2',
  5: '3',
  6: '4',
  7: '5',
  8: 'Ult',
};

interface SkillSlotCellProps {
  slotIndex: number;
  barIndex: 0 | 1;
  abilityId: number | undefined;
  onSelect: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onRemove: (barIndex: 0 | 1, slotIndex: number) => void;
  /** Extra props from dnd-kit for drag handle */
  dragHandleProps?: Record<string, unknown>;
}

export const SkillSlotCell: React.FC<SkillSlotCellProps> = ({
  slotIndex,
  barIndex,
  abilityId,
  onSelect,
  onRemove,
  dragHandleProps,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const skill = abilityId ? getSkillById(abilityId) : null;
  const isUltimate = slotIndex === 8;

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

  const accentColor = isUltimate ? '#ffb300' : 'var(--be-accent, #38bdf8)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1.25,
        borderRadius: 2,
        background: skill
          ? isDark
            ? alpha(isUltimate ? '#ffb300' : '#38bdf8', 0.06)
            : alpha(isUltimate ? '#ffb300' : '#0f172a', 0.03)
          : isDark
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(0, 0, 0, 0.015)',
        border: `1px solid ${
          skill
            ? isDark
              ? alpha(isUltimate ? '#ffb300' : '#38bdf8', 0.2)
              : alpha(isUltimate ? '#ffb300' : '#0f172a', 0.12)
            : isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)'
        }`,
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: isDark
            ? alpha(isUltimate ? '#ffb300' : '#38bdf8', 0.35)
            : alpha(isUltimate ? '#ffb300' : '#0f172a', 0.2),
        },
        ...(!skill && {
          '@keyframes subtlePulse': {
            '0%, 100%': { opacity: 0.6 },
            '50%': { opacity: 1 },
          },
          '& .slot-badge': {
            animation: 'subtlePulse 2s ease-in-out infinite',
          },
        }),
      }}
    >
      {/* Drag handle (if provided by dnd-kit) */}
      {dragHandleProps && (
        <Box
          {...dragHandleProps}
          sx={{
            cursor: 'grab',
            color: 'text.disabled',
            display: 'flex',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          ⠿
        </Box>
      )}

      {/* Slot badge */}
      <Box
        className="slot-badge"
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
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
              : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.07)',
          border: `1px solid ${
            isUltimate
              ? alpha('#ffb300', 0.4)
              : isDark
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                : 'rgba(var(--be-accent-rgb, 15, 23, 42), 0.15)'
          }`,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            lineHeight: 1,
            color: accentColor,
            fontSize: 10,
          }}
        >
          {SLOT_LABELS[slotIndex] ?? slotIndex}
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
                  fontSize: 12,
                },
              }}
            />
          )}
          renderOption={(props, option: SkillData) => (
            <Box component="li" {...props} key={option.id}>
              <Box>
                <Typography variant="body2" fontWeight={600} fontSize={12}>
                  {option.name}
                </Typography>
                {option.skillLineName && (
                  <Typography variant="caption" color="text.disabled" fontSize={10}>
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
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
