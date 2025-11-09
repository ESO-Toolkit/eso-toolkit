import { KnownSetIDs } from '../types/abilities';

import { reportError } from './sentryUtils';

/**
 * Sets that are not currently supported for calculations due to missing verified API IDs.
 * These sets will be marked with "(unsupported)" in the UI.
 * When verified set IDs are obtained from combat logs, they should be added to KnownSetIDs.
 */
export const UNSUPPORTED_SET_NAMES: Record<string, string> = {
  'Shattered Fate': 'Shattered Fate',
  "Spriggan's Thorns": "Spriggan's Thorns",
  "Aerie's Cry": "Aerie's Cry",
  "Auroran's Thunder": "Auroran's Thunder",
  'Arms of the Ancestors': 'Arms of the Ancestors',
  'Colovian Highlands General': 'Colovian Highlands General',
  'Cinders of Anthelmir': 'Cinders of Anthelmir',
  "Perfect Auroran's Thunder": "Perfect Auroran's Thunder",
  'Dark Convergence': 'Dark Convergence',
  "Draugrkin's Grip": "Draugrkin's Grip",
  "Dro'Zakar's Claws": "Dro'Zakar's Claws",
  'Grisly Gourmet': 'Grisly Gourmet',
  "Gryphon's Reprisal": "Gryphon's Reprisal",
  'Hew and Sunder': 'Hew and Sunder',
  "Hrothgar's Chill": "Hrothgar's Chill",
  'Icy Conjurer': 'Icy Conjurer',
  'Languor of Peryite': 'Languor of Peryite',
  'Legacy of Karth': 'Legacy of Karth',
  "Nocturnal's Ploy": "Nocturnal's Ploy",
  'Noxious Boulder': 'Noxious Boulder',
  "Oblivion's Foe": "Oblivion's Foe",
};

/**
 * Check if a set name is in the unsupported list
 */
