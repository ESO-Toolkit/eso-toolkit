<<<<<<< HEAD
=======
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
>>>>>>> pr-21
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Box,
  Typography,
<<<<<<< HEAD
  Grid,
=======
>>>>>>> pr-21
  Card,
  CardContent,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
<<<<<<< HEAD
import type { Theme } from '@mui/material/styles';
import { keyframes, SxProps } from '@mui/system';
import React from 'react';

import dkIcon from '../../../assets/dk-white.png';
=======
import { keyframes } from '@mui/system';
import React from 'react';

import dkIcon from '../../../assets/dk-white.png';
import mundusIcon from '../../../assets/MundusStone.png';
>>>>>>> pr-21
import necromancerIcon from '../../../assets/necromancer-white.png';
import nightbladeIcon from '../../../assets/nightblade-white.png';
import sorcererIcon from '../../../assets/sorcerer.png';
import templarIcon from '../../../assets/templar-white.png';
import wardenIcon from '../../../assets/warden-white.png';
import arcanistIcon from '../../../assets/white-arcanist.png';
<<<<<<< HEAD
import { PlayerDetailsEntry, PlayerGear } from '../../../types/playerDetails';
=======
import SkillTooltip from '../../../components/SkillTooltip';
import { ReportActorFragment } from '../../../graphql/generated';
import { PlayerInfo } from '../../../store/events_data/actions';
import { PlayerGear } from '../../../types/playerDetails';
>>>>>>> pr-21
import { detectBuildIssues } from '../../../utils/detectBuildIssues';
import { resolveActorName } from '../../../utils/resolveActorName';
import { buildTooltipPropsFromClassAndName } from '../../../utils/skillTooltipMapper';

// Helpers for gear classification and chip coloring
const normalizeName = (name?: string) =>
  (name || '')
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/’/g, "'")
    .trim();

const ARENA_SET_NAMES = new Set(
  [
    // Maelstrom Arena
    'Crushing Wall',
    'Precise Regeneration',
    'Thunderous Volley',
    'Merciless Charge',
    'Cruel Flurry',
    'Rampaging Slash',
    // Dragonstar Arena (Master)
    'Destructive Impact',
    'Grand Rejuvenation',
    'Caustic Bow',
    'Titanic Cleave',
    'Stinging Slashes',
    'Puncturing Remedy',
    // Blackrose Prison
    'Wild Impulse',
    "Mender's Ward",
    'Mender’s Ward',
    'Virulent Shot',
    'Radial Uppercut',
    'Spectral Cloak',
    'Gallant Charge',
    // Asylum Sanctorium
    'Concentrated Force',
    'Timeless Blessing',
    'Piercing Spray',
    'Disciplined Slash',
    'Chaotic Whirlwind',
    'Defensive Position',
    // Vateshran Hollows
    'Wrath of Elements',
    'Frenzied Momentum',
    'Void Bash',
    "Executioner's Blade",
    'Point-Blank Snipe',
    'Force Overflow',
  ].map((n) => normalizeName(n))
);

const MYTHIC_SET_NAMES = new Set(
  [
    "Bloodlord's Embrace",
    'Thrassian Stranglers',
    'Snow Treaders',
    'Ring of the Wild Hunt',
    "Malacath's Band of Brutality",
    'Torc of Tonal Constancy',
    'Ring of the Pale Order',
    'Pearls of Ehlnofey',
    'Gaze of Sithis',
    "Harpooner's Wading Kilt",
    "Death Dealer's Fete",
    "Shapeshifter's Chain",
    'Markyn Ring of Majesty',
    "Belharza's Band",
    'Spaulder of Ruin',
    "Lefthander's Aegis Belt",
    "Mora's Whispers",
    'Oakensoul Ring',
    "Sea-Serpent's Coil",
    'Dov-Rha Sabatons',
    "Faun's Lark Cladding",
    "Stormweaver's Cavort",
    "Syrabane's Ward",
    "Velothi Ur-Mage's Amulet",
    'Esoteric Environment Greaves',
    'Cryptcanon Vestments',
    'Torc of the Last Ayleid King',
    'Rourken Steamguards',
    "The Shadow Queen's Cowl",
    'The Saint and the Seducer',
  ].map((n) => normalizeName(n))
);

// One-piece monster sets (purple); normalized substrings
const MONSTER_ONE_PIECE_HINTS = [
  'Anthelmir’s Construct',
  'Archdruid Devyric',
  'Balorgh',
  'Baron Thirsk',
  'Bloodspawn',
  'Chokethorn',
  'Domihaus',
  'Earthgore',
  'Engine Guardian',
  'Euphotic Gatekeeper',
  'Galenwe’s Lament',
  'Glorgoloch the Destroyer',
  'Grundwulf',
  'Iceheart',
  'Ilambris',
  'Kjalnar’s Nightmare',
  'Lady Thorn',
  'Lady Malydga',
  'Lord Warden',
  'Maarselok',
  'Magma Incarnate',
  'Maw of the Infernal',
  'Mighty Chudan',
  'Molag Kena',
  'Mother Ciannait',
  'Nazaray',
  'Nerien’eth',
  'Nightflame',
  'Nobilis Eternus',
  'Ozezan the Inferno',
  'Pirate Skeleton',
  'Prior Thierric',
  'Roksa the Warped',
  'Saint Delyn',
  'Scourge Harvester',
  'Selene',
  'Sellistrix',
  'Sentinel of Rkugamz',
  'Shadowrend',
  'Slimecraw',
  'Spawn of Mephala',
  'Stonekeeper',
  'Stormfist',
  'Swarm Mother',
  'Thurvokun',
  'Tremorscale',
  'Troll King',
  'Valkyn Skoria',
  'Velidreth',
  'Vykosa',
  'Zaan',
  'Symphony of Blades',
].map((n) => normalizeName(n));

