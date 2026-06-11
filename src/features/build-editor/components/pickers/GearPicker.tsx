/**
 * GearPicker — fancy gear selection modal for the build editor.
 *
 * Replaces the plain ItemPickerDialog with a categorized, searchable gear
 * browser that matches the glass-morphism design of FoodPicker / PotionPicker.
 *
 * Browse mode:  Set-type tabs → collapsible set groups → individual items
 * Search mode:  Flat list filtered by item name or set name
 *
 * Props:
 *   open         — dialog visibility
 *   onClose      — close callback
 *   onSelect     — called with the chosen itemId
 *   targetSlot   — slot type to filter items for
 *   slotName     — human-readable slot name for the header
 *   currentItemId — currently equipped item (nullable)
 */

import {
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import {
  Box,
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

import type { CanonicalKeyFn, ItemInfo, SlotType } from '@features/loadout-manager/data/itemIdMap';
import {
  getAvailableSetsForSlot,
  getCanonicalItemsBySlot,
  getItemInfo,
  validateItemForSlot,
} from '@features/loadout-manager/data/itemIdMap';
import {
  deriveItemNameForSlot,
  isIconDataReady,
  preloadIconData,
} from '@features/loadout-manager/utils/itemIconResolver';

import type { ArmorWeight } from '../../../loadout-manager/types/loadout.types';
import {
  getSetType,
  lookupGearSet,
  SET_TYPE_COLORS,
  SET_TYPE_ORDER,
  type GearSetType,
} from '../../data/gearSetRegistry';
import { getLockedArmorWeight } from '../../data/setArmorWeights';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

// Shared apparel-weight badge colors/labels (mirror GearSlotCard).
const WEIGHT_COLORS: Record<ArmorWeight, string> = {
  light: '#60a5fa',
  medium: '#4ade80',
  heavy: '#f87171',
};
const WEIGHT_LABELS: Record<ArmorWeight, string> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

const APPAREL_SLOTS_SET = new Set<SlotType>([
  'head',
  'shoulders',
  'chest',
  'hand',
  'waist',
  'legs',
  'feet',
]);

// Weapon slots pack every weapon TYPE of a set (axe/sword/bow/staff/…) under one
// generic name — see getCanonicalItemsBySlot. For these, the canonical key must
// fold in the per-item weapon type so each type survives as its own pickable row.
const WEAPON_SLOTS_SET = new Set<SlotType>(['weapon', 'offhand']);

/**
 * Canonical dedup key for the gear picker. Weapons key by their slot-aware
 * display name (which carries the weapon type, incl. staff element), so distinct
 * weapon types aren't collapsed away. Everything else keys by set name, folding
 * the ~24 level/quality variants of an apparel/jewelry piece into one row.
 */
function makeCanonicalKey(targetSlot: SlotType): CanonicalKeyFn {
  if (!WEAPON_SLOTS_SET.has(targetSlot)) return (_itemId, info) => info.setName;
  return (itemId, info) => `${info.setName} ${deriveItemNameForSlot(itemId, targetSlot)}`;
}

const WeightBadge: React.FC<{ weight: ArmorWeight }> = ({ weight }) => {
  const isDark = useTheme().palette.mode === 'dark';
  const color = WEIGHT_COLORS[weight];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.5,
        py: 0.15,
        borderRadius: 1,
        fontSize: '0.5rem',
        fontWeight: 700,
        fontFamily: 'Space Grotesk, Inter, system-ui',
        letterSpacing: 0.2,
        flexShrink: 0,
        color,
        background: isDark ? `${color}14` : `${color}0C`,
        border: `1px solid ${isDark ? `${color}30` : `${color}25`}`,
      }}
    >
      {WEIGHT_LABELS[weight]}
    </Box>
  );
};

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 80;
const SEARCH_DEBOUNCE_MS = 160;

// ─── Types ──────────────────────────────────────────────────────────────────

interface SetGroup {
  setName: string;
  setType: GearSetType;
  items: { itemId: number; info: ItemInfo }[];
  bonuses: string[];
}

interface SetGroupResult {
  groups: SetGroup[];
  byType: Map<GearSetType, SetGroup[]>;
}

// ─── Pre-computation helpers ────────────────────────────────────────────────

