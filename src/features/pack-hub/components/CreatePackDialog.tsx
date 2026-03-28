import {
  Add,
  CheckCircle,
  Extension,
  RemoveCircleOutline,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { packHubApi } from '../api/pack-hub-api';
import type { HubPack, PackAddonEntry } from '../types/pack-hub.types';
import {
  PACK_TAG_COLORS,
  PACK_TYPE_LABELS,
  PRESET_PACK_TAGS,
} from '../types/pack-hub.types';

interface CreatePackDialogProps {
  open: boolean;
  token: string;
  onClose: () => void;
  onCreated: () => void;
  editingPack?: HubPack;
}

const MAX_TAGS = 5;
const PACK_TYPES = ['addon-pack', 'build-pack', 'roster-pack'] as const;

export const CreatePackDialog: React.FC<CreatePackDialogProps> = ({
  open,
  token,
  onClose,
  onCreated,
  editingPack,
}) => {
  const isEditMode = !!editingPack;
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [packType, setPackType] = React.useState<string>('addon-pack');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [addons, setAddons] = React.useState<PackAddonEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Custom addon entry fields
  const [newAddonName, setNewAddonName] = React.useState('');
  const [newAddonId, setNewAddonId] = React.useState('');
  const [newAddonNote, setNewAddonNote] = React.useState('');

  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handleAddAddon = (): void => {
    const id = parseInt(newAddonId, 10);
    const name = newAddonName.trim();
    if (!name || isNaN(id) || id <= 0) return;
    if (addons.some((a) => a.esouiId === id)) {
      setError(`Addon with ESOUI ID ${id} already exists in this pack.`);
      return;
    }
    setAddons((prev) => [
      ...prev,
      { esouiId: id, name, required: true, note: newAddonNote.trim() || undefined },
    ]);
    setNewAddonName('');
    setNewAddonId('');
    setNewAddonNote('');
    setError(null);
  };

  const handleRemoveAddon = (esouiId: number): void => {
    setAddons((prev) => prev.filter((a) => a.esouiId !== esouiId));
  };

  const handleToggleRequired = (esouiId: number): void => {
    setAddons((prev) =>
      prev.map((a) => (a.esouiId === esouiId ? { ...a, required: !a.required } : a)),
    );
  };

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (addons.length === 0) {
      setError('Add at least one addon to your pack.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        pack_type: packType,
        addons,
        tags: selectedTags,
        is_anonymous: isAnonymous,
      };
      if (isEditMode) {
        await packHubApi.update(editingPack.id, payload, token);
      } else {
        await packHubApi.create(payload, token);
      }
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isEditMode ? 'Failed to update' : 'Failed to create',
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset / pre-fill on open
  React.useEffect(() => {
    if (open) {
      if (editingPack) {
        setTitle(editingPack.title);
        setDescription(editingPack.description ?? '');
        setPackType(editingPack.pack_type);
        setSelectedTags(editingPack.tags ?? []);
        setIsAnonymous(editingPack.is_anonymous ?? false);
        setAddons(editingPack.addons ?? []);
      } else {
        setTitle('');
        setDescription('');
        setPackType('addon-pack');
        setSelectedTags([]);
        setIsAnonymous(false);
        setAddons([]);
      }
      setNewAddonName('');
      setNewAddonId('');
      setNewAddonNote('');
      setError(null);
    }
  }, [open, editingPack]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Extension sx={{ fontSize: '1.25rem', color: '#c4a44a' }} />
        {isEditMode ? 'Edit Pack' : 'Create Addon Pack'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {/* Title */}
        <TextField
          label="Pack Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          helperText={`${title.length}/100`}
          required
          fullWidth
          size="small"
          error={!!error && !title.trim()}
          placeholder="e.g. Trial Essentials, PvP Toolkit"
        />

        {/* Description */}
        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${description.length}/500`}
          multiline
          rows={2}
          fullWidth
          size="small"
          placeholder="What is this pack for? Who should use it?"
        />

        {/* Pack type */}
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Pack Type
          </Typography>
          <Select
            size="small"
            value={packType}
            onChange={(e: SelectChangeEvent) => setPackType(e.target.value)}
            fullWidth
          >
            {PACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {PACK_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Tags */}
        <Box>
          <Typography
            variant="caption"
            color={atTagLimit ? 'warning.main' : 'text.secondary'}
            gutterBottom
            display="block"
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
            {PRESET_PACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = PACK_TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip key={tag} title={isDisabled ? `Remove a tag first (max ${MAX_TAGS})` : ''}>
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      onClick={isDisabled ? undefined : () => handleTagToggle(tag)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                        transition: 'all 0.15s ease',
                        ...(isSelected
                          ? {
                              bgcolor: accent,
                              color: '#fff',
                              borderColor: accent,
                              '&:hover': { bgcolor: accent, filter: 'brightness(0.9)' },
                            }
                          : {
                              borderColor: `${accent}55`,
                              color: accent,
                              '&:hover': isDisabled
                                ? {}
                                : { bgcolor: `${accent}18`, borderColor: accent },
                            }),
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Stack>
        </Box>

        {/* ── Addon List Builder ── */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: addons.length > 0 ? '#c4a44a55' : 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.25,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Extension sx={{ fontSize: 18, color: '#c4a44a' }} />
            <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
              Addons
              {addons.length > 0 && (
                <Chip
                  label={addons.length}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: '#c4a44a22',
                    color: '#c4a44a',
                    fontWeight: 700,
                  }}
                />
              )}
            </Typography>
            {addons.length === 0 && (
              <Typography variant="caption" color="error">
                Required
              </Typography>
            )}
          </Box>

          {/* Addon list */}
          {addons.length > 0 && (
            <Box
              sx={{
                maxHeight: 260,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 3,
                },
              }}
            >
              {addons.map((addon, i) => (
                <Box
                  key={addon.esouiId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    py: 0.75,
                    px: 2,
                    borderTop: i > 0 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.1s',
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: addon.required ? '#c4a44a' : 'text.disabled',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {addon.name}
                    </Typography>
                    {addon.note && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {addon.note}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ flexShrink: 0, fontSize: '0.65rem' }}
                  >
                    #{addon.esouiId}
                  </Typography>
                  <Tooltip title={addon.required ? 'Mark as optional' : 'Mark as required'}>
                    <Chip
                      label={addon.required ? 'Required' : 'Optional'}
                      size="small"
                      onClick={() => handleToggleRequired(addon.esouiId)}
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        bgcolor: addon.required ? '#c4a44a22' : 'transparent',
                        color: addon.required ? '#c4a44a' : 'text.secondary',
                        border: addon.required ? '1px solid #c4a44a55' : '1px solid',
                        borderColor: addon.required ? '#c4a44a55' : 'divider',
                        '&:hover': {
                          bgcolor: addon.required ? '#c4a44a33' : 'action.hover',
                        },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Remove addon">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAddon(addon.esouiId)}
                      sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <RemoveCircleOutline sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}

          {/* Add addon form */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 2,
              borderTop: addons.length > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Add an addon
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                size="small"
                label="Addon Name"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                sx={{ flex: 2 }}
                placeholder="e.g. RaidNotifier"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAddon();
                  }
                }}
              />
              <TextField
                size="small"
                label="ESOUI ID"
                value={newAddonId}
                onChange={(e) => setNewAddonId(e.target.value.replace(/\D/g, ''))}
                sx={{ flex: 1 }}
                placeholder="e.g. 1355"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAddon();
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                size="small"
                label="Note (optional)"
                value={newAddonNote}
                onChange={(e) => setNewAddonNote(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="e.g. Trial-specific warnings"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAddon();
                  }
                }}
              />
              <Tooltip title="Add addon to pack">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddAddon}
                    disabled={!newAddonName.trim() || !newAddonId}
                    startIcon={<Add sx={{ fontSize: 18 }} />}
                    sx={{
                      borderColor: '#c4a44a55',
                      color: '#c4a44a',
                      fontWeight: 700,
                      '&:hover': { borderColor: '#c4a44a', bgcolor: '#c4a44a15' },
                      '&.Mui-disabled': { borderColor: 'divider', color: 'text.disabled' },
                    }}
                  >
                    Add
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Anonymous toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Publish anonymously
            </Typography>
          }
          sx={{ mt: 0.5 }}
        />

        {/* Summary */}
        {addons.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CheckCircle sx={{ fontSize: 14, color: '#22c55e' }} />
            <Typography variant="caption" color="text.secondary">
              {addons.length} addon{addons.length !== 1 ? 's' : ''} ·{' '}
              {addons.filter((a) => a.required).length} required ·{' '}
              {addons.filter((a) => !a.required).length} optional
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => void handlePublish()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            background: 'linear-gradient(135deg, #c4a44a 0%, #d4b45a 100%)',
            color: '#0b1220',
            fontWeight: 700,
            '&:hover': {
              background: 'linear-gradient(135deg, #d4b45a 0%, #e4c46a 100%)',
            },
          }}
        >
          {loading
            ? isEditMode
              ? 'Updating…'
              : 'Creating…'
            : isEditMode
              ? 'Update Pack'
              : 'Create Pack'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
