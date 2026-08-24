/**
 * BulkGearToolbar — multi-slot trait / enchant / weight editor for Equipment.
 *
 * Lives above the gear list while "Bulk edit" is active. The parent
 * (EquipmentPicker) owns slot selection; this toolbar renders the quick-select
 * chips and the apply controls, calling back with the chosen value.
 *
 * Trait/Enchant apply is category-scoped: it's only enabled when every selected
 * slot shares one gear category (so a single trait/enchant list is valid for
 * all). Weight applies only to apparel (the reducer enforces this too).
 */

import {
  AutoFixHigh as TraitIcon,
  Checkroom as ArmorIcon,
  Close as CloseIcon,
  Diamond as JewelryIcon,
  FitnessCenter as WeightIcon,
  LocalFireDepartment as EnchantIcon,
  Bolt as WeaponIcon,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useRef, useState } from 'react';

import type { ArmorWeight } from '../../../loadout-manager/types/loadout.types';
import { getEnchantsForSlot, getTraitsForSlot } from '../../data/gear-traits-enchants';
import { TraitEnchantPicker } from '../primitives/TraitEnchantPicker';

export type SlotCategory = 'apparel' | 'accessories' | 'weapons';

export interface BulkGearPatch {
  trait?: string;
  enchant?: string;
  weight?: ArmorWeight;
}

interface BulkGearToolbarProps {
  selectedCount: number;
  counts: { apparel: number; accessories: number; weapons: number; total: number };
  /** Single shared slot category of the selection, or 'mixed' / null. */
  selectionSlotCategory: SlotCategory | 'mixed' | null;
  hasApparelSelected: boolean;
  onSelectCategory: (category: SlotCategory) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onExit: () => void;
  onApply: (patch: BulkGearPatch) => void;
}

const WEIGHT_OPTIONS: { id: ArmorWeight; label: string; color: string }[] = [
  { id: 'light', label: 'Light', color: '#60a5fa' },
  { id: 'medium', label: 'Medium', color: '#4ade80' },
  { id: 'heavy', label: 'Heavy', color: '#f87171' },
];

