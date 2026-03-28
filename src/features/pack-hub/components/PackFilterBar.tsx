import { Clear, ExpandMore, Search } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import type { PackHubFilters, SortOrder } from '../types/pack-hub.types';
import {
  PACK_TAG_COLORS,
  PACK_TYPE_OPTIONS,
  PRESET_PACK_TAGS,
} from '../types/pack-hub.types';

interface PackFilterBarProps {
  filters: PackHubFilters;
  totalCount: number | null;
  onFilterChange: <K extends keyof PackHubFilters>(key: K, value: PackHubFilters[K]) => void;
}

const glassField = (isDark: boolean): Record<string, unknown> => ({
  borderRadius: '10px',
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
});

export const PackFilterBar: React.FC<PackFilterBarProps> = React.memo(
  ({ filters, totalCount, onFilterChange }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    const borderFocus = 'rgba(96,165,250,0.55)';
    const focusGlow = '0 0 0 3px rgba(96,165,250,0.12)';

    const handleTypeChange = (e: SelectChangeEvent): void => {
      onFilterChange('packType', e.target.value);
    };

    const handleSortChange = (sort: SortOrder): void => {
      onFilterChange('sort', sort);
    };

    const handleTagToggle = (tag: string): void => {
      onFilterChange('tag', filters.tag === tag ? '' : tag);
    };

    const hasActiveFilters = !!(filters.packType || filters.tag || filters.search);

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderRadius: 2,
          background: isDark
            ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
            : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.01) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Top row — sort toggle + type dropdown + search */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {/* Sort toggle */}
          <Box
            sx={{
              display: 'inline-flex',
              borderRadius: '10px',
              overflow: 'hidden',
              border: `1px solid ${borderColor}`,
              ...glassField(isDark),
            }}
          >
            {(['votes', 'recent'] as SortOrder[]).map((sort) => {
              const active = filters.sort === sort;
              return (
                <Button
                  key={sort}
                  size="small"
                  onClick={() => handleSortChange(sort)}
                  sx={{
                    textTransform: 'capitalize',
                    borderRadius: 0,
                    px: 1.75,
                    py: 0.6,
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    minWidth: 'auto',
                    color: active
                      ? isDark
                        ? '#e2e8f0'
                        : '#0f172a'
                      : isDark
                        ? 'rgba(148,163,184,0.6)'
                        : 'rgba(100,116,139,0.6)',
                    bgcolor: active
                      ? isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  {sort === 'votes' ? 'Top' : 'New'}
                </Button>
              );
            })}
          </Box>

          {/* Type dropdown */}
          <Select
            size="small"
            value={filters.packType}
            onChange={handleTypeChange}
            displayEmpty
            IconComponent={ExpandMore}
            sx={{
              minWidth: 130,
              height: 36,
              fontSize: '0.78rem',
              fontWeight: 600,
              ...glassField(isDark),
              border: `1px solid ${borderColor}`,
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '&.Mui-focused': {
                border: `1px solid ${borderFocus}`,
                boxShadow: focusGlow,
              },
            }}
          >
            {PACK_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          {/* Search field */}
          <TextField
            size="small"
            placeholder="Search packs…"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => onFilterChange('search', '')}>
                      <Clear sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              flex: 1,
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                height: 36,
                fontSize: '0.78rem',
                ...glassField(isDark),
                border: `1px solid ${borderColor}`,
                '& fieldset': { border: 'none' },
                '&.Mui-focused': {
                  border: `1px solid ${borderFocus}`,
                  boxShadow: focusGlow,
                },
              },
            }}
          />

          {/* Results counter + clear */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {totalCount !== null && (
              <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                {totalCount} result{totalCount !== 1 ? 's' : ''}
              </Typography>
            )}
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={() => {
                  onFilterChange('packType', '');
                  onFilterChange('tag', '');
                  onFilterChange('search', '');
                }}
                sx={{ fontSize: '0.72rem', textTransform: 'none', minWidth: 'auto', px: 1 }}
              >
                Clear
              </Button>
            )}
          </Box>
        </Box>

        {/* Tag chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {PRESET_PACK_TAGS.map((tag) => {
            const active = filters.tag === tag;
            const accent = PACK_TAG_COLORS[tag] ?? '#888';
            return (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => handleTagToggle(tag)}
                variant={active ? 'filled' : 'outlined'}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  ...(active
                    ? {
                        bgcolor: `${accent}25`,
                        color: accent,
                        borderColor: accent,
                        '&:hover': { bgcolor: `${accent}35` },
                      }
                    : {
                        borderColor,
                        color: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)',
                        '&:hover': {
                          bgcolor: isDark ? `${accent}18` : `${accent}10`,
                          borderColor: `${accent}55`,
                          color: accent,
                        },
                      }),
                }}
              />
            );
          })}
        </Box>
      </Box>
    );
  },
);

PackFilterBar.displayName = 'PackFilterBar';
