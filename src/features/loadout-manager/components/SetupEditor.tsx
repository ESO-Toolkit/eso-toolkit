/**
 * Setup Editor Component
 * Main editor for a single setup with tabs for different sections.
 *
 * UX improvements:
 * - Compact header: name left, icon-button actions right — saves vertical space
 * - Progress & condition shown inline next to name
 * - Tabs stay full-width but without per-tab "Clear" header rows
 */

import { ContentCopy, ContentPaste, Delete, FileCopy } from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  ChipProps,
  Tooltip,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { useLogger } from '@/hooks/useLogger';

import { duplicateSetup, deleteSetup, replaceSetup } from '../store/loadoutSlice';
import { LoadoutSetup, ClipboardSetup } from '../types/loadout.types';
import {
  getSetupConditionSummary,
  getSetupProgressSections,
  formatProgressSection,
  getSetupTags,
  SetupProgressSection,
} from '../utils/setupDisplay';

import { ChampionPointSelector } from './ChampionPointSelector';
import { FoodSelector } from './FoodSelector';
import { GearSelector } from './GearSelector';
import { SkillSelector } from './SkillSelector';

interface SetupEditorProps {
  setup: LoadoutSetup;
  setupIndex: number;
  trialId: string;
  pageIndex: number;
  variant?: 'page' | 'drawer';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type ClipboardSetupPayload = ClipboardSetup['setup'] & {
  championPoints?: ClipboardSetup['setup']['cp'];
};

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`setup-tabpanel-${index}`}
      aria-labelledby={`setup-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>{children}</Box>
      )}
    </div>
  );
};

const confirmAction = (message: string): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.confirm(message);
};

export const SetupEditor: React.FC<SetupEditorProps> = ({
  setup,
  setupIndex,
  trialId,
  pageIndex,
  variant = 'page',
}) => {
  const dispatch = useDispatch();
  const logger = useLogger('SetupEditor');
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isDrawer = variant === 'drawer';
  const [currentTab, setCurrentTab] = React.useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info' = 'success',
  ): void => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (): void => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCopy = async (): Promise<void> => {
    try {
      const clipboardData: ClipboardSetup = {
        version: 1,
        timestamp: Date.now(),
        setup,
        sourceTrialId: trialId,
        sourceBossName: setup.condition.boss,
      };

      await navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2));
      showSnackbar('Setup copied to clipboard!', 'success');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to copy setup to clipboard', err);
      showSnackbar('Failed to copy setup to clipboard', 'error');
    }
  };

  const validateClipboardSetup = (data: unknown): data is ClipboardSetup => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const clipboardData = data as Partial<ClipboardSetup>;
    const setupData = clipboardData.setup as ClipboardSetupPayload | undefined;
    if (!setupData || typeof setupData !== 'object') {
      return false;
    }

    const hasSkills = typeof setupData.skills === 'object' && setupData.skills !== null;
    const hasCp =
      (typeof setupData.cp === 'object' && setupData.cp !== null) ||
      (typeof setupData.championPoints === 'object' && setupData.championPoints !== null);
    const hasFood = typeof setupData.food === 'object' && setupData.food !== null;
    const hasGear = typeof setupData.gear === 'object' && setupData.gear !== null;

    return clipboardData.version === 1 && hasSkills && hasCp && hasFood && hasGear;
  };

  const handlePaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        showSnackbar('Clipboard is empty', 'error');
        return;
      }

      let clipboardData: unknown;
      try {
        clipboardData = JSON.parse(text);
      } catch {
        showSnackbar('Clipboard does not contain valid JSON', 'error');
        return;
      }

      if (!validateClipboardSetup(clipboardData)) {
        showSnackbar('Clipboard data is not a valid setup', 'error');
        return;
      }

      const validClipboardData = clipboardData as ClipboardSetup;
      // Import the setup data (replace current setup)
      const clipboardSetup = validClipboardData.setup as ClipboardSetupPayload;
      const { championPoints, ...restSetup } = clipboardSetup;

      const setupToImport: LoadoutSetup = {
        ...restSetup,
        cp: restSetup.cp ?? championPoints ?? {},
      };

      dispatch(
        replaceSetup({
          trialId,
          pageIndex,
          setupIndex,
          setupData: setupToImport,
        }),
      );

      showSnackbar(
        `Pasted setup from ${validClipboardData.sourceBossName || 'unknown source'}`,
        'success',
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to paste setup from clipboard', err);
      showSnackbar('Failed to paste from clipboard', 'error');
    }
  };

  const handleDuplicate = (): void => {
    dispatch(duplicateSetup({ trialId, pageIndex, setupIndex }));
    showSnackbar('Setup duplicated!', 'success');
  };

  const handleDelete = (): void => {
    if (confirmAction(`Are you sure you want to delete "${setup.name}"?`)) {
      dispatch(deleteSetup({ trialId, pageIndex, setupIndex }));
    }
  };

  const tags = getSetupTags(setup);
  const conditionSummary = getSetupConditionSummary(setup);
  const progressSections = getSetupProgressSections(setup);

  const getProgressChipColor = (section: SetupProgressSection): ChipProps['color'] => {
    switch (section.type) {
      case 'skills':
        return 'primary';
      case 'cp':
        return 'secondary';
      case 'food':
        return 'success';
      case 'gear':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Paper
      elevation={isDrawer ? 0 : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        borderRadius: isDrawer ? 0 : 2,
        height: isDrawer ? '100%' : 'auto',
        backgroundColor: isDrawer
          ? 'transparent'
          : isDarkMode
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(0,0,0,0.01)',
        border: isDrawer
          ? 'none'
          : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: isDrawer ? 'none' : undefined,
      }}
    >
      {/* ── Compact header ─────────────────────────────── */}
      <Box
        sx={{
          px: isDrawer ? 1.5 : { xs: 1.5, md: 2 },
          py: isDrawer ? 1.25 : { xs: 1.25, md: 1.5 },
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          {/* Row 1: name + action icons */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant={isDrawer ? 'subtitle1' : 'h6'}
                sx={{
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {setup.name}
              </Typography>
              {conditionSummary && (
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                  {conditionSummary}
                </Typography>
              )}
            </Stack>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                borderRadius: '10px',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
            >
              <Tooltip title="Copy to clipboard" arrow>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  color="primary"
                  aria-label="Copy to clipboard"
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Paste from clipboard" arrow>
                <IconButton
                  size="small"
                  onClick={handlePaste}
                  color="secondary"
                  aria-label="Paste from clipboard"
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <ContentPaste fontSize="small" />
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  width: '1px',
                  height: 20,
                  flexShrink: 0,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              />
              <Tooltip title="Duplicate setup" arrow>
                <IconButton
                  size="small"
                  onClick={handleDuplicate}
                  aria-label="Duplicate setup"
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <FileCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  width: '1px',
                  height: 20,
                  flexShrink: 0,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              />
              <Tooltip title="Delete setup" arrow>
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  color="error"
                  aria-label="Delete setup"
                  sx={{
                    borderRadius: 0,
                    px: 0.75,
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>

          {/* Row 2: progress chips (tags removed from header — they add clutter) */}
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }} useFlexGap>
            {progressSections.length === 0 ? (
              <Chip
                label="Empty setup"
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: '999px',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}
              />
            ) : (
              progressSections.map((section, index) => (
                <Chip
                  key={`${section.type}-${index}`}
                  label={formatProgressSection(section)}
                  size="small"
                  color={getProgressChipColor(section)}
                  variant="outlined"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    borderRadius: '999px',
                  }}
                />
              ))
            )}
            {tags.length > 0 &&
              tags.map((tag, index) => (
                <Chip
                  key={`tag-${tag.label}-${index}`}
                  label={tag.label}
                  size="small"
                  color={tag.color}
                  variant={tag.variant ?? 'filled'}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    borderRadius: '999px',
                  }}
                />
              ))}
          </Stack>
        </Stack>
      </Box>

      {/* ── Tabs ───────────────────────────────────────── */}
      <Box
        sx={{
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            px: { xs: isDrawer ? 0.5 : 0.75, md: isDrawer ? 1 : 1.5 },
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.75,
              fontSize: '0.8rem',
              borderRadius: '8px',
              marginRight: '4px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              borderRadius: '8px',
              height: '100%',
              zIndex: 0,
            },
          }}
        >
          <Tab label="Skills" />
          <Tab label="CP & Food" />
          <Tab label="Gear" />
        </Tabs>
      </Box>

      {/* ── Tab Panels ─────────────────────────────────── */}
      <Box sx={{ flex: 1 }}>
        <TabPanel value={currentTab} index={0}>
          <SkillSelector
            skills={setup.skills}
            trialId={trialId}
            pageIndex={pageIndex}
            setupIndex={setupIndex}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Stack spacing={3}>
            <ChampionPointSelector
              championPoints={setup.cp}
              trialId={trialId}
              pageIndex={pageIndex}
              setupIndex={setupIndex}
            />
            {/* Gradient section divider */}
            <Box
              sx={{
                height: 1,
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)'
                  : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0) 100%)',
              }}
            />
            <FoodSelector
              food={setup.food}
              trialId={trialId}
              pageIndex={pageIndex}
              setupIndex={setupIndex}
            />
          </Stack>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <GearSelector
            gear={setup.gear}
            trialId={trialId}
            pageIndex={pageIndex}
            setupIndex={setupIndex}
          />
        </TabPanel>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
