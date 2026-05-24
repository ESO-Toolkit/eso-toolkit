import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Add, Extension } from '@mui/icons-material';
import {
  Alert,
  alpha,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

import { type EsouiAddonSearchResult, searchEsouiAddons } from '../api/pack-hub-api';
import type { PackAddonEntry } from '../types/pack-hub.types';

import { SortableAddonRow } from './sortable-addon-row';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PackAddonsStepProps {
  addons: PackAddonEntry[];
  isDark: boolean;
  accentColor: string;
  error: string | null;
  onAddonsChange: React.Dispatch<React.SetStateAction<PackAddonEntry[]>>;
  onError: (error: string | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PackAddonsStep: React.FC<PackAddonsStepProps> = ({
  addons,
  isDark,
  accentColor,
  error,
  onAddonsChange,
  onError,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<EsouiAddonSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const requiredCount = addons.filter((a) => a.required).length;
  const optionalCount = addons.length - requiredCount;

  const handleAddFromSearch = (result: EsouiAddonSearchResult | null): void => {
    if (!result) return;
    if (addons.some((a) => a.esouiId === result.id)) {
      onError(`"${result.title}" is already in this pack.`);
      return;
    }
    onAddonsChange((prev) => [...prev, { esouiId: result.id, name: result.title, required: true }]);
    setSearchQuery('');
    setSearchResults([]);
    onError(null);
  };

  const handleSearchInput = (_event: unknown, value: string): void => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      void searchEsouiAddons(value.trim())
        .then((results) => {
          setSearchResults(results);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchLoading(false);
        });
    }, 400);
  };

  const handleRemoveAddon = (esouiId: number): void => {
    onAddonsChange((prev) => prev.filter((a) => a.esouiId !== esouiId));
  };

  const handleToggleRequired = (esouiId: number): void => {
    onAddonsChange((prev) =>
      prev.map((a) => (a.esouiId === esouiId ? { ...a, required: !a.required } : a)),
    );
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onAddonsChange((prev) => {
        const oldIdx = prev.findIndex((a) => a.esouiId === active.id);
        const newIdx = prev.findIndex((a) => a.esouiId === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {/* Header bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Extension sx={{ fontSize: 18, color: accentColor }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Addons
            </Typography>
            {addons.length > 0 && (
              <Chip
                label={addons.length}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: alpha(accentColor, 0.12),
                  color: accentColor,
                  border: `1px solid ${alpha(accentColor, 0.25)}`,
                }}
              />
            )}
          </Box>
          {addons.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
              {requiredCount} required · {optionalCount} optional
            </Typography>
          )}
        </Box>

        {/* Addon list or empty state */}
        <Box
          sx={{
            borderRadius: '12px',
            border: `1px solid ${addons.length > 0 ? alpha(accentColor, 0.2) : isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
            overflow: 'hidden',
            transition: 'border-color 0.3s',
          }}
        >
          {addons.length === 0 ? (
            <Box
              sx={{
                py: 4,
                px: 3,
                textAlign: 'center',
                bgcolor: isDark ? alpha('#fff', 0.015) : alpha('#000', 0.015),
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  mx: 'auto',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${alpha(accentColor, 0.12)} 0%, ${alpha(accentColor, 0.04)} 100%)`,
                  border: `1px solid ${alpha(accentColor, 0.2)}`,
                }}
              >
                <Extension sx={{ fontSize: 24, color: alpha(accentColor, 0.6) }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                No addons yet
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1.5 }}>
                Use the form below to add addons to your pack.
                <br />
                You can drag to reorder them after adding.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                maxHeight: 240,
                overflowY: 'auto',
                p: 0.5,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha('#fff', 0.12),
                  borderRadius: 3,
                },
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={addons.map((a) => a.esouiId)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence initial={false}>
                    {addons.map((addon) => (
                      <SortableAddonRow
                        key={addon.esouiId}
                        addon={addon}
                        isDark={isDark}
                        onToggleRequired={handleToggleRequired}
                        onRemove={handleRemoveAddon}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </Box>
          )}

          {/* Addon search autocomplete */}
          <Box
            sx={{
              borderTop: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
              p: 1.5,
              bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
            }}
          >
            <Autocomplete<EsouiAddonSearchResult, false>
              options={searchResults}
              getOptionLabel={(opt) => opt.title}
              filterOptions={(x) => x}
              inputValue={searchQuery}
              onInputChange={handleSearchInput}
              onChange={(_e, value) => handleAddFromSearch(value)}
              value={null}
              loading={searchLoading}
              loadingText="Searching ESOUI…"
              noOptionsText={
                searchQuery.length < 2 ? 'Type to search ESOUI addons…' : 'No addons found'
              }
              getOptionDisabled={(opt) => addons.some((a) => a.esouiId === opt.id)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              blurOnSelect
              clearOnBlur={false}
              size="small"
              renderOption={(props, option) => {
                const alreadyAdded = addons.some((a) => a.esouiId === option.id);
                return (
                  <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.75,
                      px: 1.5,
                      opacity: alreadyAdded ? 0.4 : 1,
                      '&:hover': {
                        bgcolor: `${alpha(accentColor, 0.08)} !important`,
                      },
                    }}
                  >
                    <Add
                      sx={{
                        fontSize: 16,
                        color: alreadyAdded ? 'text.disabled' : accentColor,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {option.title}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                        by {option.author}
                        {option.category ? ` · ${option.category}` : ''}
                        {option.downloads ? ` · ${option.downloads} downloads` : ''}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.58rem',
                        fontFamily: 'monospace',
                        color: 'text.disabled',
                        flexShrink: 0,
                      }}
                    >
                      #{option.id}
                    </Typography>
                    {alreadyAdded && (
                      <Chip
                        label="Added"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          bgcolor: alpha(accentColor, 0.12),
                          color: accentColor,
                        }}
                      />
                    )}
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search ESOUI addons…"
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...params.slotProps.input,
                      startAdornment: (
                        <>
                          {searchLoading ? (
                            <CircularProgress size={16} sx={{ color: accentColor, mr: 0.5 }} />
                          ) : (
                            <Extension sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
                          )}
                          {params.slotProps.input.startAdornment}
                        </>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      bgcolor: isDark ? alpha('#0f172a', 0.6) : '#fff',
                      transition: 'all 0.2s',
                      '& fieldset': {
                        borderColor: isDark ? alpha('#c4a44a', 0.15) : alpha('#000', 0.1),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: accentColor,
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(accentColor, 0.1)}`,
                      },
                    },
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: isDark ? '#0f172a' : '#fff',
                    border: `1px solid ${isDark ? alpha('#c4a44a', 0.15) : alpha('#000', 0.1)}`,
                    borderRadius: '10px',
                    mt: 0.5,
                    boxShadow: isDark
                      ? `0 8px 24px ${alpha('#000', 0.5)}`
                      : '0 4px 16px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    '& .MuiAutocomplete-listbox': {
                      py: 0.5,
                      maxHeight: 240,
                    },
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            onClose={() => onError(null)}
            sx={{
              borderRadius: '10px',
              bgcolor: isDark ? alpha('#ef4444', 0.1) : alpha('#fef2f2', 0.95),
              border: `1px solid ${alpha('#ef4444', 0.3)}`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {error}
          </Alert>
        )}
      </Stack>
    </motion.div>
  );
};
