import {
  Button,
  Chip,
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
  Typography,
} from '@mui/material';
import React from 'react';

import { TRIALS } from '../../loadout-manager/data/trialConfigs';
import { rosterHubApi } from '../api/roster-hub-api';
import { PRESET_TAGS } from '../types/roster-hub.types';

interface PublishRosterDialogProps {
  open: boolean;
  rosterData: string; // compact encoded roster from encodeRosterToURL
  onClose: () => void;
  onPublished: () => void;
  token: string;
}

const HUB_TRIALS = TRIALS.filter((t) => t.id !== 'GEN');

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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5),
    );
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Publish to Roster Hub</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          inputProps={{ maxLength: 100 }}
          helperText={`${title.length}/100`}
          required
          fullWidth
          size="small"
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText={`${description.length}/500`}
          multiline
          rows={3}
          fullWidth
          size="small"
        />

        <FormControl size="small" required fullWidth>
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
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Tags (up to 5)
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
            {PRESET_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => handleTagToggle(tag)}
                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </div>

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={() => void handlePublish()} variant="contained" disabled={loading}>
          {loading ? 'Publishing…' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
