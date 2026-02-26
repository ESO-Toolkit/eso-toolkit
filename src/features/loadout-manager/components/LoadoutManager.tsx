import {
  Add as AddIcon,
  ArrowBack,
  DeleteSweep,
  Edit,
  FileDownload,
  FileUpload,
  MoreVert,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { WorkInProgressDisclaimer } from '@/components/WorkInProgressDisclaimer';
import type { RootState } from '@/store/storeWithHistory';

import { preloadChampionPointData } from '../data/championPointData';
import { preloadSkillData } from '../data/skillLineSkills';
import { TRIALS, generateSetupStructure } from '../data/trialConfigs';
import {
  addPage,
  addSetup,
  deleteSetup,
  duplicateSetup,
  initializeSetups,
  loadState,
  renamePage,
  resetLoadout,
  setCurrentPage,
  setCurrentTrial,
} from '../store/loadoutSlice';
import {
  selectCurrentPage,
  selectCurrentSetups,
  selectCurrentTrial,
  selectLoadoutState,
  selectTrialPages,
} from '../store/selectors';
import type { ClipboardSetup, LoadoutSetup, LoadoutState } from '../types/loadout.types';
import {
  extractWizardWardrobeData,
  parseWizardWardrobeSavedVariablesWithFallback,
  parseAlphaGearSavedVariables,
  convertAlphaGearToLoadoutState,
} from '../utils/luaParser';
import { convertAllCharactersToLoadoutState } from '../utils/wizardWardrobeConverter';
import {
  registerSlotsFromLoadoutState,
  clearWizardWardrobeSlotRegistry,
} from '../utils/wizardWardrobeSlotRegistry';

import { CharacterSelector } from './CharacterSelector';
import { ExportDialog } from './ExportDialog';
import { SetupEditor } from './SetupEditor';
import { SetupList } from './SetupList';

const MIN_PAGES = 1;

const createBlankSetup = (name: string): LoadoutSetup => ({
  name,
  disabled: false,
  condition: { boss: 'Custom' },
  skills: { 0: {}, 1: {} },
  cp: {},
  food: {},
  gear: {},
  code: '',
});

export const LoadoutManager: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));

  const currentTrial = useSelector(selectCurrentTrial);
  const currentPage = useSelector(selectCurrentPage);
  const setups = useSelector(selectCurrentSetups);
  const allPages = useSelector((state: RootState) =>
    currentTrial ? selectTrialPages(state, currentTrial) : [],
  );
  const currentCharacter = useSelector((state: RootState) => state.loadout.currentCharacter);

  const [selectedSetupIndex, setSelectedSetupIndex] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetIndex, setRenameTargetIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload skill and champion point data on mount
  useEffect(() => {
    preloadSkillData();
    preloadChampionPointData();
  }, []);

  // Restore slot registry from persisted state on mount.
  // The registry is in-memory only (Map), so after a page reload Redux Persist
  // brings back loadout data but the registry is empty. This ensures gear slot
  // validation works correctly without requiring a fresh import.
  const loadoutState = useSelector(selectLoadoutState);
  const slotRegistryRestored = useRef(false);
  useEffect(() => {
    if (!slotRegistryRestored.current && Object.keys(loadoutState.pages).length > 0) {
      slotRegistryRestored.current = true;
      registerSlotsFromLoadoutState(loadoutState, 'wizard-wardrobe');
    }
  }, [loadoutState]);

  useEffect(() => {
    if (!currentTrial || !currentCharacter) {
      return;
    }

    if (allPages.length < MIN_PAGES) {
      const pagesNeeded = MIN_PAGES - allPages.length;
      for (let i = 0; i < pagesNeeded; i += 1) {
        const pageName = `Page ${allPages.length + i + 1}`;
        dispatch(addPage({ trialId: currentTrial, pageName }));
      }
    }
  }, [currentTrial, currentCharacter, allPages.length, dispatch]);

  useEffect(() => {
    if (!currentTrial || setups.length > 0) {
      return;
    }

    const structure = generateSetupStructure(currentTrial, true);
    if (structure.length > 0) {
      dispatch(
        initializeSetups({
          trialId: currentTrial,
          pageIndex: currentPage,
          structure,
        }),
      );
    }
  }, [currentTrial, currentPage, setups.length, dispatch]);

  useEffect(() => {
    if (setups.length === 0) {
      setSelectedSetupIndex(null);
      setDrawerOpen(false);
      return;
    }

    setSelectedSetupIndex((previous) => {
      if (previous === null || previous >= setups.length) {
        return 0;
      }
      return previous;
    });
  }, [setups.length]);

  useEffect(() => {
    if (!isMdDown) {
      setDrawerOpen(false);
    }
  }, [isMdDown]);

  const selectedSetup = useMemo(
    () => (selectedSetupIndex !== null ? setups[selectedSetupIndex] : null),
    [selectedSetupIndex, setups],
  );

  const headerSubtitle = useMemo(() => {
    if (!currentTrial) {
      return 'Select a trial to start organizing your loadouts.';
    }
    const trial = TRIALS.find((entry) => entry.id === currentTrial);
    if (!trial) {
      return 'Custom loadouts';
    }
    const kind =
      trial.type === 'trial'
        ? 'Trial'
        : trial.type === 'arena'
          ? 'Arena'
          : trial.type === 'substitute'
            ? 'Substitute'
            : 'General';
    return `${trial.name} · ${kind}`;
  }, [currentTrial]);

  const showSnackbar = (message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (): void => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleBack = (): void => {
    navigate(-1);
  };

  const handleTrialChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    dispatch(setCurrentTrial(value));
    setSelectedSetupIndex(null);
    setDrawerOpen(false);
  };

  const handlePageChange = (_event: React.SyntheticEvent, value: number): void => {
    dispatch(setCurrentPage(value));
    setSelectedSetupIndex(null);
    if (isMdDown) {
      setDrawerOpen(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };

  const ensureTrialSelected = (): boolean => {
    if (!currentTrial) {
      showSnackbar('Pick a trial before managing setups.', 'error');
      return false;
    }
    return true;
  };

  const handleAddSetup = (): void => {
    if (!ensureTrialSelected()) {
      return;
    }

    const setup = createBlankSetup(`Setup ${setups.length + 1}`);
    dispatch(addSetup({ trialId: currentTrial!, pageIndex: currentPage, setup }));
    setSelectedSetupIndex(setups.length);
    if (isMdDown) {
      setDrawerOpen(true);
    }
    showSnackbar('Blank setup added.', 'success');
  };

  const handleDuplicateSetup = (index: number): void => {
    if (!ensureTrialSelected()) {
      return;
    }

    dispatch(duplicateSetup({ trialId: currentTrial!, pageIndex: currentPage, setupIndex: index }));
    setSelectedSetupIndex(setups.length);
    showSnackbar('Setup duplicated.', 'success');
  };

  const handleDeleteSetup = (index: number): void => {
    if (!ensureTrialSelected()) {
      return;
    }

    dispatch(deleteSetup({ trialId: currentTrial!, pageIndex: currentPage, setupIndex: index }));
    setSelectedSetupIndex((prev) => {
      if (prev === null) {
        return null;
      }
      if (prev === index && setups.length - 1 > 0) {
        return Math.max(0, prev - 1);
      }
      if (prev > index) {
        return prev - 1;
      }
      return prev;
    });
    showSnackbar('Setup deleted.', 'success');
  };

  const handleCopySetup = async (index: number): Promise<void> => {
    const target = setups[index];
    if (!target) {
      return;
    }

    try {
      const payload: ClipboardSetup = {
        version: 1,
        timestamp: Date.now(),
        setup: target,
        sourceTrialId: currentTrial || undefined,
        sourceBossName: target.condition?.boss,
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showSnackbar('Setup copied to clipboard.', 'success');
    } catch {
      showSnackbar('Could not copy setup to clipboard.', 'error');
    }
  };

  const handleSelectSetup = (index: number): void => {
    setSelectedSetupIndex(index);
    if (isMdDown) {
      setDrawerOpen(true);
    }
  };

  const handleOpenDetails = (index: number): void => {
    handleSelectSetup(index);
  };

  const handleAddPage = (): void => {
    if (!ensureTrialSelected()) {
      return;
    }
    const nextIndex = allPages.length + 1;
    dispatch(addPage({ trialId: currentTrial!, pageName: `Page ${nextIndex}` }));
    dispatch(setCurrentPage(allPages.length));
    showSnackbar('Page added.', 'success');
  };

  const handleOpenRename = (index: number): void => {
    const page = allPages[index];
    if (!page) {
      return;
    }
    setRenameTargetIndex(index);
    setRenameValue(page.name);
    setRenameDialogOpen(true);
  };

  const handleSubmitRename = (): void => {
    if (!ensureTrialSelected() || renameTargetIndex === null) {
      return;
    }
    if (!renameValue.trim()) {
      showSnackbar('Page name cannot be empty.', 'error');
      return;
    }

    dispatch(
      renamePage({
        trialId: currentTrial!,
        pageIndex: renameTargetIndex,
        newName: renameValue.trim(),
      }),
    );
    setRenameDialogOpen(false);
    showSnackbar('Page renamed.', 'success');
  };

  const handleClearAll = (): void => {
    setClearDialogOpen(false);
    dispatch(resetLoadout());
    clearWizardWardrobeSlotRegistry();
    setSelectedSetupIndex(null);
    setSearchTerm('');
    showSnackbar('Loadouts cleared.', 'success');
  };

  const processImportFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.json')) {
        const json = JSON.parse(text) as LoadoutState;
        if (json && typeof json === 'object' && 'pages' in json && 'characters' in json) {
          dispatch(loadState(json));
          registerSlotsFromLoadoutState(json, 'manual', { reset: true });
          setSelectedSetupIndex(null);
          showSnackbar('Imported loadout JSON.', 'success');
          return;
        }
      }

      // Try AlphaGear format first (AGX2_Character table)
      const alphaGearResult = parseAlphaGearSavedVariables(text);
      if (alphaGearResult) {
        const converted = convertAlphaGearToLoadoutState(alphaGearResult.characters);
        dispatch(loadState(converted));
        registerSlotsFromLoadoutState(converted, 'wizard-wardrobe', { reset: true });
        setSelectedSetupIndex(null);
        const characterCount = converted.characters.length;
        showSnackbar(
          `Imported AlphaGear loadouts for ${characterCount} ${characterCount === 1 ? 'character' : 'characters'}.`,
          'success',
        );
        return;
      }

      // Fall back to Wizard's Wardrobe format
      const parsed = parseWizardWardrobeSavedVariablesWithFallback(text);
      const wizardData = extractWizardWardrobeData({ [parsed.tableName]: parsed.data });
      if (!wizardData) {
        throw new Error("Could not find Wizard's Wardrobe or AlphaGear data in file.");
      }

      const converted = convertAllCharactersToLoadoutState(wizardData);
      dispatch(loadState(converted));
      registerSlotsFromLoadoutState(converted, 'wizard-wardrobe', { reset: true });
      setSelectedSetupIndex(null);
      const characterCount = Object.keys(converted.pages).length;
      showSnackbar(
        `Imported loadouts for ${characterCount} ${characterCount === 1 ? 'character' : 'characters'}.`,
        'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import file.';
      showSnackbar(message, 'error');
    }
  };

  const handleImportClick = async (): Promise<void> => {
    // Use the File System Access API when available so the picker opens
    // directly in the user's Documents folder — where ESO stores SavedVariables
    // (Documents\Elder Scrolls Online\live\SavedVariables\).
    if ('showOpenFilePicker' in window) {
      type OpenFilePickerFn = (options?: {
        startIn?: string;
        types?: { description?: string; accept: Record<string, string[]> }[];
        multiple?: boolean;
      }) => Promise<{ getFile: () => Promise<File> }[]>;
      const showOpenFilePicker = (window as Window & { showOpenFilePicker: OpenFilePickerFn })
        .showOpenFilePicker;
      try {
        const [fileHandle] = await showOpenFilePicker({
          startIn: 'documents',
          types: [
            {
              description: 'Loadout files (.lua, .json, .txt)',
              accept: {
                'text/plain': ['.lua', '.txt'],
                'application/json': ['.json'],
              },
            },
          ],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        await processImportFile(file);
      } catch (error) {
        // User cancelled (AbortError) — ignore silently
        if (error instanceof Error && error.name !== 'AbortError') {
          showSnackbar('Failed to open file picker.', 'error');
        }
      }
    } else {
      // Fallback for browsers that don't support the File System Access API
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await processImportFile(file);
    event.target.value = '';
  };

  const handleExportClick = (): void => {
    setExportDialogOpen(true);
  };

  const renameDisabled = !(currentTrial && allPages.length > 0);

  // Overflow menu for Import / Export / Clear
  const [overflowAnchor, setOverflowAnchor] = React.useState<HTMLElement | null>(null);
  const overflowOpen = Boolean(overflowAnchor);

  return (
    <Container maxWidth="xl" sx={{ py: 2, pb: 6 }}>
      <WorkInProgressDisclaimer featureName="Loadout Manager" sx={{ mb: 2 }} />

      <Stack spacing={2}>
        {/* ── Unified toolbar ─────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            px: { xs: 1.5, md: 2 },
            py: { xs: 1.25, md: 1.5 },
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Row 1: title + global actions */}
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Tooltip title="Back" arrow>
                <IconButton onClick={handleBack} size="small">
                  <ArrowBack fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                Loadout Manager
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {headerSubtitle}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Tooltip title="Import data" arrow>
                <IconButton size="small" onClick={handleImportClick}>
                  <FileUpload fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export" arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleExportClick}
                    disabled={setups.length === 0}
                  >
                    <FileDownload fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="More actions" arrow>
                <IconButton size="small" onClick={(e) => setOverflowAnchor(e.currentTarget)}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Row 2: character + role + trial dropdowns */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'center' }}
          >
            <CharacterSelector />

            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel id="trial-select-label">Trial / Activity</InputLabel>
              <Select
                labelId="trial-select-label"
                value={currentTrial ?? ''}
                label="Trial / Activity"
                onChange={handleTrialChange}
              >
                {TRIALS.map((trial) => (
                  <MenuItem key={trial.id} value={trial.id}>
                    <Stack spacing={0.15}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {trial.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {trial.type === 'trial'
                          ? 'Trial'
                          : trial.type === 'arena'
                            ? 'Arena'
                            : trial.type === 'substitute'
                              ? 'Substitute'
                              : 'General'}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Row 3: page tabs — full width */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tabs
              value={Math.min(currentPage, Math.max(allPages.length - 1, 0))}
              onChange={handlePageChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ flex: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
            >
              {allPages.map((page, index) => (
                <Tab key={`${page.name}-${index}`} label={page.name} value={index} />
              ))}
            </Tabs>
            <Tooltip title="Rename page" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleOpenRename(currentPage)}
                  disabled={renameDisabled}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add page" arrow>
              <IconButton size="small" color="primary" onClick={handleAddPage}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Row 4: search + new setup */}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search setups..."
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiInputBase-root': { height: 36 } }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddSetup}
              disabled={!currentTrial}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 36 }}
            >
              New
            </Button>
          </Stack>
        </Paper>

        {/* ── Main content: list + editor ───────────────────── */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          {/* Setup list — narrower on desktop */}
          <Box
            sx={{
              width: { xs: '100%', lg: '38%' },
              flexShrink: 0,
              minWidth: 0,
              maxHeight: { lg: 'calc(100vh - 280px)' },
              display: 'flex',
            }}
          >
            <SetupList
              setups={setups}
              selectedIndex={selectedSetupIndex}
              filterText={searchTerm}
              onOpenDetails={handleOpenDetails}
              onDuplicateSetup={handleDuplicateSetup}
              onDeleteSetup={handleDeleteSetup}
              onCopySetup={handleCopySetup}
            />
          </Box>

          {/* Editor — wider on desktop */}
          {!isMdDown && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {selectedSetup ? (
                <SetupEditor
                  setup={selectedSetup}
                  setupIndex={selectedSetupIndex ?? 0}
                  trialId={currentTrial ?? 'GEN'}
                  pageIndex={currentPage}
                  variant="page"
                />
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    height: '100%',
                    minHeight: 200,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    px: 3,
                    py: 4,
                    color: 'text.secondary',
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Select a setup
                    </Typography>
                    <Typography variant="body2">
                      Choose a loadout from the list to review gear, skills, and CP.
                    </Typography>
                  </Stack>
                </Paper>
              )}
            </Box>
          )}
        </Stack>
      </Stack>

      {/* Hidden file input */}
      <input
        type="file"
        accept=".lua,.json,.txt"
        hidden
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen && Boolean(selectedSetup)}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
      >
        {selectedSetup && (
          <SetupEditor
            setup={selectedSetup}
            setupIndex={selectedSetupIndex ?? 0}
            trialId={currentTrial ?? 'GEN'}
            pageIndex={currentPage}
            variant="drawer"
          />
        )}
      </Drawer>

      {/* Export dialog */}
      <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />

      {/* Overflow menu */}
      <Menu
        anchorEl={overflowAnchor}
        open={overflowOpen}
        onClose={() => setOverflowAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            handleImportClick();
            setOverflowAnchor(null);
          }}
        >
          <ListItemIcon>
            <FileUpload fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleExportClick();
            setOverflowAnchor(null);
          }}
          disabled={setups.length === 0}
        >
          <ListItemIcon>
            <FileDownload fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setClearDialogOpen(true);
            setOverflowAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteSweep fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Clear All Data</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rename page dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename Page</DialogTitle>
        <DialogContent>
          <TextField
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
            fullWidth
            margin="dense"
            label="Page name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitRename} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear all dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear all loadouts?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes every character, page, and setup. You can re-import data from Wizard&apos;s
            Wardrobe at any time.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleClearAll}>
            Clear everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