/**
 * Module-level cache of `buildSetGroups` results keyed by slot.
 *
 * The grouping scans ~500 items per slot and sorts them — expensive enough to
 * be noticeable when opening the picker dialog, especially on mobile. Results
 * are deterministic per slot (underlying item data never changes at runtime),
 * so caching once per slot is safe for the lifetime of the page.
 */
const SET_GROUPS_CACHE: Partial<Record<SlotType, SetGroupResult>> = {};

function getSetGroupsForSlot(targetSlot: SlotType): SetGroupResult {
  const cached = SET_GROUPS_CACHE[targetSlot];
  if (cached) return cached;
  const result = buildSetGroups(targetSlot);
  // Weapon groups key off icon-derived display names (see makeCanonicalKey). If
  // the lazily-imported icon data hasn't loaded yet, every weapon type of a set
  // collapses to its generic name — so DON'T cache that incomplete result, or it
  // would stick for the whole page session. Recompute on the next open; once
  // icon data is ready the correct, fully-split result gets cached.
  if (!WEAPON_SLOTS_SET.has(targetSlot) || isIconDataReady()) {
    SET_GROUPS_CACHE[targetSlot] = result;
  }
  return result;
}

function buildSetGroups(targetSlot: SlotType): SetGroupResult {
  const setSummaries = getAvailableSetsForSlot(targetSlot);
  // Canonical items for this slot. Apparel/jewelry collapse to one row per set
  // (the ~24 level/quality/trait variants are pure noise); weapons keep one row
  // per weapon TYPE so a set's bow / staff / greatsword stay individually
  // selectable. See makeCanonicalKey / getCanonicalItemsBySlot.
  const allItems = getCanonicalItemsBySlot(targetSlot, makeCanonicalKey(targetSlot));

  // Build item lookup by set name
  const itemsBySet = new Map<string, { itemId: number; info: ItemInfo }[]>();
  for (const item of allItems) {
    const list = itemsBySet.get(item.info.setName);
    if (list) list.push(item);
    else itemsBySet.set(item.info.setName, [item]);
  }

  const groups: SetGroup[] = setSummaries.map((summary) => {
    const setType = getSetType(summary.setName);
    const gearData = lookupGearSet(summary.setName);
    return {
      setName: summary.setName,
      setType,
      items: itemsBySet.get(summary.setName) ?? [],
      bonuses: gearData?.bonuses ?? [],
    };
  });

  // Sort: by setType order, then alphabetically within each type
  groups.sort((a, b) => {
    const ta = SET_TYPE_ORDER.indexOf(a.setType);
    const tb = SET_TYPE_ORDER.indexOf(b.setType);
    if (ta !== tb) return ta - tb;
    return a.setName.localeCompare(b.setName);
  });

  const byType = new Map<GearSetType, SetGroup[]>();
  for (const g of groups) {
    const list = byType.get(g.setType);
    if (list) list.push(g);
    else byType.set(g.setType, [g]);
  }

  return { groups, byType };
}

// ─── Set Bonus Preview ──────────────────────────────────────────────────────

const SetBonusPreview: React.FC<{ bonuses: string[] }> = ({ bonuses }) => {
  const isDark = useTheme().palette.mode === 'dark';
  if (bonuses.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 0.5,
        mb: 0.75,
        ml: 1,
        p: 1,
        borderRadius: 1.5,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      {bonuses.map((bonus, idx) => {
        const pieceMatch = bonus.match(/\((\d+)\s*items?\)/i);
        const prefix = pieceMatch ? pieceMatch[0] : '';
        const effect = bonus.replace(/\(\d+\s*items?\)\s*/i, '').trim();
        return (
          <Typography
            key={idx}
            sx={{
              fontSize: 10,
              lineHeight: 1.4,
              color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
              fontFamily: 'Space Grotesk, Inter, system-ui',
              mb: idx < bonuses.length - 1 ? 0.25 : 0,
            }}
          >
            {prefix && (
              <Box
                component="span"
                sx={{
                  color: 'var(--be-accent, #38bdf8)',
                  fontWeight: 700,
                  mr: 0.5,
                }}
              >
                {prefix}
              </Box>
            )}
            {effect}
          </Typography>
        );
      })}
    </Box>
  );
};

// ─── Set Category Section (collapsible) ─────────────────────────────────────

