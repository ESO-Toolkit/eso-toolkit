import { Add as AddIcon, PublishRounded } from '@mui/icons-material';
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
const EXTRA_PRESET_TAGS = ['trainer', 'score-push', 'farm'] as const;

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
  const [addingCustom, setAddingCustom] = React.useState(false);
  const customInputRef = React.useRef<HTMLInputElement>(null);
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
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
          backgroundColor: 'transparent',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 8px 30px rgba(0,0,0,0.25)'
            : '0 4px 12px rgba(15,23,42,0.06)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          px: { xs: 2.5, sm: 3 },
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
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
          '&&': { pt: 3 },
          pb: 2.5,
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
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

          {/* ── Unified chip flow: difficulty toggle → presets → selected → +custom ── */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            {/* ── Segmented difficulty toggle ── */}
            {(() => {
              const cNorm = TAG_COLORS.normal;
              const cVet = TAG_COLORS.vet;
              const cHm = TAG_COLORS.hm;
              const segBtn = (
                label: string,
                isActive: boolean,
                color: string,
                onClick: () => void,
                pos: 'left' | 'mid' | 'right' | 'solo',
              ) => {
                const radiusMap = {
                  left: '20px 0 0 20px',
                  mid: '0',
                  right: '0 20px 20px 0',
                  solo: '20px',
                };
                return (
                  <Box
                    key={label}
                    onClick={onClick}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      borderRadius: radiusMap[pos],
                      position: 'relative',
                      zIndex: isActive ? 2 : 1,
                      userSelect: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: isActive ? color : isDark ? `${color}90` : `${color}80`,
                      background: isActive
                        ? `linear-gradient(135deg, ${color}35 0%, ${color}20 50%, ${color}10 100%)`
                        : 'transparent',
                      boxShadow: isActive
                        ? isDark
                          ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                          : `0 0 8px ${color}18`
                        : 'none',
                      textShadow: isActive && isDark ? `0 0 12px ${color}50` : 'none',
                      '&:hover': {
                        color,
                        background: isActive
                          ? `linear-gradient(135deg, ${color}40 0%, ${color}25 50%, ${color}14 100%)`
                          : `linear-gradient(135deg, ${color}18 0%, ${color}0a 100%)`,
                        ...(isActive
                          ? {
                              boxShadow: isDark
                                ? `0 0 20px ${color}35, inset 0 1px 0 rgba(255,255,255,0.15)`
                                : `0 0 12px ${color}25`,
                            }
                          : {}),
                      },
                    }}
                  >
                    {label}
                  </Box>
                );
              };
              const showHm = difficulty === 'vet';
              return (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 30,
                    borderRadius: '20px',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)',
                    backdropFilter: 'blur(8px)',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                      : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {segBtn('Normal', difficulty === 'normal', cNorm, () => handleDifficultyChange('normal'), 'left')}
                  {/* Divider line */}
                  <Box
                    sx={{
                      width: '1px',
                      height: 16,
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
                  />
                  {segBtn('Veteran', difficulty === 'vet', cVet, () => handleDifficultyChange('vet'), showHm ? 'mid' : 'right')}
                  {showHm && (
                    <>
                      <Box
                        sx={{
                          width: '1px',
                          height: 16,
                          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          flexShrink: 0,
                        }}
                      />
                      {segBtn('HM', hmEnabled, cHm, () => setHmEnabled((prev) => !prev), 'right')}
                    </>
                  )}
                </Box>
              );
            })()}

            {/* Divider dot */}
            <Box
              sx={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              }}
            />

            {/* Preset tag suggestions (not yet selected) */}
            {EXTRA_PRESET_TAGS.filter((tag) => !extraTags.includes(tag)).map((tag) => {
              const isDisabled = atTagLimit;
              const c = TAG_COLORS[tag] ?? '#888';
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={isDisabled ? undefined : () => addTag(tag)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 26,
                    borderRadius: '28px',
                    cursor: isDisabled ? 'default' : 'pointer',
                    opacity: isDisabled ? 0.3 : 1,
                    transition: 'all 0.3s ease',
                    background: isDark
                      ? `linear-gradient(135deg, ${c}12 0%, ${c}08 100%)`
                      : `linear-gradient(135deg, ${c}0a 0%, ${c}05 100%)`,
                    border: `1px solid ${c}30`,
                    color: c,
                    backdropFilter: 'blur(6px)',
                    '& .MuiChip-label': { opacity: 0.7 },
                    '&:hover': isDisabled
                      ? {}
                      : {
                          background: isDark
                            ? `linear-gradient(135deg, ${c}28 0%, ${c}18 100%)`
                            : `linear-gradient(135deg, ${c}1a 0%, ${c}0d 100%)`,
                          borderColor: `${c}55`,
                          boxShadow: `0 2px 8px ${c}1a`,
                          transform: 'translateY(-1px)',
                          '& .MuiChip-label': { opacity: 1 },
                        },
                  }}
                />
              );
            })}

            {/* "+ Custom" chip / inline input */}
            {!atTagLimit &&
              (addingCustom ? (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 26,
                    borderRadius: '28px',
                    border: isDark
                      ? '1px solid rgba(56, 189, 248, 0.4)'
                      : '1px solid rgba(56, 189, 248, 0.5)',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.03) 100%)',
                    boxShadow: isDark
                      ? '0 0 12px rgba(56,189,248,0.15)'
                      : '0 0 8px rgba(56,189,248,0.1)',
                    px: 1.25,
                    gap: 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <AddIcon sx={{ fontSize: 14, color: accent, opacity: 0.6 }} />
                  <input
                    ref={customInputRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.replace(/,/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag(tagInput);
                        setTagInput('');
                      } else if (e.key === 'Escape') {
                        setTagInput('');
                        setAddingCustom(false);
                      }
                    }}
                    onBlur={() => {
                      if (tagInput.trim()) {
                        addTag(tagInput);
                      }
                      setTagInput('');
                      setAddingCustom(false);
                    }}
                    placeholder="type & enter"
                    maxLength={30}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: isDark ? '#e5e7eb' : '#1e293b',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      width: 90,
                      fontFamily: 'inherit',
                    }}
                  />
                </Box>
              ) : (
                <Chip
                  icon={<AddIcon sx={{ fontSize: 15 }} />}
                  label="Custom"
                  size="small"
                  onClick={() => {
                    setAddingCustom(true);
                    setTimeout(() => customInputRef.current?.focus(), 0);
                  }}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 26,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 100%)',
                    border: isDark
                      ? '1px dashed rgba(56,189,248,0.3)'
                      : '1px dashed rgba(56,189,248,0.35)',
                    color: isDark ? 'rgba(56,189,248,0.7)' : 'rgba(56,189,248,0.8)',
                    '& .MuiChip-icon': {
                      color: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.6)',
                    },
                    '&:hover': {
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.20) 0%, rgba(56,189,248,0.10) 100%)'
                        : 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.06) 100%)',
                      borderColor: isDark ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.6)',
                      color: accent,
                      boxShadow: '0 2px 8px rgba(56,189,248,0.15)',
                      transform: 'translateY(-1px)',
                      '& .MuiChip-icon': { color: accent },
                    },
                  }}
                />
              ))}
          </Box>

          {/* ── Selected tags (removable) ── */}
          {selectedTags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {selectedTags.map((tag) => {
                const c = TAG_COLORS[tag] ?? (isDark ? '#94a3b8' : '#64748b');
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => removeTag(tag)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 26,
                      borderRadius: '28px',
                      background: `linear-gradient(135deg, ${c}40 0%, ${c}26 50%, ${c}14 100%)`,
                      border: `1px solid ${c}4d`,
                      color: c,
                      boxShadow: isDark
                        ? `0 2px 8px ${c}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                        : `0 1px 4px ${c}20`,
                      '& .MuiChip-label': {
                        textShadow: isDark ? `0 0 8px ${c}40` : 'none',
                      },
                      '& .MuiChip-deleteIcon': {
                        color: `${c}80`,
                        '&:hover': { color: c },
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
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
          borderTop: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
          background: 'transparent',
          color: isDark ? '#e5e7eb' : '#1e293b',
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
