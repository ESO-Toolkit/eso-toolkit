/**
 * Discord Server Configuration Page.
 *
 * Lets server admins configure the ESO Toolkit bot for their Discord server:
 * - Default posting channel
 * - Allowed roles for posting rosters
 * - Channel name pattern with template tokens
 * - Role pings (tank/healer/DD)
 */

import { ArrowBack, CheckCircle, Settings as SettingsIcon } from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import discordIcon from '../assets/discord-icon.svg';
import {
  getBotInviteUrl,
  getGuildIconUrl,
  getMutualGuildsFromApi,
  DiscordAuthExpiredError,
} from '../features/auth/discord-auth';
import { useDiscordAuth } from '../features/auth/DiscordAuthContext';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

// ── Types ──────────────────────────────────────────────────────────────────

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

interface ChannelInfo {
  id: string;
  name: string;
  type: number; // 0 = text, 4 = category
  parent_id?: string;
  position?: number;
}

interface RoleInfo {
  id: string;
  name: string;
  color: number;
}

interface GuildConfigData {
  guildId: string;
  namePattern: string;
  defaultChannelId?: string;
  defaultCategoryId?: string;
  allowedRoleIds?: string[];
  rolePingIds?: {
    tank?: string;
    healer?: string;
    dd?: string;
  };
}

// ── Token chips for channel name pattern ───────────────────────────────────

