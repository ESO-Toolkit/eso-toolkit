/**
 * Ability Picker Component
 * Modern visual ability picker with grid display and advanced filtering
 */

import { Close as CloseIcon, Clear, Search } from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { preloadSkillData } from '../data/skillLineSkills';
import { filterSkills, getPaginatedSkills, type SkillFilterValues, type SkillFilters } from '../utils/skillFiltering';
import { AbilityCard } from './AbilityCard';
import { SkillFilters as SkillFiltersPanel } from './SkillFilters';
import type { SkillData } from '../../../data/types/skill-line-types';

interface AbilityPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (skill: SkillData) => void;
  currentSkillId?: number;
  slotLabel?: string;
  isUltimateSlot?: boolean;
}

const PAGE_SIZE = 60; // Number of skills to show per page

export const AbilityPicker: React.FC<AbilityPickerProps> = ({
  open,
  onClose,
  onSelect,
  currentSkillId,
  slotLabel = 'Ability',
  isUltimateSlot = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SkillFilterValues>({
    type: isUltimateSlot ? 'ultimate' : 'all',
    resourceType: 'all',
    category: undefined,
  });
  const [page, setPage] = useState(0);
  const [paginatedData, setPaginatedData] = useState<{
    skills: SkillData[];
    total: number;
    hasMore: boolean;
  }>({ skills: [], total: 0, hasMore: false });

  // Initialize skill cache on mount
  useEffect(() => {
    preloadSkillData();
  }, []);

  // Fetch paginated results when filters/search change
  useEffect(() => {
    const skillFilters: SkillFilters = {
      ...filters,
      query: searchQuery || undefined,
    };

    const results = getPaginatedSkills(skillFilters, page, PAGE_SIZE);
    setPaginatedData(results);

    // Reset to page 0 when filters change
    if (page > 0) {
      setPage(0);
    }
  }, [filters, searchQuery]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SkillFilterValues) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  // Handle skill selection
  const handleSkillSelect = useCallback(
    (skill: SkillData) => {
      onSelect(skill);
      // Don't close here - let the parent decide
    },
    [onSelect]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Determine grid columns based on screen size
  const gridColumns = useMemo(() => {
    if (isMobile) return 3;
    return 6;
  }, [isMobile]);

  // Active filter chips
  const activeFilters = useMemo(() => {
    const chips: { label: string; onDelete: () => void }[] = [];

    if (filters.type !== 'all') {
      chips.push({
        label: filters.type.charAt(0).toUpperCase() + filters.type.slice(1),
        onDelete: () => setFilters((f: SkillFilterValues) => ({ ...f, type: 'all' })),
      });
    }

    if (filters.resourceType !== 'all') {
      chips.push({
        label: filters.resourceType.charAt(0).toUpperCase() + filters.resourceType.slice(1),
        onDelete: () => setFilters((f: SkillFilterValues) => ({ ...f, resourceType: 'all' })),
      });
    }

    if (filters.category) {
      chips.push({
        label: filters.category,
        onDelete: () => setFilters((f: SkillFilterValues) => ({ ...f, category: undefined })),
      });
    }

    return chips;
  }, [filters]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '85vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Select {slotLabel}
          {isUltimateSlot && (
            <Chip
              label="Ultimate"
              size="small"
              sx={{ ml: 1, bgcolor: 'secondary.main', color: 'white' }}
            />
          )}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Search Bar */}
        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search abilities..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            autoFocus
          />
        </Box>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {activeFilters.map((chip, index) => (
              <Chip
                key={index}
                label={chip.label}
                onDelete={chip.onDelete}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            <Chip
              label="Clear all"
              size="small"
              onClick={() =>
                setFilters({
                  type: isUltimateSlot ? 'ultimate' : 'all',
                  resourceType: 'all',
                  category: undefined,
                })
              }
              sx={{ fontStyle: 'italic' }}
            />
          </Box>
        )}

        <Divider />

        {/* Main Content */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Filters Sidebar */}
          {!isMobile && (
            <>
              <Box sx={{ width: 240, flexShrink: 0, overflowY: 'auto' }}>
                <SkillFiltersPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  skillsCount={paginatedData.total}
                />
              </Box>
              <Divider orientation="vertical" flexItem />
            </>
          )}

          {/* Skills Grid */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
            }}
          >
            {/* Results count */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Showing {Math.min(PAGE_SIZE, paginatedData.skills.length)} of {paginatedData.total} abilities
            </Typography>

            {/* Empty state */}
            {paginatedData.skills.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 200,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body1">No abilities found</Typography>
                <Typography variant="caption">
                  {searchQuery || filters.type !== 'all' || filters.resourceType !== 'all' || filters.category
                    ? 'Try adjusting your filters or search query'
                    : 'Something went wrong'}
                </Typography>
              </Box>
            )}

            {/* Skills Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: 1.5,
              }}
            >
              {paginatedData.skills.map((skill) => (
                <AbilityCard
                  key={skill.id}
                  skill={skill}
                  isSelected={skill.id === currentSkillId}
                  onClick={() => handleSkillSelect(skill)}
                  size={isMobile ? 'small' : 'medium'}
                />
              ))}
            </Box>

            {/* Load More Button */}
            {paginatedData.hasMore && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={`Load more abilities...`}
                  onClick={handleLoadMore}
                  sx={{ cursor: 'pointer' }}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
