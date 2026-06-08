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
 * Set of `mapFile` values (exact `fight.maps[].file`, e.g. `blackwood/u30_rg_map_outside_002`) for
 * which a self-hosted AI-upscaled tile exists under {@link HIRES_MAP_DIR}. Entries are added one
 * verified map at a time. The native ESO map for these is 768 px (confirmed byte-identical to the
 * RPGLogs CDN), so the upscaled tile is an illustration-model super-resolution, not a re-extract —
 * see .scratch/MAP-REHOST-SCOPE.md §0b.
 */
export const HIRES_MAP_FILES: ReadonlySet<string> = new Set<string>([
  'blackwood/u30_rg_map_outside_002', // RG Xalvakka — first map under test
]);

/**
 * Directory (relative to the app base) where self-hosted hi-res tiles live, as `<dir>/<mapFile>.jpg`.
 * Served from public/ in dev; would be an R2/CDN base in production.
 */
const HIRES_MAP_DIR = 'maps-hires';

const RPGLOGS_MAP_BASE = 'https://assets.rpglogs.com/img/eso/maps';

/**
 * Returns the texture URL for a given `mapFile`: a self-hosted hi-res tile when one is registered (and
 * not explicitly disabled via `VITE_SELF_HOSTED_MAPS=false`, the kill switch for instant rollback),
 * otherwise the RPGLogs CDN default. Pure and deterministic per `mapFile`, so the caller's
 * `mapFile`-keyed texture cache stays correct. Env access goes through `getEnvVar` (the project's
 * `import.meta.env` wrapper) so this stays testable under Jest, which can't parse `import.meta`.
 */
export function getMapTextureUrl(mapFile: string): string {
  if (HIRES_MAP_FILES.has(mapFile) && getEnvVar('VITE_SELF_HOSTED_MAPS') !== 'false') {
    const base = getEnvVar('BASE_URL') ?? '/';
    return `${base}${HIRES_MAP_DIR}/${mapFile}.jpg`;
  }
  return `${RPGLOGS_MAP_BASE}/${mapFile}.jpg`;
}