// Glossy Chip styling (glassmorphism + shine) and color variants
const legendaryGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 8px 32px 0 rgba(255, 0, 150, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 8px 32px 0 rgba(0, 150, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
`;

const glossyBaseSx = {
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  borderRadius: 28,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow:
    '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
  '& .MuiChip-label': {
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    fontWeight: 500,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '50%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
    transform: 'skewX(-25deg)',
    transition: 'left 0.5s ease',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
    borderRadius: '28px 28px 100px 100px / 28px 28px 50px 50px',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
  },
  '&:hover::before': {
    left: '100%',
  },
};

const buildVariantSx = (variant: string) => {
  const v: Record<string, any> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
      borderColor: 'rgba(76, 217, 100, 0.3)',
      color: '#5ce572',
      '& .MuiChip-label': { color: '#5ce572' },
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 50%, rgba(0, 122, 255, 0.08) 100%)',
      borderColor: 'rgba(0, 122, 255, 0.3)',
      color: '#4da3ff',
      '& .MuiChip-label': { color: '#4da3ff' },
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)',
      borderColor: 'rgba(94, 234, 255, 0.35)',
      color: '#7ee8ff',
      '& .MuiChip-label': { color: '#7ee8ff' },
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(175, 82, 222, 0.25) 0%, rgba(175, 82, 222, 0.15) 50%, rgba(175, 82, 222, 0.08) 100%)',
      borderColor: 'rgba(175, 82, 222, 0.3)',
      color: '#c57fff',
      '& .MuiChip-label': { color: '#c57fff' },
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(88, 86, 214, 0.25) 0%, rgba(88, 86, 214, 0.15) 50%, rgba(88, 86, 214, 0.08) 100%)',
      borderColor: 'rgba(88, 86, 214, 0.3)',
      color: '#8583ff',
      '& .MuiChip-label': { color: '#8583ff' },
    },
    yellow: {
      background:
        'linear-gradient(135deg, rgba(255, 235, 59, 0.25) 0%, rgba(255, 235, 59, 0.15) 50%, rgba(255, 235, 59, 0.08) 100%)',
      borderColor: 'rgba(255, 235, 59, 0.35)',
      color: '#fff176',
      '& .MuiChip-label': { color: '#fff176' },
    },
    gold: {
      background:
        'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
      borderColor: 'rgba(255, 193, 7, 0.35)',
      color: '#ffd54f',
      '& .MuiChip-label': { color: '#ffd54f' },
    },
    orange: {
      background:
        'linear-gradient(135deg, rgba(255, 149, 0, 0.25) 0%, rgba(255, 149, 0, 0.15) 50%, rgba(255, 149, 0, 0.08) 100%)',
      borderColor: 'rgba(255, 149, 0, 0.3)',
      color: '#ffb74d',
      '& .MuiChip-label': { color: '#ffb74d' },
    },
    red: {
      background:
        'linear-gradient(135deg, rgba(255, 82, 82, 0.25) 0%, rgba(255, 82, 82, 0.15) 50%, rgba(255, 82, 82, 0.08) 100%)',
      borderColor: 'rgba(255, 82, 82, 0.3)',
      color: '#ff6b6b',
      '& .MuiChip-label': { color: '#ff6b6b' },
    },
    pink: {
      background:
        'linear-gradient(135deg, rgba(255, 107, 178, 0.25) 0%, rgba(255, 107, 178, 0.15) 50%, rgba(255, 107, 178, 0.08) 100%)',
      borderColor: 'rgba(255, 107, 178, 0.35)',
      color: '#ff8fc7',
      '& .MuiChip-label': { color: '#ff8fc7' },
    },
    teal: {
      background:
        'linear-gradient(135deg, rgba(0, 200, 190, 0.25) 0%, rgba(0, 200, 190, 0.15) 50%, rgba(0, 200, 190, 0.08) 100%)',
      borderColor: 'rgba(0, 200, 190, 0.35)',
      color: '#4dd0c7',
      '& .MuiChip-label': { color: '#4dd0c7' },
    },
    lime: {
      background:
        'linear-gradient(135deg, rgba(205, 220, 57, 0.25) 0%, rgba(205, 220, 57, 0.15) 50%, rgba(205, 220, 57, 0.08) 100%)',
      borderColor: 'rgba(205, 220, 57, 0.35)',
      color: '#d4e157',
      '& .MuiChip-label': { color: '#d4e157' },
    },
    silver: {
      background:
        'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)',
      borderColor: 'rgba(236, 240, 241, 0.35)',
      color: '#ecf0f1',
      '& .MuiChip-label': { color: '#ecf0f1' },
    },
    legendary: {
      background:
        'linear-gradient(135deg, rgba(255,0,150,0.2) 0%, rgba(255,150,0,0.2) 20%, rgba(255,255,0,0.2) 40%, rgba(0,255,0,0.2) 60%, rgba(0,150,255,0.2) 80%, rgba(150,0,255,0.2) 100%)',
      borderImage:
        'linear-gradient(135deg, #ff0096, #ff9600, #ffff00, #00ff00, #0096ff, #9600ff) 1',
      border: '1px solid transparent',
      color: '#ffffff',
      '& .MuiChip-label': { color: '#ffffff' },
      animation: `${legendaryGlow} 3s ease-in-out infinite`,
    },
  };
  return { ...glossyBaseSx, ...(v[variant] || v.silver) };
};

const getGearChipProps = (setName: string, count: number): Partial<ChipProps> => {
  const n = normalizeName(setName);
  // Mythics first (explicit list)
  if (MYTHIC_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('gold'),
    };
  }
  // Arena weapons
  if (ARENA_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('blue'),
    };
  }
  // Special case: 4-piece Highland Sentinel uses a specific font color
  if (count === 4 && n === normalizeName('Highland Sentinel')) {
    return {
      sx: buildVariantSx('lime'),
    };
  }
  // 5-piece sets
  if (count >= 5) {
    return {
      sx: buildVariantSx('green'),
    };
  }
  // Two-piece monsters
  if (count === 2 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: buildVariantSx('purple'),
    };
  }
  // One-piece monsters
  if (count === 1 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: buildVariantSx('lightBlue'),
    };
  }
  // Default neutral
  return { sx: buildVariantSx('silver') };
};

// Detect common ESO food/drink buffs by aura name
const FOOD_REGEXPS: RegExp[] = [
  /Artaeum\s+Takeaway\s+Broth/i,
  /Clockwork\s+Citrus\s+Filet/i,
  /Bewitched\s+Sugar\s+Skulls/i,
  /Witchmother.?s\s+Potent\s+Brew/i,
  /Ghastly\s+Eye\s+Bowl/i,
  /Lava\s+Foot\s+Soup.*Saltrice/i,
  /Dubious\s+Camoran\s+Throne/i,
  /Crown\s+Fortifying\s+Meal/i,
  /Crown\s+Vigorous\s+Tincture/i,
  /Orzorga/i,
];

function detectFoodFromAuras(
  auras?: Array<{ name: string; id: number; stacks?: number }>
): { name: string; id: number } | undefined {
  if (!auras || auras.length === 0) return undefined;
  for (const a of auras) {
    const n = a?.name || '';
    if (FOOD_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }
  return undefined;
}

function abbreviateFood(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, '')
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name;
  const acronym = words.map((w) => w[0]!.toUpperCase()).join('');
  return acronym.length >= 2 && acronym.length <= 4
    ? acronym
    : words
        .slice(0, 3)
        .map((w) => w[0]!.toUpperCase())
        .join('');
}

<<<<<<< HEAD
// Helpers for gear classification and chip coloring
const normalizeName = (name?: string): string =>
  (name || '')
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/’/g, "'")
    .trim();

const ARENA_SET_NAMES = new Set(
  [
    // Maelstrom Arena
    'Crushing Wall',
    'Precise Regeneration',
    'Thunderous Volley',
    'Merciless Charge',
    'Cruel Flurry',
    'Rampaging Slash',
    // Dragonstar Arena (Master)
    'Destructive Impact',
    'Grand Rejuvenation',
    'Caustic Bow',
    'Titanic Cleave',
    'Stinging Slashes',
    'Puncturing Remedy',
    // Blackrose Prison
    'Wild Impulse',
    "Mender's Ward",
    'Mender’s Ward',
    'Virulent Shot',
    'Radial Uppercut',
    'Spectral Cloak',
    'Gallant Charge',
    // Asylum Sanctorium
    'Concentrated Force',
    'Timeless Blessing',
    'Piercing Spray',
    'Disciplined Slash',
    'Chaotic Whirlwind',
    'Defensive Position',
    // Vateshran Hollows
    'Wrath of Elements',
    'Frenzied Momentum',
    'Void Bash',
    "Executioner's Blade",
    'Point-Blank Snipe',
    'Force Overflow',
  ].map((n) => normalizeName(n))
);

const MYTHIC_SET_NAMES = new Set(
  [
    "Bloodlord's Embrace",
    'Thrassian Stranglers',
    'Snow Treaders',
    'Ring of the Wild Hunt',
    "Malacath's Band of Brutality",
    'Torc of Tonal Constancy',
    'Ring of the Pale Order',
    'Pearls of Ehlnofey',
    'Gaze of Sithis',
    "Harpooner's Wading Kilt",
    "Death Dealer's Fete",
    "Shapeshifter's Chain",
    'Markyn Ring of Majesty',
    "Belharza's Band",
    'Spaulder of Ruin',
    "Lefthander's Aegis Belt",
    "Mora's Whispers",
    'Oakensoul Ring',
    "Sea-Serpent's Coil",
    'Dov-Rha Sabatons',
    "Faun's Lark Cladding",
    "Stormweaver's Cavort",
    "Syrabane's Ward",
    "Velothi Ur-Mage's Amulet",
    'Esoteric Environment Greaves',
    'Cryptcanon Vestments',
    'Torc of the Last Ayleid King',
    'Rourken Steamguards',
    "The Shadow Queen's Cowl",
    'The Saint and the Seducer',
  ].map((n) => normalizeName(n))
);

// One-piece monster sets (purple); normalized substrings
const MONSTER_ONE_PIECE_HINTS = [
  'Anthelmir’s Construct',
  'Archdruid Devyric',
  'Balorgh',
  'Baron Thirsk',
  'Bloodspawn',
  'Chokethorn',
  'Domihaus',
  'Earthgore',
  'Engine Guardian',
  'Euphotic Gatekeeper',
  'Galenwe’s Lament',
  'Glorgoloch the Destroyer',
  'Grundwulf',
  'Iceheart',
  'Ilambris',
  'Kjalnar’s Nightmare',
  'Lady Thorn',
  'Lady Malydga',
  'Lord Warden',
  'Maarselok',
  'Magma Incarnate',
  'Maw of the Infernal',
  'Mighty Chudan',
  'Molag Kena',
  'Mother Ciannait',
  'Nazaray',
  'Nerien’eth',
  'Nightflame',
  'Nobilis Eternus',
  'Ozezan the Inferno',
  'Pirate Skeleton',
  'Prior Thierric',
  'Roksa the Warped',
  'Saint Delyn',
  'Scourge Harvester',
  'Selene',
  'Sellistrix',
  'Sentinel of Rkugamz',
  'Shadowrend',
  'Slimecraw',
  'Spawn of Mephala',
  'Stonekeeper',
  'Stormfist',
  'Swarm Mother',
  'Thurvokun',
  'Tremorscale',
  'Troll King',
  'Valkyn Skoria',
  'Velidreth',
  'Vykosa',
  'Zaan',
  'Symphony of Blades',
].map((n) => normalizeName(n));

// Glossy Chip styling (glassmorphism + shine) and color variants
const legendaryGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 8px 32px 0 rgba(255, 0, 150, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 8px 32px 0 rgba(0, 150, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
`;

const glossyBaseSx = {
  position: 'relative',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  borderRadius: 28,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow:
    '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
  '& .MuiChip-label': {
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    fontWeight: 500,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '50%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
    transform: 'skewX(-25deg)',
    transition: 'left 0.5s ease',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
    borderRadius: '28px 28px 100px 100px / 28px 28px 50px 50px',
    pointerEvents: 'none',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      '0 12px 40px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)',
  },
  '&:hover::before': {
    left: '100%',
  },
};

const buildVariantSx = (variant: string): SxProps<Theme> => {
  const v: Record<string, SxProps<Theme>> = {
    green: {
      background:
        'linear-gradient(135deg, rgba(76, 217, 100, 0.25) 0%, rgba(76, 217, 100, 0.15) 50%, rgba(76, 217, 100, 0.08) 100%)',
      borderColor: 'rgba(76, 217, 100, 0.3)',
      color: '#5ce572',
      '& .MuiChip-label': { color: '#5ce572' },
    },
    blue: {
      background:
        'linear-gradient(135deg, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.15) 50%, rgba(0, 122, 255, 0.08) 100%)',
      borderColor: 'rgba(0, 122, 255, 0.3)',
      color: '#4da3ff',
      '& .MuiChip-label': { color: '#4da3ff' },
    },
    lightBlue: {
      background:
        'linear-gradient(135deg, rgba(94, 234, 255, 0.25) 0%, rgba(94, 234, 255, 0.15) 50%, rgba(94, 234, 255, 0.08) 100%)',
      borderColor: 'rgba(94, 234, 255, 0.35)',
      color: '#7ee8ff',
      '& .MuiChip-label': { color: '#7ee8ff' },
    },
    purple: {
      background:
        'linear-gradient(135deg, rgba(175, 82, 222, 0.25) 0%, rgba(175, 82, 222, 0.15) 50%, rgba(175, 82, 222, 0.08) 100%)',
      borderColor: 'rgba(175, 82, 222, 0.3)',
      color: '#c57fff',
      '& .MuiChip-label': { color: '#c57fff' },
    },
    indigo: {
      background:
        'linear-gradient(135deg, rgba(88, 86, 214, 0.25) 0%, rgba(88, 86, 214, 0.15) 50%, rgba(88, 86, 214, 0.08) 100%)',
      borderColor: 'rgba(88, 86, 214, 0.3)',
      color: '#8583ff',
      '& .MuiChip-label': { color: '#8583ff' },
    },
    yellow: {
      background:
        'linear-gradient(135deg, rgba(255, 235, 59, 0.25) 0%, rgba(255, 235, 59, 0.15) 50%, rgba(255, 235, 59, 0.08) 100%)',
      borderColor: 'rgba(255, 235, 59, 0.35)',
      color: '#fff176',
      '& .MuiChip-label': { color: '#fff176' },
    },
    gold: {
      background:
        'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 193, 7, 0.15) 50%, rgba(255, 193, 7, 0.08) 100%)',
      borderColor: 'rgba(255, 193, 7, 0.35)',
      color: '#ffd54f',
      '& .MuiChip-label': { color: '#ffd54f' },
    },
    orange: {
      background:
        'linear-gradient(135deg, rgba(255, 149, 0, 0.25) 0%, rgba(255, 149, 0, 0.15) 50%, rgba(255, 149, 0, 0.08) 100%)',
      borderColor: 'rgba(255, 149, 0, 0.3)',
      color: '#ffb74d',
      '& .MuiChip-label': { color: '#ffb74d' },
    },
    red: {
      background:
        'linear-gradient(135deg, rgba(255, 82, 82, 0.25) 0%, rgba(255, 82, 82, 0.15) 50%, rgba(255, 82, 82, 0.08) 100%)',
      borderColor: 'rgba(255, 82, 82, 0.3)',
      color: '#ff6b6b',
      '& .MuiChip-label': { color: '#ff6b6b' },
    },
    pink: {
      background:
        'linear-gradient(135deg, rgba(255, 107, 178, 0.25) 0%, rgba(255, 107, 178, 0.15) 50%, rgba(255, 107, 178, 0.08) 100%)',
      borderColor: 'rgba(255, 107, 178, 0.35)',
      color: '#ff8fc7',
      '& .MuiChip-label': { color: '#ff8fc7' },
    },
    teal: {
      background:
        'linear-gradient(135deg, rgba(0, 200, 190, 0.25) 0%, rgba(0, 200, 190, 0.15) 50%, rgba(0, 200, 190, 0.08) 100%)',
      borderColor: 'rgba(0, 200, 190, 0.35)',
      color: '#4dd0c7',
      '& .MuiChip-label': { color: '#4dd0c7' },
    },
    lime: {
      background:
        'linear-gradient(135deg, rgba(205, 220, 57, 0.25) 0%, rgba(205, 220, 57, 0.15) 50%, rgba(205, 220, 57, 0.08) 100%)',
      borderColor: 'rgba(205, 220, 57, 0.35)',
      color: '#d4e157',
      '& .MuiChip-label': { color: '#d4e157' },
    },
    silver: {
      background:
        'linear-gradient(135deg, rgba(236, 240, 241, 0.25) 0%, rgba(236, 240, 241, 0.15) 50%, rgba(236, 240, 241, 0.08) 100%)',
      borderColor: 'rgba(236, 240, 241, 0.35)',
      color: '#ecf0f1',
      '& .MuiChip-label': { color: '#ecf0f1' },
    },
    legendary: {
      background:
        'linear-gradient(135deg, rgba(255,0,150,0.2) 0%, rgba(255,150,0,0.2) 20%, rgba(255,255,0,0.2) 40%, rgba(0,255,0,0.2) 60%, rgba(0,150,255,0.2) 80%, rgba(150,0,255,0.2) 100%)',
      borderImage:
        'linear-gradient(135deg, #ff0096, #ff9600, #ffff00, #00ff00, #0096ff, #9600ff) 1',
      border: '1px solid transparent',
      color: '#ffffff',
      '& .MuiChip-label': { color: '#ffffff' },
      animation: `${legendaryGlow} 3s ease-in-out infinite`,
    },
  };
  return { ...glossyBaseSx, ...(v[variant] || v.silver) } as SxProps<Theme>;
};

const getGearChipProps = (setName: string, count: number): Partial<ChipProps> => {
  const n = normalizeName(setName);
  // Mythics first (explicit list)
  if (MYTHIC_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('gold'),
    };
  }
  // Arena weapons
  if (ARENA_SET_NAMES.has(n)) {
    return {
      sx: buildVariantSx('blue'),
    };
  }
  // Special case: 4-piece Highland Sentinel uses a specific font color
  if (count === 4 && n === normalizeName('Highland Sentinel')) {
    return {
      sx: buildVariantSx('lime'),
    };
  }
  // 5-piece sets
  if (count >= 5) {
    return {
      sx: buildVariantSx('green'),
    };
  }
  // Two-piece monsters
  if (count === 2 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: buildVariantSx('purple'),
    };
  }
  // One-piece monsters
  if (count === 1 && MONSTER_ONE_PIECE_HINTS.some((h) => n.includes(h))) {
    return {
      sx: buildVariantSx('lightBlue'),
    };
  }
  // Default neutral
  return { sx: buildVariantSx('silver') };
};

