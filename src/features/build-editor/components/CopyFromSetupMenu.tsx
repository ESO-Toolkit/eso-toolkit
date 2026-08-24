/**
 * CopyFromSetupMenu
 * Compact header control that copies ONE section (gear / skills / champion /
 * consumables / passives / character) FROM another setup INTO the active one.
 *
 * Renders nothing when there's only a single setup (nothing to copy from).
 * Lives in a SectionCard's `headerAction` slot.
 */

import { ContentCopyOutlined as CopyIcon } from '@mui/icons-material';
import { Box, IconButton, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectActiveSetupIndex, selectBuildSetups } from '../store/buildEditorSelectors';
import { copySetupSection } from '../store/buildEditorSlice';
import { SETUP_SECTIONS, type SetupSection } from '../utils/setupTransfer';

interface CopyFromSetupMenuProps {
  section: SetupSection;
}

const CopyFromSetupMenuComponent: React.FC<CopyFromSetupMenuProps> = ({ section }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();

  const setups = useSelector(selectBuildSetups);
  const activeIndex = useSelector(selectActiveSetupIndex);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const sectionLabel = useMemo(
    () => SETUP_SECTIONS.find((s) => s.id === section)?.label ?? section,
    [section],
  );

  // Every setup except the active one is a copy source.
  const sources = useMemo(
    () =>
      setups.map((setup, index) => ({ setup, index })).filter(({ index }) => index !== activeIndex),
    [setups, activeIndex],
  );

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  const handlePick = useCallback(
    (fromIndex: number, fromName: string) => {
      dispatch(copySetupSection({ section, fromIndex }));
      enqueueSnackbar(`Copied ${sectionLabel} from “${fromName}”`, { variant: 'success' });
      setAnchorEl(null);
    },
    [dispatch, section, sectionLabel, enqueueSnackbar],
  );

  // Nothing to copy from with a single setup.
  if (sources.length === 0) return null;

  return (
    <>
      <Tooltip title={`Copy ${sectionLabel} from another setup`} enterDelay={500}>
        <IconButton
          size="small"
          onClick={handleOpen}
          aria-label={`Copy ${sectionLabel} from another setup`}
          aria-haspopup="menu"
          aria-expanded={open}
          sx={{
            width: 26,
            height: 26,
            color: open
              ? 'var(--be-accent, #38bdf8)'
              : isDark
                ? 'rgba(255,255,255,0.40)'
                : 'rgba(0,0,0,0.38)',
            background: open ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)' : 'transparent',
            border: `1px solid ${
              open
                ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.35)'
                : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)'
            }`,
            transition: 'all 0.15s',
            '&:hover': {
              color: 'var(--be-accent, #38bdf8)',
              background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)',
              borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.30)',
            },
          }}
        >
          <CopyIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 200,
              maxWidth: 280,
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
            Copy {sectionLabel} from
          </Typography>
        </Box>
        {sources.map(({ setup, index }) => (
          <MenuItem
            key={setup.id}
            onClick={() => handlePick(index, setup.name)}
            sx={{
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: 13,
              py: 0.75,
            }}
          >
            <ListItemText
              primary={setup.name}
              slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 600 } } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export const CopyFromSetupMenu = React.memo(CopyFromSetupMenuComponent);
