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
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { buildHubApi } from '../api/build-hub-api';
import type { PublishBuildPayload } from '../types/build-hub.types';
import { BUILD_TAG_COLORS, PRESET_BUILD_TAGS } from '../types/build-hub.types';

interface PublishBuildDialogProps {
  open: boolean;
  buildData: string; // compact encoded build from encodeBuildToURL
  esoClass: string;
  role: string;
  gameMode: string;
  onClose: () => void;
  onPublished: () => void;
  token: string;
}

const MAX_TAGS = 5;

export const PublishBuildDialog: React.FC<PublishBuildDialogProps> = ({
  open,
  buildData,
  esoClass,
  role,
  gameMode,
  onClose,
  onPublished,
  token,
}) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
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
      const payload: PublishBuildPayload = {
        title: title.trim(),
        description: description.trim(),
        eso_class: esoClass,
        role,
        game_mode: gameMode,
        build_data: buildData,
        tags: selectedTags,
        is_anonymous: isAnonymous,
      };
      await buildHubApi.create(payload, token);
      onPublished();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setSelectedTags([]);
      setIsAnonymous(false);
      setError(null);
    }
  }, [open]);

  const atTagLimit = selectedTags.length >= MAX_TAGS;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>Publish to Build Hub</DialogTitle>
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
            color={atTagLimit ? 'warning.main' : 'text.secondary'}
            gutterBottom
            display="block"
          >
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
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
                      role="checkbox"
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
          {loading ? 'Publishing…' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
