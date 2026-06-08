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
 * which a self-hosted AI-upscaled tile exists under {@link HIRES_MAP_DIR}.
 *
 * These are every replay map the RPGLogs CDN serves at only 768 px — the maps where the blur is real,
 * across all trials plus the group dungeons and arenas (the replay opens for any boss fight, not just
 * trials). Maps RPGLogs already serves at native 1024/1280 px (e.g. the Ossein Cage `dungeons/osscage_*`
 * maps, `craglorn/helracitadel_base`, the Sanity's Edge `se_orsinium`/`se_alinor` sections, and ~21
 * larger dungeon maps) are deliberately NOT listed: they're already sharp, and super-resolving an
 * already-adequate image only risks smearing labels for no gain. A handful of brand-new U49 dungeon maps
 * that RPGLogs has not published yet (404) are also absent until a source image exists.
 *
 * Each tile is an illustration-model (RealESRGAN anime_6B) 2× super-resolution (768→1536) of the exact
 * bytes RPGLogs serves — NOT a re-extract. Upscaling the RPGLogs source (rather than the UESP zip) keeps
 * the crop/framing identical to what the coordinate-alignment contract was built against, so actor and
 * marker registration stays correct by construction. Regenerate via .scratch/batch-upscale-maps.py; the
 * key list is the union of .scratch/upscale-targets.json (trials) and .scratch/nontrial-upscale-targets.json
 * (dungeons + arenas). See .scratch/MAP-REHOST-SCOPE.md §0b.
 */
