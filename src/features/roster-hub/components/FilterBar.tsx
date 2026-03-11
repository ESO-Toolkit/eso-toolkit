import { Clear, ExpandMore, Search } from '@mui/icons-material';
import {
  Box,
  Button,
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

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import type { RosterHubFilters, SortOrder } from '../types/roster-hub.types';
import { PRESET_TAGS, TAG_COLORS } from '../types/roster-hub.types';

interface FilterBarProps {
  filters: RosterHubFilters;
  totalCount: number | null;
  onFilterChange: <K extends keyof RosterHubFilters>(key: K, value: RosterHubFilters[K]) => void;
}

const HUB_TRIALS = TRIALS.filter((t) => t.id !== 'GEN');

// Shared glassmorphic field styles
const glassField = (isDark: boolean): Record<string, unknown> => ({
  borderRadius: '10px',
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
});

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

    const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    const borderHover = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)';
    const borderFocus = 'rgba(96,165,250,0.55)';
    const focusGlow = '0 0 0 3px rgba(96,165,250,0.12)';

    return (
      <Box
        sx={{
          position: 'sticky',
          top: 64,
          zIndex: 10,
          bgcolor: isDark ? 'rgba(11,16,26,0.82)' : 'rgba(248,250,252,0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          pt: 1.25,
          pb: 1.75,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          mb: 2.5,
        }}
      >
        {/* ── Row 1: search · trial · sort ──────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.25,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          {/* Search — glassmorphic input */}
          <TextField
            size="small"
            placeholder="Search by name or description…"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            sx={{
              flexGrow: 1,
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                ...glassField(isDark),
                '& fieldset': {
                  borderColor,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                },
                '&:hover fieldset': { borderColor: borderHover },
                '&.Mui-focused fieldset': {
                  borderColor: borderFocus,
                  borderWidth: '1px',
                  boxShadow: focusGlow,
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.85rem',
                  py: '7px',
                  color: isDark ? 'rgba(255,255,255,0.85)' : undefined,
                  '&::placeholder': { color: isDark ? 'rgba(255,255,255,0.3)' : undefined, opacity: 1 },
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 16, color: isDark ? 'rgba(255,255,255,0.3)' : 'text.disabled' }} aria-hidden="true" />
                  </InputAdornment>
                ),
                endAdornment: filters.search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onFilterChange('search', '')}
                      aria-label="Clear search"
                      edge="end"
                      sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : undefined, p: 0.5 }}
                    >
                      <Clear sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />

          {/* Trial — glassmorphic select, no floating label */}
          <Select
            value={filters.trial}
            onChange={handleTrialChange}
            displayEmpty
            size="small"
            IconComponent={ExpandMore}
            renderValue={(val) =>
              val ? (HUB_TRIALS.find((t) => t.id === val)?.name ?? val) : 'All Trials'
            }
            sx={{
              minWidth: 148,
              ...glassField(isDark),
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: filters.trial
                ? isDark ? 'rgba(255,255,255,0.85)' : undefined
                : isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: borderHover },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: borderFocus,
                borderWidth: '1px',
                boxShadow: focusGlow,
              },
              '& .MuiSelect-icon': {
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                fontSize: 18,
              },
              '& .MuiSelect-select': { py: '7px' },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  mt: 0.5,
                  borderRadius: 2,
                  background: isDark
                    ? 'rgba(18,24,38,0.96)'
                    : 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  boxShadow: isDark
                    ? '0 8px 32px rgba(0,0,0,0.6)'
                    : '0 8px 32px rgba(0,0,0,0.12)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.85rem',
                    borderRadius: 1,
                    mx: 0.5,
                    '&:hover': {
                      background: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.06)',
                    },
                    '&.Mui-selected': {
                      background: isDark ? 'rgba(96,165,250,0.18)' : 'rgba(37,99,235,0.10)',
                      color: isDark ? '#60a5fa' : '#1d4ed8',
                      fontWeight: 600,
                      '&:hover': {
                        background: isDark ? 'rgba(96,165,250,0.22)' : 'rgba(37,99,235,0.14)',
                      },
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="">All Trials</MenuItem>
            {HUB_TRIALS.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>

          {/* Sort — pill segmented control */}
          <Box
            role="group"
            aria-label="Sort order"
            sx={{
              display: 'inline-flex',
              p: '3px',
              borderRadius: '999px',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}
          >
            {(['votes', 'recent'] as SortOrder[]).map((sort) => {
              const active = filters.sort === sort;
              return (
                <Box
                  key={sort}
                  component="button"
                  onClick={() => handleSortChange(sort)}
                  aria-pressed={active}
                  sx={{
                    px: 1.75,
                    py: 0.55,
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    ...(active
                      ? {
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(96,165,250,0.95) 0%, rgba(139,92,246,0.9) 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          color: '#fff',
                          boxShadow: isDark
                            ? '0 0 10px rgba(96,165,250,0.35), 0 2px 8px rgba(0,0,0,0.35)'
                            : '0 2px 8px rgba(59,130,246,0.35)',
                        }
                      : {
                          background: 'transparent',
                          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                          '&:hover': {
                            color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          },
                        }),
                    '&:focus-visible': {
                      outline: '2px solid rgba(96,165,250,0.6)',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {sort === 'votes' ? 'Top' : 'Recent'}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── Row 2: tags · count · clear ───────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              flexGrow: 1,
              overflowX: 'auto',
              flexWrap: { xs: 'nowrap', sm: 'wrap' },
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
                          color: accent,
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
            <Typography
              variant="caption"
              sx={{
                whiteSpace: 'nowrap',
                color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)',
                fontSize: '0.72rem',
                fontWeight: 500,
              }}
            >
              {totalCount} roster{totalCount !== 1 ? 's' : ''}
            </Typography>
          )}

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              onClick={handleClearAll}
              startIcon={<Clear sx={{ fontSize: '14px !important' }} />}
              sx={{
                whiteSpace: 'nowrap',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
                px: 1,
                py: 0.5,
                borderRadius: '6px',
                minWidth: 0,
                '&:hover': {
                  color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>
    );
  },
);

FilterBar.displayName = 'FilterBar';
