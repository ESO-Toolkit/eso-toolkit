/**
 * Character Section — attributes (Magicka/Health/Stamina), mundus stone, curse.
 * Uses AttributeBar for animated horizontal bars.
 * Uses IconPickerGrid for mundus and curse selection.
 */

import { Box, Stack, Typography } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_CURSES, ESO_MUNDUS_STONES } from '../../data/esoStaticData';
import { setAttributes, setCurse, setMundusStone } from '../../store/buildEditorSlice';
import { BE_TOKENS } from '../../theme/buildEditorTokens';
import type { BuildAttributes } from '../../types/build.types';
import { AnimatedCounter } from '../primitives/AnimatedCounter';
import { AttributeBar } from '../primitives/AttributeBar';
import { IconPickerGrid } from '../primitives/IconPickerGrid';

const ATTR_MAX = 64;

export const CharacterSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const handleAttr =
    (key: keyof BuildAttributes) =>
    (val: number): void => {
      dispatch(setAttributes({ ...setup.attributes, [key]: val }));
    };

  const total = setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;

  return (
    <Stack spacing={2.5}>
      {/* Attributes */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            Attributes
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <AnimatedCounter
              value={total}
              variant="caption"
              sx={{
                fontWeight: 700,
                fontFamily: 'Space Grotesk, Inter, system-ui',
                color: total >= ATTR_MAX ? 'var(--be-accent, #22c55e)' : 'text.disabled',
                textShadow:
                  total >= ATTR_MAX
                    ? '0 0 8px rgba(var(--be-accent-rgb, 56, 189, 248), 0.5)'
                    : 'none',
                transition: 'color 0.3s, text-shadow 0.3s',
              }}
            />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontFamily: 'Space Grotesk, Inter, system-ui' }}
            >
              / {ATTR_MAX}
            </Typography>
          </Box>
        </Box>

        {/* Hint removed — Shift ×10 info is already in each +/- button's tooltip */}

        <Stack spacing={0.75}>
          <AttributeBar
            label="Magicka"
            color={BE_TOKENS.attributes.magicka}
            value={setup.attributes.magicka}
            max={ATTR_MAX}
            total={total}
            totalMax={ATTR_MAX}
            onChange={handleAttr('magicka')}
          />
          <AttributeBar
            label="Health"
            color={BE_TOKENS.attributes.health}
            value={setup.attributes.health}
            max={ATTR_MAX}
            total={total}
            totalMax={ATTR_MAX}
            onChange={handleAttr('health')}
          />
          <AttributeBar
            label="Stamina"
            color={BE_TOKENS.attributes.stamina}
            value={setup.attributes.stamina}
            max={ATTR_MAX}
            total={total}
            totalMax={ATTR_MAX}
            onChange={handleAttr('stamina')}
          />
        </Stack>
      </Box>

      {/* Mundus Stone — IconPickerGrid */}
      <IconPickerGrid
        label="Mundus Stone"
        options={[
          { id: '', label: 'None' },
          ...ESO_MUNDUS_STONES.map((m) => ({
            id: m.id,
            label: m.label.replace('The ', ''),
            description: m.description,
          })),
        ]}
        value={setup.mundusStone}
        onChange={(id) => dispatch(setMundusStone(id))}
        columns={4}
      />

      {/* Mundus description */}
      {setup.mundusStone && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5, px: 0.5 }}>
          {ESO_MUNDUS_STONES.find((m) => m.id === setup.mundusStone)?.description}
        </Typography>
      )}

      {/* Curse — IconPickerGrid */}
      <IconPickerGrid
        label="Curse"
        options={ESO_CURSES.map((c) => ({
          id: c.id,
          label: c.label,
        }))}
        value={setup.curse}
        onChange={(id) => dispatch(setCurse(id))}
        columns={3}
      />
    </Stack>
  );
};
