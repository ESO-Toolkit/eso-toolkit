import { KnownSetIDs } from '../types/abilities';

/**
 * Map of set IDs to their display names
 * This centralizes the display name mapping for the roster builder
 */
export const SET_DISPLAY_NAMES: Record<KnownSetIDs, string> = {
  // ============================================================
  // SUPPORT SETS - HEALER 5-PIECE
  // ============================================================
  [KnownSetIDs.WAY_OF_MARTIAL_KNOWLEDGE]: 'Martial Knowledge',
  [KnownSetIDs.POWERFUL_ASSAULT]: 'Powerful Assault',
  [KnownSetIDs.SPELL_POWER_CURE]: 'Spell Power Cure',
  [KnownSetIDs.COMBAT_PHYSICIAN]: 'Combat Physician',
  [KnownSetIDs.MASTER_ARCHITECT]: 'Master Architect',
  [KnownSetIDs.JORVULDS_GUIDANCE]: "Jorvuld's Guidance",
  [KnownSetIDs.VESTMENT_OF_OLORIME]: 'Olorime',
  [KnownSetIDs.PERFECTED_VESTMENT_OF_OLORIME]: 'Perfected Olorime',
  [KnownSetIDs.ZENS_REDRESS]: "Zen's Redress",
  [KnownSetIDs.ROARING_OPPORTUNIST]: 'Roaring Opportunist',
  [KnownSetIDs.PERFECTED_ROARING_OPPORTUNIST]: 'Perfected Roaring Opportunist',

  // ============================================================
  // SUPPORT SETS - TANK 5-PIECE
  // ============================================================
  [KnownSetIDs.ROAR_OF_ALKOSH]: 'Alkosh',
  [KnownSetIDs.WAR_MACHINE]: 'War Machine',
  [KnownSetIDs.CLAW_OF_YOLNAHKRIIN]: 'Yolnahkriin',
  [KnownSetIDs.PERFECTED_CLAW_OF_YOLNAHKRIIN]: 'Claw of Yolnahkriin',
  [KnownSetIDs.DRAKES_RUSH]: "Drake's Rush",
  [KnownSetIDs.PERFECTED_SAXHLEEL_CHAMPION]: 'Saxhleel Champion',
  [KnownSetIDs.PEARLESCENT_WARD]: 'Pearlescent Ward',
  [KnownSetIDs.PILLAGERS_PROFIT]: "Pillager's Profit",
  [KnownSetIDs.PERFECTED_PILLAGERS_PROFIT]: "Perfected Pillager's Profit",
  [KnownSetIDs.PERFECTED_PEARLESCENT_WARD]: 'Perfected Pearlescent Ward',
  [KnownSetIDs.LUCENT_ECHOES]: 'Lucent Echoes',
  [KnownSetIDs.PERFECTED_LUCENT_ECHOES]: 'Perfected Lucent Echoes',

  // ============================================================
  // SUPPORT SETS - MONSTER SETS (2-PIECE)
  // ============================================================
  [KnownSetIDs.ENGINE_GUARDIAN]: 'Engine Guardian',
  [KnownSetIDs.VALKYN_SKORIA]: 'Valkyn Skoria',
  [KnownSetIDs.SLIMECRAW]: 'Slimecraw',
  [KnownSetIDs.EARTHGORE]: 'Earthgore',
  [KnownSetIDs.SYMPHONY_OF_BLADES]: 'Symphony of Blades',
  [KnownSetIDs.STONE_HUSK]: 'Stone Husk',
  [KnownSetIDs.ENCRATIS_BEHEMOTH]: 'Encratis',
  [KnownSetIDs.BARON_ZAUDRUS]: 'Baron Zaudrus',
  [KnownSetIDs.SPAULDER_OF_RUIN]: 'Spaulder of Ruin',
  [KnownSetIDs.NAZARAY]: 'Nazaray',
  [KnownSetIDs.NUNATAK]: 'Nunatak',
  [KnownSetIDs.ARCHDRUID_DEVYRIC]: 'Archdruid Devyric',
  [KnownSetIDs.OZEZAN]: 'Ozezan',
  [KnownSetIDs.THE_BLIND]: 'The Blind',

  // ============================================================
  // MYTHIC SETS
  // ============================================================
  [KnownSetIDs.PEARLS_OF_EHLNOFEY]: 'Pearls of Ehlnofey',
  [KnownSetIDs.VELOTHI_UR_MAGE]: "Velothi Ur-Mage's Amulet",

  // ============================================================
  // DPS SETS - 5-PIECE
  // ============================================================
  [KnownSetIDs.DEADLY_STRIKE]: 'Deadly Strike',
  [KnownSetIDs.PERFECTED_MERCILESS_CHARGE]: 'Perfected Merciless Charge',
  [KnownSetIDs.MERCILESS_CHARGE]: 'Merciless Charge',
  [KnownSetIDs.CRUSHING_WALL]: 'Crushing Wall',
  [KnownSetIDs.PERFECTED_CRUSHING_WALL]: 'Perfected Crushing Wall',
  [KnownSetIDs.PERFECTED_GRAND_REJUVENATION]: 'Perfected Grand Rejuvenation',
  [KnownSetIDs.CRYPTCANON_VESTMENTS]: 'Cryptcanon Vestments',
  [KnownSetIDs.PERFECTED_ANSUULS_TORMENT]: "Perfected Ansuul's Torment",
  [KnownSetIDs.SLIVERS_OF_THE_NULL_ARCA]: 'Slivers of the Null Arca',
  [KnownSetIDs.PERFECTED_SLIVERS_OF_THE_NULL_ARCA]: 'Perfected Slivers of the Null Arca',
  [KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE]: "Perfected Xoryn's Masterpiece",
  [KnownSetIDs.TIDEBORN_WILDSTALKER]: 'Tide-Born Wildstalker',

  // ============================================================
  // OTHER SETS (Training/Leveling)
  // ============================================================
  [KnownSetIDs.ARMOR_OF_THE_TRAINEE]: 'Armor of the Trainee',
  [KnownSetIDs.AEGIS_CALLER]: 'Aegis Caller',
  [KnownSetIDs.PLAGUE_SLINGER]: 'Plague Slinger',

  // ============================================================
  // DPS/PENETRATION SETS (Previously defined, keeping for compatibility)
  // Note: Some IDs are duplicates (ANSUULS_TORMENT_SET=707, TIDEBORN_WILDSTALKER_SET=809)
  // ============================================================
  [KnownSetIDs.SUL_XAN_TORMENT_SET]: "Sul-Xan's Torment",
  [KnownSetIDs.MORA_SCRIBE_THESIS_SET]: "Mora Scribe's Thesis",
  [KnownSetIDs.HARPOONER_WADING_KILT_SET]: "Harpooner's Wading Kilt",
  [KnownSetIDs.SHATTERED_FATE_SET]: 'Shattered Fate',
  [KnownSetIDs.SPRIGGANS_THORNS_SET]: "Spriggan's Thorns",
  [KnownSetIDs.BALORGH_SET]: 'Balorgh',
  [KnownSetIDs.AERIES_CRY_SET]: "Aerie's Cry",
  [KnownSetIDs.AURORANS_THUNDER_SET]: "Auroran's Thunder",
  [KnownSetIDs.ARMS_OF_RELEQUEN_SET]: 'Arms of Relequen',
  [KnownSetIDs.ARMS_OF_THE_ANCESTORS_SET]: 'Arms of the Ancestors',
  [KnownSetIDs.ARCHDRUID_DEVYRIC_SET]: 'Archdruid Devyric',
  [KnownSetIDs.BLACK_GEM_MONSTROSITY_SET]: 'Black Gem Monstrosity',
  [KnownSetIDs.COLOVIAN_HIGHLANDS_GENERAL_SET]: 'Colovian Highlands General',
  [KnownSetIDs.CINDERS_OF_ANTHELMIR_SET]: 'Cinders of Anthelmir',
  [KnownSetIDs.CORPSEBURSTER_SET]: 'Corpseburster',
  [KnownSetIDs.PERFECT_ARMS_OF_RELEQUEN_SET]: 'Perfect Arms of Relequen',
  [KnownSetIDs.PERFECT_AURORAN_THUNDER_SET]: "Perfect Auroran's Thunder",
  [KnownSetIDs.PERFECT_ANSUULS_TORMENT_SET]: "Perfect Ansuul's Torment",
  [KnownSetIDs.DARK_CONVERGENCE_SET]: 'Dark Convergence',
  [KnownSetIDs.DRAUGRKINS_GRIP_SET]: "Draugrkin's Grip",
  [KnownSetIDs.DRO_ZAKARS_CLAWS_SET]: "Dro'Zakar's Claws",
  [KnownSetIDs.FLAME_BLOSSOM_SET]: 'Flame Blossom',
  [KnownSetIDs.GRISLY_GOURMET_SET]: 'Grisly Gourmet',
  [KnownSetIDs.GRYPHONS_REPRISAL_SET]: "Gryphon's Reprisal",
  [KnownSetIDs.HEW_AND_SUNDER_SET]: 'Hew and Sunder',
  [KnownSetIDs.HROTHGARS_CHILL_SET]: "Hrothgar's Chill",
  [KnownSetIDs.ICY_CONJURER_SET]: 'Icy Conjurer',
  [KnownSetIDs.JERENSIS_BLADESTORM_SET]: "Jerensi's Bladestorm",
  [KnownSetIDs.KAZPIANS_CRUEL_SIGNET_SET]: "Kazpian's Cruel Signet",
  [KnownSetIDs.KRAGH_SET]: "Kra'gh",
  // Note: LADY_MALYGDA_SET = 738 is duplicate with THE_BLIND
  [KnownSetIDs.LANGUOR_OF_PERYITE_SET]: 'Languor of Peryite',
  [KnownSetIDs.LEGACY_OF_KARTH_SET]: 'Legacy of Karth',
  [KnownSetIDs.NEW_MOON_ACOLYTE_SET]: 'New Moon Acolyte',
  [KnownSetIDs.NOCTURNALS_PLOY_SET]: "Nocturnal's Ploy",
  [KnownSetIDs.NOXIOUS_BOULDER_SET]: 'Noxious Boulder',
  [KnownSetIDs.OBLIVIONS_FOE_SET]: "Oblivion's Foe",
  [KnownSetIDs.PELINALS_WRATH_SET]: "Pelinal's Wrath",
  [KnownSetIDs.PERFECTED_CRUSHING_WALL_SET]: 'Perfected Crushing Wall',
  [KnownSetIDs.PERFECTED_KAZPIANS_CRUEL_SIGNET_SET]: "Perfected Kazpian's Cruel Signet",
  [KnownSetIDs.PERFECTED_MERCILESS_CHARGE_SET]: 'Perfected Merciless Charge',
};

