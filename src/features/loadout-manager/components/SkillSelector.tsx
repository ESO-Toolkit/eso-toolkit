/**
 * Skill Selector Component
 * Allows selection and management of skills for front and back bars
 */

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import Autocomplete, { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import { alpha } from '@mui/material/styles';
import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';

import type { SkillData } from '../../../data/types/skill-line-types';
import { getSkillById, searchSkills, getSkillStats } from '../data/skillLineSkills';
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
const ALL_SLOTS = [...SKILL_SLOTS, ULTIMATE_SLOT];

// Minimum characters required to trigger search
const MIN_SEARCH_LENGTH = 2;
// Maximum number of search results to display
const MAX_SEARCH_RESULTS = 100;

const countFilledSlots = (bar: { [slotIndex: number]: number }): number =>
  ALL_SLOTS.filter((slot) => bar[slot] !== undefined && bar[slot] > 0).length;

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  skills,
  trialId,
  pageIndex,
  setupIndex,
}): React.ReactElement => {
  const dispatch = useDispatch();
  const logger = useLogger('SkillSelector');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

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
    dispatch(
      updateSkills({
        trialId,
        pageIndex,
        setupIndex,
        skills: { ...skills, [barIndex]: updatedBar },
      }),
    );
  };

  const barDefs: Array<{ label: string; barIndex: 0 | 1 }> = [
    { label: 'Front Bar', barIndex: 0 },
    { label: 'Back Bar', barIndex: 1 },
  ];

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      {barDefs.map(({ label, barIndex }, i) => (
        <React.Fragment key={barIndex}>
          {/* Gradient divider between bars */}
          {i > 0 && (
            <Box
              sx={{
                height: 1,
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)'
                  : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0) 100%)',
              }}
            />
          )}

          <Box>
            {/* Bar label + filled slot count */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.25 }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {label}
              </Typography>
              <Box
                sx={{
                  px: 0.75,
                  py: 0.15,
                  borderRadius: '999px',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.65rem', fontWeight: 600 }}
                >
                  {countFilledSlots(skills[barIndex] || {})} / 6
                </Typography>
              </Box>
            </Stack>

            <SkillBarRow
              barIndex={barIndex}
              skills={skills[barIndex] || {}}
              onSkillChange={handleSkillChange}
              onSkillRemove={handleSkillRemove}
            />
          </Box>
        </React.Fragment>
      ))}
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        rowGap: 0.75,
        justifyContent: { xs: 'center', md: 'flex-start' },
      }}
      useFlexGap
    >
      {/* Regular Skill Slots */}
      {SKILL_SLOTS.map((slotIndex, idx) => (
        <SkillSlotIcon
          key={slotIndex}
          barIndex={barIndex}
          slotIndex={slotIndex}
          slotLabel={String(idx + 1)}
          currentSkillId={skills[slotIndex]}
          onSkillChange={onSkillChange}
          onSkillRemove={onSkillRemove}
        />
      ))}

      {/* Gradient vertical divider before Ultimate */}
      <Box
        sx={{
          width: 1.5,
          height: 40,
          borderRadius: 1,
          flexShrink: 0,
          mx: 0.5,
          background: isDarkMode
            ? `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.55)} 50%, transparent 100%)`
            : `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.35)} 50%, transparent 100%)`,
        }}
      />

      {/* Ultimate Slot */}
      <SkillSlotIcon
        barIndex={barIndex}
        slotIndex={ULTIMATE_SLOT}
        slotLabel="U"
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const currentSkill = currentSkillId !== undefined ? getSkillById(currentSkillId) : undefined;
  const iconSize = isUltimate ? 54 : 46;

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

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, value: string, reason: AutocompleteInputChangeReason) => {
      setInputValue(value);
      if (reason === 'reset' || reason === 'clear') {
        setSearchResults([]);
        return;
      }
      if (value.trim().length >= MIN_SEARCH_LENGTH) {
        setSearchResults(searchSkills(value, MAX_SEARCH_RESULTS));
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

  // Border colors
  const filledBorder = isUltimate
    ? alpha(theme.palette.warning.main, isDarkMode ? 0.5 : 0.45)
    : alpha(theme.palette.divider, isDarkMode ? 0.9 : 0.7);
  const emptyBorder = isUltimate
    ? alpha(theme.palette.warning.main, isDarkMode ? 0.2 : 0.15)
    : alpha(theme.palette.divider, isDarkMode ? 0.4 : 0.35);

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Tooltip
        title={
          currentSkill
            ? `${currentSkill.name}${currentSkill.category ? ` · ${currentSkill.category}` : ''}`
            : `Slot ${slotLabel}${isUltimate ? ' (Ultimate)' : ''} — click to assign`
        }
        arrow
      >
        <Box
          onClick={() => setIsSelecting(true)}
          sx={{
            width: iconSize,
            height: iconSize,
            borderRadius: isUltimate ? '12px' : '10px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            border: `${isUltimate ? 2 : 1}px solid ${currentSkill ? filledBorder : emptyBorder}`,
            backgroundColor: currentSkill
              ? isDarkMode
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)'
              : isDarkMode
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(0,0,0,0.01)',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.07)',
              borderColor: isUltimate
                ? alpha(theme.palette.warning.main, 0.75)
                : alpha(theme.palette.primary.main, 0.6),
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              boxShadow: isUltimate
                ? `0 0 14px ${alpha(theme.palette.warning.main, 0.3)}`
                : `0 0 10px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
            // Reveal clear overlay on hover
            '&:hover .skill-clear-overlay': { opacity: 1 },
          }}
        >
          {/* Skill icon or empty slot placeholder */}
          {currentSkill?.icon ? (
            <img
              src={`https://eso-hub.com/storage/icons/${currentSkill.icon}.png`}
              alt={currentSkill.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 0.3,
              }}
            >
              <Typography
                sx={{
                  fontSize: isUltimate ? '0.7rem' : '0.65rem',
                  fontWeight: 700,
                  color: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
                  lineHeight: 1,
                  letterSpacing: 0.2,
                }}
              >
                {slotLabel}
              </Typography>
              <Box
                sx={{
                  width: '38%',
                  height: 1,
                  borderRadius: 1,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              />
            </Box>
          )}

          {/* Clear overlay — hover-reveal, only shown for filled slots */}
          {currentSkill && (
            <Box
              className="skill-clear-overlay"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onSkillRemove(barIndex, slotIndex);
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.62)',
                backdropFilter: 'blur(2px)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                cursor: 'pointer',
              }}
            >
              <CloseIcon sx={{ fontSize: isUltimate ? 22 : 18, color: 'rgba(255,255,255,0.9)' }} />
            </Box>
          )}
        </Box>
      </Tooltip>

      {/* Ultimate accent dot */}
      {isUltimate && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.warning.main, isDarkMode ? 0.7 : 0.6),
            boxShadow: `0 0 6px ${alpha(theme.palette.warning.main, isDarkMode ? 0.5 : 0.4)}`,
          }}
        />
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
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
            backgroundColor: isDarkMode ? 'rgba(15,15,25,0.92)' : 'rgba(255,255,255,0.96)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
          }}
        >
          {isUltimate ? 'Assign Ultimate' : `Assign Skill · Slot ${slotLabel}`}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      backdropFilter: 'blur(12px)',
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...optionProps}
                    sx={{ py: '7px !important', px: '10px !important' }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      {option.icon ? (
                        <img
                          src={`https://eso-hub.com/storage/icons/${option.icon}.png`}
                          alt={option.name}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            flexShrink: 0,
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            flexShrink: 0,
                            backgroundColor: isDarkMode
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)',
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          }}
                        />
                      )}
                      <Stack spacing={0.1}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {option.name}
                        </Typography>
                        {option.category && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ lineHeight: 1.2 }}
                          >
                            {option.category}
                            {option.type ? ` · ${option.type}` : ''}
                          </Typography>
                        )}
                      </Stack>
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
