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
  getStoredSupportDraft,
  getSupportIdempotencyKey,
  getSupportIssueLabel,
  renderSupportReport,
  SUPPORT_DRAFT_ERROR_KEY,
  SUPPORT_RESULT_KEY,
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
      return 'This request may still be creating. Check again shortly. If this message persists, return to Kalpa and prepare a new support report.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'This saved request no longer matches your Discord session. Return to Kalpa and prepare a new support report.';
    case 'INVALID_REQUEST':
      return 'Kalpa prepared a report the support service cannot accept. Copy it below and use the manual option.';
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
  const draft = React.useMemo(() => getStoredSupportDraft(), []);
  const report = React.useMemo(() => (draft ? renderSupportReport(draft) : ''), [draft]);
  const handoffError = sessionStorage.getItem(SUPPORT_DRAFT_ERROR_KEY);
  const { discordToken, isDiscordAuthed, startDiscordLogin, clearDiscordAuth } = useDiscordAuth();
  const initialTicket = React.useMemo(storedTicket, []);
  const [phase, setPhase] = React.useState<Phase>(initialTicket ? 'success' : 'ready');
  const [error, setError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<CreatedTicket | null>(initialTicket);
  const [copied, setCopied] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  const statusRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (phase === 'success' || phase === 'error') statusRef.current?.focus();
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
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setError('Clipboard access was blocked. Select the report text below and copy it manually.');
      setPhase('error');
    }
  }, [report]);

  const createTicket = React.useCallback(async () => {
    if (!draft || !discordToken || phase === 'creating') return;
    setPhase('creating');
    setError(null);
    try {
      const session = await createSupportSession(discordToken);
      const created = await createKalpaTicket(session.token, getSupportIdempotencyKey(), draft);
      sessionStorage.setItem(SUPPORT_RESULT_KEY, JSON.stringify(created));
      setTicket(created);
      setPhase('success');
    } catch (caught) {
      if (caught instanceof SupportApiError && caught.code === 'AUTH_EXPIRED') clearDiscordAuth();
      setError(messageFor(caught));
      setPhase('error');
    }
  }, [clearDiscordAuth, discordToken, draft, phase]);

  if (!draft) {
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

  return (
    <Box sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 0 } }}>
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
            ref={statusRef}
            tabIndex={-1}
            severity="success"
            icon={<CheckCircleIcon fontSize="inherit" />}
            aria-live="polite"
            sx={{ alignItems: 'flex-start' }}
          >
            <Typography variant="h6" component="h2">
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
            >
              Open private ticket
            </Button>
          </Alert>
        ) : null}

        {phase === 'error' && error ? (
          <Alert ref={statusRef} tabIndex={-1} severity="error" aria-live="assertive">
            {error}
          </Alert>
        ) : null}

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
            <Box>
              <Typography variant="overline" color="text.secondary">
                Report prepared by Kalpa
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
                Only you and staff can see it
              </Typography>
            </Stack>
          </Stack>

          <Box
            component="pre"
            aria-label="Exact support report that will be shared"
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

        {phase !== 'success' ? (
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
                startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {busy ? 'Creating private ticket…' : 'Create private ticket'}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={() => startDiscordLogin('/kalpa/support')}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Continue with Discord
              </Button>
            )}
            {!isOnline ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                You appear to be offline. The report is preserved below for manual submission.
              </Alert>
            ) : null}
          </Box>
        ) : null}

        <Divider />

        <Box>
          <Typography variant="h6" component="h2">
            Manual fallback
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            If sign-in or Discord is unavailable, copy the same reviewed report and paste it at the
            ticket desk. Preparing or copying a report does not mean a ticket was created.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" onClick={() => void copyReport()} startIcon={<CopyIcon />}>
              {copied ? 'Report copied' : 'Copy report'}
            </Button>
            <Button
              component="a"
              href={SUPPORT_DESK_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              endIcon={<LaunchIcon />}
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
      </Stack>
    </Box>
  );
};
