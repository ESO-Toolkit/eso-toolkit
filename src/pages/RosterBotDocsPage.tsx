/**
 * Operator guide for the ESO Toolkit Discord roster bot.
 *
 * A standalone, link-friendly docs page (route: /docs/discord-roster-bot) that
 * teaches raid leads and server admins how to operate the bot end-to-end:
 * inviting it, configuring access, publishing rosters, member sign-ups, and
 * keeping a posted roster in sync.
 *
 * This is hand-built rather than markdown-rendered (cf. CalculationKnowledgeBasePage)
 * so the command reference can offer copy-to-clipboard, the Discord brand styling
 * matches DiscordAdminGuideContent, and the page works unauthenticated — a teammate
 * can DM it to whoever holds "Manage Server".
 */

import {
  ArrowForward,
  AutoMode,
  Bolt,
  Campaign,
  Check as CheckIcon,
  ContentCopy,
  ExpandMore,
  HelpOutlined,
  Login as LoginIcon,
  Publish as PublishIcon,
  Settings as SettingsIcon,
  Shield,
  Tag as TagIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { usePageTitle } from '@/hooks/useDocumentTitle';

import discordIcon from '../assets/discord-icon.svg';
import { getBotInviteUrl } from '../features/auth/discord-auth';

const DISCORD_BLURPLE = '#5865F2';
const DISCORD_BLURPLE_DARK = '#4752C4';
const DISCORD_GREEN = '#57F287';

// ── Reusable copy-to-clipboard for slash commands ───────────────────────────

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — fail silently */
    }
  }, [value]);

  return (
    <Tooltip title={copied ? 'Copied!' : (label ?? 'Copy command')} arrow>
      <Button
        size="small"
        onClick={() => void copy()}
        aria-label={copied ? 'Command copied' : `Copy ${value}`}
        sx={{
          minWidth: 0,
          px: 0.75,
          py: 0.25,
          color: copied ? DISCORD_GREEN : 'text.secondary',
          '&:hover': { color: copied ? DISCORD_GREEN : DISCORD_BLURPLE, background: 'transparent' },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
      </Button>
    </Tooltip>
  );
};

// ── Command reference data ──────────────────────────────────────────────────

interface CommandSpec {
  command: string;
  summary: string;
  /** Argument hints, exactly as registered with Discord. */
  args?: ReadonlyArray<{ name: string; required: boolean; desc: string }>;
  /** Who can run it. */
  access: string;
}

interface CommandGroup {
  title: string;
  blurb: string;
  icon: React.ReactNode;
  commands: ReadonlyArray<CommandSpec>;
}

const COMMAND_GROUPS: ReadonlyArray<CommandGroup> = [
  {
    title: 'Publishing & syncing',
    blurb:
      'The day-to-day commands a raid lead uses to get a roster into Discord and keep it current.',
    icon: <PublishIcon sx={{ fontSize: 18 }} />,
    commands: [
      {
        command: '/roster link',
        summary:
          'Link an ESO Toolkit roster to this server and publish it in one step. Paste the roster URL or its ID.',
        access: 'Publisher role (or admins until one is set)',
        args: [
          {
            name: 'roster',
            required: true,
            desc: 'Roster URL or ID, e.g. https://esotk.com/roster-hub/ABC123',
          },
        ],
      },
      {
        command: '/roster publish',
        summary:
          'Publish a roster to a fresh Discord channel by ID. Optionally override the channel name or the category it lands in.',
        access: 'Publisher role (or admins until one is set)',
        args: [
          { name: 'roster-id', required: true, desc: 'ESO Toolkit roster ID' },
          {
            name: 'channel-name',
            required: false,
            desc: 'Override the auto-generated channel name',
          },
          { name: 'category', required: false, desc: 'Category to create the channel in' },
        ],
      },
      {
        command: '/roster refresh',
        summary:
          'Re-sync the roster in the current channel from ESO Toolkit. Run it after editing the roster on the website. The 🔄 Refresh button on the post does the same thing.',
        access: 'Publisher role (or admins until one is set)',
      },
    ],
  },
  {
    title: 'Getting started',
    blurb: 'Run these once when you first add the bot to a server.',
    icon: <Bolt sx={{ fontSize: 18 }} />,
    commands: [
      {
        command: '/roster setup',
        summary:
          'Show an interactive getting-started checklist with the exact config commands for your server.',
        access: 'Manage Server',
      },
      {
        command: '/roster config list',
        summary:
          'Show the current configuration: allowed roles, name pattern, default category, and role pings.',
        access: 'Manage Server',
      },
    ],
  },
  {
    title: 'Configuration',
    blurb:
      'Tune who can publish, where channels are created, how they are named, and which roles get pinged.',
    icon: <SettingsIcon sx={{ fontSize: 18 }} />,
    commands: [
      {
        command: '/roster config set-role',
        summary:
          'Set the role allowed to publish and refresh rosters (replaces any existing allowed roles). Once a role is set it is required for publishing — even Manage Server admins must hold it. With no role configured, only Manage Server admins can publish.',
        access: 'Manage Server',
        args: [{ name: 'role', required: true, desc: 'Role to allow' }],
      },
      {
        command: '/roster config add-role',
        summary: 'Add another allowed publisher role, keeping the existing ones.',
        access: 'Manage Server',
        args: [{ name: 'role', required: true, desc: 'Role to add' }],
      },
      {
        command: '/roster config remove-role',
        summary: 'Remove a role from the allowed publisher list.',
        access: 'Manage Server',
        args: [{ name: 'role', required: true, desc: 'Role to remove' }],
      },
      {
        command: '/roster config set-default-category',
        summary: 'Choose the category new roster channels are created under.',
        access: 'Manage Server',
        args: [{ name: 'category', required: true, desc: 'Category channel' }],
      },
      {
        command: '/roster config set-name-pattern',
        summary:
          'Set the template used to name auto-created roster channels. Default: {day-short}-{time}-{trial}.',
        access: 'Manage Server',
        args: [{ name: 'pattern', required: true, desc: 'Naming template using the tokens below' }],
      },
      {
        command: '/roster config set-role-pings',
        summary:
          'Pick the roles to ping when a published roster needs tanks, healers, or DDs. Use the clear-* options to stop pinging a role.',
        access: 'Manage Server',
        args: [
          { name: 'tank-role', required: false, desc: 'Tank role to ping' },
          { name: 'healer-role', required: false, desc: 'Healer role to ping' },
          { name: 'dd-role', required: false, desc: 'DD role to ping' },
          {
            name: 'clear-tank / clear-healer / clear-dd',
            required: false,
            desc: 'Stop pinging that role',
          },
        ],
      },
    ],
  },
];

// ── Channel name tokens ─────────────────────────────────────────────────────

const NAME_TOKENS: ReadonlyArray<{ token: string; example: string; desc: string }> = [
  { token: '{day-short}', example: 'sun', desc: 'Three-letter day of the run' },
  { token: '{day-full}', example: 'sunday', desc: 'Full day name' },
  { token: '{time}', example: '8pm', desc: '12-hour start time' },
  {
    token: '{trial}',
    example: 'vlc',
    desc: 'Trial abbreviation with difficulty prefix (v = vet, n = normal)',
  },
  { token: '{difficulty}', example: 'vet', desc: '“vet” or “norm”' },
];

// ── Member-facing buttons on a published roster ─────────────────────────────

const ROSTER_BUTTONS: ReadonlyArray<{ emoji: string; label: string; desc: string }> = [
  {
    emoji: '🛡️',
    label: 'Tank',
    desc: 'Posts that you’re interested in tanking so a raid lead can confirm your slot.',
  },
  {
    emoji: '💚',
    label: 'Healer',
    desc: 'Flags your interest in a healer slot.',
  },
  {
    emoji: '⚔️',
    label: 'DD',
    desc: 'Flags your interest in a damage slot.',
  },
  {
    emoji: '🔗',
    label: 'View on ESO Toolkit',
    desc: 'Opens the full interactive roster (gear, scripts, notes) on the website.',
  },
  {
    emoji: '🔄',
    label: 'Refresh',
    desc: 'Re-pulls the latest roster from ESO Toolkit. Restricted to publishers.',
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export const RosterBotDocsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  usePageTitle('/docs/discord-roster-bot');

  const cardSx = {
    borderRadius: '16px',
    p: { xs: 2.5, md: 3 },
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
  } as const;

  const codeChipSx = {
    fontFamily: "Consolas, Monaco, 'Fira Code', monospace",
    fontWeight: 600,
    fontSize: '0.92rem',
    color: isDark ? '#c7d2fe' : DISCORD_BLURPLE_DARK,
    background: isDark ? 'rgba(88,101,242,0.16)' : 'rgba(88,101,242,0.10)',
    borderRadius: '8px',
    px: 1,
    py: 0.4,
    display: 'inline-block',
    maxWidth: '100%',
    // Long slash commands (e.g. /roster config set-default-category) must wrap
    // rather than force horizontal overflow on narrow mobile viewports.
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  } as const;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          mb: 4,
          background: isDark
            ? 'linear-gradient(135deg, rgba(88,101,242,0.22) 0%, rgba(87,242,135,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(88,101,242,0.12) 0%, rgba(87,242,135,0.05) 100%)',
          border: isDark ? '1px solid rgba(88,101,242,0.28)' : '1px solid rgba(88,101,242,0.18)',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: `linear-gradient(135deg, ${DISCORD_BLURPLE} 0%, ${DISCORD_BLURPLE_DARK} 100%)`,
              boxShadow: '0 8px 24px rgba(88,101,242,0.35)',
            }}
          >
            <img
              src={discordIcon}
              alt=""
              style={{ width: 28, height: 28, filter: 'brightness(10)' }}
            />
          </Box>
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.4rem' }, lineHeight: 1.1 }}
            >
              Discord Roster Bot
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Publish ESO Toolkit rosters straight into your Discord, take sign-ups, and keep
              everything in sync.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            href={getBotInviteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={
              <img
                src={discordIcon}
                alt=""
                style={{ width: 16, height: 16, filter: 'brightness(10)' }}
              />
            }
            sx={{
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              py: 1,
              // Force white text + shadow so the label keeps AA contrast on the
              // blurple gradient regardless of the active theme's contrastText.
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              background: `linear-gradient(135deg, ${DISCORD_BLURPLE} 0%, ${DISCORD_BLURPLE_DARK} 100%)`,
              boxShadow: '0 4px 16px rgba(88,101,242,0.35)',
              '&:hover': {
                color: '#fff',
                background: `linear-gradient(135deg, ${DISCORD_BLURPLE_DARK} 0%, #3a44a8 100%)`,
                boxShadow: '0 6px 22px rgba(88,101,242,0.5)',
              },
            }}
          >
            Invite the bot
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/discord-server-config"
            startIcon={<SettingsIcon />}
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1,
              borderColor: 'rgba(88,101,242,0.4)',
              color: isDark ? '#c7d2fe' : DISCORD_BLURPLE,
              '&:hover': { borderColor: DISCORD_BLURPLE, background: 'rgba(88,101,242,0.06)' },
            }}
          >
            Configure on the web
          </Button>
          <Button
            variant="text"
            component={RouterLink}
            to="/discord-setup"
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            Install guide →
          </Button>
        </Stack>
      </Box>

      {/* ── What it does ─────────────────────────────────────────────── */}
      <SectionHeading icon={<Campaign sx={{ color: DISCORD_BLURPLE }} />} title="What it does" />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          mb: 5,
        }}
      >
        {[
          {
            icon: <PublishIcon sx={{ color: DISCORD_BLURPLE }} />,
            title: 'Publish rosters',
            body: 'Turn any ESO Toolkit roster into a Discord channel with a formatted post — tanks, healers, DDs, gear, and notes.',
          },
          {
            icon: <Shield sx={{ color: DISCORD_BLURPLE }} />,
            title: 'Take sign-ups',
            body: 'Members tap Tank / Healer / DD to flag interest, and the right roles get pinged automatically when you publish.',
          },
          {
            icon: <AutoMode sx={{ color: DISCORD_BLURPLE }} />,
            title: 'Stay in sync',
            body: 'Edit the roster on the website, hit Refresh, and the Discord post updates in place — no re-posting.',
          },
        ].map((card) => (
          <Box key={card.title} sx={cardSx}>
            <Box sx={{ mb: 1 }}>{card.icon}</Box>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{card.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
              {card.body}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Quick start ──────────────────────────────────────────────── */}
      <SectionHeading icon={<Bolt sx={{ color: DISCORD_BLURPLE }} />} title="Quick start" />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Stack spacing={2.5} divider={<Divider flexItem />}>
          {[
            {
              n: 1,
              title: 'Invite the bot',
              body: (
                <>
                  Use the <strong>Invite the bot</strong> button above. You’ll need{' '}
                  <strong>Manage Server</strong> in Discord. Not the admin? Send them the{' '}
                  <RouterLink
                    to="/discord-setup"
                    style={{ color: DISCORD_BLURPLE, fontWeight: 600 }}
                  >
                    install guide
                  </RouterLink>
                  .
                </>
              ),
            },
            {
              n: 2,
              title: 'Pick who can publish',
              body: (
                <>
                  Run{' '}
                  <Box component="code" sx={codeChipSx}>
                    /roster config set-role @RaidLead
                  </Box>{' '}
                  so your leads can post rosters. Once a role is set, publishing requires it — even
                  admins. With no role configured, only Manage Server admins can publish.
                </>
              ),
            },
            {
              n: 3,
              title: '(Optional) Set defaults',
              body: (
                <>
                  Choose a category with{' '}
                  <Box component="code" sx={codeChipSx}>
                    /roster config set-default-category
                  </Box>{' '}
                  and customise channel names with{' '}
                  <Box component="code" sx={codeChipSx}>
                    /roster config set-name-pattern
                  </Box>
                  .
                </>
              ),
            },
            {
              n: 4,
              title: 'Publish your first roster',
              body: (
                <>
                  Build a roster on the site, copy its link, then run{' '}
                  <Box component="code" sx={codeChipSx}>
                    /roster link &lt;url&gt;
                  </Box>
                  . The bot creates the channel, posts the roster, and pings the roles you
                  configured.
                </>
              ),
            },
          ].map((step) => (
            <Stack key={step.n} direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#fff',
                  background: `linear-gradient(135deg, ${DISCORD_BLURPLE} 0%, ${DISCORD_BLURPLE_DARK} 100%)`,
                }}
              >
                {step.n}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.25 }}>{step.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {step.body}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Command reference ────────────────────────────────────────── */}
      <SectionHeading
        icon={<TagIcon sx={{ color: DISCORD_BLURPLE }} />}
        title="Command reference"
      />
      <Stack spacing={3} sx={{ mb: 5 }}>
        {COMMAND_GROUPS.map((group) => (
          <Box key={group.title}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 0.5, color: DISCORD_BLURPLE }}
            >
              {group.icon}
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary' }}>
                {group.title}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              {group.blurb}
            </Typography>
            <Stack spacing={1.5}>
              {group.commands.map((cmd) => (
                <Box key={cmd.command} sx={cardSx}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}
                  >
                    <Box
                      component="code"
                      sx={{ ...codeChipSx, fontSize: '1rem', minWidth: 0, flexShrink: 1 }}
                    >
                      {cmd.command}
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>
                      <CopyButton value={cmd.command} />
                    </Box>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center', mb: 0.75, color: 'text.secondary' }}
                  >
                    <Shield sx={{ fontSize: 14, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {cmd.access}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                    {cmd.summary}
                  </Typography>
                  {cmd.args && cmd.args.length > 0 && (
                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
                      {cmd.args.map((arg) => (
                        <Box component="li" key={arg.name} sx={{ mb: 0.25 }}>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
                          >
                            <Box
                              component="code"
                              sx={{
                                fontFamily: "Consolas, Monaco, 'Fira Code', monospace",
                                fontWeight: 600,
                                color: 'text.primary',
                              }}
                            >
                              {arg.name}
                            </Box>{' '}
                            {arg.required ? (
                              <Box
                                component="span"
                                sx={{ color: DISCORD_BLURPLE, fontWeight: 600 }}
                              >
                                (required)
                              </Box>
                            ) : (
                              <Box component="span" sx={{ opacity: 0.7 }}>
                                (optional)
                              </Box>
                            )}{' '}
                            — {arg.desc}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* ── Sign-ups ─────────────────────────────────────────────────── */}
      <SectionHeading
        icon={<Shield sx={{ color: DISCORD_BLURPLE }} />}
        title="How members sign up"
      />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
          Every published roster carries a row of buttons. Sign-up buttons post a public message
          flagging interest — a raid lead still confirms the slot, so nothing is locked in
          automatically.
        </Typography>
        <Stack spacing={1.25}>
          {ROSTER_BUTTONS.map((b) => (
            <Stack key={b.label} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  flexShrink: 0,
                  minWidth: 40,
                  height: 28,
                  px: 1,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isDark ? '#c7d2fe' : DISCORD_BLURPLE_DARK,
                  background: isDark ? 'rgba(88,101,242,0.16)' : 'rgba(88,101,242,0.1)',
                }}
              >
                {b.emoji}
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {b.label}
                </Box>{' '}
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  — {b.desc}
                </Box>
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Channel naming ───────────────────────────────────────────── */}
      <SectionHeading
        icon={<TagIcon sx={{ color: DISCORD_BLURPLE }} />}
        title="Channel name tokens"
      />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
          Set a template with{' '}
          <Box component="code" sx={codeChipSx}>
            /roster config set-name-pattern
          </Box>
          . The default{' '}
          <Box component="code" sx={codeChipSx}>
            {'{day-short}-{time}-{trial}'}
          </Box>{' '}
          produces channels like{' '}
          <Box component="code" sx={codeChipSx}>
            sun-8pm-vlc
          </Box>
          .
        </Typography>
        <Stack spacing={1} divider={<Divider flexItem />}>
          {NAME_TOKENS.map((t) => (
            <Stack
              key={t.token}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.25, sm: 2 }}
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
            >
              <Box component="code" sx={{ ...codeChipSx, minWidth: 120 }}>
                {t.token}
              </Box>
              <Box
                component="code"
                sx={{ ...codeChipSx, minWidth: 70, fontSize: '0.82rem', opacity: 0.85 }}
              >
                {t.example}
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.desc}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Permissions ──────────────────────────────────────────────── */}
      <SectionHeading
        icon={<LoginIcon sx={{ color: DISCORD_BLURPLE }} />}
        title="Who can do what"
      />
      <Box sx={{ ...cardSx, mb: 5 }}>
        <Stack spacing={1.5}>
          <PermRow
            role="Server admins (Manage Server)"
            can="Invite the bot and run every /roster config command. They can also publish and refresh — but once a publisher role is configured, an admin needs that role too."
          />
          <PermRow
            role="Publisher role (set via set-role / add-role)"
            can="Publish, link, and refresh rosters. Cannot change configuration."
          />
          <PermRow
            role="Everyone else"
            can="Tap the Tank / Healer / DD sign-up buttons and open the roster on ESO Toolkit."
          />
        </Stack>
      </Box>

      {/* ── Troubleshooting ──────────────────────────────────────────── */}
      <SectionHeading icon={<HelpOutlined sx={{ color: '#FEB900' }} />} title="Troubleshooting" />
      <Stack spacing={1.25} sx={{ mb: 5 }}>
        {[
          {
            q: '“You do not have permission to publish rosters.”',
            a: 'Ask an admin to grant your role with /roster config set-role, or have someone with Manage Server publish.',
          },
          {
            q: '“No roster is linked to this channel.”',
            a: 'Run /roster refresh inside a channel the bot created with /roster link or /roster publish. Use /roster link first if the roster was never posted here.',
          },
          {
            q: 'The bot posts but can’t create a channel',
            a: 'It needs Manage Channels plus View Channel, Send Messages, and Embed Links — check for channel- or category-level permission overrides that deny the bot.',
          },
          {
            q: 'Refresh says it can’t find the post',
            a: 'The roster message was deleted. Re-publish it with /roster link or /roster publish.',
          },
          {
            q: 'Slash commands don’t appear',
            a: 'Give Discord a minute after inviting the bot, then fully reload your client. Make sure the bot was added with the applications.commands scope (the Invite button includes it).',
          },
        ].map((item) => (
          <Accordion
            key={item.q}
            disableGutters
            elevation={0}
            sx={{
              borderRadius: '12px !important',
              border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
              background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.6)',
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                {item.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <Box
        sx={{
          ...cardSx,
          textAlign: 'center',
          background: isDark
            ? 'linear-gradient(135deg, rgba(88,101,242,0.16) 0%, rgba(87,242,135,0.05) 100%)'
            : 'linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(87,242,135,0.04) 100%)',
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
          Ready to roll?
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Build a roster, then publish it to your server in seconds.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'center' }}
        >
          <Button
            variant="contained"
            component={RouterLink}
            to="/roster-builder"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              background: `linear-gradient(135deg, ${DISCORD_BLURPLE} 0%, ${DISCORD_BLURPLE_DARK} 100%)`,
              boxShadow: '0 4px 16px rgba(88,101,242,0.35)',
              '&:hover': {
                color: '#fff',
                background: `linear-gradient(135deg, ${DISCORD_BLURPLE_DARK} 0%, #3a44a8 100%)`,
                boxShadow: '0 6px 22px rgba(88,101,242,0.5)',
              },
            }}
          >
            Build a roster
          </Button>
          <Button
            variant="outlined"
            href="https://discord.gg/mMjwcQYFdc"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              borderColor: 'rgba(88,101,242,0.4)',
              color: isDark ? '#c7d2fe' : DISCORD_BLURPLE,
              '&:hover': { borderColor: DISCORD_BLURPLE, background: 'rgba(88,101,242,0.06)' },
            }}
          >
            Need help? Join our Discord
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

// ── Small presentational helpers ────────────────────────────────────────────

const SectionHeading: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
    {icon}
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
  </Stack>
);

const PermRow: React.FC<{ role: string; can: string }> = ({ role, can }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }}>
    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: { sm: 260 } }}>
      {role}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
      {can}
    </Typography>
  </Stack>
);
