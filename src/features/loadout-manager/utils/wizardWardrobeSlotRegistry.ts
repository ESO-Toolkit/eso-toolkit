import type { SlotType } from '../data/slotTypes';
import type { GearPiece, LoadoutState } from '../types/loadout.types';

import { getItemIdFromLink } from './itemLinkParser';

type SlotSource = 'wizard-wardrobe' | 'manual';

interface SlotRecord {
  slot: SlotType;
  source: SlotSource;
  updatedAt: number;
}

const slotRegistry = new Map<number, SlotRecord>();

const SLOT_INDEX_TO_TYPE: Partial<Record<number, SlotType>> = {
  0: 'head',
  1: 'neck',
  2: 'chest',
  3: 'shoulders',
  4: 'weapon',
  5: 'offhand',
  6: 'waist',
  8: 'legs',
  9: 'feet',
  11: 'ring',
  12: 'ring',
  16: 'hand',
  20: 'weapon',
  21: 'offhand',
};

function resolveItemId(piece?: GearPiece): number | undefined {
  if (!piece) {
    return undefined;
  }

  const extended = piece as GearPiece & { itemId?: number };

  if (typeof extended.itemId === 'number' && Number.isFinite(extended.itemId)) {
    return extended.itemId;
  }

  if (typeof extended.id === 'number' && Number.isFinite(extended.id)) {
    return extended.id;
  }

  if (typeof extended.id === 'string') {
    const parsed = Number(extended.id);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (extended.link) {
    const parsed = getItemIdFromLink(extended.link);
    return parsed ?? undefined;
  }

  return undefined;
}

function registerSlotInternal(
  itemId: number,
  slot: SlotType,
  source: SlotSource,
  force = false,
): void {
  if (!itemId || !slot) {
    return;
  }

  const existing = slotRegistry.get(itemId);
  if (existing && !force) {
    if (existing.source === 'wizard-wardrobe' && source === 'manual') {
      // Never let manual overrides replace confirmed Wizard's Wardrobe data
      return;
    }
    if (existing.slot === slot && existing.source === source) {
      return;
    }
  }

  slotRegistry.set(itemId, {
    slot,
    source,
    updatedAt: Date.now(),
  });
}

export function clearWizardWardrobeSlotRegistry(): void {
  slotRegistry.clear();
}

export function registerWizardWardrobeSlot(
  itemId: number,
  slot: SlotType,
  source: SlotSource,
): void {
  registerSlotInternal(itemId, slot, source);
}

export function registerManualSlot(itemId: number, slot: SlotType): void {
  registerSlotInternal(itemId, slot, 'manual');
}

export function registerSlotsFromLoadoutState(
  state: LoadoutState,
  source: SlotSource,
  options?: { reset?: boolean },
): void {
  if (options?.reset) {
    clearWizardWardrobeSlotRegistry();
  }

  Object.values(state.pages).forEach((trialPages) => {
    if (!trialPages) {
      return;
    }

    Object.values(trialPages).forEach((pages) => {
      pages?.forEach((page) => {
        page.setups.forEach((setup) => {
          Object.entries(setup.gear ?? {}).forEach(([slotKey, gearPiece]) => {
            if (slotKey === 'mythic') {
              return;
            }

            const slotIndex = Number(slotKey);
            if (Number.isNaN(slotIndex)) {
              return;
            }

            const slotType = SLOT_INDEX_TO_TYPE[slotIndex];
            if (!slotType) {
              return;
            }

            const itemId = resolveItemId(gearPiece as GearPiece);
            if (!itemId) {
              return;
            }

            registerWizardWardrobeSlot(itemId, slotType, source);
          });
        });
      });
    });
  });
}

export function getRegisteredSlot(itemId: number): SlotType | undefined {
  return slotRegistry.get(itemId)?.slot;
}
