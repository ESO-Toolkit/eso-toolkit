/**
 * Discord Server Configuration Page.
 *
 * Lets server admins configure the ESO Toolkit bot for their Discord server:
 * - Default posting channel
 * - Allowed roles for posting rosters
 * - Channel name pattern with template tokens
 * - Role pings (tank/healer/DD)
 */

import {
  ArrowBack,
  AutoAwesome,
  CheckCircle,
  Group as GroupIcon,
  NotificationsActive,
  Public as PublicIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Tag as TagIcon,
  TextFields,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Fade,
  FormControl,
  InputAdornment,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  timezone?: string;
}

// ── Token chips for channel name pattern ───────────────────────────────────

const NAME_TOKENS = [
  { token: '{day-short}', desc: 'Day abbreviation (Sun, Mon, ...)' },
  { token: '{time}', desc: 'Time (8pm, 10am, ...)' },
  { token: '{trial}', desc: 'Trial ID (vss, vcr, ...)' },
  { token: '{tag}', desc: 'First tag on the roster' },
] as const;

const DEFAULT_NAME_PATTERN = '{day-short}-{time}-{trial}-{tag}';

const DEFAULT_TIMEZONE = 'America/New_York';

/** Curated IANA timezone list grouped by region. */
const TIMEZONE_OPTIONS: { label: string; value: string; group: string }[] = [
  // North America
  { label: 'Eastern (New York)', value: 'America/New_York', group: 'North America' },
  { label: 'Central (Chicago)', value: 'America/Chicago', group: 'North America' },
  { label: 'Mountain (Denver)', value: 'America/Denver', group: 'North America' },
  { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles', group: 'North America' },
  { label: 'Alaska (Anchorage)', value: 'America/Anchorage', group: 'North America' },
  { label: 'Hawaii (Honolulu)', value: 'Pacific/Honolulu', group: 'North America' },
  { label: 'Atlantic (Halifax)', value: 'America/Halifax', group: 'North America' },
  { label: "Newfoundland (St. John's)", value: 'America/St_Johns', group: 'North America' },
  { label: 'Mexico City', value: 'America/Mexico_City', group: 'North America' },
  // Europe
  { label: 'London (GMT/BST)', value: 'Europe/London', group: 'Europe' },
  { label: 'Central European (Berlin)', value: 'Europe/Berlin', group: 'Europe' },
  { label: 'Eastern European (Helsinki)', value: 'Europe/Helsinki', group: 'Europe' },
  { label: 'Moscow', value: 'Europe/Moscow', group: 'Europe' },
  { label: 'Paris', value: 'Europe/Paris', group: 'Europe' },
  { label: 'Istanbul', value: 'Europe/Istanbul', group: 'Europe' },
  // Asia & Oceania
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo', group: 'Asia & Oceania' },
  { label: 'Shanghai (CST)', value: 'Asia/Shanghai', group: 'Asia & Oceania' },
  { label: 'Kolkata (IST)', value: 'Asia/Kolkata', group: 'Asia & Oceania' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai', group: 'Asia & Oceania' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore', group: 'Asia & Oceania' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney', group: 'Asia & Oceania' },
  { label: 'Auckland (NZST)', value: 'Pacific/Auckland', group: 'Asia & Oceania' },
  // South America
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo', group: 'South America' },
  { label: 'Buenos Aires (ART)', value: 'America/Argentina/Buenos_Aires', group: 'South America' },
  // Africa
  { label: 'Johannesburg (SAST)', value: 'Africa/Johannesburg', group: 'Africa' },
  { label: 'Cairo (EET)', value: 'Africa/Cairo', group: 'Africa' },
  // UTC
  { label: 'UTC', value: 'UTC', group: 'Other' },
];

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

/** Resolve a channel name pattern into a preview string. */
function previewChannelName(pattern: string, tz: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const dayStr = dayFmt.format(now).toLowerCase();
  const dayIdx = shortDays.indexOf(dayStr);
  const hourFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  let h = parseInt(hourFmt.format(now), 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const time12 = `${h}${suffix}`;
  return pattern
    .replace(/{day-short}/g, shortDays[dayIdx >= 0 ? dayIdx : now.getDay()])
    .replace(/{time}/g, time12)
    .replace(/{trial}/g, 'vss')
    .replace(/{tag}/g, 'score-push')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/** Check whether config has been customized beyond defaults. */
function isConfigured(cfg: GuildConfigData | null): boolean {
  if (!cfg) return false;
  return !!(
    cfg.defaultChannelId ||
    cfg.defaultCategoryId ||
    (cfg.namePattern && cfg.namePattern !== DEFAULT_NAME_PATTERN) ||
    (cfg.allowedRoleIds && cfg.allowedRoleIds.length > 0) ||
    cfg.rolePingIds?.tank ||
    cfg.rolePingIds?.healer ||
    cfg.rolePingIds?.dd
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

interface ConfigSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  isDark: boolean;
  badge?: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  icon,
  title,
  description,
  children,
  isDark,
  badge,
}) => (
  <Box
    sx={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      borderRadius: 2.5,
      p: 2.5,
      transition: 'border-color 0.2s ease',
      '&:hover': {
        borderColor: isDark ? 'rgba(88,101,242,0.2)' : 'rgba(88,101,242,0.15)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.08)',
          border: '1px solid rgba(88,101,242,0.15)',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5865F2' }}>
            {title}
          </Typography>
          {badge}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {description}
        </Typography>
      </Box>
    </Box>
    {children}
  </Box>
);

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
  const [guildConfigs, setGuildConfigs] = useState<Record<string, GuildConfigData | null>>({});
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [guildsError, setGuildsError] = useState<string | null>(null);
  const [guildSearch, setGuildSearch] = useState('');

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
  const [namePattern, setNamePattern] = useState(DEFAULT_NAME_PATTERN);
  const [tankPingRole, setTankPingRole] = useState('');
  const [healerPingRole, setHealerPingRole] = useState('');
  const [ddPingRole, setDdPingRole] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  // Dirty tracking — snapshot of form values at load time
  const initialFormRef = useRef<string>('');

  const currentFormSnapshot = useMemo(
    () =>
      JSON.stringify({
        defaultChannelId,
        defaultCategoryId,
        allowedRoleIds: allowedRoleIds.map((r) => r.id),
        namePattern,
        tankPingRole,
        healerPingRole,
        ddPingRole,
        timezone,
      }),
    [
      defaultChannelId,
      defaultCategoryId,
      allowedRoleIds,
      namePattern,
      tankPingRole,
      healerPingRole,
      ddPingRole,
      timezone,
    ],
  );

  const isDirty = initialFormRef.current !== '' && currentFormSnapshot !== initialFormRef.current;

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sticky save bar
  const saveBarRef = useRef<HTMLDivElement>(null);

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

  // Fetch guilds + their config status
  const loadGuilds = useCallback(async () => {
    if (!discordToken) return;
    setGuildsLoading(true);
    setGuildsError(null);
    try {
      const mutual = await getMutualGuildsFromApi(discordToken);
      setGuilds(mutual);

      // Fetch config status for each guild (non-blocking)
      const configPromises = mutual.map(async (g) => {
        try {
          const res = await apiFetch<{ config: GuildConfigData }>(
            `/discord/guild/${g.id}/config`,
            discordToken,
          );
          return [g.id, res.config] as const;
        } catch {
          return [g.id, null] as const;
        }
      });
      const configs = await Promise.all(configPromises);
      const configMap: Record<string, GuildConfigData | null> = {};
      for (const [id, cfg] of configs) {
        configMap[id] = cfg;
      }
      setGuildConfigs(configMap);

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
        // Auto-detect "Open Runs" category if none is configured
        const detectedCategory =
          cfg.defaultCategoryId ||
          channelsRes.channels.find((c) => c.type === 4 && /open\s*runs/i.test(c.name))?.id ||
          '';
        setDefaultCategoryId(detectedCategory);
        setNamePattern(
          !cfg.namePattern || cfg.namePattern === '{label}'
            ? DEFAULT_NAME_PATTERN
            : cfg.namePattern,
        );
        setTankPingRole(cfg.rolePingIds?.tank ?? '');
        setHealerPingRole(cfg.rolePingIds?.healer ?? '');
        setDdPingRole(cfg.rolePingIds?.dd ?? '');
        setTimezone(cfg.timezone || DEFAULT_TIMEZONE);

        // Map allowed role IDs to role objects
        const allowedIds = cfg.allowedRoleIds ?? [];
        setAllowedRoleIds(rolesRes.roles.filter((r) => allowedIds.includes(r.id)));

        // Snapshot for dirty tracking (deferred to next tick so state is settled)
        setTimeout(() => {
          initialFormRef.current = JSON.stringify({
            defaultChannelId: cfg.defaultChannelId ?? '',
            defaultCategoryId: detectedCategory,
            allowedRoleIds: cfg.allowedRoleIds ?? [],
            namePattern:
              !cfg.namePattern || cfg.namePattern === '{label}'
                ? DEFAULT_NAME_PATTERN
                : cfg.namePattern,
            tankPingRole: cfg.rolePingIds?.tank ?? '',
            healerPingRole: cfg.rolePingIds?.healer ?? '',
            ddPingRole: cfg.rolePingIds?.dd ?? '',
            timezone: cfg.timezone || DEFAULT_TIMEZONE,
          });
        }, 0);
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
        timezone,
      };

      await apiFetch(`/discord/guild/${selectedGuild.id}/config`, discordToken, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setSaveSuccess(true);

      // Update dirty snapshot to current values
      initialFormRef.current = currentFormSnapshot;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token: string): void => {
    setNamePattern((prev) => {
      if (!prev || prev.endsWith('-')) return prev + token;
      return prev + '-' + token;
    });
  };

  // Get text channels grouped by category
  const categories = channels.filter((c) => c.type === 4);
  const textChannels = channels.filter((c) => c.type === 0);

  // Filter guilds by search
  const filteredGuilds = useMemo(() => {
    if (!guilds) return null;
    if (!guildSearch.trim()) return guilds;
    const q = guildSearch.toLowerCase();
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, guildSearch]);

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
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.08) 100%)',
                border: '1px solid rgba(88,101,242,0.25)',
              }}
            >
              <SettingsIcon sx={{ color: '#5865F2', fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Server Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a server to configure the ESO Toolkit bot
              </Typography>
            </Box>
            {guilds && guilds.length > 0 && (
              <Chip
                label={`${guilds.length} server${guilds.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  bgcolor: isDark ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.08)',
                  color: '#5865F2',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            )}
          </Box>

          {guildsLoading && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}
            >
              <CircularProgress size={36} sx={{ color: '#5865F2' }} />
              <Typography variant="body2" color="text.secondary">
                Loading your servers...
              </Typography>
            </Box>
          )}

          {guildsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {guildsError}
            </Alert>
          )}

          {filteredGuilds && !guildsLoading && (
            <>
              {guilds && guilds.length === 0 ? (
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
                <>
                  {/* Search bar — only show when 5+ servers */}
                  {guilds && guilds.length >= 5 && (
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search servers..."
                      value={guildSearch}
                      onChange={(e) => setGuildSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                      gap: 1.5,
                    }}
                  >
                    {filteredGuilds.map((guild) => {
                      const configured = isConfigured(guildConfigs[guild.id]);
                      return (
                        <Paper
                          key={guild.id}
                          onClick={() => setSelectedGuild(guild)}
                          sx={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: isDark
                              ? '1px solid rgba(255,255,255,0.06)'
                              : '1px solid rgba(0,0,0,0.06)',
                            borderRadius: 2.5,
                            p: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.2,
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'rgba(88,101,242,0.4)',
                              background: isDark
                                ? 'rgba(88,101,242,0.08)'
                                : 'rgba(88,101,242,0.04)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 20px rgba(88,101,242,0.15)',
                            },
                          }}
                        >
                          <Avatar
                            src={getGuildIconUrl(guild.id, guild.icon) ?? undefined}
                            sx={{
                              width: 48,
                              height: 48,
                              fontSize: '1.2rem',
                              bgcolor: '#5865F2',
                            }}
                          >
                            {guild.name.charAt(0)}
                          </Avatar>
                          <Typography
                            sx={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3 }}
                            noWrap
                            title={guild.name}
                          >
                            {guild.name}
                          </Typography>
                          <Chip
                            label={configured ? 'Configured' : 'Not configured'}
                            size="small"
                            icon={
                              configured ? (
                                <CheckCircle sx={{ fontSize: '14px !important' }} />
                              ) : (
                                <SettingsIcon sx={{ fontSize: '14px !important' }} />
                              )
                            }
                            sx={{
                              fontSize: '0.7rem',
                              height: 22,
                              bgcolor: configured
                                ? isDark
                                  ? 'rgba(87,242,135,0.12)'
                                  : 'rgba(87,242,135,0.15)'
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.06)',
                              color: configured
                                ? '#57F287'
                                : isDark
                                  ? 'rgba(255,255,255,0.5)'
                                  : 'rgba(0,0,0,0.45)',
                              border: configured
                                ? '1px solid rgba(87,242,135,0.25)'
                                : isDark
                                  ? '1px solid rgba(255,255,255,0.08)'
                                  : '1px solid rgba(0,0,0,0.08)',
                              '& .MuiChip-icon': {
                                color: 'inherit',
                              },
                            }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>

                  {filteredGuilds.length === 0 && guildSearch && (
                    <Typography
                      color="text.secondary"
                      sx={{ textAlign: 'center', py: 3, fontSize: '0.9rem' }}
                    >
                      No servers match &ldquo;{guildSearch}&rdquo;
                    </Typography>
                  )}
                </>
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

  const channelPreview = !defaultChannelId ? previewChannelName(namePattern, timezone) : null;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Navigation breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {fromPublish ? (
          <Button
            size="small"
            startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
            onClick={() => navigate(-1)}
            sx={{ color: '#5865F2', fontSize: '0.8rem' }}
          >
            Back to publishing
          </Button>
        ) : (
          <Button
            size="small"
            startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
            onClick={() => {
              setSelectedGuild(null);
              setConfig(null);
              setConfigError(null);
              initialFormRef.current = '';
            }}
            sx={{ color: '#5865F2', fontSize: '0.8rem' }}
          >
            All servers
          </Button>
        )}
        {isDirty && (
          <Fade in>
            <Chip
              label="Unsaved changes"
              size="small"
              sx={{
                bgcolor: 'rgba(254,215,170,0.15)',
                color: '#FFA500',
                border: '1px solid rgba(254,215,170,0.3)',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          </Fade>
        )}
      </Box>

      <Paper sx={cardSx}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Avatar
            src={getGuildIconUrl(selectedGuild.id, selectedGuild.icon) ?? undefined}
            sx={{
              width: 44,
              height: 44,
              bgcolor: '#5865F2',
              fontSize: '1.2rem',
              border: '2px solid rgba(88,101,242,0.3)',
            }}
          >
            {selectedGuild.name.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {selectedGuild.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bot Configuration
            </Typography>
          </Box>
          {config && !configLoading && (
            <Chip
              label={isConfigured(config) ? 'Configured' : 'Using defaults'}
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: 22,
                bgcolor: isConfigured(config)
                  ? isDark
                    ? 'rgba(87,242,135,0.12)'
                    : 'rgba(87,242,135,0.15)'
                  : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.06)',
                color: isConfigured(config)
                  ? '#57F287'
                  : isDark
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(0,0,0,0.45)',
                border: isConfigured(config)
                  ? '1px solid rgba(87,242,135,0.25)'
                  : isDark
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
              }}
            />
          )}
        </Box>

        {configLoading && (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}
          >
            <CircularProgress size={32} sx={{ color: '#5865F2' }} />
            <Typography variant="body2" color="text.secondary">
              Loading server configuration...
            </Typography>
          </Box>
        )}

        {configError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {configError}
          </Alert>
        )}

        {config && !configLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* First-time setup banner */}
            {!isConfigured(config) && (
              <Collapse in>
                <Alert
                  severity="info"
                  icon={<AutoAwesome sx={{ color: '#5865F2' }} />}
                  sx={{
                    mb: 0.5,
                    bgcolor: isDark ? 'rgba(88,101,242,0.08)' : 'rgba(88,101,242,0.06)',
                    border: '1px solid rgba(88,101,242,0.15)',
                    color: isDark ? 'rgba(255,255,255,0.85)' : 'inherit',
                    '& .MuiAlert-message': { fontSize: '0.85rem' },
                  }}
                >
                  <strong>First-time setup</strong> &mdash; configure where rosters get posted and
                  who can publish them. Everything here is optional &mdash; the bot works with
                  defaults too.
                </Alert>
              </Collapse>
            )}

            {/* Default Posting Channel */}
            <ConfigSection
              icon={<TagIcon sx={{ color: '#5865F2', fontSize: 18 }} />}
              title="Posting Channel"
              description="Where rosters get posted. Leave empty to auto-create a channel per roster."
              isDark={isDark}
              badge={
                defaultChannelId ? (
                  <Chip
                    label="Fixed channel"
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 18,
                      bgcolor: 'rgba(88,101,242,0.1)',
                      color: '#5865F2',
                    }}
                  />
                ) : (
                  <Chip
                    label="Auto-create"
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 18,
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    }}
                  />
                )
              }
            >
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
            </ConfigSection>

            {/* Channel Name Pattern */}
            {!defaultChannelId && (
              <ConfigSection
                icon={<TextFields sx={{ color: '#5865F2', fontSize: 18 }} />}
                title="Channel Name Pattern"
                description="Template for auto-created channel names. Click tokens to insert them."
                isDark={isDark}
              >
                <TextField
                  fullWidth
                  size="small"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  placeholder={DEFAULT_NAME_PATTERN}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
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

                {/* Live preview */}
                {channelPreview && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                      border: isDark
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                    >
                      Preview:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                      }}
                    >
                      #{channelPreview || 'roster'}
                    </Typography>
                  </Box>
                )}
              </ConfigSection>
            )}

            {/* Server Timezone */}
            <ConfigSection
              icon={<PublicIcon sx={{ color: '#5865F2', fontSize: 18 }} />}
              title="Server Timezone"
              description="Used for channel name tokens ({day-short}, {time}) and event time display."
              isDark={isDark}
            >
              <Autocomplete
                options={TIMEZONE_OPTIONS}
                groupBy={(option) => option.group}
                getOptionLabel={(option) => option.label}
                value={TIMEZONE_OPTIONS.find((o) => o.value === timezone) ?? TIMEZONE_OPTIONS[0]}
                onChange={(_e, newValue) => {
                  setTimezone(newValue?.value ?? DEFAULT_TIMEZONE);
                }}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                size="small"
                disableClearable
                renderInput={(params) => <TextField {...params} placeholder="Select timezone..." />}
                renderOption={(props, option) => (
                  <li {...props} key={option.value}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">{option.label}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                          fontFamily: 'monospace',
                          fontSize: '0.65rem',
                        }}
                      >
                        {option.value}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </ConfigSection>

            {/* Allowed Roles */}
            <ConfigSection
              icon={<GroupIcon sx={{ color: '#5865F2', fontSize: 18 }} />}
              title="Allowed Roles"
              description="Members with these roles can publish rosters via the bot. Leave empty for admin-only."
              isDark={isDark}
              badge={
                allowedRoleIds.length > 0 ? (
                  <Chip
                    label={`${allowedRoleIds.length} role${allowedRoleIds.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 18,
                      bgcolor: 'rgba(88,101,242,0.1)',
                      color: '#5865F2',
                    }}
                  />
                ) : null
              }
            >
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
            </ConfigSection>

            {/* Role Pings */}
            <ConfigSection
              icon={<NotificationsActive sx={{ color: '#5865F2', fontSize: 18 }} />}
              title="Role Pings"
              description="Optional roles to @mention in posted rosters so members get notified for sign-ups."
              isDark={isDark}
              badge={
                tankPingRole || healerPingRole || ddPingRole ? (
                  <Chip
                    label={`${[tankPingRole, healerPingRole, ddPingRole].filter(Boolean).length} active`}
                    size="small"
                    sx={{
                      fontSize: '0.65rem',
                      height: 18,
                      bgcolor: 'rgba(88,101,242,0.1)',
                      color: '#5865F2',
                    }}
                  />
                ) : null
              }
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  {
                    label: 'Tank',
                    value: tankPingRole,
                    setter: setTankPingRole,
                    emoji: '\u{1F6E1}',
                  },
                  {
                    label: 'Healer',
                    value: healerPingRole,
                    setter: setHealerPingRole,
                    emoji: '\u{1F49A}',
                  },
                  { label: 'DD', value: ddPingRole, setter: setDdPingRole, emoji: '\u{2694}' },
                ].map((ping) => (
                  <FormControl key={ping.label} fullWidth size="small">
                    <InputLabel>
                      {ping.emoji} {ping.label} Ping Role
                    </InputLabel>
                    <Select
                      value={ping.value}
                      label={`${ping.emoji} ${ping.label} Ping Role`}
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
            </ConfigSection>

            {/* Save bar */}
            {saveError && (
              <Alert severity="error" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}

            <Box
              ref={saveBarRef}
              sx={{
                position: 'sticky',
                bottom: -24, // counteract container padding
                mx: -3,
                mb: -3,
                px: 3,
                py: 2,
                borderTop: isDark
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,0,0,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                background: isDark ? 'rgba(15,18,35,0.95)' : 'rgba(255,255,255,0.95)',
                borderRadius: '0 0 24px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                zIndex: 1,
              }}
            >
              <Button
                variant="contained"
                onClick={() => void handleSave()}
                disabled={saving || !isDirty}
                fullWidth
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
                  background: isDirty
                    ? 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.08)',
                  color: isDirty ? '#fff' : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                  '&:hover': isDirty
                    ? { background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)' }
                    : {},
                  py: 1.2,
                  fontWeight: 700,
                  '&.Mui-disabled': {
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                  },
                }}
              >
                {saving ? 'Saving...' : isDirty ? 'Save Configuration' : 'No changes to save'}
              </Button>
            </Box>
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
