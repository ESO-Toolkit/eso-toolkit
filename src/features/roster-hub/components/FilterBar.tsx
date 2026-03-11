import { Clear, Search } from '@mui/icons-material';
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
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import type { RosterHubFilters, SortOrder } from '../types/roster-hub.types';
import { PRESET_TAGS, TAG_COLORS } from '../types/roster-hub.types';

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
          bgcolor: (t: { palette: { mode: string } }) =>
            t.palette.mode === 'dark'
              ? 'rgba(13, 17, 28, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="trial-filter-label">Trial</InputLabel>
            <Select
              labelId="trial-filter-label"
              value={filters.trial}
              label="Trial"
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
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              flexGrow: 1,
              overflowX: 'auto',
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
              // Hide scrollbar visually but keep scroll functionality
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              pb: { xs: 0.5, sm: 0 },
            }}
          >
            {PRESET_TAGS.map((tag) => {
              const active = filters.tag === tag;
              const accent = TAG_COLORS[tag] ?? '#888';
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => handleTagToggle(tag)}
                  variant={active ? 'filled' : 'outlined'}
                  aria-pressed={active}
                  role="checkbox"
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                    height: 24,
                    '& .MuiChip-label': { px: 1 },
                    transition: 'all 0.15s ease',
                    ...(active
                      ? {
                          bgcolor: accent,
                          color: '#fff',
                          borderColor: accent,
                          '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                        }
                      : {
                          borderColor: `${accent}55`,
                          color: accent,
                          '&:hover': { bgcolor: `${accent}18`, borderColor: accent },
                        }),
                  }}
                />
              );
            })}
          </Box>

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
