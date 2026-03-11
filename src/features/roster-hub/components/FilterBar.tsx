import { Clear, FilterList, Search, Sort } from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import type { RosterHubFilters, SortOrder } from '../types/roster-hub.types';
import { PRESET_TAGS } from '../types/roster-hub.types';

interface FilterBarProps {
  filters: RosterHubFilters;
  totalCount: number | null; // null = loading
  onFilterChange: <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => void;
}

// Exclude 'General' (GEN) from the hub since it's not a real trial
const HUB_TRIALS = TRIALS.filter((t) => t.id !== 'GEN');

export const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ filters, totalCount, onFilterChange }) => {
    const handleTrialChange = (e: SelectChangeEvent): void => {
      onFilterChange('trial', e.target.value);
    };

    const handleSortChange = (sort: SortOrder): void => {
      onFilterChange('sort', sort);
    };

    const handleTagToggle = (tag: string): void => {
      onFilterChange('tag', filters.tag === tag ? '' : tag);
    };

    const hasActiveFilters = Boolean(filters.trial || filters.tag || filters.search);

    const handleClearAll = (): void => {
      onFilterChange('trial', '');
      onFilterChange('tag', '');
      onFilterChange('search', '');
    };

    return (
      <Box
        sx={{
          position: 'sticky',
          top: 64, // below header bar
          zIndex: 10,
          bgcolor: 'background.default',
          pt: 1,
          pb: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        {/* Top row: search + trial + sort */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', sm: 'center' },
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search by name or description…"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: 'text.disabled' }} aria-hidden="true" />
                  </InputAdornment>
                ),
                endAdornment: filters.search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onFilterChange('search', '')}
                      aria-label="Clear search"
                      edge="end"
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />

          {/* Trial filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="trial-filter-label">
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FilterList fontSize="small" aria-hidden="true" />
                Trial
              </Box>
            </InputLabel>
            <Select
              labelId="trial-filter-label"
              value={filters.trial}
              label={
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FilterList fontSize="small" aria-hidden="true" />
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
            <Sort fontSize="small" sx={{ color: 'text.secondary' }} aria-hidden="true" />
            <ButtonGroup size="small" variant="outlined" aria-label="Sort order">
              <Button
                onClick={() => handleSortChange('votes')}
                variant={filters.sort === 'votes' ? 'contained' : 'outlined'}
                aria-pressed={filters.sort === 'votes'}
              >
                Top
              </Button>
              <Button
                onClick={() => handleSortChange('recent')}
                variant={filters.sort === 'recent' ? 'contained' : 'outlined'}
                aria-pressed={filters.sort === 'recent'}
              >
                Recent
              </Button>
            </ButtonGroup>
          </Box>
        </Box>

        {/* Bottom row: tag chips + result count + clear all */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, flexGrow: 1 }}>
            {PRESET_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => handleTagToggle(tag)}
                color={filters.tag === tag ? 'primary' : 'default'}
                variant={filters.tag === tag ? 'filled' : 'outlined'}
                aria-pressed={filters.tag === tag}
                role="checkbox"
                sx={{
                  cursor: 'pointer',
                  textTransform: 'lowercase',
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </Stack>

          {totalCount !== null && (
            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
              {totalCount} roster{totalCount !== 1 ? 's' : ''}
            </Typography>
          )}

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={handleClearAll}
              startIcon={<Clear fontSize="small" />}
              sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: '0.75rem' }}
            >
              Clear all
            </Button>
          )}
        </Box>
      </Box>
    );
  },
);

FilterBar.displayName = 'FilterBar';