const NAME_TOKENS = [
  { token: '{label}', desc: 'Roster title' },
  { token: '{day-short}', desc: 'Day abbreviation (Mon, Tue, ...)' },
  { token: '{day-full}', desc: 'Full day name (Monday, ...)' },
  { token: '{time}', desc: 'Time (HH:MM)' },
  { token: '{tag}', desc: 'First tag on the roster' },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function roleColorToHex(color: number): string {
  if (color === 0) return '#99aab5'; // Discord default gray
  return `#${color.toString(16).padStart(6, '0')}`;
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DISCORD_BOT_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Component ──────────────────────────────────────────────────────────────

export const DiscordServerConfigPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPublish = searchParams.get('from') === 'publish';
  const { discordToken, isDiscordAuthed, startDiscordLogin, clearDiscordAuth } = useDiscordAuth();

  // Guild list state
  const [guilds, setGuilds] = useState<GuildInfo[] | null>(null);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [guildsError, setGuildsError] = useState<string | null>(null);

  // Selected guild state
  const [selectedGuild, setSelectedGuild] = useState<GuildInfo | null>(null);

  // Config data
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [config, setConfig] = useState<GuildConfigData | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Form state
  const [defaultChannelId, setDefaultChannelId] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [allowedRoleIds, setAllowedRoleIds] = useState<RoleInfo[]>([]);
  const [namePattern, setNamePattern] = useState('{label}');
  const [tankPingRole, setTankPingRole] = useState('');
  const [healerPingRole, setHealerPingRole] = useState('');
  const [ddPingRole, setDdPingRole] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Glassmorphism styles
  const cardSx = {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: isDark
      ? 'linear-gradient(135deg, rgba(20,25,45,0.95) 0%, rgba(15,18,35,0.98) 100%)'
      : 'rgba(255,255,255,0.97)',
    border: isDark ? '1px solid rgba(88,101,242,0.2)' : '1px solid rgba(88,101,242,0.15)',
    borderRadius: 3,
    p: 3,
  };

  const sectionSx = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
    borderRadius: 2,
    p: 2.5,
  };

  // Fetch guilds
  const loadGuilds = useCallback(async () => {
    if (!discordToken) return;
    setGuildsLoading(true);
    setGuildsError(null);
    try {
      const mutual = await getMutualGuildsFromApi(discordToken);
      setGuilds(mutual);
      // Auto-select guild from URL params
      const guildParam = searchParams.get('guild');
      if (guildParam) {
        const found = mutual.find((g) => g.id === guildParam);
        if (found) setSelectedGuild(found);
      }
    } catch (err) {
      if (err instanceof DiscordAuthExpiredError) {
        clearDiscordAuth();
      } else {
        setGuildsError(err instanceof Error ? err.message : 'Failed to load servers');
      }
    } finally {
      setGuildsLoading(false);
    }
  }, [discordToken, searchParams, clearDiscordAuth]);

  useEffect(() => {
    if (isDiscordAuthed) {
      void loadGuilds();
    }
  }, [isDiscordAuthed, loadGuilds]);

  // Fetch config when guild is selected
  useEffect(() => {
    if (!selectedGuild || !discordToken) return;

    setConfigLoading(true);
    setConfigError(null);

    void (async () => {
      try {
        const [channelsRes, rolesRes, configRes] = await Promise.all([
          apiFetch<{ channels: ChannelInfo[] }>(
            `/discord/guild/${selectedGuild.id}/channels`,
            discordToken,
          ),
          apiFetch<{ roles: RoleInfo[] }>(`/discord/guild/${selectedGuild.id}/roles`, discordToken),
          apiFetch<{ config: GuildConfigData }>(
            `/discord/guild/${selectedGuild.id}/config`,
            discordToken,
          ),
        ]);

        setChannels(channelsRes.channels);
        setRoles(rolesRes.roles);
        setConfig(configRes.config);

        // Populate form from config
        const cfg = configRes.config;
        setDefaultChannelId(cfg.defaultChannelId ?? '');
        setDefaultCategoryId(cfg.defaultCategoryId ?? '');
        setNamePattern(cfg.namePattern || '{label}');
        setTankPingRole(cfg.rolePingIds?.tank ?? '');
        setHealerPingRole(cfg.rolePingIds?.healer ?? '');
        setDdPingRole(cfg.rolePingIds?.dd ?? '');

        // Map allowed role IDs to role objects
        const allowedIds = cfg.allowedRoleIds ?? [];
        setAllowedRoleIds(rolesRes.roles.filter((r) => allowedIds.includes(r.id)));
      } catch (err) {
        setConfigError(err instanceof Error ? err.message : 'Failed to load server data');
      } finally {
        setConfigLoading(false);
      }
    })();
  }, [selectedGuild, discordToken]);

  // Save config
  const handleSave = async (): Promise<void> => {
    if (!selectedGuild || !discordToken) return;

    setSaving(true);
    setSaveError(null);

    try {
      const body: Record<string, unknown> = {
        defaultChannelId: defaultChannelId || undefined,
        defaultCategoryId: defaultCategoryId || undefined,
        namePattern,
        allowedRoleIds: allowedRoleIds.map((r) => r.id),
        rolePingIds: {
          tank: tankPingRole || undefined,
          healer: healerPingRole || undefined,
          dd: ddPingRole || undefined,
        },
      };

      await apiFetch(`/discord/guild/${selectedGuild.id}/config`, discordToken, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token: string): void => {
    setNamePattern((prev) => prev + token);
  };

  // Get text channels grouped by category
  const categories = channels.filter((c) => c.type === 4);
  const textChannels = channels.filter((c) => c.type === 0);

  // ── Render: Not authenticated ────────────────────────────────────────────

  if (!isDiscordAuthed) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ ...cardSx, textAlign: 'center', py: 6 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              background:
                'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.08) 100%)',
              border: '1px solid rgba(88,101,242,0.25)',
            }}
          >
            <img src={discordIcon} alt="" style={{ width: 36, height: 36 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Server Configuration
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Connect your Discord account to configure the bot for your servers.
          </Typography>
          <Button
            variant="contained"
            onClick={() => startDiscordLogin('/discord-server-config')}
            startIcon={
              <img
                src={discordIcon}
                alt=""
                style={{ width: 18, height: 18, filter: 'brightness(10)' }}
              />
            }
            sx={{
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)' },
              px: 4,
              py: 1.2,
            }}
          >
            Connect Discord
          </Button>
        </Paper>
      </Container>
    );
  }

  // ── Render: Guild list ───────────────────────────────────────────────────

  if (!selectedGuild) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.08) 100%)',
                border: '1px solid rgba(88,101,242,0.25)',
              }}
            >
              <SettingsIcon sx={{ color: '#5865F2', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Server Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a server to configure the ESO Toolkit bot
              </Typography>
            </Box>
          </Box>

          {guildsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} sx={{ color: '#5865F2' }} />
            </Box>
          )}

          {guildsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {guildsError}
            </Alert>
          )}

          {guilds && !guildsLoading && (
            <>
              {guilds.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    The ESO Toolkit bot isn&apos;t in any of your servers yet.
                  </Typography>
                  <Button
                    variant="contained"
                    href={getBotInviteUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                      },
                    }}
                  >
                    Add Bot to Server
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                    gap: 1.5,
                  }}
                >
                  {guilds.map((guild) => (
                    <Paper
                      key={guild.id}
                      onClick={() => setSelectedGuild(guild)}
                      sx={{
                        ...sectionSx,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'rgba(88,101,242,0.4)',
                          background: isDark ? 'rgba(88,101,242,0.08)' : 'rgba(88,101,242,0.04)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Avatar
                        src={getGuildIconUrl(guild.id, guild.icon) ?? undefined}
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: '1rem',
                          bgcolor: '#5865F2',
                        }}
                      >
                        {guild.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} noWrap>
                          {guild.name}
                        </Typography>
                      </Box>
                      <SettingsIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    </Paper>
                  ))}
                </Box>
              )}

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  size="small"
                  href={getBotInviteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderColor: 'rgba(88,101,242,0.3)', color: '#5865F2' }}
                >
                  Add Bot to Another Server
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    );
  }

  // ── Render: Config panel ─────────────────────────────────────────────────

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {fromPublish && (
        <Button
          size="small"
          startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
          onClick={() => navigate(-1)}
          sx={{ mb: 1.5, color: '#5865F2', fontSize: '0.8rem' }}
        >
          Back to publishing
        </Button>
      )}
      <Paper sx={cardSx}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Tooltip title="Back to servers">
            <IconButton
              onClick={() => {
                setSelectedGuild(null);
                setConfig(null);
                setConfigError(null);
              }}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <ArrowBack />
            </IconButton>
          </Tooltip>
          <Avatar
            src={getGuildIconUrl(selectedGuild.id, selectedGuild.icon) ?? undefined}
            sx={{ width: 36, height: 36, bgcolor: '#5865F2' }}
          >
            {selectedGuild.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              {selectedGuild.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bot Configuration
            </Typography>
          </Box>
        </Box>

        {configLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#5865F2' }} />
          </Box>
        )}

        {configError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {configError}
          </Alert>
        )}

        {config && !configLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Default Posting Channel */}
            <Box sx={sectionSx}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#5865F2' }}>
                Default Posting Channel
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5 }}
              >
                Rosters will be posted to this channel. Leave empty to create new channels
                automatically.
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Channel</InputLabel>
                <Select
                  value={defaultChannelId}
                  label="Channel"
                  onChange={(e: SelectChangeEvent) => setDefaultChannelId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Auto-create channels</em>
                  </MenuItem>
                  {categories.length > 0
                    ? categories.map((cat) => [
                        <MenuItem
                          key={`cat-${cat.id}`}
                          disabled
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            color: 'text.secondary',
                            opacity: '0.7 !important',
                            mt: 0.5,
                          }}
                        >
                          {cat.name}
                        </MenuItem>,
                        ...textChannels
                          .filter((ch) => ch.parent_id === cat.id)
                          .map((ch) => (
                            <MenuItem key={ch.id} value={ch.id} sx={{ pl: 3 }}>
                              # {ch.name}
                            </MenuItem>
                          )),
                      ])
                    : textChannels.map((ch) => (
                        <MenuItem key={ch.id} value={ch.id}>
                          # {ch.name}
                        </MenuItem>
                      ))}
                </Select>
              </FormControl>

              {/* Default category for auto-created channels */}
              {!defaultChannelId && (
                <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>Category for new channels</InputLabel>
                  <Select
                    value={defaultCategoryId}
                    label="Category for new channels"
                    onChange={(e: SelectChangeEvent) => setDefaultCategoryId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>No category</em>
                    </MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Allowed Roles */}
            <Box sx={sectionSx}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#5865F2' }}>
                Allowed Roles
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5 }}
              >
                Members with these roles can publish rosters. Leave empty for admin-only access.
              </Typography>
              <Autocomplete
                multiple
                size="small"
                options={roles}
                value={allowedRoleIds}
                onChange={(_e, value) => setAllowedRoleIds(value)}
                getOptionLabel={(r) => r.name}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderTags={(value, getTagProps) =>
                  value.map((r, idx) => (
                    <Chip
                      {...getTagProps({ index: idx })}
                      key={r.id}
                      label={r.name}
                      size="small"
                      sx={{
                        bgcolor: `${roleColorToHex(r.color)}22`,
                        color: roleColorToHex(r.color),
                        borderColor: `${roleColorToHex(r.color)}55`,
                        border: '1px solid',
                        fontWeight: 600,
                        '& .MuiChip-deleteIcon': {
                          color: `${roleColorToHex(r.color)}88`,
                          '&:hover': { color: roleColorToHex(r.color) },
                        },
                      }}
                    />
                  ))
                }
                renderOption={(props, r) => (
                  <li {...props} key={r.id}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: roleColorToHex(r.color),
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    {r.name}
                  </li>
                )}
                renderInput={(params) => <TextField {...params} placeholder="Select roles..." />}
              />
            </Box>

            {/* Channel Name Pattern */}
            {!defaultChannelId && (
              <Box sx={sectionSx}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#5865F2' }}>
                  Channel Name Pattern
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.5 }}
                >
                  Template for auto-created channel names. Click tokens to insert.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  placeholder="{label}"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {NAME_TOKENS.map((t) => (
                    <Tooltip key={t.token} title={t.desc}>
                      <Chip
                        label={t.token}
                        size="small"
                        onClick={() => insertToken(t.token)}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          bgcolor: isDark ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.08)',
                          color: '#5865F2',
                          border: '1px solid rgba(88,101,242,0.2)',
                          '&:hover': { bgcolor: 'rgba(88,101,242,0.2)' },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}

            {/* Role Pings */}
            <Box sx={sectionSx}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#5865F2' }}>
                Role Pings
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5 }}
              >
                Optional roles to @mention in posted rosters for sign-up notifications.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  { label: 'Tank', value: tankPingRole, setter: setTankPingRole },
                  { label: 'Healer', value: healerPingRole, setter: setHealerPingRole },
                  { label: 'DD', value: ddPingRole, setter: setDdPingRole },
                ].map((ping) => (
                  <FormControl key={ping.label} fullWidth size="small">
                    <InputLabel>{ping.label} Ping Role</InputLabel>
                    <Select
                      value={ping.value}
                      label={`${ping.label} Ping Role`}
                      onChange={(e: SelectChangeEvent) => ping.setter(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          <Box
                            component="span"
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: roleColorToHex(r.color),
                              display: 'inline-block',
                              mr: 1,
                            }}
                          />
                          {r.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Box>
            </Box>

            {/* Save */}
            {saveError && (
              <Alert severity="error" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={saving}
              startIcon={
                saving ? (
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
                '&:hover': { background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)' },
                py: 1.2,
                fontWeight: 700,
              }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<CheckCircle />}
          onClose={() => setSaveSuccess(false)}
          sx={{ width: '100%' }}
        >
          Configuration saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};