// Detect common ESO food/drink buffs by aura name
const FOOD_REGEXPS: RegExp[] = [
  /Artaeum\s+Takeaway\s+Broth/i,
  /Clockwork\s+Citrus\s+Filet/i,
  /Bewitched\s+Sugar\s+Skulls/i,
  /Witchmother.?s\s+Potent\s+Brew/i,
  /Ghastly\s+Eye\s+Bowl/i,
  /Lava\s+Foot\s+Soup.*Saltrice/i,
  /Dubious\s+Camoran\s+Throne/i,
  /Crown\s+Fortifying\s+Meal/i,
  /Crown\s+Vigorous\s+Tincture/i,
  /Orzorga/i,
];

function detectFoodFromAuras(
  auras?: Array<{ name: string; id: number; stacks?: number }>
): { name: string; id: number } | undefined {
  if (!auras || auras.length === 0) return undefined;
  for (const a of auras) {
    const n = a?.name || '';
    if (FOOD_REGEXPS.some((rx) => rx.test(n))) {
      return { name: n, id: a.id };
    }
  }
  return undefined;
}

function abbreviateFood(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, '')
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name;
  const acronym = words.map((w) => (w.length > 0 ? w[0].toUpperCase() : '')).join('');
  return acronym.length >= 2 && acronym.length <= 4
    ? acronym
    : words
        .slice(0, 3)
        .map((w) => (w.length > 0 ? w[0].toUpperCase() : ''))
        .join('');
}