export const HIRES_MAP_FILES: ReadonlySet<string> = new Set<string>([
  // alikr
  'alikr/eyeschamber_base',
  'alikr/guardiansorbit_base',
  'alikr/volenfell_base',
  'alikr/volenfell_pledge_base',
  // apocrypha
  'apocrypha/u40_tomehold_boss1',
  'apocrypha/u40_tomehold_boss2',
  'apocrypha/u40_tomehold_bundle5',
  // auridon
  'auridon/thebanishedcells_base',
  // bangkorai
  'bangkorai/blackhearthavenarea1_base',
  'bangkorai/blackhearthavenarea2_base',
  'bangkorai/blackhearthavenarea3_base',
  'bangkorai/blackhearthavenarea4_base',
  'bangkorai/secret_tunnel_base',
  'bangkorai/the_guardians_skull_base',
  'bangkorai/ui_map_fanglairext_base',
  'bangkorai/unhallowedgravemap001',
  'bangkorai/unhallowedgravemap001b',
  'bangkorai/unhallowedgravemap001c',
  'bangkorai/unhallowedgravemap002',
  'bangkorai/unhallowedgravemap003',
  // blackwood
  'blackwood/rg_map_inside_001',
  'blackwood/tdc_map_boss3rooms_001',
  'blackwood/tdc_map_inside_001',
  'blackwood/tdc_map_outside_001',
  'blackwood/tdc_map_secret_001',
  'blackwood/tdc_map_secrethall_001',
  'blackwood/tdc_map_secrethall_002',
  'blackwood/tdc_map_secrethall_003',
  'blackwood/u30_rg_map_outside_001',
  'blackwood/u30_rg_map_outside_002',
  // clockwork
  'clockwork/ui_map_asylumsanctorum001_base',
  'clockwork/ui_map_asylumsanctorum002_base',
  // coldharbor
  'coldharbor/vaultsofmadness1_base',
  'coldharbor/vaultsofmadness2_base',
  // craglorn
  'craglorn/aetherianarchiveend_base',
  'craglorn/aetherianarchiveislanda_base',
  'craglorn/aetherianarchiveislandc_base',
  'craglorn/aetherianarchivemiddle_base',
  'craglorn/helracitadelhallofwarrior_base',
  'craglorn/trl_so_map02_base',
  'craglorn/trl_so_map03_base',
  'craglorn/trl_so_map04_base',
  'craglorn/ui_map_bloodrootext1_base',
  'craglorn/ui_map_bloodrootint1_base',
  'craglorn/ui_map_bloodrootint2_base',
  // cyrodiil
  'cyrodiil/imperialprisondistrictdun_base',
  'cyrodiil/imperialprisondunint01_base',
  'cyrodiil/imperialprisondunint02_base',
  'cyrodiil/imperialprisondunint03_base',
  'cyrodiil/imperialprisondunint04_base',
  'cyrodiil/wgtbattlemage_base',
  'cyrodiil/wgtgreenemporerway_base',
  'cyrodiil/wgtimperialguardquarters_base',
  'cyrodiil/wgtimperialthroneroom_base',
  'cyrodiil/wgtlibraryhall_base',
  'cyrodiil/wgtlibrarymain_base',
  'cyrodiil/wgtpinnacle_base',
  'cyrodiil/wgtpinnacleboss_base',
  'cyrodiil/wgtregentsquarters_base',
  'cyrodiil/wgtvoid1_base',
  'cyrodiil/wgtvoid2_base',
  // darkbrotherhood
  'darkbrotherhood/bdvilla_boss3map',
  'darkbrotherhood/bdvilla_map2ext2',
  'darkbrotherhood/bdvilla_map3int1',
  'darkbrotherhood/bdvilla_mapsecret1',
  'darkbrotherhood/bdvilla_mapsecret2',
  'darkbrotherhood/bdvilla_mapsecret3',
  'darkbrotherhood/bdvillamap1ext1',
  'darkbrotherhood/ui_map_domdepthsofmal2_base',
  'darkbrotherhood/ui_map_domdepthsofmal3_base',
  'darkbrotherhood/ui_map_domdepthsofmal5_base',
  'darkbrotherhood/ui_map_domdepthsofmal_base',
  // deadlands
  'deadlands/u42tri_lucentcitmap001',
  // deshaan
  'deshaan/cauldronmapboss5',
  'deshaan/darkshadecaverns_base',
  'deshaan/darkshadecavernsheroic_base',
  // eastmarch
  'eastmarch/direfrostkeep_base',
  'eastmarch/direfrostkeepsummit_base',
  'eastmarch/ui_map_frvfrstvlt01_base',
  'eastmarch/ui_map_frvfrstvlt02_base',
  'eastmarch/ui_map_frvfrstvlt03_base',
  'eastmarch/ui_map_frvfrstvlt04_base',
  'eastmarch/ui_map_frvfrstvlt05_base',
  // elsweyr
  'elsweyr/sunspireoverworld_base',
  // glenumbra
  'glenumbra/rpb_map_ext001',
  'glenumbra/rpb_map_int001',
  'glenumbra/rpb_map_int002',
  'glenumbra/rpb_map_int003',
  'glenumbra/rpb_map_secret001',
  'glenumbra/spindleclutch_base',
  'glenumbra/spindleclutchheroic_base',
  // grahtwood
  'grahtwood/eldenhollow_base',
  'grahtwood/eldenhollowheroic1_base',
  'grahtwood/eldenhollowheroic2_base',
  'grahtwood/maarscave1_base',
  'grahtwood/maarsmap04_base',
  'grahtwood/maarsmap05_base',
  'grahtwood/maarsmap06_base',
  'grahtwood/maarsoutsidemap001_base',
  'grahtwood/maarsoutsidemap003_base',
  // greenshade
  'greenshade/cityofashboss_base',
  'greenshade/cityofashmain_base',
  'greenshade/marchodsacrifices_base',
  'greenshade/vetcirtyash01_base',
  'greenshade/vetcirtyash02_base',
  'greenshade/vetcirtyash03_base',
  'greenshade/vetcirtyash04_base',
  // housing
  'housing/earthtearcavern_base',
  'housing/frostvaultchasm_base',
  // malabaltor
  'malabaltor/tempestisland_base',
  'malabaltor/tempestislandncave_base',
  'malabaltor/tempestislandsecave_base',
  'malabaltor/tempestislandswcave_base',
  // murkmire
  'murkmire/ui_map_blackroseprison01_base',
  // reach
  'reach/u41_osp_map_secret1',
  'reach/u41_osp_map_secret1bottom',
  'reach/u41_osp_map_secret2',
  'reach/u41_osp_map_section2',
  'reach/u41_osp_map_section3',
  'reach/u41_osp_map_starterarea',
  'reach/vateshransrites01a',
  'reach/vateshransritesmap02',
  'reach/vateshransritesmap03',
  'reach/vateshransritesmap04',
  'reach/vateshransritesmap05',
  // reapersmarch
  'reapersmarch/maw_of_lorkaj_base',
  'reapersmarch/mawlorkajsevenriddles_base',
  'reapersmarch/mawlorkajsuthaysanctuary_base',
  'reapersmarch/mhkmoonhunterkeep2_base',
  'reapersmarch/mhkmoonhunterkeep3_base',
  'reapersmarch/mhkmoonhunterkeep_base',
  'reapersmarch/selenesweb_base',
  'reapersmarch/seleneswebfinalbossarea_base',
  // rivenspire
  'rivenspire/cryptofhearts_base',
  'rivenspire/lostshipyard_map001',
  // shadowfen
  'shadowfen/arxcorinium_base',
  'shadowfen/ui_cradleofshadowsint_001_base',
  'shadowfen/ui_cradleofshadowsint_002_base',
  'shadowfen/ui_cradleofshadowsint_003_base',
  'shadowfen/ui_cradleofshadowsint_004_base',
  'shadowfen/ui_cradleofshadowsint_005_base',
  'shadowfen/ui_map_mazzatunext_base',
  'shadowfen/ui_map_mazzatunint001_base',
  'shadowfen/ui_map_mazzatunint002_base',
  'shadowfen/ui_map_mazzatunint003_base',
  // skyrim
  'skyrim/castlethorn_int_01',
  'skyrim/castlethorn_int_02',
  'skyrim/castlethorn_int_03',
  'skyrim/castlethornmap_001',
  'skyrim/kynesaegisboss3floor001',
  'skyrim/kynesaegisboss3floor002',
  'skyrim/kynesaegisboss3floor003',
  'skyrim/kynesaegismap001',
  'skyrim/stonegarden01_base',
  'skyrim/stonegarden02_base',
  'skyrim/stonegarden02b_base',
  'skyrim/stonegarden03_base',
  'skyrim/stonegarden03b_base',
  // stonefalls
  'stonefalls/balsunn_b1_map',
  'stonefalls/balsunn_b2_map',
  'stonefalls/balsunn_b2trans_map',
  'stonefalls/balsunn_b3_map',
  'stonefalls/balsunn_b3trans_map',
  'stonefalls/balsunn_caves_map',
  'stonefalls/balsunn_deidric_map',
  'stonefalls/balsunn_futuretown01_map',
  'stonefalls/balsunn_pasttown01_map',
  'stonefalls/balsunn_presenttown01',
  'stonefalls/fungalgrotto_base',
  'stonefalls/fungalgrottosecretroom_base',
  // stormhaven
  'stormhaven/ui_map_scalecaller001_base',
  'stormhaven/ui_map_scalecaller002_base',
  'stormhaven/ui_map_scalecaller003_base',
  'stormhaven/ui_map_scalecaller004_base',
  'stormhaven/wayrestsewers_base',
  // summerset
  'summerset/coralaerie_b1_001',
  'summerset/coralaerie_b2_001',
  'summerset/coralaerie_beach_001',
  'summerset/coralaerie_mbwave_001',
  'summerset/coralaerieaerie_001',
  'summerset/coralaerieb3_001',
  'summerset/coralaeriesecretmap001',
  'summerset/ui_map_cloudresttrial_base',
  // systres
  'systres/dsr_b2_map',
  'systres/dsr_b2under_map',
  'systres/dsr_b3_map',
  'systres/dsr_beach_01',
  'systres/dsr_boss1_map',
  'systres/dsr_doors_map',
  'systres/dsr_e_map',
  'systres/dsr_w_map',
  'systres/ere_insidemap01',
  'systres/ere_outsidemap01',
  'systres/ere_outsidemap02',
  'systres/gravendeep_dropbott_map',
  'systres/gravendeep_droptop_map',
  'systres/gravendeep_island_map',
  'systres/gravendeep_secret1_map',
  'systres/gravendeep_section2_map',
  'systres/gravendeep_section3_map',
  // telvanni
  'telvanni/sanitysedgeboss1_map',
  'telvanni/sanitysedgeboss2_map',
  'telvanni/sanitysedgesection3',
  // therift
  'therift/blessedcrucible1_base',
  'therift/blessedcrucible2_base',
  'therift/blessedcrucible3_base',
  'therift/blessedcrucible4_base',
  'therift/blessedcrucible5_base',
  'therift/blessedcrucible6_base',
  'therift/u37_scrivenershall_boss3_map',
  'therift/u37_scrivenershall_boss3int_ma',
  'therift/u37_scrivenershall_sect1_map',
  'therift/u37_scrivenershall_sect1baseme',
  'therift/u37_scrivenershall_sect1floor2',
  'therift/u37_scrivenershall_sect2a_map',
  'therift/u37_scrivenershall_sect2b_map',
  'therift/u37_scrivenershall_sect3a_map',
  'therift/u37_scrivenershall_sect3b_map',
  // vvardenfell
  'vvardenfell/ui_map_hofabricboss3_base',
  'vvardenfell/ui_map_hofabriccaves_base',
  'vvardenfell/ui_map_hofabricext1_base',
  'vvardenfell/ui_map_hofabricloop_base',
  // wrothgar
  'wrothgar/arenasclockwork2_base',
  'wrothgar/arenaslavacaveinterior_base',
  'wrothgar/arenasmephalaexterior_base',
  'wrothgar/arenasmurkmirecaveint_base',
  'wrothgar/arenasoblivionexterior_base',
  'wrothgar/arenaswrothgarexterior_base',
  'wrothgar/icereachpart1',
  'wrothgar/icereachpart2',
  'wrothgar/u41_bv_sc1_map',
  'wrothgar/u41_bv_sc2_map',
  'wrothgar/u41_bv_sc3_map',
]);

