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
  Add as AddIcon,
  AdminPanelSettings,
  ArrowBack,
  Campaign,
  Check as CheckIcon,
  CheckCircle,
  ContentCopy,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Shield,
  FiberNew as NewIcon,
} from '@mui/icons-material';
import {
  alpha,
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
  Stack,
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
  getDiscordBotApiUrl,
  getMutualGuildsFromApi,
  getGuildIconUrl,
  DiscordAuthExpiredError,
} from '../../auth/discord-auth';
import { useDiscordAuth } from '../../auth/DiscordAuthContext';
import { TAG_COLORS } from '../types/roster-hub.types';
import type { HubRoster } from '../types/roster-hub.types';

import { DiscordAdminGuideSheet } from './DiscordAdminGuideSheet';
import { TRIAL_LABELS } from './RosterCard';

const DEFAULT_NAME_PATTERN = '{day-short}-{time}-{trial}';
const MAX_TAGS = 5;

const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const FULL_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type Difficulty = 'vet' | 'normal';
const EXTRA_PRESET_TAGS = ['score-push', 'farm'] as const;

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
/**
 * Preview the channel name using the same logic as the discord-bot backend
 * (discord-bot/src/roster/channel-name.ts → buildChannelName).
 */
function buildChannelPreview(ctx: {
  pattern: string;
  eventTime: CalendarDateTime | null;
  timezone: string;
  trialId: string;
  difficulty: 'vet' | 'normal' | null;
  tags: string[];
}): string {
  let dayShort = '';
  let dayFull = '';
  let time = '';

  if (ctx.eventTime) {
    const date = ctx.eventTime.toDate(ctx.timezone);
    const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: ctx.timezone, weekday: 'short' });
    const dayStr = dayFmt.format(date).toLowerCase();
    const dayIdx = SHORT_DAYS.indexOf(dayStr as (typeof SHORT_DAYS)[number]);
    const safeDayIndex = dayIdx >= 0 ? dayIdx : date.getDay();
    dayShort = SHORT_DAYS[safeDayIndex];
    dayFull = FULL_DAYS[safeDayIndex];
    const hourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: ctx.timezone,
      hour: 'numeric',
      hour12: false,
    });
    let h = parseInt(hourFmt.format(date), 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    time = `${h}${suffix}`;
  }

  // Map difficulty to backend's Difficulty type
  const diff = ctx.difficulty === 'vet' ? 'veteran' : ctx.difficulty === 'normal' ? 'normal' : null;

  // Build difficulty-prefixed trial abbreviation (mirrors buildTrialTag in backend)
  const abbrev = TRIAL_ABBREVS[ctx.trialId.toUpperCase()] ?? ctx.trialId.toLowerCase();
  const trialToken = diff && ctx.trialId ? `${diff === 'veteran' ? 'v' : 'n'}${abbrev}` : abbrev;

  // Append non-difficulty tags (hm, score-push, farm, custom) after the template.
  // Keep this logic aligned with discord-bot/src/roster/publish.ts.
  const appendTags = ctx.tags.filter((tag) => {
    const normalized = tag.toLowerCase();
    return normalized !== 'vet' && normalized !== 'veteran' && normalized !== 'normal';
  });
  const suffix = appendTags.length > 0 ? `-${appendTags.join('-')}` : '';

  const name = (
    ctx.pattern
      .replace(/{day-short}/gi, dayShort)
      .replace(/{day-full}/gi, dayFull)
      .replace(/{day}/gi, dayShort)
      .replace(/{time}/gi, time)
      .replace(/{trial}/gi, trialToken)
      .replace(/{tag}/gi, trialToken) // legacy alias
      .replace(/{trainer}/gi, '') // legacy — no longer used
      .replace(/{difficulty}/gi, diff === 'veteran' ? 'vet' : diff === 'normal' ? 'norm' : '') +
    suffix
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
  const res = await fetch(`${getDiscordBotApiUrl()}${path}`, {
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
  const [inviteCopied, setInviteCopied] = React.useState(false);
  const [adminSheetOpen, setAdminSheetOpen] = React.useState(false);
  const [previousGuildIds, setPreviousGuildIds] = React.useState<Set<string>>(new Set());
  const [newGuildIds, setNewGuildIds] = React.useState<Set<string>>(new Set());

  const copyInviteLink = React.useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(getBotInviteUrl());
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2200);
    } catch {
      /* clipboard denied — fail silently */
    }
  }, []);

  // ── Category & channel config (step 2) ──────────────────────────────────
  const [channels, setChannels] = React.useState<ChannelInfo[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
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
  const [addingCustom, setAddingCustom] = React.useState(false);
  const customInputRef = React.useRef<HTMLInputElement>(null);

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

  // ── Panel tokens (matching PlayerCardModal info modal) ──────────────
  const accent = '#5865F2'; // Discord blurple

  const sectionSx = {
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
    border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '10px',
    p: 1.5,
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontSize: 13,
      borderRadius: '10px',
      transition: 'border-color 0.2s ease',
      '& fieldset': {
        borderColor: isDark ? 'rgb(31, 41, 55)' : 'rgba(0, 0, 0, 0.12)',
      },
      '&:hover fieldset': {
        borderColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(0, 0, 0, 0.25)',
      },
      '&.Mui-focused fieldset': {
        borderColor: accent,
        borderWidth: 2,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(accent, 0.15)}`,
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
      setSelectedCategoryId('');
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

        // Pre-select category: config default → auto-detect "Open Runs" → none
        const cfg = configRes.config;
        const detectedCategory =
          cfg.defaultCategoryId ||
          channelsRes.channels.find((c) => c.type === 4 && /open\s*runs/i.test(c.name))?.id ||
          '';
        setSelectedCategoryId(detectedCategory);
        setChannelNameOverride('');
        setGuildTimezone(cfg.timezone || 'America/New_York');
      } catch {
        // Non-fatal — user can still publish without category selection
        setChannels([]);
        setSelectedCategoryId('');
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
    setSelectedCategoryId('');
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

      const categoryOverride = selectedCategoryId || undefined;

      if (roster) {
        endpoint = `${getDiscordBotApiUrl()}/discord/roster/publish`;
        body = {
          guildId: selectedGuild.id,
          rosterId: roster.id,
          categoryId: categoryOverride,
          channelNameOverride: channelOverride,
          event_time: eventTimeIso,
        };
      } else {
        endpoint = `${getDiscordBotApiUrl()}/discord/roster/publish-direct`;
        body = {
          guildId: selectedGuild.id,
          title: title ?? 'Untitled',
          description: description ?? '',
          trial_id: selectedTrialId || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          roster_data: rosterData ?? '',
          author_name: authorName ?? 'Unknown',
          categoryId: categoryOverride,
          channelNameOverride: channelOverride,
          event_time: eventTimeIso,
        };
      }

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
        cfg.namePattern !== '{day-short}-{time}-{trial}' &&
        cfg.namePattern !== '{day-short}-{time}-{tag}-{trainer}' &&
        cfg.namePattern !== '{day-short}-{time}-{trial}-{tag}')
    );
  };

  // ── Category list ─────────────────────────────────────────────────────
  const categories = channels.filter((c) => c.type === 4);

  const isCloseable = !publishing && step !== 'success';

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={open}
        onClose={isCloseable ? onClose : undefined}
        maxWidth="sm"
        fullWidth
        className="glass-dialog"
        PaperProps={{
          sx: {
            background: isDark
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
            backgroundColor: 'transparent',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.25)' : '0 4px 12px rgba(15,23,42,0.06)',
            maxHeight: '90vh',
          },
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogTitle
          sx={{
            py: 2,
            px: { xs: 2.5, sm: 3 },
            borderBottom: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
            background: 'transparent',
            color: isDark ? '#e5e7eb' : '#1e293b',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {step === 'configure' && (
              <IconButton
                onClick={handleBack}
                size="small"
                sx={{ color: 'text.secondary', mr: -0.5 }}
              >
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
                background: isDark ? alpha(accent, 0.12) : alpha(accent, 0.08),
                border: `1px solid ${isDark ? alpha(accent, 0.2) : alpha(accent, 0.15)}`,
                flexShrink: 0,
              }}
            >
              {step === 'success' ? (
                <CheckCircle sx={{ color: '#57F287', fontSize: 20 }} />
              ) : (
                <img src={discordIcon} alt="" style={{ width: 20, height: 20 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
                {step === 'success' ? 'Published!' : 'Publish to Discord'}
              </Typography>
              {step === 'select' && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  Select a server to post your roster
                </Typography>
              )}
              {step === 'configure' && selectedGuild && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ fontSize: '0.75rem' }}
                >
                  {selectedGuild.name}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            px: { xs: 2.5, sm: 3 },
            '&&': { pt: 3 },
            pb: 2.5,
            background: 'transparent',
            color: isDark ? '#e5e7eb' : '#1e293b',
          }}
        >
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
            <Box sx={{ textAlign: 'center', py: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  mx: 'auto',
                  mb: 1.5,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(135deg, rgba(88,101,242,0.18) 0%, rgba(88,101,242,0.06) 100%)',
                  border: '1px solid rgba(88,101,242,0.22)',
                }}
              >
                <img src={discordIcon} alt="" style={{ width: 24, height: 24 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
                Sign in with Discord
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, fontSize: '0.8rem', maxWidth: 360, mx: 'auto', lineHeight: 1.45 }}
              >
                We&apos;ll show which of your servers already have the ESO Toolkit bot. Not
                installed yet? A server admin needs to add it first. Takes about 60 seconds.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  // Include ?discord=1 so the page re-opens this modal after OAuth redirect
                  const returnPath = `${window.location.pathname}?discord=1`;
                  startDiscordLogin(returnPath);
                }}
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
                  textTransform: 'none',
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.25, fontSize: '0.7rem', opacity: 0.7 }}
              >
                We only read your server list, never your messages.
              </Typography>

              {/* Admin entry point — no OAuth required */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mt: 2,
                  mx: 'auto',
                  maxWidth: 340,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.68rem', color: 'text.disabled', letterSpacing: '0.04em' }}
                >
                  OR
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                />
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setAdminSheetOpen(true)}
                sx={{
                  mt: 1.25,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#5865F2',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  padding: 0,
                  '&:hover': { color: '#6973F5', textDecoration: 'underline' },
                  '&:focus-visible': { outline: '2px solid #5865F2', outlineOffset: 2 },
                }}
              >
                Running a Discord server? Install the bot →
              </Box>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                  {/* Hero */}
                  <Box
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      textAlign: 'center',
                      borderRadius: '14px',
                      px: 2.5,
                      py: 2.5,
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(88,101,242,0.16) 0%, rgba(87,242,135,0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(88,101,242,0.10) 0%, rgba(87,242,135,0.04) 100%)',
                      border: isDark
                        ? '1px solid rgba(88,101,242,0.22)'
                        : '1px solid rgba(88,101,242,0.15)',
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        top: -50,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background:
                          'radial-gradient(circle, rgba(88,101,242,0.22) 0%, transparent 70%)',
                        filter: 'blur(24px)',
                        pointerEvents: 'none',
                      }}
                    />
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          mx: 'auto',
                          mb: 1.25,
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                          boxShadow: '0 8px 24px rgba(88,101,242,0.35)',
                          animation: 'heroFloat 4s ease-in-out infinite',
                          '@keyframes heroFloat': {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-4px)' },
                          },
                        }}
                      >
                        <img
                          src={discordIcon}
                          alt=""
                          style={{ width: 26, height: 26, filter: 'brightness(10)' }}
                        />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
                        Connect a Discord server
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.78rem',
                          maxWidth: 360,
                          mx: 'auto',
                          lineHeight: 1.45,
                        }}
                      >
                        The ESO Toolkit bot posts your roster as a rich embed. A server admin adds
                        the bot once, then your team can publish anytime.
                      </Typography>
                    </Box>
                  </Box>

                  {/* How it works — 3 steps */}
                  <Box
                    sx={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isDark
                        ? '1px solid rgba(255,255,255,0.06)'
                        : '1px solid rgba(0,0,0,0.06)',
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    }}
                  >
                    {(
                      [
                        {
                          icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
                          title: 'A server admin invites the bot',
                          body: 'Requires "Manage Server" permission on Discord.',
                        },
                        {
                          icon: <Shield sx={{ fontSize: 18 }} />,
                          title: 'Admin grants role access',
                          body: 'Pick which roles (e.g. @RaidLead) can publish rosters.',
                        },
                        {
                          icon: <Campaign sx={{ fontSize: 18 }} />,
                          title: 'Your team publishes from here',
                          body: 'Anyone with an allowed role can post from this dialog.',
                        },
                      ] as const
                    ).map((s, idx, arr) => (
                      <Box
                        key={s.title}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.25,
                          px: 1.25,
                          py: 1.1,
                          borderBottom:
                            idx === arr.length - 1
                              ? 'none'
                              : isDark
                                ? '1px solid rgba(255,255,255,0.04)'
                                : '1px solid rgba(0,0,0,0.04)',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            flexShrink: 0,
                            width: 32,
                            height: 32,
                            mt: 0.25,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '10px',
                            background: isDark ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.08)',
                            color: '#5865F2',
                          }}
                        >
                          {s.icon}
                          <Box
                            aria-hidden
                            sx={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: isDark ? '#101729' : '#ffffff',
                              border: '1px solid rgba(88,101,242,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              color: '#5865F2',
                            }}
                          >
                            {idx + 1}
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3 }}
                          >
                            {s.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              lineHeight: 1.4,
                              mt: 0.125,
                              fontSize: '0.72rem',
                            }}
                          >
                            {s.body}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Actions */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.25 }}>
                    <Button
                      variant="contained"
                      href={getBotInviteUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setInviteClicked(true)}
                      startIcon={
                        <img
                          src={discordIcon}
                          alt=""
                          style={{ width: 15, height: 15, filter: 'brightness(10)' }}
                        />
                      }
                      sx={{
                        flex: 1,
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        py: 0.9,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                        boxShadow: '0 4px 16px rgba(88,101,242,0.28)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                          boxShadow: '0 6px 20px rgba(88,101,242,0.36)',
                        },
                      }}
                    >
                      Add Bot to Server
                    </Button>
                    <Tooltip
                      title={
                        inviteCopied
                          ? 'Link copied!'
                          : 'Copy invite link to share with a server admin'
                      }
                      arrow
                    >
                      <Button
                        variant="outlined"
                        onClick={() => void copyInviteLink()}
                        startIcon={
                          inviteCopied ? (
                            <CheckIcon sx={{ fontSize: '16px !important' }} />
                          ) : (
                            <ContentCopy sx={{ fontSize: '16px !important' }} />
                          )
                        }
                        sx={{
                          flex: 1,
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          py: 0.9,
                          textTransform: 'none',
                          borderColor: inviteCopied
                            ? 'rgba(87,242,135,0.45)'
                            : 'rgba(88,101,242,0.28)',
                          color: inviteCopied ? '#57F287' : '#5865F2',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: inviteCopied ? '#57F287' : '#5865F2',
                            background: inviteCopied
                              ? 'rgba(87,242,135,0.06)'
                              : 'rgba(88,101,242,0.06)',
                          },
                        }}
                      >
                        {inviteCopied ? 'Link copied' : 'Copy link for admin'}
                      </Button>
                    </Tooltip>
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      opacity: 0.75,
                      mt: -0.5,
                    }}
                  >
                    Don&apos;t have admin? Share the link with someone who has{' '}
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      Manage Server
                    </Box>
                    , then come back and refresh.
                  </Typography>

                  {/* Refresh CTA appears after invite */}
                  {inviteClicked && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RefreshIcon sx={{ fontSize: '16px !important' }} />}
                      onClick={() => void loadGuilds(true)}
                      sx={{
                        alignSelf: 'center',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        textTransform: 'none',
                        borderColor: 'rgba(87,242,135,0.3)',
                        color: '#57F287',
                        '&:hover': {
                          borderColor: '#57F287',
                          background: 'rgba(87,242,135,0.06)',
                        },
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { boxShadow: '0 0 0 0 rgba(87,242,135,0.3)' },
                          '50%': { boxShadow: '0 0 0 6px rgba(87,242,135,0)' },
                        },
                      }}
                    >
                      Refresh server list
                    </Button>
                  )}

                  {/* Disconnect link */}
                  <Typography
                    variant="caption"
                    onClick={() => {
                      clearDiscordAuth();
                    }}
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      mt: 0.5,
                      color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      '&:hover': {
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Disconnect Discord
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
                            background: isDark ? 'rgba(88,101,242,0.1)' : 'rgba(88,101,242,0.05)',
                            borderColor: isDark ? 'rgba(88,101,242,0.25)' : 'rgba(88,101,242,0.2)',
                          },
                        }}
                      >
                        <Avatar
                          src={getGuildIconUrl(guild.id, guild.icon) ?? undefined}
                          alt={guild.name}
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
                          <Tooltip
                            title={
                              configured
                                ? 'Defaults configured. Category, roles, and channel format are set.'
                                : 'Bot is installed. Admin hasn\u2019t set defaults yet (category, role access), but you can still publish.'
                            }
                            arrow
                          >
                            <Chip
                              size="small"
                              label={configured ? 'Ready' : 'Setup needed'}
                              sx={{
                                mt: 0.25,
                                height: 18,
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                bgcolor: configured
                                  ? 'rgba(87,242,135,0.12)'
                                  : 'rgba(254,185,0,0.12)',
                                color: configured ? '#57F287' : '#FEB900',
                                border: configured
                                  ? '1px solid rgba(87,242,135,0.25)'
                                  : '1px solid rgba(254,185,0,0.25)',
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                          </Tooltip>
                        </Box>

                        <Tooltip title="Advanced settings">
                          <IconButton
                            size="small"
                            onClick={(e: React.MouseEvent) => {
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

              {/* ── Add Bot / Refresh / Disconnect (only when we already have guilds) ── */}
              {guilds.length > 0 && (
                <>
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
                        textTransform: 'none',
                        borderColor: 'rgba(88,101,242,0.25)',
                        color: '#5865F2',
                        '&:hover': {
                          borderColor: '#5865F2',
                          background: 'rgba(88,101,242,0.06)',
                        },
                      }}
                    >
                      Add Bot to Another Server
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
                          textTransform: 'none',
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

                  {/* Persistent admin link — re-installs, adding scopes elsewhere */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mt: 1.75,
                      pt: 1.5,
                      borderTop: isDark
                        ? '1px solid rgba(255,255,255,0.05)'
                        : '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setAdminSheetOpen(true)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#5865F2',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        padding: 0,
                        '&:hover': { color: '#6973F5', textDecoration: 'underline' },
                        '&:focus-visible': { outline: '2px solid #5865F2', outlineOffset: 2 },
                      }}
                    >
                      Need to install on another server? Open admin guide →
                    </Box>
                  </Box>

                  <Typography
                    variant="caption"
                    onClick={() => {
                      clearDiscordAuth();
                    }}
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      mt: 1.5,
                      color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      '&:hover': {
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Disconnect Discord
                  </Typography>
                </>
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
                    borderColor: 'rgba(254,185,0,0.22)',
                    background: isDark ? 'rgba(254,185,0,0.04)' : 'rgba(254,185,0,0.03)',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                    <Shield sx={{ fontSize: 16, color: '#FEB900' }} />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: '#FEB900', fontSize: '0.82rem' }}
                    >
                      First time publishing here?
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.5, mb: 0.75 }}
                  >
                    You can publish now, or a server admin can{' '}
                    <Box
                      component="span"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onClose();
                        navigate(`/discord-server-config?guild=${selectedGuild.id}&from=publish`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onClose();
                          navigate(`/discord-server-config?guild=${selectedGuild.id}&from=publish`);
                        }
                      }}
                      sx={{
                        color: '#5865F2',
                        cursor: 'pointer',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textDecorationThickness: '1px',
                        textUnderlineOffset: '2px',
                        '&:hover': { color: '#6973F5' },
                      }}
                    >
                      open server settings
                    </Box>{' '}
                    to configure defaults:
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      m: 0,
                      pl: 2.25,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.25,
                      '& li': {
                        fontSize: '0.72rem',
                        lineHeight: 1.5,
                        color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
                        '&::marker': { color: '#FEB900' },
                      },
                      '& li strong': {
                        color: isDark ? '#e5e7eb' : '#1e293b',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <li>
                      <strong>Default category</strong> for new roster channels
                    </li>
                    <li>
                      <strong>Role access</strong>: grant specific roles permission to publish
                    </li>
                    <li>
                      <strong>Channel-name format</strong> (day, time, trial)
                    </li>
                  </Box>
                </Box>
              )}

              {/* Category selection */}
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
                      mb: 0.5,
                    }}
                  >
                    Category
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                      fontSize: '0.68rem',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    A new channel will be created inside this category
                  </Typography>

                  <FormControl fullWidth size="small" sx={inputSx}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategoryId}
                      label="Category"
                      onChange={(e: SelectChangeEvent) => setSelectedCategoryId(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>No category (server root)</em>
                      </MenuItem>
                      {categories.map((cat) => {
                        const isOpenRuns = /open\s*runs/i.test(cat.name);
                        return (
                          <MenuItem key={cat.id} value={cat.id}>
                            <Box
                              sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}
                            >
                              <span>{cat.name}</span>
                              {isOpenRuns && (
                                <Chip
                                  label="Detected"
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    ml: 'auto',
                                    background:
                                      'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))',
                                    border: '1px solid rgba(34,197,94,0.3)',
                                    color: '#22c55e',
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {/* Custom channel name */}
                  <TextField
                    label="Custom channel name"
                    placeholder="Leave blank for auto-generated name"
                    value={channelNameOverride}
                    onChange={(e) => setChannelNameOverride(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1.25, ...inputSx }}
                    helperText="Optional. Overrides the server's name pattern for this roster."
                  />
                </Box>
              )}

              {/* Event date & time */}
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
                  Event Time
                </Typography>
                <DatePicker
                  label="Date & Time"
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
                  <FormControl fullWidth size="small" sx={{ mb: 1.25, ...inputSx }}>
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

                  {/* ── Unified chip flow: difficulty toggle → presets → +custom ── */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.75,
                      alignItems: 'center',
                      mb: selectedTags.length > 0 ? 0 : undefined,
                    }}
                  >
                    {/* ── Segmented difficulty toggle ── */}
                    {(() => {
                      const cNorm = TAG_COLORS.normal;
                      const cVet = TAG_COLORS.vet;
                      const cHm = TAG_COLORS.hm;
                      const segBtn = (
                        label: string,
                        isActive: boolean,
                        color: string,
                        onClick: () => void,
                        pos: 'left' | 'mid' | 'right' | 'solo',
                      ): React.ReactNode => {
                        const radiusMap = {
                          left: '20px 0 0 20px',
                          mid: '0',
                          right: '0 20px 20px 0',
                          solo: '20px',
                        };
                        return (
                          <Box
                            key={label}
                            onClick={onClick}
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                              borderRadius: radiusMap[pos],
                              position: 'relative',
                              zIndex: isActive ? 2 : 1,
                              userSelect: 'none',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              color: isActive ? color : isDark ? `${color}90` : `${color}80`,
                              background: isActive
                                ? `linear-gradient(135deg, ${color}35 0%, ${color}20 50%, ${color}10 100%)`
                                : 'transparent',
                              boxShadow: isActive
                                ? isDark
                                  ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                                  : `0 0 8px ${color}18`
                                : 'none',
                              textShadow: isActive && isDark ? `0 0 12px ${color}50` : 'none',
                              '&:hover': {
                                color,
                                background: isActive
                                  ? `linear-gradient(135deg, ${color}40 0%, ${color}25 50%, ${color}14 100%)`
                                  : `linear-gradient(135deg, ${color}18 0%, ${color}0a 100%)`,
                                ...(isActive
                                  ? {
                                      boxShadow: isDark
                                        ? `0 0 20px ${color}35, inset 0 1px 0 rgba(255,255,255,0.15)`
                                        : `0 0 12px ${color}25`,
                                    }
                                  : {}),
                              },
                            }}
                          >
                            {label}
                          </Box>
                        );
                      };
                      const showHm = difficulty === 'vet';
                      return (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 30,
                            borderRadius: '20px',
                            border: isDark
                              ? '1px solid rgba(255,255,255,0.1)'
                              : '1px solid rgba(0,0,0,0.1)',
                            background: isDark
                              ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                              : 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)',
                            backdropFilter: 'blur(8px)',
                            overflow: 'hidden',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isDark
                              ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                              : '0 1px 4px rgba(0,0,0,0.06)',
                          }}
                        >
                          {segBtn(
                            'Normal',
                            difficulty === 'normal',
                            cNorm,
                            () => {
                              setDifficulty((prev) => (prev === 'normal' ? null : 'normal'));
                              setHmEnabled(false);
                            },
                            'left',
                          )}
                          <Box
                            sx={{
                              width: '1px',
                              height: 16,
                              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              flexShrink: 0,
                            }}
                          />
                          {segBtn(
                            'Veteran',
                            difficulty === 'vet',
                            cVet,
                            () => {
                              setDifficulty((prev) => (prev === 'vet' ? null : 'vet'));
                              if (difficulty === 'vet') setHmEnabled(false);
                            },
                            showHm ? 'mid' : 'right',
                          )}
                          {showHm && (
                            <>
                              <Box
                                sx={{
                                  width: '1px',
                                  height: 16,
                                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                  flexShrink: 0,
                                }}
                              />
                              {segBtn(
                                'HM',
                                hmEnabled,
                                cHm,
                                () => setHmEnabled((prev) => !prev),
                                'right',
                              )}
                            </>
                          )}
                        </Box>
                      );
                    })()}

                    {/* Divider dot */}
                    <Box
                      sx={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      }}
                    />

                    {/* Preset suggestions (not yet selected) */}
                    {EXTRA_PRESET_TAGS.filter((tag) => !extraTags.includes(tag)).map((tag) => {
                      const isDisabled = selectedTags.length >= MAX_TAGS;
                      const c = TAG_COLORS[tag] ?? '#888';
                      return (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          onClick={
                            isDisabled ? undefined : () => setExtraTags((prev) => [...prev, tag])
                          }
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            height: 26,
                            borderRadius: '28px',
                            cursor: isDisabled ? 'default' : 'pointer',
                            opacity: isDisabled ? 0.3 : 1,
                            transition: 'all 0.3s ease',
                            background: isDark
                              ? `linear-gradient(135deg, ${c}12 0%, ${c}08 100%)`
                              : `linear-gradient(135deg, ${c}0a 0%, ${c}05 100%)`,
                            border: `1px solid ${c}30`,
                            color: c,
                            backdropFilter: 'blur(6px)',
                            '& .MuiChip-label': { opacity: 0.7 },
                            '&:hover': isDisabled
                              ? {}
                              : {
                                  background: isDark
                                    ? `linear-gradient(135deg, ${c}28 0%, ${c}18 100%)`
                                    : `linear-gradient(135deg, ${c}1a 0%, ${c}0d 100%)`,
                                  borderColor: `${c}55`,
                                  boxShadow: `0 2px 8px ${c}1a`,
                                  transform: 'translateY(-1px)',
                                  '& .MuiChip-label': { opacity: 1 },
                                },
                          }}
                        />
                      );
                    })}

                    {/* "+ Custom" chip / inline input */}
                    {selectedTags.length < MAX_TAGS &&
                      (addingCustom ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 26,
                            borderRadius: '28px',
                            border: isDark
                              ? '1px solid rgba(88,101,242,0.4)'
                              : '1px solid rgba(88,101,242,0.5)',
                            background: isDark
                              ? 'linear-gradient(135deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.06) 100%)'
                              : 'linear-gradient(135deg, rgba(88,101,242,0.08) 0%, rgba(88,101,242,0.03) 100%)',
                            boxShadow: isDark
                              ? '0 0 12px rgba(88,101,242,0.15)'
                              : '0 0 8px rgba(88,101,242,0.1)',
                            px: 1.25,
                            gap: 0.5,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <AddIcon sx={{ fontSize: 14, color: accent, opacity: 0.6 }} />
                          <input
                            ref={customInputRef}
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value.replace(/,/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const trimmed = tagInput.trim().toLowerCase();
                                if (trimmed && !selectedTags.includes(trimmed))
                                  setExtraTags((prev) => [...prev, trimmed]);
                                setTagInput('');
                              } else if (e.key === 'Escape') {
                                setTagInput('');
                                setAddingCustom(false);
                              }
                            }}
                            onBlur={() => {
                              const trimmed = tagInput.trim().toLowerCase();
                              if (trimmed && !selectedTags.includes(trimmed))
                                setExtraTags((prev) => [...prev, trimmed]);
                              setTagInput('');
                              setAddingCustom(false);
                            }}
                            placeholder="type & enter"
                            maxLength={30}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: isDark ? '#e5e7eb' : '#1e293b',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              width: 90,
                              fontFamily: 'inherit',
                            }}
                          />
                        </Box>
                      ) : (
                        <Chip
                          icon={<AddIcon sx={{ fontSize: 15 }} />}
                          label="Custom"
                          size="small"
                          onClick={() => {
                            setAddingCustom(true);
                            setTimeout(() => customInputRef.current?.focus(), 0);
                          }}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            height: 26,
                            borderRadius: '28px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            background: isDark
                              ? 'linear-gradient(135deg, rgba(88,101,242,0.10) 0%, rgba(88,101,242,0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(88,101,242,0.06) 0%, rgba(88,101,242,0.02) 100%)',
                            border: isDark
                              ? '1px dashed rgba(88,101,242,0.3)'
                              : '1px dashed rgba(88,101,242,0.35)',
                            color: isDark ? 'rgba(88,101,242,0.7)' : 'rgba(88,101,242,0.8)',
                            '& .MuiChip-icon': {
                              color: isDark ? 'rgba(88,101,242,0.5)' : 'rgba(88,101,242,0.6)',
                            },
                            '&:hover': {
                              background: isDark
                                ? 'linear-gradient(135deg, rgba(88,101,242,0.20) 0%, rgba(88,101,242,0.10) 100%)'
                                : 'linear-gradient(135deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.06) 100%)',
                              borderColor: isDark ? 'rgba(88,101,242,0.5)' : 'rgba(88,101,242,0.6)',
                              color: accent,
                              boxShadow: '0 2px 8px rgba(88,101,242,0.15)',
                              transform: 'translateY(-1px)',
                              '& .MuiChip-icon': { color: accent },
                            },
                          }}
                        />
                      ))}
                  </Box>

                  {/* ── Selected tags (removable) ── */}
                  {selectedTags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {selectedTags.map((tag) => {
                        const c = TAG_COLORS[tag] ?? (isDark ? '#94a3b8' : '#64748b');
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
                              height: 26,
                              borderRadius: '28px',
                              background: `linear-gradient(135deg, ${c}40 0%, ${c}26 50%, ${c}14 100%)`,
                              border: `1px solid ${c}4d`,
                              color: c,
                              boxShadow: isDark
                                ? `0 2px 8px ${c}25, inset 0 1px 0 rgba(255,255,255,0.1)`
                                : `0 1px 4px ${c}20`,
                              '& .MuiChip-label': {
                                textShadow: isDark ? `0 0 8px ${c}40` : 'none',
                              },
                              '& .MuiChip-deleteIcon': { color: `${c}80`, '&:hover': { color: c } },
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}

              {/* Channel name preview */}
              {(() => {
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
                // Resolve difficulty: use form state for direct-publish, extract from tags for hub rosters
                const effectiveDifficulty: 'vet' | 'normal' | null = roster
                  ? (roster.tags ?? []).includes('vet')
                    ? 'vet'
                    : (roster.tags ?? []).includes('normal')
                      ? 'normal'
                      : null
                  : difficulty;
                const preview = overrideTrimmed
                  ? overrideTrimmed
                      .toLowerCase()
                      .replace(/[\s_]+/g, '-')
                      .replace(/[^a-z0-9-]/g, '')
                      .replace(/-{2,}/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 100) || 'roster'
                  : buildChannelPreview({
                      pattern,
                      eventTime,
                      timezone: guildTimezone,
                      trialId: effectiveTrial,
                      difficulty: effectiveDifficulty,
                      tags: effectiveTags,
                    });
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
                    Configure Server Defaults
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* ── Error display ─────────────────────────────────────────── */}
          {error && (
            <Box
              sx={{
                mt: 2,
                px: 1.5,
                py: 1,
                borderRadius: '10px',
                bgcolor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#ef4444', fontSize: '0.82rem' }}>
                {error}
              </Typography>
            </Box>
          )}
        </DialogContent>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 1.5,
            borderTop: isDark ? '1px solid #1f2937' : '1px solid rgba(0, 0, 0, 0.08)',
            background: 'transparent',
            color: isDark ? '#e5e7eb' : '#1e293b',
            gap: 1.5,
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
                  background: `linear-gradient(135deg, ${accent} 0%, #4752C4 100%)`,
                  boxShadow: `0 4px 12px ${alpha(accent, 0.2)}`,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                    boxShadow: `0 6px 16px ${alpha(accent, 0.3)}`,
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
                borderColor: alpha(accent, 0.25),
                color: accent,
                '&:hover': {
                  borderColor: accent,
                  background: alpha(accent, 0.06),
                },
              }}
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <DiscordAdminGuideSheet
        open={adminSheetOpen}
        onClose={() => setAdminSheetOpen(false)}
        guildId={selectedGuild?.id}
        guildName={selectedGuild?.name}
        botPresent={selectedGuild ? true : undefined}
        configured={selectedGuild ? isGuildConfigured(selectedGuild.id) : undefined}
      />
    </>
  );
};
