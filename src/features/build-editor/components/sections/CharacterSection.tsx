/**
 * Character Section — attributes (Magicka/Health/Stamina), curse, mundus stone.
 */

import {
  Box,
  ButtonBase,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_CURSES, ESO_MUNDUS_STONES } from '../../data/esoStaticData';
import { setAttributes, setCurse, setMundusStone } from '../../store/buildEditorSlice';
import type { BuildAttributes } from '../../types/build.types';

// ─── Attribute Counter ────────────────────────────────────────────────────────

interface AttributeCounterProps {
  label: string;
  color: string;
  value: number;
  onChange: (next: number) => void;
}

const ATTR_MAX = 64;

const AttributeCounter: React.FC<AttributeCounterProps> = ({ label, color, value, onChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const adjust = (delta: number, e: React.MouseEvent): void => {
    const step = e.shiftKey ? 10 : 1;
    onChange(Math.max(0, Math.min(ATTR_MAX, value + delta * step)));
  };

  const btnBase = {
    width: 28,
    height: 28,
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.12s',
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        background: isDark ? alpha(color, 0.06) : alpha(color, 0.04),
        border: `1px solid ${alpha(color, isDark ? 0.25 : 0.18)}`,
        transition: 'background 0.15s',
        '&:hover': {
          background: isDark ? alpha(color, 0.1) : alpha(color, 0.07),
        },
      }}
    >
      {/* Color dot */}
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />

      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 64, color: 'text.primary' }}>
        {label}
      </Typography>

      {/* Minus */}
      <Tooltip title="Hold Shift to step by 10">
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(-1, e)}
            disabled={value === 0}
            sx={{
              ...btnBase,
              ml: 'auto',
              background: isDark ? alpha('#fff', 0.07) : alpha('#000', 0.07),
              color: 'text.primary',
              '&:hover:not(:disabled)': {
                background: isDark ? alpha('#fff', 0.15) : alpha('#000', 0.14),
              },
              '&:disabled': { opacity: 0.35 },
            }}
          >
            −
          </ButtonBase>
        </span>
      </Tooltip>

      {/* Count */}
      <Typography
        variant="body2"
        sx={{
          minWidth: 28,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: value > 0 ? color : 'text.disabled',
        }}
      >
        {value}
      </Typography>

      {/* Plus */}
      <Tooltip title="Hold Shift to step by 10">
        <span>
          <ButtonBase
            onClick={(e: React.MouseEvent) => adjust(1, e)}
            disabled={value === ATTR_MAX}
            sx={{
              ...btnBase,
              background: isDark ? alpha(color, 0.25) : alpha(color, 0.2),
              color,
              '&:hover:not(:disabled)': {
                background: isDark ? alpha(color, 0.4) : alpha(color, 0.35),
              },
              '&:disabled': { opacity: 0.35 },
            }}
          >
            +
          </ButtonBase>
        </span>
      </Tooltip>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CharacterSection: React.FC = () => {
  const dispatch = useDispatch();
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const handleAttr = (key: keyof BuildAttributes) => (val: number): void => {
    dispatch(setAttributes({ ...setup.attributes, [key]: val }));
  };

  const total = setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;

  return (
    <Stack spacing={3}>
      {/* Tip */}
      <Box
        sx={{
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'primary.main',
          p: 1.25,
          background: (t: import('@mui/material').Theme) =>
            t.palette.mode === 'dark' ? alpha('#38bdf8', 0.08) : alpha('#0f172a', 0.04),
        }}
      >
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
          Hold Shift + click to increase/decrease in steps of 10
        </Typography>
      </Box>

      {/* Attributes */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Attributes{' '}
          <Box component="span" color="text.disabled">
            ({total} / {ATTR_MAX} total)
          </Box>
        </Typography>
        <Stack spacing={1}>
          <AttributeCounter
            label="Magicka"
            color="#6c8fff"
            value={setup.attributes.magicka}
            onChange={handleAttr('magicka')}
          />
          <AttributeCounter
            label="Health"
            color="#e05c5c"
            value={setup.attributes.health}
            onChange={handleAttr('health')}
          />
          <AttributeCounter
            label="Stamina"
            color="#4caf82"
            value={setup.attributes.stamina}
            onChange={handleAttr('stamina')}
          />
        </Stack>
      </Box>

      {/* Curse */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Curse
        </Typography>
        <Select
          fullWidth
          size="small"
          displayEmpty
          value={setup.curse}
          onChange={(e) => dispatch(setCurse(e.target.value))}
        >
          {ESO_CURSES.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Mundus Stone */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
          Mundus Stone
        </Typography>
        <Select
          fullWidth
          size="small"
          displayEmpty
          value={setup.mundusStone}
          onChange={(e) => dispatch(setMundusStone(e.target.value))}
          renderValue={(val: string) => {
            if (!val) return <Box component="span" sx={{ color: 'text.disabled' }}>Select Mundus Stone</Box>;
            return ESO_MUNDUS_STONES.find((m) => m.id === val)?.label ?? val;
          }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {ESO_MUNDUS_STONES.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{m.label}</Typography>
                <Typography variant="caption" color="text.disabled">{m.description}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
        {setup.mundusStone && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {ESO_MUNDUS_STONES.find((m) => m.id === setup.mundusStone)?.description}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};
