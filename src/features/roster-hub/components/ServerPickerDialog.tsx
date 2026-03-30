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

import { now as dateNow, toCalendarDateTime, type CalendarDateTime } from '@internationalized/date';
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
import { DatePicker } from '../../../components/DatePicker';
import {
  getBotInviteUrl,
  getMutualGuildsFromApi,
  getGuildIconUrl,
  DiscordAuthExpiredError,
} from '../../auth/discord-auth';
import { useDiscordAuth } from '../../auth/DiscordAuthContext';
import { TAG_COLORS } from '../types/roster-hub.types';
import type { HubRoster } from '../types/roster-hub.types';

import { TRIAL_LABELS } from './RosterCard';

const DISCORD_BOT_API_URL =
  (import.meta.env.VITE_DISCORD_BOT_API_URL as string | undefined) ??
  'https://eso-toolkit-discord-bot.eso-toolkit.workers.dev';

const DEFAULT_NAME_PATTERN = '{day-short}-{time}-{tag}-{trainer}';

const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type Difficulty = 'vet' | 'normal';
const DIFFICULTY_TAGS: Difficulty[] = ['normal', 'vet'];
const EXTRA_PRESET_TAGS = ['sweaty', 'fun', 'score-push'] as const;

/** Trial ID → lowercase abbreviation (mirrors discord-bot/src/roster/channel-name.ts). */
const TRIAL_ABBREVS: Record<string, string> = {
  AA: 'aa',
  HRC: 'hrc',
  SO: 'so',
  MOL: 'mol',
  HOF: 'hof',
  AS: 'as',
  CR: 'cr',
  SS: 'ss',
  KA: 'ka',
  RG: 'rg',
  DSR: 'dsr',
  SE: 'se',
  LC: 'lc',
  OAC: 'oac',
};

