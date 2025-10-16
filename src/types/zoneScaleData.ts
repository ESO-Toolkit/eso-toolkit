/**
 * Zone scale data mappings imported from elmseditor
 * Source: https://github.com/sheumais/elmseditor/blob/master/src/zone.rs
 *
 * These define the coordinate boundaries and scaling factors for ESO trial map zones.
 * Coordinates are in ESO world space (centimeters).
 */

export interface ZoneScaleData {
  /** Map name */
  name: string;
  /** Map ID (unique identifier for this specific map) */
  mapId: number;
  /** Zone ID (multiple maps can share the same zone) */
  zoneId: number;
  /** Scaling factor (currently unused) */
  scaleFactor: number;
  /** Minimum X coordinate boundary in world space (cm) */
  minX: number;
  /** Maximum X coordinate boundary in world space (cm) */
  maxX: number;
  /** Minimum Z coordinate boundary in world space (cm) */
  minZ: number;
  /** Maximum Z coordinate boundary in world space (cm) */
  maxZ: number;
  /** Optional Y coordinate (for height-based map separation) */
  y?: number;
}

/**
 * Map scale data for all ESO trial zones
 * Organized by zone ID with array of map data per zone
 */
export const ZONE_SCALE_DATA: Record<number, ZoneScaleData[]> = {
  // Hel Ra Citadel (zone 636)
  636: [
    {
      name: 'Hel Ra Citadel',
      mapId: 614,
      zoneId: 636,
      scaleFactor: 0.0000098844,
      minX: 32030.0,
      maxX: 133200.0,
      minZ: 18939.0,
      maxZ: 120109.0,
    },
    {
      name: 'Hall of the Warrior',
      mapId: 616,
      zoneId: 636,
      scaleFactor: 0.0000306654,
      minX: 88470.0,
      maxX: 121080.0,
      minZ: 77439.0,
      maxZ: 110049.0,
    },
  ],

  // Aetherian Archive (zone 638)
  638: [
    {
      name: 'Final Island',
      mapId: 645,
      zoneId: 638,
      scaleFactor: 0.0001529052,
      minX: 124800.0,
      maxX: 131340.0,
      minZ: 179289.0,
      maxZ: 185829.0,
    },
    {
      name: 'Third Island',
      mapId: 644,
      zoneId: 638,
      scaleFactor: 0.0000222173,
      minX: 68160.0,
      maxX: 113170.0,
      minZ: 110150.0,
      maxZ: 155160.0,
    },
    {
      name: 'First Island',
      mapId: 642,
      zoneId: 638,
      scaleFactor: 0.0000263922,
      minX: 74309.0,
      maxX: 112199.0,
      minZ: 68450.0,
      maxZ: 106340.0,
    },
    {
      name: 'Second Island',
      mapId: 643,
      zoneId: 638,
      scaleFactor: 0.0000565931,
      minX: 111229.0,
      maxX: 128899.0,
      minZ: 71279.0,
      maxZ: 88949.0,
    },
    {
      name: 'Middle Level',
      mapId: 641,
      zoneId: 638,
      scaleFactor: 0.0000966184,
      minX: 75389.0,
      maxX: 85739.0,
      minZ: 67669.0,
      maxZ: 78019.0,
    },
    {
      name: 'Lowest Level',
      mapId: 640,
      zoneId: 638,
      scaleFactor: 0.0000966184,
      minX: 75389.0,
      maxX: 85739.0,
      minZ: 67669.0,
      maxZ: 78019.0,
    },
  ],

  // Sanctum Ophidia (zone 639)
  639: [
    {
      name: 'Sanctum Caverns',
      mapId: 705,
      zoneId: 639,
      scaleFactor: 0.0000113779,
      minX: 66794.0,
      maxX: 154684.0,
      minZ: 103904.0,
      maxZ: 191794.0,
    },
    {
      name: 'Ophidian Hallways',
      mapId: 707,
      zoneId: 639,
      scaleFactor: 0.0000178396,
      minX: 92480.0,
      maxX: 148535.0,
      minZ: 72755.0,
      maxZ: 128810.0,
    },
    {
      name: "Serpent's Image",
      mapId: 706,
      zoneId: 639,
      scaleFactor: 0.0000224066,
      minX: 81149.0,
      maxX: 100194.0,
      minZ: 150295.0,
      maxZ: 169340.0,
    },
  ],

  // Maw of Lorkhaj (zone 725)
  725: [
    {
      name: 'Maw of Lorkhaj',
      mapId: 997,
      zoneId: 725,
      scaleFactor: 0.0000191064,
      minX: 71481.0,
      maxX: 123819.0,
      minZ: 113086.0,
      maxZ: 165424.0,
    },
    {
      name: 'Suthay Sanctuary',
      mapId: 999,
      zoneId: 725,
      scaleFactor: 0.0000550497,
      minX: 70411.0,
      maxX: 88576.0,
      minZ: 136138.0,
      maxZ: 154304.0,
    },
    {
      name: 'The High Lunarium',
      mapId: 1000,
      zoneId: 725,
      scaleFactor: 0.0000224066,
      minX: 23734.0,
      maxX: 68364.0,
      minZ: 167379.0,
      maxZ: 212009.0,
    },
  ],

  // Halls of Fabrication (zone 975)
  975: [
    {
      name: 'Abanabi Cave',
      mapId: 1286,
      zoneId: 975,
      scaleFactor: 0.0000160514,
      minX: -3414.0,
      maxX: 58885.0,
      minZ: -13285.0,
      maxZ: 49014.0,
    },
    {
      name: 'Transport Circuit',
      mapId: 1291,
      zoneId: 975,
      scaleFactor: 0.0000299401,
      minX: 63671.0,
      maxX: 97071.0,
      minZ: 7428.0,
      maxZ: 40828.0,
    },
    {
      name: 'Reprocessing Yard Hallway',
      mapId: 1292,
      zoneId: 975,
      scaleFactor: 0.0000556439,
      minX: 4299.0,
      maxX: 22271.0,
      minZ: 50099.0,
      maxZ: 68071.0,
    },
    {
      name: 'Reprocessing Yard',
      mapId: 1294,
      zoneId: 975,
      scaleFactor: 0.0000265252,
      minX: 6257.0,
      maxX: 43957.0,
      minZ: 54685.0,
      maxZ: 92385.0,
    },
    {
      name: 'Reprocessing Yard Hallway',
      mapId: 1298,
      zoneId: 975,
      scaleFactor: 0.0000814427,
      minX: 23863.0,
      maxX: 36142.0,
      minZ: 168844.0,
      maxZ: 181122.0,
    },
    {
      name: 'Core Assembly',
      mapId: 1299,
      zoneId: 975,
      scaleFactor: 0.0000373732,
      minX: 63285.0,
      maxX: 90042.0,
      minZ: 54685.0,
      maxZ: 81442.0,
    },
  ],

  // Asylum Sanctorium (zone 1000 / vAS)
  1000: [
    {
      name: 'Asylum Atrium',
      mapId: 1391,
      zoneId: 1000,
      scaleFactor: 0.0000210217,
      minX: 63360.0,
      maxX: 110930.0,
      minZ: 75410.0,
      maxZ: 122980.0,
      y: 61450.0,
    },
    {
      name: 'Upper Level',
      mapId: 1392,
      zoneId: 1000,
      scaleFactor: 0.00003125,
      minX: 84629.0,
      maxX: 116629.0,
      minZ: 83199.0,
      maxZ: 115199.0,
      y: 65850.0,
    },
  ],

  // Cloudrest (zone 1051 / vOC)
  1051: [
    {
      name: 'Cloudrest',
      mapId: 1502,
      zoneId: 1051,
      scaleFactor: 0.0000174606,
      minX: 118653.0,
      maxX: 196202.0,
      minZ: 51100.0,
      maxZ: 128648.0,
    },
  ],

  // Sunspire (zone 1121 / vSS)
  1121: [
    {
      name: 'Sunspire Temple Grounds',
      mapId: 1649,
      zoneId: 1121,
      scaleFactor: 0.0000100348,
      minX: 54438.0,
      maxX: 154091.0,
      minZ: 47127.0,
      maxZ: 146780.0,
    },
    {
      name: 'Chancel of Alkosh Vestibule',
      mapId: 1651,
      zoneId: 1121,
      scaleFactor: 0.0000712216,
      minX: 98753.0,
      maxX: 112794.0,
      minZ: 68647.0,
      maxZ: 82688.0,
    },
    {
      name: '(Ice) Shrine of Jone',
      mapId: 1655,
      zoneId: 1121,
      scaleFactor: 0.0000814427,
      minX: 168937.0,
      maxX: 181216.0,
      minZ: 163876.0,
      maxZ: 176155.0,
    },
    {
      name: '(Fire) Shrine of Jone',
      mapId: 1657,
      zoneId: 1121,
      scaleFactor: 0.0000814427,
      minX: 23863.0,
      maxX: 36142.0,
      minZ: 168844.0,
      maxZ: 181122.0,
    },
  ],

  // Kyne's Aegis (zone 1196 / vKA)
  1196: [
    {
      name: "Kyne's Aegis",
      mapId: 1805,
      zoneId: 1196,
      scaleFactor: 0.0000084731,
      minX: 44399.0,
      maxX: 162419.0,
      minZ: 35279.0,
      maxZ: 153299.0,
    },
    {
      name: '(Falgravn) Ruins',
      mapId: 1806,
      zoneId: 1196,
      scaleFactor: 0.0000978474,
      minX: 19228.0,
      maxX: 30723.0,
      minZ: 4337.0,
      maxZ: 15832.0,
      y: 21750.0,
    },
    {
      name: '(Floor 2) Hidden Barrow',
      mapId: 1807,
      zoneId: 1196,
      scaleFactor: 0.0000878735,
      minX: 19228.0,
      maxX: 30723.0,
      minZ: 4337.0,
      maxZ: 15832.0,
      y: 14500.0,
    },
    {
      name: '(Floor 3) Ritual Vault',
      mapId: 1808,
      zoneId: 1196,
      scaleFactor: 0.0000783699,
      minX: 19228.0,
      maxX: 30723.0,
      minZ: 4337.0,
      maxZ: 15832.0,
      y: 7070.0,
    },
  ],

  // Rockgrove (zone 1263 / vRG)
  1263: [
    {
      name: 'Ancient City of Rockgrove',
      mapId: 2004,
      zoneId: 1263,
      scaleFactor: 0.0000125125,
      minX: 59680.0,
      maxX: 139600.0,
      minZ: 43400.0,
      maxZ: 123320.0,
    },
    {
      name: 'Xanmeer Corridors',
      mapId: 2005,
      zoneId: 1263,
      scaleFactor: 0.0000271592,
      minX: 29620.0,
      maxX: 66440.0,
      minZ: 64300.0,
      maxZ: 101120.0,
    },
    {
      name: 'Tower of the Five Crimes',
      mapId: 2006,
      zoneId: 1263,
      scaleFactor: 0.0000123701,
      minX: 118500.0,
      maxX: 199340.0,
      minZ: 118700.0,
      maxZ: 199540.0,
    },
  ],

  // Dreadsail Reef (zone 1344 / vDSR)
  1344: [
    {
      name: 'Dreadsail Beach',
      mapId: 2164,
      zoneId: 1344,
      scaleFactor: 0.0000123963,
      minX: 8461.0,
      maxX: 89130.0,
      minZ: 120141.0,
      maxZ: 200811.0,
    },
    {
      name: '(Twins) Bloodsport Arena',
      mapId: 2165,
      zoneId: 1344,
      scaleFactor: 0.0000389544,
      minX: 57121.0,
      maxX: 82792.0,
      minZ: 71757.0,
      maxZ: 97428.0,
      y: 36125.0,
    },
    {
      name: 'Reef Warren',
      mapId: 2166,
      zoneId: 1344,
      scaleFactor: 0.0000262208,
      minX: 93316.0,
      maxX: 131453.0,
      minZ: 83429.0,
      maxZ: 121567.0,
    },
    {
      name: '(Bird) Tempest Heights',
      mapId: 2179,
      zoneId: 1344,
      scaleFactor: 0.0000111884,
      minX: 110272.0,
      maxX: 199650.0,
      minZ: 110266.0,
      maxZ: 199645.0,
    },
    {
      name: '(Crab) Reef Caverns',
      mapId: 2180,
      zoneId: 1344,
      scaleFactor: 0.0000144686,
      minX: 4439.0,
      maxX: 73554.0,
      minZ: -4129.0,
      maxZ: 64986.0,
    },
    {
      name: '(Reef Guardian) Coral Cavern',
      mapId: 2181,
      zoneId: 1344,
      scaleFactor: 0.0000372149,
      minX: 159011.0,
      maxX: 185882.0,
      minZ: 69115.0,
      maxZ: 95986.0,
      y: 39803.0,
    },
    {
      name: 'Coral Cavern Whorlpools',
      mapId: 2182,
      zoneId: 1344,
      scaleFactor: 0.0000372149,
      minX: 159051.0,
      maxX: 185922.0,
      minZ: 69115.0,
      maxZ: 95986.0,
    },
    {
      name: "Fleet Queen's Parlors",
      mapId: 2183,
      zoneId: 1344,
      scaleFactor: 0.000017709,
      minX: 89102.0,
      maxX: 145570.0,
      minZ: 9548.0,
      maxZ: 66016.0,
    },
    {
      name: '(Taleria) Coral Caldera',
      mapId: 2184,
      zoneId: 1344,
      scaleFactor: 0.0000380036,
      minX: 156781.0,
      maxX: 183094.0,
      minZ: 14641.0,
      maxZ: 40954.0,
      y: 36114.0,
    },
  ],

  // Sanity's Edge (zone 1427 / vSE)
  1427: [
    {
      name: 'The Twisted Memory',
      mapId: 2334,
      zoneId: 1427,
      scaleFactor: 0.0000141063,
      minX: 162698.0,
      maxX: 233589.0,
      minZ: 19368.0,
      maxZ: 90259.0,
    },
    {
      name: "Chimera's Den",
      mapId: 2333,
      zoneId: 1427,
      scaleFactor: 0.0000340276,
      minX: 165357.0,
      maxX: 194745.0,
      minZ: 216826.0,
      maxZ: 246214.0,
      y: 40325.0,
    },
    {
      name: "Yaseyla's Execution Room",
      mapId: 2331,
      zoneId: 1427,
      scaleFactor: 0.0001057579,
      minX: 79782.0,
      maxX: 89237.0,
      minZ: 29898.0,
      maxZ: 39354.0,
    },
    {
      name: "Vanton's Nightmare",
      mapId: 2330,
      zoneId: 1427,
      scaleFactor: 0.0000174369,
      minX: 33297.0,
      maxX: 90646.0,
      minZ: 51538.0,
      maxZ: 108888.0,
    },
    {
      name: "Vanton's Dream",
      mapId: 2332,
      zoneId: 1427,
      scaleFactor: 0.0000149295,
      minX: 127377.0,
      maxX: 194358.0,
      minZ: 133082.0,
      maxZ: 200063.0,
    },
  ],

  // Lucent Citadel (zone 1478 / vLC)
  1478: [
    {
      name: 'Lucent Citadel',
      mapId: 2552,
      zoneId: 1478,
      scaleFactor: 0.0000092868,
      minX: 64733.0,
      maxX: 172413.0,
      minZ: 78056.0,
      maxZ: 185736.0,
    },
  ],

  // Ossein Cage (zone 1548 / vOC - latest trial)
  1548: [
    {
      name: '(Shapers) The Marred Path',
      mapId: 2687,
      zoneId: 1548,
      scaleFactor: 0.0000115969,
      minX: 144318.0,
      maxX: 230548.0,
      minZ: 29010.0,
      maxZ: 115240.0,
    },
    {
      name: "(Twins) Quarreler's Quarry",
      mapId: 2688,
      zoneId: 1548,
      scaleFactor: 0.0000157973,
      minX: 57954.0,
      maxX: 121256.0,
      minZ: 96323.0,
      maxZ: 159625.0,
    },
    {
      name: 'The Wormgut',
      mapId: 2689,
      zoneId: 1548,
      scaleFactor: 0.0000125188,
      minX: 141042.0,
      maxX: 220922.0,
      minZ: 138302.0,
      maxZ: 218181.0,
    },
    {
      name: '(Kazpian) The Mangled Court',
      mapId: 2690,
      zoneId: 1548,
      scaleFactor: 0.0000249333,
      minX: 30815.0,
      maxX: 70922.0,
      minZ: 179812.0,
      maxZ: 219919.0,
      y: 35551.0,
    },
    {
      name: 'Inscrutable Lichyard',
      mapId: 2691,
      zoneId: 1548,
      scaleFactor: 0.0000396817,
      minX: 63168.0,
      maxX: 88368.0,
      minZ: 12901.0,
      maxZ: 38101.0,
    },
    {
      name: 'Gaol of Transition',
      mapId: 2692,
      zoneId: 1548,
      scaleFactor: 0.0000485714,
      minX: 64572.0,
      maxX: 85160.0,
      minZ: 64639.0,
      maxZ: 85227.0,
    },
    {
      name: 'Sitient Lair',
      mapId: 2693,
      zoneId: 1548,
      scaleFactor: 0.0000526761,
      minX: 15508.0,
      maxX: 34491.0,
      minZ: 65574.0,
      maxZ: 84558.0,
    },
  ],
};