/**
 * Directory (relative to the app base) where self-hosted hi-res tiles live in dev, as
 * `<base><dir>/<mapFile>.jpg`. Served straight from `public/` when no external CDN base is configured.
 */
const HIRES_MAP_DIR = 'maps-hires';

/**
 * Optional absolute base for the hi-res tiles in production — an R2 bucket on a custom domain
 * (e.g. `https://maps.esotk.com`), per .scratch/MAP-REHOST-SCOPE.md §5. When `VITE_HIRES_MAP_BASE`
 * is set, tiles resolve to `<base>/<mapFile>.jpg` and the `public/` copies are bypassed; this is the
 * single switch that flips dev (repo `public/`) to prod (R2) with NO code change. The bucket layout
 * must mirror the `mapFile` slash path exactly (`<zone>/<name>.jpg`).
 */
function hiresMapBase(): string | null {
  const cdn = getEnvVar('VITE_HIRES_MAP_BASE');
  if (cdn) return cdn.replace(/\/$/, '');
  return null;
}

const RPGLOGS_MAP_BASE = 'https://assets.rpglogs.com/img/eso/maps';

/**
 * Returns the texture URL for a given `mapFile`: a self-hosted hi-res tile when one is registered (and
 * not explicitly disabled via `VITE_SELF_HOSTED_MAPS=false`, the kill switch for instant rollback),
 * otherwise the RPGLogs CDN default. A registered tile resolves to the R2/CDN base when
 * `VITE_HIRES_MAP_BASE` is set, else to the app-relative `public/maps-hires` copy. Pure and
 * deterministic per `mapFile`, so the caller's `mapFile`-keyed texture cache stays correct. Env access
 * goes through `getEnvVar` (the project's `import.meta.env` wrapper) so this stays testable under Jest,
 * which can't parse `import.meta`.
 */
