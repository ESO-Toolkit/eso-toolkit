import { FilterList, Sort } from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import type { RosterHubFilters, SortOrder } from '../types/roster-hub.types';
import { PRESET_TAGS } from '../types/roster-hub.types';

interface FilterBarProps {
  filters: RosterHubFilters;
  onFilterChange: <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => void;
}

// Exclude 'General' (GEN) from the hub since it's not a real trial
const HUB_TRIALS = TRIALS.filter((t) => t.id !== 'GEN');

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  const handleTrialChange = (e: SelectChangeEvent): void => {
    onFilterChange('trial', e.target.value);
  };

  const handleSortChange = (sort: SortOrder): void => {
    onFilterChange('sort', sort);
  };

  const handleTagToggle = (tag: string): void => {
    onFilterChange('tag', filters.tag === tag ? '' : tag);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
        flexWrap: 'wrap',
        py: 1,
      }}
    >
      {/* Trial filter */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="trial-filter-label">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterList fontSize="small" />
            Trial
          </Box>
        </InputLabel>
        <Select
          labelId="trial-filter-label"
          value={filters.trial}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FilterList fontSize="small" />
              Trial
            </Box>
          }
          onChange={handleTrialChange}
        >
          <MenuItem value="">All Trials</MenuItem>
          {HUB_TRIALS.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sort toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Sort fontSize="small" sx={{ color: 'text.secondary' }} />
        <ButtonGroup size="small" variant="outlined">
          <Button
            onClick={() => handleSortChange('votes')}
            variant={filters.sort === 'votes' ? 'contained' : 'outlined'}
          >
            Top
          </Button>
          <Button
            onClick={() => handleSortChange('recent')}
            variant={filters.sort === 'recent' ? 'contained' : 'outlined'}
          >
            Recent
          </Button>
        </ButtonGroup>
      </Box>

      {/* Tag chips */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center', mr: 0.5 }}>
          Tags:
        </Typography>
        {PRESET_TAGS.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onClick={() => handleTagToggle(tag)}
            color={filters.tag === tag ? 'primary' : 'default'}
            variant={filters.tag === tag ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer', textTransform: 'lowercase' }}
          />
        ))}
      </Stack>
    </Box>
  );
};
