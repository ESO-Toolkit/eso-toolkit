/**
 * SectionHeaderActions
 * The cluster of controls in a per-setup section header: "Clear section" and
 * "Copy from another setup". Lives in a SectionCard's `headerAction` slot.
 *
 * Clear is always available; Copy renders only when there's another setup to
 * copy from (CopyFromSetupMenu handles that itself).
 */

import { DeleteSweepOutlined as ClearIcon } from '@mui/icons-material';
import {
  Box,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { clearSetupSection } from '../store/buildEditorSlice';
import { SETUP_SECTIONS, type SetupSection } from '../utils/setupTransfer';

import { CopyFromSetupMenu } from './CopyFromSetupMenu';

interface SectionHeaderActionsProps {
  section: SetupSection;
}

const ClearSectionMenu: React.FC<SectionHeaderActionsProps> = ({ section }) => {
  const dispatch = useDispatch();
  const isDark = useTheme().palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const label = useMemo(
    () => SETUP_SECTIONS.find((s) => s.id === section)?.label ?? section,
    [section],
  );

  const handleConfirm = useCallback(() => {
    dispatch(clearSetupSection({ section }));
    enqueueSnackbar(`Cleared ${label}`, { variant: 'info' });
    setAnchorEl(null);
  }, [dispatch, section, label, enqueueSnackbar]);

  return (
    <>
      <Tooltip title={`Clear ${label}`} enterDelay={500}>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={`Clear ${label}`}
          aria-haspopup="menu"
          aria-expanded={open}
          sx={{
            width: 26,
            height: 26,
            color: open ? 'error.main' : isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)',
            border: `1px solid ${
              open
                ? 'rgba(239, 68, 68, 0.40)'
                : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)'
            }`,
            background: open ? 'rgba(239, 68, 68, 0.10)' : 'transparent',
            transition: 'all 0.15s',
            '&:hover': {
              color: 'error.main',
              background: 'rgba(239, 68, 68, 0.10)',
              borderColor: 'rgba(239, 68, 68, 0.30)',
            },
          }}
        >
          <ClearIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 200,
              borderRadius: 2,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 0.75 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
            }}
          >
            Clear {label} in this setup?
          </Typography>
        </Box>
        <MenuItem
          onClick={handleConfirm}
          sx={{
            fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
            fontSize: 13,
            fontWeight: 600,
            color: 'error.main',
            py: 0.75,
          }}
        >
          <ListItemText
            primary={`Clear ${label}`}
            slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 600 } } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export const SectionHeaderActions: React.FC<SectionHeaderActionsProps> = ({ section }) => (
  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
    <ClearSectionMenu section={section} />
    <CopyFromSetupMenu section={section} />
  </Stack>
);
