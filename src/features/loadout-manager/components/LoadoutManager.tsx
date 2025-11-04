/**
 * Main Loadout Manager Component
 * Top-level container for managing trial/dungeon loadouts
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/storeWithHistory';
import {
  setCurrentTrial,
  setMode,
  initializeSetups,
} from '../store/loadoutSlice';
import {
  selectCurrentTrial,
  selectMode,
  selectCurrentSetups,
} from '../store/selectors';
import { TRIALS, generateSetupStructure } from '../data/trialConfigs';
import { SetupList } from './SetupList';
import { SetupEditor } from './SetupEditor';
import { ExportDialog } from './ExportDialog';

export const LoadoutManager: React.FC = () => {
  const dispatch = useDispatch();
  const currentTrial = useSelector(selectCurrentTrial);
  const mode = useSelector(selectMode);
  const setups = useSelector(selectCurrentSetups);
  const [selectedSetupIndex, setSelectedSetupIndex] = React.useState<number | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Initialize setups when trial or mode changes
  useEffect(() => {
    if (currentTrial) {
      const structure = generateSetupStructure(currentTrial, mode === 'advanced');
      dispatch(
        initializeSetups({
          trialId: currentTrial,
          pageIndex: 0,
          structure,
        }),
      );
    }
  }, [currentTrial, mode, dispatch]);

  const handleTrialChange = (event: any) => {
    const trialId = event.target.value as string;
    dispatch(setCurrentTrial(trialId));
    setSelectedSetupIndex(null);
  };

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'basic' | 'advanced' | null) => {
    if (newMode !== null) {
      dispatch(setMode(newMode));
      setSelectedSetupIndex(null);
    }
  };

  const selectedSetup = selectedSetupIndex !== null ? setups[selectedSetupIndex] : null;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        Loadout Manager
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Manage your skill setups, champion points, food, and gear for trials and dungeons
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={3}>
          {/* Trial Selection and Mode Toggle */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel id="trial-select-label">Select Trial/Dungeon</InputLabel>
                <Select
                  labelId="trial-select-label"
                  id="trial-select"
                  value={currentTrial || ''}
                  label="Select Trial/Dungeon"
                  onChange={handleTrialChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {TRIALS.map((trial) => (
                    <MenuItem key={trial.id} value={trial.id}>
                      {trial.name} ({trial.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {currentTrial && (
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={handleModeChange}
                  aria-label="setup mode"
                >
                  <ToggleButton value="basic" aria-label="basic mode">
                    Basic (Bosses Only)
                  </ToggleButton>
                  <ToggleButton value="advanced" aria-label="advanced mode">
                    Advanced (Include Trash)
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Stack>

            {currentTrial && setups.length > 0 && (
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={() => setExportDialogOpen(true)}
              >
                Export
              </Button>
            )}
          </Stack>

          {currentTrial && (
            <>
              <Divider />
              
              {/* Main Content Area */}
              <Box sx={{ display: 'flex', gap: 3, minHeight: 500 }}>
                {/* Setup List (Left Sidebar) */}
                <Box sx={{ width: 300, flexShrink: 0 }}>
                  <SetupList
                    setups={setups}
                    selectedIndex={selectedSetupIndex}
                    onSelectSetup={setSelectedSetupIndex}
                  />
                </Box>

                {/* Setup Editor (Main Area) */}
                <Box sx={{ flex: 1 }}>
                  {selectedSetup ? (
                    <SetupEditor
                      setup={selectedSetup}
                      setupIndex={selectedSetupIndex!}
                      trialId={currentTrial}
                      pageIndex={0}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography variant="h6">
                        Select a setup from the list to edit
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </>
          )}

          {!currentTrial && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                color: 'text.secondary',
              }}
            >
              <Typography variant="h6">
                Select a trial or dungeon to get started
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Export Dialog */}
      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
    </Container>
  );
};
