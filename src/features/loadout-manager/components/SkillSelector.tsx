/**
 * Skill Selector Component
 * Allows selection and management of skills for front and back bars
 * Now uses the new visual AbilityPicker for improved UX
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';

import { AbilityPicker } from './AbilityPicker';
import type { SkillData } from '../../../data/types/skill-line-types';
import { getSkillById, preloadSkillData, getSkillStats } from '../data/skillLineSkills';
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
}): React.ReactElement => {
  const dispatch = useDispatch();
  const logger = useLogger('SkillSelector');

  // Initialize skill cache on mount
  useEffect(() => {
    preloadSkillData();
    if (process.env.NODE_ENV === 'development') {
      const stats = getSkillStats();
      logger.debug('Skill line data loaded', stats);
    }
  }, [logger]);

  // Log skill statistics on mount (dev mode only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const stats = getSkillStats();
      logger.debug('Skill line data loaded', stats);
    }
  }, [logger]);

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
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  // Find current skill info
  const currentSkill = currentSkillId !== undefined ? getSkillById(currentSkillId) : undefined;

  const iconSize = isUltimate ? 52 : 44;

  // Handle skill selection
  const handleSelectSkill = useCallback(
    (skill: SkillData) => {
      onSkillChange(barIndex, slotIndex, skill.id);
      setIsPickerOpen(false);
    },
    [barIndex, slotIndex, onSkillChange],
  );

  // Handle skill remove
  const handleRemoveSkill = useCallback(() => {
    onSkillRemove(barIndex, slotIndex);
  }, [barIndex, slotIndex, onSkillRemove]);

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
          onClick={() => setIsPickerOpen(true)}
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
            handleRemoveSkill();
          }}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      )}

      {/* New Ability Picker Dialog */}
      <AbilityPicker
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectSkill}
        currentSkillId={currentSkillId}
        slotLabel={`${slotLabel} - ${isUltimate ? 'Ultimate' : 'Ability'}`}
        isUltimateSlot={isUltimate}
      />
    </Box>
  );
};
