/**
 * Setup Editor Component
 * Main editor for a single setup with tabs for different sections
 */

import {
  ContentCopy,
  ContentPaste,
  Delete,
  Clear,
  FileCopy,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Stack,
  Button,
  Chip,
  Snackbar,
  Alert,
  ChipProps,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  duplicateSetup,
  deleteSetup,
  clearSkills,
  clearChampionPoints,
  clearFood,
  clearGear,
  replaceSetup,
} from '../store/loadoutSlice';
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

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

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
}

export const SetupEditor: React.FC<SetupEditorProps> = ({
  setup,
  setupIndex,
  trialId,
  pageIndex,
  variant = 'page',
}) => {
  const dispatch = useDispatch();
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCopy = async () => {
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
      console.error('Failed to copy:', error);
      showSnackbar('Failed to copy setup to clipboard', 'error');
    }
  };

  const validateClipboardSetup = (data: any): data is ClipboardSetup => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const setupData = data.setup;
    if (!setupData || typeof setupData !== 'object') {
      return false;
    }

    const hasSkills = typeof setupData.skills === 'object' && setupData.skills !== null;
    const hasCp =
      (typeof setupData.cp === 'object' && setupData.cp !== null) ||
      (typeof setupData.championPoints === 'object' && setupData.championPoints !== null);
    const hasFood = typeof setupData.food === 'object' && setupData.food !== null;
    const hasGear = typeof setupData.gear === 'object' && setupData.gear !== null;

    return data.version === 1 && hasSkills && hasCp && hasFood && hasGear;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      
      if (!text.trim()) {
        showSnackbar('Clipboard is empty', 'error');
        return;
      }

      let clipboardData: any;
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

      // Import the setup data (replace current setup)
      const { championPoints, ...restSetup } = clipboardData.setup as ClipboardSetup['setup'] & {
        championPoints?: ClipboardSetup['setup']['cp'];
      };

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
        `Pasted setup from ${clipboardData.sourceBossName || 'unknown source'}`,
        'success',
      );
    } catch (error) {
      console.error('Failed to paste:', error);
      showSnackbar('Failed to paste from clipboard', 'error');
    }
  };

  const handleDuplicate = () => {
    dispatch(duplicateSetup({ trialId, pageIndex, setupIndex }));
    showSnackbar('Setup duplicated!', 'success');
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${setup.name}"?`)) {
      dispatch(deleteSetup({ trialId, pageIndex, setupIndex }));
    }
  };

  const handleClearSkills = () => {
    if (confirm('Clear all skills for this setup?')) {
      dispatch(clearSkills({ trialId, pageIndex, setupIndex }));
    }
  };

  const handleClearCP = () => {
    if (confirm('Clear all champion points for this setup?')) {
      dispatch(clearChampionPoints({ trialId, pageIndex, setupIndex }));
    }
  };

  const handleClearFood = () => {
    dispatch(clearFood({ trialId, pageIndex, setupIndex }));
  };

  const handleClearGear = () => {
    if (confirm('Clear all gear for this setup?')) {
      dispatch(clearGear({ trialId, pageIndex, setupIndex }));
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
      variant={isDrawer ? 'elevation' : 'outlined'}
      elevation={isDrawer ? 0 : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        borderRadius: isDrawer ? 0 : 3,
        height: isDrawer ? '100%' : 'auto',
        boxShadow: isDrawer ? 'none' : undefined,
      }}
    >
      {/* Header */}
      <Box
        sx={(theme) => ({
          px: isDrawer ? { xs: 1.5, md: 2 } : { xs: 1.75, md: 2 },
          py: isDrawer ? { xs: 1.5, md: 2 } : { xs: 1.75, md: 2.25 },
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor:
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.primary.light, 0.16),
        })}
      >
        <Stack spacing={2.25} sx={{ minWidth: 0 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            useFlexGap
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Active Setup
              </Typography>
              <Typography
                variant={isDrawer ? 'h5' : 'h4'}
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {setup.name}
              </Typography>
              {conditionSummary && (
                <Typography variant="body2" color="text.secondary">
                  {conditionSummary}
                </Typography>
              )}
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: 'wrap',
                rowGap: 1,
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
              }}
              useFlexGap
            >
              <Button
                size="small"
                startIcon={<ContentCopy />}
                onClick={handleCopy}
                variant="contained"
                color="primary"
              >
                Copy
              </Button>
              <Button
                size="small"
                startIcon={<ContentPaste />}
                onClick={handlePaste}
                variant="contained"
                color="secondary"
              >
                Paste
              </Button>
              <Button
                size="small"
                startIcon={<FileCopy />}
                onClick={handleDuplicate}
                variant="outlined"
              >
                Duplicate
              </Button>
              <Button
                size="small"
                startIcon={<Delete />}
                onClick={handleDelete}
                color="error"
                variant="outlined"
              >
                Delete
              </Button>
            </Stack>
          </Stack>

          {tags.length > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
              useFlexGap
            >
              {tags.map((tag, index) => (
                <Chip
                  key={`${tag.label}-${index}`}
                  label={tag.label}
                  size="small"
                  color={tag.color}
                  variant={tag.variant ?? 'filled'}
                />
              ))}
            </Stack>
          )}

          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
            useFlexGap
          >
            {progressSections.length === 0 ? (
              <Chip label="Empty setup" size="small" variant="outlined" />
            ) : (
              progressSections.map((section, index) => (
                <Chip
                  key={`${section.type}-${index}`}
                  label={formatProgressSection(section)}
                  size="small"
                  color={getProgressChipColor(section)}
                  variant="outlined"
                />
              ))
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ px: { xs: isDrawer ? 0.5 : 0.75, md: isDrawer ? 1.25 : 1.75 } }}
        >
          <Tab label="Skills" />
          <Tab label="Champion Points" />
          <Tab label="Food & Drink" />
          <Tab label="Gear" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1 }}>
        <TabPanel value={currentTab} index={0}>
          <Stack spacing={1.75} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ flexWrap: 'wrap', rowGap: 1 }}
              useFlexGap
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Skills Configuration
              </Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearSkills}
                color="warning"
                variant="outlined"
              >
                Clear All Skills
              </Button>
            </Stack>
            <SkillSelector
              skills={setup.skills}
              trialId={trialId}
              pageIndex={pageIndex}
              setupIndex={setupIndex}
            />
          </Stack>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Stack spacing={1.75}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ flexWrap: 'wrap', rowGap: 1 }}
              useFlexGap
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Champion Points
              </Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearCP}
                color="warning"
                variant="outlined"
              >
                Clear All CP
              </Button>
            </Stack>
            <ChampionPointSelector
              championPoints={setup.cp}
              trialId={trialId}
              pageIndex={pageIndex}
              setupIndex={setupIndex}
            />
          </Stack>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Stack spacing={1.75}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ flexWrap: 'wrap', rowGap: 1 }}
              useFlexGap
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Food & Drink
              </Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearFood}
                color="warning"
                variant="outlined"
              >
                Clear Food
              </Button>
            </Stack>
            <FoodSelector
              food={setup.food}
              trialId={trialId}
              pageIndex={pageIndex}
              setupIndex={setupIndex}
            />
          </Stack>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Stack spacing={1.75}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ flexWrap: 'wrap', rowGap: 1 }}
              useFlexGap
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Gear Configuration
              </Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearGear}
                color="warning"
                variant="outlined"
              >
                Clear All Gear
              </Button>
            </Stack>
            <Typography color="text.secondary">
              Gear editor coming soon (Priority 2)
            </Typography>
          </Stack>
        </TabPanel>
      </Box>

      {/* Snackbar for user feedback */}
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
