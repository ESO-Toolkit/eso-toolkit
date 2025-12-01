/**
 * Slot Inference and Assignment System
 *
 * Since most items don't have explicit slot information from LibSets,
 * we need to allow users to assign items to slots and trust that assignment.
 *
 * Key Insight: When a user selects an item for a specific slot in the UI,
 * that selection IS the slot assignment. We should trust it unless we have
 * explicit evidence it's wrong (e.g., a ring item being placed in head slot).
 */

import { getItemInfo, type SlotType } from '../data/itemIdMap';
import type { GearConfig } from '../types/loadout.types';

export interface SlotAssignmentRule {
  slotIndex: number;
  slotName: string;
  expectedSlot: SlotType;
  allowUnknown: boolean; // Allow items without explicit slot data
}

/**
 * Slot assignment rules with support for unknown items
 */
const SLOT_RULES: SlotAssignmentRule[] = [
  { slotIndex: 0, slotName: 'Head', expectedSlot: 'head', allowUnknown: true },
  { slotIndex: 1, slotName: 'Neck', expectedSlot: 'neck', allowUnknown: true },
  { slotIndex: 2, slotName: 'Chest', expectedSlot: 'chest', allowUnknown: true },
  { slotIndex: 3, slotName: 'Shoulders', expectedSlot: 'shoulders', allowUnknown: true },
  { slotIndex: 4, slotName: 'Main Hand', expectedSlot: 'weapon', allowUnknown: true },
  { slotIndex: 5, slotName: 'Off Hand', expectedSlot: 'offhand', allowUnknown: true },
  { slotIndex: 6, slotName: 'Belt', expectedSlot: 'waist', allowUnknown: true },
  { slotIndex: 8, slotName: 'Legs', expectedSlot: 'legs', allowUnknown: true },
  { slotIndex: 9, slotName: 'Feet', expectedSlot: 'feet', allowUnknown: true },
  { slotIndex: 11, slotName: 'Ring 1', expectedSlot: 'ring', allowUnknown: true },
  { slotIndex: 12, slotName: 'Ring 2', expectedSlot: 'ring', allowUnknown: true },
  { slotIndex: 16, slotName: 'Hands', expectedSlot: 'hand', allowUnknown: true },
  { slotIndex: 20, slotName: 'Back Bar Main Hand', expectedSlot: 'weapon', allowUnknown: true },
  { slotIndex: 21, slotName: 'Back Bar Off Hand', expectedSlot: 'offhand', allowUnknown: true },
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemsWithExplicitSlots: number;
  itemsWithInferredSlots: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Validate gear config with slot inference
 *
 * Philosophy:
 * - If an item HAS explicit slot data and it matches → HIGH confidence
 * - If an item HAS explicit slot data and it CONFLICTS → ERROR
 * - If an item has NO slot data → INFER from UI placement (MEDIUM confidence)
 */
export function validateGearConfigWithInference(gear: GearConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let itemsWithExplicitSlots = 0;
  let itemsWithInferredSlots = 0;

  for (const rule of SLOT_RULES) {
    const gearPiece = gear[rule.slotIndex];
    if (!gearPiece?.id) continue;

    const itemId = typeof gearPiece.id === 'string' ? parseInt(gearPiece.id, 10) : gearPiece.id;
    const item = getItemInfo(itemId);

    if (!item) {
      errors.push(
        `${rule.slotName}: Item ID ${itemId} not found in database. ` +
          `Cannot verify this is valid equipment.`,
      );
      continue;
    }

    // Case 1: Item HAS explicit slot data
    if (item.slot) {
      if (item.slot === rule.expectedSlot) {
        // Perfect match - high confidence
        itemsWithExplicitSlots++;
      } else {
        // Explicit conflict - this is an error
        errors.push(
          `${rule.slotName}: "${item.name}" is explicitly marked as a ${item.slot} item, ` +
            `but was placed in ${rule.expectedSlot} slot. This will likely fail in-game.`,
        );
      }
    }
    // Case 2: Item has NO explicit slot data
    else {
      if (rule.allowUnknown) {
        // Infer slot from UI placement - medium confidence
        itemsWithInferredSlots++;
        warnings.push(
          `${rule.slotName}: "${item.name}" (${item.setName}) has no slot verification. ` +
            `Assuming it's a ${rule.expectedSlot} item based on placement.`,
        );
      } else {
        errors.push(
          `${rule.slotName}: "${item.name}" has no slot data and this slot ` +
            `requires explicit verification.`,
        );
      }
    }
  }

  // Determine overall confidence
  let confidence: 'high' | 'medium' | 'low';
  const totalItems = itemsWithExplicitSlots + itemsWithInferredSlots;

  if (totalItems === 0) {
    confidence = 'high'; // Empty loadout
  } else if (itemsWithInferredSlots === 0) {
    confidence = 'high'; // All items have explicit slots
  } else if (itemsWithExplicitSlots === 0) {
    confidence = 'medium'; // All items are inferred
  } else {
    const inferredRatio = itemsWithInferredSlots / totalItems;
    confidence = inferredRatio <= 0.4 ? 'high' : 'medium'; // Allow up to 40% inferred for high confidence
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    itemsWithExplicitSlots,
    itemsWithInferredSlots,
    confidence,
  };
}

/**
 * Can export with confidence level
 */
export function canExportLoadoutWithInference(gear: GearConfig): {
  canExport: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  warnings: string[];
} {
  const validation = validateGearConfigWithInference(gear);

  if (!validation.isValid) {
    return {
      canExport: false,
      confidence: 'low',
      reason: `Cannot export: ${validation.errors[0]}`,
      warnings: validation.warnings,
    };
  }

  return {
    canExport: true,
    confidence: validation.confidence,
    warnings: validation.warnings,
  };
}

/**
 * Get slot suggestion based on item data or set patterns
 */
export function suggestSlotForItem(itemId: number): SlotType | null {
  const item = getItemInfo(itemId);
  if (!item) return null;

  // If we have explicit slot data, use it
  if (item.slot) return item.slot;

  // Try to infer from set name or item name patterns
  const name = item.name.toLowerCase();
  const hasWord = (pattern: RegExp): boolean => pattern.test(name);

  // Pattern matching (basic heuristics)
  if (hasWord(/\b(ring|band)\b/)) return 'ring';
  if (hasWord(/\b(neck|amulet|pendant|torc)\b/)) return 'neck';
  if (hasWord(/\b(head|helm|hood)\b/)) return 'head';
  if (hasWord(/\bshoulder(s)?\b/)) return 'shoulders';
  if (hasWord(/\b(chest|cuirass|jack|robe)\b/)) return 'chest';
  if (hasWord(/\b(hand|glove|gauntlet|palm)\b/)) return 'hand';
  if (hasWord(/\b(waist|belt|sash)\b/)) return 'waist';
  if (hasWord(/\b(leg|greave|chausses)\b/)) return 'legs';
  if (hasWord(/\b(feet|boot|shoe|sabatons)\b/)) return 'feet';
  if (hasWord(/\bshield\b/)) return 'offhand';
  if (hasWord(/\b(weapon|sword|staff|axe|bow|dagger|maul)\b/)) return 'weapon';

  // No pattern match - return null to indicate user must choose
  return null;
}

/**
 * Export format with slot inference tracking
 */
export interface ExportMetadata {
  exportDate: string;
  validation: ValidationResult;
  slotAssignments: Array<{
    slot: string;
    itemId: number;
    itemName: string;
    assignmentType: 'explicit' | 'inferred';
  }>;
}

/**
 * Generate export metadata for user review
 */
export function generateExportMetadata(gear: GearConfig): ExportMetadata {
  const validation = validateGearConfigWithInference(gear);
  const slotAssignments: ExportMetadata['slotAssignments'] = [];

  for (const rule of SLOT_RULES) {
    const gearPiece = gear[rule.slotIndex];
    if (!gearPiece?.id) continue;

    const itemId = typeof gearPiece.id === 'string' ? parseInt(gearPiece.id, 10) : gearPiece.id;
    const item = getItemInfo(itemId);

    if (item) {
      slotAssignments.push({
        slot: rule.slotName,
        itemId,
        itemName: item.name,
        assignmentType: item.slot ? 'explicit' : 'inferred',
      });
    }
  }

  return {
    exportDate: new Date().toISOString(),
    validation,
    slotAssignments,
  };
}
