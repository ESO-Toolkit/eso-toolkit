/**
 * Server picker dialog for publishing rosters to Discord.
 *
 * Shows a list of mutual servers (where both the user and the bot are members)
 * filtered to those where the user has MANAGE_GUILD permission.
 *
 * Replaces the manual guild ID input with proper Discord OAuth2 flow.
 */

import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import discordIcon from '../../../assets/discord-icon.svg';
import {
  getBotInviteUrl,
  getMutualGuildsFromApi,
  getGuildIconUrl,
  DiscordAuthExpiredError,
} from '../../auth/discord-auth';
import { useDiscordAuth } from '../../auth/DiscordAuthContext';
import type { HubRoster } from '../types/roster-hub.types';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

interface ServerPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** For hub rosters — publish by roster ID */
  roster?: HubRoster | null;
  /** For local rosters — publish directly with raw data */
  title?: string;
  description?: string;
  trialId?: string;
  rosterData?: string;
  authorName?: string;
}

export const ServerPickerDialog: React.FC<ServerPickerDialogProps> = ({
  open,
  onClose,
  onSuccess,
  roster,
  title,
  description,
  trialId,
  rosterData,
  authorName,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { discordToken, isDiscordAuthed, startDiscordLogin, clearDiscordAuth } = useDiscordAuth();

  const [guilds, setGuilds] = React.useState<
    { id: string; name: string; icon: string | null }[] | null
  >(null);
  const [selectedGuildId, setSelectedGuildId] = React.useState<string | null>(null);
  const [channelName, setChannelName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const displayTitle = roster?.title ?? title ?? 'Untitled Roster';
  const displayDesc = roster?.description ?? description;

  // Fetch guilds when dialog opens and user is authed
  React.useEffect(() => {
    if (!open || !isDiscordAuthed || !discordToken) {
      setGuilds(null);
      setSelectedGuildId(null);
      setChannelName('');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const mutual = await getMutualGuildsFromApi(discordToken);
        setGuilds(mutual);
      } catch (err) {
        if (err instanceof DiscordAuthExpiredError) {
          clearDiscordAuth();
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load servers');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, isDiscordAuthed, discordToken, clearDiscordAuth]);

  const handlePublish = async (): Promise<void> => {
    if (!selectedGuildId) return;

    setPublishing(true);
    setError(null);

    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      if (roster) {
        // Hub roster — publish by ID
        endpoint = `${DISCORD_BOT_API_URL}/discord/roster/publish`;
        body = {
          guildId: selectedGuildId,
          rosterId: roster.id,
          channelNameOverride: channelName.trim() || undefined,
        };
      } else {
        // Local roster — publish directly
        endpoint = `${DISCORD_BOT_API_URL}/discord/roster/publish-direct`;
        body = {
          guildId: selectedGuildId,
          title: title ?? 'Untitled',
          description: description ?? '',
          trial_id: trialId ?? '',
          roster_data: rosterData ?? '',
          author_name: authorName ?? 'Unknown',
          channelNameOverride: channelName.trim() || undefined,
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (discordToken) {
        headers['Authorization'] = `Bearer ${discordToken}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const isCloseable = !publishing;

  return (
    <Dialog
      open={open}
      onClose={isCloseable ? onClose : undefined}
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
            border: isDark ? '1px solid rgba(88,101,242,0.2)' : '1px solid rgba(88,101,242,0.15)',
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
        {/* Roster preview */}
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{displayTitle}</Typography>
          {displayDesc && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {displayDesc}
            </Typography>
          )}
        </Box>

        {/* Not connected — show Connect button */}
        {!isDiscordAuthed && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect your Discord account to see your servers.
            </Typography>
            <Button
              variant="contained"
              onClick={() => startDiscordLogin()}
              startIcon={
                <img
                  src={discordIcon}
                  alt=""
                  style={{ width: 18, height: 18, filter: 'brightness(10)' }}
                />
              }
              sx={{
                background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                },
              }}
            >
              Connect Discord
            </Button>
          </Box>
        )}

        {/* Loading guilds */}
        {isDiscordAuthed && loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {/* Guild list */}
        {isDiscordAuthed && !loading && guilds !== null && (
          <>
            {guilds.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  The ESO Toolkit bot isn&apos;t in any of your servers yet.
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                  Select a server:
                </Typography>
                <List
                  sx={{
                    maxHeight: 240,
                    overflow: 'auto',
                    borderRadius: 2,
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.08)',
                    p: 0.5,
                  }}
                >
                  {guilds.map((guild) => (
                    <ListItemButton
                      key={guild.id}
                      selected={selectedGuildId === guild.id}
                      onClick={() => setSelectedGuildId(guild.id)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.5,
                        '&.Mui-selected': {
                          background: isDark ? 'rgba(88,101,242,0.15)' : 'rgba(88,101,242,0.1)',
                          border: '1px solid rgba(88,101,242,0.3)',
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar
                          src={getGuildIconUrl(guild.id, guild.icon) ?? undefined}
                          sx={{ width: 32, height: 32, fontSize: '0.8rem' }}
                        >
                          {guild.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={guild.name}
                        primaryTypographyProps={{
                          fontSize: '0.88rem',
                          fontWeight: selectedGuildId === guild.id ? 700 : 500,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>

                <TextField
                  label="Channel name (optional)"
                  placeholder="Leave blank to use roster title"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                  helperText="Override the auto-generated channel name"
                />
              </>
            )}

            {/* Always show "Add Bot" link so users can add the bot to more servers */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                href={getBotInviteUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                {guilds.length === 0 ? 'Add Bot to Server' : 'Add Bot to Another Server'}
              </Button>
            </Box>
          </>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={!isCloseable}>
          Cancel
        </Button>
        {isDiscordAuthed && guilds && guilds.length > 0 && (
          <Button
            variant="contained"
            onClick={() => void handlePublish()}
            disabled={publishing || !selectedGuildId}
            startIcon={
              publishing ? (
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
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
