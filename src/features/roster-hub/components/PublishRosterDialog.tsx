import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import { rosterHubApi } from '../api/roster-hub-api';
import { PRESET_TAGS, TAG_COLORS } from '../types/roster-hub.types';

interface PublishRosterDialogProps {
  open: boolean;
  rosterData: string; // compact encoded roster from encodeRosterToURL
  onClose: () => void;
  onPublished: () => void;
  token: string;
}

const HUB_TRIALS = TRIALS.filter((t) => t.id !== 'GEN');
const MAX_TAGS = 5;

export const PublishRosterDialog: React.FC<PublishRosterDialogProps> = ({
  open,
  rosterData,
  onClose,
  onPublished,
  token,
}) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [trialId, setTrialId] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleTrialChange = (e: SelectChangeEvent): void => {
    setTrialId(e.target.value);
  };

  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < MAX_TAGS) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    // silently ignore when at limit — tooltip will communicate the constraint
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
      await rosterHubApi.create(
        {
          title: title.trim(),
          description: description.trim(),
          trial_id: trialId,
          roster_data: rosterData,
          tags: selectedTags,
        },
        token,
      );
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
      setTrialId('');
      setSelectedTags([]);
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
      <DialogTitle>Publish to Roster Hub</DialogTitle>
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

        <div>
          <Typography variant="caption" color={atTagLimit ? 'warning.main' : 'text.secondary'} gutterBottom display="block">
            Tags ({selectedTags.length}/{MAX_TAGS}){atTagLimit ? ' — limit reached' : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = !isSelected && atTagLimit;
              const accent = TAG_COLORS[tag] ?? '#888';
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
