/**
 * Trial and Dungeon configurations
 * Defines the structure of trials/dungeons with boss order and trash pack counts
 */

import { TrialConfig } from '../types/loadout.types';

/**
 * All available activities in ESO (trials, dungeons, arenas, and general setups).
 * Trials are listed first (General, then alphabetically), followed by the group
 * dungeons. The selector UI groups and sorts these by type via getGroupedTrials().
 */
export const TRIALS: TrialConfig[] = [
  // Always first - General
  {
    id: 'GEN',
    name: 'General',
    type: 'general',
    bosses: [{ name: 'General Setup', trashPacksBefore: 0 }],
  },

  // Alphabetically ordered
  {
    id: 'AA',
    name: 'Aetherian Archive',
    type: 'trial',
    bosses: [
      { name: 'Storm Atronach', trashPacksBefore: 2 },
      { name: 'Foundation Stone Atronach', trashPacksBefore: 3 },
      { name: 'Varlariel', trashPacksBefore: 2 },
      { name: 'The Mage', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'AS',
    name: 'Asylum Sanctorium',
    type: 'trial',
    bosses: [
      { name: 'Saint Olms the Just', trashPacksBefore: 0 },
      { name: 'Saint Llothis the Pious', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Saint Felms the Bold', trashPacksBefore: 0 }, // Mini-boss (optional)
    ],
  },

  {
    id: 'BRP',
    name: 'Blackrose Prison',
    type: 'arena',
    bosses: [{ name: 'Arena Setup', trashPacksBefore: 0 }],
  },

  {
    id: 'CR',
    name: 'Cloudrest',
    type: 'trial',
    bosses: [
      { name: "Z'Maja", trashPacksBefore: 0 },
      { name: 'Shade of Galenwe', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Shade of Relequen', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Shade of Siroria', trashPacksBefore: 0 }, // Mini-boss (optional)
    ],
  },

  {
    id: 'DSR',
    name: 'Dreadsail Reef',
    type: 'trial',
    bosses: [
      { name: 'Lylanar and Turlassil', trashPacksBefore: 1 },
      { name: 'Reef Guardian', trashPacksBefore: 2 },
      { name: 'Tideborn Taleria', trashPacksBefore: 1 },
      { name: 'Sail Ripper', trashPacksBefore: 2 },
      { name: 'Bow Breaker', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'HOF',
    name: 'Halls of Fabrication',
    type: 'trial',
    bosses: [
      { name: 'Hunter-Killer Fabricants', trashPacksBefore: 2 },
      { name: 'Pinnacle Factotum', trashPacksBefore: 3 },
      { name: 'Archcustodian', trashPacksBefore: 2 },
      { name: 'Reactor', trashPacksBefore: 1 },
      { name: 'Assembly General', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'HRC',
    name: 'Hel Ra Citadel',
    type: 'trial',
    bosses: [
      { name: 'Ra Kotu', trashPacksBefore: 2 },
      { name: 'Raktu', trashPacksBefore: 2 },
      { name: "Yokeda Rok'dun", trashPacksBefore: 3 },
      { name: 'The Warrior', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'IA',
    name: 'Infinite Archive',
    type: 'arena',
    bosses: [{ name: 'Infinite Archive Setup', trashPacksBefore: 0 }],
  },

  {
    id: 'KA',
    name: "Kyne's Aegis",
    type: 'trial',
    bosses: [
      { name: 'Yandir the Butcher', trashPacksBefore: 1 },
      { name: 'Captain Vrol', trashPacksBefore: 2 },
      { name: 'Lord Falgravn', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'LC',
    name: 'Lucent Citadel',
    type: 'trial',
    bosses: [
      { name: 'Count Ryelaz and Zilyesset', trashPacksBefore: 1 },
      { name: 'Cavot Agnan', trashPacksBefore: 1 },
      { name: 'Orphic Shattered Shard', trashPacksBefore: 1 },
      { name: 'Arcane Knot', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'MOL',
    name: 'Maw of Lorkhaj',
    type: 'trial',
    bosses: [
      { name: "Zhaj'hassa the Forgotten", trashPacksBefore: 2 },
      { name: 'The Twins', trashPacksBefore: 3 },
      { name: 'Rakkhat', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'OO',
    name: 'Opulent Ordeal',
    type: 'trial',
    bosses: [
      { name: 'Running Phase', trashPacksBefore: 1 },
      { name: 'Opulent Trio', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'OSC',
    name: 'Ossein Cage',
    type: 'trial',
    bosses: [
      { name: 'Shapers of Flesh', trashPacksBefore: 2 },
      { name: 'Jynorah and Skorkhif', trashPacksBefore: 2 },
      { name: 'Overfiend Kazpian', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'OC',
    name: 'Overland/Other Content',
    type: 'general',
    bosses: [{ name: 'General Setup', trashPacksBefore: 0 }],
  },

  {
    id: 'PVP',
    name: 'PVP',
    type: 'general',
    bosses: [{ name: 'PVP Setup', trashPacksBefore: 0 }],
  },

  {
    id: 'RG',
    name: 'Rockgrove',
    type: 'trial',
    bosses: [
      { name: 'Oaxiltso', trashPacksBefore: 1 },
      { name: 'Flame-Herald Bahsei', trashPacksBefore: 2 },
      { name: 'Xalvakka', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SO',
    name: 'Sanctum Ophidia',
    type: 'trial',
    bosses: [
      { name: 'Possessed Mantikora', trashPacksBefore: 3 },
      { name: 'Stonebreaker', trashPacksBefore: 2 },
      { name: 'Ozara', trashPacksBefore: 1 },
      { name: 'The Serpent', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SE',
    name: "Sanity's Edge",
    type: 'trial',
    bosses: [
      { name: 'Exarchanic Yaseyla', trashPacksBefore: 1 },
      { name: 'Archwizard Twelvane', trashPacksBefore: 2 },
      { name: 'Ansuul the Tormentor', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SUB',
    name: 'Substitute Setups',
    type: 'substitute',
    bosses: [
      { name: 'Substitute Boss', trashPacksBefore: 0 },
      { name: 'Substitute Trash', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'SS',
    name: 'Sunspire',
    type: 'trial',
    bosses: [
      { name: 'Lokkestiiz', trashPacksBefore: 3 },
      { name: 'Yolnahkriin', trashPacksBefore: 2 },
      { name: 'Nahviintaas', trashPacksBefore: 1 },
    ],
  },

  // ─── Group Dungeons ──────────────────────────────────────────────
  // Main bosses listed in encounter order (final boss last). Boss names and
  // ordering verified June 2026 against UESP / ESO-Hub / dungeon guides.
  // Optional/secret side-bosses are omitted; trash counts are approximate
  // planning aids (one pack before each boss), mirroring the trial configs.
  // IDs follow common community/Wizard's Wardrobe acronyms for import parity.

  // Base-game dungeons (I/II pairs)
  {
    id: 'FG1',
    name: 'Fungal Grotto I',
    type: 'dungeon',
    bosses: [
      { name: 'War Chief Ozozai', trashPacksBefore: 1 },
      { name: "Kra'gh the Dreugh King", trashPacksBefore: 1 },
    ],
  },
  {
    id: 'FG2',
    name: 'Fungal Grotto II',
    type: 'dungeon',
    bosses: [
      { name: 'Gamyne Bandu', trashPacksBefore: 1 },
      { name: 'Spawn of Mephala', trashPacksBefore: 1 },
      { name: 'Vila Theran', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SC1',
    name: 'Spindleclutch I',
    type: 'dungeon',
    bosses: [
      { name: 'Swarm Mother', trashPacksBefore: 1 },
      { name: 'Cerise the Widow-Maker', trashPacksBefore: 1 },
      { name: 'The Whisperer', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SC2',
    name: 'Spindleclutch II',
    type: 'dungeon',
    bosses: [
      { name: 'Mad Mortine', trashPacksBefore: 1 },
      { name: 'Bloodspawn', trashPacksBefore: 1 },
      { name: 'Praxin Douare', trashPacksBefore: 1 },
      { name: 'Urvan Veleth', trashPacksBefore: 1 },
      { name: 'Vorenor Winterbourne', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BC1',
    name: 'The Banished Cells I',
    type: 'dungeon',
    bosses: [
      { name: 'Shadowrend', trashPacksBefore: 1 },
      { name: 'High Kinlord Rilis', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BC2',
    name: 'The Banished Cells II',
    type: 'dungeon',
    bosses: [
      { name: 'Keeper Areldur', trashPacksBefore: 1 },
      { name: 'Maw of the Infernal', trashPacksBefore: 1 },
      { name: 'Keeper Voranil', trashPacksBefore: 1 },
      { name: 'Keeper Imiril', trashPacksBefore: 1 },
      { name: 'High Kinlord Rilis', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'DC1',
    name: 'Darkshade Caverns I',
    type: 'dungeon',
    bosses: [
      { name: 'Foreman Llothan', trashPacksBefore: 1 },
      { name: 'The Hive Lord', trashPacksBefore: 1 },
      { name: 'Sentinel of Rkugamz', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'DC2',
    name: 'Darkshade Caverns II',
    type: 'dungeon',
    bosses: [
      { name: 'Transmuted Hive Lord', trashPacksBefore: 1 },
      { name: 'Grobull the Transmuted', trashPacksBefore: 1 },
      { name: 'The Engine Guardian', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'EH1',
    name: 'Elden Hollow I',
    type: 'dungeon',
    bosses: [
      { name: 'Akash gra-Mal', trashPacksBefore: 1 },
      { name: 'Chokethorn', trashPacksBefore: 1 },
      { name: 'Nenesh gro-Mal', trashPacksBefore: 1 },
      { name: 'Canonreeve Oraneth', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'EH2',
    name: 'Elden Hollow II',
    type: 'dungeon',
    bosses: [
      { name: 'Dark Root', trashPacksBefore: 1 },
      { name: 'Murklight', trashPacksBefore: 1 },
      { name: 'Bogdan the Nightflame', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'WS1',
    name: 'Wayrest Sewers I',
    type: 'dungeon',
    bosses: [
      { name: 'Slimecraw', trashPacksBefore: 1 },
      { name: 'Investigator Garron', trashPacksBefore: 1 },
      { name: 'Uulgarg the Hungry', trashPacksBefore: 1 },
      { name: 'Varaine Pellingare', trashPacksBefore: 1 },
      { name: 'Allene Pellingare', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'WS2',
    name: 'Wayrest Sewers II',
    type: 'dungeon',
    bosses: [
      { name: 'Malubeth the Scourger', trashPacksBefore: 1 },
      { name: 'Uulgarg the Risen', trashPacksBefore: 1 },
      { name: 'Garron the Returned', trashPacksBefore: 1 },
      { name: 'Varaine & Allene Pellingare', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'COH1',
    name: 'Crypt of Hearts I',
    type: 'dungeon',
    bosses: [
      { name: 'The Mage Master', trashPacksBefore: 1 },
      { name: 'Archmaster Siniel', trashPacksBefore: 1 },
      { name: "Death's Leviathan", trashPacksBefore: 1 },
      { name: 'Uulkar Bonehand', trashPacksBefore: 1 },
      { name: 'Dogas the Berserker', trashPacksBefore: 1 },
      { name: 'The Ilambris Twins', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'COH2',
    name: 'Crypt of Hearts II',
    type: 'dungeon',
    bosses: [
      { name: 'Ibelgast', trashPacksBefore: 1 },
      { name: 'Ruzozuzalpamaz', trashPacksBefore: 1 },
      { name: 'The Ilambris Amalgam', trashPacksBefore: 1 },
      { name: 'Mezeluth', trashPacksBefore: 1 },
      { name: "Nerien'eth", trashPacksBefore: 1 },
    ],
  },
  {
    id: 'COA1',
    name: 'City of Ash I',
    type: 'dungeon',
    bosses: [
      { name: 'Golor the Banekin Handler', trashPacksBefore: 1 },
      { name: 'Infernal Guardian', trashPacksBefore: 1 },
      { name: 'Warden of the Shrine', trashPacksBefore: 1 },
      { name: 'Dark Ember', trashPacksBefore: 1 },
      { name: 'Rothariel Flameheart', trashPacksBefore: 1 },
      { name: 'Razor Master Erthas', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'COA2',
    name: 'City of Ash II',
    type: 'dungeon',
    bosses: [
      { name: 'Urata the Legion', trashPacksBefore: 1 },
      { name: 'Horvantud the Fire Maw', trashPacksBefore: 1 },
      { name: 'Ash Titan', trashPacksBefore: 1 },
      { name: 'Xivilai Fulminator & Boltaic', trashPacksBefore: 1 },
      { name: 'Valkyn Skoria', trashPacksBefore: 1 },
    ],
  },
  // Base-game dungeons (single)
  {
    id: 'AC',
    name: 'Arx Corinium',
    type: 'dungeon',
    bosses: [
      { name: 'The Fanged Menace', trashPacksBefore: 1 },
      { name: 'Ganakton the Tempest', trashPacksBefore: 1 },
      { name: 'Sliklenia the Songstress', trashPacksBefore: 1 },
      { name: 'Matron Ixniaa', trashPacksBefore: 1 },
      { name: 'Sellistrix the Lamia Queen', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BCR',
    name: 'Blessed Crucible',
    type: 'dungeon',
    bosses: [
      { name: 'The Pack', trashPacksBefore: 1 },
      { name: 'Teranya the Faceless', trashPacksBefore: 1 },
      { name: 'The Troll King', trashPacksBefore: 1 },
      { name: 'Captain Thoran', trashPacksBefore: 1 },
      { name: 'The Lava Queen', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BH',
    name: 'Blackheart Haven',
    type: 'dungeon',
    bosses: [
      { name: 'Atarus', trashPacksBefore: 1 },
      { name: 'The Roost Mother', trashPacksBefore: 1 },
      { name: 'Captain Blackheart', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'DK',
    name: 'Direfrost Keep',
    type: 'dungeon',
    bosses: [
      { name: 'Guardian of the Flame', trashPacksBefore: 1 },
      { name: 'Iceheart', trashPacksBefore: 1 },
      { name: 'Drodda of Icereach', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SW',
    name: "Selene's Web",
    type: 'dungeon',
    bosses: [
      { name: 'Longclaw', trashPacksBefore: 1 },
      { name: 'Queen Aklayah', trashPacksBefore: 1 },
      { name: 'Mennir Many-Legs', trashPacksBefore: 1 },
      { name: 'Selene', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'TI',
    name: 'Tempest Island',
    type: 'dungeon',
    bosses: [
      { name: 'Valaran Stormcaller', trashPacksBefore: 1 },
      { name: 'Stormfist', trashPacksBefore: 1 },
      { name: 'Commodore Ohmanil', trashPacksBefore: 1 },
      { name: 'Stormreeve Neidir', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'VF',
    name: 'Volenfell',
    type: 'dungeon',
    bosses: [
      { name: 'Quintus Verres', trashPacksBefore: 1 },
      { name: 'Boilbite', trashPacksBefore: 1 },
      { name: 'Tremorscale', trashPacksBefore: 1 },
      { name: 'The Guardian Council', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'VOM',
    name: 'Vaults of Madness',
    type: 'dungeon',
    bosses: [
      { name: 'Ulguna Soul-Reaver', trashPacksBefore: 1 },
      { name: 'Grothdarr', trashPacksBefore: 1 },
      { name: 'Iskra the Omen', trashPacksBefore: 1 },
      { name: 'The Mad Architect', trashPacksBefore: 1 },
    ],
  },
  // DLC dungeons
  {
    id: 'ICP',
    name: 'Imperial City Prison',
    type: 'dungeon',
    bosses: [
      { name: 'Ibomez the Flesh Sculptor', trashPacksBefore: 1 },
      { name: 'Flesh Abomination', trashPacksBefore: 1 },
      { name: 'Lord Warden Dusk', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'WGT',
    name: 'White-Gold Tower',
    type: 'dungeon',
    bosses: [
      { name: 'The Adjudicator', trashPacksBefore: 1 },
      { name: 'The Planar Inhibitor', trashPacksBefore: 1 },
      { name: 'Molag Kena', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'ROM',
    name: 'Ruins of Mazzatun',
    type: 'dungeon',
    bosses: [
      { name: 'Mighty Chudan', trashPacksBefore: 1 },
      { name: 'Xal-Nur the Slaver', trashPacksBefore: 1 },
      { name: 'Tree-Minder Na-Kesh', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'COS',
    name: 'Cradle of Shadows',
    type: 'dungeon',
    bosses: [
      { name: 'Khephidaen', trashPacksBefore: 1 },
      { name: 'Dranos Velador', trashPacksBefore: 1 },
      { name: 'Velidreth', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BRF',
    name: 'Bloodroot Forge',
    type: 'dungeon',
    bosses: [
      { name: 'Caillaoife', trashPacksBefore: 1 },
      { name: 'Galchobhar', trashPacksBefore: 1 },
      { name: 'Earthgore Amalgam', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'FH',
    name: 'Falkreath Hold',
    type: 'dungeon',
    bosses: [
      { name: 'Siege Mammoth', trashPacksBefore: 1 },
      { name: 'Cernunnon', trashPacksBefore: 1 },
      { name: 'Domihaus the Bloody-Horned', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'FL',
    name: 'Fang Lair',
    type: 'dungeon',
    bosses: [
      { name: 'Lizabet Charnis', trashPacksBefore: 1 },
      { name: 'Cadaverous Menagerie', trashPacksBefore: 1 },
      { name: 'Caluurion', trashPacksBefore: 1 },
      { name: 'Ulfnor & Orryn the Black', trashPacksBefore: 1 },
      { name: 'Thurvokun', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SCP',
    name: 'Scalecaller Peak',
    type: 'dungeon',
    bosses: [
      { name: 'Orzun the Foul-Smelling & Rinaerus the Rancid', trashPacksBefore: 1 },
      { name: 'Doylemish Ironheart', trashPacksBefore: 1 },
      { name: 'Matriarch Aldis', trashPacksBefore: 1 },
      { name: 'Plague Concocter Mortieu', trashPacksBefore: 1 },
      { name: 'Zaan the Scalecaller', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'MHK',
    name: 'Moon Hunter Keep',
    type: 'dungeon',
    bosses: [
      { name: 'Jailer Melitus', trashPacksBefore: 1 },
      { name: 'Hedge Maze Guardian', trashPacksBefore: 1 },
      { name: 'Mylenne Moon-Caller', trashPacksBefore: 1 },
      { name: 'Archivist Ernade', trashPacksBefore: 1 },
      { name: 'Vykosa the Ascendant', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'MOS',
    name: 'March of Sacrifices',
    type: 'dungeon',
    bosses: [
      { name: 'The Wyresses', trashPacksBefore: 1 },
      { name: 'Aghaedh of the Solstice', trashPacksBefore: 1 },
      { name: 'Dagrund the Bulky', trashPacksBefore: 1 },
      { name: 'Tarcyr', trashPacksBefore: 1 },
      { name: 'Balorgh', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'FV',
    name: 'Frostvault',
    type: 'dungeon',
    bosses: [
      { name: 'Warlord Tzogvin', trashPacksBefore: 1 },
      { name: 'Vault Protector', trashPacksBefore: 1 },
      { name: 'Rizzuk Bonechill', trashPacksBefore: 1 },
      { name: 'The Stonekeeper', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'DOM',
    name: 'Depths of Malatar',
    type: 'dungeon',
    bosses: [
      { name: 'The Scavenging Maw', trashPacksBefore: 1 },
      { name: 'The Weeping Woman', trashPacksBefore: 1 },
      { name: 'The Dark Orb', trashPacksBefore: 1 },
      { name: 'King Narilmor', trashPacksBefore: 1 },
      { name: 'Symphony of Blades', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'MGF',
    name: 'Moongrave Fane',
    type: 'dungeon',
    bosses: [
      { name: "Dro'zakar", trashPacksBefore: 1 },
      { name: 'Kujo Kethba', trashPacksBefore: 1 },
      { name: 'Nisaazda', trashPacksBefore: 1 },
      { name: 'Grundwulf', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'LOM',
    name: 'Lair of Maarselok',
    type: 'dungeon',
    bosses: [
      { name: 'Selene', trashPacksBefore: 1 },
      { name: 'Azureblight Cancroid', trashPacksBefore: 1 },
      { name: 'Maarselok', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'IR',
    name: 'Icereach',
    type: 'dungeon',
    bosses: [
      { name: 'Kjarg the Tuskscraper', trashPacksBefore: 1 },
      { name: 'Sister Skelga', trashPacksBefore: 1 },
      { name: 'Vearogh the Shambler', trashPacksBefore: 1 },
      { name: 'Stormborn Revenant', trashPacksBefore: 1 },
      { name: 'Icereach Coven', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'UG',
    name: 'Unhallowed Grave',
    type: 'dungeon',
    bosses: [
      { name: 'Hakgrym the Howler', trashPacksBefore: 1 },
      { name: 'Keeper of the Kiln', trashPacksBefore: 1 },
      { name: 'Ondagore the Mad', trashPacksBefore: 1 },
      { name: 'Kjalnar Tombskald', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'CT',
    name: 'Castle Thorn',
    type: 'dungeon',
    bosses: [
      { name: 'Dread Tindulra', trashPacksBefore: 1 },
      { name: 'Blood Twilight', trashPacksBefore: 1 },
      { name: 'Vaduroth', trashPacksBefore: 1 },
      { name: 'Talfyg', trashPacksBefore: 1 },
      { name: 'Lady Thorn', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SG',
    name: 'Stone Garden',
    type: 'dungeon',
    bosses: [
      { name: 'Exarch Kraglen', trashPacksBefore: 1 },
      { name: 'Stone Behemoth', trashPacksBefore: 1 },
      { name: 'Arkasis the Mad Alchemist', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BDV',
    name: 'Black Drake Villa',
    type: 'dungeon',
    bosses: [
      { name: 'Kinras Ironeye', trashPacksBefore: 1 },
      { name: 'Captain Geminus', trashPacksBefore: 1 },
      { name: 'Pyroturge Encratis', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'TC',
    name: 'The Cauldron',
    type: 'dungeon',
    bosses: [
      { name: 'Oxblood the Depraved', trashPacksBefore: 1 },
      { name: 'Taskmaster Viccia', trashPacksBefore: 1 },
      { name: 'Baron Zaudrus', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'RPB',
    name: 'Red Petal Bastion',
    type: 'dungeon',
    bosses: [
      { name: 'Rogerain the Sly', trashPacksBefore: 1 },
      { name: 'Eliam Merric', trashPacksBefore: 1 },
      { name: 'Prior Thierric Sarazen', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'DRC',
    name: 'The Dread Cellar',
    type: 'dungeon',
    bosses: [
      { name: 'Scorion Broodlord', trashPacksBefore: 1 },
      { name: 'Cyronin Artellian', trashPacksBefore: 1 },
      { name: 'Magma Incarnate', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'CA',
    name: 'Coral Aerie',
    type: 'dungeon',
    bosses: [
      { name: 'Maligalig', trashPacksBefore: 1 },
      { name: 'Sarydil', trashPacksBefore: 1 },
      { name: 'Varallion', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SR',
    name: "Shipwright's Regret",
    type: 'dungeon',
    bosses: [
      { name: 'Foreman Bradiggan', trashPacksBefore: 1 },
      { name: 'Nazaray', trashPacksBefore: 1 },
      { name: 'Captain Numirril', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'ERE',
    name: 'Earthen Root Enclave',
    type: 'dungeon',
    bosses: [
      { name: 'Corruption of Stone', trashPacksBefore: 1 },
      { name: 'Corruption of Root', trashPacksBefore: 1 },
      { name: 'Archdruid Devyric', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'GD',
    name: 'Graven Deep',
    type: 'dungeon',
    bosses: [
      { name: 'Euphotic Gatekeeper', trashPacksBefore: 1 },
      { name: 'Varzunon', trashPacksBefore: 1 },
      { name: 'Zelvraak the Unbreathing', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BS',
    name: 'Bal Sunnar',
    type: 'dungeon',
    bosses: [
      { name: 'Kovan Giryon', trashPacksBefore: 1 },
      { name: 'Roksa the Warped', trashPacksBefore: 1 },
      { name: 'Matriarch Lladi Telvanni', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'SH',
    name: "Scrivener's Hall",
    type: 'dungeon',
    bosses: [
      { name: 'Ritemaster Naqri', trashPacksBefore: 1 },
      { name: 'Ozezan the Inferno', trashPacksBefore: 1 },
      { name: 'Valinna', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'OP',
    name: 'Oathsworn Pit',
    type: 'dungeon',
    bosses: [
      { name: 'Packmaster Rethelros', trashPacksBefore: 1 },
      { name: 'Anthelmir', trashPacksBefore: 1 },
      { name: 'Aradros the Awakened', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BV',
    name: 'Bedlam Veil',
    type: 'dungeon',
    bosses: [
      { name: 'Shattered Champion', trashPacksBefore: 1 },
      { name: 'Darkshard', trashPacksBefore: 1 },
      { name: 'The Blind', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'ER',
    name: 'Exiled Redoubt',
    type: 'dungeon',
    bosses: [
      { name: 'Executioner Jerensi', trashPacksBefore: 1 },
      { name: 'Prime Sorcerer Vandorallen', trashPacksBefore: 1 },
      { name: 'Squall of Retribution', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'LS',
    name: 'Lep Seclusa',
    type: 'dungeon',
    bosses: [
      { name: 'Garvin the Tracker', trashPacksBefore: 1 },
      { name: 'Noriwen', trashPacksBefore: 1 },
      { name: 'Orpheon the Tactician', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'BGF',
    name: 'Black Gem Foundry',
    type: 'dungeon',
    bosses: [
      { name: 'Quarrymaster Saldezaar', trashPacksBefore: 1 },
      { name: 'Black Gem Monstrosity', trashPacksBefore: 1 },
      { name: 'High Soulbinder Vykand', trashPacksBefore: 1 },
    ],
  },
  {
    id: 'NC',
    name: 'Naj-Caldeesh',
    type: 'dungeon',
    bosses: [
      { name: 'Poxito', trashPacksBefore: 1 },
      { name: 'Voskrona Stonehulk', trashPacksBefore: 1 },
      { name: 'Talen-Lah & Bar-Sakka', trashPacksBefore: 1 },
    ],
  },
];

/**
 * Helper function to get trial by ID
 */
export function getTrialById(id: string): TrialConfig | undefined {
  return TRIALS.find((trial) => trial.id === id);
}

/** Human-readable label for an activity type, used in the selector UI. */
export function getActivityKindLabel(type: TrialConfig['type']): string {
  switch (type) {
    case 'trial':
      return 'Trial';
    case 'dungeon':
      return 'Dungeon';
    case 'arena':
      return 'Arena';
    case 'substitute':
      return 'Substitute';
    case 'general':
    default:
      return 'General';
  }
}

/** Display order and section headings for activity groups in the selector. */
const ACTIVITY_GROUPS: { type: TrialConfig['type']; label: string }[] = [
  { type: 'general', label: 'General' },
  { type: 'trial', label: 'Trials' },
  { type: 'dungeon', label: 'Dungeons' },
  { type: 'arena', label: 'Arenas' },
  { type: 'substitute', label: 'Substitutes' },
];

export interface TrialGroup {
  type: TrialConfig['type'];
  label: string;
  trials: TrialConfig[];
}

/**
 * Group the activities by type for sectioned rendering in the selector.
 * Groups are returned in {@link ACTIVITY_GROUPS} order; empty groups are omitted.
 * Within trials and dungeons, entries are sorted alphabetically by name.
 */
export function getGroupedTrials(): TrialGroup[] {
  return ACTIVITY_GROUPS.map(({ type, label }) => {
    const trials = TRIALS.filter((trial) => trial.type === type);
    if (type === 'trial' || type === 'dungeon') {
      trials.sort((a, b) => a.name.localeCompare(b.name));
    }
    return { type, label, trials };
  }).filter((group) => group.trials.length > 0);
}

/**
 * Helper function to get all boss names for a trial
 */
export function getBossNamesForTrial(trialId: string): string[] {
  const trial = getTrialById(trialId);
  return trial ? trial.bosses.map((boss) => boss.name) : [];
}

/**
 * Helper function to calculate total number of setups needed for a trial
 * @param trialId - Trial identifier
 * @param includeTrash - Whether to include trash pack setups
 */
export function getTotalSetupCount(trialId: string, includeTrash: boolean): number {
  const trial = getTrialById(trialId);
  if (!trial) return 0;

  const bossCount = trial.bosses.length;

  if (!includeTrash) {
    return bossCount;
  }

  const trashCount = trial.bosses.reduce((sum, boss) => sum + boss.trashPacksBefore, 0);
  return bossCount + trashCount;
}

/**
 * Generate setup structure for a trial
 * @param trialId - Trial identifier
 * @param includeTrash - Whether to include trash pack setups
 */
export function generateSetupStructure(
  trialId: string,
  includeTrash: boolean,
): Array<{ type: 'trash' | 'boss'; name: string; trashIndex?: number }> {
  const trial = getTrialById(trialId);
  if (!trial) return [];

  const structure: Array<{ type: 'trash' | 'boss'; name: string; trashIndex?: number }> = [];

  trial.bosses.forEach((boss) => {
    // Add trash packs before this boss
    if (includeTrash && boss.trashPacksBefore > 0) {
      for (let i = 1; i <= boss.trashPacksBefore; i++) {
        structure.push({
          type: 'trash',
          name: `Trash Pack ${structure.filter((s) => s.type === 'trash').length + 1}`,
          trashIndex: i,
        });
      }
    }

    // Add the boss
    structure.push({
      type: 'boss',
      name: boss.name,
    });
  });

  return structure;
}
