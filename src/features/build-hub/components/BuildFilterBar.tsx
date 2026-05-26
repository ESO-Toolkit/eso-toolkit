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

import type { BuildHubFilters, SortOrder } from '../types/build-hub.types';
import {
  BUILD_TAG_COLORS,
  CLASS_OPTIONS,
  PRESET_BUILD_TAGS,
  ROLE_OPTIONS,
} from '../types/build-hub.types';

interface BuildFilterBarProps {
  filters: BuildHubFilters;
  totalCount: number | null;
  onFilterChange: <K extends keyof BuildHubFilters>(key: K, value: BuildHubFilters[K]) => void;
}

const glassField = (isDark: boolean): Record<string, unknown> => ({
  borderRadius: '10px',
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
});

export const BuildFilterBar: React.FC<BuildFilterBarProps> = React.memo(
  ({ filters, totalCount, onFilterChange }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    const borderHover = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)';
    const borderFocus = 'rgba(96,165,250,0.55)';
    const focusGlow = '0 0 0 3px rgba(96,165,250,0.12)';

    const hasActiveFilters = Boolean(
      filters.esoClass || filters.role || filters.tag || filters.search,
    );

    const handleClearAll = (): void => {
      onFilterChange('esoClass', '');
      onFilterChange('role', '');
      onFilterChange('tag', '');
      onFilterChange('search', '');
    };

    const selectSx = {
      minWidth: 0,
      ...glassField(isDark),
      borderRadius: '10px',
      fontSize: '0.85rem',
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
    };

    const menuPaperSx = {
      mt: 0.5,
      borderRadius: 2,
      background: isDark ? 'rgba(18,24,38,0.96)' : 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
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
    };

    return (
      <Box
        sx={{
          zIndex: 10,
          px: 2,
          pt: 1.25,
          pb: 1.75,
          mb: 2.5,
          borderRadius: 3,
          background: isDark ? 'rgba(11,16,26,0.88)' : 'rgba(248,250,252,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Row 1: search + class + role + sort */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.25,
            alignItems: { xs: 'stretch', sm: 'center' },
            minWidth: 0,
          }}
        >
          <TextField
            size="small"
            placeholder="Search builds…"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            sx={{
              flexGrow: 1,
              minWidth: 180,
              '& .MuiOutlinedInput-root': {
                ...glassField(isDark),
                '& fieldset': { borderColor, transition: 'border-color 0.2s ease' },
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
                  '&::placeholder': {
                    color: isDark ? 'rgba(255,255,255,0.3)' : undefined,
                    opacity: 1,
                  },
                },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      sx={{
                        fontSize: 16,
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'text.disabled',
                      }}
                      aria-hidden="true"
                    />
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

          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              alignItems: 'center',
              minWidth: 0,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr)) auto',
              },
            }}
          >
            <Select
              value={filters.esoClass}
              onChange={(e: SelectChangeEvent) => onFilterChange('esoClass', e.target.value)}
              displayEmpty
              size="small"
              IconComponent={ExpandMore}
              renderValue={(val) =>
                val ? (CLASS_OPTIONS.find((o) => o.value === val)?.label ?? val) : 'All Classes'
              }
              sx={{
                ...selectSx,
                color: filters.esoClass
                  ? isDark
                    ? 'rgba(255,255,255,0.85)'
                    : undefined
                  : isDark
                    ? 'rgba(255,255,255,0.38)'
                    : 'rgba(0,0,0,0.38)',
              }}
              MenuProps={{ slotProps: { paper: { sx: menuPaperSx } } }}
            >
              {CLASS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={filters.role}
              onChange={(e: SelectChangeEvent) => onFilterChange('role', e.target.value)}
              displayEmpty
              size="small"
              IconComponent={ExpandMore}
              renderValue={(val) =>
                val ? (ROLE_OPTIONS.find((o) => o.value === val)?.label ?? val) : 'All Roles'
              }
              sx={{
                ...selectSx,
                color: filters.role
                  ? isDark
                    ? 'rgba(255,255,255,0.85)'
                    : undefined
                  : isDark
                    ? 'rgba(255,255,255,0.38)'
                    : 'rgba(0,0,0,0.38)',
              }}
              MenuProps={{ slotProps: { paper: { sx: menuPaperSx } } }}
            >
              {ROLE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            {/* Sort toggle */}
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
                flexShrink: 0,
                gridColumn: { xs: '1 / -1', sm: 'auto' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              {(['votes', 'recent'] as SortOrder[]).map((sort) => {
                const active = filters.sort === sort;
                return (
                  <Box<'button'>
                    key={sort}
                    component="button"
                    onClick={() => onFilterChange('sort', sort)}
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
                      flex: { xs: 1, sm: 'initial' },
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
        </Box>

        {/* Row 2: tags + count + clear */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
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
            {PRESET_BUILD_TAGS.map((tag) => {
              const active = filters.tag === tag;
              const accent = BUILD_TAG_COLORS[tag] ?? '#888';
              return (
                <Box<'button'>
                  key={tag}
                  component="button"
                  onClick={() => onFilterChange('tag', filters.tag === tag ? '' : tag)}
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
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.18s ease',
                    backdropFilter: 'blur(10px)',
                    ...(active
                      ? {
                          background: isDark
                            ? `linear-gradient(135deg, ${accent}dd 0%, ${accent}aa 100%)`
                            : `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
                          border: `1px solid ${accent}90`,
                          boxShadow: `0 0 10px ${accent}50, 0 2px 8px rgba(0,0,0,0.3)`,
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
                    '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: '2px' },
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
              {totalCount} build{totalCount !== 1 ? 's' : ''}
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

BuildFilterBar.displayName = 'BuildFilterBar';
