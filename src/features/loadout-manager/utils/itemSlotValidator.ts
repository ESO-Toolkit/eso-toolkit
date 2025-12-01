/**
 * Item Slot Validation Utility
 *
 * Validates that items have known slot assignments before building loadouts.
 * Prevents invalid Wizards Wardrobe files from being generated.
 */

import { getItemInfo, itemIdMap, type ItemInfo, type SlotType } from '../data/itemIdMap';
import type { GearConfig } from '../types/loadout.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemsWithSlots: number;
  itemsWithoutSlots: number;
}

export interface ItemSlotInfo {
  itemId: number;
  hasSlot: boolean;
  slot?: SlotType;
  equipType?: number;
  name: string;
  setName: string;
}

/**
 * Check if an item has known slot information
 */
export function hasKnownSlot(itemId: number): boolean {
  const item = itemIdMap[itemId];
  return item?.slot !== undefined;
}

/**
 * Get slot information for an item
 */
export function getItemSlotInfo(itemId: number): ItemSlotInfo | null {
  const item = getItemInfo(itemId);
  if (!item) {
    return null;
  }

  return {
    itemId,
    hasSlot: item.slot !== undefined,
    slot: item.slot,
    equipType: item.equipType,
    name: item.name,
    setName: item.setName,
  };
}

/**
 * Validate a gear configuration for slot assignments
 */
export function validateGearConfig(gear: GearConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let itemsWithSlots = 0;
  let itemsWithoutSlots = 0;

  // Define the slots that must have items for a valid loadout
  // Slot indices follow ESO's equipment slot system
  const requiredSlots: Array<{ slotIndex: number; name: string; slot: SlotType }> = [
    { slotIndex: 0, name: 'Head', slot: 'head' },
    { slotIndex: 1, name: 'Neck', slot: 'neck' },
    { slotIndex: 2, name: 'Chest', slot: 'chest' },
    { slotIndex: 3, name: 'Shoulders', slot: 'shoulders' },
    { slotIndex: 6, name: 'Belt', slot: 'waist' },
    { slotIndex: 8, name: 'Legs', slot: 'legs' },
    { slotIndex: 9, name: 'Feet', slot: 'feet' },
    { slotIndex: 11, name: 'Ring 1', slot: 'ring' },
    { slotIndex: 12, name: 'Ring 2', slot: 'ring' },
    { slotIndex: 16, name: 'Hands', slot: 'hand' },
  ];

  const weaponSlots: Array<{ slotIndex: number; name: string }> = [
    { slotIndex: 4, name: 'Main Hand' },
    { slotIndex: 5, name: 'Off Hand' },
    { slotIndex: 20, name: 'Back Bar Main Hand' },
    { slotIndex: 21, name: 'Back Bar Off Hand' },
  ];

  // Validate required armor/jewelry slots
  for (const { slotIndex, name, slot } of requiredSlots) {
    const gearPiece = gear[slotIndex];
    if (gearPiece?.id) {
      const itemId = typeof gearPiece.id === 'string' ? parseInt(gearPiece.id, 10) : gearPiece.id;
      const info = getItemSlotInfo(itemId);
      if (!info) {
        errors.push(`${name}: Item ID ${itemId} not found in database`);
        itemsWithoutSlots++;
      } else if (!info.hasSlot) {
        warnings.push(
          `${name}: "${info.name}" (${info.setName}) lacks slot metadata. ` +
            `Assuming placement is correct based on user selection.`,
        );
        itemsWithoutSlots++;
      } else if (info.slot !== slot) {
        errors.push(
          `${name}: Item "${info.name}" (ID ${itemId}) is for slot "${info.slot}", ` +
            `but was placed in "${slot}" slot`,
        );
        itemsWithoutSlots++;
      } else {
        itemsWithSlots++;
      }
    }
  }

  // Validate weapon slots
  for (const { slotIndex, name } of weaponSlots) {
    const gearPiece = gear[slotIndex];
    if (gearPiece?.id) {
      const itemId = typeof gearPiece.id === 'string' ? parseInt(gearPiece.id, 10) : gearPiece.id;
      const info = getItemSlotInfo(itemId);
      if (!info) {
        warnings.push(`${name}: Item ID ${itemId} not found in database`);
        itemsWithoutSlots++;
      } else if (!info.hasSlot) {
        warnings.push(
          `${name}: "${info.name}" (${info.setName}) has no weapon slot metadata. ` +
            `Assuming user placement.`,
        );
        itemsWithoutSlots++;
      } else if (info.slot !== 'weapon' && info.slot !== 'offhand') {
        errors.push(
          `${name}: Item "${info.name}" (ID ${itemId}) is for slot "${info.slot}", ` +
            `not a weapon slot`,
        );
        itemsWithoutSlots++;
      } else {
        itemsWithSlots++;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    itemsWithSlots,
    itemsWithoutSlots,
  };
}

/**
 * Get coverage statistics for all items in database
 */
export function getSlotCoverageStats(): {
  totalItems: number;
  itemsWithSlots: number;
  coveragePercent: number;
  bySlot: Record<string, number>;
} {
  const items = Object.values(itemIdMap);
  const totalItems = items.length;
  const itemsWithSlots = items.filter((i) => i.slot !== undefined).length;

  const bySlot: Record<string, number> = {};
  items.forEach((item) => {
    if (item.slot) {
      bySlot[item.slot] = (bySlot[item.slot] || 0) + 1;
    }
  });

  return {
    totalItems,
    itemsWithSlots,
    coveragePercent: (itemsWithSlots / totalItems) * 100,
    bySlot,
  };
}

/**
 * Filter items by slot for selector dropdowns
 */
export function getItemsBySlot(targetSlot: SlotType): Array<{ itemId: number; item: ItemInfo }> {
  return Object.entries(itemIdMap)
    .filter(([_, item]) => item.slot === targetSlot)
    .map(([itemId, item]) => ({
      itemId: parseInt(itemId, 10),
      item,
    }))
    .sort((a, b) => a.item.setName.localeCompare(b.item.setName));
}

/**
 * Check if a loadout can be safely exported to Wizards Wardrobe format
 */
export function canExportLoadout(gear: GearConfig): { canExport: boolean; reason?: string } {
  const validation = validateGearConfig(gear);

  if (!validation.isValid) {
    return {
      canExport: false,
      reason: `Loadout has ${validation.errors.length} error(s): ${validation.errors[0]}`,
    };
  }

  return { canExport: true };
}
