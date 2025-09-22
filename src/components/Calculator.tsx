import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Container,
  Tabs,
  Tab,
  Paper,
  FormControlLabel,
  Switch,
  Button,
  ButtonGroup,
  TextField,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import React, { useState, useMemo, useCallback, useRef } from 'react';

import {
  CalculatorItem,
  CalculatorData,
  PENETRATION_DATA,
  CRITICAL_DATA,
  PEN_OPTIMAL_MIN_PVE,
  PEN_OPTIMAL_MAX_PVE,
  PEN_OPTIMAL_MIN_PVP,
  PEN_OPTIMAL_MAX_PVP,
  CRIT_OPTIMAL_MIN,
  CRIT_OPTIMAL_MAX,
} from '../data/skill-lines/calculator-data';

// Mode filter configuration based on original calculator
const MODE_FILTER = {
  pve: {
    pen: [
      'Major Breach',
      'Minor Breach',
      'Roar of Alkosh',
      "Crimson Oath's Rive",
      'Tremorscale',
      'Legendary Infused Crusher Enchant',
      'Runic Sunder',
      "Velothi Ur-Mage's Amulet",
      'Armor Set Penetration Bonus',
      'Balorgh',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Grave Lord Passive: Dismember',
      'Herald of the Tome: Splintered Secrets',
      'Light Armor Passive: Concentration',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
      // Additional gear items
      'Crystal Weapon',
      'Shattered Fate',
      "Spriggan's Thorns",
      'Sharpened (1H Trait)',
      'Sharpened (2H Trait)',
      'Arena 1-piece Bonus',
      'Martial Knowledge',
      'Advancing Yokeda',
      'Relequen',
      "Sul-Xan's Torment",
      "Perfected Sul-Xan's Torment",
      "Tzogvin's Warband",
      'Stormfist',
      'Noble Duelist',
      "Night's Silence",
      'Shadow of the Red Mountain',
      "Vampire's Cloak",
      'Twice-Fanged Serpent',
      "Bahraha's Curse",
      'Venomous Smite',
      "Hunding's Rage",
      "Death's Wind",
      'Armor Master',
      'Briarheart',
      'Kvatch Gladiator',
      'Dragonsblood',
      'Ebon Armory',
      'Morkuldin',
      "Oblivion's Foe",
      'Scourge Harvester',
      "Vampire's Sting",
      'Daedric Trickster',
      "Alessia's Bulwark",
      'Armor of the Seducer',
      'Ashen Grip',
      'Bloodthirsty',
      'Briarheart',
      'Clever Alchemist',
      "Coldharbour's Favorite",
      'Daedric Trickster',
      "Draugr's Heritage",
      "Dro-m'Athra Shroud",
      'Ebon Armory',
      'Eternal Hunt',
      'Eyes of Mara',
      'Fortified Brass',
      "Gryphon's Ferocity",
      "Gryphon's Reprisal",
      'Heartland Conqueror',
      "Hircine's Veneer",
      'Hist Bark',
      'Iron Flask',
      'Jailbreaker',
      "Kagrenac's Hope",
      'Law of Julianos',
      'Leviathan',
      "Maelstrom's Inferno",
      'Maw of the Infernal',
      'Morag Tong',
      "Nerien'eth",
      "Noble's Conquest",
      "Noble's Dedication",
      "Oblivion's Foe",
      'Pacthunter',
      'Red Eagle',
      'Sentinel of Rkugamz',
      'Shroud of the Lich',
      'Silks of the Sun',
      "Skirmisher's Bite",
      'Slave Master',
      'Song of Lamae',
      'Spawn of Mephala',
      "Specter's Eye",
      "Stuhn's Favor",
      'Swarm Mother',
      "Tava's Favor",
      'Thews of the Harbinger',
      'Torc of Tonal Constancy',
      'Trial by Fire',
      'Twice-Fanged Serpent',
      "Vampire's Cloak",
      "Vampire's Sting",
      'Venomous Smite',
      'Way of Martial Knowledge',
      'Willpower',
      'Wisdom',
      "Witchman's",
      "Ysgramor's Birthright",
      'Zaan',
      "Zoal's Scorching Blade",
    ],
    crit: [
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Major Brittle',
      'Elemental Catalyst',
      'Armor Set Critical Damage Bonus',
      'War Machine',
      'Kinras Wrath',
      'Zaan',
      'Balorgh',
      'Perfected False God Devotion',
      'Stone Garden Torchbearer',
      'Assassination: Hemorrhage',
      'Herald of the Tome: Fated Fortune',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Two Handed: Heavy Weapons (Battle Axe)',
      'Champion Point: Precision',
      'Champion Point: Fighting Finesse',
      // Additional gear items
      "Mother's Sorrow",
      'Berserking Warrior',
      'Perfected Arms of Relequen',
      "Perfected Kinras's Wrath",
      'Perfected Mantle of Siroria',
      "Perfected False God's Devotion",
      'Perfected Stone Garden Torchbearer',
      "Perfected Asylum's Sword",
      'Perfected Iceheart',
      'Perfected Vykosa',
      'Perfected Balorgh',
      "Perfected Kra'gh",
      'Perfected Velidreth',
      'Perfected Valkyn Skoria',
      'Perfected Grothdarr',
      'Perfected Ilambris',
      'Perfected Troll King',
      'Perfected Engine Guardian',
      'Perfected Sentinel Raxix',
      "Perfected Order's Wrath",
      'Perfected Shadowrend',
      'Perfected Maw of the Infernal',
      "Perfected Nerien'eth",
      'Perfected Ice Furnace',
      'Perfected Inferno Guardian',
      'Perfected Molag Kena',
      'Perfected Aetherial Ascension',
      'Perfected Aegis Caller',
      "Perfected Bahraha's Curse",
      "Perfected Crimson Oath's Rive",
      'Perfected Deadlands Assassin',
      'Perfected Deadlands Demolisher',
      "Perfected Draugr's Heritage",
      "Perfected Draugr's Rest",
      "Perfected Dro-m'Athra Shroud",
      "Perfected Dromathra's Defiance",
      'Perfected Duskfang',
      'Perfected Elf Bane',
      'Perfected Endurance',
      'Perfected Eternal Hunt',
      'Perfected Eyes of Mara',
      'Perfected Fortified Brass',
      "Perfected Gryphon's Ferocity",
      "Perfected Gryphon's Reprisal",
      'Perfected Heartland Conqueror',
      "Perfected Hircine's Veneer",
      'Perfected Hist Bark',
      'Perfected Iron Flask',
      'Perfected Jailbreaker',
      "Perfected Kagrenac's Hope",
      'Perfected Law of Julianos',
      'Perfected Leviathan',
      "Perfected Maelstrom's Inferno",
      'Perfected Maw of the Infernal',
      'Perfected Morag Tong',
      "Perfected Nerien'eth",
      "Perfected Noble's Conquest",
      "Perfected Noble's Dedication",
      "Perfected Oblivion's Foe",
      'Perfected Pacthunter',
      'Perfected Red Eagle',
      'Perfected Sentinel of Rkugamz',
      'Perfected Shroud of the Lich',
      'Perfected Silks of the Sun',
      "Perfected Skirmisher's Bite",
      'Perfected Slave Master',
      'Perfected Song of Lamae',
      'Perfected Spawn of Mephala',
      "Perfected Specter's Eye",
      "Perfected Stuhn's Favor",
      'Perfected Swarm Mother',
      "Perfected Tava's Favor",
      'Perfected Thews of the Harbinger',
      'Perfected Torc of Tonal Constancy',
      'Perfected Trial by Fire',
      'Perfected Twice-Fanged Serpent',
      "Perfected Vampire's Cloak",
      "Perfected Vampire's Sting",
      'Perfected Venomous Smite',
      'Perfected Way of Martial Knowledge',
      'Perfected Willpower',
      'Perfected Wisdom',
      "Perfected Witchman's",
      "Perfected Ysgramor's Birthright",
      'Perfected Zaan',
      "Perfected Zoal's Scorching Blade",
    ],
  },
  pvp: {
    pen: [
      'Major Breach',
      'Minor Breach',
      'Legendary Infused Crusher Enchant',
      'Runic Sunder',
      'Armor Set Penetration Bonus',
      'Balorgh',
      'Dual Wield: Twin Blade and Blunt (Mace)',
      'Grave Lord Passive: Dismember',
      'Herald of the Tome: Splintered Secrets',
      'Light Armor Passive: Concentration',
      'Champion Point: Piercing',
      'Champion Point: Force of Nature',
      // Additional gear items available in PvP
      'Crystal Weapon',
      'Shattered Fate',
      "Spriggan's Thorns",
      'Sharpened (1H Trait)',
      'Sharpened (2H Trait)',
      'Arena 1-piece Bonus',
      'Martial Knowledge',
      'Advancing Yokeda',
      'Relequen',
      "Sul-Xan's Torment",
      "Perfected Sul-Xan's Torment",
      "Tzogvin's Warband",
      'Stormfist',
      'Noble Duelist',
      "Night's Silence",
      'Shadow of the Red Mountain',
      "Vampire's Cloak",
      'Twice-Fanged Serpent',
      "Bahraha's Curse",
      'Venomous Smite',
      "Hunding's Rage",
      "Death's Wind",
      'Armor Master',
      'Briarheart',
      'Kvatch Gladiator',
      'Dragonsblood',
      'Ebon Armory',
      'Morkuldin',
      "Oblivion's Foe",
      'Scourge Harvester',
      "Vampire's Sting",
      'Daedric Trickster',
      "Alessia's Bulwark",
      'Armor of the Seducer',
      'Ashen Grip',
      'Bloodthirsty',
      'Briarheart',
      'Clever Alchemist',
      "Coldharbour's Favorite",
      'Daedric Trickster',
      "Draugr's Heritage",
      "Dro-m'Athra Shroud",
      'Ebon Armory',
      'Eternal Hunt',
      'Eyes of Mara',
      'Fortified Brass',
      "Gryphon's Ferocity",
      "Gryphon's Reprisal",
      'Heartland Conqueror',
      "Hircine's Veneer",
      'Hist Bark',
      'Iron Flask',
      'Jailbreaker',
      "Kagrenac's Hope",
      'Law of Julianos',
      'Leviathan',
      "Maelstrom's Inferno",
      'Maw of the Infernal',
      'Morag Tong',
      "Nerien'eth",
      "Noble's Conquest",
      "Noble's Dedication",
      "Oblivion's Foe",
      'Pacthunter',
      'Red Eagle',
      'Sentinel of Rkugamz',
      'Shroud of the Lich',
      'Silks of the Sun',
      "Skirmisher's Bite",
      'Slave Master',
      'Song of Lamae',
      'Spawn of Mephala',
      "Specter's Eye",
      "Stuhn's Favor",
      'Swarm Mother',
      "Tava's Favor",
      'Thews of the Harbinger',
      'Torc of Tonal Constancy',
      'Trial by Fire',
      'Twice-Fanged Serpent',
      "Vampire's Cloak",
      "Vampire's Sting",
      'Venomous Smite',
      'Way of Martial Knowledge',
      'Willpower',
      'Wisdom',
      "Witchman's",
      "Ysgramor's Birthright",
      'Zaan',
      "Zoal's Scorching Blade",
    ],
    crit: [
      'Minor Force',
      'Major Force',
      'Minor Brittle',
      'Major Brittle',
      'Armor Set Critical Damage Bonus',
      'Balorgh',
      'Perfected False God Devotion',
      'Stone Garden Torchbearer',
      'Assassination: Hemorrhage',
      'Herald of the Tome: Fated Fortune',
      'Aedric Spear: Piercing Spear',
      'Medium Armor: Dexterity',
      'Animal Companions: Advanced Species',
      'Dual Wield: Twin Blade and Blunt (Axe)',
      'Two Handed: Heavy Weapons (Battle Axe)',
      'Champion Point: Precision',
      'Champion Point: Fighting Finesse',
      // Additional gear items available in PvP
      "Mother's Sorrow",
      'Berserking Warrior',
      'Perfected Arms of Relequen',
      "Perfected Kinras's Wrath",
      'Perfected Mantle of Siroria',
      "Perfected False God's Devotion",
      'Perfected Stone Garden Torchbearer',
      "Perfected Asylum's Sword",
      'Perfected Iceheart',
      'Perfected Vykosa',
      'Perfected Balorgh',
      "Perfected Kra'gh",
      'Perfected Velidreth',
      'Perfected Valkyn Skoria',
      'Perfected Grothdarr',
      'Perfected Ilambris',
      'Perfected Troll King',
      'Perfected Engine Guardian',
      'Perfected Sentinel Raxix',
      "Perfected Order's Wrath",
      'Perfected Shadowrend',
      'Perfected Maw of the Infernal',
      "Perfected Nerien'eth",
      'Perfected Ice Furnace',
      'Perfected Inferno Guardian',
      'Perfected Molag Kena',
      'Perfected Aetherial Ascension',
      'Perfected Aegis Caller',
      "Perfected Bahraha's Curse",
      "Perfected Crimson Oath's Rive",
      'Perfected Deadlands Assassin',
      'Perfected Deadlands Demolisher',
      "Perfected Draugr's Heritage",
      "Perfected Draugr's Rest",
      "Perfected Dro-m'Athra Shroud",
      "Perfected Dromathra's Defiance",
      'Perfected Duskfang',
      'Perfected Elf Bane',
      'Perfected Endurance',
      'Perfected Eternal Hunt',
      'Perfected Eyes of Mara',
      'Perfected Fortified Brass',
      "Perfected Gryphon's Ferocity",
      "Perfected Gryphon's Reprisal",
      'Perfected Heartland Conqueror',
      "Perfected Hircine's Veneer",
      'Perfected Hist Bark',
      'Perfected Iron Flask',
      'Perfected Jailbreaker',
      "Perfected Kagrenac's Hope",
      'Perfected Law of Julianos',
      'Perfected Leviathan',
      "Perfected Maelstrom's Inferno",
      'Perfected Maw of the Infernal',
      'Perfected Morag Tong',
      "Perfected Nerien'eth",
      "Perfected Noble's Conquest",
      "Perfected Noble's Dedication",
      "Perfected Oblivion's Foe",
      'Perfected Pacthunter',
      'Perfected Red Eagle',
      'Perfected Sentinel of Rkugamz',
      'Perfected Shroud of the Lich',
      'Perfected Silks of the Sun',
      "Perfected Skirmisher's Bite",
      'Perfected Slave Master',
      'Perfected Song of Lamae',
      'Perfected Spawn of Mephala',
      "Perfected Specter's Eye",
      "Perfected Stuhn's Favor",
      'Perfected Swarm Mother',
      "Perfected Tava's Favor",
      'Perfected Thews of the Harbinger',
      'Perfected Torc of Tonal Constancy',
      'Perfected Trial by Fire',
      'Perfected Twice-Fanged Serpent',
      "Perfected Vampire's Cloak",
      "Perfected Vampire's Sting",
      'Perfected Venomous Smite',
      'Perfected Way of Martial Knowledge',
      'Perfected Willpower',
      'Perfected Wisdom',
      "Perfected Witchman's",
      "Perfected Ysgramor's Birthright",
      'Perfected Zaan',
      "Perfected Zoal's Scorching Blade",
    ],
  },
};

