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

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { Box, Button, ButtonBase, Chip, IconButton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ESO_CONSUMABLE_LOOKUP, ESO_CONSUMABLES } from '@/data/esoConsumables';
import type { EsoConsumable } from '@/data/esoConsumables';

import { CollapsibleSection } from '../primitives/CollapsibleSection';
import { glassAddBtnSx, glassEmptySx } from '../primitives/glass-styles';
import { GlassPanel } from '../primitives/GlassPanel';
import { PickerDialog } from '../primitives/PickerDialog';
import { PickerTabBar } from '../primitives/PickerTabBar';

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

// ─── Food Item Row ────────────────────────────────────────────────────────────

interface FoodItemRowProps {
  item: EsoConsumable;
  isSelected: boolean;
  onSelect: (item: EsoConsumable) => void;
}

const FoodItemRow: React.FC<FoodItemRowProps> = ({ item, isSelected, onSelect }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const iconUrl = getCategoryIconUrl(item.category);

  return (
    <ButtonBase
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
        transition: 'all 0.12s ease',
        '&:hover': {
          background: isSelected
            ? isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.14)'
              : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
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
                item.type === 'food' ? 'rgba(76, 175, 80, 0.18)' : 'rgba(33, 150, 243, 0.18)',
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
        {/* Show category in search results for context */}
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
};

// ─── Food Picker Dialog ───────────────────────────────────────────────────────

const FOOD_TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'food' as const, label: 'Food' },
  { key: 'drink' as const, label: 'Drink' },
];

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
  const [activeTab, setActiveTab] = useState<'all' | 'food' | 'drink'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const categories = useMemo(() => {
    if (activeTab === 'food') return FOOD_CATEGORIES;
    if (activeTab === 'drink') return DRINK_CATEGORIES;
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
    <PickerDialog open={open} onClose={onClose} title="Select Food / Drink">
      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder="Search food or drink..."
        resultCount={isSearching ? searchResults.length : undefined}
      />

      {isSearching ? (
        <PickerDialog.Body empty={searchResults.length === 0} emptyMessage="No consumables found">
          <Stack spacing={0.5} sx={{ px: 1 }}>
            {searchResults.map((item) => (
              <FoodItemRow
                key={item.id}
                item={item}
                isSelected={item.id === currentFoodId}
                onSelect={handleSelect}
              />
            ))}
          </Stack>
        </PickerDialog.Body>
      ) : (
        <>
          <PickerDialog.Tabs>
            <PickerTabBar tabs={FOOD_TABS} activeKey={activeTab} onChange={setActiveTab} />
          </PickerDialog.Tabs>

          <PickerDialog.Body>
            {categories.map((group) => {
              const iconUrl = getCategoryIconUrl(group.category);
              return (
                <CollapsibleSection
                  key={group.category}
                  label={group.category}
                  count={group.items.length}
                  icon={
                    iconUrl ? (
                      <Box
                        component={'img' as React.ElementType}
                        src={iconUrl}
                        alt=""
                        sx={{ width: 20, height: 20, flexShrink: 0, opacity: 0.75 }}
                      />
                    ) : undefined
                  }
                >
                  <Stack spacing={0} sx={{ pl: 1, pr: 0.5, pb: 1, pt: 0.25 }}>
                    {group.items.map((item) => (
                      <FoodItemRow
                        key={item.id}
                        item={item}
                        isSelected={item.id === currentFoodId}
                        onSelect={handleSelect}
                      />
                    ))}
                  </Stack>
                </CollapsibleSection>
              );
            })}
          </PickerDialog.Body>
        </>
      )}
    </PickerDialog>
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
