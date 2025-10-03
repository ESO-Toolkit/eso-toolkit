import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  HelpOutline as HelpOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  Autorenew as AutorenewIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Container,
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
  Tooltip,
  Rating,
  IconButton,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { styled, useTheme, alpha, Theme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import {
  CalculatorItem,
  CalculatorData,
  PENETRATION_DATA,
  CRITICAL_DATA,
  ARMOR_RESISTANCE_DATA,
  PEN_OPTIMAL_MIN_PVE,
  PEN_OPTIMAL_MAX_PVE,
  PEN_OPTIMAL_MIN_PVP,
  PEN_OPTIMAL_MAX_PVP,
  CRIT_OPTIMAL_MIN,
  CRIT_OPTIMAL_MAX,
  ARMOR_RESISTANCE_OPTIMAL_MIN,
  ARMOR_RESISTANCE_OPTIMAL_MAX,
  ARMOR_RESISTANCE_CAP,
  ARMOR_QUALITY_LABELS,
} from '../data/skill-lines/calculator-data';
import {
  extractSlotFromItemName,
  isMutuallyExclusiveArmorItem,
  findConflictingItems,
} from '../utils/armorSlotUtils';

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
    armor: [
      'Major Resolve',
      'Minor Resolve',
      'Heavy Armor Passive',
      'Light Armor Passive',
      'Nord Passive',
      'Breton Passive',
      'Dragonknight Passive',
      'Warden Passive Per Skill',
      'Templar Passive',
      'Arcanist Passive',
      'Runic Sunder',
      'Fortified',
      'Bulwark',
      'Armor Potions',
      'Lord Warden',
      'Ozezans',
      'Markyn Ring of Majesty',
      'Defending Trait',
      'Armor Line Bonus',
      'Shield',
      'Shield Reinforced',
      'Armor Master',
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
    armor: [
      'Major Resolve',
      'Minor Resolve',
      'Heavy Armor Passive',
      'Light Armor Passive',
      'Nord Passive',
      'Breton Passive',
      'Dragonknight Passive',
      'Warden Passive Per Skill',
      'Templar Passive',
      'Arcanist Passive',
      'Runic Sunder',
      'Fortified',
      'Bulwark',
      'Armor Potions',
      'Lord Warden',
      'Ozezans',
      'Markyn Ring of Majesty',
      'Defending Trait',
      'Armor Line Bonus',
      'Shield',
      'Shield Reinforced',
      'Armor Master',
    ],
  },
};

type IndexedCalculatorItem = CalculatorItem & { originalIndex?: number; id?: string };

// Helper function to generate unique ID for items
const _generateItemId = (category: string, name: string, index: number): string => {
  return `${category}-${name}-${index}`;
};

// Helper function to find item by ID in any category
const _findItemById = (
  data: CalculatorData,
  id: string,
): { category: keyof CalculatorData; index: number; item: CalculatorItem } | null => {
  for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
    const index = data[category].findIndex((item) => (item as any).id === id);
    if (index !== -1) {
      return { category, index, item: data[category][index] };
    }
  }
  return null;
};

// Quantity input component to manage local state properly
const QuantityInput: React.FC<{
  item: CalculatorItem;
  category: keyof CalculatorData;
  resolvedIndex: number;
  updateFunction: (
    category: keyof CalculatorData,
    index: number,
    updates: Partial<CalculatorItem>,
  ) => void;
  isMobile: boolean;
}> = ({ item, category, resolvedIndex, updateFunction, isMobile }) => {
  const theme = useTheme();
  const hasQuantity = item.maxQuantity && item.maxQuantity > 1;

  // Check if this is an armor passive item
  const isArmorPassive = item.name === 'Light Armor Passive' || item.name === 'Heavy Armor Passive';

  // For armor passives, show a static display instead of input
  if (isArmorPassive) {
    return (
      <Tooltip title="Auto-calculated based on equipped armor pieces" arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: isMobile ? '50px' : '56px',
            height: isMobile ? '36px' : '32px',
            px: isMobile ? 1 : 2,
            borderRadius: 1,
            fontWeight: 700,
            fontSize: isMobile ? '14px' : '16px',
            color: item.enabled
              ? '#f472b6' // Pink for both light and heavy armor
              : theme.palette.mode === 'dark'
                ? 'rgba(148, 163, 184, 0.5)'
                : 'rgba(100, 116, 139, 0.5)',
            backgroundColor: item.enabled
              ? item.name === 'Light Armor Passive'
                ? theme.palette.mode === 'dark'
                  ? 'rgba(167, 139, 250, 0.15)'
                  : 'rgba(167, 139, 250, 0.1)'
                : theme.palette.mode === 'dark'
                  ? 'rgba(244, 114, 182, 0.15)'
                  : 'rgba(244, 114, 182, 0.1)'
              : theme.palette.mode === 'dark'
                ? 'rgba(30, 41, 59, 0.3)'
                : 'rgba(241, 245, 249, 0.5)',
            border: `2px dashed ${
              item.enabled
                ? item.name === 'Light Armor Passive'
                  ? 'rgba(167, 139, 250, 0.5)'
                  : 'rgba(244, 114, 182, 0.5)'
                : theme.palette.mode === 'dark'
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'rgba(148, 163, 184, 0.3)'
            }`,
            transition: 'all 0.2s ease',
            cursor: 'default',
            position: 'relative',
            '&::before': {
              content: '"🔒"',
              position: 'absolute',
              top: isMobile ? '-6px' : '-6px',
              right: isMobile ? '-6px' : '-6px',
              fontSize: isMobile ? '10px' : '12px',
              opacity: item.enabled ? 0.7 : 0.4,
            },
            '&:hover': {
              backgroundColor: item.enabled
                ? item.name === 'Light Armor Passive'
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(167, 139, 250, 0.25)'
                    : 'rgba(167, 139, 250, 0.2)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(244, 114, 182, 0.25)'
                    : 'rgba(244, 114, 182, 0.2)'
                : theme.palette.mode === 'dark'
                  ? 'rgba(30, 41, 59, 0.4)'
                  : 'rgba(241, 245, 249, 0.6)',
            },
          }}
        >
          {item.quantity > 0 ? item.quantity : '-'}
        </Box>
      </Tooltip>
    );
  }

  // Local state for quantity input to prevent keyboard dismissal on mobile
  const [localQuantity, setLocalQuantity] = useState<string>(
    hasQuantity ? item.quantity.toString() : '-',
  );
  const [_isFocused, _setIsFocused] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update function to prevent keyboard dismissal on mobile
  const debouncedUpdate = useCallback(
    (value: number) => {
      updateFunction(category, resolvedIndex, { quantity: value });
    },
    [category, resolvedIndex, updateFunction],
  );

  // Handle quantity input change with debouncing
  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!hasQuantity) return;

      const newValue = e.target.value;
      setLocalQuantity(newValue);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Parse and validate the input
      const numValue = parseInt(newValue);
      if (!isNaN(numValue)) {
        const clampedValue = Math.max(
          item.minQuantity || 0,
          Math.min(item.maxQuantity || 100, numValue),
        );

        // Debounce the update (longer delay for mobile)
        const delay = isMobile ? 500 : 300;
        timeoutRef.current = setTimeout(() => {
          debouncedUpdate(clampedValue);
        }, delay);
      }
    },
    [hasQuantity, item.minQuantity, item.maxQuantity, debouncedUpdate, isMobile],
  );

  // Handle input focus/blur events
  const handleFocus = useCallback(() => {
    _setIsFocused(true);
    setShowError(false);
  }, []);

  const handleBlur = useCallback(() => {
    _setIsFocused(false);

    if (!hasQuantity) return;

    // Final validation on blur
    const numValue = parseInt(localQuantity);
    if (
      isNaN(numValue) ||
      numValue < (item.minQuantity || 0) ||
      numValue > (item.maxQuantity || 100)
    ) {
      setShowError(true);
      // Reset to valid value
      setLocalQuantity(item.quantity.toString());
    }
  }, [localQuantity, item.minQuantity, item.maxQuantity, item.quantity, hasQuantity]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TextField
      size={isMobile ? 'medium' : 'small'}
      type="number"
      value={hasQuantity ? localQuantity : '-'}
      onChange={hasQuantity ? handleQuantityChange : undefined}
      onFocus={hasQuantity ? handleFocus : undefined}
      onBlur={hasQuantity ? handleBlur : undefined}
      error={showError}
      disabled={!hasQuantity || item.locked}
      placeholder={hasQuantity ? item.quantityTitle || undefined : 'N/A'}
      inputProps={{
        min: hasQuantity ? item.minQuantity || 0 : 0,
        max: hasQuantity ? item.maxQuantity || 100 : 0,
        step: hasQuantity ? item.step || 1 : 1,
        readOnly: !hasQuantity,
        style: {
          fontSize: isMobile ? '18px' : '14px',
          fontWeight: isMobile ? 500 : 400,
          textAlign: 'center',
          padding: isMobile ? '8px 4px' : '4px 2px',
        },
      }}
      sx={{
        width: isMobile
          ? hasQuantity && (item.maxQuantity || 0) >= 100
            ? '60px'
            : '50px'
          : '56px',
        minWidth: isMobile
          ? hasQuantity && (item.maxQuantity || 0) >= 100
            ? '60px'
            : '50px'
          : '56px',
        '& .MuiInputBase-root': {
          fontSize: isMobile ? '14px' : '14px',
          padding: isMobile ? '6px 3px' : '4px 2px',
          height: isMobile ? '36px' : '32px',
          minHeight: isMobile ? '36px' : '32px',
          boxSizing: 'border-box',
          backgroundColor: !hasQuantity
            ? theme.palette.mode === 'dark'
              ? 'rgba(30, 41, 59, 0.5)'
              : 'rgba(241, 245, 249, 0.8)'
            : 'transparent',
          opacity: !hasQuantity ? 0.6 : 1,
          '&:hover': {
            backgroundColor: !hasQuantity
              ? theme.palette.mode === 'dark'
                ? 'rgba(30, 41, 59, 0.5)'
                : 'rgba(241, 245, 249, 0.8)'
              : 'rgba(40 145 200, 0.05)',
          },
        },
        '& .MuiInputBase-input': {
          padding: isMobile ? '6px 3px' : '4px 2px',
          textAlign: 'center',
          fontSize: isMobile ? '14px' : '14px',
          fontWeight: 500,
          color: !hasQuantity
            ? theme.palette.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.8)'
              : 'rgba(100, 116, 139, 0.8)'
            : 'inherit',
          cursor: !hasQuantity ? 'not-allowed' : 'text',
          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          '&[type=number]': {
            MozAppearance: 'textfield',
          },
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: !hasQuantity
            ? theme.palette.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.3)'
              : 'rgba(148, 163, 184, 0.4)'
            : 'rgba(156, 163, 175, 0.3)',
          borderWidth: '1px',
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
          borderColor: 'error.main',
        },
      }}
    />
  );
};

// Helper function to validate calculator data integrity
const _validateCalculatorData = (data: CalculatorData): boolean => {
  let isValid = true;
  const itemTracker = new Map<string, { category: string; index: number; id?: string }[]>();

  // Check for duplicate items in each category and track all items
  for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
    const items = data[category];
    const nameMap = new Map<string, number[]>();

    items.forEach((item, index) => {
      // Track all items for cross-category validation
      if (!itemTracker.has(item.name)) {
        itemTracker.set(item.name, []);
      }
      itemTracker.get(item.name)!.push({ category, index, id: (item as any).id });

      // Check within category duplicates
      if (!nameMap.has(item.name)) {
        nameMap.set(item.name, []);
      }
      nameMap.get(item.name)!.push(index);
    });

    // Check for duplicates within category
    for (const [name, indices] of nameMap.entries()) {
      if (indices.length > 1) {
        // eslint-disable-next-line no-console
        console.error(
          `❌ [VALIDATION] Duplicate item "${name}" found in ${category} at indices: ${indices.join(', ')}`,
        );
        isValid = false;
      }
    }
  }

  // Check for cross-category duplicates (should only exist for specific items like armor passives)
  for (const [itemName, locations] of itemTracker.entries()) {
    if (locations.length > 1 && !itemName.includes('Armor Passive')) {
      // eslint-disable-next-line no-console
      console.error(
        `❌ [VALIDATION] Item "${itemName}" duplicated across categories:`,
        locations.map((loc) => `${loc.category}[${loc.index}]`).join(', '),
      );
      isValid = false;
    }
  }

  // TEMPORARILY DISABLED: Validate armor passive items specifically
  // This validation is preventing normal operation when duplicates occur
  // TODO: Fix the root cause of duplication instead of just detecting it
  /*
  const lightArmorPassives = data.gear.filter(item => item.name === 'Light Armor Passive');
  const heavyArmorPassives = data.gear.filter(item => item.name === 'Heavy Armor Passive');

  if (lightArmorPassives.length > 1) {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Multiple Light Armor Passive items found: ${lightArmorPassives.length}`);
    isValid = false;
  }

  if (heavyArmorPassives.length > 1) {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Multiple Heavy Armor Passive items found: ${heavyArmorPassives.length}`);
    isValid = false;
  }
  */

  // Validate gear category structure
  const expectedGearItems = [
    'Light Helm',
    'Light Chest',
    'Light Shoulders',
    'Light Gloves',
    'Light Boots',
    'Light Belt',
    'Medium Helm',
    'Medium Chest',
    'Medium Shoulders',
    'Medium Gloves',
    'Medium Boots',
    'Medium Belt',
    'Heavy Helm',
    'Heavy Chest',
    'Heavy Shoulders',
    'Heavy Gloves',
    'Heavy Boots',
    'Heavy Belt',
  ];

  expectedGearItems.forEach((expectedName, expectedIndex) => {
    const actualItem = data.gear[expectedIndex];
    if (!actualItem || actualItem.name !== expectedName) {
      // eslint-disable-next-line no-console
      console.error(
        `❌ [VALIDATION] Expected "${expectedName}" at gear[${expectedIndex}], found:`,
        actualItem?.name || 'undefined',
      );
      isValid = false;
    }
  });

  // Check for missing or invalid resistance values
  for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
    data[category].forEach((item, index) => {
      if (!item.resistanceValue || item.resistanceValue === '-') {
        // eslint-disable-next-line no-console
        console.error(
          `❌ [VALIDATION] Invalid resistance value for ${category}[${index}] (${item.name}): "${item.resistanceValue}"`,
        );
        isValid = false;
      }
    });
  }

  return isValid;
};