/**
 * Get the display name for a set ID
 */
export function getSetDisplayName(setId: KnownSetIDs | undefined | null): string {
  if (setId === undefined || setId === null) return '';
  return SET_DISPLAY_NAMES[setId] || `Unknown Set (${setId})`;
}

/**
 * Find a set ID by its display name (case-insensitive, handles variations)
 * Returns undefined if not found
 */
export function findSetIdByName(displayName: string | undefined | null): KnownSetIDs | undefined {
  if (!displayName) return undefined;

  const normalized = displayName.toLowerCase().trim();

  for (const [setId, name] of Object.entries(SET_DISPLAY_NAMES)) {
    if (name.toLowerCase() === normalized) {
      return Number(setId) as KnownSetIDs;
    }
  }

  return undefined;
}

/**
 * Convert a roster builder set name (string) to a set ID
 * Handles common variations like "Pillager's Profit" vs "Perfected Pillager's Profit"
 */
export function rosterSetNameToId(setName: string | undefined): KnownSetIDs | undefined {
  return findSetIdByName(setName);
}

/**
 * Convert a set ID to a roster builder display name
 */
export function setIdToRosterName(setId: KnownSetIDs | undefined): string {
  return getSetDisplayName(setId);
}

/**
 * Get all set IDs for display in UI (sorted by name)
 */
export function getAllSetIds(): KnownSetIDs[] {
  return Object.keys(SET_DISPLAY_NAMES)
    .map(Number)
    .filter((id) => !isNaN(id)) as KnownSetIDs[];
}

/**
 * Get set IDs sorted by their display names
 */
export function getSetIdsSortedByName(): KnownSetIDs[] {
  return getAllSetIds().sort((a, b) => {
    const nameA = SET_DISPLAY_NAMES[a];
    const nameB = SET_DISPLAY_NAMES[b];
    return nameA.localeCompare(nameB);
  });
}

/**
 * Get all set display names sorted alphabetically
 */
export function getAllSetDisplayNames(): string[] {
  return Object.values(SET_DISPLAY_NAMES).sort((a, b) => a.localeCompare(b));
}
