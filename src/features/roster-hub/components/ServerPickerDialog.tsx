/**
 * Server picker dialog for publishing rosters to Discord.
 *
 * Multi-step flow:
 *   Step 1 — Select a server (with config status indicators)
 *   Step 2 — Inline channel config + publish
 *   Step 3 — Success state with Discord deep link
 *
 * Includes post-bot-add onboarding: refresh button, "New" badges,
 * and first-time setup callout for unconfigured servers.
 */

import {
  ArrowBack,
  CheckCircle,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  FiberNew as NewIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import discordIcon from '../../../assets/discord-icon.svg';
import {
  getBotInviteUrl,
  getMutualGuildsFromApi,
  getGuildIconUrl,
  DiscordAuthExpiredError,
} from '../../auth/discord-auth';
import { useDiscordAuth } from '../../auth/DiscordAuthContext';
import { PRESET_TAGS, TAG_COLORS } from '../types/roster-hub.types';
import type { HubRoster } from '../types/roster-hub.types';

import { TRIAL_LABELS } from './RosterCard';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

// ── Types ──────────────────────────────────────────────────────────────────

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

interface GuildConfigData {
  guildId: string;
  namePattern: string;
  defaultChannelId?: string;
  defaultCategoryId?: string;
  allowedRoleIds?: string[];
}

interface ChannelInfo {
  id: string;
  name: string;
  type: number; // 0 = text, 4 = category
  parent_id?: string;
  position?: number;
}

interface PublishResponse {
  ok: boolean;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  error?: string;
}

type DialogStep = 'select' | 'configure' | 'success';

// ── Props ──────────────────────────────────────────────────────────────────

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
  tags?: string[];
  rosterData?: string;
  authorName?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

export const ServerPickerDialog: React.FC<ServerPickerDialogProps> = ({
  open,
  onClose,
  onSuccess,
  roster,
  title,
  description,
  trialId: trialIdProp,
  tags: tagsProp,
  rosterData,
  authorName,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { discordToken, isDiscordAuthed, startDiscordLogin, clearDiscordAuth } = useDiscordAuth();

  // ── Step state ─────────────────────────────────────────────────────────
  const [step, setStep] = React.useState<DialogStep>('select');

  // ── Guild list ─────────────────────────────────────────────────────────
  const [guilds, setGuilds] = React.useState<GuildInfo[] | null>(null);
  const [guildConfigs, setGuildConfigs] = React.useState<Record<string, GuildConfigData | null>>(
    {},
  );
  const [selectedGuild, setSelectedGuild] = React.useState<GuildInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ── Bot invite tracking ────────────────────────────────────────────────
  const [inviteClicked, setInviteClicked] = React.useState(false);
  const [previousGuildIds, setPreviousGuildIds] = React.useState<Set<string>>(new Set());
  const [newGuildIds, setNewGuildIds] = React.useState<Set<string>>(new Set());

  // ── Channel config (step 2) ────────────────────────────────────────────
  const [channels, setChannels] = React.useState<ChannelInfo[]>([]);
  const [selectedChannelId, setSelectedChannelId] = React.useState('');
  const [channelNameOverride, setChannelNameOverride] = React.useState('');
  const [configLoading, setConfigLoading] = React.useState(false);

  // ── Trial & tag selection (direct-publish only) ────────────────────────
  const [selectedTrialId, setSelectedTrialId] = React.useState(trialIdProp ?? '');
  const [selectedTags, setSelectedTags] = React.useState<string[]>(tagsProp ?? []);

  // ── Publish state ──────────────────────────────────────────────────────
  const [publishing, setPublishing] = React.useState(false);

  // ── Success state (step 3) ─────────────────────────────────────────────
  const [publishResult, setPublishResult] = React.useState<{
    guildName: string;
    channelId: string;
    channelName: string;
    guildId: string;
  } | null>(null);

  const displayTitle = roster?.title ?? title ?? 'Untitled Roster';
  const displayDesc = roster?.description ?? description;

  // ── Glassmorphism styles ───────────────────────────────────────────────
  const sectionSx = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
    borderRadius: 2,
    p: 2,
  };

  // ── Fetch guilds ───────────────────────────────────────────────────────
  const loadGuilds = React.useCallback(
    async (trackNew = false) => {
      if (!discordToken) return;
      setLoading(true);
      setError(null);

      try {
        const mutual = await getMutualGuildsFromApi(discordToken);
        setGuilds(mutual);

        if (trackNew && previousGuildIds.size > 0) {
          const newIds = new Set(
            mutual.filter((g) => !previousGuildIds.has(g.id)).map((g) => g.id),
          );
          setNewGuildIds(newIds);
        }

        setPreviousGuildIds(new Set(mutual.map((g) => g.id)));

        // Fetch config status for each guild (fire-and-forget, non-blocking)
        const configMap: Record<string, GuildConfigData | null> = {};
        await Promise.all(
          mutual.map(async (guild) => {
            try {
              const res = await apiFetch<{ config: GuildConfigData }>(
                `/discord/guild/${guild.id}/config`,
                discordToken,
              );
              configMap[guild.id] = res.config;
            } catch {
              configMap[guild.id] = null;
            }
          }),
        );
        setGuildConfigs(configMap);
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
    },
    [discordToken, previousGuildIds, clearDiscordAuth],
  );

  // Load guilds when dialog opens
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('select');
      setGuilds(null);
      setSelectedGuild(null);
      setError(null);
      setInviteClicked(false);
      setNewGuildIds(new Set());
      setPublishResult(null);
      setChannels([]);
      setSelectedChannelId('');
      setChannelNameOverride('');
      setSelectedTrialId(trialIdProp ?? '');
      setSelectedTags(tagsProp ?? []);
      return;
    }
    if (isDiscordAuthed) {
      void loadGuilds();
    }
  }, [open, isDiscordAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load channels & config when guild selected (step 2) ────────────────
  const loadGuildConfig = React.useCallback(
    async (guild: GuildInfo) => {
      if (!discordToken) return;
      setConfigLoading(true);
      try {
        const [channelsRes, configRes] = await Promise.all([
          apiFetch<{ channels: ChannelInfo[] }>(
            `/discord/guild/${guild.id}/channels`,
            discordToken,
          ),
          apiFetch<{ config: GuildConfigData }>(`/discord/guild/${guild.id}/config`, discordToken),
        ]);
        setChannels(channelsRes.channels);

        // Pre-select default channel from config
        const cfg = configRes.config;
        setSelectedChannelId(cfg.defaultChannelId ?? '');
        setChannelNameOverride('');
      } catch {
        // Non-fatal — user can still publish without channel selection
        setChannels([]);
        setSelectedChannelId('');
      } finally {
        setConfigLoading(false);
      }
    },
    [discordToken],
  );

  const handleSelectGuild = (guild: GuildInfo): void => {
    setSelectedGuild(guild);
    setStep('configure');
    void loadGuildConfig(guild);
  };

  const handleBack = (): void => {
    setStep('select');
    setSelectedGuild(null);
    setChannels([]);
    setSelectedChannelId('');
    setChannelNameOverride('');
    setError(null);
  };

  // ── Publish ────────────────────────────────────────────────────────────
  const handlePublish = async (): Promise<void> => {
    if (!selectedGuild || !discordToken) return;

    setPublishing(true);
    setError(null);

    try {
      let endpoint: string;
      let body: Record<string, unknown>;

      // Determine channel override or selected channel
      const channelOverride = channelNameOverride.trim() || undefined;

      if (roster) {
        endpoint = `${DISCORD_BOT_API_URL}/discord/roster/publish`;
        body = {
          guildId: selectedGuild.id,
          rosterId: roster.id,
          channelNameOverride: channelOverride,
        };
      } else {
        endpoint = `${DISCORD_BOT_API_URL}/discord/roster/publish-direct`;
        body = {
          guildId: selectedGuild.id,
          title: title ?? 'Untitled',
          description: description ?? '',
          trial_id: selectedTrialId || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          roster_data: rosterData ?? '',
          author_name: authorName ?? 'Unknown',
          channelNameOverride: channelOverride,
        };
      }

      // If a specific existing channel is selected (not auto-create), include categoryId
      // The default channel selection is handled by server config

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${discordToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const result = (await res.json()) as PublishResponse;

      setPublishResult({
        guildName: selectedGuild.name,
        guildId: selectedGuild.id,
        channelId: result.channelId ?? '',
        channelName: result.channelName ?? 'roster',
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleDone = (): void => {
    onSuccess();
  };

  // ── Config status helper ───────────────────────────────────────────────
  const isGuildConfigured = (guildId: string): boolean => {
    const cfg = guildConfigs[guildId];
    if (!cfg) return false;
    // A guild is "configured" if it has a default channel or non-default name pattern
    return !!(cfg.defaultChannelId || cfg.defaultCategoryId || cfg.namePattern !== '{label}');
  };

  // ── Channel grouping ──────────────────────────────────────────────────
  const categories = channels.filter((c) => c.type === 4);
  const textChannels = channels.filter((c) => c.type === 0);

  const isCloseable = !publishing && step !== 'success';

  // ── Render ─────────────────────────────────────────────────────────────

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
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {step === 'configure' && (
          <IconButton onClick={handleBack} size="small" sx={{ color: 'text.secondary', mr: -0.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
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
            flexShrink: 0,
          }}
        >
          {step === 'success' ? (
            <CheckCircle sx={{ color: '#57F287', fontSize: 22 }} />
          ) : (
            <img src={discordIcon} alt="" style={{ width: 20, height: 20 }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {step === 'success' ? 'Published!' : 'Publish to Discord'}
          </Typography>
          {step === 'select' && (
            <Typography variant="caption" color="text.secondary">
              Select a server to post your roster
            </Typography>
          )}
          {step === 'configure' && selectedGuild && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {selectedGuild.name}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        {/* ── Roster Preview (steps 1 & 2) ────────────────────────────── */}
        {step !== 'success' && (
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
        )}

        {/* ── Not Connected ───────────────────────────────────────────── */}
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

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isDiscordAuthed && loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: '#5865F2' }} />
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 1 — Select Server
            ═══════════════════════════════════════════════════════════════ */}
        {isDiscordAuthed && !loading && guilds !== null && step === 'select' && (
          <>
            {guilds.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  The ESO Toolkit bot isn&apos;t in any of your servers yet.
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 2 }}
                >
                  Add the bot to your server, then refresh this list.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 0.75,
                  maxHeight: 280,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: isDark
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
                  p: 0.75,
                }}
              >
                {guilds.map((guild) => {
                  const configured = isGuildConfigured(guild.id);
                  const isNew = newGuildIds.has(guild.id);

                  return (
                    <Box
                      key={guild.id}
                      onClick={() => handleSelectGuild(guild)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.25,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isNew ? '1px solid rgba(87,242,135,0.3)' : '1px solid transparent',
                        background: isNew
                          ? isDark
                            ? 'rgba(87,242,135,0.06)'
                            : 'rgba(87,242,135,0.04)'
                          : 'transparent',
                        '&:hover': {
                          background: isDark ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.06)',
                          borderColor: 'rgba(88,101,242,0.3)',
                        },
                      }}
                    >
                      <Avatar
                        src={getGuildIconUrl(guild.id, guild.icon) ?? undefined}
                        sx={{ width: 36, height: 36, fontSize: '0.85rem', bgcolor: '#5865F2' }}
                      >
                        {guild.name.charAt(0)}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography
                            sx={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}
                            noWrap
                          >
                            {guild.name}
                          </Typography>
                          {isNew && (
                            <Chip
                              icon={<NewIcon sx={{ fontSize: '14px !important' }} />}
                              label="New"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: 'rgba(87,242,135,0.15)',
                                color: '#57F287',
                                border: '1px solid rgba(87,242,135,0.3)',
                                '& .MuiChip-icon': { color: '#57F287', ml: 0.25 },
                              }}
                            />
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={configured ? 'Ready' : 'Setup needed'}
                          sx={{
                            mt: 0.25,
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            bgcolor: configured ? 'rgba(87,242,135,0.12)' : 'rgba(254,185,0,0.12)',
                            color: configured ? '#57F287' : '#FEB900',
                            border: configured
                              ? '1px solid rgba(87,242,135,0.25)'
                              : '1px solid rgba(254,185,0,0.25)',
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </Box>

                      <Tooltip title="Advanced settings">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            navigate(`/discord-server-config?guild=${guild.id}&from=publish`);
                          }}
                          sx={{
                            color: 'text.disabled',
                            '&:hover': { color: '#5865F2' },
                          }}
                        >
                          <SettingsIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* ── Add Bot / Refresh ─────────────────────────────────────── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mt: 2,
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="outlined"
                size="small"
                href={getBotInviteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setInviteClicked(true)}
                sx={{
                  borderColor: 'rgba(88,101,242,0.3)',
                  color: '#5865F2',
                  '&:hover': { borderColor: '#5865F2', background: 'rgba(88,101,242,0.08)' },
                }}
              >
                {guilds && guilds.length === 0 ? 'Add Bot to Server' : 'Add Bot to Another Server'}
              </Button>

              {inviteClicked && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon sx={{ fontSize: '16px !important' }} />}
                  onClick={() => void loadGuilds(true)}
                  sx={{
                    borderColor: 'rgba(87,242,135,0.3)',
                    color: '#57F287',
                    '&:hover': {
                      borderColor: '#57F287',
                      background: 'rgba(87,242,135,0.08)',
                    },
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { boxShadow: '0 0 0 0 rgba(87,242,135,0.3)' },
                      '50%': { boxShadow: '0 0 0 4px rgba(87,242,135,0)' },
                    },
                  }}
                >
                  Refresh List
                </Button>
              )}
            </Box>

            {inviteClicked && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 1 }}
              >
                Added the bot? Click refresh to see your new server.
              </Typography>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 2 — Configure & Publish
            ═══════════════════════════════════════════════════════════════ */}
        {step === 'configure' && selectedGuild && (
          <>
            {/* First-time setup callout */}
            {!isGuildConfigured(selectedGuild.id) && !configLoading && (
              <Box
                sx={{
                  ...sectionSx,
                  mb: 2,
                  borderColor: 'rgba(254,185,0,0.2)',
                  background: isDark ? 'rgba(254,185,0,0.04)' : 'rgba(254,185,0,0.03)',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#FEB900', fontSize: '0.82rem' }}
                >
                  First time publishing here?
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Choose a channel below, or{' '}
                  <Box
                    component="span"
                    onClick={() => {
                      onClose();
                      navigate(`/discord-server-config?guild=${selectedGuild.id}&from=publish`);
                    }}
                    sx={{
                      color: '#5865F2',
                      cursor: 'pointer',
                      fontWeight: 600,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    set up defaults
                  </Box>{' '}
                  for this server so you don&apos;t have to pick every time.
                </Typography>
              </Box>
            )}

            {/* Channel selection */}
            {configLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} sx={{ color: '#5865F2' }} />
              </Box>
            ) : (
              <Box sx={{ ...sectionSx, mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1, color: '#5865F2', fontSize: '0.82rem' }}
                >
                  Post to Channel
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel>Channel</InputLabel>
                  <Select
                    value={selectedChannelId}
                    label="Channel"
                    onChange={(e: SelectChangeEvent) => setSelectedChannelId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Auto-create new channel</em>
                    </MenuItem>
                    {categories.length > 0
                      ? categories.map((cat) => [
                          <MenuItem
                            key={`cat-${cat.id}`}
                            disabled
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
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

                {/* Channel name override — only for auto-create */}
                {!selectedChannelId && (
                  <TextField
                    label="Channel name"
                    placeholder="Leave blank to use roster title"
                    value={channelNameOverride}
                    onChange={(e) => setChannelNameOverride(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1.5 }}
                    helperText="Custom name for the auto-created channel"
                  />
                )}
              </Box>
            )}

            {/* Trial & tag selection — direct-publish only */}
            {!roster && (
              <Box sx={{ mb: 2 }}>
                {/* Trial selector */}
                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                  <InputLabel>Trial</InputLabel>
                  <Select
                    value={selectedTrialId}
                    label="Trial"
                    onChange={(e: SelectChangeEvent) => setSelectedTrialId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {Object.entries(TRIAL_LABELS).map(([id, name]) => (
                      <MenuItem key={id} value={id}>
                        {name} ({id})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Tag chips */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {PRESET_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    const accent = TAG_COLORS[tag] ?? '#888';
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onClick={() =>
                          setSelectedTags((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag],
                          )
                        }
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          bgcolor: active ? `${accent}22` : 'transparent',
                          color: active ? accent : 'text.secondary',
                          border: `1px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`,
                          '&:hover': { bgcolor: `${accent}33` },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Advanced settings link */}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Button
                size="small"
                startIcon={<SettingsIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => {
                  onClose();
                  navigate(`/discord-server-config?guild=${selectedGuild.id}&from=publish`);
                }}
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  '&:hover': { color: '#5865F2' },
                }}
              >
                Advanced Server Settings
              </Button>
            </Box>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3 — Success
            ═══════════════════════════════════════════════════════════════ */}
        {step === 'success' && publishResult && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {/* Success animation */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
                background:
                  'linear-gradient(135deg, rgba(87,242,135,0.2) 0%, rgba(87,242,135,0.05) 100%)',
                border: '2px solid rgba(87,242,135,0.3)',
                animation: 'successPop 0.4s ease-out',
                '@keyframes successPop': {
                  '0%': { transform: 'scale(0.5)', opacity: 0 },
                  '70%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            >
              <CheckCircle sx={{ color: '#57F287', fontSize: 40 }} />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Roster Published!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Posted to{' '}
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                #{publishResult.channelName}
              </Box>{' '}
              in{' '}
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {publishResult.guildName}
              </Box>
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                maxWidth: 280,
                mx: 'auto',
              }}
            >
              {/* Open in Discord */}
              <Button
                variant="contained"
                startIcon={<LaunchIcon sx={{ fontSize: '16px !important' }} />}
                href={`https://discord.com/channels/${publishResult.guildId}/${publishResult.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                  },
                  fontWeight: 600,
                }}
              >
                Open in Discord
              </Button>

              {/* Configure Server — show for unconfigured servers */}
              {!isGuildConfigured(publishResult.guildId) && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon sx={{ fontSize: '16px !important' }} />}
                  onClick={() => {
                    onSuccess();
                    navigate(`/discord-server-config?guild=${publishResult.guildId}`);
                  }}
                  sx={{
                    borderColor: 'rgba(88,101,242,0.3)',
                    color: '#5865F2',
                    fontSize: '0.8rem',
                    '&:hover': {
                      borderColor: '#5865F2',
                      background: 'rgba(88,101,242,0.08)',
                    },
                  }}
                >
                  Set Up Server Defaults
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* ── Error display ─────────────────────────────────────────── */}
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'select' && <Button onClick={onClose}>Cancel</Button>}

        {step === 'configure' && (
          <>
            <Button onClick={handleBack} disabled={publishing}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => void handlePublish()}
              disabled={publishing}
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
          </>
        )}

        {step === 'success' && (
          <Button
            onClick={handleDone}
            variant="outlined"
            sx={{
              borderColor: 'rgba(88,101,242,0.3)',
              color: '#5865F2',
              '&:hover': { borderColor: '#5865F2', background: 'rgba(88,101,242,0.08)' },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
