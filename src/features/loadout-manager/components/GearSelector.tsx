/**
 * Gear Selector Component
 * Displays and manages equipment for a loadout setup
 * Shows all 22 equipment slots with item name and trait
 */

import { Close } from '@mui/icons-material';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';

import { validateItemForSlot, getItemInfo, type SlotType } from '../data/itemIdMap';
import { getCollectionItem, findCollectionItemBySetAndSlotType } from '../data/itemSetCollections';
import { updateGear } from '../store/loadoutSlice';
import { GearConfig, GearPiece } from '../types/loadout.types';
import { fetchItemIconUrl } from '../utils/itemIconResolver';
import { getItemData, getItemIdFromLink } from '../utils/itemLinkParser';
import { registerManualSlot } from '../utils/wizardWardrobeSlotRegistry';

import { ItemPickerDialog } from './ItemPickerDialog';

interface GearSelectorProps {
  gear: GearConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

/**
 * ESO Equipment Slot Definitions
 * Based on ESO's equipment slot system
 */
const GEAR_SLOTS = [
  { slot: 0, name: 'Head', category: 'armor', slotType: 'head' as SlotType },
  { slot: 1, name: 'Neck', category: 'jewelry', slotType: 'neck' as SlotType },
  { slot: 2, name: 'Chest', category: 'armor', slotType: 'chest' as SlotType },
  { slot: 3, name: 'Shoulders', category: 'armor', slotType: 'shoulders' as SlotType },
  { slot: 4, name: 'Main Hand', category: 'weapon', slotType: 'weapon' as SlotType },
  { slot: 5, name: 'Off Hand', category: 'weapon', slotType: 'offhand' as SlotType },
  { slot: 6, name: 'Belt', category: 'armor', slotType: 'waist' as SlotType },
  { slot: 8, name: 'Legs', category: 'armor', slotType: 'legs' as SlotType },
  { slot: 9, name: 'Feet', category: 'armor', slotType: 'feet' as SlotType },
  { slot: 11, name: 'Ring 1', category: 'jewelry', slotType: 'ring' as SlotType },
  { slot: 12, name: 'Ring 2', category: 'jewelry', slotType: 'ring' as SlotType },
  { slot: 16, name: 'Hands', category: 'armor', slotType: 'hand' as SlotType },
  { slot: 20, name: 'Back Bar Main Hand', category: 'weapon', slotType: 'weapon' as SlotType },
  { slot: 21, name: 'Back Bar Off Hand', category: 'weapon', slotType: 'offhand' as SlotType },
] as const;

const SLOT_INDEX_TO_SLOT_TYPE: Record<number, SlotType> = GEAR_SLOTS.reduce(
  (map, slotInfo) => {
    map[slotInfo.slot] = slotInfo.slotType;
    return map;
  },
  {} as Record<number, SlotType>,
);

const FRONT_MAIN_SLOT = 4;
const FRONT_OFF_SLOT = 5;
const BACK_MAIN_SLOT = 20;
const BACK_OFF_SLOT = 21;

const TWO_HANDED_KEYWORDS = ['greatsword', 'battle axe', 'battleaxe', 'maul', 'bow', 'staff'];
// Slot mask values from LibSets/Wizard's Wardrobe exports that map to 2H weapons
const TWO_HANDED_SLOT_MASKS = new Set<number>([
  134_217_728, // Two-handed sword
  268_435_456, // Two-handed axe
  536_870_912, // Maul (WW high-bit variant included)
  1_073_741_824, // Bow
  2_147_483_648, // Inferno staff
  4_294_967_296, // Lightning staff
  8_589_934_592, // Frost staff
  17_179_869_184, // Restoration staff / other 2H magical variants
]);

const isSlotCompatible = (expected: SlotType, actual: SlotType): boolean => {
  if (expected === actual) {
    return true;
  }

  if (expected === 'offhand' && actual === 'weapon') {
    return true;
  }

  return false;
};

/**
 * Extended gear piece with LUA data
 * Matches Wizard's Wardrobe format
 */
interface ExtendedGearPiece extends GearPiece {
  slot?: number;
  name?: string;
  trait?: string;
  setName?: string;
  itemId?: number;
  setId?: number;
}

interface ValidationStatus {
  severity: 'warning' | 'error';
  message: string;
  details?: string;
}

const isKnownItemId = (itemId?: number | null): itemId is number => {
  if (!itemId || Number.isNaN(itemId) || itemId <= 0) {
    return false;
  }
  return Boolean(getItemInfo(itemId) ?? getCollectionItem(itemId));
};

const parseWizardWardrobeId = (rawId: string | number | undefined): number | null => {
  if (typeof rawId === 'number') {
    return rawId;
  }
  if (typeof rawId === 'string') {
    const parsed = parseInt(rawId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getSlotTypeFromIndex = (slotIndex?: number): SlotType | undefined => {
  if (slotIndex == null) {
    return undefined;
  }
  return SLOT_INDEX_TO_SLOT_TYPE[slotIndex];
};

const resolveGearPieceItemId = (gearPiece?: GearPiece): number | null => {
  if (!gearPiece) {
    return null;
  }

  const extendedPiece = gearPiece as ExtendedGearPiece | undefined;

  if (isKnownItemId(extendedPiece?.itemId)) {
    return extendedPiece?.itemId ?? null;
  }

  const wwId = parseWizardWardrobeId(gearPiece.id);
  if (isKnownItemId(wwId)) {
    return wwId;
  }

  const slotType = getSlotTypeFromIndex(extendedPiece?.slot);
  if (extendedPiece?.setId && slotType) {
    const canonicalItem = findCollectionItemBySetAndSlotType(extendedPiece.setId, slotType);
    if (canonicalItem && isKnownItemId(canonicalItem.itemId)) {
      return canonicalItem.itemId;
    }
  }

  if (gearPiece.link) {
    return getItemIdFromLink(gearPiece.link);
  }

  return null;
};

// ---------------------------------------------------------------------------
// SVG slot icons – simple silhouettes inspired by the ESO character screen
// ---------------------------------------------------------------------------
const SLOT_ICON_PATHS: Record<string, string> = {
  Head: 'M12 2C9 2 6.5 4 6 7c-.3 1.5 0 3 .5 4 .3.7.5 1.2.5 2v1h10v-1c0-.8.2-1.3.5-2 .5-1 .8-2.5.5-4C17.5 4 15 2 12 2z',
  Chest: 'M6 6l-3 3v9h6v-5h6v5h6V9l-3-3h-4l-2 2-2-2H6z',
  Shoulders: 'M4 8c0-2 2-4 4-4h1v4H5v6h4v2H4V8zm16 0c0-2-2-4-4-4h-1v4h4v6h-4v2h5V8z',
  Hands: 'M7 3v7l-2 1v5l3 4h8l3-4v-5l-2-1V3h-3v6h-1V2h-3v7h-1V3H7z',
  Belt: 'M3 10h18v4H3v-4zm8 0v4h2v-4h-2z',
  Legs: 'M7 4h4v7l-2 9H6l1-9V4zm6 0h4v7l1 9h-3l-2-9V4z',
  Feet: 'M6 8l-2 6v4h7v-3l1-3 1 3v3h7v-4l-2-6h-4l-1 2h-2L10 8H6z',
  Neck: 'M12 4a4 4 0 0 0-4 4c0 1.7 1.3 3.2 3 3.8V14h2v-2.2c1.7-.6 3-2.1 3-3.8a4 4 0 0 0-4-4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-1 5h2v4h-2v-4z',
  'Ring 1': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  'Ring 2': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  'Main Hand': 'M6 20l2-2 8-8 2 2 2-2-4-4-2 2-2-2 2-2-2-2-2 2-8 8z',
  'Off Hand':
    'M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4zm0 2.2L18 9v3c0 3.5-2.6 6.8-6 7.8V5.2z',
  'Back Bar Main Hand': 'M6 20l2-2 8-8 2 2 2-2-4-4-2 2-2-2 2-2-2-2-2 2-8 8z',
  'Back Bar Off Hand':
    'M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4zm0 2.2L18 9v3c0 3.5-2.6 6.8-6 7.8V5.2z',
};

const SlotIcon: React.FC<{ name: string; size?: number; color?: string }> = ({
  name,
  size = 24,
  color = 'currentColor',
}) => {
  const path = SLOT_ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Gear Tile – single equipment slot rendered as an icon tile
// ---------------------------------------------------------------------------
interface GearTileProps {
  slotName: string;
  gearPiece?: ExtendedGearPiece;
  onRemove: () => void;
  onAdd: () => void;
  addDisabled?: boolean;
  disabledReason?: string;
  validationStatus?: ValidationStatus | null;
  tileSize?: number;
}

const GearTile: React.FC<GearTileProps> = ({
  slotName,
  gearPiece,
  onRemove,
  onAdd,
  addDisabled,
  disabledReason,
  validationStatus,
  tileSize = 74,
}) => {
  const theme = useTheme();
  const logger = useLogger('GearSelector:GearTile');

  const hasGear = Boolean(gearPiece?.name || gearPiece?.link);
  const isMythic = gearPiece?.trait?.toLowerCase() === 'mythic';

  const [itemData, setItemData] = useState<{ name: string; setName?: string } | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconFailed, setIconFailed] = useState(false);

  const resolvedItemId = useMemo(() => resolveGearPieceItemId(gearPiece), [gearPiece]);
  const collectionItem = useMemo(
    () => (resolvedItemId ? getCollectionItem(resolvedItemId) : undefined),
    [resolvedItemId],
  );
  const resolvedSetId = gearPiece?.setId ?? collectionItem?.setId;

  useEffect(() => {
    if (gearPiece?.link && !gearPiece?.name) {
      getItemData(gearPiece.link)
        .then((data) => {
          if (data?.name) setItemData({ name: data.name, setName: data.setName });
        })
        .catch((err) => {
          logger.warn('Failed to fetch item metadata', {
            slotName,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
  }, [gearPiece?.link, gearPiece?.name, logger, slotName]);

  // Fetch item icon from UESP
  useEffect(() => {
    if (resolvedItemId && resolvedItemId > 0) {
      setIconFailed(false);
      fetchItemIconUrl(resolvedItemId)
        .then((url) => {
          if (url) setIconUrl(url);
        })
        .catch(() => {
          /* silently fail; SVG fallback will show */
        });
    } else {
      setIconUrl(null);
    }
  }, [resolvedItemId]);

  const setName = gearPiece?.setName || itemData?.setName;
  const primaryItemName = gearPiece?.name || itemData?.name || setName;
  const showItemIdFallback = resolvedItemId && !resolvedSetId && !setName ? resolvedItemId : null;
  const fallbackLabel = resolvedSetId
    ? `Set ID ${resolvedSetId}`
    : showItemIdFallback
      ? `Unknown (ID ${showItemIdFallback})`
      : 'Unknown Item';
  const gearLabel = setName ?? primaryItemName ?? fallbackLabel;

  const tooltipLines: string[] = [slotName];
  if (hasGear) {
    tooltipLines.push(gearLabel);
    if (setName && setName !== gearLabel) tooltipLines.push(setName);
    if (isMythic) tooltipLines.push('Mythic');
  } else {
    tooltipLines.push(addDisabled ? (disabledReason ?? 'Locked') : 'Click to equip');
  }
  if (validationStatus) tooltipLines.push(`⚠ ${validationStatus.message}`);

  const handleClick = useCallback(() => {
    if (hasGear) {
      onAdd(); // open picker to change item
    } else if (!addDisabled) {
      onAdd();
    }
  }, [hasGear, addDisabled, onAdd]);

  const equippedBorder = isMythic ? theme.palette.warning.main : theme.palette.primary.main;

  return (
    <Tooltip
      title={tooltipLines.join('\n')}
      placement="top"
      arrow
      slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line', textAlign: 'center' } } }}
    >
      <Box
        onClick={handleClick}
        sx={{
          position: 'relative',
          width: tileSize,
          height: tileSize,
          borderRadius: 1,
          border: '2px solid',
          borderColor: hasGear ? alpha(equippedBorder, 0.6) : alpha(theme.palette.divider, 0.4),
          bgcolor: hasGear ? alpha(equippedBorder, 0.1) : alpha(theme.palette.action.hover, 0.3),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: addDisabled && !hasGear ? 'default' : 'pointer',
          transition: 'all 150ms ease',
          '&:hover': {
            borderColor: hasGear ? equippedBorder : alpha(theme.palette.primary.main, 0.5),
            bgcolor: hasGear
              ? alpha(equippedBorder, 0.18)
              : alpha(theme.palette.primary.main, 0.08),
            transform: 'scale(1.05)',
          },
          opacity: addDisabled && !hasGear ? 0.35 : 1,
        }}
      >
        {/* Item icon: actual image from UESP or SVG fallback */}
        {hasGear && iconUrl && !iconFailed ? (
          <Box
            component="img"
            src={iconUrl}
            alt={gearLabel}
            onError={() => setIconFailed(true)}
            sx={{
              width: tileSize * 0.55,
              height: tileSize * 0.55,
              objectFit: 'contain',
              borderRadius: 0.5,
              filter: isMythic ? 'drop-shadow(0 0 3px rgba(255,167,38,0.6))' : 'none',
            }}
          />
        ) : (
          <SlotIcon
            name={slotName}
            size={tileSize * 0.4}
            color={
              hasGear
                ? isMythic
                  ? theme.palette.warning.light
                  : theme.palette.primary.light
                : alpha(theme.palette.text.secondary, 0.4)
            }
          />
        )}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            lineHeight: 1.15,
            mt: 0.25,
            px: 0.25,
            width: tileSize - 8,
            textAlign: 'center',
            color: hasGear ? 'text.primary' : 'text.disabled',
            fontWeight: hasGear ? 600 : 400,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {hasGear ? gearLabel : slotName}
        </Typography>

        {/* Validation dot */}
        {validationStatus && (
          <Box
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: validationStatus.severity === 'error' ? 'error.main' : 'warning.main',
            }}
          />
        )}

        {/* Remove button (appears on hover) */}
        {hasGear && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              p: 0,
              width: 16,
              height: 16,
              bgcolor: 'error.main',
              color: 'white',
              opacity: 0,
              transition: 'opacity 150ms',
              '.MuiBox-root:hover > &': { opacity: 1 },
              '&:hover': { bgcolor: 'error.dark', opacity: 1 },
            }}
          >
            <Close sx={{ fontSize: 10 }} />
          </IconButton>
        )}
      </Box>
    </Tooltip>
  );
};

/**
 * Main Gear Selector Component
 */
export const GearSelector: React.FC<GearSelectorProps> = ({
  gear,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const dispatch = useDispatch();
  const logger = useLogger('GearSelector');
  const [pickerOpen, setPickerOpen] = useState(false);
  type PickerSlotState = {
    index: number;
    name: string;
    type: SlotType;
    currentItemId?: number | null;
  };
  const [pickerSlot, setPickerSlot] = useState<PickerSlotState | null>(null);
  const slotValidationStates = useMemo<Record<number, ValidationStatus | null>>(() => {
    const states: Record<number, ValidationStatus | null> = {};
    GEAR_SLOTS.forEach(({ slot, slotType, name }) => {
      const gearPiece = gear[slot];
      if (!gearPiece) {
        states[slot] = null;
        return;
      }

      const itemId = resolveGearPieceItemId(gearPiece);
      if (!itemId) {
        states[slot] = {
          severity: 'warning',
          message: 'Unknown item reference',
          details: `The saved ${name} entry is missing an item ID and cannot be validated.`,
        };
        return;
      }

      const itemInfo = getItemInfo(itemId);
      if (!itemInfo) {
        states[slot] = {
          severity: 'warning',
          message: 'Not in database',
          details: `Item ${itemId} is not part of the slot coverage dataset yet.`,
        };
        return;
      }

      if (!itemInfo.slot) {
        states[slot] = {
          severity: 'warning',
          message: 'Missing slot metadata',
          details: `"${itemInfo.name}" has no confirmed slot information. Wizards Wardrobe exports may fail.`,
        };
        return;
      }

      if (!isSlotCompatible(slotType, itemInfo.slot)) {
        states[slot] = {
          severity: 'error',
          message: `Slot mismatch (${itemInfo.slot})`,
          details: `Expected ${slotType} slot but the dataset labels it as ${itemInfo.slot}.`,
        };
        return;
      }

      states[slot] = null;
    });
    return states;
  }, [gear]);

  const isTwoHandedFromText = (text?: string | null): boolean => {
    if (!text) {
      return false;
    }
    const normalized = text.toLowerCase();
    return TWO_HANDED_KEYWORDS.some((keyword) => normalized.includes(keyword));
  };

  const isTwoHandedByItemId = (itemId: number | null): boolean => {
    if (!itemId) {
      return false;
    }

    const collectionItem = getCollectionItem(itemId);
    if (collectionItem?.slotMask && TWO_HANDED_SLOT_MASKS.has(collectionItem.slotMask)) {
      return true;
    }

    const itemInfo = getItemInfo(itemId);
    return itemInfo ? isTwoHandedFromText(itemInfo.name) : false;
  };

  const isTwoHandedGearPiece = (gearPiece?: GearPiece): boolean => {
    if (!gearPiece) {
      return false;
    }

    const extendedPiece = gearPiece as ExtendedGearPiece;
    if (isTwoHandedFromText(extendedPiece?.name) || isTwoHandedFromText(extendedPiece?.setName)) {
      return true;
    }

    const itemId = resolveGearPieceItemId(gearPiece);
    return isTwoHandedByItemId(itemId);
  };

  const isFrontTwoHanded = isTwoHandedGearPiece(gear[FRONT_MAIN_SLOT]);
  const isBackTwoHanded = isTwoHandedGearPiece(gear[BACK_MAIN_SLOT]);

  const slotDisableReasons = useMemo<Partial<Record<number, string>>>(() => {
    const reasons: Partial<Record<number, string>> = {};
    if (isFrontTwoHanded) {
      reasons[FRONT_OFF_SLOT] = 'Disabled: front bar weapon uses both hands';
    }
    if (isBackTwoHanded) {
      reasons[BACK_OFF_SLOT] = 'Disabled: back bar weapon uses both hands';
    }
    return reasons;
  }, [isFrontTwoHanded, isBackTwoHanded]);

  const getMatchingOffhandSlot = (slotIndex: number): number | null => {
    if (slotIndex === FRONT_MAIN_SLOT) {
      return FRONT_OFF_SLOT;
    }
    if (slotIndex === BACK_MAIN_SLOT) {
      return BACK_OFF_SLOT;
    }
    return null;
  };

  const handleRemoveGear = (slotIndex: number): void => {
    const updatedGear = { ...gear };
    delete updatedGear[slotIndex];

    dispatch(
      updateGear({
        trialId,
        pageIndex,
        setupIndex,
        gear: updatedGear,
      }),
    );
  };

  const handleAddGear = (slotIndex: number, slotName: string, slotType: SlotType): void => {
    if (slotDisableReasons[slotIndex]) {
      return;
    }
    const existingPiece = gear[slotIndex];
    const currentItemId = resolveGearPieceItemId(existingPiece);

    setPickerSlot({ index: slotIndex, name: slotName, type: slotType, currentItemId });
    setPickerOpen(true);
  };

  const handleSelectItem = (itemId: number): void => {
    if (!pickerSlot) return;

    if (slotDisableReasons[pickerSlot.index]) {
      return;
    }

    // Validate item for slot
    const validation = validateItemForSlot(itemId, pickerSlot.type);
    if (!validation.valid) {
      const errorMessage = validation.error ?? 'Item validation failed';
      logger.error(errorMessage, new Error(errorMessage), {
        itemId,
        slotType: pickerSlot.type,
      });
      return;
    }

    // Get item info
    let itemInfo = getItemInfo(itemId);
    if (!itemInfo) {
      logger.error('Item not found in itemIdMap', new Error('Item not found'), { itemId });
      return;
    }

    let resolvedItemId = itemId;
    let collectionItem = getCollectionItem(itemId);

    if (collectionItem?.setId) {
      const canonicalCollectionItem = findCollectionItemBySetAndSlotType(
        collectionItem.setId,
        pickerSlot.type,
      );
      if (canonicalCollectionItem) {
        resolvedItemId = canonicalCollectionItem.itemId;
        collectionItem = canonicalCollectionItem;
        const canonicalItemInfo = getItemInfo(resolvedItemId);
        if (canonicalItemInfo) {
          itemInfo = canonicalItemInfo;
        }
      }
    }

    registerManualSlot(resolvedItemId, pickerSlot.type);

    // Create gear piece with extended info
    const newGearPiece: ExtendedGearPiece = {
      link: `|H1:item:${resolvedItemId}|h|h`, // Simplified item link format
      id: resolvedItemId,
      itemId: resolvedItemId,
      name: itemInfo.name,
      setName: itemInfo.setName,
      trait: itemInfo.slot || 'Unknown',
      slot: pickerSlot.index,
      setId: collectionItem?.setId,
    };

    let updatedGear: GearConfig = {
      ...gear,
      [pickerSlot.index]: newGearPiece,
    };

    if (isTwoHandedByItemId(resolvedItemId)) {
      const offhandSlot = getMatchingOffhandSlot(pickerSlot.index);
      if (offhandSlot !== null && updatedGear[offhandSlot]) {
        const adjustedGear = { ...updatedGear };
        delete adjustedGear[offhandSlot];
        updatedGear = adjustedGear;
      }
    }

    dispatch(
      updateGear({
        trialId,
        pageIndex,
        setupIndex,
        gear: updatedGear,
      }),
    );
  };

  const handleClosePicker = (): void => {
    setPickerOpen(false);
    setPickerSlot(null);
  };

  // Render helper – creates a GearTile for a slot definition
  const renderTile = ({ slot, name, slotType }: (typeof GEAR_SLOTS)[number]): React.JSX.Element => (
    <GearTile
      key={slot}
      slotName={name}
      gearPiece={gear[slot] as ExtendedGearPiece}
      onRemove={() => handleRemoveGear(slot)}
      onAdd={() => handleAddGear(slot, name, slotType)}
      addDisabled={Boolean(slotDisableReasons[slot])}
      disabledReason={slotDisableReasons[slot]}
      validationStatus={slotValidationStates[slot]}
    />
  );

  // Slot lookup helper
  const slotDef = (slotIndex: number): (typeof GEAR_SLOTS)[number] =>
    GEAR_SLOTS.find((s) => s.slot === slotIndex)!;

  return (
    <Stack spacing={2} alignItems="center">
      {/* ── APPAREL ────────────────────────── */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: 'text.secondary',
          alignSelf: 'stretch',
          textAlign: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 0.5,
        }}
      >
        Apparel
      </Typography>

      {/* Row 1: Head · Chest · Shoulders */}
      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(0))}
        {renderTile(slotDef(2))}
        {renderTile(slotDef(3))}
      </Stack>

      {/* Row 2: Hands · Belt · Legs */}
      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(16))}
        {renderTile(slotDef(6))}
        {renderTile(slotDef(8))}
      </Stack>

      {/* Row 3: Feet */}
      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(9))}
      </Stack>

      {/* ── ACCESSORIES ────────────────────── */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: 'text.secondary',
          alignSelf: 'stretch',
          textAlign: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 0.5,
          mt: 1,
        }}
      >
        Accessories
      </Typography>

      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(1))}
        {renderTile(slotDef(11))}
        {renderTile(slotDef(12))}
      </Stack>

      {/* ── WEAPONS ────────────────────────── */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: 'text.secondary',
          alignSelf: 'stretch',
          textAlign: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 0.5,
          mt: 1,
        }}
      >
        Weapons
      </Typography>

      {/* Front bar */}
      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(4))}
        {renderTile(slotDef(5))}
      </Stack>

      {/* Back bar */}
      <Stack direction="row" spacing={1} justifyContent="center">
        {renderTile(slotDef(20))}
        {renderTile(slotDef(21))}
      </Stack>

      {/* Item Picker Dialog */}
      {pickerSlot && (
        <ItemPickerDialog
          open={pickerOpen}
          onClose={handleClosePicker}
          onSelect={handleSelectItem}
          targetSlot={pickerSlot.type}
          slotName={pickerSlot.name}
          currentItemId={pickerSlot.currentItemId ?? undefined}
        />
      )}
    </Stack>
  );
};
