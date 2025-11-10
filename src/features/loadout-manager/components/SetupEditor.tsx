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
} from '@mui/material';
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

import { ChampionPointSelector } from './ChampionPointSelector';
import { FoodSelector } from './FoodSelector';
import { SkillSelector } from './SkillSelector';

interface SetupEditorProps {
  setup: LoadoutSetup;
  setupIndex: number;
  trialId: string;
  pageIndex: number;
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const SetupEditor: React.FC<SetupEditorProps> = ({
  setup,
  setupIndex,
  trialId,
  pageIndex,
}) => {
  const dispatch = useDispatch();
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
    return (
      data &&
      typeof data === 'object' &&
      data.version === 1 &&
      data.setup &&
      typeof data.setup === 'object' &&
      data.setup.skills &&
      data.setup.championPoints &&
      data.setup.food &&
      data.setup.gear
    );
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
      dispatch(replaceSetup({
        trialId,
        pageIndex,
        setupIndex,
        setupData: clipboardData.setup,
      }));

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

  const isBoss = setup.condition.boss && setup.condition.boss !== 'Trash';

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{setup.name}</Typography>
              {isBoss && <Chip label="Boss" size="small" color="error" />}
              {setup.condition.trash !== undefined && (
                <Chip label="Trash" size="small" />
              )}
            </Stack>
            {setup.disabled && (
              <Typography variant="caption" color="error">
                Disabled
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ContentCopy />}
              onClick={handleCopy}
              variant="outlined"
            >
              Copy
            </Button>
            <Button
              size="small"
              startIcon={<ContentPaste />}
              onClick={handlePaste}
              variant="outlined"
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
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Skills" />
          <Tab label="Champion Points" />
          <Tab label="Food & Drink" />
          <Tab label="Gear" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={currentTab} index={0}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Skills Configuration</Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearSkills}
                color="warning"
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
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Champion Points</Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearCP}
                color="warning"
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
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Food & Drink</Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearFood}
                color="warning"
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
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Gear Configuration</Typography>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearGear}
                color="warning"
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