interface SetCategorySectionProps {
  group: SetGroup;
  /**
   * Set name of the currently-equipped piece in this slot. Matched by set name
   * (not item id) so a previously-equipped non-canonical variant still lights up
   * the canonical row as EQUIPPED.
   */
  currentSetName: string | null;
  onSelect: (itemId: number) => void;
  targetSlot: SlotType;
}

const SetCategorySection: React.FC<SetCategorySectionProps> = ({
  group,
  currentSetName,
  onSelect,
  targetSlot,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [showBonuses, setShowBonuses] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const catColor = SET_TYPE_COLORS[group.setType];

  const canonical = group.items[0];
  if (!canonical) return null;

  // Weapon sets carry one canonical item PER weapon TYPE (axe/sword/bow/staff/…),
  // so the set row expands to its types. Apparel/jewelry collapse to a single
  // item, so the row itself is directly selectable. See getCanonicalItemsBySlot.
  const isMultiVariant = group.items.length > 1;
  const isSelected = currentSetName === group.setName;
  const lockedWeight = APPAREL_SLOTS_SET.has(targetSlot)
    ? getLockedArmorWeight(group.setName)
    : null;
  const hasBonuses = group.bonuses.length > 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 1.5,
          background: isSelected
            ? isDark
              ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
              : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
            : 'transparent',
          border: isSelected
            ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
            : '1px solid transparent',
          '&:hover': {
            background: isSelected
              ? undefined
              : isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.03)',
          },
        }}
      >
        {/* Primary action: apparel selects the set's canonical item directly;
            weapons toggle the per-type variant list open. */}
        <ButtonBase
          onClick={() => (isMultiVariant ? setShowVariants((v) => !v) : onSelect(canonical.itemId))}
          aria-label={
            isMultiVariant ? `Choose a ${group.setName} weapon` : `Equip ${group.setName}`
          }
          aria-expanded={isMultiVariant ? showVariants : undefined}
          sx={{
            flex: 1,
            minWidth: 0,
            py: 0.75,
            pl: 1,
            pr: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 1.5,
            textAlign: 'left',
          }}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
            <ShieldIcon sx={{ fontSize: 16, color: catColor, opacity: 0.75, flexShrink: 0 }} />
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.75)',
              }}
            >
              {group.setName}
            </Typography>
            <Chip
              label={group.setType}
              size="small"
              sx={{
                height: 14,
                fontSize: '0.5rem',
                fontWeight: 700,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                background: `${catColor}25`,
                color: catColor,
                border: 'none',
                flexShrink: 0,
              }}
            />
            {lockedWeight && <WeightBadge weight={lockedWeight} />}
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {isSelected && (
              <Chip
                label="EQUIPPED"
                size="small"
                sx={{
                  height: 14,
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  fontFamily: 'Space Grotesk',
                  background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.15)',
                  color: 'var(--be-accent, #38bdf8)',
                  border: 'none',
                  ml: 0.5,
                }}
              />
            )}
            {isMultiVariant && (
              <ExpandIcon
                sx={{
                  fontSize: 16,
                  transition: 'transform 0.2s',
                  transform: showVariants ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                }}
              />
            )}
          </Stack>
        </ButtonBase>

        {/* Secondary action: peek the set bonuses without selecting. */}
        {hasBonuses && (
          <IconButton
            size="small"
            onClick={() => setShowBonuses((v) => !v)}
            aria-label={showBonuses ? 'Hide set bonuses' : 'Show set bonuses'}
            aria-expanded={showBonuses}
            sx={{
              p: 0.4,
              mr: 0.4,
              flexShrink: 0,
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            }}
          >
            <ExpandIcon
              sx={{
                fontSize: 16,
                transition: 'transform 0.2s',
                transform: showBonuses ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </IconButton>
        )}
      </Box>

      <Collapse in={showBonuses} unmountOnExit>
        {hasBonuses && <SetBonusPreview bonuses={group.bonuses} />}
      </Collapse>

      {/* Weapon-type variant list (weapons only). */}
      {isMultiVariant && (
        <Collapse in={showVariants} unmountOnExit>
          <Stack spacing={0} sx={{ pl: 2, pr: 0.5, pb: 0.5, pt: 0.25 }}>
            {group.items.map((item) => (
              <ButtonBase
                key={item.itemId}
                onClick={() => onSelect(item.itemId)}
                aria-label={`Equip ${deriveItemNameForSlot(item.itemId, targetSlot)}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                  px: 1,
                  borderRadius: 1.5,
                  width: '100%',
                  textAlign: 'left',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  },
                }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                  }}
                >
                  {deriveItemNameForSlot(item.itemId, targetSlot)}
                </Typography>
              </ButtonBase>
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
};

// ─── Gear Picker Dialog ─────────────────────────────────────────────────────

interface GearPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (itemId: number) => void;
  targetSlot: SlotType;
  slotName: string;
  currentItemId?: number | null;
}

export const GearPickerDialog: React.FC<GearPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  targetSlot,
  slotName,
  currentItemId = null,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | GearSetType>('all');

  // Weapon-type splitting depends on lazily-loaded icon data. Track readiness so
  // the grouped data recomputes (and re-caches) once it lands, instead of showing
  // a single collapsed weapon row if the picker opens before icon data settles.
  const [iconReady, setIconReady] = useState(() => isIconDataReady());

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('all');
    }
  }, [open]);

  // While open, make sure icon data is loaded so weapon types split correctly.
  useEffect(() => {
    if (!open || iconReady) return;
    let cancelled = false;
    void preloadIconData().then(() => {
      if (!cancelled) setIconReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, iconReady]);

  // Build grouped data for this slot (cached at module scope — per-slot work
  // runs once per page, not once per picker open). `iconReady` is a dep so weapon
  // groups recompute once icon data lands (apparel results are icon-independent).
  const { groups, byType } = useMemo(
    () => getSetGroupsForSlot(targetSlot),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetSlot, iconReady],
  );

  // Available type tabs (only show tabs that have sets)
  const availableTabs = useMemo(() => {
    const tabs: ('all' | GearSetType)[] = ['all'];
    for (const t of SET_TYPE_ORDER) {
      if (byType.has(t)) tabs.push(t);
    }
    return tabs;
  }, [byType]);

  // Visible groups for current tab
  const visibleGroups = useMemo(() => {
    if (activeTab === 'all') return groups;
    return byType.get(activeTab as GearSetType) ?? [];
  }, [activeTab, groups, byType]);

  // Search mode — debounce the value used for filtering so the 500-item scan
  // doesn't run on every keystroke. The input itself keeps `search` for
  // instant-feedback rendering; only the derived result set lags by ~160ms.
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH;

  // Canonical item list for search — computed once per slot, not per keystroke.
  // The weapon-aware key recomputes (it isn't module-cached), and for weapons it
  // scans ~5k items resolving each one's type, so memoize it away from `search`.
  // `iconReady` is a dep for the same reason as the browse groups above.
  const canonicalItems = useMemo(
    () => getCanonicalItemsBySlot(targetSlot, makeCanonicalKey(targetSlot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetSlot, iconReady],
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = debouncedSearch.toLowerCase().trim();
    return canonicalItems
      .filter(
        (item) =>
          item.info.name.toLowerCase().includes(q) || item.info.setName.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [debouncedSearch, isSearching, canonicalItems]);

  const handleSelect = useCallback(
    (itemId: number) => {
      const validation = validateItemForSlot(itemId, targetSlot);
      if (!validation.valid) return;
      onSelect(itemId);
      onClose();
    },
    [onSelect, onClose, targetSlot],
  );

  // Currently equipped item info
  const currentInfo = useMemo(() => {
    if (!currentItemId) return null;
    return getItemInfo(currentItemId) ?? null;
  }, [currentItemId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="glass-dialog"
      slotProps={{
        paper: {
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
        },
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontSize: '1rem',
            background: isDark
              ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Select {slotName} Gear
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close"
          sx={{ color: 'text.disabled' }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* ── Currently equipped ─────────────────────────────── */}
        {currentInfo && (
          <Box
            sx={{
              mx: 2,
              mb: 1.5,
              p: 1,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <ShieldIcon
                sx={{
                  fontSize: 16,
                  color: 'var(--be-accent, #38bdf8)',
                  opacity: 0.6,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                    }}
                  >
                    {currentItemId != null
                      ? deriveItemNameForSlot(currentItemId, targetSlot)
                      : currentInfo.name}
                  </Typography>
                  <Chip
                    label={currentInfo.setName}
                    size="small"
                    sx={{
                      height: 14,
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      fontFamily: 'Space Grotesk',
                      background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)',
                      color: 'var(--be-accent, #38bdf8)',
                      border: 'none',
                    }}
                  />
                </Stack>
                <Typography
                  sx={{
                    fontSize: 9,
                    color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                    fontFamily: 'Space Grotesk',
                  }}
                >
                  Currently equipped · ID: {currentItemId}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* ── Search bar ────────────────────────────────────── */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${slotName.toLowerCase()} gear by name or set...`}
            size="small"
            fullWidth
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, opacity: 0.4 }} />
                  </InputAdornment>
                ),
              },
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
          /* ── Search results ───────────────────────────────── */
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
                No gear found for &ldquo;{search}&rdquo;
              </Typography>
            ) : (
              <>
                <Typography
                  sx={{
                    fontSize: 10,
                    color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
                    fontFamily: 'Space Grotesk',
                    mb: 0.75,
                  }}
                >
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </Typography>
                <Stack spacing={0.5}>
                  {searchResults.map((item) => {
                    const isSelected =
                      currentInfo?.setName != null && item.info.setName === currentInfo.setName;
                    const setType = getSetType(item.info.setName);
                    const catColor = SET_TYPE_COLORS[setType];
                    const lockedWeight = APPAREL_SLOTS_SET.has(targetSlot)
                      ? getLockedArmorWeight(item.info.setName)
                      : null;
                    return (
                      <ButtonBase
                        key={item.itemId}
                        onClick={() => handleSelect(item.itemId)}
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
                        <ShieldIcon
                          sx={{ fontSize: 16, color: catColor, opacity: 0.6, flexShrink: 0 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography
                              noWrap
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: 'Space Grotesk, Inter, system-ui',
                                lineHeight: 1.3,
                              }}
                            >
                              {deriveItemNameForSlot(item.itemId, targetSlot)}
                            </Typography>
                            <Chip
                              label={item.info.setName}
                              size="small"
                              sx={{
                                height: 14,
                                fontSize: '0.5rem',
                                fontWeight: 700,
                                fontFamily: 'Space Grotesk',
                                background: `${catColor}25`,
                                color: catColor,
                                border: 'none',
                              }}
                            />
                            {lockedWeight && <WeightBadge weight={lockedWeight} />}
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: 10,
                              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                              lineHeight: 1.2,
                            }}
                          >
                            {setType} · ID: {item.itemId}
                          </Typography>
                        </Box>
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </>
            )}
          </Box>
        ) : (
          <>
            {/* ── Set type tabs ─────────────────────────────── */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                px: 2,
                pb: 1.5,
                flexWrap: 'wrap',
                rowGap: 0.5,
              }}
            >
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab;
                const label = tab === 'all' ? 'All' : tab;
                const count =
                  tab === 'all' ? groups.length : (byType.get(tab as GearSetType)?.length ?? 0);
                const color = tab === 'all' ? undefined : SET_TYPE_COLORS[tab as GearSetType];
                return (
                  <Tooltip
                    key={tab}
                    title={`${count} set${count !== 1 ? 's' : ''}`}
                    placement="top"
                  >
                    <ButtonBase
                      onClick={() => setActiveTab(tab)}
                      sx={{
                        px: 1,
                        py: 0.4,
                        borderRadius: 1.5,
                        fontSize: 10,
                        fontWeight: isActive ? 700 : 500,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        letterSpacing: 0.3,
                        flexShrink: 0,
                        color: isActive
                          ? (color ?? (isDark ? '#fff' : '#0f172a'))
                          : isDark
                            ? 'rgba(255,255,255,0.45)'
                            : 'rgba(0,0,0,0.45)',
                        background: isActive
                          ? color
                            ? `${color}18`
                            : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.06)'
                          : 'transparent',
                        border: `1px solid ${
                          isActive
                            ? color
                              ? `${color}35`
                              : isDark
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
                      {label}
                    </ButtonBase>
                  </Tooltip>
                );
              })}
            </Box>

            {/* ── Browse mode: set groups ──────────────────── */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 1, pb: 1 }}>
              {visibleGroups.length === 0 ? (
                <Typography
                  sx={{
                    fontSize: 12,
                    color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    textAlign: 'center',
                    py: 3,
                  }}
                >
                  No sets available for this slot
                </Typography>
              ) : (
                visibleGroups.map((group) => (
                  <SetCategorySection
                    key={group.setName}
                    group={group}
                    currentSetName={currentInfo?.setName ?? null}
                    onSelect={handleSelect}
                    targetSlot={targetSlot}
                  />
                ))
              )}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