/**
 * Zone ID to zone name mappings for ESO trials
 */
export const ZONE_NAMES: Record<number, string> = {
  636: 'Hel Ra Citadel',
  638: 'Aetherian Archive',
  639: 'Sanctum Ophidia',
  725: 'Maw of Lorkhaj',
  975: 'Halls of Fabrication',
  1000: 'Asylum Sanctorium',
  1051: 'Cloudrest',
  1121: 'Sunspire',
  1196: "Kyne's Aegis",
  1263: 'Rockgrove',
  1344: 'Dreadsail Reef',
  1427: "Sanity's Edge",
  1478: 'Lucent Citadel',
  1548: 'Ossein Cage',
};

/**
 * Helper function to get scale data for a specific zone
 */
export function getZoneScaleData(zoneId: number): ZoneScaleData[] | undefined {
  return ZONE_SCALE_DATA[zoneId];
}

/**
 * Helper function to get scale data for a specific map
 */
export function getMapScaleData(zoneId: number, mapId: number): ZoneScaleData | undefined {
  const zoneMaps = ZONE_SCALE_DATA[zoneId];
  return zoneMaps?.find((map) => map.mapId === mapId);
}

/**
 * Helper function to get zone name
 */
export function getZoneName(zoneId: number): string {
  return ZONE_NAMES[zoneId] || 'Unknown Zone';
}