// Mode type
type GameMode = 'pve' | 'pvp' | 'both';

// Styled components
const CalculatorContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  minHeight: '100vh',
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'relative',
  width: '100%',
  maxWidth: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflowX: 'hidden',
}));

const CalculatorCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  width: '100%',
  maxWidth: liteMode ? '100%' : '1200px',
  margin: '0 auto',
  padding: liteMode ? 0 : '24px',
  [theme.breakpoints.down('sm')]: {
    padding: liteMode ? 0 : 0,
  },
  background: liteMode
    ? theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(3,7,18,0.9) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)'
    : theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
  backdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
  WebkitBackdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
  borderRadius: liteMode ? 12 : 14,
  border: liteMode
    ? theme.palette.mode === 'dark'
      ? '1px solid rgba(128, 211, 255, 0.15)'
      : '1px solid rgba(40, 145, 200, 0.2)'
    : theme.palette.mode === 'dark'
      ? '1px solid rgba(128, 211, 255, 0.2)'
      : '1px solid rgba(203, 213, 225, 0.3)',
  boxShadow: liteMode
    ? theme.palette.mode === 'dark'
      ? '0 4px 16px rgba(0, 0, 0, 0.3)'
      : '0 4px 16px rgba(0, 0, 0, 0.08)'
    : theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 'auto',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflowX: 'hidden',
  '&:hover': !liteMode
    ? {
        transform: 'translateY(-2px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 12px 40px rgba(0, 0, 0, 0.5)'
            : '0 12px 40px rgba(0, 0, 0, 0.15)',
      }
    : {},
}));

// CSS handles sticky positioning - no custom hook needed

const TotalSection = styled(Box)<{ isLiteMode: boolean }>(({ theme, isLiteMode }) => ({
  position: 'relative',
}));

