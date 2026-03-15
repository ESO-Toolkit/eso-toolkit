/**
 * Build Editor Layout
 * Replicates ESO Hub's build editor UX:
 *  - Left sidebar: top-level tabs (General / Guide / Settings) + setup selector + per-setup tabs
 *  - Right content: active section
 *  - Action bar: Save / Share / View
 */

import {
  Add as AddIcon,
  BookOutlined,
  PersonOutlined,
  SaveOutlined,
  SettingsOutlined,
  ShareOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import {
  addSetup,
  markSaved,
  setActiveSetupIndex,
  setSidebarTab,
  setSetupTab,
} from '../store/buildEditorSlice';
import type { SetupTab, SidebarTopTab } from '../types/build.types';

import { ChampionSection } from './sections/ChampionSection';
import { CharacterSection } from './sections/CharacterSection';
import { ConsumablesSection } from './sections/ConsumablesSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { GeneralSection } from './sections/GeneralSection';
import { GuideSection } from './sections/GuideSection';
import { PassivesSection } from './sections/PassivesSection';
import { ScreenshotsSection } from './sections/ScreenshotsSection';
import { SettingsSection } from './sections/SettingsSection';
import { SkillsSection } from './sections/SkillsSection';

// ─── Sidebar tab definitions ──────────────────────────────────────────────────

const TOP_TABS: { id: SidebarTopTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <PersonOutlined sx={{ fontSize: 16 }} /> },
  { id: 'guide', label: 'Guide', icon: <BookOutlined sx={{ fontSize: 16 }} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsOutlined sx={{ fontSize: 16 }} /> },
];

