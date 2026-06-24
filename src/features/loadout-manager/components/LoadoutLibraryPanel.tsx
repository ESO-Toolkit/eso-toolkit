/**
 * Loadout Library Panel
 *
 * Lists the user's saved loadouts (the `savedLoadouts` slice) as cards and
 * exposes Load / Duplicate / Rename / Delete actions. This is the loadout
 * counterpart of the "My Builds" list — saved loadouts are named, persisted,
 * and browsable, rather than the session-scoped working trial/character tree.
 */

import {
  Bookmark as BookmarkIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  DriveFileRenameOutline as RenameIcon,
  PlayArrow as LoadIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { StatHealthBadge } from '@/components/stats/StatHealthBadge';
import { calculateSurvivability, loadoutSetupToEngineInputs } from '@/engine';
import {
  deleteSavedLoadout,
  renameSavedLoadout,
  saveLoadout,
  selectSavedLoadouts,
  type SavedLoadout,
} from '@/store/saved_loadouts';
import { useAppDispatch } from '@/store/useAppDispatch';

import type { LoadoutSetup } from '../types/loadout.types';
import {
  formatProgressSection,
  getSetupConditionSummary,
  getSetupProgressSections,
} from '../utils/setupDisplay';

interface LoadoutLibraryPanelProps {
  /**
   * Invoked when the user loads a library entry into the working area. The host
   * (LoadoutManager) decides where it lands (current trial/page).
   */
  onLoad?: (setup: LoadoutSetup, entry: SavedLoadout) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface LibraryCardProps {
  entry: SavedLoadout;
  isDarkMode: boolean;
  onLoad?: (setup: LoadoutSetup, entry: SavedLoadout) => void;
  onDuplicate: (entry: SavedLoadout) => void;
  onRename: (entry: SavedLoadout) => void;
  onDelete: (entry: SavedLoadout) => void;
}

const LibraryCard: React.FC<LibraryCardProps> = ({
  entry,
  isDarkMode,
  onLoad,
  onDuplicate,
  onRename,
  onDelete,
}) => {
  const conditionSummary = getSetupConditionSummary(entry.setup);
  const progressSections = getSetupProgressSections(entry.setup);
  // Gear-derived survivability chip for the card. Skipped when the loadout has no
  // gear (EHP would be base-only and meaningless).
  const survivability = React.useMemo(() => {
    const gear = entry.setup.gear ?? {};
    const hasGear = Object.entries(gear).some(
      ([key, piece]) => key !== 'mythic' && Boolean(piece?.id),
    );
    if (!hasGear) return null;
    const { setup, build } = loadoutSetupToEngineInputs(entry.setup);
    return calculateSurvivability(setup, build);
  }, [entry.setup]);

  return (
    <Card
      elevation={0}
      sx={{
        border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 2,
        background: isDarkMode ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
        backdropFilter: 'blur(10px)',
        transition: 'border-color 0.2s ease',
        '&:hover': {
          borderColor: isDarkMode ? 'rgba(56,189,248,0.3)' : 'rgba(59,130,246,0.25)',
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              wordBreak: 'break-word',
            }}
          >
            {entry.name || 'Unnamed Loadout'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0, flexWrap: 'wrap' }}>
            {entry.meta?.trialId && (
              <Chip label={entry.meta.trialId} size="small" sx={{ fontSize: '0.7rem' }} />
            )}
            {entry.meta?.characterName && (
              <Chip
                label={entry.meta.characterName}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.5, display: 'block' }}
        >
          Updated {formatDate(entry.updatedAt)}
        </Typography>
        {conditionSummary && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.8rem' }}
          >
            {conditionSummary}
          </Typography>
        )}
        {entry.description && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontSize: '0.8rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {entry.description}
          </Typography>
        )}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}
          useFlexGap
        >
          {progressSections.length === 0 ? (
            <Chip label="Empty setup" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          ) : (
            progressSections.map((section, index) => (
              <Chip
                key={`${section.type}-${index}`}
                label={formatProgressSection(section)}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
            ))
          )}
        </Stack>
        {survivability && (
          <Box sx={{ mt: 1 }}>
            <StatHealthBadge survivability={survivability} variant="compact" />
          </Box>
        )}
      </CardContent>
      <Divider sx={{ opacity: 0.5 }} />
      <CardActions sx={{ gap: 1, px: 2, py: 1 }}>
        {onLoad && (
          <Button
            size="small"
            startIcon={<LoadIcon />}
            onClick={() => onLoad(entry.setup, entry)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Load
          </Button>
        )}
        <Button
          size="small"
          startIcon={<DuplicateIcon />}
          onClick={() => onDuplicate(entry)}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            color: isDarkMode ? '#94a3b8' : '#64748b',
          }}
        >
          Duplicate
        </Button>
        <Button
          size="small"
          startIcon={<RenameIcon />}
          onClick={() => onRename(entry)}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            color: isDarkMode ? '#94a3b8' : '#64748b',
          }}
        >
          Rename
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(entry)}
          color="error"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export const LoadoutLibraryPanel: React.FC<LoadoutLibraryPanelProps> = ({ onLoad }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const savedLoadouts = useSelector(selectSavedLoadouts);

  const [pendingDelete, setPendingDelete] = useState<SavedLoadout | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedLoadout | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDescription, setRenameDescription] = useState('');

  const handleDuplicate = (entry: SavedLoadout): void => {
    dispatch(
      saveLoadout({
        name: `${entry.name} (copy)`,
        setup: entry.setup,
        description: entry.description,
        meta: entry.meta,
      }),
    );
  };

  const handleOpenRename = (entry: SavedLoadout): void => {
    setRenameTarget(entry);
    setRenameName(entry.name);
    setRenameDescription(entry.description ?? '');
  };

  const handleSubmitRename = (): void => {
    if (!renameTarget || !renameName.trim()) {
      return;
    }
    dispatch(
      renameSavedLoadout({
        id: renameTarget.id,
        name: renameName.trim(),
        description: renameDescription.trim(),
      }),
    );
    setRenameTarget(null);
  };

  const handleConfirmDelete = (): void => {
    if (pendingDelete) {
      dispatch(deleteSavedLoadout(pendingDelete.id));
      setPendingDelete(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#0f172a' }}
        >
          Loadout Library
        </Typography>
        <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#64748b', mt: 0.25 }}>
          {savedLoadouts.length === 0
            ? 'No saved loadouts yet. Use "Save to Library" on a setup to add one.'
            : `${savedLoadouts.length} saved loadout${savedLoadouts.length === 1 ? '' : 's'}`}
        </Typography>
      </Box>

      {savedLoadouts.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: isDarkMode ? '2px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(0,0,0,0.1)',
            borderRadius: 3,
          }}
        >
          <BookmarkIcon sx={{ fontSize: 48, color: isDarkMode ? '#334155' : '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" sx={{ color: isDarkMode ? '#475569' : '#94a3b8' }}>
            Your library is empty
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? '#475569' : '#94a3b8', mt: 1 }}>
            Save a setup to the library to reuse it across trials and characters.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {savedLoadouts.map((entry) => (
            <LibraryCard
              key={entry.id}
              entry={entry}
              isDarkMode={isDarkMode}
              onLoad={onLoad}
              onDuplicate={handleDuplicate}
              onRename={handleOpenRename}
              onDelete={setPendingDelete}
            />
          ))}
        </Stack>
      )}

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Rename Loadout</DialogTitle>
        <DialogContent>
          <TextField
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
          />
          <TextField
            value={renameDescription}
            onChange={(event) => setRenameDescription(event.target.value)}
            fullWidth
            margin="dense"
            label="Description (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button onClick={handleSubmitRename} variant="contained" disabled={!renameName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Loadout?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete <strong>{pendingDelete?.name}</strong>? This cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