interface PlayersPanelViewProps {
  playerActors: Record<string, PlayerDetailsEntry> | undefined;
  mundusBuffsByPlayer: Record<string, Array<{ name: string; id: number }>>;
  aurasByPlayer: Record<string, Array<{ name: string; id: number; stacks?: number }>>;
  deathsByPlayer: Record<string, number>;
  resurrectsByPlayer: Record<string, number>;
  cpmByPlayer: Record<string, number>;
  reportId?: string | null;
  fightId?: string | null;
  isLoading: boolean;
}

=======
interface PlayersPanelViewProps {
  playerActors: ReportActorFragment[];
  eventPlayers: Record<string, PlayerInfo>;
  mundusBuffsByPlayer: Record<string, Array<{ name: string; id: number }>>;
  aurasByPlayer: Record<string, Array<{ name: string; id: number; stacks?: number }>>;
  deathsByPlayer: Record<string, number>;
  resurrectsByPlayer: Record<string, number>;
  cpmByPlayer: Record<string, number>;
  reportId?: string;
  fightId?: string;
}

>>>>>>> pr-21
const CLASS_ICON_MAP: Record<string, string | undefined> = {
  dragonknight: dkIcon,
  templar: templarIcon,
  warden: wardenIcon,
  nightblade: nightbladeIcon,
  sorcerer: sorcererIcon,
  necromancer: necromancerIcon,
  arcanist: arcanistIcon,
};

// Canonical ESO class skill lines per class (names only)
const CLASS_SUBLINES: Record<string, [string, string, string]> = {
  arcanist: ['Herald of the Tome', 'Soldier of Apocrypha', 'Curative Runeforms'],
  necromancer: ['Grave Lord', 'Bone Tyrant', 'Living Death'],
  warden: ['Animal Companions', 'Green Balance', "Winter's Embrace"],
  templar: ['Aedric Spear', "Dawn's Wrath", 'Restoring Light'],
  nightblade: ['Assassination', 'Shadow', 'Siphoning'],
  dragonknight: ['Ardent Flame', 'Draconic Power', 'Earthen Heart'],
  sorcerer: ['Dark Magic', 'Daedric Summoning', 'Storm Calling'],
};

<<<<<<< HEAD
=======
// Short display labels for sublines to keep single-line layout without scaling
const CLASS_SUBLINES_SHORT: Record<string, [string, string, string]> = {
  arcanist: ['Herald', 'Soldier', 'Curative'],
  necromancer: ['Grave', 'Bone', 'Living'],
  warden: ['Animal', 'Green', 'Winter'],
  templar: ['Aedric', "Dawn's", 'Restoring'],
  nightblade: ['Assassin', 'Shadow', 'Siphon'],
  dragonknight: ['Flame', 'Draconic', 'Earthen'],
  sorcerer: ['Dark', 'Daedric', 'Storm'],
};

