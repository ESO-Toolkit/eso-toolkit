/**
 * Gear Selector Component
 * Displays and manages equipment for a loadout setup
 * Shows all 22 equipment slots with item name and trait
 */

import { Close, Add } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';

import { validateItemForSlot, getItemInfo, type SlotType } from '../data/itemIdMap';
import { getCollectionItem, findCollectionItemBySetAndSlotType } from '../data/itemSetCollections';
import { updateGear } from '../store/loadoutSlice';
import { GearConfig, GearPiece } from '../types/loadout.types';
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

/**
 * Gear piece display component
 */
interface GearPieceDisplayProps {
  slotName: string;
  gearPiece?: ExtendedGearPiece;
  onRemove: () => void;
  onAdd: () => void;
  addDisabled?: boolean;
  disabledReason?: string;
  validationStatus?: ValidationStatus | null;
}

const GearPieceDisplay: React.FC<GearPieceDisplayProps> = ({
  slotName,
  gearPiece,
  onRemove,
  onAdd,
  addDisabled,
  disabledReason,
  validationStatus,
}) => {
  const logger = useLogger('GearSelector:GearPieceDisplay');
  // Check for either name or link (Wizard's Wardrobe provides link)
  const hasGear = gearPiece?.name || gearPiece?.link;
  const isMythic = gearPiece?.trait?.toLowerCase() === 'mythic';

  // State for item data fetched from database or API
  const [itemData, setItemData] = useState<{ name: string; setName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resolvedItemId = useMemo(() => resolveGearPieceItemId(gearPiece), [gearPiece]);
  const collectionItem = useMemo(
    () => (resolvedItemId ? getCollectionItem(resolvedItemId) : undefined),
    [resolvedItemId],
  );
  const resolvedSetId = gearPiece?.setId ?? collectionItem?.setId;

  // Fetch item name when component mounts or link changes
  useEffect(() => {
    if (gearPiece?.link && !gearPiece?.name) {
      setIsLoading(true);
      getItemData(gearPiece.link)
        .then((data) => {
          if (data?.name) {
            setItemData({ name: data.name, setName: data.setName });
          }
        })
        .catch((err) => {
          logger.warn('Failed to fetch item metadata for gear slot', {
            slotName,
            error: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [gearPiece?.link, gearPiece?.name, logger, slotName]);

  const setName = gearPiece?.setName || itemData?.setName;
  const primaryItemName = gearPiece?.name || itemData?.name || setName;
  const showAsEquipped = hasGear && !gearPiece?.name && !itemData?.name;
  const showItemIdFallback = resolvedItemId && !resolvedSetId && !setName ? resolvedItemId : null;
  const gearLabel = primaryItemName
    ? `${slotName}: ${primaryItemName}`
    : resolvedSetId
      ? `${slotName}: ${resolvedSetId}`
      : showItemIdFallback
        ? `${slotName}: Unknown Set (ID ${showItemIdFallback})`
        : `${slotName}: Unknown Set`;
  let isSameAsPrimary = false;
  if (primaryItemName && setName) {
    isSameAsPrimary = setName.localeCompare(primaryItemName, undefined, { sensitivity: 'accent' }) === 0;
  }
  const shouldRenderSetName = Boolean(setName && !isSameAsPrimary);

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        transition: 'all 0.2s',
        borderColor: hasGear ? 'primary.main' : 'divider',
        bgcolor: hasGear
          ? (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(144, 202, 249, 0.08)'
                : 'rgba(25, 118, 210, 0.04)'
          : 'background.paper',
        '&:hover': hasGear
          ? {
              borderColor: 'primary.dark',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(144, 202, 249, 0.12)'
                  : 'rgba(25, 118, 210, 0.08)',
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1}>
          {/* Slot header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {slotName}
              </Typography>
            </Stack>
            {hasGear && (
              <IconButton
                size="small"
                onClick={onRemove}
                sx={{
                  p: 0.25,
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                  },
                }}
              >
                <Close sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Stack>

          {/* Gear info */}
          {hasGear ? (
            <Box>
              <Tooltip title={gearPiece.link || 'Equipped item'} placement="top">
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: isMythic ? 'warning.main' : 'text.primary',
                    fontStyle: isLoading ? 'italic' : 'normal',
                    opacity: isLoading ? 0.7 : 1,
                    wordBreak: 'break-word',
                  }}
                >
                  {isLoading ? 'Loading...' : gearLabel}
                </Typography>
              </Tooltip>
              {shouldRenderSetName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                  {setName}
                </Typography>
              )}
              {!showAsEquipped && !setName && (
                <Chip
                  label={itemData?.name ? 'Known Item' : 'Item Link'}
                  size="small"
                  color={isMythic ? 'warning' : itemData?.name ? 'info' : 'default'}
                  sx={{
                    mt: 0.5,
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                  }}
                />
              )}
              {showItemIdFallback && (
                <Chip
                  label={`Item ID ${showItemIdFallback.toLocaleString()}`}
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{
                    mt: 0.75,
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                />
              )}
              {disabledReason && (
                <Chip
                  label={disabledReason}
                  size="small"
                  color="warning"
                  sx={{
                    mt: 0.75,
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                  }}
                />
              )}
              {validationStatus && (
                <Tooltip
                  title={validationStatus.details ?? ''}
                  disableHoverListener={!validationStatus.details}
                >
                  <Chip
                    label={validationStatus.message}
                    size="small"
                    color={validationStatus.severity === 'error' ? 'error' : 'warning'}
                    sx={{
                      mt: 0.75,
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          ) : (
            <Tooltip title={disabledReason ?? ''} disableHoverListener={!addDisabled}>
              <span>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={addDisabled ? undefined : onAdd}
                  variant="outlined"
                  disabled={addDisabled}
                  sx={{
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Add Item
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </CardContent>
    </Card>
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

  // Group slots by category for better organization
  const armorSlots = GEAR_SLOTS.filter((s) => s.category === 'armor');
  const jewelrySlots = GEAR_SLOTS.filter((s) => s.category === 'jewelry');
  const weaponSlots = GEAR_SLOTS.filter((s) => s.category === 'weapon');
  return (
    <Stack spacing={3}>
      {/* Armor Section */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
          Armor
        </Typography>
        <Stack spacing={1.25}>
          {armorSlots.map(({ slot, name, slotType }) => (
            <GearPieceDisplay
              key={slot}
              slotName={name}
              gearPiece={gear[slot] as ExtendedGearPiece}
              onRemove={() => handleRemoveGear(slot)}
              onAdd={() => handleAddGear(slot, name, slotType)}
              addDisabled={Boolean(slotDisableReasons[slot])}
              disabledReason={slotDisableReasons[slot]}
              validationStatus={slotValidationStates[slot]}
            />
          ))}
        </Stack>
      </Box>

      {/* Jewelry Section */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
          Jewelry
        </Typography>
        <Stack spacing={1.25}>
          {jewelrySlots.map(({ slot, name, slotType }) => (
            <GearPieceDisplay
              key={slot}
              slotName={name}
              gearPiece={gear[slot] as ExtendedGearPiece}
              onRemove={() => handleRemoveGear(slot)}
              onAdd={() => handleAddGear(slot, name, slotType)}
              addDisabled={Boolean(slotDisableReasons[slot])}
              disabledReason={slotDisableReasons[slot]}
              validationStatus={slotValidationStates[slot]}
            />
          ))}
        </Stack>
      </Box>

      {/* Weapons Section */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
          Weapons
        </Typography>
        <Stack spacing={1.25}>
          {weaponSlots.map(({ slot, name, slotType }) => (
            <GearPieceDisplay
              key={slot}
              slotName={name}
              gearPiece={gear[slot] as ExtendedGearPiece}
              onRemove={() => handleRemoveGear(slot)}
              onAdd={() => handleAddGear(slot, name, slotType)}
              addDisabled={Boolean(slotDisableReasons[slot])}
              disabledReason={slotDisableReasons[slot]}
              validationStatus={slotValidationStates[slot]}
            />
          ))}
        </Stack>
      </Box>

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
