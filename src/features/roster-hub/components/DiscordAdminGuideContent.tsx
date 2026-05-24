/**
 * Shared guide content for Discord bot installation.
 *
 * Rendered inside DiscordAdminGuideSheet (over the publish modal) and on the
 * standalone /discord-setup route so admins can land on a linkable page
 * without being forced through the publish flow.
 */

import {
  AdminPanelSettings,
  Campaign,
  Check as CheckIcon,
  CheckCircle,
  ContentCopy,
  ExpandMore,
  Group as GroupIcon,
  HelpOutlined,
  RadioButtonUnchecked,
  Rocket,
  Shield,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import discordIcon from '../../../assets/discord-icon.svg';
import { getBotInviteUrl } from '../../auth/discord-auth';

/** Status for the 4-step admin checklist. */
export type AdminStepStatus = 'done' | 'pending' | 'unknown';

export interface DiscordAdminGuideContentProps {
  /** Optional guild the admin is targeting; appended to the shareable link. */
  guildId?: string;
  /** Optional display name of the target guild. */
  guildName?: string;
  /** Is the bot already in the target server? Drives step 1's tick. */
  botPresent?: boolean;
  /** Has a server admin configured role access + defaults? Drives step 2/3 ticks. */
  configured?: boolean;
  /**
   * When true (standalone page), we don't know live status — steps render with
   * a neutral "to do" marker instead of a grey tick.
   */
  standalone?: boolean;
}

/** Bot permissions mirrored from getBotInviteUrl(). Kept in sync manually. */
const BOT_PERMISSIONS: ReadonlyArray<{ label: string; why: string }> = [
  {
    label: 'Manage Channels',
    why: 'Creates a new text channel per roster so each raid night has its own signup thread.',
  },
  {
    label: 'View Channels',
    why: 'Lets the bot see the category you pick so it can place roster channels correctly.',
  },
  {
    label: 'Send Messages',
    why: 'Posts the initial roster embed when your team publishes.',
  },
  {
    label: 'Embed Links',
    why: 'Renders the rich roster card (trial icon, tags, build links).',
  },
  {
    label: 'Read Message History',
    why: 'Edits an existing roster post when details change, instead of spamming a new one.',
  },
];

const STEP_ICON_SX = { fontSize: 18 } as const;

export const DiscordAdminGuideContent: React.FC<DiscordAdminGuideContentProps> = ({
  guildId,
  guildName,
  botPresent,
  configured,
  standalone = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [permsOpen, setPermsOpen] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const [inviteCopied, setInviteCopied] = React.useState(false);

  const shareableLink = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/discord-setup`;
    return guildId ? `${base}?server=${encodeURIComponent(guildId)}` : base;
  }, [guildId]);

  const copyShareableLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      /* clipboard denied — fail silently */
    }
  }, [shareableLink]);

  const copyInvite = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getBotInviteUrl());
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2200);
    } catch {
      /* clipboard denied — fail silently */
    }
  }, []);

  const stepStatus = (condition: boolean | undefined): AdminStepStatus => {
    if (standalone || condition === undefined) return 'unknown';
    return condition ? 'done' : 'pending';
  };

  const steps: ReadonlyArray<{
    icon: React.ReactNode;
    title: string;
    body: string;
    status: AdminStepStatus;
  }> = [
    {
      icon: <AdminPanelSettings sx={STEP_ICON_SX} />,
      title: 'Invite the bot',
      body: 'Use the button above. Requires "Manage Server" in Discord.',
      status: stepStatus(botPresent),
    },
    {
      icon: <Shield sx={STEP_ICON_SX} />,
      title: 'Create a publisher role',
      body: 'E.g. @RaidLead, for admins who should publish rosters.',
      status: stepStatus(configured),
    },
    {
      icon: <GroupIcon sx={STEP_ICON_SX} />,
      title: 'Assign teammates to the role',
      body: 'Anyone with the role can post from the publish dialog.',
      status: stepStatus(configured),
    },
    {
      icon: <Campaign sx={STEP_ICON_SX} />,
      title: 'Test publish',
      body: 'Have a role member publish any roster to confirm the pipeline.',
      status: stepStatus(botPresent && configured),
    },
  ];

  return (
    <Stack spacing={2}>
      {/* Hero: one-click invite */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '14px',
          px: 2.5,
          py: 2.25,
          textAlign: 'center',
          background: isDark
            ? 'linear-gradient(135deg, rgba(88,101,242,0.18) 0%, rgba(87,242,135,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(88,101,242,0.10) 0%, rgba(87,242,135,0.04) 100%)',
          border: isDark ? '1px solid rgba(88,101,242,0.22)' : '1px solid rgba(88,101,242,0.15)',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            mx: 'auto',
            mb: 1,
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
            boxShadow: '0 6px 20px rgba(88,101,242,0.32)',
          }}
        >
          <Rocket sx={{ color: '#fff', fontSize: 24 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.25 }}>
          Install the ESO Toolkit bot
        </Typography>
        <Typography
          variant="body2"
         
          sx={{ color: 'text.secondary', fontSize: '0.8rem', maxWidth: 380, mx: 'auto', lineHeight: 1.45, mb: 1.5 }}
        >
          {guildName
            ? `Add the bot to ${guildName} so your team can publish rosters here. About 60 seconds.`
            : 'Add the bot to your Discord server so your team can publish rosters here. About 60 seconds.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            href={getBotInviteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={
              <img
                src={discordIcon}
                alt=""
                style={{ width: 15, height: 15, filter: 'brightness(10)' }}
              />
            }
            sx={{
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2.5,
              py: 0.9,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              boxShadow: '0 4px 16px rgba(88,101,242,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                boxShadow: '0 6px 20px rgba(88,101,242,0.4)',
              },
            }}
          >
            Invite bot
          </Button>
          <Tooltip title={inviteCopied ? 'Link copied!' : 'Copy the raw invite URL'} arrow>
            <Button
              variant="outlined"
              onClick={() => void copyInvite()}
              startIcon={
                inviteCopied ? (
                  <CheckIcon sx={{ fontSize: '16px !important' }} />
                ) : (
                  <ContentCopy sx={{ fontSize: '16px !important' }} />
                )
              }
              sx={{
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                py: 0.9,
                textTransform: 'none',
                borderColor: inviteCopied ? 'rgba(87,242,135,0.45)' : 'rgba(88,101,242,0.28)',
                color: inviteCopied ? '#57F287' : '#5865F2',
                '&:hover': {
                  borderColor: inviteCopied ? '#57F287' : '#5865F2',
                  background: inviteCopied ? 'rgba(87,242,135,0.06)' : 'rgba(88,101,242,0.06)',
                },
              }}
            >
              {inviteCopied ? 'Copied' : 'Copy invite URL'}
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* Permissions disclosure */}
      <Box
        sx={{
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          overflow: 'hidden',
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setPermsOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setPermsOpen((v) => !v);
            }
          }}
          aria-expanded={permsOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 1.5,
            py: 1.1,
            cursor: 'pointer',
            '&:hover': { background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' },
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Shield sx={{ fontSize: 18, color: '#5865F2' }} />
            <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Why we ask for each permission
            </Typography>
          </Stack>
          <ExpandMore
            sx={{
              fontSize: 20,
              color: 'text.secondary',
              transform: permsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </Box>
        {permsOpen && (
          <Box
            component="ul"
            sx={{
              m: 0,
              pt: 0.25,
              pb: 1.25,
              px: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              '& li': {
                fontSize: '0.74rem',
                lineHeight: 1.5,
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                '&::marker': { color: '#5865F2' },
              },
              '& li strong': {
                color: isDark ? '#e5e7eb' : '#1e293b',
                fontWeight: 600,
              },
            }}
          >
            {BOT_PERMISSIONS.map((perm) => (
              <li key={perm.label}>
                <strong>{perm.label}</strong>: {perm.why}
              </li>
            ))}
          </Box>
        )}
      </Box>

      {/* 4-step checklist */}
      <Box>
        <Typography
          sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 0.75, letterSpacing: '0.02em' }}
        >
          4-step setup
        </Typography>
        <Box
          sx={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          }}
        >
          {steps.map((step, idx) => (
            <Box
              key={step.title}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
                px: 1.25,
                py: 1.1,
                borderBottom:
                  idx === steps.length - 1
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
                  background:
                    step.status === 'done'
                      ? 'rgba(87,242,135,0.12)'
                      : isDark
                        ? 'rgba(88,101,242,0.12)'
                        : 'rgba(88,101,242,0.08)',
                  color: step.status === 'done' ? '#57F287' : '#5865F2',
                  transition: 'all 0.3s ease',
                }}
              >
                {step.icon}
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
                    border:
                      step.status === 'done'
                        ? '1px solid rgba(87,242,135,0.5)'
                        : '1px solid rgba(88,101,242,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    color: step.status === 'done' ? '#57F287' : '#5865F2',
                  }}
                >
                  {idx + 1}
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3 }}>
                    {step.title}
                  </Typography>
                  {step.status === 'done' && (
                    <Tooltip title="Complete" arrow>
                      <CheckCircle sx={{ fontSize: 14, color: '#57F287' }} />
                    </Tooltip>
                  )}
                  {step.status === 'pending' && (
                    <Tooltip title="Not yet" arrow>
                      <RadioButtonUnchecked sx={{ fontSize: 14, color: 'text.disabled' }} />
                    </Tooltip>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                 
                  sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mt: 0.125, fontSize: '0.72rem' }}
                >
                  {step.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Troubleshooting */}
      {/*
       * Wrapper Box absorbs the parent Stack's margin-top. The theme applies
       * `&.Mui-expanded { margin: 0 }` to every MuiAccordion-root; without this
       * wrapper, expanding the accordion wins on specificity over the Stack's
       * child-margin rule and the accordion snaps up into the card above it.
       */}
      <Box>
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            borderRadius: '12px !important',
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            '&:before': { display: 'none' },
            overflow: 'hidden',
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              px: 1.5,
              minHeight: 44,
              '& .MuiAccordionSummary-content': { my: 1 },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <HelpOutlined sx={{ fontSize: 18, color: '#FEB900' }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>Troubleshooting</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.25 }}>
            <Stack spacing={1.25}>
              <TroubleshootRow
                title="Bot shows offline after invite"
                body="Give it ~30 seconds, then refresh Discord. If it stays offline, remove and re-invite. A server-level integration block may be in place."
                isDark={isDark}
              />
              <TroubleshootRow
                title="“Missing permissions” when publishing"
                body="The bot needs View Channel + Send Messages + Embed Links on the target channel. Check channel-level overrides. Role-level grants aren't enough if a channel denies the bot."
                isDark={isDark}
              />
              <TroubleshootRow
                title="2FA-required server"
                body="If your server requires 2FA for moderation, the inviting admin must have 2FA enabled on their Discord account before adding the bot."
                isDark={isDark}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Share link */}
      <Box
        sx={{
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
          px: 1.5,
          py: 1.25,
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', mb: 0.25 }}>
          Not the admin?
        </Typography>
        <Typography
          variant="caption"
         
          sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.45, mb: 1, fontSize: '0.72rem' }}
        >
          DM this page to whoever has{' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            Manage Server
          </Box>
          . They can install the bot without signing into ESO Toolkit.
        </Typography>
        <Tooltip title={shareCopied ? 'Link copied!' : 'Copy a link to this guide'} arrow>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => void copyShareableLink()}
            startIcon={
              shareCopied ? (
                <CheckIcon sx={{ fontSize: '16px !important' }} />
              ) : (
                <ContentCopy sx={{ fontSize: '16px !important' }} />
              )
            }
            sx={{
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: shareCopied ? 'rgba(87,242,135,0.45)' : 'rgba(88,101,242,0.28)',
              color: shareCopied ? '#57F287' : '#5865F2',
              '&:hover': {
                borderColor: shareCopied ? '#57F287' : '#5865F2',
                background: shareCopied ? 'rgba(87,242,135,0.06)' : 'rgba(88,101,242,0.06)',
              },
            }}
          >
            {shareCopied ? 'Shareable link copied' : 'Copy shareable link'}
          </Button>
        </Tooltip>
      </Box>
    </Stack>
  );
};

interface TroubleshootRowProps {
  title: string;
  body: string;
  isDark: boolean;
}

const TroubleshootRow: React.FC<TroubleshootRowProps> = ({ title, body, isDark }) => (
  <Box>
    <Typography sx={{ fontWeight: 600, fontSize: '0.78rem', lineHeight: 1.35 }}>{title}</Typography>
    <Typography
      variant="caption"
     
      sx={{ color: 'text.secondary',
        display: 'block',
        lineHeight: 1.5,
        fontSize: '0.72rem',
        mt: 0.25,
        color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
      }}
    >
      {body}
    </Typography>
  </Box>
);
