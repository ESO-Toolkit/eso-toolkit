/**
 * Settings Section — glass-style visibility picker, accent-themed DLC select,
 * glass info panel for setup order.
 */

import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_DLCS } from '../../data/esoStaticData';
import { setDlc, setVisibility } from '../../store/buildEditorSlice';
import { BE_TOKENS } from '../../theme/buildEditorTokens';
import type { BuildVisibility } from '../../types/build.types';
import { IconPickerGrid } from '../primitives/IconPickerGrid';

const VISIBILITY_OPTIONS = [
  { id: 'public' as const, label: 'Public', description: 'Visible to everyone' },
  { id: 'link-only' as const, label: 'Link Only', description: 'Accessible with direct link' },
  { id: 'private' as const, label: 'Private', description: 'Only you can view' },
];

export const SettingsSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);

  return (
    <Stack spacing={2.5}>
      {/* Visibility — IconPickerGrid */}
      <IconPickerGrid
        label="Visibility"
        options={VISIBILITY_OPTIONS}
        value={build.settings.visibility}
        onChange={(id) => dispatch(setVisibility(id as BuildVisibility))}
        columns={3}
      />

      {/* DLC — glass-style Select */}
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            mb: 0.75,
            display: 'block',
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Current DLC / Chapter
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.settings.dlc}
          onChange={(e) => dispatch(setDlc(e.target.value))}
          sx={{
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontSize: 13,
            background: isDark ? BE_TOKENS.input.dark.bg : BE_TOKENS.input.light.bg,
            borderRadius: '10px',
            transition: 'background 0.2s ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? BE_TOKENS.input.dark.border : BE_TOKENS.input.light.border,
              transition: 'border-color 0.2s ease',
            },
            '&:hover': {
              background: isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark
                ? BE_TOKENS.input.dark.hoverBorder
                : BE_TOKENS.input.light.hoverBorder,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--be-accent, #38bdf8)',
              borderWidth: '1px',
            },
          }}
        >
          {ESO_DLCS.map((dlc) => (
            <MenuItem key={dlc} value={dlc}>
              {dlc}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Setup order — glass info panel */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
            : 'inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          display="block"
          mb={0.25}
          sx={{
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontFamily: 'Space Grotesk, Inter, system-ui',
          }}
        >
          Setup Order
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontSize: 10, fontFamily: 'Space Grotesk, Inter, system-ui' }}
        >
          {build.setups.length} setup{build.setups.length !== 1 ? 's' : ''} configured. Manage setups
          in the setup bar below. Double-click a tab to rename.
        </Typography>
      </Box>
    </Stack>
  );
};