export function getMapTextureUrl(mapFile: string): string {
  if (HIRES_MAP_FILES.has(mapFile) && getEnvVar('VITE_SELF_HOSTED_MAPS') !== 'false') {
    const cdn = hiresMapBase();
    if (cdn) return `${cdn}/${mapFile}.jpg`;
    const base = getEnvVar('BASE_URL') ?? '/';
    return `${base}${HIRES_MAP_DIR}/${mapFile}.jpg`;
  }
  return getMapTextureFallbackUrl(mapFile);
}

/**
 * The always-available RPGLogs CDN URL for a `mapFile`, independent of the hi-res registry. This is the
 * universal fallback: a registered hi-res tile only EXISTS once it has been deployed (the tiles are
 * gitignored and live in R2, not the bundle), so a build without {@link hiresMapBase} configured — a
 * dev-preview, or production before the R2 bucket is provisioned — resolves {@link getMapTextureUrl} to
 * an app-relative `public/maps-hires` path that 404s, blanking the floor. The texture loader retries
 * with THIS url on a hi-res load error so the map degrades to the original CDN art instead of a blank
 * plane. Returns the same string `getMapTextureUrl` returns for an UNregistered map, by construction.
 */
export function getMapTextureFallbackUrl(mapFile: string): string {
  return `${RPGLOGS_MAP_BASE}/${mapFile}.jpg`;
}
