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
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ESO_POTION_CATEGORIES, ESO_POTION_LOOKUP, ESO_POTIONS } from '@/data/esoPotions';
import type { EsoPotion, PotionCategory } from '@/data/esoPotions';

import type { BuildPotion } from '../../types/build.types';
import { GlassPanel } from '../primitives/GlassPanel';

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

// ─── Style helpers ──────────────────────────────────────────────────────────

const glassAddBtnSx = (isDark: boolean): Record<string, unknown> => ({
  alignSelf: 'flex-start' as const,
  fontSize: 11,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  borderRadius: '99px',
  textTransform: 'none' as const,
  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
  color: 'var(--be-accent, #38bdf8)',
  backdropFilter: 'blur(6px)',
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
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
  p: 3,
  textAlign: 'center' as const,
  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
});

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

// ─── Potion Category Section (collapsible) ──────────────────────────────────

interface PotionCategorySectionProps {
  group: CategoryGroup;
  selectedIds: Set<number>;
  onSelect: (item: EsoPotion) => void;
}

const PotionCategorySection: React.FC<PotionCategorySectionProps> = ({
  group,
  selectedIds,
  onSelect,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(false);
  const iconUrl = getCategoryIconUrl(group.category);
  const catColor = CATEGORY_COLOR[group.category];

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
          <Box
            component={'img' as React.ElementType}
            src={iconUrl}
            alt=""
            sx={{ width: 20, height: 20, flexShrink: 0, opacity: 0.75 }}
          />
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
            const isSelected = selectedIds.has(item.id);
            return (
              <PotionRow
                key={item.id}
                item={item}
                isSelected={isSelected}
                catColor={catColor}
                onSelect={onSelect}
              />
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
};

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
        '&:hover': {
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
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
  const isDark = useTheme().palette.mode === 'dark';
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
    );
  }, [search, isSearching]);

  const handleSelect = useCallback(
    (item: EsoPotion) => {
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
          backdropFilter: 'blur(20px)',
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
        Select Potion
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search potions by name, effect, or role..."
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
                No potions found
              </Typography>
            ) : (
              <Stack spacing={0.5}>
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
            )}
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1, pb: 1 }}>
            {POTION_GROUPS.map((group) => (
              <PotionCategorySection
                key={group.category}
                group={group}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
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