/** Build a channel name preview from pattern + current form values. */
function buildChannelPreview(
  pattern: string,
  eventTime: CalendarDateTime | null,
  timezone: string,
  trialId: string,
  tags: string[],
  trainer: string,
): string {
  let dayShort = '';
  let time = '';

  if (eventTime) {
    const date = eventTime.toDate(timezone);
    const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
    const dayStr = dayFmt.format(date).toLowerCase();
    const dayIdx = SHORT_DAYS.indexOf(dayStr as (typeof SHORT_DAYS)[number]);
    dayShort = SHORT_DAYS[dayIdx >= 0 ? dayIdx : date.getDay()];
    const hourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    let h = parseInt(hourFmt.format(date), 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    time = `${h}${suffix}`;
  }

  // Determine difficulty from tags
  const lowerTags = tags.map((t) => t.toLowerCase());
  const isVet = lowerTags.includes('vet') || lowerTags.includes('veteran');
  const isNormal = lowerTags.includes('normal');
  const difficulty = isVet ? 'veteran' : isNormal ? 'normal' : null;

  // Build difficulty-prefixed trial abbreviation (e.g. "vlc", "noac")
  const abbrev = TRIAL_ABBREVS[trialId.toUpperCase()] ?? trialId.toLowerCase();
  const trialTag = difficulty ? `${difficulty === 'veteran' ? 'v' : 'n'}${abbrev}` : abbrev;

  // First non-difficulty tag for {tag} token fallback
  const nonDiffTag =
    tags.find((t) => !['vet', 'veteran', 'normal'].includes(t.toLowerCase())) ?? '';

  const name = pattern
    .replace(/{day-short}/gi, dayShort)
    .replace(/{day-full}/gi, dayShort)
    .replace(/{day}/gi, dayShort)
    .replace(/{time}/gi, time)
    .replace(/{trial}/gi, trialTag)
    .replace(/{tag}/gi, trialTag || nonDiffTag.toLowerCase())
    .replace(/{trainer}/gi, trainer.toLowerCase())
    .replace(
      /{difficulty}/gi,
      difficulty === 'veteran' ? 'vet' : difficulty === 'normal' ? 'norm' : '',
    )
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  return name || 'roster';
}

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
  timezone?: string;
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
  const [difficulty, setDifficulty] = React.useState<Difficulty | null>(() => {
    const t = tagsProp ?? [];
    if (t.includes('vet')) return 'vet';
    if (t.includes('normal')) return 'normal';
    return null;
  });
  const [hmEnabled, setHmEnabled] = React.useState(() => (tagsProp ?? []).includes('hm'));
  const [extraTags, setExtraTags] = React.useState<string[]>(() =>
    (tagsProp ?? []).filter((t) => t !== 'vet' && t !== 'normal' && t !== 'hm'),
  );
  const [tagInput, setTagInput] = React.useState('');

  // Compose the final tags array from difficulty + hm + extras
  const selectedTags = React.useMemo(() => {
    const tags: string[] = [];
    if (difficulty) tags.push(difficulty);
    if (difficulty === 'vet' && hmEnabled) tags.push('hm');
    tags.push(...extraTags);
    return tags;
  }, [difficulty, hmEnabled, extraTags]);

  // ── Event date/time ───────────────────────────────────────────────────
  const [eventTime, setEventTime] = React.useState<CalendarDateTime | null>(null);

  // ── Guild timezone (from config, defaults to America/New_York) ────────
  const [guildTimezone, setGuildTimezone] = React.useState('America/New_York');

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

  // ── Glass tokens ────────────────────────────────────────────────────────
  const sectionSx = {
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
    borderRadius: '10px',
    p: 1.5,
  };

  const glassInputSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: 13,
      background: isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.04)',
      borderRadius: '10px',
      transition: 'background 0.2s ease, border-color 0.2s ease',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.10)',
      },
      '&:hover': {
        background: isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)',
        },
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(88,101,242,0.5)',
        borderWidth: 1,
      },
    },
    '& .MuiInputLabel-root': { fontSize: 13 },
    '& .MuiFormHelperText-root': { fontSize: 11, opacity: 0.6 },
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
      {
        const t = tagsProp ?? [];
        if (t.includes('vet')) setDifficulty('vet');
        else if (t.includes('normal')) setDifficulty('normal');
        else setDifficulty(null);
        setHmEnabled(t.includes('hm'));
        setExtraTags(t.filter((x) => x !== 'vet' && x !== 'normal' && x !== 'hm'));
      }
      setTagInput('');
      setEventTime(null);
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
        setGuildTimezone(cfg.timezone || 'America/New_York');
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

      // Convert CalendarDateTime to ISO string using the guild's configured timezone
      const eventTimeIso = eventTime ? eventTime.toDate(guildTimezone).toISOString() : undefined;

      if (roster) {
        endpoint = `${DISCORD_BOT_API_URL}/discord/roster/publish`;
        body = {
          guildId: selectedGuild.id,
          rosterId: roster.id,
          channelNameOverride: channelOverride,
          event_time: eventTimeIso,
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
          event_time: eventTimeIso,
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
    return !!(
      cfg.defaultChannelId ||
      cfg.defaultCategoryId ||
      (cfg.namePattern &&
        cfg.namePattern !== '{label}' &&
        cfg.namePattern !== '{day-short}-{time}-{tag}-{trainer}' &&
        cfg.namePattern !== '{day-short}-{time}-{trial}-{tag}')
    );
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
        backdrop: {
          sx: { background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)' },
        },
        paper: {
          sx: {
            borderRadius: '16px',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(12, 12, 22, 0.96) 0%, rgba(15, 13, 28, 0.98) 100%)'
              : 'rgba(255,255,255,0.97)',
            border: isDark
              ? '1px solid rgba(88,101,242,0.15)'
              : '1px solid rgba(88,101,242,0.1)',
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset'
              : '0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(88,101,242,0.45), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(88,101,242,0.2), transparent)',
            },
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
              p: 1.25,
              borderRadius: '10px',
              background: isDark ? 'rgba(88,101,242,0.06)' : 'rgba(88,101,242,0.04)',
              border: isDark
                ? '1px solid rgba(88,101,242,0.12)'
                : '1px solid rgba(88,101,242,0.08)',
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>
              {displayTitle}
            </Typography>
            {displayDesc && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25, fontSize: '0.78rem', opacity: 0.7 }}
              >
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
                  style={{ width: 16, height: 16, filter: 'brightness(10)' }}
                />
              }
              sx={{
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                px: 3,
                background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                boxShadow: '0 4px 16px rgba(88,101,242,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                  boxShadow: '0 6px 20px rgba(88,101,242,0.4)',
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
                  gap: 0.5,
                  maxHeight: 260,
                  overflow: 'auto',
                  borderRadius: '10px',
                  border: isDark
                    ? '1px solid rgba(255,255,255,0.06)'
                    : '1px solid rgba(0,0,0,0.06)',
                  background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
                  p: 0.5,
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
                        gap: 1.25,
                        p: 1,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isNew
                          ? '1px solid rgba(87,242,135,0.25)'
                          : '1px solid transparent',
                        background: isNew
                          ? isDark
                            ? 'rgba(87,242,135,0.05)'
                            : 'rgba(87,242,135,0.03)'
                          : 'transparent',
                        '&:hover': {
                          background: isDark
                            ? 'rgba(88,101,242,0.1)'
                            : 'rgba(88,101,242,0.05)',
                          borderColor: isDark
                            ? 'rgba(88,101,242,0.25)'
                            : 'rgba(88,101,242,0.2)',
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
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  borderColor: 'rgba(88,101,242,0.25)',
                  color: '#5865F2',
                  '&:hover': { borderColor: '#5865F2', background: 'rgba(88,101,242,0.06)' },
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
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    borderColor: 'rgba(87,242,135,0.25)',
                    color: '#57F287',
                    '&:hover': {
                      borderColor: '#57F287',
                      background: 'rgba(87,242,135,0.06)',
                    },
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { boxShadow: '0 0 0 0 rgba(87,242,135,0.25)' },
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
              <Box sx={{ ...sectionSx, mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#5865F2',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Post to Channel
                </Typography>

                <FormControl fullWidth size="small" sx={glassInputSx}>
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
                    label="Channel name override"
                    placeholder="Leave blank to use name pattern"
                    value={channelNameOverride}
                    onChange={(e) => setChannelNameOverride(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1.25, ...glassInputSx }}
                    helperText="Override the auto-generated channel name"
                  />
                )}
              </Box>
            )}

            {/* Event date & time */}
            <Box sx={{ ...sectionSx, mb: 1.5 }}>
              <DatePicker
                label="Event Date & Time"
                granularity="minute"
                hourCycle={12}
                value={eventTime}
                onChange={setEventTime}
                minValue={toCalendarDateTime(dateNow(guildTimezone))}
                description={`Times are in the server's timezone (${guildTimezone.replace(/_/g, ' ')})`}
              />
            </Box>

            {/* Trial & tag selection — direct-publish only */}
            {!roster && (
              <Box sx={{ ...sectionSx, mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#5865F2',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Trial & Tags
                </Typography>

                {/* Trial selector */}
                <FormControl fullWidth size="small" sx={{ mb: 1.25, ...glassInputSx }}>
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

                {/* Difficulty toggle */}
                <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
                  {DIFFICULTY_TAGS.map((d) => {
                    const isActive = difficulty === d;
                    const accent = TAG_COLORS[d];
                    return (
                      <Box key={d} sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        <Chip
                          label={d === 'vet' ? 'Veteran' : 'Normal'}
                          size="small"
                          variant={isActive ? 'filled' : 'outlined'}
                          onClick={() => {
                            setDifficulty((prev) => (prev === d ? null : d));
                            if (d !== 'vet') setHmEnabled(false);
                          }}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            ...(isActive
                              ? {
                                  bgcolor: accent,
                                  color: '#fff',
                                  borderColor: accent,
                                  boxShadow: `0 0 12px ${accent}40`,
                                  '&:hover': { bgcolor: accent, filter: 'brightness(0.85)' },
                                }
                              : {
                                  borderColor: `${accent}44`,
                                  color: accent,
                                  backdropFilter: 'blur(6px)',
                                  '&:hover': { bgcolor: `${accent}15`, borderColor: `${accent}88` },
                                }),
                            ...(d === 'vet' && isActive
                              ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                              : {}),
                          }}
                        />
                        {d === 'vet' && isActive && (
                          <Chip
                            label="HM"
                            size="small"
                            variant={hmEnabled ? 'filled' : 'outlined'}
                            onClick={() => setHmEnabled((prev) => !prev)}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 28,
                              cursor: 'pointer',
                              borderTopLeftRadius: 0,
                              borderBottomLeftRadius: 0,
                              ml: '-1px',
                              transition: 'all 0.15s ease',
                              ...(hmEnabled
                                ? {
                                    bgcolor: TAG_COLORS.hm,
                                    color: '#fff',
                                    borderColor: TAG_COLORS.hm,
                                    boxShadow: `0 0 12px ${TAG_COLORS.hm}40`,
                                    '&:hover': { bgcolor: TAG_COLORS.hm, filter: 'brightness(0.85)' },
                                  }
                                : {
                                    borderColor: `${TAG_COLORS.hm}44`,
                                    color: TAG_COLORS.hm,
                                    '&:hover': { bgcolor: `${TAG_COLORS.hm}15`, borderColor: `${TAG_COLORS.hm}88` },
                                  }),
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>

                {/* Selected tags + freeform input */}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 0.75,
                    mb: 0.75,
                    borderRadius: '8px',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(0,0,0,0.08)',
                    bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                    minHeight: 36,
                    transition: 'border-color 0.2s ease',
                    '&:focus-within': {
                      borderColor: isDark
                        ? 'rgba(88,101,242,0.4)'
                        : 'rgba(88,101,242,0.5)',
                    },
                  }}
                >
                  {selectedTags.map((tag) => {
                    const accent = TAG_COLORS[tag] ?? undefined;
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => {
                          if (tag === 'vet' || tag === 'normal') {
                            setDifficulty(null);
                            setHmEnabled(false);
                          } else if (tag === 'hm') {
                            setHmEnabled(false);
                          } else {
                            setExtraTags((prev) => prev.filter((t) => t !== tag));
                          }
                        }}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 24,
                          ...(accent
                            ? {
                                bgcolor: `${accent}cc`,
                                color: '#fff',
                                boxShadow: `0 0 8px ${accent}30`,
                                '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.65)' },
                                '& .MuiChip-deleteIcon:hover': { color: '#fff' },
                              }
                            : {
                                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                              }),
                        }}
                      />
                    );
                  })}
                  <TextField
                    size="small"
                    variant="standard"
                    placeholder="Add a tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.replace(/,/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const trimmed = tagInput.trim().toLowerCase();
                        if (trimmed && !selectedTags.includes(trimmed)) {
                          setExtraTags((prev) => [...prev, trimmed]);
                        }
                        setTagInput('');
                      }
                    }}
                    slotProps={{
                      htmlInput: { maxLength: 30 },
                      input: {
                        disableUnderline: true,
                        sx: {
                          fontSize: '0.78rem',
                          py: 0.25,
                          color: isDark ? 'rgba(255,255,255,0.7)' : undefined,
                        },
                      },
                    }}
                    sx={{ flex: 1, minWidth: 80 }}
                  />
                </Box>

                {/* Extra preset suggestions */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {EXTRA_PRESET_TAGS.map((tag) => {
                    const isSelected = extraTags.includes(tag);
                    const accent = TAG_COLORS[tag] ?? '#888';
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        onClick={
                          isSelected ? undefined : () => setExtraTags((prev) => [...prev, tag])
                        }
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 22,
                          cursor: isSelected ? 'default' : 'pointer',
                          opacity: isSelected ? 0.35 : 1,
                          transition: 'all 0.15s ease',
                          borderColor: `${accent}44`,
                          color: accent,
                          backdropFilter: 'blur(4px)',
                          '&:hover': isSelected
                            ? {}
                            : { bgcolor: `${accent}15`, borderColor: `${accent}88` },
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Channel name preview */}
            {!selectedChannelId &&
              (() => {
                const guildCfg = selectedGuild ? guildConfigs[selectedGuild.id] : null;
                const rawPattern = guildCfg?.namePattern;
                const isLegacy =
                  !rawPattern ||
                  rawPattern === '{label}' ||
                  rawPattern === '{day-short}-{time}-{trial}-{tag}';
                const pattern = isLegacy ? DEFAULT_NAME_PATTERN : rawPattern;
                const overrideTrimmed = channelNameOverride.trim();
                const effectiveTrial = roster ? roster.trial_id : selectedTrialId;
                const effectiveTags = roster ? (roster.tags ?? []) : selectedTags;
                const effectiveTrainer = roster ? (roster.author_name ?? '') : (authorName ?? '');
                const preview = overrideTrimmed
                  ? overrideTrimmed
                      .toLowerCase()
                      .replace(/[\s_]+/g, '-')
                      .replace(/[^a-z0-9-]/g, '')
                      .replace(/-{2,}/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 100) || 'roster'
                  : buildChannelPreview(
                      pattern,
                      eventTime,
                      guildTimezone,
                      effectiveTrial,
                      effectiveTags,
                      effectiveTrainer,
                    );
                return (
                  <Box
                    sx={{
                      mb: 1.5,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(88,101,242,0.06)' : 'rgba(88,101,242,0.04)',
                      border: isDark
                        ? '1px solid rgba(88,101,242,0.15)'
                        : '1px solid rgba(88,101,242,0.1)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mb: 0.25,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        opacity: 0.6,
                      }}
                    >
                      Channel name preview
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: '#5865F2',
                      }}
                    >
                      # {preview}
                    </Typography>
                  </Box>
                );
              })()}

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
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  px: 3,
                  background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                  boxShadow: '0 4px 16px rgba(88,101,242,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                    boxShadow: '0 6px 20px rgba(88,101,242,0.4)',
                  },
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
                    borderRadius: '10px',
                    borderColor: 'rgba(88,101,242,0.2)',
                    color: '#5865F2',
                    fontSize: '0.78rem',
                    '&:hover': {
                      borderColor: '#5865F2',
                      background: 'rgba(88,101,242,0.06)',
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
      <DialogActions
        sx={{
          px: 2.5,
          pb: 2,
          pt: 1.5,
          background: isDark
            ? 'linear-gradient(135deg, rgba(12,12,22,0.5) 0%, rgba(15,13,28,0.5) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(248,250,252,0.4) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {step === 'select' && (
          <Button
            onClick={onClose}
            sx={{
              color: 'text.secondary',
              fontSize: '0.82rem',
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
            }}
          >
            Cancel
          </Button>
        )}

        {step === 'configure' && (
          <>
            <Button
              onClick={handleBack}
              disabled={publishing}
              sx={{
                color: 'text.secondary',
                fontSize: '0.82rem',
                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
              }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => void handlePublish()}
              disabled={publishing}
              startIcon={
                publishing ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <img
                    src={discordIcon}
                    alt=""
                    style={{ width: 15, height: 15, filter: 'brightness(10)' }}
                  />
                )
              }
              sx={{
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.82rem',
                px: 2.5,
                background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                boxShadow: '0 4px 16px rgba(88,101,242,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                  boxShadow: '0 6px 20px rgba(88,101,242,0.4)',
                },
                '&.Mui-disabled': {
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
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
              borderRadius: '10px',
              fontSize: '0.82rem',
              borderColor: 'rgba(88,101,242,0.25)',
              color: '#5865F2',
              '&:hover': {
                borderColor: '#5865F2',
                background: 'rgba(88,101,242,0.06)',
              },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
