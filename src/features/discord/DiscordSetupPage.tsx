/**
 * Discord server setup page.
 *
 * Admins land here after installing the bot via OAuth2.
 * Shows channel + role pickers to configure where rosters post.
 * Also accessible directly to edit existing config.
 */

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Typography,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

import { discordApi, buildBotInstallUrl } from './discord-api';
import type { GuildChannel, GuildRole } from './discord-api';

const DiscordSetupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { accessToken, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState('');
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle OAuth redirect — exchange code + extract guild_id
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const gid = searchParams.get('guild_id');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Discord authorization was denied: ${errorParam}`);
      setLoading(false);
      return;
    }

    if (!gid) {
      setError('No server ID received. Please use the "Add Bot" button to install.');
      setLoading(false);
      return;
    }

    setGuildId(gid);

    if (!accessToken) {
      setError('You must be logged in to configure the bot.');
      setLoading(false);
      return;
    }

    // If we have a code, link Discord account first
    const linkPromise = code
      ? discordApi.link(code, `${window.location.origin}/discord/setup`, accessToken).catch(() => {
          /* ignore — may already be linked */
        })
      : Promise.resolve();

    // Then load guild data
    const doLoad = async (id: string): Promise<void> => {
      setLoading(true);
      try {
        const [channelsRes, rolesRes, configRes] = await Promise.all([
          discordApi.getGuildChannels(id, accessToken),
          discordApi.getGuildRoles(id, accessToken),
          discordApi.getGuildConfig(id, accessToken),
        ]);

        setChannels(channelsRes.channels);
        setRoles(rolesRes.roles);

        if (configRes.configured) {
          setSelectedChannel(configRes.roster_channel_id ?? '');
          setSelectedRole(configRes.allowed_role_ids?.[0] ?? '');
          setGuildName(configRes.guild_name ?? '');
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load server data. Make sure the bot is installed.',
        );
      } finally {
        setLoading(false);
      }
    };

    linkPromise.then(() => doLoad(gid));
  }, [searchParams, accessToken]);

  const handleSave = async (): Promise<void> => {
    if (!guildId || !selectedChannel || !accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const result = await discordApi.setupGuild(
        guildId,
        selectedChannel,
        selectedRole || undefined,
        accessToken,
      );
      setGuildName(result.guild_name);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBot = (): void => {
    const state = globalThis.crypto.randomUUID();
    sessionStorage.setItem('discord_oauth_state', state);
    const url = buildBotInstallUrl(state);
    if (url) window.location.href = url;
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Discord Bot Setup
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Please log in first to configure the roster bot.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', mt: 6, px: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        🤖 Roster Bot Setup
      </Typography>

      {!guildId && !loading && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Add the ESO Toolkit roster bot to your Discord server. Members will be able to publish
            rosters from the web app directly to your chosen channel.
          </Typography>
          <Button variant="contained" size="large" onClick={handleAddBot}>
            Add Bot to Server
          </Button>
        </Paper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading server data…</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          ✅ {guildName || 'Server'} configured! Members can now post rosters from the publish
          dialog.
        </Alert>
      )}

      {guildId && !loading && channels.length > 0 && (
        <Paper sx={{ p: 3, mt: 2 }}>
          {guildName && (
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Configuring: {guildName}
            </Typography>
          )}

          <FormControl fullWidth sx={{ mb: 2.5 }}>
            <InputLabel>Roster Channel</InputLabel>
            <Select
              value={selectedChannel}
              onChange={(e: SelectChangeEvent) => setSelectedChannel(e.target.value)}
              label="Roster Channel"
            >
              {channels.map((ch) => (
                <MenuItem key={ch.id} value={ch.id}>
                  # {ch.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Published rosters will be posted to this channel.
            </Typography>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2.5 }}>
            <InputLabel>Required Role (optional)</InputLabel>
            <Select
              value={selectedRole}
              onChange={(e: SelectChangeEvent) => setSelectedRole(e.target.value)}
              label="Required Role (optional)"
            >
              <MenuItem value="">
                <em>Everyone can post</em>
              </MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  @{r.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Only members with this role can post rosters. Leave empty to allow everyone.
            </Typography>
          </FormControl>

          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={!selectedChannel || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            fullWidth
          >
            {saving ? 'Saving…' : success ? 'Update Configuration' : 'Save Configuration'}
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/roster-builder')}
            sx={{ mt: 1.5, display: 'block', mx: 'auto' }}
          >
            Go to Roster Builder
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export { DiscordSetupPage };