>>>>>>> pr-21
function parseClasses(input?: string | null): string[] {
  const raw = (input || '').trim();
  if (!raw) return [];
  // Split on common delimiters that may separate multiple classes
  const parts = raw
    .split(/[\\/|,•]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (parts.length ? parts : [raw]).slice(0, 3);
}

// Map common abbreviations and variants to canonical keys used in CLASS_ICON_MAP
const CLASS_ALIASES: Record<string, string> = {
  dragonknight: 'dragonknight',
  'dragon knight': 'dragonknight',
  dk: 'dragonknight',
  templar: 'templar',
  plar: 'templar',
  warden: 'warden',
  nightblade: 'nightblade',
  'night blade': 'nightblade',
  nb: 'nightblade',
  sorcerer: 'sorcerer',
  sorc: 'sorcerer',
  necromancer: 'necromancer',
  necro: 'necromancer',
  arcanist: 'arcanist',
};

function toClassKey(name?: string | null): string {
  const k = String(name || '')
    .toLowerCase()
    .trim();
  return CLASS_ALIASES[k] || k;
}

<<<<<<< HEAD
export const PlayersPanelView: React.FC<PlayersPanelViewProps> = ({
=======
// Utility: auto-fit single-line content by scaling down if it overflows
const OneLineAutoFit: React.FC<{ minScale?: number; children: React.ReactNode }> = ({
  minScale = 0.8,
  children,
}) => {
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const available = outer.clientWidth;
      const needed = inner.scrollWidth;
      if (available <= 0 || needed <= 0) return setScale(1);
      const next = Math.max(minScale, Math.min(1, available / needed));
      setScale(next);
    };

    measure();
    const listeners: Array<() => void> = [];
    let ro: any | null = null;
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    if (g && typeof g.ResizeObserver !== 'undefined') {
      ro = new g.ResizeObserver(measure);
      ro.observe(outer);
      ro.observe(inner);
    } else if (typeof window !== 'undefined') {
      const onResize = () => measure();
      window.addEventListener('resize', onResize);
      listeners.push(() => window.removeEventListener('resize', onResize));
    }
    return () => {
      if (ro && typeof ro.disconnect === 'function') ro.disconnect();
      listeners.forEach((fn) => fn());
    };
  }, [minScale]);

  return (
    <Box
      ref={outerRef}
      sx={{ minWidth: 0, width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}
    >
      <Box
        ref={innerRef}
        sx={{
          display: 'inline-block',
          transform: `scale(${scale})`,
          transformOrigin: 'left center',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const PlayersPanelView: React.FC<PlayersPanelViewProps> = ({
>>>>>>> pr-21
  playerActors,
  mundusBuffsByPlayer,
  aurasByPlayer,
  deathsByPlayer,
  resurrectsByPlayer,
  cpmByPlayer,
  reportId,
  fightId,
<<<<<<< HEAD
  isLoading,
=======
>>>>>>> pr-21
}) => {
  // Encoded pins filter provided by user for casts view
  const CASTS_PINS =
    '2%24Off%24%23244F4B%24expression%24ability.id+NOT+IN%2816499%2C28541%2C16165%2C16145%2C18350%2C28549%2C45223%2C18396%2C16277%2C115548%2C85572%2C23196%2C95040%2C39301%2C63507%2C22269%2C95042%2C191078%2C32910%2C41963%2C16261%2C45221%2C48076%2C32974%2C21970%2C41838%2C16565%2C45227%2C118604%2C26832%2C15383%2C45382%2C16420%2C68401%2C47193%2C190583%2C16212%2C228524%2C186981%2C16037%2C15435%2C15279%2C72931%2C45228%2C16688%2C61875%2C61874%29';

<<<<<<< HEAD
  const castsUrl = React.useCallback((rid?: string, fid?: string | null) => {
=======
  const castsUrl = React.useCallback((rid?: string, fid?: string) => {
>>>>>>> pr-21
    if (!rid) return undefined;
    const fightParam = fid ? `&fight=${encodeURIComponent(fid)}` : '';
    return `https://www.esologs.com/reports/${encodeURIComponent(rid)}?type=casts${fightParam}&pins=${CASTS_PINS}`;
  }, []);

<<<<<<< HEAD
  const getArmorWeightCounts = (
    gear: PlayerGear[]
  ): { heavy: number; medium: number; light: number } => {
=======
  const getArmorWeightCounts = (gear: PlayerGear[]) => {
>>>>>>> pr-21
    let heavy = 0,
      medium = 0,
      light = 0;
    if (!Array.isArray(gear)) return { heavy, medium, light };
<<<<<<< HEAD
    const norm = (s?: string): string => (s || '').toLowerCase();
=======
    const norm = (s?: string) => (s || '').toLowerCase();
>>>>>>> pr-21
    for (const g of gear) {
      if (!g || g.id === 0) continue;
      if (typeof g.type === 'number') {
        if (g.type === 3) heavy += 1;
        else if (g.type === 2) medium += 1;
        else if (g.type === 1) light += 1;
        continue;
      }
      const n = norm(g.name);
      if (!n) continue;
      if (n.includes('heavy')) heavy += 1;
      else if (n.includes('medium')) medium += 1;
      else if (n.includes('light')) light += 1;
    }
    return { heavy, medium, light };
  };
<<<<<<< HEAD

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Players
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading player data...
        </Typography>
      </Box>
    );
  }
=======
>>>>>>> pr-21

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Players
      </Typography>
<<<<<<< HEAD
      <Grid container spacing={2}>
        {playerActors &&
          Object.values(playerActors).map((player) => {
            if (!player) {
              return null;
            }

            const talents = player?.combatantInfo?.talents ?? [];
            const gear = player?.combatantInfo?.gear ?? [];
            const armorWeights = getArmorWeightCounts(gear);
            const buildIssues = detectBuildIssues(gear);
            return (
              <Box key={player.id} sx={{ width: '100%', mb: 2 }}>
                <Card
                  variant="outlined"
                  className="u-hover-lift u-fade-in-up"
                  sx={{ width: '100%' }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      display="flex"
                      flexDirection={{ xs: 'column', md: 'row' }}
                      alignItems="stretch"
                      gap={2}
                    >
                      {/* Left column: identity, talents, gear, issues */}
                      <Box flex={1} minWidth={0}>
                        <Box display="flex" alignItems="center" mb={1.5}>
                          {player.icon ? (
                            <Avatar
                              src={`https://assets.rpglogs.com/img/eso/icons/${player.icon}.png`}
                              alt={String(resolveActorName(player))}
                              sx={{ mr: 2.5 }}
                            />
                          ) : (
                            <Avatar sx={{ mr: 2.5 }} />
                          )}
                          <Box>
                            <Box display="flex" alignItems="center" gap={1.25}>
                              <Typography variant="subtitle1">
                                {resolveActorName(player)}
                              </Typography>
                              <Box display="inline-flex" alignItems="center" gap={0.5}>
                                <ShieldOutlinedIcon
                                  sx={{ color: 'text.secondary', fontSize: 12 }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#ff7a7a', fontSize: 11, lineHeight: 1 }}
                                >
                                  {armorWeights.heavy}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                                >
                                  •
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#93f093', fontSize: 11, lineHeight: 1 }}
                                >
                                  {armorWeights.medium}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                                >
                                  •
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#3c9bff', fontSize: 11, lineHeight: 1 }}
                                >
                                  {armorWeights.light}
                                </Typography>
                              </Box>
                            </Box>
                            {(() => {
                              // Prefer showing the three ESO skill lines for the detected class.
                              const baseKey = toClassKey(player.type);
                              const sublines = CLASS_SUBLINES[baseKey];
                              const classes = parseClasses(player.type);
                              const fallbackList = classes.length
                                ? classes
                                : ([player.type].filter(Boolean) as string[]);
                              const list = sublines ? sublines : fallbackList.slice(0, 3);
                              const icon = CLASS_ICON_MAP[baseKey];
                              const joined = list.join(' • ');
                              return (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    minWidth: 0,
                                    mt: 0.75,
                                    mb: 0.75,
                                  }}
                                >
                                  {icon && (
                                    <img
                                      src={icon}
                                      alt={String(baseKey)}
                                      width={12}
                                      height={12}
                                      style={{ opacity: 0.8, flexShrink: 0 }}
                                    />
                                  )}
                                  <Tooltip title={joined}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        lineHeight: 1.05,
                                        fontSize: '0.70rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: 'block',
                                        minWidth: 0,
                                        maxWidth: '100%',
                                      }}
                                    >
                                      {joined}
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              );
                            })()}
                          </Box>
                          {(() => {
                            // Prefer showing the three ESO skill lines for the detected class.
                            const baseKey = toClassKey(player.type);
                            const sublines = CLASS_SUBLINES[baseKey];
                            const classes = parseClasses(player.type);
                            const fallbackList = classes.length
                              ? classes
                              : ([player.type].filter(Boolean) as string[]);
                            const list = sublines ? sublines : fallbackList.slice(0, 3);
=======
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        {playerActors.map((actor) => {
          // Get player details from events.players by actor id
          const player = actor.id ? eventPlayers[String(actor.id)] : undefined;

          if (!player) {
            return null;
          }

          const talents = player?.combatantInfo?.talents ?? [];
          const gear = player?.combatantInfo?.gear ?? [];
          const armorWeights = getArmorWeightCounts(gear);
          const buildIssues = detectBuildIssues(gear);
          return (
            <Box key={actor.id} sx={{ minWidth: 0, display: 'flex' }}>
              <Card
                variant="outlined"
                className="u-hover-lift u-fade-in-up"
                sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <CardContent
                  sx={{ p: 2, pb: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="stretch"
                    gap={2}
                    sx={{ flex: 1, minHeight: 0, justifyContent: 'space-between' }}
                  >
                    {/* Left column: identity, talents, gear, issues */}
                    <Box flex={0} minWidth={0}>
                      <Box display="flex" alignItems="center" mb={1.5}>
                        {actor.icon ? (
                          <Avatar
                            src={`https://assets.rpglogs.com/img/eso/icons/${actor.icon}.png`}
                            alt={String(resolveActorName(actor))}
                            sx={{ mr: 2.5 }}
                          />
                        ) : (
                          <Avatar sx={{ mr: 2.5 }} />
                        )}
                        <Box>
                          <Box display="flex" alignItems="center" gap={1.25}>
                            <Typography variant="subtitle1">{resolveActorName(actor)}</Typography>
                            <Box display="inline-flex" alignItems="center" gap={0.5}>
                              <ShieldOutlinedIcon sx={{ color: 'text.secondary', fontSize: 12 }} />
                              <Typography
                                variant="caption"
                                sx={{ color: '#ff7a7a', fontSize: 11, lineHeight: 1 }}
                              >
                                {armorWeights.heavy}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#93f093', fontSize: 11, lineHeight: 1 }}
                              >
                                {armorWeights.medium}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontSize: 9, lineHeight: 1 }}
                              >
                                •
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: '#3c9bff', fontSize: 11, lineHeight: 1 }}
                              >
                                {armorWeights.light}
                              </Typography>
                            </Box>
                          </Box>
                          {(() => {
                            // Prefer showing the three ESO skill lines for the detected class.
                            const baseKey = toClassKey(actor.subType);
                            const sublines = CLASS_SUBLINES[baseKey];
                            const classes = parseClasses(actor.subType);
                            const fallbackList = classes.length
                              ? classes
                              : ([actor.subType].filter(Boolean) as string[]);
                            const list = sublines ? sublines : fallbackList.slice(0, 3);
                            const displayList = CLASS_SUBLINES_SHORT[baseKey] ?? list;
>>>>>>> pr-21
                            const icon = CLASS_ICON_MAP[baseKey];
                            const joined = list.join(' • ');
                            return (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
<<<<<<< HEAD
                                  gap: 0.5,
                                  minWidth: 0,
                                  mt: 0.75,
                                  mb: 0.75,
                                }}
                              >
                                {icon && (
                                  <img
                                    src={icon}
                                    alt={String(baseKey)}
                                    width={12}
                                    height={12}
                                    style={{ opacity: 0.8, flexShrink: 0 }}
                                  />
                                )}
                                <Tooltip title={joined}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      lineHeight: 1.05,
                                      fontSize: '0.70rem',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'block',
                                      minWidth: 0,
                                      maxWidth: '100%',
                                    }}
                                  >
                                    {joined}
                                  </Typography>
                                </Tooltip>
                              </Box>
                            );
                          })()}
                        </Box>
                        {/* Talents (title removed for cleaner UI) */}
                        {talents.length > 0 && (
                          <Box mb={1.5}>
                            <Box display="flex" flexWrap="wrap" gap={1.25} mb={1.25}>
                              {talents.slice(0, 6).map((talent, idx) => (
                                <Avatar
                                  key={idx}
                                  src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                  alt={talent.name}
                                  variant="rounded"
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    border: '1px solid var(--border)',
                                    boxShadow: 'rgb(0 0 0) 0px 2px 4px',
                                  }}
                                  title={`${talent.name} (ID: ${talent.guid})`}
                                />
                              ))}
                            </Box>
                            {talents.length > 6 && (
                              <Box display="flex" flexWrap="wrap" gap={1.25} mt={0.25}>
                                {talents.slice(6).map((talent, idx) => (
                                  <Avatar
                                    key={idx}
                                    src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                    alt={talent.name}
                                    variant="rounded"
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      border: '1px solid var(--border)',
                                      boxShadow: 'rgb(0 0 0) 0px 2px 4px',
                                    }}
                                    title={`${talent.name} (ID: ${talent.guid})`}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        )}
                        {/* Gear */}
                        {gear.length > 0 && (
                          <Box mt={1.25}>
                            {/* Gear Sets title and weight counter removed; weight counter shown next to player name */}
                            <Box display="flex" flexWrap="wrap" gap={1.25}>
                              {(() => {
                                type BaseSet = {
                                  total: number;
                                  perfected: number;
                                  setID?: number;
                                  hasPerfected: boolean;
                                  hasRegular: boolean;
                                  baseDisplay: string;
                                };
                                const setDataByBase: Record<string, BaseSet> = {};

                                const twoHandedKeywords = [
                                  'greatsword',
                                  'battle axe',
                                  'maul',
                                  'bow',
                                  'inferno staff',
                                  'ice staff',
                                  'lightning staff',
                                  'flame staff',
                                  'destruction staff',
                                  'restoration staff',
                                ];
                                const isTwoHandedWeapon = (name?: string): boolean => {
                                  if (!name) return false;
                                  const n = name.toLowerCase();
                                  return twoHandedKeywords.some((k) => n.includes(k));
                                };

                                gear.forEach((g: PlayerGear) => {
                                  if (!g.setName) return;
                                  const increment = isTwoHandedWeapon(g.name) ? 2 : 1;

                                  const isPerfected = /^perfected\s+/i.test(g.setName);
                                  const baseDisplay = g.setName.replace(/^Perfected\s+/, '');
                                  const baseKey = normalizeName(baseDisplay);

                                  if (!setDataByBase[baseKey]) {
                                    setDataByBase[baseKey] = {
                                      total: 0,
                                      perfected: 0,
                                      setID: g.setID,
                                      hasPerfected: false,
                                      hasRegular: false,
                                      baseDisplay,
                                    };
                                  }
                                  const entry = setDataByBase[baseKey];
                                  entry.total += increment;
                                  if (isPerfected) {
                                    entry.perfected += increment;
                                    entry.hasPerfected = true;
                                  } else {
                                    entry.hasRegular = true;
                                  }
                                  if (!entry.setID && g.setID) entry.setID = g.setID;
                                });

                                const chips: React.ReactNode[] = [];
                                Object.entries(setDataByBase).forEach(([baseKey, data], idx) => {
                                  const labelName =
                                    data.perfected === data.total
                                      ? `Perfected ${data.baseDisplay}`
                                      : data.baseDisplay;
                                  const count = data.total;
                                  const chipProps = getGearChipProps(labelName, count);
                                  chips.push(
                                    <Chip
                                      key={idx}
                                      label={`${count} ${labelName}`}
                                      size="small"
                                      title={`Set ID: ${data.setID ?? ''}`}
                                      {...chipProps}
                                    />
                                  );

                                  if (
                                    count >= 5 &&
                                    data.hasPerfected &&
                                    data.hasRegular &&
                                    data.perfected < 5
                                  ) {
                                    const missing = 5 - data.perfected;
                                    if (missing > 0) {
                                      buildIssues.push({
                                        gearName: labelName,
                                        enchantQuality: 5,
                                        message: `Missing ${missing} Perfected piece(s) in ${labelName} for the 5-piece bonus`,
                                      });
                                    }
                                  }
                                });
                                return chips;
                              })()}
                            </Box>
                          </Box>
                        )}

                        {/* Build Issues details moved under right column */}
                      </Box>
                      {/* Right column: Player info box aligned right */}
                      <Box sx={{ width: { xs: '100%', md: 300 } }}>
                        {(() => {
                          const hasMundus = !!(
                            player.id && mundusBuffsByPlayer[String(player.id)]?.length
                          );
                          const deathsVal = player.id
                            ? (deathsByPlayer[String(player.id)] ?? 0)
                            : 0;
                          const resVal = player.id
                            ? (resurrectsByPlayer[String(player.id)] ?? 0)
                            : 0;
                          const cpmVal = player.id ? (cpmByPlayer[String(player.id)] ?? 0) : 0;
                          const foodAura = player.id
                            ? detectFoodFromAuras(aurasByPlayer[String(player.id)])
                            : undefined;
                          return (
                            <Box
                              sx={{
                                p: 1,
                                border: '1px solid var(--border)',
                                borderRadius: 1,
                                backgroundColor: 'rgba(2,6,23,0.25)',
                                boxShadow: 'rgb(6 9 11) 0px 2px 4px',
=======
                                  minWidth: 0,
                                  mt: 0.75,
                                  mb: 0.75,
                                  pr: 1,
                                  pl: 0,
                                }}
                              >
                                <OneLineAutoFit minScale={0.9}>
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.75,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {displayList.map((name, idx) => (
                                      <Tooltip key={idx} title={list[idx] || name}>
                                        <Box
                                          sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                          }}
                                        >
                                          {idx > 0 && (
                                            <Typography
                                              variant="caption"
                                              sx={{ color: 'text.secondary', opacity: 0.7 }}
                                            >
                                              •
                                            </Typography>
                                          )}
                                          {icon && (
                                            <img
                                              src={icon}
                                              alt={String(baseKey)}
                                              width={12}
                                              height={12}
                                              style={{ opacity: 0.8, flexShrink: 0 }}
                                            />
                                          )}
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                            sx={{ lineHeight: 1.05, fontSize: '0.70rem' }}
                                          >
                                            {name}
                                          </Typography>
                                        </Box>
                                      </Tooltip>
                                    ))}
                                  </Box>
                                </OneLineAutoFit>
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                      {/* Talents (title removed for cleaner UI) */}
                      {talents.length > 0 && (
                        <Box mb={1.5}>
                          <Box display="flex" flexWrap="wrap" gap={1.25} mb={1.25}>
                            {talents.slice(0, 6).map((talent, idx) => {
                              const isUltimate = idx === 5;
                              return (
                                <React.Fragment key={idx}>
                                  {isUltimate && (
                                    <Box
                                      sx={{
                                        width: 2,
                                        height: 34,
                                        bgcolor: 'rgba(124,207,252,0.55)',
                                        borderRadius: 0.5,
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  <Box
                                    component="span"
                                    sx={{ display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <Tooltip
                                      title={(() => {
                                        const clsKey = toClassKey(actor.subType);
                                        const rich = buildTooltipPropsFromClassAndName(
                                          clsKey,
                                          talent.name
                                        );
                                        const base = {
                                          name: talent.name,
                                          description: `${talent.name} (ID: ${talent.guid})`,
                                        };
                                        return (
                                          <SkillTooltip
                                            {...(rich ?? base)}
                                            name={
                                              isUltimate
                                                ? `${rich?.name ?? base.name} (Ultimate)`
                                                : (rich?.name ?? base.name)
                                            }
                                            iconUrl={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                          />
                                        );
                                      })()}
                                      placement="top-start"
                                      enterDelay={0}
                                      arrow
                                      slotProps={{
                                        popper: {
                                          modifiers: [
                                            {
                                              name: 'preventOverflow',
                                              options: { padding: 8, rootBoundary: 'viewport' },
                                            },
                                            {
                                              name: 'flip',
                                              options: {
                                                fallbackPlacements: [
                                                  'top',
                                                  'bottom',
                                                  'left',
                                                  'right',
                                                ],
                                              },
                                            },
                                            { name: 'offset', options: { offset: [0, 8] } },
                                          ],
                                        },
                                        tooltip: { sx: { maxWidth: 320, p: 0 } },
                                      }}
                                    >
                                      <Avatar
                                        src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                        alt={talent.name}
                                        variant="rounded"
                                        sx={{
                                          width: isUltimate ? 34 : 32,
                                          height: isUltimate ? 34 : 32,
                                          border: isUltimate
                                            ? '1.5px solid #b3b3b3f2'
                                            : '1px solid #b5b8bd59',
                                          boxShadow: isUltimate
                                            ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                            : 'none',
                                        }}
                                      />
                                    </Tooltip>
                                  </Box>
                                </React.Fragment>
                              );
                            })}
                          </Box>
                          {talents.length > 6 && (
                            <Box display="flex" flexWrap="wrap" gap={1.25} mt={0.25}>
                              {talents.slice(6).map((talent, idx) => {
                                const isUltimate = idx === 5;
                                return (
                                  <React.Fragment key={idx}>
                                    {isUltimate && (
                                      <Box
                                        sx={{
                                          width: 2,
                                          height: 34,
                                          bgcolor: 'rgba(124,207,252,0.55)',
                                          borderRadius: 0.5,
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                    <Box
                                      component="span"
                                      sx={{ display: 'inline-flex', alignItems: 'center' }}
                                    >
                                      <Tooltip
                                        title={(() => {
                                          const clsKey = toClassKey(actor.subType);
                                          const rich = buildTooltipPropsFromClassAndName(
                                            clsKey,
                                            talent.name
                                          );
                                          const base = {
                                            name: talent.name,
                                            description: `${talent.name} (ID: ${talent.guid})`,
                                          };
                                          return (
                                            <SkillTooltip
                                              {...(rich ?? base)}
                                              name={
                                                isUltimate
                                                  ? `${rich?.name ?? base.name} (Ultimate)`
                                                  : (rich?.name ?? base.name)
                                              }
                                              iconUrl={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                            />
                                          );
                                        })()}
                                        placement="top-start"
                                        enterDelay={0}
                                        arrow
                                        slotProps={{
                                          popper: {
                                            modifiers: [
                                              {
                                                name: 'preventOverflow',
                                                options: { padding: 8, rootBoundary: 'viewport' },
                                              },
                                              {
                                                name: 'flip',
                                                options: {
                                                  fallbackPlacements: [
                                                    'top',
                                                    'bottom',
                                                    'left',
                                                    'right',
                                                  ],
                                                },
                                              },
                                              { name: 'offset', options: { offset: [0, 8] } },
                                            ],
                                          },
                                          tooltip: { sx: { maxWidth: 320, p: 0 } },
                                        }}
                                      >
                                        <Avatar
                                          src={`https://assets.rpglogs.com/img/eso/abilities/${talent.abilityIcon}.png`}
                                          alt={talent.name}
                                          variant="rounded"
                                          sx={{
                                            width: isUltimate ? 34 : 32,
                                            height: isUltimate ? 34 : 32,
                                            border: isUltimate
                                              ? '1.5px solid #b3b3b3f2'
                                              : '1px solid #b5b8bd59',
                                            boxShadow: isUltimate
                                              ? 'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)'
                                              : 'none',
                                          }}
                                        />
                                      </Tooltip>
                                    </Box>
                                  </React.Fragment>
                                );
                              })}
                            </Box>
                          )}
                          {/* Gear */}
                          {gear.length > 0 && (
                            <Box mt={1.25} sx={{ pt: 0.9, pb: 0 }}>
                              {/* Gear Sets title and weight counter removed; weight counter shown next to player name */}
                              <Box display="flex" flexWrap="wrap" gap={1.25} minHeight={48}>
                                {(() => {
                                  type BaseSet = {
                                    total: number;
                                    perfected: number;
                                    setID?: number;
                                    hasPerfected: boolean;
                                    hasRegular: boolean;
                                    baseDisplay: string;
                                  };
                                  const setDataByBase: Record<string, BaseSet> = {};

                                  const twoHandedKeywords = [
                                    'greatsword',
                                    'battle axe',
                                    'maul',
                                    'bow',
                                    'inferno staff',
                                    'ice staff',
                                    'lightning staff',
                                    'flame staff',
                                    'destruction staff',
                                    'restoration staff',
                                  ];
                                  const isTwoHandedWeapon = (name?: string) => {
                                    if (!name) return false;
                                    const n = name.toLowerCase();
                                    return twoHandedKeywords.some((k) => n.includes(k));
                                  };

                                  gear.forEach((g: PlayerGear) => {
                                    if (!g.setName) return;
                                    const increment = isTwoHandedWeapon(g.name) ? 2 : 1;

                                    const isPerfected = /^perfected\s+/i.test(g.setName);
                                    const baseDisplay = g.setName.replace(/^Perfected\s+/, '');
                                    const baseKey = normalizeName(baseDisplay);

                                    if (!setDataByBase[baseKey]) {
                                      setDataByBase[baseKey] = {
                                        total: 0,
                                        perfected: 0,
                                        setID: g.setID,
                                        hasPerfected: false,
                                        hasRegular: false,
                                        baseDisplay,
                                      };
                                    }
                                    const entry = setDataByBase[baseKey];
                                    entry.total += increment;
                                    if (isPerfected) {
                                      entry.perfected += increment;
                                      entry.hasPerfected = true;
                                    } else {
                                      entry.hasRegular = true;
                                    }
                                    if (!entry.setID && g.setID) entry.setID = g.setID;
                                  });

                                  // Build sortable records from aggregated set data
                                  const records = Object.entries(setDataByBase).map(
                                    ([baseKey, data]) => {
                                      const labelName =
                                        data.perfected === data.total
                                          ? `Perfected ${data.baseDisplay}`
                                          : data.baseDisplay;
                                      const count = data.total;
                                      const n = normalizeName(labelName);
                                      const isMonster = MONSTER_ONE_PIECE_HINTS.some((h) =>
                                        n.includes(h)
                                      );
                                      const isMythic = MYTHIC_SET_NAMES.has(n);
                                      const isArena = ARENA_SET_NAMES.has(n);
                                      const isHighland4 =
                                        count === 4 && n === normalizeName('Highland Sentinel');
                                      const isFivePiece = count >= 5;
                                      const isThreePiece = count === 3;
                                      // Determine desired order category
                                      let category = 99;
                                      if (isMonster)
                                        category = 0; // monster (1p or 2p) first
                                      else if (isFivePiece)
                                        category = 1; // 5-piece bonuses
                                      else if (isHighland4)
                                        category = 2; // 4-piece Highland Sentinel
                                      else if (isThreePiece)
                                        category = 3; // 3-piece (e.g., Potentates)
                                      else if (isMythic)
                                        category = 4; // mythic
                                      else if (isArena)
                                        category = 5; // arena weapons
                                      else category = 6; // everything else last

                                      // Secondary ordering within monsters: 2p before 1p
                                      const secondary = isMonster ? (count === 2 ? 0 : 1) : 0;

                                      return {
                                        key: baseKey,
                                        data,
                                        labelName,
                                        count,
                                        category,
                                        secondary,
                                        sortName: data.baseDisplay.toLowerCase(),
                                      };
                                    }
                                  );

                                  records.sort((a, b) => {
                                    if (a.category !== b.category) return a.category - b.category;
                                    if (a.secondary !== b.secondary)
                                      return a.secondary - b.secondary;
                                    // Prefer higher piece counts within same category (except monsters handled above)
                                    if (a.count !== b.count) return b.count - a.count;
                                    return a.sortName.localeCompare(b.sortName);
                                  });

                                  const chips: React.ReactNode[] = [];
                                  records.forEach((rec, idx) => {
                                    const chipProps = getGearChipProps(rec.labelName, rec.count);
                                    chips.push(
                                      <Chip
                                        key={idx}
                                        label={`${rec.count} ${rec.labelName}`}
                                        size="small"
                                        title={`Set ID: ${rec.data.setID ?? ''}`}
                                        {...chipProps}
                                      />
                                    );

                                    if (
                                      rec.count >= 5 &&
                                      rec.data.hasPerfected &&
                                      rec.data.hasRegular &&
                                      rec.data.perfected < 5
                                    ) {
                                      const missing = 5 - rec.data.perfected;
                                      if (missing > 0) {
                                        buildIssues.push({
                                          gearName: rec.labelName,
                                          enchantQuality: 5,
                                          message: `Missing ${missing} Perfected piece(s) in ${rec.labelName} for the 5-piece bonus`,
                                        });
                                      }
                                    }
                                  });
                                  return chips;
                                })()}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Build Issues details moved under right column */}
                    </Box>
                    {/* Right column content stacked below left, full width */}
                    <Box
                      sx={{
                        width: '100%',
                        mt: 'auto',
                        pt: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                      }}
                    >
                      {(() => {
                        const hasMundus = !!(
                          actor.id && mundusBuffsByPlayer[String(actor.id)]?.length
                        );
                        const deathsVal = actor.id ? (deathsByPlayer[String(actor.id)] ?? 0) : 0;
                        const resVal = actor.id ? (resurrectsByPlayer[String(actor.id)] ?? 0) : 0;
                        const cpmVal = actor.id ? (cpmByPlayer[String(actor.id)] ?? 0) : 0;
                        const foodAura = actor.id
                          ? detectFoodFromAuras(aurasByPlayer[String(actor.id)])
                          : undefined;
                        return (
                          <Box
                            sx={{
                              p: 1,
                              border: '1px solid var(--border)',
                              borderRadius: 1,
                              backgroundColor: 'rgba(2,6,23,0.25)',
                              boxShadow: 'rgb(6 9 11) 0px 2px 4px',
                            }}
                          >
                            <Box
                              sx={{
                                mb: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                minWidth: 0,
                                minHeight: 28,
>>>>>>> pr-21
                              }}
                            >
                              <Box
                                sx={{
<<<<<<< HEAD
                                  mb: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  minWidth: 0,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexWrap: 'nowrap',
                                    gap: 1,
                                    minHeight: 24,
                                    flex: '1 1 auto',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    mr: 1,
                                  }}
                                >
                                  {hasMundus && (
                                    <>
                                      {(mundusBuffsByPlayer[String(player.id)] ?? []).map(
                                        (buff, idx) => (
                                          <Box
                                            key={idx}
                                            component="span"
                                            title={`Ability ID: ${buff.id}`}
                                            sx={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              border: '1px solid',
                                              borderColor: 'var(--border)',
                                              borderRadius: 9999,
                                              px: 0.75,
                                              py: 0.25,
                                              fontSize: 11,
                                              lineHeight: 1,
                                              color: 'primary.main',
                                              whiteSpace: 'nowrap',
                                              verticalAlign: 'middle',
                                              fontFamily: 'Space Grotesk, sans-serif',
                                              fontWeight: 200,
                                            }}
                                          >
                                            {buff.name.replace(/^Boon:\\s*/i, '')}
                                          </Box>
                                        )
                                      )}
                                    </>
                                  )}
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    flex: '0 0 auto',
                                    flexShrink: 0,
                                    ml: 'auto',
                                    pr: 1,
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {foodAura && (
                                    <>
                                      <Tooltip title={`Food/Drink: ${foodAura.name}`}>
                                        <span
                                          style={{ display: 'inline-flex', alignItems: 'center' }}
                                        >
                                          <span role="img" aria-label="food">
                                            🍲
                                          </span>
                                          <Box component="span" sx={{ display: 'none' }}>
                                            &nbsp;{abbreviateFood(foodAura.name)}
                                          </Box>
                                        </span>
                                      </Tooltip>{' '}
                                      •{' '}
                                    </>
                                  )}
                                  <Tooltip title="Deaths in this fight">
                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      <span role="img" aria-label="deaths">
                                        💀
                                      </span>
                                      &nbsp;{deathsVal}
                                    </span>
                                  </Tooltip>{' '}
                                  •{' '}
                                  <Tooltip title="Successful resurrects performed">
                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      <span role="img" aria-label="resurrects">
                                        ❤️
                                      </span>
                                      &nbsp;{resVal}
                                    </span>
                                  </Tooltip>{' '}
                                  •{' '}
                                  <Tooltip title="Casts per Minute">
                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      <span role="img" aria-label="cpm">
                                        🐭
                                      </span>
                                      &nbsp;
                                      {reportId ? (
                                        <a
                                          href={castsUrl(reportId, fightId)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'inherit', textDecoration: 'underline' }}
                                        >
                                          {cpmVal}
                                        </a>
                                      ) : (
                                        <>{cpmVal}</>
                                      )}
                                    </span>
                                  </Tooltip>
                                </Typography>
                              </Box>
                              {player.id && aurasByPlayer[String(player.id)]?.length > 0 && (
                                <Box sx={{}}>
                                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                                    Notable Auras
                                  </Typography>
                                  <Box display="flex" flexWrap="wrap" gap={1}>
                                    {aurasByPlayer[String(player.id)]
                                      .slice()
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .slice(0, 3)
                                      .map((aura, idx) => (
                                        <Chip
                                          key={idx}
                                          label={
                                            aura.stacks && aura.stacks > 1
                                              ? `${aura.name} (${aura.stacks})`
                                              : aura.name
                                          }
                                          size="small"
                                          title={`Ability ID: ${aura.id}${aura.stacks ? ` | Stacks: ${aura.stacks}` : ''}`}
                                          sx={buildVariantSx('indigo')}
                                        />
                                      ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          );
                        })()}
                        {buildIssues.length > 0 && (
                          <Accordion
                            variant="outlined"
                            sx={{
                              mt: 1,
                              borderColor: 'warning.main',
                              backgroundColor: 'rgba(255,193,7,0.07)',
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon sx={{ color: 'warning.main' }} />}
                              sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center' } }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                sx={{
                                  color: 'warning.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <span role="img" aria-label="attention">
                                  ⚠️
                                </span>
                                Build Issues ({buildIssues.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                {buildIssues.map((issue, idx) => (
                                  <Typography
                                    key={`issue-${idx}`}
                                    component="li"
                                    variant="body2"
                                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                                  >
                                    <span aria-hidden style={{ width: 18 }}>
                                      •
                                    </span>
                                    <span>
                                      <strong>{issue.gearName}</strong>:{' '}
                                      {issue.message.replace(/^.*?:\s*/, '')}
                                    </span>
                                  </Typography>
                                ))}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        )}
                      </Box>
                    </Box>
                    {/* Duplicate long lists removed to keep card minimal; summarized in right panel */}
                  </CardContent>
                </Card>
              </Box>
            );
          })}
      </Grid>
=======
                                  display: 'flex',
                                  flexWrap: 'nowrap',
                                  gap: 1,
                                  minHeight: 24,
                                  flex: '1 1 auto',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  mr: 1,
                                }}
                              >
                                {hasMundus && (
                                  <>
                                    {(mundusBuffsByPlayer[String(actor.id)] ?? []).map(
                                      (buff, idx) => (
                                        <Box
                                          key={idx}
                                          component="span"
                                          title={`Ability ID: ${buff.id}`}
                                          sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            border: '1px solid',
                                            borderColor: 'var(--border)',
                                            borderRadius: 9999,
                                            pl: 0.5,
                                            pr: '14px',
                                            py: 0.25,
                                            gap: 0.5,
                                            fontSize: 10,
                                            lineHeight: 1,
                                            color: 'primary.main',
                                            whiteSpace: 'nowrap',
                                            verticalAlign: 'middle',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold',
                                          }}
                                        >
                                          <img
                                            src={mundusIcon}
                                            alt=""
                                            style={{
                                              width: 12,
                                              height: 12,
                                              display: 'inline-block',
                                            }}
                                          />
                                          <Box
                                            component="span"
                                            sx={{
                                              display: 'inline-block',
                                              minWidth: 0,
                                              maxWidth: '10ch',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {buff.name
                                              .replace(/^Boon:\s*/i, '')
                                              .replace(/^The\s+/i, '')}
                                          </Box>
                                        </Box>
                                      )
                                    )}
                                  </>
                                )}
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  whiteSpace: 'nowrap',
                                  flex: '0 0 auto',
                                  flexShrink: 0,
                                  ml: 'auto',
                                  pr: 1,
                                  maxWidth: '100%',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                <Tooltip title={`Food/Drink: ${foodAura ? foodAura.name : 'None'}`}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span role="img" aria-label="food">
                                      🍲
                                    </span>
                                    &nbsp;
                                    <Box
                                      component="span"
                                      sx={{
                                        display: 'inline',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        letterSpacing: '.02em',
                                      }}
                                    >
                                      {foodAura ? abbreviateFood(foodAura.name) : 'NONE'}
                                    </Box>
                                  </span>
                                </Tooltip>{' '}
                                •{' '}
                                <Tooltip title="Deaths in this fight">
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span role="img" aria-label="deaths">
                                      💀
                                    </span>
                                    &nbsp;{deathsVal}
                                  </span>
                                </Tooltip>{' '}
                                •{' '}
                                <Tooltip title="Successful resurrects performed">
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span role="img" aria-label="resurrects">
                                      ❤️
                                    </span>
                                    &nbsp;{resVal}
                                  </span>
                                </Tooltip>{' '}
                                •{' '}
                                <Tooltip title="Casts per Minute">
                                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <span role="img" aria-label="cpm">
                                      🐭
                                    </span>
                                    &nbsp;
                                    {reportId ? (
                                      <a
                                        href={castsUrl(reportId, fightId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit', textDecoration: 'underline' }}
                                      >
                                        {cpmVal}
                                      </a>
                                    ) : (
                                      <>{cpmVal}</>
                                    )}
                                  </span>
                                </Tooltip>
                              </Typography>
                            </Box>
                            {actor.id && aurasByPlayer[String(actor.id)]?.length > 0 && (
                              <Box sx={{}}>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{ mb: 1, fontFamily: 'Space Grotesk, sans-serif' }}
                                >
                                  Notable Auras
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1} sx={{ minHeight: 40 }}>
                                  {aurasByPlayer[String(actor.id)]
                                    .slice()
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .slice(0, 3)
                                    .map((aura, idx) => (
                                      <Chip
                                        key={idx}
                                        label={
                                          aura.stacks && aura.stacks > 1
                                            ? `${aura.name} (${aura.stacks})`
                                            : aura.name
                                        }
                                        size="small"
                                        title={`Ability ID: ${aura.id}${aura.stacks ? ` | Stacks: ${aura.stacks}` : ''}`}
                                        sx={buildVariantSx('indigo')}
                                      />
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                      {buildIssues.length === 0 && (
                        <Box
                          sx={{
                            mt: 1,
                            border: '1px solid',
                            borderColor: 'success.main',
                            backgroundColor: 'rgba(76,175,80,0.07)',
                            borderRadius: 1,
                            borderTopLeftRadius: '5px',
                            borderTopRightRadius: '5px',
                            borderTop: '1px solid #54775496',
                            px: 2,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}
                            >
                              Build checks out
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {buildIssues.length > 0 && (
                        <Accordion
                          variant="outlined"
                          sx={{
                            mt: 1,
                            borderColor: 'warning.main',
                            backgroundColor: 'rgba(255,193,7,0.07)',
                            borderTop: '1px solid #5c574d',
                            borderTopLeftRadius: '5px',
                            borderTopRightRadius: '5px',
                            overflow: 'hidden',
                            '&.Mui-expanded': {
                              borderTop: 'none',
                              borderTopLeftRadius: '5px',
                              borderTopRightRadius: '5px',
                            },
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{ color: 'warning.main' }} />}
                            sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center' } }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              sx={{
                                color: 'warning.main',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <span role="img" aria-label="attention">
                                ⚠️
                              </span>
                              Build Issues ({buildIssues.length})
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                              {buildIssues.map((issue, idx) => (
                                <Typography
                                  key={`issue-${idx}`}
                                  component="li"
                                  variant="body2"
                                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                                >
                                  <span aria-hidden="true" style={{ width: 18 }}>
                                    •
                                  </span>
                                  <span>
                                    <strong>{issue.gearName}</strong>:{' '}
                                    {issue.message.replace(/^.*?:\s*/, '')}
                                  </span>
                                </Typography>
                              ))}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Box>
                  </Box>
                  {/* Duplicate long lists removed to keep card minimal; summarized in right panel */}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>
>>>>>>> pr-21
    </Box>
  );
};