export function isUnsupportedSet(setName: string): boolean {
  return setName in UNSUPPORTED_SET_NAMES;
}

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
  [KnownSetIDs.PERFECTED_XORYNS_MASTERPIECE]: "Xoryn's Masterpiece",
  [KnownSetIDs.TIDEBORN_WILDSTALKER]: 'Tide-Born Wildstalker',

  // ============================================================
  // OTHER SETS (Training/Leveling)
  // ============================================================
  [KnownSetIDs.ARMOR_OF_THE_TRAINEE]: 'Armor of the Trainee',
  [KnownSetIDs.DRUIDS_BRAID]: "Druid's Braid",
  [KnownSetIDs.AEGIS_CALLER]: 'Aegis Caller',
  [KnownSetIDs.PLAGUE_SLINGER]: 'Plague Slinger',

  // ============================================================
  // MISSING SETS (Discovered from Leaderboard Logs - Nov 2024)
  // ============================================================
  [KnownSetIDs.THE_SERGEANT]: 'The Sergeant',
  [KnownSetIDs.THE_NOBLE_DUELIST]: 'The Noble Duelist',
  [KnownSetIDs.DREUGH_KING_SLAYER]: 'Dreugh King Slayer',
  [KnownSetIDs.THE_CRUSADER]: 'The Crusader',
  [KnownSetIDs.HUNDINGS_RAGE]: "Hunding's Rage",
  [KnownSetIDs.ELF_BANE]: 'Elf Bane',
  [KnownSetIDs.NECROPOTENCE]: 'Necropotence',
  [KnownSetIDs.NIGHT_TERROR]: 'Night Terror',
  [KnownSetIDs.BLESSING_OF_THE_POTENTATES]: 'Blessing of the Potentates',
  [KnownSetIDs.ADVANCING_YOKEDA]: 'Advancing Yokeda',
  [KnownSetIDs.RESILIENT_YOKEDA]: 'Resilient Yokeda',
  [KnownSetIDs.AETHER_DESTRUCTION]: 'Aether',
  [KnownSetIDs.UNDAUNTED_UNWEAVER]: 'Undaunted Unweaver',
  [KnownSetIDs.BURNING_SPELLWEAVE]: 'Burning Spellweave',
  [KnownSetIDs.BLOODSPAWN]: 'Bloodspawn',
  [KnownSetIDs.NERIENETH]: "Nerien'eth",
  [KnownSetIDs.MAW_OF_THE_INFERNAL]: 'Maw of the Infernal',
  [KnownSetIDs.INFALLIBLE_AETHER]: 'Infallible Aether',
  [KnownSetIDs.MOLAG_KENA]: 'Molag Kena',
  [KnownSetIDs.BRANDS_OF_IMPERIUM]: 'Brands of Imperium',
  [KnownSetIDs.SWAMP_RAIDER]: 'Swamp Raider',
  [KnownSetIDs.STORM_MASTER]: 'Storm Master',
  [KnownSetIDs.SCATHING_MAGE]: 'Scathing Mage',
  [KnownSetIDs.LEECHING_PLATE]: 'Leeching Plate',
  [KnownSetIDs.ESSENCE_THIEF]: 'Essence Thief',
  [KnownSetIDs.AGILITY]: 'Agility',
  [KnownSetIDs.LAW_OF_JULIANOS]: 'Law of Julianos',
  [KnownSetIDs.BRIARHEART]: 'Briarheart',
  [KnownSetIDs.MIGHTY_CHUDAN]: 'Mighty Chudan',
  [KnownSetIDs.SWARM_MOTHER]: 'Swarm Mother',
  [KnownSetIDs.ICEHEART]: 'Iceheart',
  [KnownSetIDs.TREMORSCALE]: 'Tremorscale',
  [KnownSetIDs.GROTHDARR]: 'Grothdarr',
  [KnownSetIDs.MOTHERS_SORROW]: "Mother's Sorrow",
  [KnownSetIDs.PLAGUE_DOCTOR]: 'Plague Doctor',
  [KnownSetIDs.MEDUSA]: 'Medusa',
  [KnownSetIDs.TREASURE_HUNTER]: 'Treasure Hunter',
  [KnownSetIDs.THE_MASTERS_MACE]: "The Master's Mace",
  [KnownSetIDs.THE_MASTERS_ICE_STAFF]: "The Master's Ice Staff",
  [KnownSetIDs.THE_MASTERS_RESTORATION_STAFF]: "The Master's Restoration Staff",
  [KnownSetIDs.WAR_MAIDEN]: 'War Maiden',
  [KnownSetIDs.DEFILER]: 'Defiler',
  [KnownSetIDs.PILLAR_OF_NIRN]: 'Pillar of Nirn',
  [KnownSetIDs.ZAAN]: 'Zaan',
  [KnownSetIDs.MECHANICAL_ACUITY]: 'Mechanical Acuity',
  [KnownSetIDs.UNFATHOMABLE_DARKNESS]: 'Unfathomable Darkness',
  [KnownSetIDs.ASYLUM_PERFECTED_DAGGER]: "Asylum's Perfected Dagger",
  [KnownSetIDs.ASYLUM_PERFECTED_RESTO]: "Asylum's Perfected Restoration Staff",
  [KnownSetIDs.MAELSTROMS_BOW]: "Maelstrom's Bow",
  [KnownSetIDs.RELEQUEN]: 'Relequen',
  [KnownSetIDs.RELEQUEN_PERFECTED]: "Relequen's Perfected",
  [KnownSetIDs.SIRORIA_PERFECTED]: "Siroria's Perfected",
  [KnownSetIDs.BALORGH]: 'Balorgh',
  [KnownSetIDs.BLACKROSE_DAGGER]: 'Blackrose Prison Dagger',
  [KnownSetIDs.BLACKROSE_PERFECTED_DAGGER]: 'Blackrose Prison Perfected Dagger',
  [KnownSetIDs.BLACKROSE_PERFECTED_BOW]: 'Blackrose Prison Perfected Bow',
  [KnownSetIDs.BLACKROSE_PERFECTED_ICE_STAFF]: 'Blackrose Prison Perfected Ice Staff',
  [KnownSetIDs.BLACKROSE_PERFECTED_RESTO]: 'Blackrose Prison Perfected Restoration Staff',
  [KnownSetIDs.STONEKEEPER]: 'Stonekeeper',
  [KnownSetIDs.LOKKESTIIZ_PERFECTED]: "Lokkestiiz's Perfected",
  [KnownSetIDs.AZUREBLIGHT]: 'Azureblight',
  [KnownSetIDs.DRAGONGUARD_ELITE]: 'Dragonguard Elite',
  [KnownSetIDs.NEW_MOON_ACOLYTE]: 'New Moon Acolyte',
  [KnownSetIDs.VENOMOUS_SMITE]: 'Venomous Smite',
  [KnownSetIDs.VROL_PERFECTED]: "Vrol's Perfected",
  [KnownSetIDs.WILD_HUNT]: 'Wild Hunt',
  [KnownSetIDs.VATESHRAN_GREATSWORD]: "Vateshran's Greatsword",
  [KnownSetIDs.VATESHRAN_PERFECTED_STAFF]: "Vateshran's Perfected Staff",
  [KnownSetIDs.FROSTBITE]: 'Frostbite',
  [KnownSetIDs.HEARTLAND_CONQUEROR]: 'Heartland Conqueror',
  [KnownSetIDs.SAXHLEEL_CHAMPION]: 'Saxhleel Champion',
  [KnownSetIDs.SUL_XAN_TORMENT]: "Sul-Xan's Torment",
  [KnownSetIDs.PERFECTED_SUL_XAN_TORMENT]: "Perfected Sul-Xan's Torment",
  [KnownSetIDs.BAHSEI_MANIA_PERFECTED]: "Perfected Bahsei's Mania",
  [KnownSetIDs.HARPOONERS_KILT]: "Harpooner's Wading Kilt",
  [KnownSetIDs.DEATH_DEALERS_FETE]: "Death Dealer's Fete",
  [KnownSetIDs.CRIMSON_OATH]: 'Crimson Oath',
  [KnownSetIDs.MAGMA_INCARNATE]: 'Magma Incarnate',
  [KnownSetIDs.WRETCHED_VITALITY]: 'Wretched Vitality',
  [KnownSetIDs.HEXOS_WARD]: "Hexos' Ward",
  [KnownSetIDs.PLAGUEBREAK]: 'Plaguebreak',
  [KnownSetIDs.TURNING_TIDE]: 'Turning Tide',
  [KnownSetIDs.MARKYN_RING]: 'Markyn Ring of Majesty',
  [KnownSetIDs.RALLYING_CRY]: 'Rallying Cry',
  [KnownSetIDs.BARON_THIRSK]: 'Baron Thirsk',
  [KnownSetIDs.ORDERS_WRATH]: "Order's Wrath",
  [KnownSetIDs.CORAL_RIPTIDE]: 'Coral Riptide',
  [KnownSetIDs.CORAL_RIPTIDE_PERFECTED]: 'Perfected Coral Riptide',
  [KnownSetIDs.MORAS_WHISPERS]: "Mora's Whispers",
  [KnownSetIDs.OAKENSOUL]: 'Oakensoul Ring',
  [KnownSetIDs.GOURMAND]: 'Gourmand',
  [KnownSetIDs.ROKSA_THE_WARPED]: 'Roksa the Warped',
  [KnownSetIDs.RUNECARVERS_BLAZE]: "Runecarver's Blaze",
  [KnownSetIDs.ANSUULS_TORMENT]: "Ansuul's Torment",
  [KnownSetIDs.MACABRE_VINTAGE]: 'Macabre Vintage',
  [KnownSetIDs.HIGHLAND_SENTINEL]: 'Highland Sentinel',
  [KnownSetIDs.MORA_SCRIBE]: 'Mora Scribe',
  [KnownSetIDs.MORA_SCRIBE_PERFECTED]: 'Perfected Mora Scribe',
  [KnownSetIDs.PYREBRAND]: 'Pyrebrand',
  [KnownSetIDs.CORPSEBURSTER]: 'Corpseburster',
  [KnownSetIDs.BEACON_OF_OBLIVION]: 'Beacon of Oblivion',
  [KnownSetIDs.JERENSI]: 'Jerensi',
  [KnownSetIDs.ARKAYS_CHARITY]: "Arkay's Charity",
  [KnownSetIDs.RAKKHAT_VOIDMANTLE]: "Rakkhat's Voidmantle",
  [KnownSetIDs.KAZPIAN]: "Kazpian's",
  [KnownSetIDs.RECOVERY_CONVERGENCE]: 'Recovery Convergence',
  [KnownSetIDs.RECOVERY_CONVERGENCE_PERFECTED]: 'Perfected Recovery Convergence',
  [KnownSetIDs.KAZPIAN_PERFECTED]: "Perfected Kazpian's",
  [KnownSetIDs.STONEHULK_DOMINATION]: 'Stonehulk Domination',
  [KnownSetIDs.UNKNOWN_SET_845]: 'Unknown',
  [KnownSetIDs.ARMOR_OF_THE_VEILED_HERITANCE]: 'Armor of the Veiled Heritance',
  [KnownSetIDs.ARMOR_OF_THE_SEDUCER]: 'Armor of the Seducer',
  [KnownSetIDs.ASHEN_GRIP]: 'Ashen Grip',
  [KnownSetIDs.HATCHLINGS_SHELL]: "Hatchling's Shell",
  [KnownSetIDs.TORUGS_PACT]: "Torug's Pact",
  [KnownSetIDs.PRISMATIC_WEAPON]: 'Prismatic Weapon',
  [KnownSetIDs.KAGRENACS_HOPE]: "Kagrenac's Hope",
  [KnownSetIDs.TWIN_SISTERS]: 'Twin Sisters',
  [KnownSetIDs.ANCIENT_GRACE]: 'Ancient Grace',
  [KnownSetIDs.LORD_WARDEN]: 'Lord Warden',
  [KnownSetIDs.ETERNAL_YOKEDA]: 'Eternal Yokeda',
  [KnownSetIDs.VICIOUS_OPHIDIAN]: 'Vicious Ophidian',
  [KnownSetIDs.OVERWHELMING]: 'Overwhelming',
  [KnownSetIDs.ENDURANCE]: 'Endurance',
  [KnownSetIDs.THE_PARIAH]: 'The Pariah',
  [KnownSetIDs.MORKULDIN]: 'Morkuldin',
  [KnownSetIDs.PELINALS_WRATH]: "Pelinal's Wrath",
  [KnownSetIDs.VELIDRETH]: 'Velidreth',
  [KnownSetIDs.KRAGH]: "Kra'gh",
  [KnownSetIDs.CHOKETHORN]: 'Chokethorn',
  [KnownSetIDs.ILAMBRIS]: 'Ilambris',
  [KnownSetIDs.STORMFIST]: 'Stormfist',
  [KnownSetIDs.THE_TROLL_KING]: 'The Troll King',
  [KnownSetIDs.THE_MASTERS_BOW]: "The Master's Bow",
  [KnownSetIDs.ASSASSINS_GUILE]: "Assassin's Guile",
  [KnownSetIDs.VANGUARDS_CHALLENGE]: "Vanguard's Challenge",
  [KnownSetIDs.FLAME_BLOSSOM]: 'Flame Blossom',
  [KnownSetIDs.MAD_TINKERER]: 'Mad Tinkerer',
  [KnownSetIDs.GALENWES_PERFECTED_RESTO]: "Galenwe's Perfected",
  [KnownSetIDs.VYKOSA]: 'Vykosa',
  [KnownSetIDs.BLACKROSE_BOW]: 'Blackrose Bow',
  [KnownSetIDs.BLACKROSE_ICE_STAFF]: 'Blackrose Ice Staff',
  [KnownSetIDs.BLACKROSE_RESTO]: 'Blackrose Resto',
  [KnownSetIDs.TZOGVINS_WARBAND]: "Tzogvin's Warband",
  [KnownSetIDs.FALSE_GODS_DEVOTION]: "False God's Devotion",
  [KnownSetIDs.FALSE_GODS_PERFECTED]: "Perfected False God's",
  [KnownSetIDs.GRUNDWULF]: 'Grundwulf',
  [KnownSetIDs.GRAVE_GUARDIAN]: 'Grave Guardian',
  [KnownSetIDs.KJALNARS_NIGHTMARE]: "Kjalnar's Nightmare",
  [KnownSetIDs.YANDIRS_MIGHT]: "Yandir's Might",
  [KnownSetIDs.VATESHRAN_PERFECTED_SWORD]: 'Vateshran Perfected Sword',
  [KnownSetIDs.VATESHRAN_PERFECTED_DAGGER]: 'Vateshran Perfected Dagger',
  [KnownSetIDs.KINRAS_WRATH]: "Kinras's Wrath",
  [KnownSetIDs.PALE_ORDER]: 'Pale Order',
  [KnownSetIDs.BOG_RAIDER]: 'Bog Raider',
  [KnownSetIDs.GAZE_OF_SITHIS]: 'Gaze of Sithis',
  [KnownSetIDs.SCORIONS_FEAST]: "Scorion's Feast",
  [KnownSetIDs.THUNDER_CALLER]: 'Thunder Caller',
  [KnownSetIDs.STORM_CURSED]: 'Storm-Cursed',
  [KnownSetIDs.LADY_MALYGDA]: 'Lady Malygda',
  [KnownSetIDs.SEA_SERPENTS_COIL]: "Sea-Serpent's Coil",
  [KnownSetIDs.STORMWEAVER]: 'Stormweaver',
  [KnownSetIDs.AKATOSHS_LAW]: "Akatosh's Law",
  [KnownSetIDs.OAKFATHERS_RETRIBUTION]: "Oakfather's Retribution",
  [KnownSetIDs.THE_WEALD]: 'The Weald',
  [KnownSetIDs.XORYNS_MASTERPIECE]: "Xoryn's Masterpiece",
  [KnownSetIDs.VANDORALLEN]: 'Vandorallen',
  [KnownSetIDs.THREE_QUEENS]: 'Three Queens',
  [KnownSetIDs.DEATH_DANCER]: 'Death-Dancer',
  [KnownSetIDs.XANMEER_SPELLWEAVER]: 'Xanmeer Spellweaver',
  [KnownSetIDs.BLACK_GEM_MONSTROSITY]: 'Black Gem Monstrosity',
  [KnownSetIDs.COUP_DE_GRACE]: 'Coup De Grâce',
  [KnownSetIDs.UNKNOWN_SET_846]: 'Unknown',
};

