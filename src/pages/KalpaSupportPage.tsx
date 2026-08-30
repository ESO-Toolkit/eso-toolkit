import {
  CheckCircleOutlined as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  LockOutlined as LockIcon,
  SupportAgent as SupportIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

import { useDiscordAuth } from '@/features/auth/DiscordAuthContext';
import {
  createKalpaTicket,
  createSupportSession,
  parseCreatedTicket,
  type CreatedTicket,
  SupportApiError,
} from '@/features/kalpa-support/support-api';
import {
  clearPendingSupportDraft,
  getStoredSupportDraft,
  getSupportIdempotencyKey,
  getSupportIssueLabel,
  renderSupportReport,
  SUPPORT_DRAFT_ERROR_KEY,
  SUPPORT_RESULT_KEY,
  verifySupportReport,
} from '@/features/kalpa-support/support-draft';
import { usePageTitle } from '@/hooks/useDocumentTitle';

const SUPPORT_DESK_URL = 'https://discord.com/channels/1375703719995244686/1480845158584025148';

type Phase = 'ready' | 'creating' | 'success' | 'error';

function messageFor(error: unknown): string {
  if (!(error instanceof SupportApiError)) {
    return 'Discord support is temporarily unavailable. Your report is still ready to copy.';
  }
  switch (error.code) {
    case 'NOT_A_MEMBER':
      return 'This Discord account is not a member of the ESO Toolkit server. Join the server, then try again.';
    case 'AUTH_EXPIRED':
      return 'Your Discord sign-in expired. Sign in again to create the ticket.';
    case 'RATE_LIMITED':
      return 'Too many support requests were made recently. Wait a few minutes, then retry with this same report.';
    case 'TICKET_RECOVERING':
      return 'This request may still be creating. Wait a moment, then retry this same report so Kalpa can recover the original ticket.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This saved request no longer matches your Discord session. Return to Kalpa and prepare a new support report.';
    case 'INVALID_REQUEST':
      return 'Kalpa prepared a report the support service cannot accept. Copy it below and use the manual option.';
    case 'REPORT_MISMATCH':
      return 'The support service rebuilt this report and got different text, so it created nothing. Copy the report from Kalpa itself and use the manual option.';
    default:
      return (
        error.message ||
        'Discord support is temporarily unavailable. Your report is still ready to copy.'
      );
  }
}

function storedTicket(): CreatedTicket | null {
  try {
    return parseCreatedTicket(JSON.parse(sessionStorage.getItem(SUPPORT_RESULT_KEY) ?? 'null'));
  } catch {
    sessionStorage.removeItem(SUPPORT_RESULT_KEY);
    return null;
  }
}

export const KalpaSupportPage: React.FC = () => {
  usePageTitle('/kalpa/support');
  const [draft, setDraft] = React.useState(() => getStoredSupportDraft());
  const report = React.useMemo(() => (draft ? renderSupportReport(draft) : ''), [draft]);
  // This page renders the report from its own copy of Kalpa's redaction and
  // rendering rules, so it can drift from Kalpa's independently of the Worker's.
  // A version-3 report carries the hash of the text Kalpa actually showed, which
  // is the only thing that can notice — and it notices here, while the user is
  // still looking at the report, rather than after a ticket exists. Reports from
  // a Kalpa that predates the hash verify as `unverifiable` and are unaffected.
  const drifted = React.useMemo(
    () => (draft ? verifySupportReport(draft) === 'mismatch' : false),
    [draft],
  );
  const handoffError = sessionStorage.getItem(SUPPORT_DRAFT_ERROR_KEY);
  const { discordToken, isDiscordAuthed, startDiscordLogin, clearDiscordAuth } = useDiscordAuth();
  const initialTicket = React.useMemo(storedTicket, []);
  const [phase, setPhase] = React.useState<Phase>(initialTicket ? 'success' : 'ready');
  const [error, setError] = React.useState<string | null>(null);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<CreatedTicket | null>(initialTicket);
  const [copied, setCopied] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  const successHeadingRef = React.useRef<HTMLHeadingElement>(null);
  // `phase` only blocks a second run once React has re-rendered. That is enough
  // for real input — every click and keypress is its own task — but a ref closes
  // the window synchronously, so no dispatch pattern can start two creations.
  const creatingRef = React.useRef(false);

  // Success removes the Create button, so focus has to land somewhere
  // deliberate. Focusing the result heading both restores focus and announces
  // the outcome once — which is why the success panel is not also a live region.
  React.useEffect(() => {
    if (phase === 'success') successHeadingRef.current?.focus();
  }, [phase]);

  React.useEffect(() => {
    const updateOnlineStatus = (): void => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const copyReport = React.useCallback(async () => {
    if (!report) return;
    // Same reason Create is withheld: on a mismatch this page cannot vouch for
    // the text it rebuilt, and handing it to the clipboard would just move the
    // unreviewed report into a manual ticket instead of an API-created one.
    if (drifted) return;
    setCopied(false);
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setCopyError(
        'Clipboard access was blocked. Select the report text below and copy it manually.',
      );
    }
  }, [drifted, report]);

  const createTicket = React.useCallback(async () => {
    if (!draft || !discordToken || phase === 'creating' || ticket || creatingRef.current) return;
    // The button is not rendered while drifted; this closes the path where it is
    // reached some other way, because consent to an unverified report is the one
    // thing this page must never collect.
    if (drifted) return;
    creatingRef.current = true;
    setPhase('creating');
    setError(null);
    try {
      const session = await createSupportSession(discordToken);
      const created = await createKalpaTicket(session.token, getSupportIdempotencyKey(), draft);
      sessionStorage.setItem(SUPPORT_RESULT_KEY, JSON.stringify(created));
      clearPendingSupportDraft();
      setTicket(created);
      setDraft(null);
      setPhase('success');
    } catch (caught) {
      if (caught instanceof SupportApiError && caught.code === 'AUTH_EXPIRED') clearDiscordAuth();
      setError(messageFor(caught));
      setPhase('error');
    } finally {
      creatingRef.current = false;
    }
  }, [clearDiscordAuth, discordToken, draft, drifted, phase, ticket]);

  if (!draft && !ticket) {
    return (
      <Box sx={{ py: { xs: 3, sm: 6 }, px: { xs: 2, sm: 0 } }}>
        <Alert severity="warning" variant="outlined">
          <Typography variant="h6" component="h1" gutterBottom>
            No Kalpa support report found
          </Typography>
          <Typography variant="body2">
            {handoffError ?? 'Return to Kalpa and choose Help to prepare a privacy-safe report.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const busy = phase === 'creating';
  // A confirmed ticket is the terminal state. Even if a draft somehow survives
  // beside it, the reviewed-report and manual-fallback blocks stay hidden — the
  // page must never show "no ticket created yet" next to "ticket created".
  const showDraft = draft !== null && ticket === null;
  // Success is announced by the focus move onto its heading and failure by its
  // own role="alert", so neither belongs here as well — a state that appears in
  // both places is read out twice. Only states with no other announcement do.
  const liveMessage = busy
    ? 'Creating your private Discord support ticket.'
    : copied && !ticket
      ? 'The support report was copied to your clipboard. No ticket has been created yet.'
      : '';

  return (
    <Box sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 0 } }}>
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          p: 0,
          m: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {liveMessage}
      </Box>
      <Stack spacing={{ xs: 2.5, sm: 3.5 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
            <SupportIcon color="primary" aria-hidden="true" />
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
              Kalpa support
            </Typography>
          </Stack>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', sm: '2.75rem' } }}>
            Create a private support ticket
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
            Review exactly what Kalpa prepared, then prove your Discord identity. The ticket will be
            visible only to you and authorized ESO Toolkit staff.
          </Typography>
        </Box>

        {phase === 'success' && ticket ? (
          <Alert
            role="presentation"
            severity="success"
            icon={<CheckCircleIcon fontSize="inherit" />}
            sx={{ alignItems: 'flex-start' }}
          >
            <Typography variant="h6" component="h2" ref={successHeadingRef} tabIndex={-1}>
              Private ticket created
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 2 }}>
              Discord confirmed ticket {ticket.ticketId}. Open it to continue with the support team.
            </Typography>
            <Button
              component="a"
              href={ticket.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              endIcon={<LaunchIcon />}
              sx={{ minHeight: 44 }}
            >
              Open private ticket
            </Button>
          </Alert>
        ) : null}

        {phase === 'error' && error ? (
          <Alert role="alert" severity="error">
            <Typography variant="h6" component="h2" sx={{ fontSize: '1rem' }}>
              The ticket was not created
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {error} Your reviewed report is preserved below.
            </Typography>
          </Alert>
        ) : null}

        {copyError ? (
          <Alert severity="warning" role="alert">
            {copyError}
          </Alert>
        ) : null}

        {showDraft && drifted ? (
          <Alert role="alert" severity="warning">
            <Typography variant="h6" component="h2" sx={{ fontSize: '1rem' }}>
              This page could not confirm the report Kalpa showed you
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              The report below was rebuilt here from what Kalpa sent, and it does not match the copy
              Kalpa displayed. Creating a ticket would be asking you to agree to text you have not
              reviewed, so that option is turned off and nothing has been sent. Copy the report from
              Kalpa itself and use the ticket desk below — and please mention that this page
              reported a mismatch.
            </Typography>
          </Alert>
        ) : null}

        {showDraft ? (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper', borderColor: 'divider' }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  {drifted
                    ? 'Rebuilt by this page — does not match Kalpa'
                    : 'Report prepared by Kalpa — no ticket created yet'}
                </Typography>
                <Typography variant="h6" component="h2">
                  {getSupportIssueLabel(draft.issueId)}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', color: 'success.main' }}
              >
                <LockIcon fontSize="small" aria-hidden="true" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Will be visible only to you and staff
                </Typography>
              </Stack>
            </Stack>

            <Box
              component="pre"
              aria-label={
                drifted
                  ? 'Support report rebuilt by this page, which does not match the report Kalpa showed'
                  : 'Exact support report that will be shared'
              }
              tabIndex={0}
              sx={{
                mt: 2,
                mb: 0,
                p: { xs: 1.5, sm: 2 },
                maxHeight: { xs: 300, sm: 420 },
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                color: 'text.primary',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.55,
              }}
            >
              {report}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No SavedVariables, file contents, account IDs, access tokens, or full local paths are
              included. Discord identity is checked by the server and never taken from this report.
            </Typography>
          </Paper>
        ) : null}

        {phase !== 'success' && !drifted ? (
          <Box>
            <Typography variant="h6" component="h2" gutterBottom>
              {isDiscordAuthed ? 'Ready to create your ticket' : 'Connect Discord to continue'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isDiscordAuthed
                ? 'ESO Toolkit will verify that this Discord account is in the support server before creating anything.'
                : 'Discord sign-in proves which member should receive access. Your report remains here if you cancel.'}
            </Typography>
            {isDiscordAuthed ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => void createTicket()}
                disabled={busy || !isOnline}
                aria-busy={busy}
                aria-describedby={!isOnline ? 'kalpa-support-offline' : undefined}
                startIcon={
                  busy ? (
                    <CircularProgress size={18} color="inherit" aria-hidden="true" />
                  ) : (
                    <LockIcon />
                  )
                }
                sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
              >
                {busy ? 'Creating private ticket…' : 'Create private ticket'}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={() => startDiscordLogin('/kalpa/support')}
                sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
              >
                Continue with Discord
              </Button>
            )}
            {!isOnline ? (
              <Alert severity="info" role="presentation" id="kalpa-support-offline" sx={{ mt: 2 }}>
                You appear to be offline, so the ticket cannot be created yet. Reconnect and try
                again, or copy the preserved report below and submit it manually.
              </Alert>
            ) : null}
          </Box>
        ) : null}

        {showDraft ? <Divider /> : null}

        {showDraft ? (
          <Box>
            <Typography variant="h6" component="h2">
              Manual fallback
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {drifted
                ? 'Copy the report from Kalpa itself — use its own Copy report button — and paste that at the ticket desk. The text above was rebuilt here and is not the report you reviewed, so this page does not offer to copy it.'
                : 'If sign-in or Discord is unavailable, copy the same reviewed report and paste it at the ticket desk. Preparing or copying a report does not mean a ticket was created.'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {drifted ? null : (
                <Button
                  variant="outlined"
                  onClick={() => void copyReport()}
                  startIcon={<CopyIcon />}
                  sx={{ minHeight: 44 }}
                >
                  {copied ? 'Report copied' : 'Copy report'}
                </Button>
              )}
              <Button
                component="a"
                href={SUPPORT_DESK_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                endIcon={<LaunchIcon />}
                sx={{ minHeight: 44 }}
              >
                Open Discord ticket desk
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Need the server first?{' '}
              <Link href="https://discord.gg/mMjwcQYFdc" target="_blank" rel="noopener noreferrer">
                Join ESO Toolkit on Discord
              </Link>
              .
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
};
