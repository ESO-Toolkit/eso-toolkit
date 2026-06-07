import { getEnvVar } from '../../../utils/envUtils';

/**
 * Resolves the URL for a fight-replay floor map texture.
 *
 * Default source is the RPGLogs CDN, whose images cap at 768×768 px. On a small fight that fills only
 * a fraction of the zone map, that resolution reads as a blurry magnified patch (the map plane is a
 * fixed 100×100 and the fight may use ~14 m of it). The only real fix is a higher-res tile we host
 * ourselves; this seam lets such a tile drop in per map WITHOUT touching the loader, cache, material,
 * or — critically — the actor/marker coordinate-alignment contract (the floor X-flip in
 * DynamicMapTexture paired with `convertCoordinatesWithBottomLeft`, pinned by coordinateUtils.test).
 *
 * A self-hosted replacement MUST depict the SAME world region at the SAME framing as the RPGLogs JPG,
 * or actors/markers will register on the wrong part of the map with no error. See
 * .scratch/MAP-REHOST-SCOPE.md for the verification method and the full re-host plan.
 */

/**
 * Per-`mapFile` overrides pointing at self-hosted high-res tiles. Keyed by the exact
 * `fight.maps[].file` value (e.g. `blackwood/u30_rg_map_outside_002`). Empty until the one-map spike
 * (scope doc P1) proves a tile is higher-res than 768 px AND aligns; entries are added one verified
 * map at a time.
 */
export const MAP_TILE_OVERRIDES: Record<string, string> = {
  // 'blackwood/u30_rg_map_outside_002': 'https://maps.esotk.com/blackwood/u30_rg_map_outside_002.webp',
};

const RPGLOGS_MAP_BASE = 'https://assets.rpglogs.com/img/eso/maps';

/**
 * Returns the texture URL for a given `mapFile`: a self-hosted override when one is registered (and
 * not explicitly disabled via `VITE_SELF_HOSTED_MAPS=false`, the kill switch for instant rollback),
 * otherwise the RPGLogs CDN default. Pure and deterministic per `mapFile`, so the caller's
 * `mapFile`-keyed texture cache stays correct. Env access goes through `getEnvVar` (the project's
 * `import.meta.env` wrapper) so this stays testable under Jest, which can't parse `import.meta`.
 */
export function getMapTextureUrl(mapFile: string): string {
  const override = MAP_TILE_OVERRIDES[mapFile];
  if (override && getEnvVar('VITE_SELF_HOSTED_MAPS') !== 'false') {
    return override;
  }
  return `${RPGLOGS_MAP_BASE}/${mapFile}.jpg`;
}
