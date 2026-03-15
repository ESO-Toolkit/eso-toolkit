/**
 * Settings Section — visibility, DLC, setup order.
 * Uses IconPickerGrid for visibility, styled DLC select.
 */

import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_DLCS } from '../../data/esoStaticData';
import { setDlc, setVisibility } from '../../store/buildEditorSlice';
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

      {/* DLC — keep Select (10+ items) */}
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
        >
          Current DLC / Chapter
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.settings.dlc}
          onChange={(e) => dispatch(setDlc(e.target.value))}
        >
          {ESO_DLCS.map((dlc) => (
            <MenuItem key={dlc} value={dlc}>
              {dlc}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Setup order info */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          background: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
          border: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.05)}`,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          display="block"
          mb={0.25}
          sx={{ fontSize: 11 }}
        >
          Setup Order
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
          {build.setups.length} setup{build.setups.length !== 1 ? 's' : ''} configured. Reorder via
          drag-and-drop in the setup bar below.
        </Typography>
      </Box>
    </Stack>
  );
};
