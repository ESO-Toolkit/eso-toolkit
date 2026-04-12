/**
 * FoodPicker — prop-driven food / drink selector.
 *
 * Displays the currently selected food and opens a categorized FoodPickerDialog.
 * No Redux coupling — receives current food and calls onChange on selection.
 *
 * Props:
 *   food      — { id?: number; name?: string } — the currently selected food
 *   onChange  — called with the new food value (or {} to clear)
 */

import {
  Add as AddIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ESO_CONSUMABLE_LOOKUP, ESO_CONSUMABLES } from '@/data/esoConsumables';
import type { EsoConsumable } from '@/data/esoConsumables';

import { GlassPanel } from '../primitives/GlassPanel';

// ─── Food category → UESP tree icon mapping ──────────────────────────────────

const UESP_ICON_CDN = 'https://esoicons.uesp.net/esoui/art/treeicons';

const CATEGORY_ICON_MAP: Record<string, string> = {
  'Meat Dishes': 'provisioner_indexicon_meat_up',
  'Fruit Dishes': 'provisioner_indexicon_stew_up',
  'Vegetable Dishes': 'provisioner_indexicon_baked_up',
  Savouries: 'provisioner_indexicon_meat_up',
  Ragout: 'provisioner_indexicon_stew_up',
  Entremet: 'provisioner_indexicon_baked_up',
  Gourmet: 'provisioner_indexicon_stew_up',
  Delicacies: 'provisioner_indexicon_spirits_up',
  'Alcoholic Drinks': 'provisioner_indexicon_beer_up',
  Tea: 'provisioner_indexicon_spirits_up',
  Tonics: 'provisioner_indexicon_wine_up',
  Liqueurs: 'provisioner_indexicon_spirits_up',
  Tinctures: 'provisioner_indexicon_beer_up',
  'Cordial Teas': 'provisioner_indexicon_wine_up',
  Distillates: 'provisioner_indexicon_spirits_up',
};