/**
 * Helper function to find best matching map for a given world position
 * Based on elmseditor's find_best_map logic
 */
export function findBestMap(
  zoneId: number,
  x: number,
  y: number,
  z: number,
): ZoneScaleData | undefined {
  const zoneMaps = ZONE_SCALE_DATA[zoneId];
  if (!zoneMaps) return undefined;

  // Filter maps that contain the point
  const matchingMaps = zoneMaps.filter(
    (map) => x >= map.minX && x <= map.maxX && z >= map.minZ && z <= map.maxZ,
  );

  if (matchingMaps.length === 0) return undefined;
  if (matchingMaps.length === 1) return matchingMaps[0];

  // Sort by: unknown flag (maps with y are preferred), y offset, then area (smallest first)
  return matchingMaps.sort((a, b) => {
    const aHasY = a.y !== undefined ? 0 : 1;
    const bHasY = b.y !== undefined ? 0 : 1;

    if (aHasY !== bHasY) return aHasY - bHasY;

    if (a.y !== undefined && b.y !== undefined) {
      const aYOffset = Math.abs(y - a.y);
      const bYOffset = Math.abs(y - b.y);
      if (aYOffset !== bYOffset) return aYOffset - bYOffset;
    }

    const aArea = (a.maxX - a.minX) * (a.maxZ - a.minZ);
    const bArea = (b.maxX - b.minX) * (b.maxZ - b.minZ);
    return aArea - bArea;
  })[0];
}
