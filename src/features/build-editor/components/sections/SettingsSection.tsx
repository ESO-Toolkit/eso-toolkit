/**
 * Settings Section — visibility, DLC, setup order.
 */

import {
  Box,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_DLCS } from '../../data/esoStaticData';
import { setDlc, setVisibility } from '../../store/buildEditorSlice';
import type { BuildVisibility } from '../../types/build.types';

const VISIBILITY_OPTIONS: { value: BuildVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone and appears in build listings' },
  { value: 'link-only', label: 'Link Only', description: 'Accessible with a direct link but not listed publicly' },
  { value: 'private', label: 'Private', description: 'Only you can view this build' },
];

export const SettingsSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);

  return (
    <Stack spacing={3}>
      {/* Visibility */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1.25, display: 'block' }}>
          Visibility
        </Typography>
        <RadioGroup
          value={build.settings.visibility}
          onChange={(e) => dispatch(setVisibility(e.target.value as BuildVisibility))}
        >
          <Stack spacing={0.75}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <Box
                key={opt.value}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${
                    build.settings.visibility === opt.value
                      ? 'primary.main'
                      : isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1)
                  }`,
                  background:
                    build.settings.visibility === opt.value
                      ? isDark ? alpha('#38bdf8', 0.07) : alpha('#0f172a', 0.04)
                      : 'transparent',
                  transition: 'all 0.14s',
                  overflow: 'hidden',
                }}
              >
                <FormControlLabel
                  value={opt.value}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {opt.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {opt.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, px: 1.5, py: 0.5, width: '100%' }}
                />
              </Box>
            ))}
          </Stack>
        </RadioGroup>
      </Box>

      {/* DLC */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>
          Current DLC / Chapter
        </Typography>
        <Select
          fullWidth
          size="small"
          value={build.settings.dlc}
          onChange={(e) => dispatch(setDlc(e.target.value))}
        >
          {ESO_DLCS.map((dlc) => (
            <MenuItem key={dlc} value={dlc}>{dlc}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* Setup order info */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          background: isDark ? alpha('#fff', 0.03) : alpha('#000', 0.02),
          border: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06)}`,
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
          Setup Order
        </Typography>
        <Typography variant="caption" color="text.disabled">
          You have {build.setups.length} setup{build.setups.length !== 1 ? 's' : ''}.
          Reordering via drag-and-drop is coming soon.
        </Typography>
      </Box>
    </Stack>
  );
};
