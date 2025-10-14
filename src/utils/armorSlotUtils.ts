import { CalculatorItem } from '../data/skill-lines/armor-resistance-data';

/**
 * Maps armor slot names to standardized slot keys
 * Used to identify which items conflict with each other
 */
const ARMOR_SLOT_KEY_MAP: Record<string, string> = {
  chest: 'chest',
  helm: 'head',
  head: 'head',
  shoulders: 'shoulder',
  shoulder: 'shoulder',
  hands: 'hands',
  hand: 'hands',
  belt: 'belt',
  sash: 'belt',
  pants: 'legs',
  legs: 'legs',
  greaves: 'legs',
  feet: 'feet',
  boots: 'feet',
  gauntlets: 'hands',
  shield: 'shield',
};

/**
 * Armor weight types that can have mutually exclusive selections
 */
const ARMOR_WEIGHT_TYPES = new Set(['light', 'medium', 'heavy']);

/**
 * Extracts the slot key from an armor item name
 * @param itemName The name of the armor item (e.g., "Heavy Hands", "Medium Chest")
 * @returns The slot key (e.g., "hands", "chest") or null if not a slot item
 */
export const extractSlotFromItemName = (itemName: string): string | null => {
  if (!itemName) return null;

  const nameParts = itemName.split(' ').filter((part) => part.length > 0);

  // Need at least [Weight] [Slot] pattern
  if (nameParts.length < 2) return null;

  // Check if first part is an armor weight
  const weightPart = nameParts[0].toLowerCase();
  if (!ARMOR_WEIGHT_TYPES.has(weightPart)) {
    // Not an armor weight, could be shield or other item
    if (itemName.toLowerCase().includes('shield')) {
      return 'shield';
    }
    return null;
  }

  // Extract slot from remaining parts
  const slotParts = nameParts.slice(1);
  return resolveSlotKey(slotParts);
};

/**
 * Resolves slot parts to a standardized slot key
 * @param slotParts Array of words that might represent a slot
 * @returns Standardized slot key or null if not found
 */
const resolveSlotKey = (slotParts: string[]): string | null => {
  if (slotParts.length === 0) {
    return null;
  }

  const normalized = slotParts.join(' ').toLowerCase().trim();
  const candidates = [
    normalized,
    normalized.replace(/\s+/g, ''),
    normalized.endsWith('s') ? normalized.slice(0, -1) : normalized,
  ];

  for (const candidate of candidates) {
    const mapped = ARMOR_SLOT_KEY_MAP[candidate];
    if (mapped) {
      return mapped;
    }
  }

  // If no mapping found, use the last candidate as fallback
  return candidates[candidates.length - 1];
};

/**
 * Checks if two armor items conflict with each other (same slot)
 * @param item1 First armor item
 * @param item2 Second armor item
 * @returns True if the items conflict (same slot and different weights)
 */
export const doArmorItemsConflict = (item1: CalculatorItem, item2: CalculatorItem): boolean => {
  const slot1 = extractSlotFromItemName(item1.name);
  const slot2 = extractSlotFromItemName(item2.name);

  // If either item doesn't have a slot, they don't conflict
  if (!slot1 || !slot2) return false;

  // Same slot but different items = conflict
  return slot1 === slot2 && item1.name !== item2.name;
};

/**
 * Finds all items in a list that conflict with a given item
 * @param targetItem The item to check conflicts for
 * @param items List of items to search through
 * @returns Array of conflicting items
 */
export const findConflictingItems = (
  targetItem: CalculatorItem,
  items: CalculatorItem[],
): CalculatorItem[] => {
  const targetSlot = extractSlotFromItemName(targetItem.name);
  if (!targetSlot) return [];

  return items.filter((item) => {
    if (item.name === targetItem.name) return false; // Don't conflict with self

    const itemSlot = extractSlotFromItemName(item.name);
    return itemSlot === targetSlot;
  });
};

/**
 * Determines if an item is an armor piece that participates in mutually exclusive selection
 * @param item The item to check
 * @returns True if the item should be mutually exclusive
 */
export const isMutuallyExclusiveArmorItem = (item: CalculatorItem): boolean => {
  const slot = extractSlotFromItemName(item.name);
  return slot !== null && slot !== 'shield'; // Shield can be equipped with any armor
};
