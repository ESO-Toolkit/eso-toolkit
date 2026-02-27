import {
  Add as AddIcon,
  ArrowBack,
  DeleteSweep,
  FileDownload,
  FileUpload,
  MoreVert,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
} from '../utils/luaParser';
import { convertAllCharactersToLoadoutState } from '../utils/wizardWardrobeConverter';
import {
  registerSlotsFromLoadoutState,
  clearWizardWardrobeSlotRegistry,
} from '../utils/wizardWardrobeSlotRegistry';

import { ExportDialog } from './ExportDialog';
import { LoadoutDetails } from './LoadoutDetails';
import { LoadoutSidebar } from './LoadoutSidebar';
import { metallicPanelEnhanced } from './styles/textureStyles';

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
  const [_drawerOpen, setDrawerOpen] = useState(false);
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

  const _headerSubtitle = useMemo(() => {
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

  const _handleOpenDetails = (index: number): void => {
    handleSelectSetup(index);
  };

  const _handleAddPage = (): void => {
    if (!ensureTrialSelected()) {
      return;
    }
    const nextIndex = allPages.length + 1;
    dispatch(addPage({ trialId: currentTrial!, pageName: `Page ${nextIndex}` }));
    dispatch(setCurrentPage(allPages.length));
    showSnackbar('Page added.', 'success');
  };

  const _handleOpenRename = (index: number): void => {
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

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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

      const parsed = parseWizardWardrobeSavedVariablesWithFallback(text);
      const wizardData = extractWizardWardrobeData({ [parsed.tableName]: parsed.data });
      if (!wizardData) {
        throw new Error("Could not find Wizard's Wardrobe data in file.");
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
    } finally {
      event.target.value = '';
    }
  };

  const handleExportClick = (): void => {
    setExportDialogOpen(true);
  };

  const _renameDisabled = !(currentTrial && allPages.length > 0);

  // Overflow menu for Import / Export / Clear
  const [overflowAnchor, setOverflowAnchor] = React.useState<HTMLElement | null>(null);
  const overflowOpen = Boolean(overflowAnchor);

  // Mockup-matching layout with centered container
  return (
    <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'transparent',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1400,
            ...metallicPanelEnhanced,
            // Animated shine effect
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: -1000,
              width: 2000,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
              transform: 'skewX(-20deg)',
              animation: 'borderShineEnhanced 10s ease-in-out infinite',
              pointerEvents: 'none',
            },
          }}
        >
        <Stack spacing={2}>
          {/* Compact Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Back" arrow>
                <IconButton
                  onClick={handleBack}
                  size="small"
                  sx={{
                    color: 'rgba(0, 217, 255, 0.7)',
                    '&:hover': {
                      color: '#00d9ff',
                      backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    },
                  }}
                >
                  <ArrowBack fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#00d9ff',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Loadouts
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel
                  sx={{
                    color: '#7a8599',
                    fontSize: '0.8rem',
                    '&.Mui-focused': { color: '#00d9ff' },
                  }}
                >
                  Trial
                </InputLabel>
                <Select
                  value={currentTrial ?? ''}
                  label="Trial"
                  onChange={handleTrialChange}
                  sx={{
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 217, 255, 0.25)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 217, 255, 0.4)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00d9ff',
                  },
                }}
                >
                  {TRIALS.map((trial) => (
                    <MenuItem key={trial.id} value={trial.id}>
                      <Typography sx={{ fontWeight: 500, color: '#ffffff', fontSize: '0.8rem' }}>
                        {trial.name}
                      </Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Import" arrow>
                <IconButton
                  size="small"
                  onClick={handleImportClick}
                  sx={{
                    color: 'rgba(0, 217, 255, 0.7)',
                    '&:hover': {
                      color: '#00d9ff',
                      backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    },
                  }}
                >
                  <FileUpload fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export" arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleExportClick}
                    disabled={setups.length === 0}
                    sx={{
                      color: 'rgba(0, 217, 255, 0.7)',
                      '&:hover': {
                        color: '#00d9ff',
                        backgroundColor: 'rgba(0, 217, 255, 0.1)',
                      },
                    }}
                  >
                    <FileDownload fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="More" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => setOverflowAnchor(e.currentTarget)}
                  sx={{
                    color: 'rgba(0, 217, 255, 0.7)',
                    '&:hover': {
                      color: '#00d9ff',
                      backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    },
                  }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Page tabs + Search row */}
          <Box sx={{ px: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tabs
                value={Math.min(currentPage, Math.max(allPages.length - 1, 0))}
                onChange={handlePageChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  flex: 1,
                  minHeight: 36,
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#00d9ff',
                    height: 2,
                  },
                  '& .MuiTab-root': {
                    minHeight: 36,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.8rem',
                    color: '#7a8599',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#00d9ff',
                    },
                    '&.Mui-selected': {
                      color: '#00d9ff',
                    },
                  },
                }}
              >
                {allPages.map((page, index) => (
                  <Tab key={`${page.name}-${index}`} label={page.name} value={index} />
                ))}
              </Tabs>

              <TextField
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search..."
                size="small"
                sx={{
                  width: 140,
                  '& .MuiInputBase-root': {
                    height: 32,
                    fontSize: '0.8rem',
                    color: '#ffffff',
                    backgroundColor: 'rgba(10, 18, 35, 0.8)',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 217, 255, 0.25)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 217, 255, 0.4)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00d9ff',
                    },
                  },
                }}
              />

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddSetup}
                disabled={!currentTrial}
                sx={{
                  height: 32,
                  minWidth: 'auto',
                  px: 1.5,
                  fontSize: '0.75rem',
                  background: '#00d9ff',
                  color: '#0a0f1e',
                  fontWeight: 700,
                  '&:hover': {
                    background: '#00c4e6',
                  },
                  '&:disabled': {
                    background: 'rgba(0, 217, 255, 0.15)',
                    color: 'rgba(0, 217, 255, 0.4)',
                  },
                }}
              >
                New
              </Button>
            </Stack>
          </Box>

          {/* Main content: Two-column layout */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems="stretch">
              {/* Left Sidebar - Loadout Slots List (30%) */}
              <LoadoutSidebar
                setups={setups}
                selectedIndex={selectedSetupIndex}
                filterText={searchTerm}
                onSelectSetup={handleSelectSetup}
                onCopySetup={handleCopySetup}
                onDuplicateSetup={handleDuplicateSetup}
                onDeleteSetup={handleDeleteSetup}
              />

              {/* Right Panel - Loadout Details (70%) */}
              <LoadoutDetails
                setup={selectedSetup}
                setupIndex={selectedSetupIndex}
                trialId={currentTrial ?? 'GEN'}
                pageIndex={currentPage}
              />
            </Stack>
          </Box>
        </Stack>

        {/* Hidden file input */}
        <input
          type="file"
          accept=".lua,.json,.txt"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Export dialog */}
        <ExportDialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />

        {/* Overflow menu */}
        <Menu
          anchorEl={overflowAnchor}
          open={overflowOpen}
          onClose={() => setOverflowAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: 'rgba(10, 18, 35, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: 2,
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              handleImportClick();
              setOverflowAnchor(null);
            }}
            sx={{
              color: '#e5e7eb',
              fontSize: '0.85rem',
              '&:hover': {
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                color: '#ffffff',
              },
            }}
          >
            <ListItemIcon>
              <FileUpload fontSize="small" sx={{ color: '#e5e7eb' }} />
            </ListItemIcon>
            <ListItemText>Import</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleExportClick();
              setOverflowAnchor(null);
            }}
            disabled={setups.length === 0}
            sx={{
              color: '#e5e7eb',
              fontSize: '0.85rem',
              '&:hover': {
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                color: '#ffffff',
              },
            }}
          >
            <ListItemIcon>
              <FileDownload fontSize="small" sx={{ color: '#e5e7eb' }} />
            </ListItemIcon>
            <ListItemText>Export</ListItemText>
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(0, 217, 255, 0.15)' }} />
          <MenuItem
            onClick={() => {
              setClearDialogOpen(true);
              setOverflowAnchor(null);
            }}
            sx={{ color: '#ef4444', fontSize: '0.85rem' }}
          >
            <ListItemIcon>
              <DeleteSweep fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Clear All Data</ListItemText>
          </MenuItem>
        </Menu>

        {/* Rename page dialog */}
        <Dialog
          open={renameDialogOpen}
          onClose={() => setRenameDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: 'rgba(10, 18, 35, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>Rename Page</DialogTitle>
          <DialogContent>
            <TextField
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
              fullWidth
              margin="dense"
              label="Page name"
              sx={{
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(0, 217, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#00d9ff',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 217, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 217, 255, 0.5)',
                },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00d9ff',
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setRenameDialogOpen(false)}
              sx={{
                color: 'rgba(0, 217, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 217, 255, 0.1)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRename}
              variant="contained"
              sx={{
                background: '#00d9ff',
                color: '#0a0f1e',
                fontWeight: 700,
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear all dialog */}
        <Dialog
          open={clearDialogOpen}
          onClose={() => setClearDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: 'rgba(10, 18, 35, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>Clear all loadouts?</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              This removes every character, page, and setup. You can re-import data at any time.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setClearDialogOpen(false)}
              sx={{
                color: 'rgba(0, 217, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 217, 255, 0.1)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleClearAll}
              sx={{
                backgroundColor: '#ef4444',
                '&:hover': {
                  backgroundColor: '#dc2626',
                },
              }}
            >
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
          <Alert
            severity={snackbar.severity}
            onClose={handleSnackbarClose}
            sx={{
              width: '100%',
              backgroundColor: 'rgba(10, 18, 35, 0.95)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${
                snackbar.severity === 'success' ? '#22c55e' : '#ef4444'
              }`,
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};
