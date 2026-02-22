/**
 * Skill Filters Component
 * Sidebar filter panel for the ability picker
 */

import { RadioButtonChecked, RadioButtonUnchecked } from '@mui/icons-material';
import {
  alpha,
  Box,
  Divider,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo } from 'react';

import { getSkillLineCategories, getResourceType, type ResourceType, type SkillType } from '../utils/skillFiltering';
import type { SkillData } from '../../../data/types/skill-line-types';

export interface SkillFilterValues {
  type: SkillType;
  resourceType: ResourceType;
  category?: string;
}

interface SkillFiltersProps {
  filters: SkillFilterValues;
  onFiltersChange: (filters: SkillFilterValues) => void;
  skillsCount?: number;
}

const SKILL_TYPE_OPTIONS: { value: SkillType; label: string; description: string }[] = [
  { value: 'all', label: 'All Abilities', description: 'Show every ability type' },
  { value: 'active', label: 'Active Only', description: 'Show only active abilities' },
  { value: 'ultimate', label: 'Ultimates Only', description: 'Show only ultimate abilities' },
  { value: 'passive', label: 'Passives Only', description: 'Show only passive abilities' },
];

const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string; icon: string }[] = [
  { value: 'all', label: 'All Resources', icon: '🔮' },
  { value: 'magicka', label: 'Magicka', icon: '💙' },
  { value: 'stamina', label: 'Stamina', icon: '💚' },
  { value: 'health', label: 'Health', icon: '❤️' },
  { value: 'ultimate', label: 'Ultimate', icon: '⭐' },
];

export const SkillFilters: React.FC<SkillFiltersProps> = ({
  filters,
  onFiltersChange,
  skillsCount = 0,
}) => {
  const theme = useTheme();

  // Get all skill line categories
  const categories = useMemo(() => getSkillLineCategories(), []);

  const handleTypeChange = (type: SkillType) => {
    onFiltersChange({ ...filters, type });
  };

  const handleResourceTypeChange = (resourceType: ResourceType) => {
    onFiltersChange({ ...filters, resourceType });
  };

  const handleCategoryChange = (category: string | undefined) => {
    onFiltersChange({ ...filters, category });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        width: 240,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        pr: 1,
      }}
    >
      {/* Section Header */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Filters
        </Typography>
        {skillsCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            {skillsCount} {skillsCount === 1 ? 'ability' : 'abilities'}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Skill Type Filter */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
          Skill Type
        </Typography>
        <Stack spacing={0.5}>
          {SKILL_TYPE_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              selected={filters.type === option.value}
              label={option.label}
              onClick={() => handleTypeChange(option.value)}
            />
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Resource Type Filter */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
          Resource Type
        </Typography>
        <Stack spacing={0.5}>
          {RESOURCE_TYPE_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              selected={filters.resourceType === option.value}
              label={`${option.icon} ${option.label}`}
              onClick={() => handleResourceTypeChange(option.value)}
            />
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Skill Line Filter */}
      <Box>
        <FormControl fullWidth size="small">
          <InputLabel id="skill-line-select-label">Skill Line</InputLabel>
          <Select
            labelId="skill-line-select-label"
            value={filters.category || ''}
            label="Skill Line"
            onChange={(e) => handleCategoryChange(e.target.value || undefined)}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Skill Lines</em>
            </MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Stack>
  );
};

interface FilterOptionProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}

const FilterOption: React.FC<FilterOptionProps> = ({ selected, label, onClick }) => {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      onClick={onClick}
      sx={{
        px: 1,
        py: 0.75,
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'all 0.15s',
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
        '&:hover': {
          bgcolor: selected ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.action.hover, 0.6),
        },
      }}
    >
      {selected ? (
        <RadioButtonChecked sx={{ fontSize: 18, color: 'primary.main' }} />
      ) : (
        <RadioButtonUnchecked sx={{ fontSize: 18, color: 'text.secondary' }} />
      )}
      <Typography
        variant="body2"
        sx={{
          fontWeight: selected ? 500 : 400,
          color: selected ? 'primary.main' : 'text.primary',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
};