/**
 * Get the display name for a set ID
 */
export function getSetDisplayName(setId: KnownSetIDs | undefined | null): string {
  if (setId === undefined || setId === null) return '';

  const displayName = SET_DISPLAY_NAMES[setId];

  // If set is not found, report to Sentry
  if (!displayName) {
    reportError(new Error(`Unknown set ID detected: ${setId}`), {
      setId,
      setIdType: typeof setId,
      availableSetCount: Object.keys(SET_DISPLAY_NAMES).length,
      component: 'setNameUtils',
      function: 'getSetDisplayName',
    });
    return `Unknown Set (${setId})`;
  }

  return displayName;
}

/**
 * Find a set ID by its display name (case-insensitive, handles variations)
 * Returns undefined if not found
 */
export function findSetIdByName(displayName: string | undefined | null): KnownSetIDs | undefined {
  if (!displayName) return undefined;

  const normalized = displayName.toLowerCase().trim();

  // Try exact match first
  for (const [setId, name] of Object.entries(SET_DISPLAY_NAMES)) {
    if (name.toLowerCase() === normalized) {
      return Number(setId) as KnownSetIDs;
    }
  }

  // If no exact match, try removing "Perfected" prefix and search again
  // This handles cases like "Perfected Saxhleel Champion" → "Saxhleel Champion"
  const withoutPerfected = normalized.replace(/^perfected\s+/, '');
  if (withoutPerfected !== normalized) {
    for (const [setId, name] of Object.entries(SET_DISPLAY_NAMES)) {
      if (name.toLowerCase() === withoutPerfected) {
        return Number(setId) as KnownSetIDs;
      }
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

/**
 * Get display name for a set with optional unsupported indicator.
 * If the set name matches an unsupported set, appends " (unsupported)" to the display name.
 * This is used to indicate sets with unverified API IDs that cannot be used in calculations.
 *
 * @param setName - The name of the set to check
 * @returns The display name, potentially with " (unsupported)" suffix
 */
export function getSetDisplayNameWithUnsupportedIndicator(setName: string): string {
  if (isUnsupportedSet(setName)) {
    return `${setName} (unsupported)`;
  }
  return setName;
}