// Mode type
type GameMode = 'pve' | 'pvp' | 'both';
type SummaryStatus = 'at-cap' | 'over-cap' | 'under-cap';

// Styled components
const CalculatorContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode: _liteMode }) => ({
  // minHeight: '100vh', // Removed - interferes with sticky positioning
  background: theme.palette.mode === 'dark' ? theme.palette.background.default : 'transparent',
  position: 'static', // Changed from relative
  width: '100%',
  maxWidth: '100vw',
  display: 'block', // Changed from flex
  // flexDirection: 'column', // Removed
  // alignItems: 'center', // Removed
  // Remove stacking context creators
  overflow: 'visible',
  transform: 'none',
  willChange: 'auto',
  contain: 'none',
}));

const CalculatorCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'liteMode',
})<{ liteMode?: boolean }>(({ theme, liteMode }) => ({
  width: '100%',
  maxWidth: liteMode ? '100%' : '1200px',
  margin: '0 auto',
  padding: liteMode ? 0 : '24px',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('sm')]: {
    padding: liteMode ? 0 : 0,
  },
  background: liteMode
    ? 'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)'
    : theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : 'linear-gradient(180deg, rgb(40 145 200 / 6%) 0%, rgba(248, 250, 252, 0.9) 100%)',
  borderRadius: liteMode ? 22 : 22,
  minHeight: 'auto',
}));

