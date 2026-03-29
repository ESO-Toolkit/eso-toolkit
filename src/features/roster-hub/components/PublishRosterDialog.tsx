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
  FormControl,
  FormControlLabel,
  InputLabel,
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

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import { rosterHubApi } from '../api/roster-hub-api';
import type { HubRoster } from '../types/roster-hub.types';
import { TAG_COLORS } from '../types/roster-hub.types';

interface PublishRosterDialogProps {
  open: boolean;
  rosterData: string; // compact encoded roster from encodeRosterToURL
  onClose: () => void;
  onPublished: () => void;
  token: string;
  /** When provided, the dialog operates in edit mode — updates the existing hub roster. */
  editingRoster?: HubRoster;
}

const HUB_TRIALS = TRIALS.filter((t) => t.type === 'trial');
const MAX_TAGS = 5;

type Difficulty = 'vet' | 'normal';
const DIFFICULTY_TAGS: Difficulty[] = ['normal', 'vet'];
const EXTRA_PRESET_TAGS = ['sweaty', 'fun', 'score-push'] as const;

export const PublishRosterDialog: React.FC<PublishRosterDialogProps> = ({
  open,
  rosterData,
  onClose,
  onPublished,
  token,
  editingRoster,
}) => {
  const isEditMode = !!editingRoster;
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [trialId, setTrialId] = React.useState('');
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(null);
  const [hmEnabled, setHmEnabled] = React.useState(false);
  const [extraTags, setExtraTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Compose the final tags array from difficulty + hm + extras
  const selectedTags = React.useMemo(() => {
    const tags: string[] = [];
    if (difficulty) tags.push(difficulty);
    if (difficulty === 'vet' && hmEnabled) tags.push('hm');
    tags.push(...extraTags);
    return tags;
  }, [difficulty, hmEnabled, extraTags]);

  const handleTrialChange = (e: SelectChangeEvent): void => {
    setTrialId(e.target.value);
  };

  const handleDifficultyChange = (d: Difficulty): void => {
    setDifficulty((prev) => (prev === d ? null : d));
    if (d !== 'vet') setHmEnabled(false);
  };

  const addTag = (tag: string): void => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || selectedTags.includes(trimmed) || selectedTags.length >= MAX_TAGS) return;
    setExtraTags((prev) => [...prev, trimmed]);
  };

  const removeTag = (tag: string): void => {
    // Handle removing difficulty/hm via the chip × button
    if (tag === 'vet' || tag === 'normal') {
      setDifficulty(null);
      setHmEnabled(false);
      return;
    }
    if (tag === 'hm') {
      setHmEnabled(false);
      return;
    }
    setExtraTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!trialId) {
      setError('Please select a trial.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        trial_id: trialId,
        roster_data: rosterData,
        tags: selectedTags,
        is_anonymous: isAnonymous,
      };
      if (isEditMode) {
        await rosterHubApi.update(editingRoster.id, payload, token);
      } else {
        await rosterHubApi.create(payload, token);
      }
      onPublished();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isEditMode ? 'Failed to update' : 'Failed to publish',
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset / pre-fill on open
  React.useEffect(() => {
    if (open) {
      if (editingRoster) {
        setTitle(editingRoster.title);
        setDescription(editingRoster.description ?? '');
        setTrialId(editingRoster.trial_id ?? '');
        // Hydrate difficulty/hm/extras from flat tags array
        const tags = editingRoster.tags ?? [];
        if (tags.includes('vet')) setDifficulty('vet');
        else if (tags.includes('normal')) setDifficulty('normal');
        else setDifficulty(null);
        setHmEnabled(tags.includes('hm'));
        setExtraTags(tags.filter((t) => t !== 'vet' && t !== 'normal' && t !== 'hm'));
        setTagInput('');
        setIsAnonymous(editingRoster.is_anonymous ?? false);
      } else {
        setTitle('');
        setDescription('');
        setTrialId('');
        setDifficulty(null);
        setHmEnabled(false);
        setExtraTags([]);
        setTagInput('');
        setIsAnonymous(false);
      }
      setError(null);
    }
  }, [open, editingRoster]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>{isEditMode ? 'Edit Published Roster' : 'Publish to Roster Hub'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          helperText={`${title.length}/100`}
          required
          fullWidth
          size="small"
          error={!!error && !title.trim()}
          aria-required="true"
          aria-invalid={!!error && !title.trim()}
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${description.length}/500`}
          multiline
          rows={3}
          fullWidth
          size="small"
        />

        <FormControl size="small" required fullWidth error={!!error && !trialId}>
          <InputLabel id="publish-trial-label">Trial</InputLabel>
          <Select
            labelId="publish-trial-label"
            value={trialId}
            label="Trial"
            onChange={handleTrialChange}
          >
            {HUB_TRIALS.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography
            variant="caption"
            color={atTagLimit ? 'warning.main' : 'text.secondary'}
            gutterBottom
            display="block"
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>

          {/* Difficulty toggle group */}
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
            {DIFFICULTY_TAGS.map((d) => {
              const isActive = difficulty === d;
              const accent = TAG_COLORS[d];
              return (
                <Box key={d} sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <Chip
                    label={d === 'vet' ? 'Veteran' : 'Normal'}
                    size="small"
                    variant={isActive ? 'filled' : 'outlined'}
                    onClick={() => handleDifficultyChange(d)}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      px: 0.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      ...(isActive
                        ? {
                            bgcolor: accent,
                            color: '#fff',
                            borderColor: accent,
                            '&:hover': { bgcolor: accent, filter: 'brightness(0.85)' },
                          }
                        : {
                            borderColor: `${accent}55`,
                            color: accent,
                            '&:hover': { bgcolor: `${accent}18`, borderColor: accent },
                          }),
                      // Round right corners only when HM chip is not adjacent
                      ...(d === 'vet' && isActive
                        ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                        : {}),
                    }}
                  />
                  {/* HM chip attached to Vet */}
                  {d === 'vet' && isActive && (
                    <Chip
                      label="HM"
                      size="small"
                      variant={hmEnabled ? 'filled' : 'outlined'}
                      onClick={() => setHmEnabled((prev) => !prev)}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        ml: '-1px',
                        transition: 'all 0.15s ease',
                        ...(hmEnabled
                          ? {
                              bgcolor: TAG_COLORS.hm,
                              color: '#fff',
                              borderColor: TAG_COLORS.hm,
                              '&:hover': {
                                bgcolor: TAG_COLORS.hm,
                                filter: 'brightness(0.85)',
                              },
                            }
                          : {
                              borderColor: `${TAG_COLORS.hm}55`,
                              color: TAG_COLORS.hm,
                              '&:hover': {
                                bgcolor: `${TAG_COLORS.hm}18`,
                                borderColor: TAG_COLORS.hm,
                              },
                            }),
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>

          {/* Selected tags + freeform input */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.5,
              p: 1,
              mt: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
              minHeight: 40,
            }}
          >
            {selectedTags.map((tag) => {
              const accent = TAG_COLORS[tag] ?? undefined;
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => removeTag(tag)}
                  sx={{
                    fontWeight: 600,
                    ...(accent
                      ? {
                          bgcolor: accent,
                          color: '#fff',
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                          '& .MuiChip-deleteIcon:hover': { color: '#fff' },
                        }
                      : {}),
                  }}
                />
              );
            })}
            {!atTagLimit && (
              <TextField
                size="small"
                variant="standard"
                placeholder="Add a tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.replace(/,/g, ''))}
                onKeyDown={handleTagInputKeyDown}
                slotProps={{
                  htmlInput: { maxLength: 30 },
                  input: { disableUnderline: true, sx: { fontSize: '0.875rem', py: 0.25 } },
                }}
                sx={{ flex: 1, minWidth: 80 }}
              />
            )}
          </Box>

          {/* Extra preset suggestions */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 1 }}>
            {EXTRA_PRESET_TAGS.map((tag) => {
              const isSelected = extraTags.includes(tag);
              const isDisabled = isSelected || atTagLimit;
              const accent = TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip
                  key={tag}
                  title={
                    isSelected
                      ? 'Already added'
                      : isDisabled
                        ? `Remove a tag first (max ${MAX_TAGS})`
                        : `Add "${tag}"`
                  }
                >
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      variant="outlined"
                      onClick={isDisabled ? undefined : () => addTag(tag)}
                      sx={{
                        cursor: isDisabled ? 'default' : 'pointer',
                        opacity: isDisabled ? 0.4 : 1,
                        transition: 'all 0.15s ease',
                        borderColor: `${accent}55`,
                        color: accent,
                        '&:hover': isDisabled
                          ? {}
                          : { bgcolor: `${accent}18`, borderColor: accent },
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Stack>
        </Box>

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
        >
          {loading ? (isEditMode ? 'Updating…' : 'Publishing…') : isEditMode ? 'Update' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
