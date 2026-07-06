/**
 * Food & potion CATEGORY icons, bundled locally.
 *
 * These six provisioning index icons are the only art the consumable pickers
 * show. They were previously fetched from the UESP tree-icon CDN
 * (esoicons.uesp.net) — a community host frequently blocked by ad/privacy/DNS
 * filters, which made every food/potion icon disappear for affected users.
 *
 * Bundling them (≈2 KB each) makes them same-origin and unblockable. The UESP
 * tree-icon URL is kept only as a defensive fallback for <ResilientImg>; in
 * practice the local asset always wins.
 */
import bakedUp from './provisioner_indexicon_baked_up.png';
import beerUp from './provisioner_indexicon_beer_up.png';
import meatUp from './provisioner_indexicon_meat_up.png';
import spiritsUp from './provisioner_indexicon_spirits_up.png';
import stewUp from './provisioner_indexicon_stew_up.png';
import wineUp from './provisioner_indexicon_wine_up.png';

const UESP_TREEICON_BASE = 'https://esoicons.uesp.net/esoui/art/treeicons';

/** Bundled (hashed) asset URL per provisioner icon name. */
const LOCAL_BY_NAME: Record<string, string> = {
  provisioner_indexicon_meat_up: meatUp,
  provisioner_indexicon_stew_up: stewUp,
  provisioner_indexicon_baked_up: bakedUp,
  provisioner_indexicon_spirits_up: spiritsUp,
  provisioner_indexicon_beer_up: beerUp,
  provisioner_indexicon_wine_up: wineUp,
};

/** Provisioning (food/drink) category → provisioner icon name. */
export const FOOD_CATEGORY_ICON_NAME: Record<string, string> = {
  'Meat Dishes': 'provisioner_indexicon_meat_up',
  'Fruit Dishes': 'provisioner_indexicon_stew_up',
  'Vegetable Dishes': 'provisioner_indexicon_baked_up',
  Savouries: 'provisioner_indexicon_meat_up',
  Ragout: 'provisioner_indexicon_stew_up',
  Entremet: 'provisioner_indexicon_baked_up',
  Gourmet: 'provisioner_indexicon_stew_up',
  Delicacies: 'provisioner_indexicon_spirits_up',
  'Alcoholic Drinks': 'provisioner_indexicon_beer_up',
  Tea: 'provisioner_indexicon_spirits_up',
  Tonics: 'provisioner_indexicon_wine_up',
  Liqueurs: 'provisioner_indexicon_spirits_up',
  Tinctures: 'provisioner_indexicon_beer_up',
  'Cordial Teas': 'provisioner_indexicon_wine_up',
  Distillates: 'provisioner_indexicon_spirits_up',
};

/** Potion-effect category → provisioner icon name. */
export const POTION_CATEGORY_ICON_NAME: Record<string, string> = {
  'Damage (Magicka)': 'provisioner_indexicon_spirits_up',
  'Damage (Stamina)': 'provisioner_indexicon_meat_up',
  Sustain: 'provisioner_indexicon_wine_up',
  Defensive: 'provisioner_indexicon_baked_up',
  Utility: 'provisioner_indexicon_beer_up',
  Ultimate: 'provisioner_indexicon_stew_up',
};

/** Ordered sources (bundled-local first, UESP tree-icon fallback) for an icon name. */
function sourcesForIconName(name: string | undefined): string[] {
  if (!name) return [];
  const sources: string[] = [];
  const local = LOCAL_BY_NAME[name];
  if (local) sources.push(local);
  sources.push(`${UESP_TREEICON_BASE}/${name}.png`);
  return sources;
}

/**
 * Ordered icon sources for a food/drink category — bundled-local primary, UESP
 * tree-icon fallback. Empty array for an unknown/missing category so callers
 * can skip rendering. Feed straight into `<ResilientImg sources=…>`.
 */
export function getFoodCategoryIconSources(category?: string | null): string[] {
  return sourcesForIconName(category ? FOOD_CATEGORY_ICON_NAME[category] : undefined);
}

/** Ordered icon sources for a potion category — see {@link getFoodCategoryIconSources}. */
export function getPotionCategoryIconSources(category?: string | null): string[] {
  return sourcesForIconName(category ? POTION_CATEGORY_ICON_NAME[category] : undefined);
}
