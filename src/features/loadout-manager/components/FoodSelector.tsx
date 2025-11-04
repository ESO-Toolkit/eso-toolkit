/**
 * Food & Drink Selector Component
 * Allows selection of food/drink buffs for the loadout
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Clear, Restaurant } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { FoodConfig } from '../types/loadout.types';
import { updateFood } from '../store/loadoutSlice';

interface FoodSelectorProps {
  food: FoodConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

// Placeholder food items (will be replaced with actual ESO food database)
const PLACEHOLDER_FOODS = [
  {
    id: 100498,
    name: 'Ghastly Eye Bowl',
    type: 'food',
    description: 'Max Health, Health Recovery, Magicka/Stamina',
  },
  {
    id: 61350,
    name: 'Artaeum Takeaway Broth',
    type: 'food',
    description: 'Max Health, Health Recovery, Magicka/Stamina Recovery',
  },
  {
    id: 61335,
    name: 'Bewitched Sugar Skulls',
    type: 'food',
    description: 'Max Health, Max Magicka, Magicka Recovery',
  },
  {
    id: 127531,
    name: 'Candied Jester\'s Coins',
    type: 'food',
    description: 'Max Health, Max Stamina, Stamina Recovery',
  },
  {
    id: 61360,
    name: 'Orzorga\'s Smoked Bear Haunch',
    type: 'food',
    description: 'Max Health, Health Recovery, Max Stamina',
  },
];

const PLACEHOLDER_DRINKS = [
  {
    id: 64221,
    name: 'Essence of Health (Tri-Stat)',
    type: 'drink',
    description: 'Health, Magicka, and Stamina Recovery',
  },
  {
    id: 64223,
    name: 'Essence of Magicka (Magicka)',
    type: 'drink',
    description: 'Max Magicka, Magicka Recovery',
  },
  {
    id: 64222,
    name: 'Essence of Stamina (Stamina)',
    type: 'drink',
    description: 'Max Stamina, Stamina Recovery',
  },
];

const ALL_CONSUMABLES = [...PLACEHOLDER_FOODS, ...PLACEHOLDER_DRINKS];

export const FoodSelector: React.FC<FoodSelectorProps> = ({
  food,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');

  const handleFoodChange = (itemIdString: string) => {
    if (itemIdString === '') {
      dispatch(updateFood({ trialId, pageIndex, setupIndex, food: {} }));
    } else {
      // Store as ID (number)
      const itemId = parseInt(itemIdString, 10);
      dispatch(updateFood({
        trialId,
        pageIndex,
        setupIndex,
        food: { id: itemId },
      }));
    }
  };

  const handleClear = () => {
    dispatch(updateFood({ trialId, pageIndex, setupIndex, food: {} }));
  };

  const getCurrentItem = () => {
    if (!food.id && !food.link) return null;
    // Parse ID from link or use directly
    let itemId = food.id;
    if (food.link && !itemId) {
      // Parse from ESO item link format: |H1:item:61350:...|h|h
      const match = food.link.match(/\|H1:item:(\d+):/);
      if (match) {
        itemId = parseInt(match[1], 10);
      }
    }
    return ALL_CONSUMABLES.find((item) => item.id === itemId);
  };

  const filteredItems = ALL_CONSUMABLES.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentItem = getCurrentItem();

  return (
    <Stack spacing={3}>
      {/* Info Alert */}
      <Alert severity="info" icon={<Restaurant />}>
        <Typography variant="body2">
          Select food or drink for this setup. This will be included in the exported loadout.
        </Typography>
      </Alert>

      {/* Current Selection */}
      {currentItem && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.light' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {currentItem.name}
                </Typography>
                <Chip
                  label={currentItem.type.toUpperCase()}
                  size="small"
                  color={currentItem.type === 'food' ? 'success' : 'info'}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {currentItem.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Item ID: {currentItem.id}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleClear} color="error">
              <Clear />
            </IconButton>
          </Stack>
        </Paper>
      )}

      {/* Search Field */}
      <TextField
        label="Search Food/Drink"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Type to filter..."
        size="small"
      />

      {/* Food/Drink Selector */}
      <FormControl fullWidth>
        <InputLabel>Select Food or Drink</InputLabel>
        <Select
          value={food.id?.toString() || ''}
          label="Select Food or Drink"
          onChange={(e) => handleFoodChange(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {filteredItems.map((item) => (
            <MenuItem key={item.id} value={item.id.toString()}>
              <Stack direction="row" spacing={1} alignItems="center" width="100%">
                <Typography flex={1}>{item.name}</Typography>
                <Chip
                  label={item.type}
                  size="small"
                  color={item.type === 'food' ? 'success' : 'info'}
                />
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Placeholder Note */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Implementation Notes:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="body2">
            Currently showing placeholder food/drink items
          </Typography>
          <Typography component="li" variant="body2">
            Full ESO food database will be integrated in next phase
          </Typography>
          <Typography component="li" variant="body2">
            Will support ESO item link format (|H1:item:...|h|h)
          </Typography>
          <Typography component="li" variant="body2">
            Will include food categories: Max stat foods, recovery foods, tri-stat, etc.
          </Typography>
        </Box>
      </Paper>
    </Stack>
  );
};
