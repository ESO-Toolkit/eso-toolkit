import { PublishRounded } from '@mui/icons-material';
import {
  Alert,
  alpha,
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
  useTheme,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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

  // ── Panel tokens (matching PlayerCardModal info modal) ──────────────
  const accent = '#38bdf8';

  const panelBorder = isDark
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(0, 0, 0, 0.08)';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: 13,
      borderRadius: '10px',
      transition: 'border-color 0.2s ease',
      '& fieldset': {
        borderColor: isDark ? 'rgb(31, 41, 55)' : 'rgba(0, 0, 0, 0.12)',
      },
      '&:hover fieldset': {
        borderColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(0, 0, 0, 0.25)',
      },
      '&.Mui-focused fieldset': {
        borderColor: accent,
        borderWidth: 2,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(accent, 0.15)}`,
      },
    },
    '& .MuiInputLabel-root': { fontSize: 13 },
    '& .MuiFormHelperText-root': { fontSize: 11, opacity: 0.6 },
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
      className="glass-dialog"
      PaperProps={{
        sx: {
          background: isDark
            ? 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: panelBorder,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          px: { xs: 2.5, sm: 3 },
          borderBottom: panelBorder,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
              border: `1px solid ${isDark ? alpha(accent, 0.2) : alpha(accent, 0.15)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PublishRounded sx={{ fontSize: 20, color: accent }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
              {isEditMode ? 'Edit Published Roster' : 'Publish to Roster Hub'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {isEditMode
                ? 'Update your roster details below'
                : 'Share your roster with the community'}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          px: { xs: 2.5, sm: 3 },
          py: 2.5,
        }}
      >
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
          sx={inputSx}
        />

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
          sx={inputSx}
        />

        <FormControl size="small" required fullWidth error={!!error && !trialId} sx={inputSx}>
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

        {/* ── Tags Section ──────────────────────────────────────────────── */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: atTagLimit ? 'warning.main' : 'text.secondary',
              display: 'block',
              mb: 1,
            }}
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>

          {/* Difficulty toggle group */}
          <Stack direction="row" spacing={0.75}>
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
                      fontSize: '0.75rem',
                      height: 28,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      ...(isActive
                        ? {
                            bgcolor: accent,
                            color: '#fff',
                            borderColor: accent,
                            boxShadow: `0 0 12px ${accent}40`,
                            '&:hover': { bgcolor: accent, filter: 'brightness(0.85)' },
                          }
                        : {
                            borderColor: `${accent}44`,
                            color: accent,
                            backdropFilter: 'blur(6px)',
                            '&:hover': { bgcolor: `${accent}15`, borderColor: `${accent}88` },
                          }),
                      ...(d === 'vet' && isActive
                        ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                        : {}),
                    }}
                  />
                  {d === 'vet' && isActive && (
                    <Chip
                      label="HM"
                      size="small"
                      variant={hmEnabled ? 'filled' : 'outlined'}
                      onClick={() => setHmEnabled((prev) => !prev)}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 28,
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
                              boxShadow: `0 0 12px ${TAG_COLORS.hm}40`,
                              '&:hover': { bgcolor: TAG_COLORS.hm, filter: 'brightness(0.85)' },
                            }
                          : {
                              borderColor: `${TAG_COLORS.hm}44`,
                              color: TAG_COLORS.hm,
                              '&:hover': {
                                bgcolor: `${TAG_COLORS.hm}15`,
                                borderColor: `${TAG_COLORS.hm}88`,
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
              p: 0.75,
              mt: 1,
              borderRadius: '8px',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
              minHeight: 36,
              transition: 'border-color 0.2s ease',
              '&:focus-within': {
                borderColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(56,189,248,0.5)',
              },
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
                    fontSize: '0.7rem',
                    height: 24,
                    ...(accent
                      ? {
                          bgcolor: `${accent}cc`,
                          color: '#fff',
                          boxShadow: `0 0 8px ${accent}30`,
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.65)' },
                          '& .MuiChip-deleteIcon:hover': { color: '#fff' },
                        }
                      : {
                          bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }),
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
                  input: {
                    disableUnderline: true,
                    sx: {
                      fontSize: '0.8rem',
                      py: 0.25,
                      color: isDark ? 'rgba(255,255,255,0.7)' : undefined,
                    },
                  },
                }}
                sx={{ flex: 1, minWidth: 80 }}
              />
            )}
          </Box>

          {/* Extra preset suggestions */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.75 }}>
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
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 22,
                        cursor: isDisabled ? 'default' : 'pointer',
                        opacity: isDisabled ? 0.35 : 1,
                        transition: 'all 0.15s ease',
                        borderColor: `${accent}44`,
                        color: accent,
                        backdropFilter: 'blur(4px)',
                        '&:hover': isDisabled
                          ? {}
                          : { bgcolor: `${accent}15`, borderColor: `${accent}88` },
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
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
              Publish anonymously
            </Typography>
          }
          sx={{ mt: -0.5, ml: 0.5 }}
        />

        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              borderRadius: '10px',
              bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              '& .MuiAlert-icon': { color: '#ef4444' },
            }}
          >
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 1.5,
          borderTop: panelBorder,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: 'text.secondary',
            fontSize: '0.82rem',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handlePublish()}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.82rem',
            px: 2.5,
            background: `linear-gradient(135deg, ${accent} 0%, #2563eb 100%)`,
            boxShadow: `0 4px 12px ${alpha(accent, 0.2)}`,
            '&:hover': {
              background: `linear-gradient(135deg, #5cc8f9 0%, #3b82f6 100%)`,
              boxShadow: `0 6px 16px ${alpha(accent, 0.3)}`,
            },
            '&.Mui-disabled': {
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          }}
        >
          {loading ? (isEditMode ? 'Updating…' : 'Publishing…') : isEditMode ? 'Update' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
