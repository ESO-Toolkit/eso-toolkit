/**
 * Skill Selector Component
 * Allows selection and management of skills for front and back bars
 */

import { Close as CloseIcon } from '@mui/icons-material';
import Autocomplete, { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { getSkillById, searchSkills, getSkillStats } from '../data/skillLineSkills';
import { updateSkills } from '../store/loadoutSlice';
import { SkillsConfig } from '../types/loadout.types';
import type { SkillData } from '../../../data/types/skill-line-types';

interface SkillSelectorProps {
  skills: SkillsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// Skill slot indices (ESO uses 3-8 for abilities, with 8 being the ultimate)
const SKILL_SLOTS = [3, 4, 5, 6, 7]; // Regular abilities
const ULTIMATE_SLOT = 8;

// Minimum characters required to trigger search
const MIN_SEARCH_LENGTH = 2;
// Maximum number of search results to display
const MAX_SEARCH_RESULTS = 100;

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  skills,
  trialId,
  pageIndex,
  setupIndex,
}): React.ReactElement => {
  const dispatch = useDispatch();

  // Log skill statistics on mount (dev mode only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const stats = getSkillStats();
      console.log('📚 Skill Line Data Loaded:', stats);
    }
  }, []);

  const handleSkillChange = (barIndex: 0 | 1, slotIndex: number, abilityId: number): void => {
    const updatedSkills = {
      ...skills,
      [barIndex]: {
        ...skills[barIndex],
        [slotIndex]: abilityId,
      },
    };
    dispatch(updateSkills({ trialId, pageIndex, setupIndex, skills: updatedSkills }));
  };

  const handleSkillRemove = (barIndex: 0 | 1, slotIndex: number): void => {
    const updatedBar = { ...skills[barIndex] };
    delete updatedBar[slotIndex];
    const updatedSkills = {
      ...skills,
      [barIndex]: updatedBar,
    };
    dispatch(updateSkills({ trialId, pageIndex, setupIndex, skills: updatedSkills }));
  };

  return (
    <Stack spacing={1.75} sx={{ width: '100%' }}>
      {/* Front Bar */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
          Front Bar
        </Typography>
        <SkillBarRow
          barIndex={0}
          skills={skills[0] || {}}
          onSkillChange={handleSkillChange}
          onSkillRemove={handleSkillRemove}
        />
      </Box>

      {/* Back Bar */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
          Back Bar
        </Typography>
        <SkillBarRow
          barIndex={1}
          skills={skills[1] || {}}
          onSkillChange={handleSkillChange}
          onSkillRemove={handleSkillRemove}
        />
      </Box>
    </Stack>
  );
};

interface SkillBarRowProps {
  barIndex: 0 | 1;
  skills: { [slotIndex: number]: number };
  onSkillChange: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onSkillRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillBarRow: React.FC<SkillBarRowProps> = ({
  barIndex,
  skills,
  onSkillChange,
  onSkillRemove,
}) => {
  return (
    <Stack
      direction="row"
      spacing={0.9}
      alignItems="center"
      sx={{
  flexWrap: { xs: 'wrap', md: 'nowrap' },
        rowGap: 0.75,
        justifyContent: { xs: 'center', md: 'flex-start' },
        maxWidth: '100%',
        flexShrink: 1,
        minWidth: 0,
      }}
      useFlexGap
    >
      {/* Regular Skill Slots (Slots 1-5) */}
      {SKILL_SLOTS.map((slotIndex, idx) => (
        <SkillSlotIcon
          key={slotIndex}
          barIndex={barIndex}
          slotIndex={slotIndex}
          slotLabel={`Slot ${idx + 1}`}
          currentSkillId={skills[slotIndex]}
          onSkillChange={onSkillChange}
          onSkillRemove={onSkillRemove}
        />
      ))}

      {/* Divider before Ultimate */}
      <Box sx={{ width: 2, height: 48, bgcolor: 'primary.main', borderRadius: 1, mx: 0.25 }} />

      {/* Ultimate Slot */}
      <SkillSlotIcon
        barIndex={barIndex}
        slotIndex={ULTIMATE_SLOT}
        slotLabel="Ultimate"
        currentSkillId={skills[ULTIMATE_SLOT]}
        onSkillChange={onSkillChange}
        onSkillRemove={onSkillRemove}
        isUltimate
      />
    </Stack>
  );
};

interface SkillSlotIconProps {
  barIndex: 0 | 1;
  slotIndex: number;
  slotLabel: string;
  currentSkillId?: number;
  isUltimate?: boolean;
  onSkillChange: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onSkillRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillSlotIcon: React.FC<SkillSlotIconProps> = ({
  barIndex,
  slotIndex,
  slotLabel,
  currentSkillId,
  isUltimate = false,
  onSkillChange,
  onSkillRemove,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<SkillData[]>([]);

  // Find current skill info
  const currentSkill = currentSkillId !== undefined ? getSkillById(currentSkillId) : undefined;

  const iconSize = isUltimate ? 52 : 44;

  // Handle skill selection
  const handleSelect = useCallback(
    (skill: SkillData | null) => {
      if (!skill) {
        onSkillRemove(barIndex, slotIndex);
      } else {
        onSkillChange(barIndex, slotIndex, skill.id);
      }
      setIsSelecting(false);
      setInputValue('');
      setSearchResults([]);
    },
    [barIndex, slotIndex, onSkillChange, onSkillRemove],
  );

  // Handle input change with search
  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, value: string, reason: AutocompleteInputChangeReason) => {
      setInputValue(value);

      if (reason === 'reset' || reason === 'clear') {
        setSearchResults([]);
        return;
      }

      // Only search if we have enough characters
      if (value.trim().length >= MIN_SEARCH_LENGTH) {
        const results = searchSkills(value, MAX_SEARCH_RESULTS);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    },
    [],
  );

  const noOptionsText = useMemo(() => {
    if (inputValue.trim().length < MIN_SEARCH_LENGTH) {
      return `Enter at least ${MIN_SEARCH_LENGTH} characters to search`;
    }
    return 'No skills match your search';
  }, [inputValue]);

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Tooltip
        title={
          currentSkill
            ? `${currentSkill.name} (${currentSkill.category})`
            : `${slotLabel} - Click to select skill`
        }
        arrow
      >
        <Paper
          elevation={3}
          sx={{
            width: iconSize,
            height: iconSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            border: isUltimate ? 2 : 1,
            borderColor: isUltimate ? 'secondary.main' : 'divider',
            bgcolor: currentSkill ? 'background.paper' : 'action.hover',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
              borderColor: isUltimate ? 'secondary.light' : 'primary.main',
            },
          }}
          onClick={() => setIsSelecting(true)}
        >
          {currentSkill?.icon ? (
            <Box
              component="img"
              src={`https://eso-hub.com/storage/icons/${currentSkill.icon}.png`}
              alt={currentSkill.name}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // Show placeholder if image fails
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ px: 0.5 }}>
              {slotLabel}
            </Typography>
          )}
        </Paper>
      </Tooltip>

      {/* Remove button */}
      {currentSkill && (
        <IconButton
          size="small"
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            bgcolor: 'error.main',
            color: 'white',
            width: 18,
            height: 18,
            '&:hover': {
              bgcolor: 'error.dark',
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSkillRemove(barIndex, slotIndex);
          }}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      )}

      {/* Selection Dialog */}
      <Dialog
        open={isSelecting}
        onClose={() => {
          setIsSelecting(false);
          setInputValue('');
          setSearchResults([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {slotLabel} - {isUltimate ? 'Ultimate' : 'Ability'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Autocomplete
              options={searchResults}
              value={currentSkill || null}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onChange={(_event, skill) => handleSelect(skill)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={noOptionsText}
              autoHighlight
              clearOnBlur={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search for a skill"
                  placeholder={`Type at least ${MIN_SEARCH_LENGTH} characters...`}
                  autoFocus
                  fullWidth
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" key={key} {...optionProps}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {option.icon && (
                        <Box
                          component="img"
                          src={`https://eso-hub.com/storage/icons/${option.icon}.png`}
                          alt={option.name}
                          sx={{ width: 24, height: 24, borderRadius: 0.5 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <Typography>{option.name}</Typography>
                    </Stack>
                  </Box>
                );
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
