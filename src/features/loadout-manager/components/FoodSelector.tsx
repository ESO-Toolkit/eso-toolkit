/**
 * Food & Drink Selector Component
 * Allows selection of food/drink buffs for the loadout
 */

import { HelpOutline, Restaurant } from '@mui/icons-material';
import { Alert, Box, Chip, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import Autocomplete, { AutocompleteInputChangeReason } from '@mui/material/Autocomplete';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';

import { ESO_CONSUMABLES, ESO_CONSUMABLE_LOOKUP, EsoConsumable } from '@/data/esoConsumables';

import { updateFood } from '../store/loadoutSlice';
import { FoodConfig } from '../types/loadout.types';

interface FoodSelectorProps {
  food: FoodConfig;
  trialId: string;
  pageIndex: number;
  setupIndex: number;
}

interface DisplayConsumable {
  id: number;
  name: string;
  type: 'food' | 'drink';
  description: string;
  category?: string;
  quality?: number;
  recipeId?: number;
}

const FOOD_SELECTOR_KB_URL = '/docs/loadout/food-selector';

const MIN_SEARCH_LENGTH = 2;

const UESP_ICON_CDN = 'https://esoicons.uesp.net/esoui/art/treeicons';

/** Maps provisioning categories to their UESP tree icons */
const CATEGORY_ICON_MAP: Record<string, string> = {
  'Meat Dishes': 'provisioner_indexicon_meat_up',
  'Fruit Dishes': 'provisioner_indexicon_stew_up',
  'Vegetable Dishes': 'provisioner_indexicon_baked_up',
  Savouries: 'provisioner_indexicon_meat_up',
  Ragout: 'provisioner_indexicon_stew_up',
  Entremet: 'provisioner_indexicon_baked_up',
  Gourmet: 'provisioner_indexicon_stew_up',
  Delicacies: 'provisioner_indexicon_spirits_up',
  'Alcoholic Drinks': 'provisioner_indexicon_beer_up',
  Tea: 'provisioner_indexicon_spirits_up',
  Tonics: 'provisioner_indexicon_wine_up',
  Liqueurs: 'provisioner_indexicon_spirits_up',
  Tinctures: 'provisioner_indexicon_beer_up',
  'Cordial Teas': 'provisioner_indexicon_wine_up',
  Distillates: 'provisioner_indexicon_spirits_up',
};

const getCategoryIconUrl = (category?: string): string | null => {
  if (!category) return null;
  const icon = CATEGORY_ICON_MAP[category];
  return icon ? `${UESP_ICON_CDN}/${icon}.png` : null;
};

const toDisplayConsumable = (item: EsoConsumable): DisplayConsumable => ({
  id: item.id,
  name: item.name,
  type: item.type,
  category: item.category,
  quality: item.quality,
  recipeId: item.recipeId,
  description: `Recipe ID: ${item.recipeId}`,
});

const BASE_CONSUMABLES: DisplayConsumable[] = ESO_CONSUMABLES.map(toDisplayConsumable);

const deriveItemIdFromLink = (link?: string): number | null => {
  if (!link) {
    return null;
  }

  const match = link.match(/\|H\d+:item:(\d+):/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
};

const deriveNameFromLink = (link?: string): string | null => {
  if (!link) {
    return null;
  }

  const match = link.match(/\|h([^|]*)\|h$/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

export const FoodSelector: React.FC<FoodSelectorProps> = ({
  food,
  trialId,
  pageIndex,
  setupIndex,
}) => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = React.useState('');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const resolvedConsumable = React.useMemo<DisplayConsumable | null>(() => {
    if ((!food.id || !Number.isFinite(food.id)) && !food.link) {
      return null;
    }

    const itemId = food.id ?? deriveItemIdFromLink(food.link ?? '') ?? undefined;
    if (!itemId) {
      return null;
    }

    const known = ESO_CONSUMABLE_LOOKUP[itemId];
    if (known) {
      return toDisplayConsumable(known);
    }

    const linkName = deriveNameFromLink(food.link ?? '');
    return {
      id: itemId,
      name: linkName && linkName.length > 0 ? linkName : `Item ${itemId}`,
      type: 'food',
      description: "Imported from Wizard's Wardrobe export. Add to catalog to enable metadata.",
    };
  }, [food]);

  const consumables = React.useMemo(() => {
    if (!resolvedConsumable) {
      return BASE_CONSUMABLES;
    }

    const alreadyPresent = BASE_CONSUMABLES.some((item) => item.id === resolvedConsumable.id);
    return alreadyPresent ? BASE_CONSUMABLES : [...BASE_CONSUMABLES, resolvedConsumable];
  }, [resolvedConsumable]);

  const handleClear = (): void => {
    dispatch(updateFood({ trialId, pageIndex, setupIndex, food: {} }));
    setInputValue('');
    setDropdownOpen(false);
  };

  const handleSelect = (item: DisplayConsumable | null): void => {
    if (!item) {
      handleClear();
      return;
    }

    dispatch(
      updateFood({
        trialId,
        pageIndex,
        setupIndex,
        food: { id: item.id },
      }),
    );
  };

  const filterConsumables = React.useCallback(
    (
      options: DisplayConsumable[],
      { inputValue: optionInput }: { inputValue: string },
    ): DisplayConsumable[] => {
      const query = optionInput.trim().toLowerCase();
      if (query.length < MIN_SEARCH_LENGTH) {
        return [];
      }

      return options.filter((item) =>
        `${item.name} ${item.category ?? ''}`.toLowerCase().includes(query),
      );
    },
    [],
  );

  const noOptionsText =
    inputValue.trim().length < MIN_SEARCH_LENGTH
      ? `Enter at least ${MIN_SEARCH_LENGTH} characters to search`
      : 'No consumables match your search';

  const currentItem = resolvedConsumable;

  const handleAutocompleteChange = (
    _event: React.SyntheticEvent,
    option: DisplayConsumable | null,
  ): void => {
    if (option) {
      handleSelect(option);
      setInputValue(option.name);
    } else {
      handleClear();
    }

    setDropdownOpen(false);
  };

  const handleInputChange = (
    _event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason,
  ): void => {
    setInputValue(value);

    if (reason === 'reset') {
      return;
    }

    if (reason === 'clear' || reason === 'blur') {
      setDropdownOpen(false);
      return;
    }

    if (value.trim().length >= MIN_SEARCH_LENGTH) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  };

  const handleAutocompleteOpen = (): void => {
    if (inputValue.trim().length >= MIN_SEARCH_LENGTH) {
      setDropdownOpen(true);
    }
  };

  const handleAutocompleteClose = (): void => {
    setDropdownOpen(false);
  };

  React.useEffect(() => {
    if (currentItem) {
      setInputValue(currentItem.name);
    } else if (!food.id && !food.link) {
      setInputValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.id]);

  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={<Restaurant />}>
        <Typography variant="body2">
          Select food or drink for this setup. This will be included in the exported loadout.
        </Typography>
      </Alert>

      <Autocomplete
        fullWidth
        disablePortal
        disableClearable
        open={dropdownOpen}
        onOpen={handleAutocompleteOpen}
        onClose={handleAutocompleteClose}
        options={consumables}
        value={currentItem ?? undefined}
        onChange={handleAutocompleteChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        filterOptions={filterConsumables}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => option.name}
        noOptionsText={noOptionsText}
        renderOption={(props, option) => {
          const iconUrl = getCategoryIconUrl(option.category);
          return (
            <li {...props}>
              <Stack direction="row" spacing={1.5} alignItems="center" width="100%">
                {iconUrl && (
                  <Box
                    component="img"
                    src={iconUrl}
                    alt=""
                    sx={{ width: 28, height: 28, flexShrink: 0, opacity: 0.85 }}
                  />
                )}
                <Stack spacing={0} flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} noWrap>
                      {option.name}
                    </Typography>
                    <Chip
                      label={option.type.toUpperCase()}
                      size="small"
                      color={option.type === 'food' ? 'success' : 'info'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {[
                      option.category,
                      typeof option.quality === 'number' ? `Quality ${option.quality}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </Typography>
                </Stack>
              </Stack>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Food or Drink"
            placeholder={`Type at least ${MIN_SEARCH_LENGTH} characters`}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  <Tooltip title="Open Food Selector knowledge base">
                    <IconButton
                      size="small"
                      component={RouterLink}
                      to={FOOD_SELECTOR_KB_URL}
                      aria-label="Open Food Selector knowledge base"
                      sx={{ mr: 0.5 }}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        blurOnSelect
        handleHomeEndKeys
      />

      {currentItem &&
        (() => {
          const iconUrl = getCategoryIconUrl(currentItem.category);
          return (
            <Box
              display="flex"
              alignItems="center"
              gap={1.5}
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.success.light}`,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(46, 125, 50, 0.18)'
                    : 'rgba(76, 175, 80, 0.12)',
              }}
            >
              {iconUrl && (
                <Box
                  component="img"
                  src={iconUrl}
                  alt=""
                  sx={{ width: 36, height: 36, flexShrink: 0 }}
                />
              )}
              <Box flex={1} minWidth={0}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600} noWrap>
                    {currentItem.name}
                  </Typography>
                  <Chip
                    label={currentItem.type.toUpperCase()}
                    size="small"
                    color={currentItem.type === 'food' ? 'success' : 'info'}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                  {currentItem.category && (
                    <Chip
                      label={currentItem.category}
                      size="small"
                      color="default"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[
                    typeof currentItem.quality === 'number'
                      ? `Quality ${currentItem.quality}`
                      : null,
                    `Item ${currentItem.id}`,
                    typeof currentItem.recipeId === 'number'
                      ? `Recipe ${currentItem.recipeId}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Typography>
              </Box>
            </Box>
          );
        })()}
    </Stack>
  );
};
