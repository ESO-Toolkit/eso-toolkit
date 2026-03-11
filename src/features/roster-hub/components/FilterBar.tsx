import { Clear, Search } from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
  useTheme,
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
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

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
                <Box
                  key={tag}
                  component="button"
                  onClick={() => handleTagToggle(tag)}
                  role="checkbox"
                  aria-pressed={active}
                  aria-label={tag}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.4,
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: active ? 700 : 600,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.18s ease',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    ...(active
                      ? {
                          background: isDark
                            ? `linear-gradient(135deg, ${accent}dd 0%, ${accent}aa 100%)`
                            : `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
                          border: `1px solid ${accent}90`,
                          boxShadow: `0 0 10px ${accent}50, 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
                          color: '#fff',
                          transform: 'translateY(-1px)',
                        }
                      : {
                          background: isDark ? `${accent}10` : `${accent}0d`,
                          border: `1px solid ${accent}35`,
                          color: isDark ? accent : accent,
                          boxShadow: 'none',
                          '&:hover': {
                            background: isDark ? `${accent}22` : `${accent}1a`,
                            border: `1px solid ${accent}60`,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 2px 8px ${accent}25`,
                          },
                        }),
                    '&:focus-visible': {
                      outline: `2px solid ${accent}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {tag}
                </Box>
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
