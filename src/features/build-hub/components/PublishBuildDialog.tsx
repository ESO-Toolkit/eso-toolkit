import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { decodeBuildFromURL, encodeBuildToURL } from '../../../utils/buildEncoding';
import { buildHubApi } from '../api/build-hub-api';
import type { HubBuild, HubBuildVisibility, PublishBuildPayload } from '../types/build-hub.types';
import { BUILD_TAG_COLORS, PRESET_BUILD_TAGS } from '../types/build-hub.types';

const VISIBILITY_OPTIONS: ReadonlyArray<{
  id: HubBuildVisibility;
  label: string;
  description: string;
}> = [
  { id: 'public', label: 'Public', description: 'Visible to everyone in the Build Hub' },
  {
    id: 'link-only',
    label: 'Link Only',
    description: 'Hidden from the Hub — only people with the direct link can view',
  },
  { id: 'private', label: 'Private', description: 'Only you can view it' },
];

interface PublishBuildDialogProps {
  open: boolean;
  buildData: string; // compact encoded build from encodeBuildToURL
  esoClass: string;
  role: string;
  gameMode: string;
  /** The build's current visibility choice (from build.settings.visibility). */
  visibility?: HubBuildVisibility;
  onClose: () => void;
  onPublished: () => void;
  token: string;
  /** When provided, the dialog operates in edit mode — updates the existing hub build. */
  editingBuild?: HubBuild;
}

const MAX_TAGS = 5;

export const PublishBuildDialog: React.FC<PublishBuildDialogProps> = ({
  open,
  buildData,
  esoClass,
  role,
  gameMode,
  visibility = 'public',
  onClose,
  onPublished,
  token,
  editingBuild,
}) => {
  const isEditMode = !!editingBuild;
  const isDark = useTheme().palette.mode === 'dark';
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [selectedVisibility, setSelectedVisibility] = React.useState<HubBuildVisibility>('public');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handlePublish = async (): Promise<void> => {
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The encoded blob also embeds settings.visibility (as `vs`). If the user
      // changed visibility in this dialog, re-encode so the blob matches the
      // selected value — otherwise client-side share gating that reads the
      // decoded build would act on a stale visibility (e.g. treat a now-private
      // build as shareable). Fall back to the original blob if re-encode fails.
      let syncedBuildData = buildData;
      try {
        const decoded = await decodeBuildFromURL(buildData);
        if (decoded && decoded.settings.visibility !== selectedVisibility) {
          const reencoded = await encodeBuildToURL({
            ...decoded,
            settings: { ...decoded.settings, visibility: selectedVisibility },
          });
          if (reencoded) syncedBuildData = reencoded;
        }
      } catch {
        /* keep original blob; server `visibility` metadata is still authoritative */
      }

      const payload: PublishBuildPayload = {
        title: title.trim(),
        description: description.trim(),
        eso_class: esoClass,
        role,
        game_mode: gameMode,
        build_data: syncedBuildData,
        visibility: selectedVisibility,
        tags: selectedTags,
        is_anonymous: isAnonymous,
      };
      if (isEditMode) {
        await buildHubApi.update(editingBuild.id, payload, token);
      } else {
        await buildHubApi.create(payload, token);
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
      if (editingBuild) {
        setTitle(editingBuild.title);
        setDescription(editingBuild.description ?? '');
        setSelectedTags(editingBuild.tags ?? []);
        setIsAnonymous(editingBuild.is_anonymous ?? false);
        setSelectedVisibility(editingBuild.visibility ?? visibility);
      } else {
        setTitle('');
        setDescription('');
        setSelectedTags([]);
        setIsAnonymous(false);
        setSelectedVisibility(visibility);
      }
      setError(null);
    }
  }, [open, editingBuild, visibility]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      className="glass-dialog"
      slotProps={{
        paper: {
          sx: {
            background: isDark
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
            backgroundColor: 'transparent',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
            maxHeight: '90vh',
          },
        },
      }}
    >
      <DialogTitle>{isEditMode ? 'Edit Published Build' : 'Publish to Build Hub'}</DialogTitle>
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

        <div>
          <Typography
            variant="caption"
            gutterBottom
            sx={{ color: atTagLimit ? 'warning.main' : 'text.secondary', display: 'block' }}
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {PRESET_BUILD_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = BUILD_TAG_COLORS[tag] ?? '#888';
              return (
                <Tooltip key={tag} title={isDisabled ? `Remove a tag first (max ${MAX_TAGS})` : ''}>
                  <span>
                    <Chip
                      label={tag}
                      size="small"
                      onClick={isDisabled ? undefined : () => handleTagToggle(tag)}
                      variant={isSelected ? 'filled' : 'outlined'}
                      aria-pressed={isSelected}
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
        </div>

        <div>
          <Typography
            variant="caption"
            gutterBottom
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            Visibility
          </Typography>
          <ToggleButtonGroup
            value={selectedVisibility}
            exclusive
            size="small"
            onChange={(_e, val) => {
              if (val) setSelectedVisibility(val as HubBuildVisibility);
            }}
            aria-label="Build visibility"
            sx={{ mt: 0.5, flexWrap: 'wrap' }}
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.id}
                value={opt.id}
                aria-label={`${opt.label}: ${opt.description}`}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
            {VISIBILITY_OPTIONS.find((o) => o.id === selectedVisibility)?.description}
          </Typography>
        </div>

        <FormControlLabel
          control={
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