const BulkGearToolbarComponent: React.FC<BulkGearToolbarProps> = ({
  selectedCount,
  counts,
  selectionSlotCategory,
  hasApparelSelected,
  onSelectCategory,
  onSelectAll,
  onClear,
  onExit,
  onApply,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [picker, setPicker] = useState<'trait' | 'enchant' | null>(null);
  const traitRef = useRef<HTMLButtonElement>(null);
  const enchantRef = useRef<HTMLButtonElement>(null);
  const [weightAnchor, setWeightAnchor] = useState<HTMLElement | null>(null);

  const singleCategory =
    selectionSlotCategory && selectionSlotCategory !== 'mixed' ? selectionSlotCategory : null;
  const canTraitEnchant = Boolean(singleCategory);

  const traitItems = singleCategory ? getTraitsForSlot(singleCategory) : [];
  const enchantItems = singleCategory ? getEnchantsForSlot(singleCategory) : [];

  const applyHint =
    selectedCount === 0
      ? 'Select slots to edit'
      : !canTraitEnchant
        ? 'Select slots of one type (armor, weapons or jewelry) to set trait/enchant'
        : undefined;

  return (
    <Box
      sx={{
        mb: 1,
        p: 1,
        borderRadius: 2,
        border: '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
        background: isDark
          ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.07)'
          : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.05)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Header row */}
      <Stack direction="row" sx={{ alignItems: 'center', mb: 0.75 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
            color: 'var(--be-accent, #38bdf8)',
            flex: 1,
          }}
        >
          Bulk Edit · {selectedCount} selected
        </Typography>
        <Tooltip title="Done">
          <IconButton size="small" onClick={onExit} aria-label="Exit bulk edit" sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Quick-select chips */}
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 0.75 }}>
        <SelectChip
          icon={<ArmorIcon sx={{ fontSize: 13 }} />}
          label={`Armor ${counts.apparel}`}
          disabled={counts.apparel === 0}
          onClick={() => onSelectCategory('apparel')}
          isDark={isDark}
        />
        <SelectChip
          icon={<WeaponIcon sx={{ fontSize: 13 }} />}
          label={`Weapons ${counts.weapons}`}
          disabled={counts.weapons === 0}
          onClick={() => onSelectCategory('weapons')}
          isDark={isDark}
        />
        <SelectChip
          icon={<JewelryIcon sx={{ fontSize: 13 }} />}
          label={`Jewelry ${counts.accessories}`}
          disabled={counts.accessories === 0}
          onClick={() => onSelectCategory('accessories')}
          isDark={isDark}
        />
        <SelectChip
          label={`All ${counts.total}`}
          disabled={counts.total === 0}
          onClick={onSelectAll}
          isDark={isDark}
        />
        <SelectChip
          label="Clear"
          disabled={selectedCount === 0}
          onClick={onClear}
          isDark={isDark}
        />
      </Stack>

      {/* Apply controls */}
      <Tooltip title={applyHint ?? ''} disableHoverListener={!applyHint} placement="top">
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          <ApplyButton
            ref={traitRef}
            icon={<TraitIcon sx={{ fontSize: 13 }} />}
            label="Set Trait"
            color="#a78bfa"
            disabled={!canTraitEnchant}
            onClick={() => setPicker('trait')}
            isDark={isDark}
          />
          <ApplyButton
            ref={enchantRef}
            icon={<EnchantIcon sx={{ fontSize: 13 }} />}
            label="Set Enchant"
            color="#fb923c"
            disabled={!canTraitEnchant}
            onClick={() => setPicker('enchant')}
            isDark={isDark}
          />
          <ApplyButton
            icon={<WeightIcon sx={{ fontSize: 13 }} />}
            label="Set Weight"
            color="#38bdf8"
            disabled={!hasApparelSelected}
            onClick={(e) => setWeightAnchor(e.currentTarget)}
            isDark={isDark}
          />
        </Stack>
      </Tooltip>

      {/* Trait / Enchant value pickers (reused popover) */}
      <TraitEnchantPicker
        open={picker === 'trait'}
        anchorEl={traitRef.current}
        onClose={() => setPicker(null)}
        mode="trait"
        items={traitItems}
        onSelect={(v) => {
          if (v) onApply({ trait: v });
          setPicker(null);
        }}
      />
      <TraitEnchantPicker
        open={picker === 'enchant'}
        anchorEl={enchantRef.current}
        onClose={() => setPicker(null)}
        mode="enchant"
        items={enchantItems}
        onSelect={(v) => {
          if (v) onApply({ enchant: v });
          setPicker(null);
        }}
      />

      {/* Weight chooser */}
      <Menu
        anchorEl={weightAnchor}
        open={Boolean(weightAnchor)}
        onClose={() => setWeightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {WEIGHT_OPTIONS.map((w) => (
          <MenuItem
            key={w.id}
            onClick={() => {
              onApply({ weight: w.id });
              setWeightAnchor(null);
            }}
            sx={{
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: w.color,
                mr: 1,
                flexShrink: 0,
              }}
            />
            {w.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

// ── Sub-controls ──────────────────────────────────────────────────────────────

const SelectChip: React.FC<{
  icon?: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  isDark: boolean;
}> = ({ icon, label, disabled, onClick, isDark }) => (
  <ButtonBase
    onClick={onClick}
    disabled={disabled}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.4,
      px: 0.85,
      py: 0.35,
      borderRadius: 1.5,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
      color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      transition: 'all 0.15s',
      opacity: disabled ? 0.4 : 1,
      '&:hover': {
        background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      },
    }}
  >
    {icon}
    {label}
  </ButtonBase>
);

const ApplyButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    disabled?: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    isDark: boolean;
  }
>(({ icon, label, color, disabled, onClick, isDark }, ref) => (
  <ButtonBase
    ref={ref}
    onClick={onClick}
    disabled={disabled}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.45,
      px: 1,
      py: 0.45,
      borderRadius: 1.5,
      fontSize: 11.5,
      fontWeight: 700,
      fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
      color: disabled ? (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)') : color,
      border: `1px solid ${disabled ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : `${color}40`}`,
      background: disabled ? 'transparent' : isDark ? `${color}14` : `${color}0C`,
      transition: 'all 0.15s',
      '&:hover': disabled ? undefined : { background: isDark ? `${color}24` : `${color}18` },
    }}
  >
    {icon}
    {label}
  </ButtonBase>
));
ApplyButton.displayName = 'ApplyButton';

export const BulkGearToolbar = React.memo(BulkGearToolbarComponent);