const getCategoryIconUrl = (category?: string): string | null => {
  if (!category) return null;
  const icon = CATEGORY_ICON_MAP[category];
  return icon ? `${UESP_ICON_CDN}/${icon}.png` : null;
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const glassAddBtnSx = (isDark: boolean): Record<string, unknown> => ({
  alignSelf: 'flex-start' as const,
  fontSize: 11,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  borderRadius: '99px',
  textTransform: 'none' as const,
  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
  color: 'var(--be-accent, #38bdf8)',
  '&:hover': {
    borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
    background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
  },
  '&.Mui-disabled': {
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    color: 'text.disabled',
  },
});

const glassEmptySx = (isDark: boolean): Record<string, unknown> => ({
  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
  p: 3,
  textAlign: 'center' as const,
  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
});

const MIN_SEARCH_LENGTH = 2;

// ─── Pre-computed category groupings ─────────────────────────────────────────

interface CategoryGroup {
  category: string;
  items: EsoConsumable[];
}

const FOOD_CATEGORIES: CategoryGroup[] = (() => {
  const map = new Map<string, EsoConsumable[]>();
  for (const item of ESO_CONSUMABLES) {
    if (item.type !== 'food') continue;
    const list = map.get(item.category);
    if (list) list.push(item);
    else map.set(item.category, [item]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
})();

const DRINK_CATEGORIES: CategoryGroup[] = (() => {
  const map = new Map<string, EsoConsumable[]>();
  for (const item of ESO_CONSUMABLES) {
    if (item.type !== 'drink') continue;
    const list = map.get(item.category);
    if (list) list.push(item);
    else map.set(item.category, [item]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
})();

const ALL_CATEGORIES: CategoryGroup[] = (() => {
  const map = new Map<string, EsoConsumable[]>();
  for (const item of ESO_CONSUMABLES) {
    const list = map.get(item.category);
    if (list) list.push(item);
    else map.set(item.category, [item]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
})();

// ─── Food Category Section (collapsible) ─────────────────────────────────────

interface FoodCategorySectionProps {
  group: CategoryGroup;
  currentFoodId: number | undefined;
  onSelect: (item: EsoConsumable) => void;
}

const FoodCategorySection: React.FC<FoodCategorySectionProps> = ({
  group,
  currentFoodId,
  onSelect,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(false);
  const iconUrl = getCategoryIconUrl(group.category);

  return (
    <Box>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        sx={{
          width: '100%',
          py: 0.75,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 1.5,
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {iconUrl && (
            <Box
              component={'img' as React.ElementType}
              src={iconUrl}
              alt=""
              sx={{ width: 20, height: 20, flexShrink: 0, opacity: 0.75 }}
            />
          )}
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
            }}
          >
            {group.category}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography
            sx={{
              fontSize: 10,
              color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
              fontFamily: 'Space Grotesk',
            }}
          >
            {group.items.length}
          </Typography>
          <ExpandIcon
            sx={{
              fontSize: 16,
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            }}
          />
        </Stack>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={0} sx={{ pl: 1, pr: 0.5, pb: 1, pt: 0.25 }}>
          {group.items.map((item) => {
            const isSelected = item.id === currentFoodId;
            return (
              <ButtonBase
                key={item.id}
                onClick={() => onSelect(item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.6,
                  px: 1,
                  borderRadius: 1.5,
                  width: '100%',
                  textAlign: 'left',
                  background: isSelected
                    ? isDark
                      ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                      : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                    : '1px solid transparent',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  },
                }}
              >
                {iconUrl && (
                  <Box
                    component={'img' as React.ElementType}
                    src={iconUrl}
                    alt=""
                    sx={{ width: 22, height: 22, flexShrink: 0, opacity: 0.7 }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Chip
                      label={item.type.toUpperCase()}
                      size="small"
                      sx={{
                        height: 14,
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        background:
                          item.type === 'food'
                            ? 'rgba(76, 175, 80, 0.18)'
                            : 'rgba(33, 150, 243, 0.18)',
                        color: item.type === 'food' ? '#66bb6a' : '#42a5f5',
                        border: 'none',
                      }}
                    />
                    {item.quality > 0 && (
                      <Typography
                        sx={{
                          fontSize: 10,
                          color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                        }}
                      >
                        Q{item.quality}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </ButtonBase>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
};

// ─── Food Picker Dialog ───────────────────────────────────────────────────────

const FOOD_TABS = [
  { label: 'All', key: 'all' },
  { label: 'Food', key: 'food' },
  { label: 'Drink', key: 'drink' },
] as const;

interface FoodPickerDialogProps {
  open: boolean;
  onClose: () => void;
  currentFoodId: number | undefined;
  onSelect: (item: EsoConsumable) => void;
}

const FoodPickerDialog: React.FC<FoodPickerDialogProps> = ({
  open,
  onClose,
  currentFoodId,
  onSelect,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const categories = useMemo(() => {
    const key = FOOD_TABS[activeTab].key;
    if (key === 'food') return FOOD_CATEGORIES;
    if (key === 'drink') return DRINK_CATEGORIES;
    return ALL_CATEGORIES;
  }, [activeTab]);

  const isSearching = search.trim().length >= MIN_SEARCH_LENGTH;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase().trim();
    return ESO_CONSUMABLES.filter(
      (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [search, isSearching]);

  const handleSelect = useCallback(
    (item: EsoConsumable) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="glass-dialog"
      PaperProps={{
        sx: {
          borderRadius: '20px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
          backgroundColor: 'transparent',
          border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontSize: '1rem',
          pb: 1,
          background: isDark
            ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Select Food / Drink
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food or drink..."
            size="small"
            fullWidth
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderRadius: 2,
                fontSize: 13,
              },
            }}
          />
        </Box>

        {isSearching ? (
          <Box sx={{ px: 2, pb: 2, maxHeight: 400, overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <Typography
                sx={{
                  fontSize: 12,
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  textAlign: 'center',
                  py: 3,
                }}
              >
                No consumables found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {searchResults.map((item) => {
                  const iconUrl = getCategoryIconUrl(item.category);
                  const isSelected = item.id === currentFoodId;
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.75,
                        px: 1,
                        borderRadius: 1.5,
                        width: '100%',
                        textAlign: 'left',
                        background: isSelected
                          ? isDark
                            ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                            : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)'
                          : 'transparent',
                        '&:hover': {
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                      }}
                    >
                      {iconUrl && (
                        <Box
                          component={'img' as React.ElementType}
                          src={iconUrl}
                          alt=""
                          sx={{ width: 24, height: 24, flexShrink: 0, opacity: 0.8 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            noWrap
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: 'Space Grotesk, Inter, system-ui',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </Typography>
                          <Chip
                            label={item.type.toUpperCase()}
                            size="small"
                            sx={{
                              height: 14,
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              fontFamily: 'Space Grotesk, Inter, system-ui',
                              background:
                                item.type === 'food'
                                  ? 'rgba(76, 175, 80, 0.18)'
                                  : 'rgba(33, 150, 243, 0.18)',
                              color: item.type === 'food' ? '#66bb6a' : '#42a5f5',
                              border: 'none',
                            }}
                          />
                        </Stack>
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.category}
                          {item.quality ? ` · Quality ${item.quality}` : ''}
                        </Typography>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : (
          <>
            {/* Browse mode: type tabs + category sections */}
            <Box sx={{ display: 'flex', gap: 0.5, px: 2, pb: 1.5 }}>
              {FOOD_TABS.map((tab, idx) => (
                <ButtonBase
                  key={tab.key}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: 11,
                    fontWeight: activeTab === idx ? 700 : 500,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    letterSpacing: 0.3,
                    flexShrink: 0,
                    color:
                      activeTab === idx
                        ? isDark
                          ? '#fff'
                          : '#0f172a'
                        : isDark
                          ? 'rgba(255,255,255,0.45)'
                          : 'rgba(0,0,0,0.45)',
                    background:
                      activeTab === idx
                        ? isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)'
                        : 'transparent',
                    border: `1px solid ${
                      activeTab === idx
                        ? isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.10)'
                        : 'transparent'
                    }`,
                    transition: 'all 0.15s',
                    '&:hover': {
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  {tab.label}
                </ButtonBase>
              ))}
            </Box>

            <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1, pb: 1 }}>
              {categories.map((group) => (
                <FoodCategorySection
                  key={group.category}
                  group={group}
                  currentFoodId={currentFoodId}
                  onSelect={handleSelect}
                />
              ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export interface FoodPickerProps {
  food: { id?: number; name?: string };
  onChange: (food: { id?: number; name?: string }) => void;
}

export const FoodPicker: React.FC<FoodPickerProps> = ({ food, onChange }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentFood = useMemo(() => {
    if (food.id == null) return null;
    return ESO_CONSUMABLE_LOOKUP[food.id] ?? null;
  }, [food.id]);

  const handleSelect = useCallback(
    (item: EsoConsumable) => {
      onChange({ id: item.id, name: item.name });
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange({});
  }, [onChange]);

  return (
    <Stack spacing={1}>
      {currentFood ? (
        <GlassPanel sx={{ p: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {(() => {
              const iconUrl = getCategoryIconUrl(currentFood.category);
              return iconUrl ? (
                <Box
                  component={'img' as React.ElementType}
                  src={iconUrl}
                  alt=""
                  sx={{ width: 28, height: 28, flexShrink: 0, opacity: 0.85 }}
                />
              ) : null;
            })()}
            <Box flex={1} minWidth={0}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography
                  variant="caption"
                  fontWeight={700}
                  noWrap
                  sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                >
                  {currentFood.name}
                </Typography>
                <Chip
                  label={currentFood.type.toUpperCase()}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    background:
                      currentFood.type === 'food'
                        ? 'rgba(76, 175, 80, 0.18)'
                        : 'rgba(33, 150, 243, 0.18)',
                    color: currentFood.type === 'food' ? '#66bb6a' : '#42a5f5',
                    border: 'none',
                  }}
                />
              </Stack>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
              >
                {currentFood.category}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClear}
              aria-label="Remove food"
              sx={{ color: 'text.disabled', '&:hover': { color: '#ef5350' } }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        </GlassPanel>
      ) : (
        <Box sx={glassEmptySx(isDark)}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
          >
            No food / drink selected
          </Typography>
        </Box>
      )}

      <Button
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        variant="outlined"
        size="small"
        onClick={() => setDialogOpen(true)}
        sx={glassAddBtnSx(isDark)}
      >
        {currentFood ? 'Change Food / Drink' : 'Add Food / Drink'}
      </Button>

      <FoodPickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        currentFoodId={currentFood?.id}
        onSelect={handleSelect}
      />
    </Stack>
  );
};