const SETUP_TABS: { id: SetupTab; label: string }[] = [
  { id: 'character', label: 'Character' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'skills', label: 'Skills' },
  { id: 'passives', label: 'Passives' },
  { id: 'champion', label: 'Champion' },
  { id: 'consumables', label: 'Consumables' },
  { id: 'screenshots', label: 'Screenshots' },
  { id: 'subclassing', label: 'Subclassing' },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const BuildEditorSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex, activeSidebarTab, activeSetupTab } = useSelector(
    (s: RootState) => s.buildEditor,
  );

  const sidebarBg = isDark ? alpha('#0f172a', 0.97) : alpha('#f8fafc', 0.98);
  const borderRight = isDark ? alpha('#38bdf8', 0.1) : alpha('#0f172a', 0.1);

  const activeTabStyle = (active: boolean): object => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 1.75,
    py: 1,
    borderRadius: 1.5,
    cursor: 'pointer',
    width: '100%',
    background: active
      ? isDark ? alpha('#38bdf8', 0.13) : alpha('#0f172a', 0.07)
      : 'transparent',
    color: active ? 'primary.main' : 'text.secondary',
    fontWeight: active ? 700 : 500,
    border: 'none',
    transition: 'background 0.13s, color 0.13s',
    '&:hover': {
      background: active
        ? isDark ? alpha('#38bdf8', 0.18) : alpha('#0f172a', 0.1)
        : isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04),
    },
  });

  return (
    <Box
      sx={{
        width: 230,
        flexShrink: 0,
        background: sidebarBg,
        borderRight: `1px solid ${borderRight}`,
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        gap: 0,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      {/* Top-level tabs */}
      <Box sx={{ px: 1.5, mb: 1.5 }}>
        {TOP_TABS.map((t) => (
          <ButtonBase
            key={t.id}
            onClick={() => dispatch(setSidebarTab(t.id))}
            sx={activeTabStyle(activeSidebarTab === t.id)}
          >
            {t.icon}
            <Typography variant="body2" fontWeight="inherit" color="inherit">
              {t.label}
            </Typography>
          </ButtonBase>
        ))}
      </Box>

      <Divider sx={{ mx: 1.5, opacity: 0.5 }} />

      {/* Setup selector */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: 1.2, fontSize: 10 }}>
          Current Setup ({activeSetupIndex + 1}/{build.setups.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, alignItems: 'center' }}>
          <Select
            size="small"
            value={activeSetupIndex}
            onChange={(e) => dispatch(setActiveSetupIndex(Number(e.target.value)))}
            sx={{ flex: 1, fontSize: 13 }}
          >
            {build.setups.map((s, i) => (
              <MenuItem key={s.id} value={i}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title={build.setups.length >= 5 ? 'Max 5 setups' : 'Add setup'}>
            <Box>
              <IconButton
                size="small"
                onClick={() => dispatch(addSetup())}
                disabled={build.setups.length >= 5}
                sx={{
                  background: isDark ? alpha('#38bdf8', 0.12) : alpha('#0f172a', 0.07),
                  '&:hover': {
                    background: isDark ? alpha('#38bdf8', 0.22) : alpha('#0f172a', 0.12),
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Per-setup section tabs */}
      <Box sx={{ px: 1.5, pt: 1, flex: 1 }}>
        {SETUP_TABS.map((t) => (
          <ButtonBase
            key={t.id}
            onClick={() => {
              dispatch(setSidebarTab('general'));
              dispatch(setSetupTab(t.id));
            }}
            sx={{
              ...activeTabStyle(activeSidebarTab === 'general' && activeSetupTab === t.id),
              fontSize: 13,
            }}
          >
            <Typography variant="body2" fontWeight="inherit" color="inherit" sx={{ fontSize: 13 }}>
              {t.label}
            </Typography>
            {t.id === 'subclassing' && (
              <Chip label="New" size="small" color="primary" sx={{ ml: 'auto', height: 16, fontSize: 9 }} />
            )}
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
};

// ─── Action Bar ───────────────────────────────────────────────────────────────

const ActionBar: React.FC = () => {
  const dispatch = useDispatch();
  const { isDirty, build } = useSelector((s: RootState) => s.buildEditor);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSave = (): void => {
    if (!build.name.trim()) {
      enqueueSnackbar('Please enter a build name before saving.', { variant: 'warning' });
      return;
    }
    // TODO: persist to backend
    dispatch(markSaved());
    enqueueSnackbar('Build saved!', { variant: 'success' });
  };

  const handleShare = (): void => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => enqueueSnackbar('Link copied to clipboard!', { variant: 'info' }))
      .catch(() => enqueueSnackbar('Could not copy link.', { variant: 'error' }));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 1,
        px: 2,
        py: 1.25,
        borderBottom: `1px solid ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
        background: isDark ? alpha('#0b1220', 0.95) : alpha('#f8fafc', 0.98),
        backdropFilter: 'blur(8px)',
      }}
    >
      <Button
        variant="contained"
        size="small"
        startIcon={<SaveOutlined sx={{ fontSize: 15 }} />}
        onClick={handleSave}
        sx={{
          minWidth: 80,
          background: isDirty
            ? undefined
            : isDark ? alpha('#22c55e', 0.2) : alpha('#059669', 0.15),
          color: isDirty ? undefined : isDark ? '#22c55e' : '#059669',
        }}
      >
        {isDirty ? 'Save' : 'Saved'}
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ShareOutlined sx={{ fontSize: 15 }} />}
        onClick={handleShare}
      >
        Share
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<VisibilityOutlined sx={{ fontSize: 15 }} />}
        disabled
      >
        View
      </Button>
    </Box>
  );
};

// ─── Content router ───────────────────────────────────────────────────────────

const ContentPanel: React.FC = () => {
  const { activeSidebarTab, activeSetupTab } = useSelector((s: RootState) => s.buildEditor);

  if (activeSidebarTab === 'guide') return <GuideSection />;
  if (activeSidebarTab === 'settings') return <SettingsSection />;

  // activeSidebarTab === 'general' → delegate to setup tab
  switch (activeSetupTab) {
    case 'character':
      return <CharacterSection />;
    case 'equipment':
      return <EquipmentSection />;
    case 'skills':
      return <SkillsSection />;
    case 'passives':
      return <PassivesSection />;
    case 'champion':
      return <ChampionSection />;
    case 'consumables':
      return <ConsumablesSection />;
    case 'screenshots':
      return <ScreenshotsSection />;
    case 'subclassing':
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.disabled">Subclassing support coming soon.</Typography>
        </Box>
      );
    default:
      return <GeneralSection />;
  }
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export const BuildEditorLayout: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { activeSidebarTab, activeSetupTab } = useSelector((s: RootState) => s.buildEditor);

  // Determine human-readable section title
  const sectionTitle = (() => {
    if (activeSidebarTab === 'guide') return 'Guide';
    if (activeSidebarTab === 'settings') return 'Settings';
    return activeSetupTab.charAt(0).toUpperCase() + activeSetupTab.slice(1);
  })();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: `1px solid ${isDark ? alpha('#38bdf8', 0.12) : alpha('#0f172a', 0.1)}`,
        background: isDark ? alpha('#0f172a', 0.7) : alpha('#ffffff', 0.9),
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        minHeight: 600,
      }}
    >
      {/* Action bar */}
      <ActionBar />

      {/* Body */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <BuildEditorSidebar />

        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            p: 3,
          }}
        >
          <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700, letterSpacing: 1.2, mb: 2, display: 'block' }}>
            {sectionTitle}
          </Typography>
          <ContentPanel />
        </Box>
      </Box>
    </Box>
  );
};
