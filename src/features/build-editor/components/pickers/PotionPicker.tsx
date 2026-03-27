/**
 * PotionPicker — prop-driven potion selector.
 *
 * Displays currently selected potions and opens a categorized PotionPickerDialog.
 * No Redux coupling — receives current potions array and calls onChange on selection.
 *
 * Props:
 *   potions   — BuildPotion[] — the currently selected potions
 *   onChange  — called with the new potions array
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ESO_POTION_CATEGORIES, ESO_POTION_LOOKUP, ESO_POTIONS } from '@/data/esoPotions';
import type { EsoPotion, PotionCategory } from '@/data/esoPotions';

import type { BuildPotion } from '../../types/build.types';
import { CollapsibleSection } from '../primitives/CollapsibleSection';
import { glassAddBtnSx, glassEmptySx } from '../primitives/glass-styles';
import { GlassPanel } from '../primitives/GlassPanel';
import { PickerDialog } from '../primitives/PickerDialog';

// ─── Potion category → UESP alchemy icon mapping ────────────────────────────

const UESP_ICON_CDN = 'https://esoicons.uesp.net/esoui/art/treeicons';

const CATEGORY_ICON_MAP: Record<PotionCategory, string> = {
  'Damage (Magicka)': 'provisioner_indexicon_spirits_up',
  'Damage (Stamina)': 'provisioner_indexicon_meat_up',
  Sustain: 'provisioner_indexicon_wine_up',
  Defensive: 'provisioner_indexicon_baked_up',
  Utility: 'provisioner_indexicon_beer_up',
  Ultimate: 'provisioner_indexicon_stew_up',
};

const getCategoryIconUrl = (category: PotionCategory): string =>
  `${UESP_ICON_CDN}/${CATEGORY_ICON_MAP[category]}.png`;

// ─── Category color mapping ─────────────────────────────────────────────────

const CATEGORY_COLOR: Record<PotionCategory, string> = {
  'Damage (Magicka)': '#ab47bc',
  'Damage (Stamina)': '#66bb6a',
  Sustain: '#42a5f5',
  Defensive: '#ef5350',
  Utility: '#ffa726',
  Ultimate: '#ffee58',
};

const MIN_SEARCH_LENGTH = 2;
const MAX_POTIONS = 3;

// ─── Pre-computed category groupings ────────────────────────────────────────

interface CategoryGroup {
  category: PotionCategory;
  items: EsoPotion[];
}

const POTION_GROUPS: CategoryGroup[] = ESO_POTION_CATEGORIES.map((cat) => ({
  category: cat,
  items: ESO_POTIONS.filter((p) => p.category === cat),
}));

// ─── Potion Row ─────────────────────────────────────────────────────────────

interface PotionRowProps {
  item: EsoPotion;
  isSelected: boolean;
  catColor: string;
  onSelect: (item: EsoPotion) => void;
}

const PotionRow: React.FC<PotionRowProps> = ({ item, isSelected, catColor, onSelect }) => {
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
      <Box
        component={'img' as React.ElementType}
        src={iconUrl}
        alt=""
        sx={{ width: 22, height: 22, flexShrink: 0, opacity: 0.7 }}
      />
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
            label={item.role}
            size="small"
            sx={{
              height: 14,
              fontSize: '0.55rem',
              fontWeight: 700,
              fontFamily: 'Space Grotesk, Inter, system-ui',
              background: `${catColor}30`,
              color: catColor,
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
          {item.effects.join(' · ')}
        </Typography>
      </Box>
    </ButtonBase>
  );
};

// ─── Potion Picker Dialog ───────────────────────────────────────────────────

interface PotionPickerDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<number>;
  onSelect: (item: EsoPotion) => void;
}

const PotionPickerDialog: React.FC<PotionPickerDialogProps> = ({
  open,
  onClose,
  selectedIds,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const isSearching = search.trim().length >= MIN_SEARCH_LENGTH;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase().trim();
    return ESO_POTIONS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.effects.some((e) => e.toLowerCase().includes(q)) ||
        item.role.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [search, isSearching]);

  const handleSelect = useCallback(
    (item: EsoPotion) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <PickerDialog open={open} onClose={onClose} title="Select Potion">
      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder="Search potions by name, effect, or role..."
        resultCount={isSearching ? searchResults.length : undefined}
      />

      {isSearching ? (
        <PickerDialog.Body empty={searchResults.length === 0} emptyMessage="No potions found">
          <Stack spacing={0.5} sx={{ px: 1 }}>
            {searchResults.map((item) => (
              <PotionRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                catColor={CATEGORY_COLOR[item.category]}
                onSelect={handleSelect}
              />
            ))}
          </Stack>
        </PickerDialog.Body>
      ) : (
        <PickerDialog.Body>
          {POTION_GROUPS.map((group) => {
            const iconUrl = getCategoryIconUrl(group.category);
            return (
              <CollapsibleSection
                key={group.category}
                label={group.category}
                count={group.items.length}
                icon={
                  <Box
                    component={'img' as React.ElementType}
                    src={iconUrl}
                    alt=""
                    sx={{ width: 20, height: 20, flexShrink: 0, opacity: 0.75 }}
                  />
                }
              >
                <Stack spacing={0} sx={{ pl: 1, pr: 0.5, pb: 1, pt: 0.25 }}>
                  {group.items.map((item) => (
                    <PotionRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      catColor={CATEGORY_COLOR[group.category]}
                      onSelect={handleSelect}
                    />
                  ))}
                </Stack>
              </CollapsibleSection>
            );
          })}
        </PickerDialog.Body>
      )}
    </PickerDialog>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export interface PotionPickerProps {
  potions: BuildPotion[];
  onChange: (potions: BuildPotion[]) => void;
}

export const PotionPicker: React.FC<PotionPickerProps> = ({ potions, onChange }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(potions.map((p) => p.id)), [potions]);

  const handleSelect = useCallback(
    (item: EsoPotion) => {
      if (selectedIds.has(item.id)) {
        onChange(potions.filter((p) => p.id !== item.id));
      } else if (potions.length < MAX_POTIONS) {
        onChange([...potions, { id: item.id, name: item.name, effects: [...item.effects] }]);
      }
    },
    [potions, selectedIds, onChange],
  );

  const handleRemove = useCallback(
    (id: number) => {
      onChange(potions.filter((p) => p.id !== id));
    },
    [potions, onChange],
  );

  return (
    <Stack spacing={1}>
      {potions.length === 0 ? (
        <Box sx={glassEmptySx(isDark)}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
          >
            No potions selected
          </Typography>
        </Box>
      ) : (
        potions.map((p) => {
          const potionData = ESO_POTION_LOOKUP[p.id];
          const catColor = potionData ? CATEGORY_COLOR[potionData.category] : '#42a5f5';
          const iconUrl = potionData ? getCategoryIconUrl(potionData.category) : null;

          return (
            <GlassPanel key={p.id} sx={{ p: 1.25 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {iconUrl && (
                  <Box
                    component={'img' as React.ElementType}
                    src={iconUrl}
                    alt=""
                    sx={{ width: 28, height: 28, flexShrink: 0, opacity: 0.85 }}
                  />
                )}
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      noWrap
                      sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                    >
                      {p.name}
                    </Typography>
                    {potionData && (
                      <Chip
                        label={potionData.category}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          background: `${catColor}30`,
                          color: catColor,
                          border: 'none',
                        }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                  >
                    {p.effects.join(' · ')}
                  </Typography>
                  {potionData && (
                    <Tooltip title={potionData.reagents.join(' + ')} placement="bottom-start">
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 9,
                          color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
                          fontFamily: 'Space Grotesk, Inter, system-ui',
                          cursor: 'help',
                          display: 'block',
                        }}
                      >
                        {potionData.reagents.join(' + ')}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(p.id)}
                  aria-label={`Remove ${p.name}`}
                  sx={{ color: 'text.disabled', '&:hover': { color: '#ef5350' } }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            </GlassPanel>
          );
        })
      )}

      <Button
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        variant="outlined"
        size="small"
        onClick={() => setDialogOpen(true)}
        disabled={potions.length >= MAX_POTIONS}
        sx={glassAddBtnSx(isDark)}
      >
        {potions.length >= MAX_POTIONS
          ? `Max ${MAX_POTIONS} Potions`
          : potions.length > 0
            ? 'Add Another Potion'
            : 'Add Potion'}
      </Button>

      <PotionPickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedIds={selectedIds}
        onSelect={handleSelect}
      />
    </Stack>
  );
};
