/**
 * Skill Selector Component
 * Allows selection and management of skills for front and back bars
 */

import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import React from 'react';
import { useDispatch } from 'react-redux';

import { SKILL_LINES_REGISTRY } from '@/utils/skillLinesRegistry';

import { updateSkills } from '../store/loadoutSlice';
import { SkillsConfig } from '../types/loadout.types';

interface SkillSelectorProps {
  skills: SkillsConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// Skill slot indices (ESO uses 3-8 for abilities, with 8 being the ultimate)
const SKILL_SLOTS = [3, 4, 5, 6, 7]; // Regular abilities
const ULTIMATE_SLOT = 8;

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  skills,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const dispatch = useDispatch();

  const handleSkillChange = (barIndex: 0 | 1, slotIndex: number, abilityId: number) => {
    const updatedSkills = {
      ...skills,
      [barIndex]: {
        ...skills[barIndex],
        [slotIndex]: abilityId,
      },
    };
    dispatch(updateSkills({ trialId, pageIndex, setupIndex, skills: updatedSkills }));
  };

  const handleSkillRemove = (barIndex: 0 | 1, slotIndex: number) => {
    const updatedBar = { ...skills[barIndex] };
    delete updatedBar[slotIndex];
    const updatedSkills = {
      ...skills,
      [barIndex]: updatedBar,
    };
    dispatch(updateSkills({ trialId, pageIndex, setupIndex, skills: updatedSkills }));
  };

  return (
    <Stack spacing={3}>
      {/* Front Bar */}
      <SkillBar
        barIndex={0}
        barName="Front Bar"
        skills={skills[0] || {}}
        onSkillChange={handleSkillChange}
        onSkillRemove={handleSkillRemove}
      />

      <Divider />

      {/* Back Bar */}
      <SkillBar
        barIndex={1}
        barName="Back Bar"
        skills={skills[1] || {}}
        onSkillChange={handleSkillChange}
        onSkillRemove={handleSkillRemove}
      />

      {/* Info Box */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="body2">
          <strong>Note:</strong> Currently showing placeholder skill IDs. Full skill selection
          with class/weapon filtering will be implemented in the next phase.
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Class skills will be filtered based on your character's available skill lines (up to 3).
          Weapon, guild, and world skill lines will always be available.
        </Typography>
      </Paper>
    </Stack>
  );
};

interface SkillBarProps {
  barIndex: 0 | 1;
  barName: string;
  skills: { [slotIndex: number]: number };
  onSkillChange: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onSkillRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillBar: React.FC<SkillBarProps> = ({
  barIndex,
  barName,
  skills,
  onSkillChange,
  onSkillRemove,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {barName}
      </Typography>
      <Grid container spacing={2}>
        {/* Regular Skill Slots */}
        {SKILL_SLOTS.map((slotIndex) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={slotIndex}>
            <SkillSlot
              barIndex={barIndex}
              slotIndex={slotIndex}
              slotLabel={`Slot ${slotIndex - 2}`}
              currentSkillId={skills[slotIndex]}
              onSkillChange={onSkillChange}
              onSkillRemove={onSkillRemove}
            />
          </Grid>
        ))}

        {/* Ultimate Slot */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SkillSlot
            barIndex={barIndex}
            slotIndex={ULTIMATE_SLOT}
            slotLabel="Ultimate"
            currentSkillId={skills[ULTIMATE_SLOT]}
            onSkillChange={onSkillChange}
            onSkillRemove={onSkillRemove}
            isUltimate
          />
        </Grid>
      </Grid>
    </Box>
  );
};

interface SkillSlotProps {
  barIndex: 0 | 1;
  slotIndex: number;
  slotLabel: string;
  currentSkillId?: number;
  isUltimate?: boolean;
  onSkillChange: (barIndex: 0 | 1, slotIndex: number, abilityId: number) => void;
  onSkillRemove: (barIndex: 0 | 1, slotIndex: number) => void;
}

const SkillSlot: React.FC<SkillSlotProps> = ({
  barIndex,
  slotIndex,
  slotLabel,
  currentSkillId,
  isUltimate = false,
  onSkillChange,
  onSkillRemove,
}) => {
  const handleChange = (event: any) => {
    const value = event.target.value;
    if (value === '') {
      onSkillRemove(barIndex, slotIndex);
    } else {
      onSkillChange(barIndex, slotIndex, parseInt(value, 10));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{slotLabel}</Typography>
          {isUltimate && <Chip label="Ultimate" size="small" color="secondary" />}
        </Stack>

        <FormControl fullWidth size="small">
          <InputLabel>Select Skill</InputLabel>
          <Select
            value={currentSkillId || ''}
            label="Select Skill"
            onChange={handleChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {/* TODO: Populate with actual skills filtered by skill lines */}
            <MenuItem value={40237}>Placeholder Skill 1 (ID: 40237)</MenuItem>
            <MenuItem value={85840}>Placeholder Skill 2 (ID: 85840)</MenuItem>
            <MenuItem value={40079}>Placeholder Skill 3 (ID: 40079)</MenuItem>
            <MenuItem value={40094}>Placeholder Skill 4 (ID: 40094)</MenuItem>
            {isUltimate && (
              <>
                <MenuItem value={40223}>Placeholder Ult 1 (ID: 40223)</MenuItem>
                <MenuItem value={192380}>Placeholder Ult 2 (ID: 192380)</MenuItem>
              </>
            )}
          </Select>
        </FormControl>

        {currentSkillId && (
          <Typography variant="caption" color="text.secondary">
            Skill ID: {currentSkillId}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};
