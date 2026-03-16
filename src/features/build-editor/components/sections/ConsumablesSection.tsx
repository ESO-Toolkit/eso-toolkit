/**
 * Consumables Section — potions and food/drink buffs.
 * Glass-style tabs, food search with category icons, accent-themed add buttons.
 */

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ESO_CONSUMABLES, ESO_CONSUMABLE_LOOKUP } from '@/data/esoConsumables';
import type { EsoConsumable } from '@/data/esoConsumables';
import type { RootState } from '@/store/storeWithHistory';

import { setConsumables } from '../../store/buildEditorSlice';
import { glassInputSx } from '../primitives/glassInputSx';
import { GlassPanel } from '../primitives/GlassPanel';

// ─── Food category → UESP tree icon mapping ─────────────────────────────────

const UESP_ICON_CDN = 'https://esoicons.uesp.net/esoui/art/treeicons';

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

// ─── Style helpers ───────────────────────────────────────────────────────────

/** Glass pill button for add actions */
const glassAddBtnSx = (isDark: boolean): Record<string, unknown> => ({
  alignSelf: 'flex-start' as const,
  fontSize: 11,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  borderRadius: '99px',
  textTransform: 'none' as const,
  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
  color: 'var(--be-accent, #38bdf8)',
  backdropFilter: 'blur(6px)',
  '&:hover': {
    borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
    background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
  },
  '&.Mui-disabled': {
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    color: 'text.disabled',
  },
});

/** Glass empty state container */
const glassEmptySx = (isDark: boolean): Record<string, unknown> => ({
  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
  p: 3,
  textAlign: 'center' as const,
  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
});

const MIN_SEARCH_LENGTH = 2;

