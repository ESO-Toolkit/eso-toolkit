import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import discordIcon from '../../../assets/discord-icon.svg';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

interface DiscordPublishDirectDialogProps {
  open: boolean;
  title: string;
  description?: string;
  trialId: string;
  rosterData: string;
  authorName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DiscordPublishDirectDialog: React.FC<DiscordPublishDirectDialogProps> = ({
  open,
  title,
  description,
  trialId,
  rosterData,
  authorName,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [guildId, setGuildId] = React.useState('');
  const [channelName, setChannelName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setChannelName('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handlePublish = async (): Promise<void> => {
    if (!guildId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${DISCORD_BOT_API_URL}/discord/roster/publish-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId.trim(),
          title,
          description: description || '',
          trial_id: trialId,
          roster_data: rosterData,
          author_name: authorName || 'Unknown',
          channelNameOverride: channelName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish to Discord');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(20,25,45,0.95) 0%, rgba(15,18,35,0.98) 100%)'
              : 'rgba(255,255,255,0.97)',
            border: isDark
              ? '1px solid rgba(88,101,242,0.2)'
              : '1px solid rgba(88,101,242,0.15)',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.08) 100%)',
            border: '1px solid rgba(88,101,242,0.25)',
          }}
        >
          <img src={discordIcon} alt="" style={{ width: 20, height: 20 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Publish to Discord</Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        <Box
          sx={{
            mb: 2.5,
            p: 1.5,
            borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{title || 'Untitled Roster'}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a Discord channel with a rich roster embed featuring role sections, build links,
          and sign-up buttons.
        </Typography>

        <TextField
          label="Discord Server ID"
          placeholder="Right-click server → Copy Server ID"
          value={guildId}
          onChange={(e) => setGuildId(e.target.value)}
          fullWidth
          required
          size="small"
          helperText="Enable Developer Mode in Discord settings to copy server IDs"
          sx={{ mb: 2 }}
        />

        <TextField
          label="Channel name (optional)"
          placeholder="Leave blank to use roster title"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          fullWidth
          size="small"
          helperText="Override the auto-generated channel name"
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handlePublish()}
          disabled={loading || !guildId.trim()}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <img
                src={discordIcon}
                alt=""
                style={{ width: 16, height: 16, filter: 'brightness(10)' }}
              />
            )
          }
          sx={{
            background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
            },
          }}
        >
          {loading ? 'Publishing...' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
