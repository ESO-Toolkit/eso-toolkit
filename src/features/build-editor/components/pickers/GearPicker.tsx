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

import { ExpandMore as ExpandIcon, Shield as ShieldIcon } from '@mui/icons-material';
import { Box, ButtonBase, Chip, Collapse, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ItemInfo, SlotType } from '@features/loadout-manager/data/itemIdMap';
import {
  getAvailableSetsForSlot,
  getItemInfo,
  getItemsBySlot,
  validateItemForSlot,
} from '@features/loadout-manager/data/itemIdMap';
import { deriveItemNameForSlot } from '@features/loadout-manager/utils/itemIconResolver';

import {
  getSetType,
  lookupGearSet,
  SET_TYPE_COLORS,
  SET_TYPE_ORDER,
  type GearSetType,
} from '../../data/gearSetRegistry';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PickerDialog } from '../primitives/PickerDialog';

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
  SET_GROUPS_CACHE[targetSlot] = result;
  return result;
}

function buildSetGroups(targetSlot: SlotType): SetGroupResult {
  const setSummaries = getAvailableSetsForSlot(targetSlot);
  const allItems = getItemsBySlot(targetSlot);

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
  currentItemId: number | null;
  onSelect: (itemId: number) => void;
  targetSlot: SlotType;
}

const SetCategorySection: React.FC<SetCategorySectionProps> = ({
  group,
  currentItemId,
  onSelect,
  targetSlot,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  const [expanded, setExpanded] = useState(false);
  const catColor = SET_TYPE_COLORS[group.setType];

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
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <ShieldIcon
            sx={{
              fontSize: 16,
              color: catColor,
              opacity: 0.75,
              flexShrink: 0,
            }}
          />
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
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
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
        {group.bonuses.length > 0 && <SetBonusPreview bonuses={group.bonuses} />}
        <Stack spacing={0} sx={{ pl: 1, pr: 0.5, pb: 1, pt: 0.25 }}>
          {group.items.map((item) => {
            const isSelected = item.itemId === currentItemId;
            return (
              <ButtonBase
                key={item.itemId}
                onClick={() => onSelect(item.itemId)}
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
                <Box sx={{ flex: 1, minWidth: 0 }}>
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
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                      lineHeight: 1.2,
                    }}
                  >
                    ID: {item.itemId}
                    {item.info.type !== 'Gear' ? ` · ${item.info.type}` : ''}
                  </Typography>
                </Box>
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
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}
        </Stack>
      </Collapse>
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

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('all');
    }
  }, [open]);

  // Build grouped data for this slot (cached at module scope — per-slot work
  // runs once per page, not once per picker open).
  const { groups, byType } = useMemo(() => getSetGroupsForSlot(targetSlot), [targetSlot]);

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

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = debouncedSearch.toLowerCase().trim();
    const allItems = getItemsBySlot(targetSlot);
    return allItems
      .filter(
        (item) =>
          item.info.name.toLowerCase().includes(q) || item.info.setName.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [debouncedSearch, isSearching, targetSlot]);

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
    <PickerDialog open={open} onClose={onClose} title={`Select ${slotName} Gear`}>
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
      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder={`Search ${slotName.toLowerCase()} gear by name or set...`}
        resultCount={isSearching ? searchResults.length : undefined}
      />

      {isSearching ? (
        /* ── Search results ───────────────────────────────── */
        <PickerDialog.Body
          empty={searchResults.length === 0}
          emptyMessage={`No gear found for "${search}"`}
        >
          <Stack spacing={0.5}>
            {searchResults.map((item) => {
              const isSelected = item.itemId === currentItemId;
              const setType = getSetType(item.info.setName);
              const catColor = SET_TYPE_COLORS[setType];
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
        </PickerDialog.Body>
      ) : (
        <>
          {/* ── Set type tabs ─────────────────────────────── */}
          <PickerDialog.Tabs>
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
          </PickerDialog.Tabs>

          {/* ── Browse mode: set groups ──────────────────── */}
          <PickerDialog.Body
            empty={visibleGroups.length === 0}
            emptyMessage="No sets available for this slot"
          >
            {visibleGroups.map((group) => (
              <SetCategorySection
                key={group.setName}
                group={group}
                currentItemId={currentItemId}
                onSelect={handleSelect}
                targetSlot={targetSlot}
              />
            ))}
          </PickerDialog.Body>
        </>
      )}
    </PickerDialog>
  );
};