export const ConsumablesSection: React.FC = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState<'potions' | 'food'>('food');
  const [foodSearchOpen, setFoodSearchOpen] = useState(false);
  const [foodQuery, setFoodQuery] = useState('');
  const deferredFoodQuery = useDeferredValue(foodQuery);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  // Resolve the currently selected food from the lookup
  const currentFood = useMemo(() => {
    const id = setup.consumables.food.id;
    if (id == null) return null;
    return ESO_CONSUMABLE_LOOKUP[id] ?? null;
  }, [setup.consumables.food.id]);

  // Filter consumables based on search query
  const foodResults = useMemo(() => {
    if (deferredFoodQuery.length < MIN_SEARCH_LENGTH) return [];
    const q = deferredFoodQuery.toLowerCase();
    return ESO_CONSUMABLES.filter(
      (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [deferredFoodQuery]);

  const handleSelectFood = useCallback(
    (_event: React.SyntheticEvent, option: EsoConsumable | null) => {
      if (!option) return;
      dispatch(
        setConsumables({
          ...setup.consumables,
          food: { id: option.id, name: option.name },
        }),
      );
      setFoodSearchOpen(false);
      setFoodQuery('');
    },
    [dispatch, setup.consumables],
  );

  const handleClearFood = useCallback(() => {
    dispatch(
      setConsumables({
        ...setup.consumables,
        food: {},
      }),
    );
  }, [dispatch, setup.consumables]);

  return (
    <Stack spacing={1.5}>
      {/* Glass pill tab switcher */}
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {(['potions', 'food'] as const).map((t) => {
          const isActive = tab === t;
          const label = t === 'potions' ? 'Potions' : 'Foods / Drinks';
          return (
            <Box
              key={t}
              onClick={() => setTab(t)}
              sx={{
                flex: 1,
                py: 0.75,
                textAlign: 'center',
                borderRadius: '99px',
                cursor: 'pointer',
                background: isActive
                  ? isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                backdropFilter: isActive ? 'blur(6px)' : 'none',
                boxShadow: isActive
                  ? '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                  : 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)',
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12,
                  color: isActive ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {tab === 'potions' && (
        <Stack spacing={1}>
          {setup.consumables.potions.length === 0 ? (
            <Box sx={glassEmptySx(isDark)}>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
              >
                No potions added yet
              </Typography>
            </Box>
          ) : (
            setup.consumables.potions.map((p, i) => (
              <GlassPanel key={i} sx={{ p: 1.25 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  display="block"
                  sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                >
                  {p.name}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                  {p.effects.join(', ')}
                </Typography>
              </GlassPanel>
            ))
          )}

          <Button
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
            size="small"
            disabled
            sx={glassAddBtnSx(isDark)}
          >
            Add Potion (coming soon)
          </Button>
        </Stack>
      )}

      {tab === 'food' && (
        <Stack spacing={1}>
          {/* Currently selected food display */}
          {currentFood ? (
            <GlassPanel sx={{ p: 1.25 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                {(() => {
                  const iconUrl = getCategoryIconUrl(currentFood.category);
                  return iconUrl ? (
                    <Box
                      component={'img' as React.ElementType}
                      src={iconUrl}
                      alt=""
                      sx={{ width: 28, height: 28, flexShrink: 0, opacity: 0.85 }}
                    />
                  ) : null;
                })()}
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      noWrap
                      sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                    >
                      {currentFood.name}
                    </Typography>
                    <Chip
                      label={currentFood.type.toUpperCase()}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        background:
                          currentFood.type === 'food'
                            ? 'rgba(76, 175, 80, 0.18)'
                            : 'rgba(33, 150, 243, 0.18)',
                        color: currentFood.type === 'food' ? '#66bb6a' : '#42a5f5',
                        border: 'none',
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                  >
                    {currentFood.category}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleClearFood}
                  aria-label="Remove food"
                  sx={{
                    color: 'text.disabled',
                    '&:hover': { color: '#ef5350' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            </GlassPanel>
          ) : !foodSearchOpen ? (
            <Box sx={glassEmptySx(isDark)}>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
              >
                No food / drink selected
              </Typography>
            </Box>
          ) : null}

          {/* Food search — inline Autocomplete with glass styling */}
          {foodSearchOpen ? (
            <Autocomplete
              open
              autoFocus
              options={foodResults}
              getOptionLabel={(option) => option.name}
              filterOptions={(x) => x}
              noOptionsText={
                foodQuery.length < MIN_SEARCH_LENGTH
                  ? 'Type 2+ characters to search'
                  : 'No consumables match'
              }
              onChange={handleSelectFood}
              onClose={() => {
                setFoodSearchOpen(false);
                setFoodQuery('');
              }}
              inputValue={foodQuery}
              onInputChange={(_e, val) => setFoodQuery(val)}
              renderOption={(props, option) => {
                const iconUrl = getCategoryIconUrl(option.category);
                return (
                  <li {...props} key={option.id}>
                    <Stack direction="row" spacing={1} alignItems="center" width="100%">
                      {iconUrl && (
                        <Box
                          component={'img' as React.ElementType}
                          src={iconUrl}
                          alt=""
                          sx={{ width: 24, height: 24, flexShrink: 0, opacity: 0.85 }}
                        />
                      )}
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                          >
                            {option.name}
                          </Typography>
                          <Chip
                            label={option.type.toUpperCase()}
                            size="small"
                            sx={{
                              height: 14,
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              fontFamily: 'Space Grotesk, Inter, system-ui',
                              background:
                                option.type === 'food'
                                  ? 'rgba(76, 175, 80, 0.18)'
                                  : 'rgba(33, 150, 243, 0.18)',
                              color: option.type === 'food' ? '#66bb6a' : '#42a5f5',
                              border: 'none',
                            }}
                          />
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          noWrap
                          sx={{ fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                        >
                          {option.category}
                          {option.quality ? ` • Quality ${option.quality}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="Search food or drink (2+ chars)..."
                  sx={glassInputSx(isDark)}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    background: isDark ? 'rgba(18, 18, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                    borderRadius: '10px',
                    mt: 0.5,
                  },
                },
              }}
            />
          ) : (
            <Button
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              variant="outlined"
              size="small"
              onClick={() => setFoodSearchOpen(true)}
              sx={glassAddBtnSx(isDark)}
            >
              {currentFood ? 'Change Food / Drink' : 'Add Food / Drink'}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
};