const StickyFooter = styled(Box)<{ isLiteMode: boolean }>(({ theme, isLiteMode }) => ({
  position: 'sticky',
  bottom: 0,
  zIndex: 1000,
  marginTop: 'auto',
  background: isLiteMode ? theme.palette.background.paper : 'transparent', // Make transparent when not in lite mode so inner container shows through
  backdropFilter: isLiteMode ? 'none' : 'blur(20px)',
  WebkitBackdropFilter: isLiteMode ? 'none' : 'blur(20px)',
  borderTop: isLiteMode
    ? 'none'
    : theme.palette.mode === 'dark'
      ? '1px solid rgba(128, 211, 255, 0.3)'
      : '1px solid rgba(203, 213, 225, 0.3)',
  borderRadius: isLiteMode ? 0 : '6px 6px 6px 6px',
  padding: isLiteMode ? theme.spacing(1.5) : theme.spacing(3),
  boxShadow: isLiteMode
    ? 'none'
    : theme.palette.mode === 'dark'
      ? '0 -8px 32px rgba(0, 0, 0, 0.4)'
      : '0 -8px 32px rgba(0, 0, 0, 0.1)',
  paddingBottom: `calc(${theme.spacing(isLiteMode ? 1.5 : 3)} + env(safe-area-inset-bottom))`,
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps): React.JSX.Element {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`calculator-tabpanel-${index}`}
      aria-labelledby={`calculator-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number): { id: string; 'aria-controls': string } {
  return {
    id: `calculator-tab-${index}`,
    'aria-controls': `calculator-tabpanel-${index}`,
  };
}

// Custom styled alert component that matches the glassmorphism design
const StyledAlert = styled(Alert)(
  ({
    theme,
    severity,
    liteMode,
  }: {
    theme: any;
    severity: 'success' | 'warning' | 'error' | 'info';
    liteMode: boolean;
  }) => ({
    borderRadius: liteMode ? 6 : 10,
    border: liteMode
      ? 'none'
      : theme.palette.mode === 'dark'
        ? severity === 'success'
          ? '1px solid rgba(34, 197, 94, 0.3)'
          : severity === 'warning'
            ? '1px solid rgba(251, 146, 60, 0.3)'
            : '1px solid rgba(239, 68, 68, 0.3)'
        : severity === 'success'
          ? '1px solid rgba(34, 197, 94, 0.2)'
          : severity === 'warning'
            ? '1px solid rgba(251, 146, 60, 0.2)'
            : '1px solid rgba(239, 68, 68, 0.2)',
    background: liteMode
      ? theme.palette.background.paper
      : theme.palette.mode === 'dark'
        ? severity === 'success'
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
          : severity === 'warning'
            ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
        : severity === 'success'
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%)'
          : severity === 'warning'
            ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(251, 146, 60, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%)',
    backdropFilter: liteMode ? 'none' : 'blur(10px)',
    '& .MuiAlert-icon': {
      color: severity === 'success' ? '#22c55e' : severity === 'warning' ? '#fb923c' : '#ef4444',
    },
    '& .MuiAlert-message': {
      fontSize: liteMode ? '0.75rem' : '0.875rem',
    },
  }),
);

// Custom tooltip content component that matches SkillTooltip styling
interface CalculatorTooltipProps {
  title: string;
  content: string;
}

const CalculatorTooltip: React.FC<CalculatorTooltipProps> = ({ title, content }) => {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        maxWidth: 320,
        minWidth: 240,
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.98),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1,
            color:
              theme.palette.mode === 'dark'
                ? theme.palette.primary.light
                : theme.palette.primary.main,
            fontSize: '0.9rem',
          }}
        >
          {title}
        </Typography>
        <Divider sx={{ my: 1, borderColor: alpha(theme.palette.common.white, 0.08) }} />
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.4,
            fontSize: '0.8rem',
            wordBreak: 'break-word',
            '& strong': {
              color:
                theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
              fontWeight: 600,
            },
            '& em': {
              color: 'text.secondary',
              fontStyle: 'italic',
            },
            '& .tt-head': {
              fontWeight: 600,
              color:
                theme.palette.mode === 'dark'
                  ? theme.palette.secondary.light
                  : theme.palette.secondary.main,
              fontSize: '0.75rem',
              marginTop: theme.spacing(0.5),
              marginBottom: theme.spacing(0.25),
            },
            '& br': {
              marginBottom: theme.spacing(0.5),
            },
            '& ul': {
              margin: 0,
              paddingLeft: theme.spacing(2),
              '& li': {
                marginBottom: theme.spacing(0.25),
              },
            },
            '& a': {
              color: theme.palette.primary.main,
              textDecoration: 'underline',
              '&:hover': {
                color: theme.palette.primary.light,
              },
            },
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
};

const Calculator: React.FC = React.memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmall = useMediaQuery('(max-width:380px)');
  const [selectedTab, setSelectedTab] = useState(0);
  const [liteMode, setLiteMode] = useState(isMobile);
  const [gameMode, setGameMode] = useState<GameMode>('both');
  const [penetrationData, setPenetrationData] = useState<CalculatorData>(PENETRATION_DATA);
  const [criticalData, setCriticalData] = useState<CalculatorData>(CRITICAL_DATA);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Calculate total values
  const calculateItemValue = useCallback((item: CalculatorItem): number => {
    if (!item.enabled) return 0;

    if (item.name === 'Anthelmir') {
      // Penetration = Weapon Damage ÷ 2.5
      const wd = parseFloat(item.quantity.toString()) || 0;
      return Math.round(wd / 2.5);
    } else if (item.name === 'Balorgh') {
      // Penetration = Ultimate × 23
      const ult = parseFloat(item.quantity.toString()) || 0;
      return Math.round(ult * 23);
    } else if (item.isFlat) {
      return item.value || 0;
    } else {
      return item.quantity * (item.per || 0);
    }
  }, []);

  const calculateTotalValue = useCallback(
    (data: CalculatorData): number => {
      let total = 0;
      Object.values(data).forEach((section) => {
        section.forEach((item: CalculatorItem) => {
          total += calculateItemValue(item);
        });
      });
      return total;
    },
    [calculateItemValue],
  );

  // Filter items based on current mode
  const getFilteredItems = useCallback(
    (data: CalculatorData, calcType: 'pen' | 'crit') => {
      if (gameMode === 'both') {
        // Return all items when both modes are selected
        return data;
      }

      const allowedItems = MODE_FILTER[gameMode]?.[calcType] || [];
      const filteredData: CalculatorData = {
        groupBuffs: [],
        gear: [],
        passives: [],
        cp: [],
      };

      Object.keys(data).forEach((category) => {
        filteredData[category as keyof CalculatorData] = data[
          category as keyof CalculatorData
        ].filter((item) => allowedItems.includes(item.name));
      });

      return filteredData;
    },
    [gameMode],
  );

  // Optimized totals calculation with reduced dependencies
  const penTotal = useMemo(() => {
    const allowedItems = gameMode === 'both' ? null : MODE_FILTER[gameMode]?.['pen'] || null;
    let total = 0;

    // Pre-calculate for performance
    const items = [
      ...penetrationData.groupBuffs,
      ...penetrationData.gear,
      ...penetrationData.passives,
      ...penetrationData.cp,
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.enabled && (!allowedItems || allowedItems.includes(item.name))) {
        const value = calculateItemValue(item);
        total += value;
      }
    }

    return total;
  }, [penetrationData, gameMode, calculateItemValue]);

  const critTotal = useMemo(() => {
    const allowedItems = gameMode === 'both' ? null : MODE_FILTER[gameMode]?.['crit'] || null;
    let total = 0;

    // Pre-calculate for performance
    const items = [
      ...criticalData.groupBuffs,
      ...criticalData.gear,
      ...criticalData.passives,
      ...criticalData.cp,
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.enabled && (!allowedItems || allowedItems.includes(item.name))) {
        total += calculateItemValue(item);
      }
    }

    return total;
  }, [criticalData, gameMode, calculateItemValue]);

  // Status calculation
  const getPenStatus = useCallback((total: number, mode: GameMode) => {
    if (mode === 'pve') {
      if (total >= PEN_OPTIMAL_MIN_PVE && total <= PEN_OPTIMAL_MAX_PVE) return 'at-cap';
      if (total > PEN_OPTIMAL_MAX_PVE) return 'over-cap';
      return 'under-cap';
    } else if (mode === 'pvp') {
      if (total >= PEN_OPTIMAL_MIN_PVP && total <= PEN_OPTIMAL_MAX_PVP) return 'at-cap';
      if (total > PEN_OPTIMAL_MAX_PVP) return 'over-cap';
      return 'under-cap';
    }
    // Both mode - show PvE ranges
    if (total >= PEN_OPTIMAL_MIN_PVE && total <= PEN_OPTIMAL_MAX_PVE) return 'at-cap';
    if (total > PEN_OPTIMAL_MAX_PVE) return 'over-cap';
    return 'under-cap';
  }, []);

  const getCritStatus = useCallback((total: number) => {
    if (total >= CRIT_OPTIMAL_MIN && total <= CRIT_OPTIMAL_MAX) return 'at-cap';
    if (total > CRIT_OPTIMAL_MAX) return 'over-cap';
    return 'under-cap';
  }, []);

  const penStatus = getPenStatus(penTotal, gameMode);
  const critStatus = getCritStatus(critTotal);

  // Update item handlers - optimized for performance
  const updatePenItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setPenetrationData((prev: CalculatorData) => {
        const newCategoryItems = [...prev[category]];
        newCategoryItems[index] = { ...newCategoryItems[index], ...updates };
        return {
          ...prev,
          [category]: newCategoryItems,
        };
      });
    },
    [],
  );

  const updateCritItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setCriticalData((prev: CalculatorData) => {
        const newCategoryItems = [...prev[category]];
        newCategoryItems[index] = { ...newCategoryItems[index], ...updates };
        return {
          ...prev,
          [category]: newCategoryItems,
        };
      });
    },
    [],
  );

  // Bulk toggle handlers
  const toggleAllPen = useCallback((enabled: boolean) => {
    setPenetrationData((prev: CalculatorData) => {
      const newData = { ...prev };

      Object.keys(newData).forEach((category) => {
        newData[category as keyof CalculatorData] = newData[category as keyof CalculatorData].map(
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled }),
        );
      });
      return newData;
    });
  }, []);

  const toggleAllCrit = useCallback((enabled: boolean) => {
    setCriticalData((prev: CalculatorData) => {
      const newData = { ...prev };

      Object.keys(newData).forEach((category) => {
        newData[category as keyof CalculatorData] = newData[category as keyof CalculatorData].map(
          (item: CalculatorItem) => (item.locked ? item : { ...item, enabled }),
        );
      });
      return newData;
    });
  }, []);

  // Memoize expensive calculations and styles
  // Pre-calculate common style values to prevent recreation on every render
  const baseStyles = React.useMemo(
    () => ({
      enabledBg:
        theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(59, 130, 246, 0.05)',
      disabledBg: theme.palette.mode === 'dark' ? 'rgba(2,6,23,0.45)' : 'rgba(248, 250, 252, 0.8)',
      enabledBorder:
        theme.palette.mode === 'dark'
          ? '1px solid rgba(56, 189, 248, 0.4)'
          : '1px solid rgba(59, 130, 246, 0.3)',
      disabledBorder:
        theme.palette.mode === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(203, 213, 225, 0.3)',
      accentColor: theme.palette.mode === 'dark' ? 'rgb(159 135 219)' : '#4e26b1',
      actionHover: theme.palette.action.hover,
    }),
    [theme.palette.mode, theme.palette.action.hover],
  );

  // Memoize calculator item styles with pre-calculated base values
  const getCalculatorItemStyles = React.useCallback(
    (item: CalculatorItem) => {
      const gridColumns = liteMode
        ? 'auto 36px 1fr auto'
        : isMobile
          ? 'auto 50px 1fr auto'
          : 'auto 60px 1fr auto auto';

      return {
        display: 'grid',
        gridTemplateColumns: gridColumns,
        alignItems: 'center',
        gap: liteMode ? 0.5 : 2,
        p: liteMode ? 0.125 : 1.5,
        background: item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgb(53 118 204 / 25%) 0%, rgb(85 159 255 / 18%) 100%) !important'
              : 'linear-gradient(135deg, rgb(140 182 237 / 20%) 0%, rgb(85 159 255 / 12%) 100%) !important'
            : theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(0, 225, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgb(128 211 255 / 20%) 0%, rgb(56 189 248 / 15%) 100%)'
          : liteMode
            ? 'rgb(200 210 220 / 8%)'
            : theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(241, 245, 249, 0.8)',
        border: item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? '1px solid rgb(105 162 255 / 29%) !important'
              : '1px solid rgb(105 162 255 / 40%) !important'
            : theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.8)'
              : '1px solid rgb(40 145 200 / 35%)'
          : liteMode
            ? '1px solid transparent'
            : theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(148, 163, 184, 0.6)',
        borderRadius: '8px !important',
        mb: liteMode ? 0.125 : 1,
        cursor: item.locked ? 'not-allowed' : 'pointer',
        opacity: item.locked ? 0.7 : 1,
        transition: liteMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        backdropFilter: !liteMode ? 'blur(8px)' : 'none',
        '&:hover': !item.locked
          ? {
              transform: liteMode ? 'none' : 'translateY(-1px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.6)'
                  : '1px solid rgb(40 145 200 / 50%)',
              boxShadow: liteMode
                ? 'none'
                : theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(56, 189, 248, 0.3)'
                  : '0 4px 12px rgb(40 145 200 / 25%)',
              '& .MuiCheckbox-root': {
                backgroundColor: liteMode
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.1)'
                    : 'rgba(40 145 200, 0.08)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(40 145 200, 0.1)',
              },
            }
          : {},
      };
    },
    [theme.palette.mode, liteMode, isMobile],
  );

  // Render item component - optimized to reduce re-renders
  const renderItem = React.useCallback(
    (
      item: CalculatorItem,
      index: number,
      category: keyof CalculatorData,
      updateFunction: (
        category: keyof CalculatorData,
        index: number,
        updates: Partial<CalculatorItem>,
      ) => void,
    ): React.JSX.Element => {
      const hasQuantity = item.maxQuantity && item.maxQuantity > 1;
      const key = `${category}-${index}-${item.enabled}-${item.quantity}-${hasQuantity}`;

      // Calculate display values once
      let displayValue: number;
      let perDisplay = '';

      if (item.name === 'Anthelmir') {
        const wd = parseFloat(item.quantity.toString()) || 0;
        displayValue = Math.round(wd / 2.5);
      } else if (item.name === 'Balorgh') {
        const ult = parseFloat(item.quantity.toString()) || 0;
        displayValue = Math.round(ult * 23);
      } else if (item.isFlat) {
        displayValue = item.value || 0;
      } else {
        displayValue = item.quantity * (item.per || 0);
        perDisplay = (item.per || 0) + (item.isPercent ? '%' : '');
      }

      // Enhanced mobile touch targets and accessibility
      const checkboxStyles = {
        '& .MuiSvgIcon-root': {
          fontSize: liteMode ? '1.2rem' : isExtraSmall ? '1.6rem' : isMobile ? '1.4rem' : '1.2rem',
        },
        padding: liteMode ? '8px' : isExtraSmall ? '14px' : isMobile ? '12px' : '4px',
        minWidth: liteMode ? '32px' : isExtraSmall ? '48px' : isMobile ? '44px' : '32px',
        minHeight: liteMode ? '32px' : isExtraSmall ? '48px' : isMobile ? '44px' : '32px',
        '&.Mui-checked': {
          color: liteMode ? '#4e26b1' : 'rgb(159 135 219)',
        },
        // Enhanced touch feedback
        '&:hover': {
          backgroundColor: isMobile ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
          borderRadius: '8px',
        },
        '&:active': {
          backgroundColor: isMobile ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
          transform: isMobile ? 'scale(0.95)' : 'none',
        },
      };

      // Optimized text input styling for all mobile sizes
      const textFieldStyles = {
        width: liteMode ? 48 : isExtraSmall ? 48 : isMobile ? 56 : 60,
        '& .MuiInputBase-root': {
          fontSize: liteMode
            ? '0.75rem'
            : isExtraSmall
              ? '0.8rem'
              : isMobile
                ? '0.85rem'
                : '0.8rem',
          padding: liteMode
            ? '6px 6px'
            : isExtraSmall
              ? '8px 10px'
              : isMobile
                ? '8px 12px'
                : '4px 8px',
          height: liteMode ? '32px' : isExtraSmall ? '40px' : isMobile ? '40px' : '32px',
          minHeight: liteMode ? '32px' : isExtraSmall ? '40px' : isMobile ? '40px' : '32px',
          boxSizing: 'border-box',
          marginLeft: liteMode ? 0 : '-8px !important',
          borderRadius: '8px',
          // Better mobile field styling
          border: isMobile ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
          backgroundColor: isMobile ? 'rgba(15, 23, 42, 0.6)' : 'transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: isMobile ? 'rgba(56, 189, 248, 0.5)' : 'transparent',
            backgroundColor: isMobile ? 'rgba(15, 23, 42, 0.8)' : 'transparent',
          },
          '&.Mui-focused': {
            borderColor: theme.palette.mode === 'dark' ? 'rgb(159 135 219)' : '#4e26b1',
            backgroundColor: isMobile ? 'rgba(15, 23, 42, 0.9)' : 'transparent',
            boxShadow: isMobile ? '0 0 0 2px rgba(56, 189, 248, 0.2)' : 'none',
          },
        },
        '& .MuiInputBase-input': {
          padding: liteMode
            ? '6px 6px'
            : isExtraSmall
              ? '8px 12px'
              : isMobile
                ? '8px 12px'
                : '2px 4px',
          textAlign: 'center',
          fontSize: liteMode
            ? '0.75rem'
            : isExtraSmall
              ? '0.85rem'
              : isMobile
                ? '0.9rem'
                : '0.75rem',
          fontWeight: 500,
          // Hide spin buttons for a cleaner look
          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
            '-webkit-appearance': 'none',
            margin: 0,
          },
          '&[type=number]': {
            '-moz-appearance': 'textfield',
          },
        },
        '& .MuiInputLabel-root': {
          fontSize: isExtraSmall ? '1rem' : isMobile ? '0.95rem' : '0.875rem',
          fontWeight: 500,
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: liteMode ? '1px' : '1px',
        },
      };

      const nameStyles = {
        color: item.enabled ? 'text.primary' : 'text.disabled',
        fontSize: { xs: liteMode ? '0.7rem' : '0.95rem', sm: liteMode ? '0.65rem' : '0.9rem' },
        lineHeight: { xs: 1.4, sm: 1.2 },
        wordBreak: 'break-word' as const,
      };

      const valueStyles = {
        color: theme.palette.mode === 'dark' ? 'rgb(199 234 255)' : 'rgb(40 145 200)',
        fontWeight: 700,
        fontFamily: 'monospace',
        textShadow: theme.palette.mode === 'dark' ? '0 0 10px rgba(199 234 255,0.25)' : 'none',
        minWidth: liteMode ? '3ch' : isMobile ? '4ch' : '4ch',
        textAlign: 'right',
        fontSize: liteMode ? '0.7rem' : isMobile ? '0.85rem' : '0.875rem',
        pr: liteMode ? 0.5 : 0,
      };

      const perDisplayStyles = {
        color: theme.palette.text.secondary,
        fontStyle: 'italic',
        fontSize: liteMode ? '0.65rem' : isMobile ? '0.7rem' : '0.75rem',
      };

      // Handle click on the entire list item
      const handleItemClick = (e: React.MouseEvent): void => {
        // Don't toggle if clicking on interactive elements
        if (
          e.target instanceof HTMLInputElement || // TextField input
          e.target instanceof HTMLButtonElement || // IconButton
          (e.target as HTMLElement).closest('button') || // Any button
          (e.target as HTMLElement).closest('input') || // Any input
          (e.target as HTMLElement).closest('.MuiCheckbox-root') // Checkbox
        ) {
          return;
        }

        if (!item.locked) {
          updateFunction(category, index, { enabled: !item.enabled });
        }
      };

      return (
        <ListItem
          key={key}
          sx={{
            ...getCalculatorItemStyles(item),
            minHeight: liteMode ? 36 : isMobile ? 52 : 48,
            py: liteMode ? 0.5 : isMobile ? 1.25 : 1,
            pl: liteMode ? 0.5 : 0.5,
          }}
          onClick={item.locked ? undefined : handleItemClick}
        >
          <ListItemIcon sx={{ minWidth: 'auto', mr: liteMode ? 0.125 : isMobile ? 0 : 0.75 }}>
            <Checkbox
              checked={item.enabled}
              disabled={item.locked}
              size={isMobile ? 'medium' : 'small'}
              disableRipple
              disableTouchRipple
              sx={(theme) => {
                // eslint-disable-next-line no-console
                console.log(
                  'Checkbox styling - liteMode:',
                  liteMode,
                  'theme.mode:',
                  theme.palette.mode,
                );
                return {
                  ...checkboxStyles,
                  '&.Mui-checked': {
                    color:
                      theme.palette.mode === 'light'
                        ? 'rgb(40 145 200) !important'
                        : 'rgb(199 234 255) !important',
                  },
                  '&.Mui-checked .MuiSvgIcon-root': {
                    color:
                      theme.palette.mode === 'light'
                        ? 'rgb(40 145 200) !important'
                        : 'rgb(199 234 255) !important',
                  },
                  '&.Mui-checked .MuiSvgIcon-root path': {
                    fill:
                      theme.palette.mode === 'light'
                        ? 'rgb(40 145 200) !important'
                        : 'rgb(199 234 255) !important',
                  },
                  '&:not(.Mui-checked) .MuiSvgIcon-root path': {
                    fill:
                      theme.palette.mode === 'light'
                        ? 'rgb(182 199 223) !important'
                        : 'rgb(156 163 175) !important',
                  },
                  svg: {
                    color:
                      theme.palette.mode === 'light' && item.enabled
                        ? 'rgb(40 145 200) !important'
                        : 'rgb(199 234 255) !important',
                  },
                };
              }}
              onChange={(e) => updateFunction(category, index, { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
            />
          </ListItemIcon>

          <Tooltip
            title={
              !hasQuantity
                ? "This item doesn't have adjustable quantity"
                : item.locked
                  ? 'This item is locked'
                  : ''
            }
            placement="top"
            arrow
          >
            <TextField
              size={isMobile ? 'medium' : 'small'}
              type="number"
              value={hasQuantity ? item.quantity : '-'}
              onChange={
                hasQuantity
                  ? (e) =>
                      updateFunction(category, index, {
                        quantity: Math.max(
                          item.minQuantity || 0,
                          Math.min(item.maxQuantity || 100, parseInt(e.target.value) || 0),
                        ),
                      })
                  : undefined
              }
              disabled={!hasQuantity || item.locked}
              placeholder={hasQuantity ? item.quantityTitle || undefined : 'N/A'}
              inputProps={{
                min: hasQuantity ? item.minQuantity || 0 : 0,
                max: hasQuantity ? item.maxQuantity || 100 : 0,
                step: hasQuantity ? item.step || 1 : 1,
                readOnly: !hasQuantity,
              }}
              sx={{
                ...textFieldStyles,
                '& .MuiInputBase-root': {
                  ...textFieldStyles['& .MuiInputBase-root'],
                  backgroundColor: !hasQuantity
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(30, 41, 59, 0.5)'
                      : liteMode
                        ? 'rgb(136 164 192 / 15%)'
                        : 'rgba(241, 245, 249, 0.8)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.15)'
                      : liteMode
                        ? 'rgba(40 145 200, 0.12)'
                        : 'rgba(40 145 200, 0.12)',
                  opacity: !hasQuantity ? 0.6 : 1,
                  '&:hover': {
                    backgroundColor: !hasQuantity
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.5)'
                        : liteMode
                          ? 'rgb(136 164 192 / 15%)'
                          : 'rgba(241, 245, 249, 0.8)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.25)'
                        : liteMode
                          ? 'rgba(40 145 200, 0.18)'
                          : 'rgba(40 145 200, 0.18)',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  ...textFieldStyles['& .MuiOutlinedInput-notchedOutline'],
                  borderColor: !hasQuantity
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.3)'
                      : 'rgba(148, 163, 184, 0.4)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.4)'
                      : liteMode
                        ? 'rgba(40 145 200, 0.4)'
                        : 'rgba(40 145 200, 0.4)',
                  '&:hover': {
                    borderColor: !hasQuantity
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(148, 163, 184, 0.4)'
                        : 'rgba(148, 163, 184, 0.5)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.6)'
                        : liteMode
                          ? 'rgba(40 145 200, 0.6)'
                          : 'rgba(40 145 200, 0.6)',
                  },
                },
                '& .MuiInputBase-input': {
                  ...textFieldStyles['& .MuiInputBase-input'],
                  color: !hasQuantity
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.8)'
                      : 'rgba(100, 116, 139, 0.8)'
                    : 'inherit',
                  cursor: !hasQuantity ? 'not-allowed' : 'text',
                },
              }}
              onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
            />
          </Tooltip>

          <ListItemText
            sx={{ ml: liteMode ? 1.5 : 0 }}
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: liteMode ? 1.5 : 0.75,
                    flex: 1,
                  }}
                >
                  <Typography variant="body2" sx={nameStyles}>
                    {item.name}
                  </Typography>
                  {item.tooltip && !item.hideTooltip && (
                    <Tooltip
                      title={<CalculatorTooltip title={item.name} content={item.tooltip} />}
                      enterTouchDelay={0}
                      leaveTouchDelay={3000}
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
                                fallbackPlacements: ['top', 'bottom', 'left', 'right'],
                              },
                            },
                            { name: 'offset', options: { offset: [0, 8] } },
                          ],
                        },
                        tooltip: { sx: { p: 0 } },
                      }}
                    >
                      <IconButton
                        size="small"
                        sx={{
                          p: 0.125,
                          minWidth: 'auto',
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                          },
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent ListItem click from also triggering
                      >
                        <InfoIcon sx={{ fontSize: liteMode ? 14 : isMobile ? 14 : 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {item.locked && (
                  <Chip
                    label="🔒"
                    size="small"
                    sx={{
                      height: liteMode ? 12 : isMobile ? 18 : 20,
                      fontSize: liteMode ? '0.55rem' : '0.65rem',
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    }}
                  />
                )}
              </Box>
            }
          />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              minWidth: valueStyles.minWidth,
            }}
          >
            {perDisplay && !liteMode && (
              <Typography variant="caption" sx={perDisplayStyles}>
                {perDisplay}
              </Typography>
            )}
            <Typography variant="body2" sx={valueStyles}>
              {displayValue.toLocaleString()}
              {item.isPercent ? '%' : ''}
            </Typography>
          </Box>
        </ListItem>
      );
    },
    [getCalculatorItemStyles, liteMode, isMobile, theme.palette.mode, theme.palette.text.secondary],
  );

  // Render section
  const renderSection = (
    title: string,
    items: CalculatorItem[],
    category: keyof CalculatorData,
    updateFunction: (
      category: keyof CalculatorData,
      index: number,
      updates: Partial<CalculatorItem>,
    ) => void,
  ): React.JSX.Element => {
    if (liteMode) {
      // Lite mode: individual items rendered directly
      return <>{items.map((item, index) => renderItem(item, index, category, updateFunction))}</>;
    }

    // Regular mode: accordion layout with mobile optimization
    return (
      <Accordion
        defaultExpanded
        sx={{
          mb: 3,
          '&:last-child': {
            mb: 2,
          },
          '&.Mui-expanded': {
            mb: 4,
            '&:last-child': {
              mb: 3,
            },
          },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pb: 2.5, pt: 1, px: liteMode ? 2 : isMobile ? 1 : 2 }}>
          <List sx={{ p: 0, overflowX: 'hidden' }}>
            {items.map((item, index) => renderItem(item, index, category, updateFunction))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <>
      <CalculatorContainer liteMode={liteMode}>
        <Container
          maxWidth={liteMode ? false : 'lg'}
          sx={{
            py: liteMode ? 1 : isMobile ? 1.5 : 2,
            px: liteMode ? 0.5 : isExtraSmall ? 0.5 : isMobile ? 1 : 2,
            overflowX: 'hidden',
            // Enhanced mobile padding and spacing
            '& .MuiTabs-root': {
              minHeight: isExtraSmall ? '48px' : isMobile ? '52px' : 'auto',
            },
            '& .MuiTab-root': {
              minHeight: isExtraSmall ? '48px' : isMobile ? '52px' : 'auto',
              fontSize: isExtraSmall ? '0.8rem' : isMobile ? '0.85rem' : '0.9rem',
              padding: isExtraSmall ? '6px 8px' : isMobile ? '8px 12px' : '12px 16px',
              minWidth: isExtraSmall ? 'auto' : isMobile ? '80px' : 'auto',
            },
          }}
        >
          {/* Main Calculator */}
          <CalculatorCard liteMode={liteMode}>
            {/* Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: liteMode ? 2 : isMobile ? 3 : 4,
                flexWrap: 'wrap',
                gap: liteMode ? 1 : isMobile ? 2 : 3,
                p: liteMode ? 2 : isExtraSmall ? 1.5 : isMobile ? 2 : 4,
                borderBottom: liteMode ? 'none' : '1px solid',
                borderColor: liteMode
                  ? 'transparent'
                  : theme.palette.mode === 'dark'
                    ? 'rgb(128 211 255 / 20%)'
                    : 'rgb(40 145 200 / 15%)',
                background: liteMode
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.8)'
                    : 'rgba(255, 255, 255, 0.95)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(255, 255, 255, 0.98)',
                borderRadius: liteMode ? 0 : '16px 16px 0 0',
                backdropFilter: liteMode ? 'blur(8px)' : 'blur(10px)',
                WebkitBackdropFilter: liteMode ? 'blur(8px)' : 'blur(10px)',
                position: 'relative',
                // Enhanced mobile responsiveness
                '@media (max-width: 380px)': {
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 1.5,
                },
                '&::before': liteMode
                  ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 16,
                      right: 16,
                      height: '1px',
                      background:
                        theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg, rgb(128 211 255 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(40 145 200 / 60%) 100%)'
                          : 'linear-gradient(90deg, rgb(40 145 200 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(128 211 255 / 60%) 100%)',
                      opacity: 0.7,
                    }
                  : {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 16,
                      right: 16,
                      height: '1px',
                      background:
                        theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg, rgb(128 211 255 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(40 145 200 / 60%) 100%)'
                          : 'linear-gradient(90deg, rgb(40 145 200 / 60%) 0%, rgb(56 189 248 / 60%) 50%, rgb(128 211 255 / 60%) 100%)',
                      opacity: 0.7,
                    },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={liteMode}
                      onChange={(e) => setLiteMode(e.target.checked)}
                      size="medium"
                      sx={{
                        '& .MuiSwitch-switchBase': {
                          '&.Mui-checked': {
                            color: '#10b981',
                            '& + .MuiSwitch-track': {
                              backgroundColor: 'rgba(16, 185, 129, 0.4)',
                            },
                          },
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: '#e5e7eb',
                          borderRadius: 20,
                          border: '1px solid #d1d5db',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: isExtraSmall ? '0.85rem' : isMobile ? '0.9rem' : '0.95rem',
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {liteMode ? 'Lite Mode' : 'Full Mode'}
                    </Typography>
                  }
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <ButtonGroup
                  size={
                    isExtraSmall ? 'small' : liteMode ? 'small' : isMobile ? 'medium' : 'medium'
                  }
                  variant="outlined"
                  sx={{
                    '& .MuiButton-root': {
                      border: liteMode
                        ? theme.palette.mode === 'dark'
                          ? '1px solid rgb(128 211 255 / 25%)'
                          : '1px solid rgb(40 145 200 / 20%)'
                        : theme.palette.mode === 'dark'
                          ? '1px solid rgb(128 211 255 / 30%)'
                          : '1px solid rgb(40 145 200 / 25%)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      // Enhanced mobile touch targets
                      minHeight: isExtraSmall ? '40px' : isMobile ? '44px' : 'auto',
                      minWidth: isExtraSmall ? '70px' : isMobile ? '80px' : 'auto',
                      fontSize: isExtraSmall ? '0.75rem' : isMobile ? '0.8rem' : '0.85rem',
                      px: isExtraSmall ? 1 : isMobile ? 1.2 : 1.5,
                      '&:hover': {
                        transform: liteMode || isMobile ? 'translateY(-1px)' : 'none',
                        borderColor: 'rgb(128 211 255 / 80%)',
                      },
                      '&:active': {
                        transform: liteMode || isMobile ? 'translateY(0) scale(0.98)' : 'none',
                      },
                    },
                  }}
                >
                  <Button
                    variant={gameMode === 'pve' ? 'contained' : 'outlined'}
                    onClick={() => setGameMode('pve')}
                    startIcon={
                      <Typography
                        fontSize={
                          isExtraSmall
                            ? '0.75rem'
                            : liteMode
                              ? '0.8rem'
                              : isMobile
                                ? '0.9rem'
                                : '1rem'
                        }
                      >
                        🗡️
                      </Typography>
                    }
                    sx={{
                      fontSize: isExtraSmall
                        ? '0.75rem'
                        : liteMode
                          ? '0.8rem'
                          : isMobile
                            ? '0.85rem'
                            : '0.9rem',
                      px: isExtraSmall ? 1 : liteMode ? 0.5 : isMobile ? 1.2 : 1.5,
                      fontWeight: 600,
                      background:
                        gameMode === 'pve'
                          ? theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgb(128 211 255 / 35%) 0%, rgb(56 189 248 / 35%) 50%, rgb(40 145 200 / 35%) 100%)'
                            : 'linear-gradient(135deg, rgb(40 145 200 / 20%) 0%, rgb(56 189 248 / 20%) 50%, rgb(128 211 255 / 20%) 100%)'
                          : 'transparent',
                      borderColor: gameMode === 'pve' ? 'rgb(128 211 255 / 80%)' : undefined,
                      color: gameMode === 'pve' ? 'inherit' : 'inherit',
                    }}
                  >
                    PvE
                  </Button>
                  <Button
                    variant={gameMode === 'pvp' ? 'contained' : 'outlined'}
                    onClick={() => setGameMode('pvp')}
                    startIcon={
                      <Typography
                        fontSize={
                          isExtraSmall
                            ? '0.75rem'
                            : liteMode
                              ? '0.8rem'
                              : isMobile
                                ? '0.9rem'
                                : '1rem'
                        }
                      >
                        🛡️
                      </Typography>
                    }
                    sx={{
                      fontSize: isExtraSmall
                        ? '0.75rem'
                        : liteMode
                          ? '0.8rem'
                          : isMobile
                            ? '0.85rem'
                            : '0.9rem',
                      px: isExtraSmall ? 1 : liteMode ? 0.5 : isMobile ? 1.2 : 1.5,
                      fontWeight: 600,
                      background:
                        gameMode === 'pvp'
                          ? theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgb(128 211 255 / 35%) 0%, rgb(56 189 248 / 35%) 50%, rgb(40 145 200 / 35%) 100%)'
                            : 'linear-gradient(135deg, rgb(40 145 200 / 20%) 0%, rgb(56 189 248 / 20%) 50%, rgb(128 211 255 / 20%) 100%)'
                          : 'transparent',
                      borderColor: gameMode === 'pvp' ? 'rgb(128 211 255 / 80%)' : undefined,
                      color: gameMode === 'pvp' ? 'inherit' : 'inherit',
                    }}
                  >
                    PvP
                  </Button>
                  <Button
                    variant={gameMode === 'both' ? 'contained' : 'outlined'}
                    onClick={() => setGameMode('both')}
                    sx={{
                      fontSize: isExtraSmall
                        ? '0.75rem'
                        : liteMode
                          ? '0.8rem'
                          : isMobile
                            ? '0.85rem'
                            : '0.9rem',
                      px: isExtraSmall ? 1 : liteMode ? 0.5 : isMobile ? 1.2 : 1.5,
                      fontWeight: 600,
                      background:
                        gameMode === 'both'
                          ? theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgb(128 211 255 / 35%) 0%, rgb(56 189 248 / 35%) 50%, rgb(40 145 200 / 35%) 100%)'
                            : 'linear-gradient(135deg, rgb(40 145 200 / 20%) 0%, rgb(56 189 248 / 20%) 50%, rgb(128 211 255 / 20%) 100%)'
                          : 'transparent',
                      borderColor: gameMode === 'both' ? 'rgb(56 189 248 / 80%)' : undefined,
                      color: gameMode === 'both' ? 'inherit' : 'inherit',
                    }}
                  >
                    Both
                  </Button>
                </ButtonGroup>
              </Box>
            </Box>

            {/* Desktop Tabs with Action Buttons */}
            {!isMobile ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 4,
                  px: 4,
                  borderBottom: '1px solid',
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgb(128 211 255 / 18%)'
                      : 'rgb(40 145 200 / 15%)',
                  background: liteMode
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.6)'
                      : 'rgba(255, 255, 255, 0.9)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.7)'
                      : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: liteMode ? 'blur(6px)' : 'blur(8px)',
                  WebkitBackdropFilter: liteMode ? 'blur(6px)' : 'blur(8px)',
                  position: 'relative',
                  borderRadius: liteMode ? 0 : '8px 8px 0 0',
                }}
              >
                <Tabs
                  value={selectedTab}
                  onChange={(e, newValue) => setSelectedTab(newValue)}
                  sx={{
                    '& .MuiTab-root': {
                      fontSize: isTablet ? '0.9rem' : '1rem',
                      fontWeight: 600,
                      minHeight: isTablet ? 44 : 48,
                      padding: isTablet ? '10px 16px' : '12px 24px',
                      textTransform: 'none',
                      borderRadius: '8px 8px 0 0',
                      color:
                        theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.secondary,
                      transition: 'all 0.2s ease',
                      border: '1px solid transparent',
                      borderBottom: 'none',
                      marginRight: 1,
                      // Enhanced tablet and mobile touch targets
                      minWidth: isTablet ? '100px' : 'auto',
                      '&:hover': {
                        color:
                          theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.04)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderBottom: 'none',
                      },
                      '&.Mui-selected': {
                        color:
                          theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(128, 211, 255, 0.15)'
                            : 'rgba(40, 145, 200, 0.08)',
                        border: '1px solid rgba(40, 145, 200, 0.5)',
                        borderBottom: 'none',
                        borderRadius: '8px 8px 0 0',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      display: 'none',
                    },
                    minHeight: 48,
                  }}
                >
                  <Tab label="Penetration" {...a11yProps(0)} />
                  <Tab label="Critical" {...a11yProps(1)} />
                </Tabs>

                {/* Action buttons for current tab */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    alignItems: 'center',
                    backgroundColor: liteMode
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.4)'
                        : 'rgba(255, 255, 255, 0.7)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.3)'
                        : 'rgba(255, 255, 255, 0.5)',
                    borderBottom: '1px solid',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgb(128 211 255 / 15%)'
                        : 'rgb(40 145 200 / 12%)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  {selectedTab === 0 && (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <CheckCircleIcon
                            sx={{
                              fontSize: 18,
                              color:
                                theme.palette.mode === 'dark'
                                  ? 'rgb(128 211 255 / 90%)'
                                  : 'rgb(40 145 200 / 90%)',
                            }}
                          />
                        }
                        onClick={() => toggleAllPen(true)}
                        sx={{
                          fontSize: '0.875rem',
                          px: 2,
                          fontWeight: 600,
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 30%)'
                              : 'rgb(40 145 200 / 30%)',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 90%)'
                              : 'rgb(40 145 200 / 90%)',
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgb(128 211 255 / 8%) 0%, rgb(56 189 248 / 6%) 100%)'
                              : 'linear-gradient(135deg, rgb(40 145 200 / 8%) 0%, rgb(56 189 248 / 6%) 100%)',
                          '&:hover': {
                            borderColor:
                              theme.palette.mode === 'dark'
                                ? 'rgb(128 211 255 / 60%)'
                                : 'rgb(40 145 200 / 60%)',
                            background:
                              theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgb(128 211 255 / 12%) 0%, rgb(56 189 248 / 10%) 100%)'
                                : 'linear-gradient(135deg, rgb(40 145 200 / 12%) 0%, rgb(56 189 248 / 10%) 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 12px rgb(56 189 248 / 30%)'
                                : '0 4px 12px rgb(40 145 200 / 25%)',
                          },
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        Check All
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <ErrorIcon
                            sx={{
                              fontSize: 18,
                              color:
                                theme.palette.mode === 'dark'
                                  ? 'rgb(156 163 175 / 90%)'
                                  : 'rgb(107 114 128 / 90%)',
                            }}
                          />
                        }
                        onClick={() => toggleAllPen(false)}
                        sx={{
                          fontSize: '0.875rem',
                          px: 2,
                          fontWeight: 600,
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgb(156 163 175 / 30%)'
                              : 'rgb(107 114 128 / 30%)',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgb(156 163 175 / 90%)'
                              : 'rgb(107 114 128 / 90%)',
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgb(156 163 175 / 8%) 0%, rgb(107 114 128 / 6%) 100%)'
                              : 'linear-gradient(135deg, rgb(107 114 128 / 8%) 0%, rgb(156 163 175 / 6%) 100%)',
                          '&:hover': {
                            borderColor:
                              theme.palette.mode === 'dark'
                                ? 'rgb(156 163 175 / 60%)'
                                : 'rgb(107 114 128 / 60%)',
                            background:
                              theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgb(156 163 175 / 12%) 0%, rgb(107 114 128 / 10%) 100%)'
                                : 'linear-gradient(135deg, rgb(107 114 128 / 12%) 0%, rgb(156 163 175 / 10%) 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 12px rgb(156 163 175 / 30%)'
                                : '0 4px 12px rgb(107 114 128 / 25%)',
                          },
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        Uncheck All
                      </Button>
                    </>
                  )}
                  {selectedTab === 1 && (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <CheckCircleIcon
                            sx={{
                              fontSize: 18,
                              color:
                                theme.palette.mode === 'dark'
                                  ? 'rgb(128 211 255 / 90%)'
                                  : 'rgb(40 145 200 / 90%)',
                            }}
                          />
                        }
                        onClick={() => toggleAllCrit(true)}
                        sx={{
                          fontSize: '0.875rem',
                          px: 2,
                          fontWeight: 600,
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 30%)'
                              : 'rgb(40 145 200 / 30%)',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 90%)'
                              : 'rgb(40 145 200 / 90%)',
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgb(128 211 255 / 10%) 0%, rgb(56 189 248 / 5%) 100%)'
                              : 'linear-gradient(135deg, rgb(40 145 200 / 8%) 0%, rgb(56 189 248 / 4%) 100%)',
                          '&:hover': {
                            borderColor:
                              theme.palette.mode === 'dark'
                                ? 'rgb(128 211 255 / 60%)'
                                : 'rgb(40 145 200 / 60%)',
                            background:
                              theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgb(128 211 255 / 15%) 0%, rgb(56 189 248 / 8%) 100%)'
                                : 'linear-gradient(135deg, rgb(40 145 200 / 12%) 0%, rgb(56 189 248 / 6%) 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 12px rgb(56 189 248 / 20%)'
                                : '0 4px 12px rgb(40 145 200 / 10%)',
                          },
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        Check All
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <ErrorIcon
                            sx={{
                              fontSize: 18,
                              color:
                                theme.palette.mode === 'dark'
                                  ? 'rgb(148 163 184 / 90%)'
                                  : 'rgb(148 163 184 / 80%)',
                            }}
                          />
                        }
                        onClick={() => toggleAllCrit(false)}
                        sx={{
                          fontSize: '0.875rem',
                          px: 2,
                          fontWeight: 600,
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgb(148 163 184 / 30%)'
                              : 'rgb(148 163 184 / 20%)',
                          color:
                            theme.palette.mode === 'dark'
                              ? 'rgb(148 163 184 / 90%)'
                              : 'rgb(148 163 184 / 80%)',
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgb(148 163 184 / 10%) 0%, rgb(148 163 184 / 5%) 100%)'
                              : 'linear-gradient(135deg, rgb(148 163 184 / 8%) 0%, rgb(148 163 184 / 4%) 100%)',
                          '&:hover': {
                            borderColor:
                              theme.palette.mode === 'dark'
                                ? 'rgb(148 163 184 / 60%)'
                                : 'rgb(148 163 184 / 60%)',
                            background:
                              theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgb(148 163 184 / 15%) 0%, rgb(148 163 184 / 8%) 100%)'
                                : 'linear-gradient(135deg, rgb(148 163 184 / 12%) 0%, rgb(148 163 184 / 6%) 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow:
                              theme.palette.mode === 'dark'
                                ? '0 4px 12px rgb(148 163 184 / 20%)'
                                : '0 4px 12px rgb(148 163 184 / 10%)',
                          },
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        Uncheck All
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            ) : (
              /* Mobile Tabs */
              <Box
                sx={{
                  mb: isMobile ? 3 : 4,
                  px: isMobile ? 2 : 4,
                }}
              >
                <Tabs
                  value={selectedTab}
                  onChange={(e, newValue) => setSelectedTab(newValue)}
                  variant={isMobile ? 'fullWidth' : 'standard'}
                  sx={{
                    '& .MuiTab-root': {
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      fontWeight: 600,
                      minHeight: isMobile ? 44 : 48,
                      padding: isMobile ? '8px 16px' : '12px 24px',
                      textTransform: 'none',
                      borderRadius: '8px 8px 0 0',
                      color:
                        theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.secondary,
                      transition: 'all 0.2s ease',
                      border: '1px solid transparent',
                      borderBottom: 'none',
                      marginRight: isMobile ? 0 : 1,
                      '&:hover': {
                        color:
                          theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.04)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderBottom: 'none',
                      },
                      '&.Mui-selected': {
                        color:
                          theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(128, 211, 255, 0.15)'
                            : 'rgba(40, 145, 200, 0.08)',
                        border: '1px solid rgba(40, 145, 200, 0.5)',
                        borderBottom: 'none',
                        borderRadius: '8px 8px 0 0',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      display: 'none',
                    },
                    minHeight: isMobile ? 44 : 48,
                  }}
                >
                  <Tab label="Penetration" {...a11yProps(0)} />
                  <Tab label="Critical" {...a11yProps(1)} />
                </Tabs>
              </Box>
            )}

            {/* Tab Content */}
            <Box sx={{ px: liteMode ? 1.5 : isMobile ? 1 : 3, pb: 3 }}>
              <TabPanel value={selectedTab} index={0}>
                {(() => {
                  const filteredPenData = getFilteredItems(penetrationData, 'pen');
                  return liteMode ? (
                    // Lite mode: render all penetration items in a single flattened list
                    <List sx={{ p: 0, overflowX: 'hidden' }}>
                      {Object.values(filteredPenData).flatMap((items, categoryIndex) =>
                        items.map((item: any, itemIndex: number) =>
                          renderItem(
                            item,
                            itemIndex,
                            Object.keys(filteredPenData)[categoryIndex] as keyof CalculatorData,
                            updatePenItem,
                          ),
                        ),
                      )}
                    </List>
                  ) : (
                    <>
                      {renderSection(
                        'Group Buffs',
                        filteredPenData.groupBuffs,
                        'groupBuffs',
                        updatePenItem,
                      )}
                      {renderSection(
                        'Gear & Enchantments',
                        filteredPenData.gear,
                        'gear',
                        updatePenItem,
                      )}
                      {renderSection(
                        'Passives & Skills',
                        filteredPenData.passives,
                        'passives',
                        updatePenItem,
                      )}
                      {renderSection('Champion Points', filteredPenData.cp, 'cp', updatePenItem)}
                    </>
                  );
                })()}

                {/* Sentinel element for intersection observer */}
                <div
                  ref={selectedTab === 0 ? sentinelRef : undefined}
                  style={{ height: '1px', marginTop: '16px' }}
                />

                {selectedTab === 0 && (
                  <StickyFooter
                    isLiteMode={liteMode}
                    sx={{
                      position: 'relative',
                      p: liteMode ? 1 : 3,
                      borderRadius: '8px !important',
                      background: liteMode
                        ? theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgb(7 12 20 / 80%) 0%, rgba(15, 23, 42, 0.9) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)'
                        : theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      border: liteMode
                        ? `1px solid ${theme.palette.mode === 'dark' ? 'rgb(123 123 123 / 20%)' : 'rgba(203, 213, 225, 0.5)'}`
                        : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`,
                      boxShadow: liteMode
                        ? 'none'
                        : theme.palette.mode === 'dark'
                          ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                          : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      backdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                      WebkitBackdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                      transition: 'all 0.3s ease',
                      ...(!liteMode && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 12,
                          right: 12,
                          height: 3,
                          background:
                            'linear-gradient(90deg, rgb(128 211 255 / 80%) 0%, rgb(56 189 248 / 80%) 50%, rgb(40 145 200 / 80%) 100%)',
                          borderRadius: '2px 2px 0 0',
                        },
                      }),
                    }}
                  >
                    {/* Mobile-optimized layout: horizontal on mobile, responsive on desktop */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'row', sm: 'row' },
                        alignItems: { xs: 'center', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: { xs: 1, sm: 3 },
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        px: liteMode ? '30px' : { xs: 1, sm: 0 },
                      pb: liteMode ? '24px' : 0,
                      }}
                    >
                      {/* Left - Value */}
                      <Box
                        sx={{
                          textAlign: { xs: 'left', sm: 'left' },
                          flex: { xs: 1, sm: 1 },
                          pl: { xs: 0.5, sm: 0 },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.text.secondary,
                            fontSize: { xs: '0.8rem', sm: '0.85rem' },
                            opacity: 0.8,
                            mb: { xs: 0.5, sm: 0.25 },
                          }}
                        >
                          Total Penetration
                        </Typography>
                        <Typography
                          variant={isMobile ? 'h6' : 'h5'}
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: '1.8rem', sm: '1.8rem' },
                            color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                            fontFamily: 'Inter, sans-serif',
                            lineHeight: 1.2,
                          }}
                        >
                          {penTotal.toLocaleString()}
                        </Typography>
                      </Box>

                      {/* Right - Status and Info */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: { xs: 'flex-end', sm: 'flex-end' },
                          gap: { xs: 1, sm: 1 },
                          textAlign: { xs: 'right', sm: 'right' },
                          minWidth: { xs: 'auto', sm: '200px' },
                          flexShrink: 0,
                          pr: { xs: 0.5, sm: 0 },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: { xs: 0.75, sm: 1 },
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 0.75, sm: 1 },
                            borderRadius: '8px',
                            background:
                              penStatus === 'at-cap'
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(34, 197, 94, 0.1)'
                                : penStatus === 'over-cap'
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(251, 146, 60, 0.15)'
                                    : 'rgba(251, 146, 60, 0.1)'
                                  : theme.palette.mode === 'dark'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${
                              penStatus === 'at-cap'
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : 'rgba(34, 197, 94, 0.2)'
                                : penStatus === 'over-cap'
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(251, 146, 60, 0.3)'
                                    : 'rgba(251, 146, 60, 0.2)'
                                  : theme.palette.mode === 'dark'
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(239, 68, 68, 0.2)'
                            }`,
                          }}
                        >
                          {penStatus === 'at-cap' && (
                            <CheckCircleIcon
                              sx={{ fontSize: isMobile ? 18 : 16, color: '#22c55e' }}
                            />
                          )}
                          {penStatus === 'over-cap' && (
                            <ErrorIcon sx={{ fontSize: isMobile ? 18 : 16, color: '#fb923c' }} />
                          )}
                          {penStatus === 'under-cap' && (
                            <HelpOutlineIcon
                              sx={{ fontSize: isMobile ? 18 : 16, color: '#ef4444' }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: '0.85rem', sm: '0.8rem' },
                              color:
                                penStatus === 'at-cap'
                                  ? '#22c55e'
                                  : penStatus === 'over-cap'
                                    ? '#fb923c'
                                    : '#ef4444',
                            }}
                          >
                            {penStatus === 'at-cap'
                              ? 'Optimal'
                              : penStatus === 'over-cap'
                                ? 'Over Cap'
                                : 'Below Cap'}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            color: theme.palette.text.secondary,
                            opacity: 0.7,
                            lineHeight: 1.3,
                          }}
                        >
                          {gameMode === 'pve'
                            ? 'Target: 18,200-18,999'
                            : gameMode === 'pvp'
                              ? 'Target: 33,300-37,000'
                              : isMobile
                                ? 'PvE: 18.2K-19K\nPvP: 33.3K-37K'
                                : 'PvE: 18.2K-19K | PvP: 33.3K-37K'}
                        </Typography>
                      </Box>
                    </Box>
                  </StickyFooter>
                )}
              </TabPanel>

              <TabPanel value={selectedTab} index={1}>
                {(() => {
                  const filteredCritData = getFilteredItems(criticalData, 'crit');
                  return liteMode ? (
                    // Lite mode: render all critical items in a single flattened list
                    <List sx={{ p: 0, overflowX: 'hidden' }}>
                      {Object.values(filteredCritData).flatMap((items, categoryIndex) =>
                        items.map((item: any, itemIndex: number) =>
                          renderItem(
                            item,
                            itemIndex,
                            Object.keys(filteredCritData)[categoryIndex] as keyof CalculatorData,
                            updateCritItem,
                          ),
                        ),
                      )}
                    </List>
                  ) : (
                    <>
                      {renderSection(
                        'Base & Group Buffs',
                        filteredCritData.groupBuffs,
                        'groupBuffs',
                        updateCritItem,
                      )}
                      {renderSection(
                        'Gear & Enchantments',
                        filteredCritData.gear,
                        'gear',
                        updateCritItem,
                      )}
                      {renderSection(
                        'Passives & Skills',
                        filteredCritData.passives,
                        'passives',
                        updateCritItem,
                      )}
                      {renderSection('Champion Points', filteredCritData.cp, 'cp', updateCritItem)}
                    </>
                  );
                })()}

                {/* Sentinel element for intersection observer */}
                <div
                  ref={selectedTab === 1 ? sentinelRef : undefined}
                  style={{ height: '1px', marginTop: '16px' }}
                />

                {selectedTab === 1 && (
                  <StickyFooter
                    isLiteMode={liteMode}
                    sx={{
                      position: 'relative',
                      p: liteMode ? 1 : 3,
                      borderRadius: '8px !important',
                      background: liteMode
                        ? theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgb(7 12 20 / 80%) 0%, rgba(15, 23, 42, 0.9) 100%)'
                          : 'linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)'
                        : theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      border: liteMode
                        ? `1px solid ${theme.palette.mode === 'dark' ? 'rgb(123 123 123 / 20%)' : 'rgba(203, 213, 225, 0.5)'}`
                        : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`,
                      boxShadow: liteMode
                        ? 'none'
                        : theme.palette.mode === 'dark'
                          ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                          : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      backdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                      WebkitBackdropFilter: liteMode ? 'blur(10px)' : 'blur(20px)',
                      transition: 'all 0.3s ease',
                      ...(!liteMode && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 12,
                          right: 12,
                          height: 3,
                          background:
                            'linear-gradient(90deg, rgb(128 211 255 / 80%) 0%, rgb(56 189 248 / 80%) 50%, rgb(40 145 200 / 80%) 100%)',
                          borderRadius: '2px 2px 0 0',
                        },
                      }),
                    }}
                  >
                    {/* Mobile-optimized layout: horizontal on mobile, responsive on desktop */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'row', sm: 'row' },
                        alignItems: { xs: 'center', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: { xs: 1, sm: 3 },
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        px: liteMode ? '30px' : { xs: 1, sm: 0 },
                      pb: liteMode ? '24px' : 0,
                      }}
                    >
                      {/* Left - Value */}
                      <Box
                        sx={{
                          textAlign: { xs: 'left', sm: 'left' },
                          flex: { xs: 1, sm: 1 },
                          pl: { xs: 0.5, sm: 0 },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.text.secondary,
                            fontSize: { xs: '0.8rem', sm: '0.85rem' },
                            opacity: 0.8,
                            mb: { xs: 0.5, sm: 0.25 },
                          }}
                        >
                          Total Critical Damage
                        </Typography>
                        <Typography
                          variant={isMobile ? 'h6' : 'h5'}
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: '1.8rem', sm: '1.8rem' },
                            color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a',
                            fontFamily: 'Inter, sans-serif',
                            lineHeight: 1.2,
                          }}
                        >
                          {critTotal}%
                        </Typography>
                      </Box>

                      {/* Right - Status and Info */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: { xs: 'flex-end', sm: 'flex-end' },
                          gap: { xs: 1, sm: 1 },
                          textAlign: { xs: 'right', sm: 'right' },
                          minWidth: { xs: 'auto', sm: '200px' },
                          flexShrink: 0,
                          pr: { xs: 0.5, sm: 0 },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: { xs: 0.75, sm: 1 },
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 0.75, sm: 1 },
                            borderRadius: '8px',
                            background:
                              critStatus === 'at-cap'
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(34, 197, 94, 0.1)'
                                : critStatus === 'over-cap'
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(251, 146, 60, 0.15)'
                                    : 'rgba(251, 146, 60, 0.1)'
                                  : theme.palette.mode === 'dark'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${
                              critStatus === 'at-cap'
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : 'rgba(34, 197, 94, 0.2)'
                                : critStatus === 'over-cap'
                                  ? theme.palette.mode === 'dark'
                                    ? 'rgba(251, 146, 60, 0.3)'
                                    : 'rgba(251, 146, 60, 0.2)'
                                  : theme.palette.mode === 'dark'
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(239, 68, 68, 0.2)'
                            }`,
                          }}
                        >
                          {critStatus === 'at-cap' && (
                            <CheckCircleIcon
                              sx={{ fontSize: isMobile ? 18 : 16, color: '#22c55e' }}
                            />
                          )}
                          {critStatus === 'over-cap' && (
                            <ErrorIcon sx={{ fontSize: isMobile ? 18 : 16, color: '#fb923c' }} />
                          )}
                          {critStatus === 'under-cap' && (
                            <HelpOutlineIcon
                              sx={{ fontSize: isMobile ? 18 : 16, color: '#ef4444' }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: '0.85rem', sm: '0.8rem' },
                              color:
                                critStatus === 'at-cap'
                                  ? '#22c55e'
                                  : critStatus === 'over-cap'
                                    ? '#fb923c'
                                    : '#ef4444',
                            }}
                          >
                            {critStatus === 'at-cap'
                              ? 'Optimal'
                              : critStatus === 'over-cap'
                                ? 'Over Cap'
                                : 'Below Cap'}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            color: theme.palette.text.secondary,
                            opacity: 0.7,
                            lineHeight: 1.3,
                          }}
                        >
                          {gameMode === 'pve'
                            ? 'Target: 125%+'
                            : gameMode === 'pvp'
                              ? 'Target: 100%+'
                              : isMobile
                                ? 'PvE: 125%+\nPvP: 100%+'
                                : 'PvE: 125%+ | PvP: 100%+'}
                        </Typography>
                      </Box>
                    </Box>
                  </StickyFooter>
                )}
              </TabPanel>
            </Box>

            {/* Total Section - moved inside tab content */}
          </CalculatorCard>

          {/* Legend */}
          {!liteMode && (
            <Box sx={{ mt: 4, p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Legend & Cap Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }}
                  />
                  <Typography variant="body2">Optimal Range</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }}
                  />
                  <Typography variant="body2">Over Cap</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Below Cap</Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Grey italic numbers show per-stack values for stackable buffs
              </Typography>
            </Box>
          )}
        </Container>
      </CalculatorContainer>
    </>
  );
});

export { Calculator };
