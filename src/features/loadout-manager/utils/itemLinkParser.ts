/**
 * Item Link Parser Utility
 * Parses ESO item links and gets item names from local database or external APIs
 */

import { Logger } from '@/utils/logger';

import { getItemInfo, hasItemInfo } from '../data/itemIdMap';

interface ItemData {
  id: number;
  name: string;
  setName?: string;
  quality?: number;
  level?: number;
  trait?: number;
  enchantId?: number;
}

// Cache for item data to avoid repeated API calls
const itemCache = new Map<number, ItemData>();

/**
 * Parse ESO item link to extract item ID and parameters
 * Format: |H0:item:itemId:enchantId:level:...|h|h
 *
 * Example: |H0:item:147237:363:50:26582:370:50:18:45:0:0:0:0:0:0:2049:67:0:1:0:6389:0|h|h
 */
export function parseItemLink(link: string): { itemId: number; params: number[] } | null {
  if (!link || typeof link !== 'string') {
    return null;
  }

  // Item links start with |H0:item: or |H1:item:
  const match = link.match(/\|H[01]:item:(\d+):([^|]+)\|h\|h/);
  if (!match) {
    return null;
  }

  const itemId = parseInt(match[1], 10);
  const params = match[2].split(':').map((p) => parseInt(p, 10));

  return { itemId, params };
}

/**
 * Fetch item name from API
 *
 * NOTE: Currently returns item ID as name since we don't have a reliable public API.
 * Future improvements could:
 * 1. Use UESP MediaWiki API to search for items
 * 2. Build a local item database from ESO data files
 * 3. Use ESO Hub or other third-party APIs
 */
const itemLinkLogger = new Logger({ contextPrefix: 'ItemLinkParser' });

async function fetchItemFromUESP(itemId: number): Promise<ItemData | null> {
  try {
    // TODO: Implement actual API call when available
    // For now, return a placeholder with the item ID
    return {
      id: itemId,
      name: `Item ${itemId}`,
      quality: undefined,
      level: undefined,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    itemLinkLogger.error(`Failed to fetch item ${itemId}`, err);
    return null;
  }
}

/**
 * Get item data from cache, local database, or fetch from API
 */
export async function getItemData(link: string): Promise<ItemData | null> {
  const parsed = parseItemLink(link);
  if (!parsed) {
    return null;
  }

  // Check cache first
  if (itemCache.has(parsed.itemId)) {
    return itemCache.get(parsed.itemId)!;
  }

  // Check local item database
  if (hasItemInfo(parsed.itemId)) {
    const localInfo = getItemInfo(parsed.itemId);
    if (localInfo) {
      const itemData: ItemData = {
        id: parsed.itemId,
        name: localInfo.name,
        setName: localInfo.setName,
      };
      itemCache.set(parsed.itemId, itemData);
      return itemData;
    }
  }

  // Fetch from API as fallback
  const itemData = await fetchItemFromUESP(parsed.itemId);
  if (itemData) {
    itemCache.set(parsed.itemId, itemData);
  }

  return itemData;
}

/**
 * Get item name from link (synchronously using cache only)
 * Returns null if not in cache
 */
export function getCachedItemName(link: string): string | null {
  const parsed = parseItemLink(link);
  if (!parsed) {
    return null;
  }

  const cached = itemCache.get(parsed.itemId);
  return cached?.name || null;
}

/**
 * Extract item ID from link for display purposes
 */
export function getItemIdFromLink(link: string): number | null {
  const parsed = parseItemLink(link);
  return parsed?.itemId || null;
}

/**
 * Pre-load multiple item links into cache
 */
export async function preloadItems(links: string[]): Promise<void> {
  const uniqueIds = new Set<number>();

  // Extract unique item IDs
  for (const link of links) {
    const parsed = parseItemLink(link);
    if (parsed && !itemCache.has(parsed.itemId)) {
      uniqueIds.add(parsed.itemId);
    }
  }

  // Fetch all items in parallel
  await Promise.all(Array.from(uniqueIds).map((itemId) => fetchItemFromUESP(itemId)));
}