// JavaScript-based sticky positioning hook
const useStickyFooter = (
  liteMode: boolean,
  theme: Theme,
  isMobile: boolean,
): {
  footerRef: React.RefObject<HTMLDivElement | null>;
  placeholderRef: React.RefObject<HTMLDivElement | null>;
  placeholderHeight: string;
  footerStyle: React.CSSProperties;
  isSticky: boolean;
} => {
  const footerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [footerStyle, setFooterStyle] = useState<React.CSSProperties>({});
  const [placeholderHeight, setPlaceholderHeight] = useState<string>('auto');

  const rafRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);
  const cardRectSignatureRef = useRef<string>('');
  const placeholderWidthRef = useRef<number>(0);

  const runMeasurement = useCallback(() => {
    const footerEl = footerRef.current;
    const placeholderEl = placeholderRef.current;

    if (!footerEl) {
      return;
    }

    const calculatorCard = footerEl.closest('[data-calculator-card]') as HTMLElement | null;
    if (!calculatorCard) {
      return;
    }

    const cardRect = calculatorCard.getBoundingClientRect();
    const footerRect = footerEl.getBoundingClientRect();
    const placeholderRect = placeholderEl?.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const cardBottomThreshold = viewportHeight - 8;
    const shouldStick = cardRect.bottom >= cardBottomThreshold && cardRect.top < viewportHeight;

    if (!shouldStick) {
      if (isSticky) {
        setIsSticky(false);
        setFooterStyle({});
        setPlaceholderHeight('auto');
      }
      return;
    }

    const cardStyles = window.getComputedStyle(calculatorCard);
    const paddingLeft = parseFloat(cardStyles.paddingLeft) || 0;
    const paddingRight = parseFloat(cardStyles.paddingRight) || 0;

    const width = placeholderRect
      ? placeholderRect.width
      : Math.max(0, cardRect.width - paddingLeft - paddingRight);
    const left = placeholderRect ? placeholderRect.left : cardRect.left + paddingLeft;

    const baseBottom = 16;
    // Add space for feedback button on mobile (16px for button + 8px spacing = 24px)
    const mobileFeedbackOffset = isMobile ? 24 : 0;
    const adjustedBaseBottom = baseBottom + mobileFeedbackOffset;
    const maxBottom = Math.max(
      adjustedBaseBottom,
      viewportHeight - cardRect.top - footerRect.height,
    );
    const minBottom = Math.max(0, viewportHeight - cardRect.bottom);
    const desiredBottom = minBottom > 0 ? minBottom : adjustedBaseBottom;
    const clampedBottom = Math.min(desiredBottom, maxBottom);

    const nextStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      bottom: `${Math.round(clampedBottom)}px`,
      zIndex: isMobile ? 1001 : 11, // Ensure footer is above feedback button on mobile
      boxSizing: 'border-box',
      // Preserve background styling - prevent transparency in full mode
      background: liteMode
        ? 'transparent'
        : theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
      borderRadius: liteMode ? '0' : '12px',
      boxShadow: liteMode
        ? 'none'
        : theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    };

    const footerHeight = `${Math.round(footerRect.height)}px`;
    if (placeholderHeight !== footerHeight) {
      setPlaceholderHeight(footerHeight);
    }

    const newSignature = `${cardRect.left}|${cardRect.width}|${cardRect.top}`;
    const widthChanged = Math.round(placeholderWidthRef.current) !== Math.round(width);
    if (cardRectSignatureRef.current !== newSignature || widthChanged || !isSticky) {
      cardRectSignatureRef.current = newSignature;
      placeholderWidthRef.current = width;
      setFooterStyle(nextStyle);
      if (!isSticky) {
        setIsSticky(true);
      }
    } else {
      // small positional adjustments
      setFooterStyle((prev) => ({ ...prev, ...nextStyle }));
      if (!isSticky) {
        setIsSticky(true);
      }
    }
  }, [isSticky, placeholderHeight, liteMode, theme.palette.mode, isMobile]);

  const scheduleMeasurement = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      runMeasurement();
    });
  }, [runMeasurement]);

  useEffect(() => {
    runMeasurement();

    const handleScroll = (): void => {
      runMeasurement();
      scheduleMeasurement();
    };
    const handleResize = (): void => {
      runMeasurement();
      scheduleMeasurement();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [runMeasurement, scheduleMeasurement]);

  useEffect(() => {
    if (!isSticky) {
      if (tickerRef.current !== null) {
        cancelAnimationFrame(tickerRef.current);
        tickerRef.current = null;
      }
      return;
    }

    const tick = (): void => {
      runMeasurement();
      tickerRef.current = window.requestAnimationFrame(tick);
    };

    tickerRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (tickerRef.current !== null) {
        cancelAnimationFrame(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, [isSticky, runMeasurement]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      runMeasurement();
    });

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    const calculatorCard = footerRef.current?.closest(
      '[data-calculator-card]',
    ) as HTMLElement | null;
    if (calculatorCard) {
      observer.observe(calculatorCard);
    }

    return () => {
      observer.disconnect();
    };
  }, [runMeasurement]);

  return { footerRef, placeholderRef, footerStyle, placeholderHeight, isSticky };
};

const _TotalSection = styled(Box)<{ isLiteMode: boolean }>(
  ({ theme: _theme, isLiteMode: _isLiteMode }) => ({
    position: 'relative',
  }),
);

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
      style={{
        display: value === index ? 'block' : 'none',
        opacity: value === index ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// Custom styled alert component that matches SkillTooltip styling
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
          theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        // backdropFilter: // REMOVED - breaks sticky positioning 'blur(10px)',
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

// Gear icon component for trait button
type GearProps = {
  size?: string;
  color?: string;
};

const Gear = ({ size = '20', color = '#000000' }: GearProps): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill={color}
  >
    <g fill={color} fillRule="evenodd" clipRule="evenodd">
      <path
        d="M11.558 3.5a.75.75 0 0 1 .685.447l.443 1c.044.1.065.202.065.302a6.2 6.2 0 0 1 1.254.52.751.751 0 0 1 .219-.151l.97-.443a.75.75 0 0 1 .843.151l.837.838a.75.75 0 0 1 .17.8l-.395 1.02a.748.748 0 0 1-.168.26c.218.398.393.818.52 1.255a.75.75 0 0 1 .261.048l1 .373a.75.75 0 0 1 .488.703v1.184a.75.75 0 0 1-.447.686l-1 .443a.748.748 0 0 1-.302.065 6.227 6.227 0 0 1-.52 1.254c.06.061.112.134.151.219l.444.97a.75.75 0 0 1-.152.843l-.838.837a.75.75 0 0 1-.8.17l-1.02-.395a.749.749 0 0 1-.26-.168 6.225 6.225 0 0 1-1.255.52.75.75 0 0 1-.048.261l-.373 1a.75.75 0 0 1-.703.488h-1.184a.75.75 0 0 1-.686-.447l-.443-1a.748.748 0 0 1-.065-.302 6.226 6.226 0 0 1-1.254-.52.752.752 0 0 1-.219.151l-.97.443a.75.75 0 0 1-.843-.151l-.837-.838a.75.75 0 0 1-.17-.8l.395-1.02a.75.75 0 0 1 .168-.26A6.224 6.224 0 0 1 4.999 13a.752.752 0 0 1-.261-.048l-1-.373a.75.75 0 0 1-.488-.703v-1.184a.75.75 0 0 1 .447-.686l1-.443a.748.748 0 0 1 .302-.065 6.2 6.2 0 0 1 .52-1.254.75.75 0 0 1-.15-.219l-.444-.97a.75.75 0 0 1 .152-.843l.837-.837a.75.75 0 0 1 .801-.17l1.02.395c.102.04.189.097.26.168a6.224 6.224 0 0 1 1.254-.52.75.75 0 0 1 .048-.261l.373-1a.75.75 0 0 1 .703-.488h1.185Z"
        opacity=".2"
      />
      <path d="M8.232 11.768A2.493 2.493 0 0 0 10 12.5c.672 0 1.302-.267 1.768-.732A2.493 2.493 0 0 0 12.5 10c0-.672-.267-1.302-.732-1.768A2.493 2.493 0 0 0 10 7.5c-.672 0-1.302.267-1.768.732A2.493 2.493 0 0 0 7.5 10c0 .672.267 1.302.732 1.768Zm2.829-.707c-.28.28-.657.439-1.061.439-.404 0-.78-.16-1.06-.44S8.5 10.405 8.5 10s.16-.78.44-1.06.656-.44 1.06-.44.78.16 1.06.44.44.656.44 1.06-.16.78-.44 1.06Z" />
      <path d="m14.216 3.773-1.27.714a6.213 6.213 0 0 0-1.166-.48l-.47-1.414a.5.5 0 0 0-.474-.343H9.06a.5.5 0 0 0-.481.365l-.392 1.403a6.214 6.214 0 0 0-1.164.486L5.69 3.835a.5.5 0 0 0-.578.094L3.855 5.185a.5.5 0 0 0-.082.599l.714 1.27c-.199.37-.36.76-.48 1.166l-1.414.47a.5.5 0 0 0-.343.474v1.777a.5.5 0 0 0 .365.481l1.403.392c.122.405.285.794.486 1.164l-.669 1.333a.5.5 0 0 0 .094.578l1.256 1.256a.5.5 0 0 0 .599.082l1.27-.714c.37.199.76.36 1.166.48l.47 1.414a.5.5 0 0 0 .474.343h1.777a.5.5 0 0 0 .481-.365l.392-1.403a6.21 6.21 0 0 0 1.164-.486l1.333.669a.5.5 0 0 0 .578-.093l1.256-1.257a.5.5 0 0 0 .082-.599l-.714-1.27c.199-.37.36-.76.48-1.166l1.414-.47a.5.5 0 0 0 .343-.474V9.06a.5.5 0 0 0-.365-.481l-1.403-.392a6.208 6.208 0 0 0-.486-1.164l.669-1.333a.5.5 0 0 0-.093-.578l-1.257-1.256a.5.5 0 0 0-.599-.082Zm-1.024 1.724l1.184-.667.733.733-.627 1.25a.5.5 0 0 0 .019.482c.265.44.464.918.59 1.418a.5.5 0 0 0 .35.36l1.309.366v1.037l-1.327.44a.5.5 0 0 0-.328.354 5.216 5.216 0 0 1-.585 1.42.5.5 0 0 0-.007.502l.667 1.184-.733.733-1.25-.627a.5.5 0 0 0-.482.019c-.44.265-.918.464-1.418.59a.5.5 0 0 0-.36.35l-.366 1.309H9.525l-.44-1.327a.5.5 0 0 0-.355-.328 5.217 5.217 0 0 1-1.42-.585.5.5 0 0 0-.502-.007l-1.184.667-.733-.733.627-1.25a.5.5 0 0 0-.019-.482 5.216 5.216 0 0 1-.59-1.418a.5.5 0 0 0-.35-.36l-1.309-.366V9.525l1.327-.44a.5.5 0 0 0 .327-.355c.125-.5.323-.979.586-1.42a.5.5 0 0 0 .007-.502L4.83 5.624l.733-.733 1.25.627a.5.5 0 0 0 .482-.019c.44-.265.918-.464 1.418-.59a.5.5 0 0 0 .36-.35l.366-1.309h1.037l.44 1.327a.5.5 0 0 0 .354.327c.5.125.979.323 1.42.586a.5.5 0 0 0 .502.007Z" />
    </g>
  </svg>
);

const CalculatorComponent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmall = useMediaQuery('(max-width:380px)');
  const [selectedTab, setSelectedTab] = useState(0);

  // Helper function to generate unique IDs for items
  const generateItemId = useCallback((category: string, name: string, index: number): string => {
    return `${category}-${name}-${index}`;
  }, []);

  // Helper function to find item by ID
  const findItemById = useCallback(
    (
      data: CalculatorData,
      id: string,
    ): { category: keyof CalculatorData; index: number; item: CalculatorItem } | null => {
      for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
        const index = data[category].findIndex((item) => (item as any).id === id);
        if (index !== -1) {
          return { category, index, item: data[category][index] };
        }
      }
      return null;
    },
    [],
  );

  // Helper function to validate calculator data integrity
  const validateCalculatorData = useCallback((data: CalculatorData): boolean => {
    let isValid = true;
    const itemTracker = new Map<string, { category: string; index: number; id?: string }[]>();

    // Check for duplicate items in each category and track all items
    for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
      const items = data[category];
      const nameMap = new Map<string, number[]>();

      items.forEach((item, index) => {
        // Track all items for cross-category validation
        if (!itemTracker.has(item.name)) {
          itemTracker.set(item.name, []);
        }
        itemTracker.get(item.name)!.push({ category, index, id: (item as any).id });

        // Check within category duplicates
        if (!nameMap.has(item.name)) {
          nameMap.set(item.name, []);
        }
        nameMap.get(item.name)!.push(index);
      });

      // Check for duplicates within category
      for (const [name, indices] of nameMap.entries()) {
        if (indices.length > 1) {
          // eslint-disable-next-line no-console
          console.error(
            `❌ [VALIDATION] Duplicate item "${name}" found in ${category} at indices: ${indices.join(', ')}`,
          );
          isValid = false;
        }
      }
    }

    // Check for cross-category duplicates (should only exist for specific items like armor passives)
    for (const [itemName, locations] of itemTracker.entries()) {
      if (locations.length > 1 && !itemName.includes('Armor Passive')) {
        // eslint-disable-next-line no-console
        console.error(
          `❌ [VALIDATION] Item "${itemName}" duplicated across categories:`,
          locations.map((loc) => `${loc.category}[${loc.index}]`).join(', '),
        );
        isValid = false;
      }
    }

    // TEMPORARILY DISABLED: Validate armor passive items specifically
    // This validation is preventing normal operation when duplicates occur
    // TODO: Fix the root cause of duplication instead of just detecting it
    /*
    const lightArmorPassives = data.gear.filter(item => item.name === 'Light Armor Passive');
    const heavyArmorPassives = data.gear.filter(item => item.name === 'Heavy Armor Passive');

    if (lightArmorPassives.length > 1) {
      // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Multiple Light Armor Passive items found: ${lightArmorPassives.length}`);
      isValid = false;
    }

    if (heavyArmorPassives.length > 1) {
      // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Multiple Heavy Armor Passive items found: ${heavyArmorPassives.length}`);
      isValid = false;
    }
    */

    // TEMPORARILY DISABLED: Validate gear category structure
    // The actual gear array structure doesn't match the expected order
    // TODO: Revisit this validation when data structure is stabilized
    /*
    const expectedGearItems = [
      'Light Helm', 'Light Chest', 'Light Shoulders', 'Light Gloves', 'Light Boots', 'Light Belt',
      'Medium Helm', 'Medium Chest', 'Medium Shoulders', 'Medium Gloves', 'Medium Boots', 'Medium Belt',
      'Heavy Helm', 'Heavy Chest', 'Heavy Shoulders', 'Heavy Gloves', 'Heavy Boots', 'Heavy Belt'
    ];

    expectedGearItems.forEach((expectedName, expectedIndex) => {
      const actualItem = data.gear[expectedIndex];
      if (!actualItem || actualItem.name !== expectedName) {
        // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Expected "${expectedName}" at gear[${expectedIndex}], found:`, actualItem?.name || 'undefined');
        isValid = false;
      }
    });
    */

    // TEMPORARILY DISABLED: Check for missing or invalid resistance values
    // This is preventing armor items from being clicked/enabled
    // TODO: Fix resistance calculation logic
    /*
    for (const category of Object.keys(data) as (keyof CalculatorData)[]) {
      data[category].forEach((item, index) => {
        if (!item.resistanceValue || item.resistanceValue === "-") {
          // eslint-disable-next-line no-console
    console.error(`❌ [VALIDATION] Invalid resistance value for ${category}[${index}] (${item.name}): "${item.resistanceValue}"`);
          isValid = false;
        }
      });
    }
    */

    return isValid;
  }, []);
  const [liteMode, setLiteMode] = useState(isMobile);
  const [gameMode, setGameMode] = useState<GameMode>('both');
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null);
  const [tempSelectedVariant, setTempSelectedVariant] = useState<string>('Regular');
  const [penetrationData, setPenetrationData] = useState<CalculatorData>(PENETRATION_DATA);
  const [criticalData, setCriticalData] = useState<CalculatorData>(CRITICAL_DATA);
  const [armorResistanceData, setArmorResistanceData] =
    useState<CalculatorData>(ARMOR_RESISTANCE_DATA);

  // Use a ref to track the latest armor resistance data for modal state reading
  const armorResistanceDataRef = useRef(armorResistanceData);

  // ID-based update function for armor resistance items
  const updateArmorResistanceItemById = useCallback(
    (id: string, updates: Partial<CalculatorItem>) => {
      setArmorResistanceData((prev: CalculatorData) => {
        // TEMPORARILY DISABLED: Validate previous state before making changes
        // if (!validateCalculatorData(prev)) {
        //   // eslint-disable-next-line no-console
        //   console.error(`❌ [UPDATE] Previous state validation failed - aborting update`);
        //   return prev;
        // }

        const location = findItemById(prev, id);
        if (!location) {
          // eslint-disable-next-line no-console
          console.warn(`⚠️ [UPDATE] Item with ID ${id} not found`);
          return prev;
        }

        const newCategoryItems = [...prev[location.category]];
        const originalItem = newCategoryItems[location.index];

        // Validate we're not corrupting the array
        if (
          originalItem.name !==
          (updates.name && updates.name !== originalItem.name ? updates.name : originalItem.name)
        ) {
          // eslint-disable-next-line no-console
          console.error(`❌ [UPDATE] Name mismatch detected - potential corruption`);
          return prev;
        }

        newCategoryItems[location.index] = { ...originalItem, ...updates };

        // Create updated data to calculate armor passives
        const updatedData = {
          ...prev,
          [location.category]: newCategoryItems,
        };

        // TEMPORARILY DISABLED: Validate intermediate state to prevent blocking updates
        // if (!validateCalculatorData(updatedData)) {
        //   // eslint-disable-next-line no-console
        //   console.error(`❌ [UPDATE] Intermediate state validation failed - aborting update`);
        //   return prev;
        // }

        // Auto-calculate armor passive quantities and enabled state
        const lightArmorItems = updatedData.gear.filter(
          (item) =>
            item.name.startsWith('Light') && item.name !== 'Light Armor Passive' && item.enabled,
        );
        const heavyArmorItems = updatedData.gear.filter(
          (item) =>
            item.name.startsWith('Heavy') && item.name !== 'Heavy Armor Passive' && item.enabled,
        );

        const lightArmorCount = lightArmorItems.length;
        const heavyArmorCount = heavyArmorItems.length;

        // Debug logging
        // eslint-disable-next-line no-console
        console.log('🔍 [ARMOR_PASSIVE_DEBUG] ID-based update function:', {
          id,
          location,
          lightArmorItems: lightArmorItems.map(item => item.name),
          heavyArmorItems: heavyArmorItems.map(item => item.name),
          lightArmorCount,
          heavyArmorCount,
          updates
        });

        // Find and update Light Armor Passive with validation
        const lightArmorPassiveIndex = updatedData.gear.findIndex(
          (item) => item.name === 'Light Armor Passive',
        );
        if (lightArmorPassiveIndex !== -1) {
          updatedData.gear[lightArmorPassiveIndex] = {
            ...updatedData.gear[lightArmorPassiveIndex],
            quantity: lightArmorCount,
            enabled: lightArmorCount > 0, // Auto-enable if there are light armor pieces
          };
        } else {
          // eslint-disable-next-line no-console
          console.warn(`⚠️ [PASSIVE] Light Armor Passive not found in gear array`);
        }

        // Find and update Heavy Armor Passive with validation
        const heavyArmorPassiveIndex = updatedData.gear.findIndex(
          (item) => item.name === 'Heavy Armor Passive',
        );
        if (heavyArmorPassiveIndex !== -1) {
          updatedData.gear[heavyArmorPassiveIndex] = {
            ...updatedData.gear[heavyArmorPassiveIndex],
            quantity: heavyArmorCount,
            enabled: heavyArmorCount > 0, // Auto-enable if there are heavy armor pieces
          };
        } else {
          // eslint-disable-next-line no-console
          console.warn(`⚠️ [PASSIVE] Heavy Armor Passive not found in gear array`);
        }

        // Final validation before returning
        if (!validateCalculatorData(updatedData)) {
          // eslint-disable-next-line no-console
          console.error(`❌ [UPDATE] Final validation failed - reverting to previous state`);
          return prev;
        }

        return updatedData;
      });
    },
    [validateCalculatorData, findItemById],
  );
  armorResistanceDataRef.current = armorResistanceData;

  const armorResistanceGearWithIndex = useMemo<IndexedCalculatorItem[]>(
    () =>
      armorResistanceData.gear.map((item, gearIndex) => ({
        ...item,
        originalIndex: gearIndex,
        id: generateItemId('gear', item.name, gearIndex),
      })),
    [armorResistanceData.gear],
  );

  const armorResistanceGearSections = useMemo(
    () => ({
      light: armorResistanceGearWithIndex.filter((item) => item.name.startsWith('Light')),
      medium: armorResistanceGearWithIndex.filter((item) => item.name.startsWith('Medium')),
      heavy: armorResistanceGearWithIndex.filter((item) => item.name.startsWith('Heavy')),
      shield: armorResistanceGearWithIndex.filter((item) => item.name.startsWith('Shield')),
    }),
    [armorResistanceGearWithIndex],
  );

  // Set items from different categories
  const armorResistanceSets = useMemo(
    () => [
      ...armorResistanceData.cp
        .filter((item) => item.name === 'Armor Master')
        .map((item) => {
          const originalIndex = armorResistanceData.cp.findIndex(
            (originalItem) => originalItem.name === item.name,
          );
          return { ...item, category: 'cp', originalIndex };
        }),
      ...armorResistanceData.passives
        .filter((item) => ['Lord Warden', 'Ozezans', 'Markyn Ring of Majesty'].includes(item.name))
        .map((item) => {
          const originalIndex = armorResistanceData.passives.findIndex(
            (originalItem) => originalItem.name === item.name,
          );
          return { ...item, category: 'passives', originalIndex };
        }),
    ],
    [armorResistanceData.cp, armorResistanceData.passives],
  );

  // Filter out set items from their original categories
  const filteredPassives = useMemo(
    () =>
      armorResistanceData.passives
        .filter((item) => !['Lord Warden', 'Ozezans', 'Markyn Ring of Majesty'].includes(item.name))
        .map((item) => {
          const originalIndex = armorResistanceData.passives.findIndex(
            (originalItem) => originalItem.name === item.name,
          );
          return { ...item, category: 'passives', originalIndex };
        }),
    [armorResistanceData.passives],
  );

  const filteredCp = useMemo(
    () =>
      armorResistanceData.cp
        .filter((item) => item.name !== 'Armor Master')
        .map((item) => {
          const originalIndex = armorResistanceData.cp.findIndex(
            (originalItem) => originalItem.name === item.name,
          );
          return { ...item, category: 'cp', originalIndex };
        }),
    [armorResistanceData.cp],
  );

  // JavaScript-based sticky footer
  const {
    footerRef,
    placeholderRef,
    placeholderHeight,
    footerStyle,
    isSticky: _isSticky,
  } = useStickyFooter(liteMode, theme, isMobile);

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
    } else if (item.variants && item.selectedVariant !== undefined) {
      // Use the selected variant value with quality scaling
      const variant = item.variants[item.selectedVariant];
      if (!variant) {
        return 0;
      }

      if (variant.qualityValues && variant.qualityValues.length > 0) {
        const qualityLevel =
          typeof item.qualityLevel === 'number'
            ? Math.min(Math.max(item.qualityLevel, 0), variant.qualityValues.length - 1)
            : variant.qualityValues.length - 1;
        return variant.qualityValues[qualityLevel] ?? variant.value ?? 0;
      }

      return variant.value ?? item.value ?? 0;
    } else if (item.isFlat) {
      return item.value || 0;
    } else {
      return item.quantity * (item.per || 0);
    }
  }, []);

  const _calculateTotalValue = useCallback(
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
    (data: CalculatorData, calcType: 'pen' | 'crit' | 'armor') => {
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
        classPassives: [],
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

  const armorResistanceTotal = useMemo(() => {
    const allowedItems = gameMode === 'both' ? null : MODE_FILTER[gameMode]?.['armor'] || null;
    let total = 0;

    // Pre-calculate for performance
    const items = [
      ...armorResistanceData.groupBuffs,
      ...armorResistanceData.gear,
      ...armorResistanceData.classPassives,
      ...armorResistanceData.passives,
      ...armorResistanceData.cp,
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.enabled && (!allowedItems || allowedItems.includes(item.name))) {
        const value = calculateItemValue(item);
        total += value;
      }
    }

    return total;
  }, [armorResistanceData, gameMode, calculateItemValue]);

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

  const getArmorResistanceStatus = useCallback((total: number) => {
    if (total >= ARMOR_RESISTANCE_OPTIMAL_MIN && total <= ARMOR_RESISTANCE_OPTIMAL_MAX)
      return 'at-cap';
    if (total > ARMOR_RESISTANCE_CAP) return 'over-cap';
    return 'under-cap';
  }, []);

  const penStatus = getPenStatus(penTotal, gameMode);
  const critStatus = getCritStatus(critTotal);
  const armorResistanceStatus = getArmorResistanceStatus(armorResistanceTotal);

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

  const updateArmorResistanceItem = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      setArmorResistanceData((prev: CalculatorData) => {
        // TEMPORARILY DISABLED: Validate previous state to prevent blocking updates
        // if (!validateCalculatorData(prev)) {
        //   // eslint-disable-next-line no-console
        //   console.error(`❌ [LEGACY_UPDATE] Previous state validation failed - aborting update`);
        //   return prev;
        // }

        const newCategoryItems = [...prev[category]];

        // Add validation to prevent index out of bounds
        if (index < 0 || index >= newCategoryItems.length) {
          // eslint-disable-next-line no-console
          console.warn(
            `⚠️ [LEGACY_UPDATE] Invalid index ${index} for category ${category}. Array length: ${newCategoryItems.length}`,
          );
          return prev;
        }

        const originalItem = newCategoryItems[index];

        newCategoryItems[index] = { ...originalItem, ...updates };

        // Mutually exclusive armor logic: disable conflicting items when enabling an armor piece
        if (
          updates.enabled === true &&
          category === 'gear' &&
          isMutuallyExclusiveArmorItem(originalItem)
        ) {
          const slotKey = extractSlotFromItemName(originalItem.name);
          if (slotKey) {
            // Find and disable other items in the same slot
            const conflictingItems = findConflictingItems(originalItem, newCategoryItems);
            conflictingItems.forEach((conflictingItem) => {
              const conflictingIndex = newCategoryItems.findIndex(
                (item) => item.name === conflictingItem.name,
              );
              if (conflictingIndex !== -1 && newCategoryItems[conflictingIndex].enabled) {
                newCategoryItems[conflictingIndex] = {
                  ...newCategoryItems[conflictingIndex],
                  enabled: false,
                };
                // eslint-disable-next-line no-console
                console.log(
                  `🔀 [MUTUAL_EXCLUSIVE] Disabled "${conflictingItem.name}" when enabling "${originalItem.name}" (slot: ${slotKey})`,
                );
              }
            });
          }
        }

        // Create updated data to calculate armor passives
        const updatedData = {
          ...prev,
          [category]: newCategoryItems,
        };

        // TEMPORARILY DISABLED: Validate intermediate state to prevent blocking updates
        // if (!validateCalculatorData(updatedData)) {
        //   // eslint-disable-next-line no-console
        //   console.error(`❌ [LEGACY_UPDATE] Intermediate state validation failed - aborting update`);
        //   return prev;
        // }

        // Auto-calculate armor passive quantities and enabled state
        const lightArmorItems = updatedData.gear.filter(
          (item) =>
            item.name.startsWith('Light') && item.name !== 'Light Armor Passive' && item.enabled,
        );
        const heavyArmorItems = updatedData.gear.filter(
          (item) =>
            item.name.startsWith('Heavy') && item.name !== 'Heavy Armor Passive' && item.enabled,
        );

        const lightArmorCount = lightArmorItems.length;
        const heavyArmorCount = heavyArmorItems.length;

        // Debug logging
        // eslint-disable-next-line no-console
        console.log('🔍 [ARMOR_PASSIVE_DEBUG] Main update function:', {
          lightArmorItems: lightArmorItems.map(item => item.name),
          heavyArmorItems: heavyArmorItems.map(item => item.name),
          lightArmorCount,
          heavyArmorCount,
          updateCategory: category,
          updateIndex: index,
          updates
        });

        // Validate no duplicate passive items exist
        const lightArmorPassives = updatedData.gear.filter(
          (item) => item.name === 'Light Armor Passive',
        );
        const heavyArmorPassives = updatedData.gear.filter(
          (item) => item.name === 'Heavy Armor Passive',
        );

        if (lightArmorPassives.length > 1) {
          // eslint-disable-next-line no-console
          console.warn('Multiple Light Armor Passive items found, using first one');
        }
        if (heavyArmorPassives.length > 1) {
          // eslint-disable-next-line no-console
          console.warn('Multiple Heavy Armor Passive items found, using first one');
        }

        // Find and update Light Armor Passive
        const lightArmorPassiveIndex = updatedData.gear.findIndex(
          (item) => item.name === 'Light Armor Passive',
        );
        if (lightArmorPassiveIndex !== -1) {
          const oldQuantity = updatedData.gear[lightArmorPassiveIndex].quantity;
          const oldEnabled = updatedData.gear[lightArmorPassiveIndex].enabled;
          updatedData.gear[lightArmorPassiveIndex] = {
            ...updatedData.gear[lightArmorPassiveIndex],
            quantity: lightArmorCount,
            enabled: lightArmorCount > 0,
          };
          // eslint-disable-next-line no-console
          console.log('✅ [LIGHT_ARMOR_PASSIVE] Updated:', {
            index: lightArmorPassiveIndex,
            oldQuantity,
            newQuantity: lightArmorCount,
            oldEnabled,
            newEnabled: lightArmorCount > 0
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn(`⚠️ [PASSIVE] Light Armor Passive not found in gear array`);
        }

        // Find and update Heavy Armor Passive
        const heavyArmorPassiveIndex = updatedData.gear.findIndex(
          (item) => item.name === 'Heavy Armor Passive',
        );
        if (heavyArmorPassiveIndex !== -1) {
          const oldQuantity = updatedData.gear[heavyArmorPassiveIndex].quantity;
          const oldEnabled = updatedData.gear[heavyArmorPassiveIndex].enabled;
          updatedData.gear[heavyArmorPassiveIndex] = {
            ...updatedData.gear[heavyArmorPassiveIndex],
            quantity: heavyArmorCount,
            enabled: heavyArmorCount > 0,
          };
          // eslint-disable-next-line no-console
          console.log('✅ [HEAVY_ARMOR_PASSIVE] Updated:', {
            index: heavyArmorPassiveIndex,
            oldQuantity,
            newQuantity: heavyArmorCount,
            oldEnabled,
            newEnabled: heavyArmorCount > 0
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn(`⚠️ [PASSIVE] Heavy Armor Passive not found in gear array`);
        }

        return updatedData;
      });
    },
    [],
  );

  // Create a wrapper update function that tries ID-based updates first for gear items
  const _updateArmorResistanceItemWithFallback = useCallback(
    (category: keyof CalculatorData, index: number, updates: Partial<CalculatorItem>) => {
      // For gear items, try ID-based update first
      if (category === 'gear') {
        const item = armorResistanceData.gear[index];
        if (item && (item as any).id) {
          updateArmorResistanceItemById((item as any).id, updates);
          return;
        }
      }
      updateArmorResistanceItem(category, index, updates);
    },
    [armorResistanceData.gear, updateArmorResistanceItemById, updateArmorResistanceItem],
  );

  const cycleArmorResistanceVariant = useCallback((index: number) => {
    setArmorResistanceData((prev: CalculatorData) => {
      const newCategoryItems = [...prev.gear];
      const target = newCategoryItems[index];

      if (!target) {
        return prev;
      }

      const item = { ...target };
      const variants = item.variants ?? [];

      if (!variants.length) {
        return prev;
      }

      const currentIndex = typeof item.selectedVariant === 'number' ? item.selectedVariant : 0;
      const nextIndex = (currentIndex + 1) % variants.length;
      const nextVariant = variants[nextIndex];

      item.selectedVariant = nextIndex;

      const qualityLevel =
        typeof item.qualityLevel === 'number' ? item.qualityLevel : ARMOR_QUALITY_LABELS.length - 1;
      const variantQualityValues = nextVariant?.qualityValues;
      const safeQualityLevel = Math.min(
        Math.max(qualityLevel, 0),
        (variantQualityValues?.length ?? ARMOR_QUALITY_LABELS.length) - 1,
      );

      item.qualityLevel = safeQualityLevel;
      item.value = variantQualityValues?.[safeQualityLevel] ?? nextVariant?.value ?? item.value;

      newCategoryItems[index] = item;

      // Create updated data to calculate armor passives
      const updatedData = {
        ...prev,
        gear: newCategoryItems,
      };

      // Auto-calculate armor passive quantities based on enabled gear pieces
      const lightArmorItems = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Light') && item.name !== 'Light Armor Passive' && item.enabled,
      );
      const heavyArmorItems = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Heavy') && item.name !== 'Heavy Armor Passive' && item.enabled,
      );

      const lightArmorCount = lightArmorItems.length;
      const heavyArmorCount = heavyArmorItems.length;

      // Debug logging
      // eslint-disable-next-line no-console
      console.log('🔍 [ARMOR_PASSIVE_DEBUG] Cycle variant function:', {
        index,
        itemName: target.name,
        lightArmorItems: lightArmorItems.map(item => item.name),
        heavyArmorItems: heavyArmorItems.map(item => item.name),
        lightArmorCount,
        heavyArmorCount
      });

      // Find and update Light Armor Passive
      const lightArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Light Armor Passive',
      );
      if (lightArmorPassiveIndex !== -1) {
        updatedData.gear[lightArmorPassiveIndex] = {
          ...updatedData.gear[lightArmorPassiveIndex],
          quantity: lightArmorCount,
          enabled: lightArmorCount > 0,
        };
      }

      // Find and update Heavy Armor Passive
      const heavyArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Heavy Armor Passive',
      );
      if (heavyArmorPassiveIndex !== -1) {
        updatedData.gear[heavyArmorPassiveIndex] = {
          ...updatedData.gear[heavyArmorPassiveIndex],
          quantity: heavyArmorCount,
          enabled: heavyArmorCount > 0,
        };
      }

      return updatedData;
    });
  }, []);

  const setArmorResistanceVariant = useCallback((index: number, variantName: string) => {
    setArmorResistanceData((prev: CalculatorData) => {
      const newCategoryItems = [...prev.gear];
      const target = newCategoryItems[index];

      if (!target) {
        return prev;
      }

      const item = { ...target };
      const variants = item.variants ?? [];

      if (!variants.length) {
        return prev;
      }

      // Find the variant index by name with case-insensitive fallback
      let variantIndex = variants.findIndex((v) => v.name === variantName);

      // If not found, try case-insensitive matching
      if (variantIndex === -1) {
        variantIndex = variants.findIndex(
          (v) => v.name.toLowerCase() === variantName.toLowerCase(),
        );
      }

      if (variantIndex === -1) {
        return prev;
      }

      const selectedVariant = variants[variantIndex];
      item.selectedVariant = variantIndex;

      // Update quality and value based on selected variant
      const qualityLevel =
        typeof item.qualityLevel === 'number' ? item.qualityLevel : ARMOR_QUALITY_LABELS.length - 1;
      const variantQualityValues = selectedVariant?.qualityValues;
      const safeQualityLevel = Math.min(
        Math.max(qualityLevel, 0),
        (variantQualityValues?.length ?? ARMOR_QUALITY_LABELS.length) - 1,
      );

      item.qualityLevel = safeQualityLevel;
      item.value = variantQualityValues?.[safeQualityLevel] ?? selectedVariant?.value ?? item.value;

      newCategoryItems[index] = item;

      // Create updated data to calculate armor passives
      const updatedData = {
        ...prev,
        gear: newCategoryItems,
      };

      // Auto-calculate armor passive quantities based on enabled gear pieces
      const lightArmorCount = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Light') && item.name !== 'Light Armor Passive' && item.enabled,
      ).length;

      const heavyArmorCount = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Heavy') && item.name !== 'Heavy Armor Passive' && item.enabled,
      ).length;

      // Find and update Light Armor Passive
      const lightArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Light Armor Passive',
      );
      if (lightArmorPassiveIndex !== -1) {
        updatedData.gear[lightArmorPassiveIndex] = {
          ...updatedData.gear[lightArmorPassiveIndex],
          quantity: lightArmorCount,
          enabled: lightArmorCount > 0,
        };
      }

      // Find and update Heavy Armor Passive
      const heavyArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Heavy Armor Passive',
      );
      if (heavyArmorPassiveIndex !== -1) {
        updatedData.gear[heavyArmorPassiveIndex] = {
          ...updatedData.gear[heavyArmorPassiveIndex],
          quantity: heavyArmorCount,
          enabled: heavyArmorCount > 0,
        };
      }

      return updatedData;
    });
  }, []);

  const updateArmorResistanceQuality = useCallback((index: number, qualityLevel: number) => {
    setArmorResistanceData((prev: CalculatorData) => {
      const newCategoryItems = [...prev.gear];
      const target = newCategoryItems[index];

      if (!target) {
        return prev;
      }

      const item = { ...target };
      const variants = item.variants ?? [];
      const selectedIndex = typeof item.selectedVariant === 'number' ? item.selectedVariant : 0;
      const selectedVariant = variants[selectedIndex];

      if (!selectedVariant) {
        return prev;
      }

      const variantQualityValues = selectedVariant.qualityValues;
      const safeQualityLevel = Math.min(
        Math.max(qualityLevel, 0),
        (variantQualityValues?.length ?? ARMOR_QUALITY_LABELS.length) - 1,
      );

      item.qualityLevel = safeQualityLevel;
      item.value = variantQualityValues?.[safeQualityLevel] ?? selectedVariant.value ?? item.value;

      newCategoryItems[index] = item;

      // Create updated data to calculate armor passives
      const updatedData = {
        ...prev,
        gear: newCategoryItems,
      };

      // Auto-calculate armor passive quantities based on enabled gear pieces
      const lightArmorCount = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Light') && item.name !== 'Light Armor Passive' && item.enabled,
      ).length;

      const heavyArmorCount = updatedData.gear.filter(
        (item) =>
          item.name.startsWith('Heavy') && item.name !== 'Heavy Armor Passive' && item.enabled,
      ).length;

      // Find and update Light Armor Passive
      const lightArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Light Armor Passive',
      );
      if (lightArmorPassiveIndex !== -1) {
        updatedData.gear[lightArmorPassiveIndex] = {
          ...updatedData.gear[lightArmorPassiveIndex],
          quantity: lightArmorCount,
          enabled: lightArmorCount > 0,
        };
      }

      // Find and update Heavy Armor Passive
      const heavyArmorPassiveIndex = updatedData.gear.findIndex(
        (item) => item.name === 'Heavy Armor Passive',
      );
      if (heavyArmorPassiveIndex !== -1) {
        updatedData.gear[heavyArmorPassiveIndex] = {
          ...updatedData.gear[heavyArmorPassiveIndex],
          quantity: heavyArmorCount,
          enabled: heavyArmorCount > 0,
        };
      }

      return updatedData;
    });
  }, []);

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

  const toggleAllArmorResistance = useCallback((enabled: boolean) => {
    setArmorResistanceData((prev: CalculatorData) => {
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
  const _baseStyles = React.useMemo(
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
      const controlColumnMin = liteMode ? 36 : isMobile ? 50 : 60;
      const gridColumns = liteMode
        ? `auto minmax(${controlColumnMin}px, max-content) 1fr auto`
        : isMobile
          ? `auto minmax(${controlColumnMin}px, max-content) 1fr auto`
          : `auto minmax(${controlColumnMin}px, max-content) 1fr auto auto`;

      // Special gradient backgrounds for armor passives
      const isLightArmorPassive = item.name === 'Light Armor Passive';
      const isHeavyArmorPassive = item.name === 'Heavy Armor Passive';

      let background;
      let border;

      if (isLightArmorPassive) {
        background = item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(214, 168, 255, 0.4) 0%, rgba(154, 95, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgba(214, 168, 255, 0.2) 0%, rgba(154, 95, 255, 0.15) 100%)'
            : theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(214, 168, 255, 0.4) 0%, rgba(154, 95, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgba(214, 168, 255, 0.2) 0%, rgba(154, 95, 255, 0.15) 100%)'
          : liteMode
            ? theme.palette.mode === 'dark'
              ? 'rgba(214, 168, 255, 0.1)'
              : 'rgba(214, 168, 255, 0.05)'
            : theme.palette.mode === 'dark'
              ? 'rgba(214, 168, 255, 0.1)'
              : 'rgba(214, 168, 255, 0.05)';

        border = item.enabled
          ? liteMode
            ? '1px solid rgba(214, 168, 255, 0.6) !important'
            : '1px solid rgba(214, 168, 255, 0.8)'
          : liteMode
            ? '1px solid transparent'
            : '1px solid rgba(214, 168, 255, 0.2)';
      } else if (isHeavyArmorPassive) {
        background = item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(214, 168, 255, 0.4) 0%, rgba(154, 95, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgba(214, 168, 255, 0.2) 0%, rgba(154, 95, 255, 0.15) 100%)'
            : theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(214, 168, 255, 0.4) 0%, rgba(154, 95, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgba(214, 168, 255, 0.2) 0%, rgba(154, 95, 255, 0.15) 100%)'
          : liteMode
            ? theme.palette.mode === 'dark'
              ? 'rgba(214, 168, 255, 0.1)'
              : 'rgba(214, 168, 255, 0.05)'
            : theme.palette.mode === 'dark'
              ? 'rgba(214, 168, 255, 0.1)'
              : 'rgba(214, 168, 255, 0.05)';

        border = item.enabled
          ? liteMode
            ? '1px solid rgba(214, 168, 255, 0.6) !important'
            : '1px solid rgba(214, 168, 255, 0.8)'
          : liteMode
            ? '1px solid transparent'
            : '1px solid rgba(214, 168, 255, 0.2)';
      } else {
        // Default background for other items
        background = item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(0, 225, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgb(128 211 255 / 20%) 0%, rgb(56 189 248 / 15%) 100%)'
            : theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(0, 225, 255, 0.3) 100%)'
              : 'linear-gradient(135deg, rgb(128 211 255 / 20%) 0%, rgb(56 189 248 / 15%) 100%)'
          : liteMode
            ? theme.palette.mode === 'dark'
              ? 'rgb(0 0 0 / 28%)'
              : 'rgb(255 255 255 / 41%)'
            : theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.6)'
              : 'rgba(241, 245, 249, 0.8)';

        border = item.enabled
          ? liteMode
            ? theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.6) !important'
              : '1px solid rgb(105 162 255 / 40%) !important'
            : theme.palette.mode === 'dark'
              ? '1px solid rgba(56, 189, 248, 0.8)'
              : liteMode
                ? '1px solid rgb(40 145 200 / 35%)'
                : '1px solid rgb(40 145 200 / 35%)'
          : liteMode
            ? '1px solid transparent'
            : theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(203, 213, 225, 0.3)';
      }

      return {
        display: 'grid',
        gridTemplateColumns: gridColumns,
        alignItems: 'center',
        gap: liteMode ? 0.625 : 2, // 0.625 = 5px in MUI spacing (8px base)
        p: liteMode ? 0.125 : 1.5,
        background,
        border,
        borderRadius: '8px !important',
        mb: liteMode ? 0.625 : 1, // 0.625 = 5px in MUI spacing (8px base)
        cursor: item.locked ? 'not-allowed' : 'pointer',
        opacity: item.locked ? 0.7 : 1,
        transition: liteMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        // backdropFilter: // REMOVED - breaks sticky positioning !liteMode ? 'blur(8px)' : 'none',
        '&:hover': !item.locked
          ? {
              transform: liteMode ? 'none' : 'translateY(-1px)',
              border:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgb(40 145 200 / 30%)',
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
      const indexedItem = item as IndexedCalculatorItem;
      const resolvedIndex =
        typeof indexedItem.originalIndex === 'number' ? indexedItem.originalIndex : index;

      // Armor passive detection for disabling manual interaction
      // Only the actual auto-calculated armor passives should be blocked
      const isLightArmorPassive = item.name === 'Light Armor Passive';
      const isHeavyArmorPassive = item.name === 'Heavy Armor Passive';

      // Use the original update function directly for now
      const _enhancedUpdateFunction = updateFunction;
      const hasQuantity = item.maxQuantity && item.maxQuantity > 1;
      const key = `${category}-${resolvedIndex}-${item.enabled}-${item.quantity}-${hasQuantity}`;

      const variants = item.variants ?? [];
      const hasVariants = variants.length > 0;
      const selectedVariantIndex = hasVariants
        ? Math.min(
            Math.max(typeof item.selectedVariant === 'number' ? item.selectedVariant : 0, 0),
            variants.length - 1,
          )
        : undefined;
      const currentVariant =
        selectedVariantIndex !== undefined ? variants[selectedVariantIndex] : undefined;
      const nextVariant =
        selectedVariantIndex !== undefined
          ? variants[(selectedVariantIndex + 1) % variants.length]
          : undefined;

      const defaultQualityLevel = ARMOR_QUALITY_LABELS.length - 1;
      const variantQualityValues = currentVariant?.qualityValues;
      const qualityLevel = Math.min(
        Math.max(
          typeof item.qualityLevel === 'number' ? item.qualityLevel : defaultQualityLevel,
          0,
        ),
        (variantQualityValues?.length ?? ARMOR_QUALITY_LABELS.length) - 1,
      );
      const qualityLabel =
        ARMOR_QUALITY_LABELS[qualityLevel] ?? ARMOR_QUALITY_LABELS[defaultQualityLevel];
      const ratingValue = qualityLevel + 1;

      // Calculate display values once
      let displayValue: number;
      let perDisplay = '';

      if (item.name === 'Anthelmir') {
        // Penetration = Weapon Damage ÷ 2.5
        const wd = parseFloat(item.quantity.toString()) || 0;
        displayValue = Math.round(wd / 2.5);
      } else if (item.name === 'Balorgh') {
        // Penetration = Ultimate × 23
        const ult = parseFloat(item.quantity.toString()) || 0;
        displayValue = Math.round(ult * 23);
      } else if (currentVariant) {
        displayValue =
          variantQualityValues?.[qualityLevel] ?? currentVariant.value ?? item.value ?? 0;
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
      const controlSlotWidth = liteMode ? 36 : isExtraSmall ? 44 : isMobile ? 56 : 60;
      const _textFieldStyles = {
        width: controlSlotWidth,
        '& .MuiInputBase-root': {
          fontSize: liteMode ? '0.75rem' : isExtraSmall ? '0.8rem' : isMobile ? '0.9rem' : '0.8rem',
          padding: liteMode
            ? '6px 6px'
            : isExtraSmall
              ? '8px 10px'
              : isMobile
                ? '10px 14px'
                : '4px 8px',
          height: liteMode ? '32px' : isExtraSmall ? '40px' : isMobile ? '48px' : '32px',
          minHeight: liteMode ? '32px' : isExtraSmall ? '40px' : isMobile ? '48px' : '32px',
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
                ? '10px 14px'
                : '2px 4px',
          textAlign: 'center',
          fontSize: liteMode ? '0.75rem' : isExtraSmall ? '0.85rem' : isMobile ? '1rem' : '0.75rem',
          fontWeight: 500,
          // Hide spin buttons for a cleaner look
          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          '&[type=number]': {
            MozAppearance: 'textfield',
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
        fontSize: { xs: liteMode ? '0.7rem' : '0.95rem', sm: liteMode ? '0.9rem' : '0.9rem' },
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

      const variantCycleControl = currentVariant ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: liteMode ? 0.5 : 0.75 }}>
          <Button
            size="small"
            disableElevation
            disableRipple
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) {
                // Get the latest item data to ensure we have the current selectedVariant
                const currentItem = armorResistanceData.gear[resolvedIndex];
                // Validate item exists and has variants before opening modal
                if (currentItem && currentItem.variants && currentItem.variants.length > 0) {
                  // Get the currently applied variant from the ref (latest data)
                  const freshItem = armorResistanceDataRef.current.gear[resolvedIndex];
                  let currentVariant = 'Regular'; // Default fallback

                  // Try to get the selected variant from the fresh data
                  if (
                    freshItem &&
                    freshItem.selectedVariant !== undefined &&
                    freshItem.selectedVariant !== null
                  ) {
                    const variantIndex = freshItem.selectedVariant;
                    if (freshItem.variants && freshItem.variants[variantIndex]) {
                      currentVariant = freshItem.variants[variantIndex].name;
                    }
                  }

                  setCurrentEditingIndex(resolvedIndex);
                  setTempSelectedVariant(currentVariant);
                  setVariantModalOpen(true);
                }
              } else {
                cycleArmorResistanceVariant(resolvedIndex);
              }
            }}
            sx={{
              minWidth: isMobile ? '40px' : '175px',
              width: isMobile ? '40px' : '175px',
              minHeight: isMobile ? '40px' : '24px',
              fontSize: '0.7rem',
              fontWeight: 600,
              py: isMobile ? 0 : 0.4,
              px: isMobile ? 0 : 1.2,
              borderRadius: isMobile ? '50%' : '8px',
              textTransform: 'none',
              border: '1px solid',
              borderColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.8)'
                  : 'rgba(40, 145, 200, 0.6)',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(0, 225, 255, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(40, 145, 200, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
              color: theme.palette.mode === 'dark' ? 'rgb(199 234 255)' : 'rgb(40 145 200)',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 2px 8px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 2px 8px rgba(40, 145, 200, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              '&:hover': {
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(0, 225, 255, 0.25) 100%)'
                    : 'linear-gradient(135deg, rgba(40, 145, 200, 0.18) 0%, rgba(56, 189, 248, 0.12) 100%)',
                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(56, 189, 248, 0.9)'
                    : 'rgba(40, 145, 200, 0.7)',
                color: theme.palette.mode === 'dark' ? 'rgb(199, 234, 255)' : 'rgb(40, 145, 200)',
                transform: 'translateY(-1px)',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 4px 12px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                    : '0 4px 12px rgba(40, 145, 200, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 1px 4px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 1px 4px rgba(40, 145, 200, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 0.75 }}>
              {isMobile ? (
                <Gear
                  size="22"
                  color={theme.palette.mode === 'dark' ? 'rgb(199 234 255)' : 'rgb(40 145  200)'}
                />
              ) : (
                <Typography component="span" fontWeight={600} fontSize="0.7rem">
                  {currentVariant.name}
                </Typography>
              )}
              {nextVariant && !isMobile && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3,
                    px: 0.6,
                    py: 0.1,
                    borderRadius: '999px',
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.6)'
                        : 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(56, 189, 248, 0.4)'
                        : 'rgba(40, 145, 200, 0.4)',
                  }}
                >
                  <AutorenewIcon sx={{ fontSize: '0.9rem' }} />
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 300,
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {nextVariant.name}
                  </Typography>
                </Box>
              )}
            </Box>
          </Button>
          {!isMobile && (
            <Tooltip title={`Gear Quality: ${qualityLabel}`}>
              <Rating
                name={`armor-quality-${category}-${resolvedIndex}`}
                value={ratingValue}
                max={ARMOR_QUALITY_LABELS.length}
                precision={1}
                size="small"
                onChange={(event, newValue) => {
                  event.stopPropagation();
                  if (typeof newValue === 'number') {
                    updateArmorResistanceQuality(resolvedIndex, newValue - 1);
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                getLabelText={(value: number) =>
                  `${ARMOR_QUALITY_LABELS[value - 1] ?? value} quality`
                }
                sx={{
                  '& .MuiRating-iconFilled': {
                    color: 'rgb(255 222 148)',
                  },
                  '& .MuiRating-iconHover': {
                    color: 'rgb(255 234 179)',
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>
      ) : null;

      // Handle click on the entire list item
      const handleItemClick = (e: React.MouseEvent): void => {
        // Don't toggle if clicking on interactive elements
        if (
          e.target instanceof HTMLInputElement || // TextField input
          e.target instanceof HTMLButtonElement || // IconButton
          (e.target as HTMLElement).closest('button') || // Any button (including variant buttons)
          (e.target as HTMLElement).closest('input') || // Any input
          (e.target as HTMLElement).closest('.MuiCheckbox-root') // Checkbox
        ) {
          return;
        }

        // Don't allow manual clicking for armor passives - these are auto-calculated
        if (isLightArmorPassive || isHeavyArmorPassive) {
          return;
        }

        if (!item.locked) {
          updateFunction(category, resolvedIndex, { enabled: !item.enabled });
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
              disabled={item.locked || isLightArmorPassive || isHeavyArmorPassive}
              size={isMobile ? 'medium' : 'small'}
              disableRipple
              disableTouchRipple
              sx={(theme) => {
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
            />
          </ListItemIcon>

          {variantCycleControl ? (
            <Box
              sx={{
                minWidth: controlSlotWidth,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                px: liteMode ? 0 : 0.25,
                mr: liteMode ? 0.75 : 1,
              }}
            >
              {variantCycleControl}
            </Box>
          ) : (
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
              <QuantityInput
                item={item}
                category={category}
                resolvedIndex={resolvedIndex}
                updateFunction={updateFunction}
                isMobile={isMobile}
              />
            </Tooltip>
          )}

          <ListItemText
            sx={{ ml: liteMode ? 1.5 : 0, minWidth: 0 }}
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
    [
      getCalculatorItemStyles,
      liteMode,
      isMobile,
      isExtraSmall,
      theme.palette.mode,
      theme.palette.text.secondary,
      cycleArmorResistanceVariant,
      updateArmorResistanceQuality,
    ],
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
          <List sx={{ p: 0 }}>
            {items.map((item, index) => renderItem(item, index, category, updateFunction))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  };

  const getStatusVisuals = (
    status: SummaryStatus,
  ): {
    label: string;
    color: string;
    background: string;
    border: string;
    Icon: typeof CheckCircleIcon;
  } => {
    const palette: Record<
      SummaryStatus,
      {
        label: string;
        color: string;
        light: { background: string; border: string };
        dark: { background: string; border: string };
        Icon: typeof CheckCircleIcon;
      }
    > = {
      'at-cap': {
        label: 'Optimal',
        color: '#22c55e',
        light: { background: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' },
        dark: { background: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)' },
        Icon: CheckCircleIcon,
      },
      'over-cap': {
        label: 'Over Cap',
        color: '#fb923c',
        light: { background: 'rgba(251, 146, 60, 0.1)', border: 'rgba(251, 146, 60, 0.2)' },
        dark: { background: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.3)' },
        Icon: ErrorIcon,
      },
      'under-cap': {
        label: 'Below Cap',
        color: '#ef4444',
        light: { background: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
        dark: { background: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
        Icon: HelpOutlineIcon,
      },
    };

    const selected = palette[status];
    const modeStyles = theme.palette.mode === 'dark' ? selected.dark : selected.light;

    return {
      label: selected.label,
      color: selected.color,
      background: modeStyles.background,
      border: modeStyles.border,
      Icon: selected.Icon,
    };
  };

  const renderSummaryFooter = ({
    label,
    value,
    valueSuffix = '',
    status,
    rangeDescription,
  }: {
    label: string;
    value: string;
    valueSuffix?: string;
    status: SummaryStatus;
    rangeDescription: string;
  }): React.JSX.Element => {
    const statusVisual = getStatusVisuals(status);
    const StatusIcon = statusVisual.Icon;

    const surfaceStyles = liteMode
      ? {
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
              : 'linear-gradient(135deg, rgb(255 255 255 / 90%) 0%, rgb(255 255 255 / 80%) 100%)',
          border: `1px solid ${
            theme.palette.mode === 'dark' ? 'rgb(123 123 123 / 20%)' : 'rgba(203, 213, 225, 0.5)'
          }`,
          boxShadow: 'none',
        }
      : {
          // In full mode, no additional styling since it's handled by the parent container
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        };

    return (
      <Box
        sx={{
          borderRadius: '12px !important',
          background: surfaceStyles.background,
          border: surfaceStyles.border,
          boxShadow: surfaceStyles.boxShadow,
          margin: '0 auto',
          maxWidth: 'lg',
          position: 'relative', // Ensure no positioning conflicts
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1.35fr) minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) minmax(240px, auto)',
            },
            gridTemplateAreas: {
              xs: '"value status" "value status"',
              sm: '"value status"',
            },
            alignItems: { xs: 'stretch', sm: 'center' },
            columnGap: { xs: 1.25, sm: 4, md: 5 },
            rowGap: { xs: 0.75, sm: 0 },
            padding: {
              xs: liteMode ? '18px 20px' : '22px 26px',
              sm: liteMode ? '20px 28px' : '24px 32px',
            },
            maxWidth: { xs: 460, sm: '100%' },
            margin: '0 auto',
          }}
        >
          <Box
            sx={{
              gridArea: 'value',
              minWidth: 0,
              textAlign: { xs: 'left', sm: 'left' },
              pr: { xs: 1, sm: 0 },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                letterSpacing: { xs: '0.07em', sm: '0.08em' },
                fontSize: { xs: '0.72rem', sm: '0.75rem' },
                fontWeight: 600,
                color: theme.palette.text.secondary,
                mb: { xs: 0.6, sm: 0.75 },
              }}
            >
              {label}
            </Typography>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.95rem', sm: '2.25rem' },
                color: theme.palette.mode === 'dark' ? '#f8fafc' : '#0f172a',
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.15,
              }}
            >
              {value}
              {valueSuffix ? (
                <Box
                  component="span"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.3rem' },
                    fontWeight: 600,
                    ml: 0.45,
                    opacity: 0.85,
                  }}
                >
                  {valueSuffix}
                </Box>
              ) : null}
            </Typography>
          </Box>

          <Stack
            spacing={{ xs: 1.1, sm: 1 }}
            alignItems={{ xs: 'flex-end', sm: 'flex-end' }}
            justifyContent={{ xs: 'flex-end', sm: 'flex-end' }}
            sx={{
              gridArea: 'status',
              minWidth: { sm: 220 },
              borderLeft: {
                xs: 'none',
                sm: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.18 : 0.12)}`,
              },
              pl: { xs: 0, sm: 3 },
              ml: { xs: 0, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: { xs: 1, sm: 1 },
              alignSelf: { xs: 'stretch', sm: 'center' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-end', sm: 'flex-end' },
                gap: { xs: 0.85, sm: 1 },
                borderRadius: '999px',
                px: { xs: 1.4, sm: 1.75 },
                py: { xs: 0.6, sm: 0.7 },
                background: statusVisual.background,
                border: `1px solid ${statusVisual.border}`,
              }}
            >
              <StatusIcon sx={{ fontSize: { xs: 19, sm: 20 }, color: statusVisual.color }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.92rem', sm: '0.85rem' },
                  color: statusVisual.color,
                  letterSpacing: 0.15,
                }}
              >
                {statusVisual.label}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: '0.82rem', sm: '0.8rem' },
                lineHeight: { xs: 1.42, sm: 1.4 },
                color: alpha(theme.palette.text.secondary, 0.9),
                whiteSpace: 'pre-line',
                textAlign: 'right',
                letterSpacing: 0.12,
                pr: { xs: 0.25, sm: 0 },
              }}
            >
              {rangeDescription.replace(/-/g, '–')}
            </Typography>
          </Stack>
        </Box>
      </Box>
    );
  };

  const filteredPenData = useMemo(
    () => getFilteredItems(penetrationData, 'pen'),
    [getFilteredItems, penetrationData],
  );
  const filteredCritData = useMemo(
    () => getFilteredItems(criticalData, 'crit'),
    [getFilteredItems, criticalData],
  );
  const filteredArmorResistanceData = useMemo(
    () => getFilteredItems(armorResistanceData, 'armor'),
    [getFilteredItems, armorResistanceData],
  );

  const penSelectableItems = useMemo(
    () =>
      Object.values(filteredPenData)
        .flat()
        .filter((item) => !item.locked),
    [filteredPenData],
  );

  const critSelectableItems = useMemo(
    () =>
      Object.values(filteredCritData)
        .flat()
        .filter((item) => !item.locked),
    [filteredCritData],
  );

  const armorResistanceSelectableItems = useMemo(
    () =>
      Object.values(filteredArmorResistanceData)
        .flat()
        .filter((item) => !item.locked),
    [filteredArmorResistanceData],
  );

  const penAllSelected =
    penSelectableItems.length > 0 && penSelectableItems.every((item) => item.enabled);
  const penNoneSelected = penSelectableItems.every((item) => !item.enabled);
  const critAllSelected =
    critSelectableItems.length > 0 && critSelectableItems.every((item) => item.enabled);
  const critNoneSelected = critSelectableItems.every((item) => !item.enabled);
  const critAnySelected = critSelectableItems.some((item) => item.enabled);
  const armorResistanceAllSelected =
    armorResistanceSelectableItems.length > 0 &&
    armorResistanceSelectableItems.every((item) => item.enabled);
  // const armorResistanceNoneSelected = armorResistanceSelectableItems.every((item) => !item.enabled);
  const armorResistanceAnySelected = armorResistanceSelectableItems.some((item) => item.enabled);

  return (
    <>
      <CalculatorContainer liteMode={liteMode}>
        <Container
          maxWidth={liteMode ? false : 'lg'}
          sx={{
            py: liteMode ? 1 : isMobile ? 1.5 : 2,
            px: liteMode ? 0.5 : isExtraSmall ? 0.5 : isMobile ? 1 : 2,
            // Remove potential stacking context creators
            position: 'static',
            overflow: 'visible',
            transform: 'none',
            willChange: 'auto',
            contain: 'none',
            // Enhanced mobile padding and spacing
            '& .MuiTabs-root': {
              minHeight: isExtraSmall ? '48px' : isMobile ? '52px' : 'auto',
            },
            '& .MuiTab-root': {
              minHeight: isExtraSmall ? '48px' : isMobile ? '52px' : 'auto',
              fontSize: isExtraSmall ? '0.8rem' : isMobile ? '0.85rem' : '0.9rem',
              padding: isExtraSmall ? '6px 8px' : isMobile ? '8px 12px' : '12px 16px',
              textTransform: 'none',
              borderRadius: '8px',
              color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.secondary,
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
              marginRight: 1,
              // Enhanced tablet and mobile touch targets
              minWidth: isTablet ? '100px' : 'auto',
              '&:hover': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              },
              '&.Mui-selected': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main,
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(128, 211, 255, 0.15)'
                    : 'rgba(40, 145, 200, 0.08)',
                border: '1px solid rgba(40, 145, 200, 0.5)',
                borderRadius: '8px',
              },
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            minHeight: 48,
          }}
        >
          {/* Main Calculator */}
          <CalculatorCard liteMode={liteMode} data-calculator-card="true">
            {/* Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                mb: liteMode ? 2 : isMobile ? 3 : 4,
                flexWrap: 'wrap',
                gap: { xs: 2, sm: liteMode ? 1 : isMobile ? 2 : 3 },
                p: liteMode ? 2 : isExtraSmall ? 1.5 : isMobile ? 2 : 4,
                gridArea: 'content',
                borderRadius: '10px',
                borderColor: liteMode
                  ? 'transparent'
                  : theme.palette.mode === 'dark'
                    ? 'rgb(128 211 255 / 20%)'
                    : 'rgb(40 145 200 / 15%)',
                background: liteMode
                  ? theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)'
                    : 'rgba(255, 255, 255, 0.65)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(255, 255, 255, 0.98)',
                position: 'relative',
                // Enhanced mobile responsiveness
                // Better mobile layout with stacked controls
                flexDirection: { xs: 'column', sm: 'row' },
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
              {/* Lite Mode Switch */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  width: { xs: '100%', sm: 'auto' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
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
                            color: 'rgb(56 189 248)',
                            '& + .MuiSwitch-track': {
                              backgroundColor: 'rgba(56, 189, 248, 0.4)',
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

                {/* Mobile Action Buttons */}
                {isMobile && selectedTab === 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const selectableItems = Object.values(filteredPenData)
                          .flat()
                          .filter((item) => !item.locked);
                        selectableItems.forEach((item) => {
                          const category = Object.keys(filteredPenData).find((key) =>
                            filteredPenData[key as keyof CalculatorData].includes(item),
                          ) as keyof CalculatorData;
                          const itemIndex = filteredPenData[category].indexOf(item);
                          updatePenItem(category, itemIndex, { enabled: true });
                        });
                      }}
                      startIcon={<SelectAllIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(21, 34, 50, 0.5)'
                            : 'rgba(235, 244, 252, 0.7)',
                        '&:hover': {
                          borderColor: 'rgba(56, 189, 248, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(21, 34, 50, 0.7)'
                              : 'rgba(235, 244, 252, 0.9)',
                        },
                      }}
                    >
                     Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const selectableItems = Object.values(filteredPenData)
                          .flat()
                          .filter((item) => !item.locked);
                        selectableItems.forEach((item) => {
                          const category = Object.keys(filteredPenData).find((key) =>
                            filteredPenData[key as keyof CalculatorData].includes(item),
                          ) as keyof CalculatorData;
                          const itemIndex = filteredPenData[category].indexOf(item);
                          updatePenItem(category, itemIndex, { enabled: false });
                        });
                      }}
                      startIcon={<ClearIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(153, 27, 27, 0.25)'
                            : 'rgba(254, 226, 226, 0.7)',
                        '&:hover': {
                          borderColor: 'rgba(239, 68, 68, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(153, 27, 27, 0.4)'
                              : 'rgba(254, 226, 226, 0.9)',
                        },
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                {isMobile && selectedTab === 1 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAllCrit(true)}
                      disabled={critAllSelected || critSelectableItems.length === 0}
                      startIcon={<SelectAllIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(21, 34, 50, 0.5)'
                            : 'rgba(235, 244, 252, 0.7)',
                        '&:hover': {
                          borderColor: 'rgba(56, 189, 248, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(21, 34, 50, 0.7)'
                              : 'rgba(235, 244, 252, 0.9)',
                        },
                      }}
                    >
                     Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAllCrit(false)}
                      disabled={!critAnySelected}
                      startIcon={<ClearIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(244, 63, 94, 0.4)'
                            : 'rgba(239, 68, 68, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(153, 27, 27, 0.4)'
                            : 'rgba(254, 226, 226, 0.9)',
                        '&:hover': {
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(244, 63, 94, 0.6)'
                              : 'rgba(239, 68, 68, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(153, 27, 27, 0.6)'
                              : 'rgba(254, 226, 226, 0.9)',
                        },
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                {isMobile && selectedTab === 2 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAllArmorResistance(true)}
                      disabled={
                        armorResistanceAllSelected || armorResistanceSelectableItems.length === 0
                      }
                      startIcon={<SelectAllIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(21, 34, 50, 0.5)'
                            : 'rgba(235, 244, 252, 0.7)',
                        '&:hover': {
                          borderColor: 'rgba(56, 189, 248, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(21, 34, 50, 0.7)'
                              : 'rgba(235, 244, 252, 0.9)',
                        },
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAllArmorResistance(false)}
                      disabled={!armorResistanceAnySelected}
                      startIcon={<ClearIcon sx={{ fontSize: '0.9rem' }} />}
                      sx={{
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.4,
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(153, 27, 27, 0.25)'
                            : 'rgba(254, 226, 226, 0.7)',
                        '&:hover': {
                          borderColor: 'rgba(239, 68, 68, 0.6)',
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(153, 27, 27, 0.4)'
                              : 'rgba(254, 226, 226, 0.9)',
                        },
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </Box>
              {/* Game Mode Selector */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                <div
                  style={{ width: '100%' }}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    display: 'flex',
                  }}
                >
                  <ButtonGroup
                    size={isExtraSmall ? 'small' : liteMode ? 'small' : isMobile ? 'medium' : 'medium'}
                    variant="outlined"
                    disabled={selectedTab === 2}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      '& .MuiButtonGroup-grouped': {
                        flex: 1,
                        minWidth: 0,
                      },
                      '& .MuiButton-root': {
                        border: liteMode
                          ? theme.palette.mode === 'dark'
                            ? '1px solid rgb(128 211 255 / 25%)'
                            : '1px solid rgb(40 145 200 / 20%)'
                          : theme.palette.mode === 'dark'
                            ? '1px solid rgb(128 211 255 / 30%)'
                            : '1px solid rgb(40 145 200 / 25%)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        minHeight: isExtraSmall ? '40px' : isMobile ? '44px' : 'auto',
                        minWidth: 0,
                        fontSize: isExtraSmall ? '0.75rem' : isMobile ? '0.8rem' : '0.85rem',
                        px: isExtraSmall ? 1 : isMobile ? 1.2 : 1.5,
                        flex: 1,
                        '&:hover': {
                          transform: liteMode || isMobile ? 'translateY(-1px)' : 'none',
                          borderColor: 'rgb(128 211 255 / 80%)',
                        },
                        '&:active': {
                          transform: liteMode || isMobile ? 'translateY(0) scale(0.98)' : 'none',
                        },
                        ...(selectedTab === 2 && {
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          '&:hover': {
                            transform: 'none',
                            borderColor: 'inherit',
                          },
                        }),
                      },
                      ...(selectedTab === 2 && {
                        opacity: 0.6,
                        pointerEvents: 'none',
                      }),
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
                </div>
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
                      ? 'rgba(15, 23, 42, 0.0)'
                      : 'rgba(255, 255, 255, 0.0)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.7)'
                      : 'rgba(255, 255, 255, 0.95)',

                  position: 'relative',
                  borderRadius: liteMode ? '8px 8px 0 0' : '8px 8px 0 0',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    p: 0.5,
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(248, 250, 252, 0.8)',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 0 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(0)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '#60a5fa'
                              : '#3b82f6'
                            : 'transparent',
                        border: selectedTab === 0 ? 'none' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor:
                            selectedTab === 0
                              ? theme.palette.mode === 'dark'
                                ? '#3b82f6'
                                : '#2563eb'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(30, 41, 59, 0.1)',
                          border: selectedTab === 0 ? 'none' : '1px solid rgba(148, 163, 184, 0.3)',
                        },
                        transition: 'all 0.2s ease',
                        boxShadow:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.3)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 0 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Penetration
                      </motion.span>
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 1 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(1)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '#60a5fa'
                              : '#3b82f6'
                            : 'transparent',
                        border: selectedTab === 1 ? 'none' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor:
                            selectedTab === 1
                              ? theme.palette.mode === 'dark'
                                ? '#3b82f6'
                                : '#2563eb'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(30, 41, 59, 0.1)',
                          border: selectedTab === 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.3)',
                        },
                        transition: 'all 0.2s ease',
                        boxShadow:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.3)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 1 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Critical
                      </motion.span>
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 2 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(2)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 90%)'
                              : 'rgb(37 99 235 / 95%)'
                            : 'transparent',
                        border: selectedTab === 2 ? 'none' : '1px solid transparent',
                        boxShadow:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.4)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 2 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Armor
                      </motion.span>
                    </Button>
                  </motion.div>
                </Box>

                {/* Action buttons for current tab */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    alignItems: 'center',
                    borderRadius: '10px',
                    backgroundColor: liteMode
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.0)'
                        : 'rgba(255, 255, 255, 0.0)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.3)'
                        : 'rgba(255, 255, 255, 0.5)',
                    borderColor:
                      theme.palette.mode === 'dark'
                        ? 'rgb(128 211 255 / 15%)'
                        : 'rgb(40 145 200 / 12%)',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  {selectedTab === 0 && (
                    <div>
                      <Stack spacing={0} sx={{ minWidth: 0 }}>
                        <Box sx={{ m: 0, p: 0 }}>
                          <ButtonGroup
                            variant="text"
                            disableElevation
                            fullWidth={isMobile}
                            aria-label="Penetration bulk actions"
                            sx={(muiTheme) => ({
                              alignSelf: { xs: 'stretch', sm: 'flex-end' },
                              flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              // transform: 'translateZ(0)', // REMOVED - breaks sticky positioning
                              backgroundColor:
                                muiTheme.palette.mode === 'dark'
                                  ? 'rgba(21, 34, 50, 0.55)'
                                  : 'rgba(235, 244, 252, 0.85)',
                              border: `1px solid ${
                                muiTheme.palette.mode === 'dark'
                                  ? alpha(muiTheme.palette.primary.light, 0.2)
                                  : alpha(muiTheme.palette.primary.main, 0.18)
                              }`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              '& .MuiButton-root': {
                                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                px: { xs: 2.2, sm: 2.6 },
                                py: { xs: 1.05, sm: 0.9 },
                                lineHeight: 1,
                                boxSizing: 'border-box',
                              },
                              '& .MuiButton-root + .MuiButton-root': {
                                borderLeft: {
                                  xs: `1px solid ${alpha(muiTheme.palette.divider, 0.4)}`,
                                  sm: `1px solid ${
                                    muiTheme.palette.mode === 'dark'
                                      ? alpha(muiTheme.palette.primary.light, 0.18)
                                      : alpha(muiTheme.palette.primary.main, 0.15)
                                  }`,
                                },
                              },
                            })}
                          >
                            <Tooltip title="Select All penetration buffs" placement="top" arrow>
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [0, 10, 0] }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <SelectAllIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllPen(true)}
                                  disabled={penAllSelected || penSelectableItems.length === 0}
                                  aria-label="Select All penetration buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.primary.light
                                        : muiTheme.palette.primary.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(40, 82, 120, 0.35)'
                                          : 'rgba(210, 233, 249, 0.85)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.primary.light, 0.6)
                                          : alpha(muiTheme.palette.primary.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Select All
                                </Button>
                              </motion.span>
                            </Tooltip>
                            <Tooltip title="Clear all penetration buffs" placement="top" arrow>
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [-10, 10, -10, 0] }}
                                      transition={{ duration: 0.5 }}
                                    >
                                      <ErrorIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllPen(false)}
                                  disabled={penNoneSelected || penSelectableItems.length === 0}
                                  aria-label="Clear all penetration buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.error.light
                                        : muiTheme.palette.error.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(132, 32, 45, 0.32)'
                                          : 'rgba(255, 235, 233, 0.85)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.error.light, 0.55)
                                          : alpha(muiTheme.palette.error.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Clear all
                                </Button>
                              </motion.span>
                            </Tooltip>
                          </ButtonGroup>
                        </Box>
                      </Stack>
                    </div>
                  )}
                  {selectedTab === 1 && (
                    <div>
                      <Stack spacing={0} sx={{ minWidth: 0 }}>
                        <Box sx={{ m: 0, p: 0 }}>
                          <ButtonGroup
                            variant="text"
                            disableElevation
                            fullWidth={isMobile}
                            aria-label="Critical bulk actions"
                            sx={(muiTheme) => ({
                              alignSelf: { xs: 'stretch', sm: 'flex-end' },
                              flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              // transform: 'translateZ(0)', // REMOVED - breaks sticky positioning
                              backgroundColor:
                                muiTheme.palette.mode === 'dark'
                                  ? 'rgba(21, 34, 50, 0.55)'
                                  : 'rgba(235, 244, 252, 0.85)',
                              border: `1px solid ${
                                muiTheme.palette.mode === 'dark'
                                  ? alpha(muiTheme.palette.primary.light, 0.2)
                                  : alpha(muiTheme.palette.primary.main, 0.18)
                              }`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              '& .MuiButton-root': {
                                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                px: { xs: 2.2, sm: 2.6 },
                                py: { xs: 1.05, sm: 0.9 },
                                lineHeight: 1,
                                boxSizing: 'border-box',
                              },
                              '& .MuiButton-root + .MuiButton-root': {
                                borderLeft: {
                                  xs: `1px solid ${alpha(muiTheme.palette.divider, 0.4)}`,
                                  sm: `1px solid ${
                                    muiTheme.palette.mode === 'dark'
                                      ? alpha(muiTheme.palette.primary.light, 0.18)
                                      : alpha(muiTheme.palette.primary.main, 0.15)
                                  }`,
                                },
                              },
                            })}
                          >
                            <Tooltip title="Select All critical buffs" placement="top" arrow>
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [0, 10, 0] }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <SelectAllIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllCrit(true)}
                                  disabled={critAllSelected || critSelectableItems.length === 0}
                                  aria-label="Select All critical buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.primary.light
                                        : muiTheme.palette.primary.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(40, 82, 120, 0.35)'
                                          : 'rgba(210, 233, 249, 0.85)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.primary.light, 0.6)
                                          : alpha(muiTheme.palette.primary.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Select All
                                </Button>
                              </motion.span>
                            </Tooltip>
                            <Tooltip title="Clear all critical buffs" placement="top" arrow>
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [-10, 10, -10, 0] }}
                                      transition={{ duration: 0.5 }}
                                    >
                                      <ErrorIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllCrit(false)}
                                  disabled={critNoneSelected || critSelectableItems.length === 0}
                                  aria-label="Clear all critical buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.error.light
                                        : muiTheme.palette.error.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(137, 48, 52, 0.3)'
                                          : 'rgba(255, 235, 233, 0.85)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.error.light, 0.55)
                                          : alpha(muiTheme.palette.error.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Clear all
                                </Button>
                              </motion.span>
                            </Tooltip>
                          </ButtonGroup>
                        </Box>
                      </Stack>
                    </div>
                  )}
                  {selectedTab === 2 && (
                    <div>
                      <Stack spacing={0} sx={{ minWidth: 0 }}>
                        <Box sx={{ m: 0, p: 0 }}>
                          <ButtonGroup
                            variant="text"
                            disableElevation
                            fullWidth={isMobile}
                            aria-label="Armor resistance bulk actions"
                            sx={(muiTheme) => ({
                              alignSelf: { xs: 'stretch', sm: 'flex-end' },
                              flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              backgroundColor:
                                muiTheme.palette.mode === 'dark'
                                  ? 'rgba(21, 34, 50, 0.55)'
                                  : 'rgba(235, 244, 252, 0.85)',
                              border: `1px solid ${
                                muiTheme.palette.mode === 'dark'
                                  ? alpha(muiTheme.palette.primary.light, 0.2)
                                  : alpha(muiTheme.palette.primary.main, 0.18)
                              }`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              '& .MuiButton-root': {
                                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                px: { xs: 2.2, sm: 2.6 },
                                py: { xs: 1.05, sm: 0.9 },
                                lineHeight: 1,
                                boxSizing: 'border-box',
                              },
                              '& .MuiButton-root + .MuiButton-root': {
                                borderLeft: {
                                  xs: `1px solid ${alpha(muiTheme.palette.divider, 0.4)}`,
                                  sm: `1px solid ${
                                    muiTheme.palette.mode === 'dark'
                                      ? alpha(muiTheme.palette.primary.light, 0.18)
                                      : alpha(muiTheme.palette.primary.main, 0.15)
                                  }`,
                                },
                              },
                            })}
                          >
                            <Tooltip
                              title="Select All armor resistance buffs"
                              placement="top"
                              arrow
                            >
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [0, 10, 0] }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <SelectAllIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllArmorResistance(true)}
                                  disabled={
                                    armorResistanceAllSelected ||
                                    armorResistanceSelectableItems.length === 0
                                  }
                                  aria-label="Select All armor resistance buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.primary.light
                                        : muiTheme.palette.primary.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(40, 82, 120, 0.35)'
                                          : 'rgba(210, 233, 249, 0.85)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.primary.light, 0.6)
                                          : alpha(muiTheme.palette.primary.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Select All
                                </Button>
                              </motion.span>
                            </Tooltip>
                            <Tooltip title="Clear all armor resistance buffs" placement="top" arrow>
                              <motion.span
                                style={{ display: 'flex', flex: '1 1 auto' }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  disableRipple
                                  startIcon={
                                    <motion.div
                                      initial={{ rotate: 0 }}
                                      whileHover={{ rotate: [-10, 10, -10, 0] }}
                                      transition={{ duration: 0.5 }}
                                    >
                                      <ErrorIcon sx={{ fontSize: 18 }} />
                                    </motion.div>
                                  }
                                  onClick={() => toggleAllArmorResistance(false)}
                                  disabled={!armorResistanceAnySelected}
                                  aria-label="Clear all armor resistance buffs"
                                  sx={(muiTheme) => ({
                                    color:
                                      muiTheme.palette.mode === 'dark'
                                        ? muiTheme.palette.error.light
                                        : muiTheme.palette.error.main,
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                      backgroundColor:
                                        muiTheme.palette.mode === 'dark'
                                          ? 'rgba(153, 27, 27, 0.25)'
                                          : 'rgba(252, 165, 165, 0.25)',
                                    },
                                    '&:focus-visible': {
                                      outline: `2px solid ${
                                        muiTheme.palette.mode === 'dark'
                                          ? alpha(muiTheme.palette.error.light, 0.6)
                                          : alpha(muiTheme.palette.error.main, 0.5)
                                      }`,
                                      outlineOffset: 2,
                                    },
                                    '&.Mui-disabled': {
                                      color: muiTheme.palette.text.disabled,
                                      backgroundColor: 'transparent',
                                    },
                                  })}
                                >
                                  Clear all
                                </Button>
                              </motion.span>
                            </Tooltip>
                          </ButtonGroup>
                        </Box>
                      </Stack>
                    </div>
                  )}
                </Box>
              </Box>
            ) : (
              /* Mobile Tabs */
              <Box
                sx={{
                  mb: isMobile ? 3 : 4,
                  px: isMobile ? 2 : 4,
                  width: '100%',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    p: 0.5,
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(248, 250, 252, 0.8)',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 0 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(0)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '#60a5fa'
                              : '#3b82f6'
                            : 'transparent',
                        border: selectedTab === 0 ? 'none' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor:
                            selectedTab === 0
                              ? theme.palette.mode === 'dark'
                                ? '#3b82f6'
                                : '#2563eb'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(30, 41, 59, 0.1)',
                          border: selectedTab === 0 ? 'none' : '1px solid rgba(148, 163, 184, 0.3)',
                        },
                        transition: 'all 0.2s ease',
                        boxShadow:
                          selectedTab === 0
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.3)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 0 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Penetration
                      </motion.span>
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 1 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(1)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '#60a5fa'
                              : '#3b82f6'
                            : 'transparent',
                        border: selectedTab === 1 ? 'none' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor:
                            selectedTab === 1
                              ? theme.palette.mode === 'dark'
                                ? '#3b82f6'
                                : '#2563eb'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(30, 41, 59, 0.1)',
                          border: selectedTab === 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.3)',
                        },
                        transition: 'all 0.2s ease',
                        boxShadow:
                          selectedTab === 1
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.3)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 1 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Critical
                      </motion.span>
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }} style={{ flex: 1 }}>
                    <Button
                      fullWidth
                      variant={selectedTab === 2 ? 'contained' : 'text'}
                      onClick={() => setSelectedTab(2)}
                      sx={{
                        py: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '8px',
                        color:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? '#0f172a'
                              : '#ffffff'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(30, 41, 59, 0.7)',
                        backgroundColor:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? 'rgb(128 211 255 / 90%)'
                              : 'rgb(37 99 235 / 95%)'
                            : 'transparent',
                        border: selectedTab === 2 ? 'none' : '1px solid transparent',
                        boxShadow:
                          selectedTab === 2
                            ? theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(96, 165, 250, 0.4)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            : 'none',
                      }}
                    >
                      <motion.span
                        initial={false}
                        animate={{
                          scale: selectedTab === 2 ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        Armor
                      </motion.span>
                    </Button>
                  </motion.div>
                </Box>
              </Box>
            )}

            {/* Tab Content */}
            <Box sx={{ px: { xs: 1.5, sm: 3.75 }, pb: 3 }}>
              <TabPanel value={selectedTab} index={0}>
                {(() => {
                  return liteMode ? (
                    // Lite mode: render all penetration items in a single flattened list
                    <List sx={{ p: 0 }}>
                      {Object.values(filteredPenData).flatMap((items, categoryIndex) =>
                        items.map((item: CalculatorItem, itemIndex: number) =>
                          renderItem(
                            item,
                            item.originalIndex ?? itemIndex,
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

                {/* Footer removed from inside TabPanel - moved outside */}
              </TabPanel>

              <TabPanel value={selectedTab} index={1}>
                {(() => {
                  return liteMode ? (
                    // Lite mode: render all critical items in a single flattened list
                    <List sx={{ p: 0 }}>
                      {Object.values(filteredCritData).flatMap((items, categoryIndex) =>
                        items.map((item: CalculatorItem, itemIndex: number) =>
                          renderItem(
                            item,
                            item.originalIndex ?? itemIndex,
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

                {/* Footer removed from inside TabPanel - moved outside */}
              </TabPanel>

              <TabPanel value={selectedTab} index={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Armor Resistance Calculator Categories */}
                  {!liteMode && (
                    <>
                      {renderSection(
                        'Group Buffs',
                        armorResistanceData.groupBuffs,
                        'groupBuffs',
                        updateArmorResistanceItem,
                      )}
                      {renderSection(
                        'Class & Race Passives',
                        armorResistanceData.classPassives,
                        'classPassives',
                        updateArmorResistanceItem,
                      )}
                      {renderSection(
                        'Light Armor',
                        armorResistanceGearSections.light,
                        'gear',
                        updateArmorResistanceItem,
                      )}
                      {renderSection(
                        'Medium Armor',
                        armorResistanceGearSections.medium,
                        'gear',
                        updateArmorResistanceItem,
                      )}
                      {renderSection(
                        'Heavy Armor',
                        armorResistanceGearSections.heavy,
                        'gear',
                        updateArmorResistanceItem,
                      )}
                      {renderSection(
                        'Shield',
                        armorResistanceGearSections.shield,
                        'gear',
                        updateArmorResistanceItem,
                      )}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Sets
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceSets.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>
                      {/* Passives */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Passives
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {filteredPassives.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Champion Points */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Champion Points
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {filteredCp.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>
                    </>
                  )}

                  {/* Lite Mode - All categories in one */}
                  {liteMode && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Group Buffs */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Group Buffs
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceData.groupBuffs.map((item, index) =>
                            renderItem(item, index, 'groupBuffs', updateArmorResistanceItem),
                          )}
                        </List>
                      </Box>

                      {/* Light Armor */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Light Armor
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceGearSections.light.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              'gear',
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Medium Armor */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Medium Armor
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceGearSections.medium.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              'gear',
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Heavy Armor */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Heavy Armor
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceGearSections.heavy.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              'gear',
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Shield */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Shield
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceGearSections.shield.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              'gear',
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Set Items */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Set Items
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceSets.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Class Passives */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Class Passives
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {armorResistanceData.classPassives.map((item, index) =>
                            renderItem(item, index, 'classPassives', updateArmorResistanceItem),
                          )}
                        </List>
                      </Box>

                      {/* Other Passives */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Other Passives
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {filteredPassives.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>

                      {/* Champion Points */}
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Champion Points
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {filteredCp.map((item, index) =>
                            renderItem(
                              item,
                              item.originalIndex ?? index,
                              item.category as keyof CalculatorData,
                              updateArmorResistanceItem,
                            ),
                          )}
                        </List>
                      </Box>
                    </Box>
                  )}
                </Box>
                {/* Footer removed from inside TabPanel - moved outside */}
              </TabPanel>
            </Box>

            {/* Footer positioned outside TabPanels but inside CalculatorCard */}
            <Box ref={placeholderRef} sx={{ minHeight: placeholderHeight }}>
              <Box
                ref={footerRef}
                sx={{
                  px: 0, // Remove horizontal padding
                  pb: 0, // Remove bottom padding
                  position: 'relative',
                  zIndex: 5,
                  backgroundColor: liteMode
                    ? 'transparent'
                    : theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  borderRadius: liteMode ? '0' : '12px',
                  boxShadow: liteMode
                    ? 'none'
                    : theme.palette.mode === 'dark'
                      ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                      : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  marginTop: '20px',
                }}
                style={footerStyle}
              >
                {selectedTab === 0 &&
                  renderSummaryFooter({
                    label: 'Total Penetration',
                    value: penTotal.toLocaleString(),
                    status: penStatus,
                    rangeDescription:
                      gameMode === 'pve'
                        ? 'Target: 18,200–18,999'
                        : gameMode === 'pvp'
                          ? 'Target: 33,100–33,500'
                          : 'PvE: 18,200–18,999\nPvP: 33,100–33,500',
                  })}
                {selectedTab === 1 &&
                  renderSummaryFooter({
                    label: 'Total Critical Damage',
                    value: critTotal.toLocaleString(undefined, { maximumFractionDigits: 1 }),
                    valueSuffix: '%',
                    status: critStatus,
                    rangeDescription:
                      gameMode === 'pve'
                        ? 'Target: 125%+'
                        : gameMode === 'pvp'
                          ? 'Target: 100%+'
                          : 'PvE: 125%+\nPvP: 100%+',
                  })}
                {selectedTab === 2 &&
                  renderSummaryFooter({
                    label: 'Total Armor Resistance',
                    value: armorResistanceTotal.toLocaleString(),
                    status: armorResistanceStatus,
                    rangeDescription: 'Target: 33,100–33,500\nCap: 33,500',
                  })}
              </Box>
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
              <Typography
                variant="body2"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.secondary',
                }}
              >
                Grey italic numbers show per-stack values for stackable buffs
              </Typography>
            </Box>
          )}
        </Container>

        {/* Armor Variant Selection Modal for Mobile */}
        <Dialog
          open={variantModalOpen}
          onClose={() => {
            setVariantModalOpen(false);
            setCurrentEditingIndex(null);
          }}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: '12px',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(56, 189, 248, 0.3)'
                  : 'rgba(40, 145, 200, 0.2)'
              }`,
              boxShadow:
                theme.palette.mode === 'dark'
                  ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                  : '0 8px 32px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <DialogTitle
            sx={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
              pb: 1,
            }}
          >
            Select Armor Variant
          </DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Stack spacing={3}>
              {['Regular', 'Reinforced', 'Nirnhoned'].map((variant) => {
                const isSelected = tempSelectedVariant === variant;

                // Quality rating is handled globally below

                return (
                  <Box key={variant}>
                    <Button
                      fullWidth
                      size="large"
                      onClick={() => {
                        setTempSelectedVariant(variant);
                      }}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        py: 1.5,
                        border: '2px solid',
                        borderColor: isSelected
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.8)'
                            : 'rgba(40, 145, 200, 0.6)'
                          : theme.palette.mode === 'dark'
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'rgba(40, 145, 200, 0.2)',
                        background: isSelected
                          ? theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(0, 225, 255, 0.15) 100%)'
                            : 'linear-gradient(135deg, rgba(40, 145, 200, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)'
                          : 'transparent',
                        color: isSelected
                          ? theme.palette.mode === 'dark'
                            ? 'rgb(199 234 255)'
                            : 'rgb(40, 145, 200)'
                          : theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.7)'
                            : theme.palette.text.secondary,
                        '&:hover': {
                          borderColor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(56, 189, 248, 0.6)'
                              : 'rgba(40, 145, 200, 0.4)',
                          background:
                            theme.palette.mode === 'dark'
                              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(0, 225, 255, 0.1) 100%)'
                              : 'linear-gradient(135deg, rgba(40, 145, 200, 0.08) 0%, rgba(56, 189, 248, 0.05) 100%)',
                        },
                      }}
                    >
                      {variant === 'Regular'
                        ? 'Regular'
                        : variant === 'Reinforced'
                          ? 'Reinforced'
                          : 'Nirnhoned'}
                    </Button>
                  </Box>
                );
              })}

              {/* Divider */}
              <Divider
                sx={{
                  borderColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(40, 145, 200, 0.2)',
                }}
              />

              {/* Single Quality Rating */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pt: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : theme.palette.text.primary,
                    textAlign: 'center',
                  }}
                >
                  Gear Quality
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                  }}
                >
                  {(() => {
                    // Calculate quality rating values once for the current item
                    const currentItem =
                      currentEditingIndex !== null
                        ? armorResistanceData.gear[currentEditingIndex]
                        : null;
                    const qualityLevel =
                      typeof currentItem?.qualityLevel === 'number'
                        ? currentItem.qualityLevel
                        : ARMOR_QUALITY_LABELS.length - 1;
                    const ratingValue = qualityLevel + 1;
                    const qualityLabel =
                      ARMOR_QUALITY_LABELS[qualityLevel] ??
                      ARMOR_QUALITY_LABELS[ARMOR_QUALITY_LABELS.length - 1];

                    return (
                      <>
                        <Tooltip title={`Gear Quality: ${qualityLabel}`}>
                          <Rating
                            name="modal-armor-quality"
                            value={ratingValue}
                            max={ARMOR_QUALITY_LABELS.length}
                            precision={1}
                            size="large"
                            onChange={(event, newValue) => {
                              event.stopPropagation();
                              if (typeof newValue === 'number' && currentEditingIndex !== null) {
                                updateArmorResistanceQuality(currentEditingIndex, newValue - 1);
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onTouchStart={(event) => event.stopPropagation()}
                            getLabelText={(value: number) =>
                              `${ARMOR_QUALITY_LABELS[value - 1] ?? value} quality`
                            }
                            sx={{
                              '& .MuiRating-iconFilled': {
                                color: 'rgb(255 222 148)',
                              },
                              '& .MuiRating-iconHover': {
                                color: 'rgb(255 234 179)',
                              },
                            }}
                          />
                        </Tooltip>
                        <Typography
                          variant="h6"
                          sx={{
                            ml: 2,
                            fontWeight: 600,
                            color:
                              theme.palette.mode === 'dark'
                                ? 'rgb(199 234 255)'
                                : 'rgb(40, 145, 200)',
                          }}
                        >
                          {qualityLabel}
                        </Typography>
                      </>
                    );
                  })()}
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              onClick={() => {
                setVariantModalOpen(false);
                setCurrentEditingIndex(null);
                setTempSelectedVariant('Regular');
              }}
              sx={{
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (currentEditingIndex !== null) {
                  // Direct variant setting instead of complex cycling
                  setArmorResistanceVariant(currentEditingIndex, tempSelectedVariant);
                }
                setVariantModalOpen(false);
                setCurrentEditingIndex(null);
                setTempSelectedVariant('Regular');
              }}
              sx={{
                borderRadius: '6px',
                textTransform: 'none',
                fontWeight: 600,
              }}
              variant="outlined"
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      </CalculatorContainer>
    </>
  );
};

const Calculator = React.memo(CalculatorComponent);
Calculator.displayName = 'Calculator';

export { Calculator };
