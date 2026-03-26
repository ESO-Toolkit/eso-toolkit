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

import { Shield as ShieldIcon } from '@mui/icons-material';
import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ItemInfo, SlotType } from '@features/loadout-manager/data/itemIdMap';
import {
  getAvailableSetsForSlot,
  getItemInfo,
  getItemsBySlot,
  validateItemForSlot,
} from '@features/loadout-manager/data/itemIdMap';

import {
  getSetType,
  lookupGearSet,
  SET_TYPE_COLORS,
  SET_TYPE_ORDER,
  type GearSetType,
} from '../../data/gearSetRegistry';
import { CollapsibleSection } from '../primitives/CollapsibleSection';
import { PickerDialog } from '../primitives/PickerDialog';
import { PickerTabBar } from '../primitives/PickerTabBar';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 80;

// ─── Types ──────────────────────────────────────────────────────────────────

interface SetGroup {
  setName: string;
  setType: GearSetType;
  items: { itemId: number; info: ItemInfo }[];
  bonuses: string[];
}

// ─── Pre-computation helpers ────────────────────────────────────────────────

function buildSetGroups(targetSlot: SlotType): {
  groups: SetGroup[];
  byType: Map<GearSetType, SetGroup[]>;
} {
  const setSummaries = getAvailableSetsForSlot(targetSlot);
  const allItems = getItemsBySlot(targetSlot);

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

// ─── Gear Item Row ──────────────────────────────────────────────────────────

interface GearItemRowProps {
  itemId: number;
  info: ItemInfo;
  isSelected: boolean;
  catColor?: string;
  onSelect: (itemId: number) => void;
}

const GearItemRow: React.FC<GearItemRowProps> = ({
  itemId,
  info,
  isSelected,
  catColor,
  onSelect,
}) => {
  const isDark = useTheme().palette.mode === 'dark';

  return (
    <ButtonBase
      onClick={() => onSelect(itemId)}
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
      {catColor && (
        <ShieldIcon sx={{ fontSize: 16, color: catColor, opacity: 0.6, flexShrink: 0 }} />
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
            {info.name}
          </Typography>
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
        </Stack>
        <Typography
          sx={{
            fontSize: 10,
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            lineHeight: 1.2,
          }}
        >
          ID: {itemId}
          {info.type !== 'Gear' ? ` · ${info.type}` : ''}
        </Typography>
      </Box>
    </ButtonBase>
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

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('all');
    }
  }, [open]);

  const { groups, byType } = useMemo(() => buildSetGroups(targetSlot), [targetSlot]);

  // Build tabs with color coding
  const tabs = useMemo(() => {
    const result: { key: 'all' | GearSetType; label: string; color?: string }[] = [
      { key: 'all', label: 'All' },
    ];
    for (const t of SET_TYPE_ORDER) {
      if (byType.has(t)) result.push({ key: t, label: t, color: SET_TYPE_COLORS[t] });
    }
    return result;
  }, [byType]);

  const visibleGroups = useMemo(() => {
    if (activeTab === 'all') return groups;
    return byType.get(activeTab as GearSetType) ?? [];
  }, [activeTab, groups, byType]);

  const isSearching = search.trim().length >= MIN_SEARCH_LENGTH;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase().trim();
    const allItems = getItemsBySlot(targetSlot);
    return allItems
      .filter(
        (item) =>
          item.info.name.toLowerCase().includes(q) || item.info.setName.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [search, isSearching, targetSlot]);

  const handleSelect = useCallback(
    (itemId: number) => {
      const validation = validateItemForSlot(itemId, targetSlot);
      if (!validation.valid) return;
      onSelect(itemId);
      onClose();
    },
    [onSelect, onClose, targetSlot],
  );

  const currentInfo = useMemo(() => {
    if (!currentItemId) return null;
    return getItemInfo(currentItemId) ?? null;
  }, [currentItemId]);

  return (
    <PickerDialog open={open} onClose={onClose} title={`Select ${slotName} Gear`}>
      {/* Currently equipped indicator */}
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
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <ShieldIcon sx={{ fontSize: 16, color: 'var(--be-accent, #38bdf8)', opacity: 0.6 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography
                  noWrap
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)',
                  }}
                >
                  {currentInfo.name}
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

      <PickerDialog.Search
        value={search}
        onChange={setSearch}
        placeholder={`Search ${slotName.toLowerCase()} gear by name or set...`}
        resultCount={isSearching ? searchResults.length : undefined}
      />

      {isSearching ? (
        <PickerDialog.Body
          empty={searchResults.length === 0}
          emptyMessage={`No gear found for \u201c${search}\u201d`}
        >
          <Stack spacing={0.5} sx={{ px: 1 }}>
            {searchResults.map((item) => {
              const setType = getSetType(item.info.setName);
              const catColor = SET_TYPE_COLORS[setType];
              return (
                <GearItemRow
                  key={item.itemId}
                  itemId={item.itemId}
                  info={item.info}
                  isSelected={item.itemId === currentItemId}
                  catColor={catColor}
                  onSelect={handleSelect}
                />
              );
            })}
          </Stack>
        </PickerDialog.Body>
      ) : (
        <>
          <PickerDialog.Tabs>
            <PickerTabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
          </PickerDialog.Tabs>

          <PickerDialog.Body
            empty={visibleGroups.length === 0}
            emptyMessage="No sets available for this slot"
          >
            {visibleGroups.map((group) => {
              const catColor = SET_TYPE_COLORS[group.setType];
              return (
                <CollapsibleSection
                  key={group.setName}
                  label={group.setName}
                  count={group.items.length}
                  icon={
                    <ShieldIcon
                      sx={{ fontSize: 16, color: catColor, opacity: 0.75, flexShrink: 0 }}
                    />
                  }
                >
                  {group.bonuses.length > 0 && <SetBonusPreview bonuses={group.bonuses} />}
                  <Stack spacing={0} sx={{ pl: 1, pr: 0.5, pb: 1, pt: 0.25 }}>
                    {group.items.map((item) => (
                      <GearItemRow
                        key={item.itemId}
                        itemId={item.itemId}
                        info={item.info}
                        isSelected={item.itemId === currentItemId}
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
