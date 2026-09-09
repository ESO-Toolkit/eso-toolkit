import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import {
  type FindingShareRecipient,
  type PinnedFinding,
  type PrivacySafeSharedPinnedFinding,
  type SharedFindingAssignee,
  type SharedPinnedFinding,
  sharePinnedFinding,
} from './pinnedFindings';

export type PinnedFindingsPanelState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'failed'; message?: string }
  | { status: 'unavailable'; reason?: string }
  | { status: 'ready'; findings: readonly PinnedFinding[] };

export interface PinnedFindingsPanelProps {
  state: PinnedFindingsPanelState;
  onRetry?: () => void;
  onShare?: (finding: SharedPinnedFinding) => void;
}

const audienceLabels: Record<FindingShareRecipient['audience'], string> = {
  team: 'Team (identifiers hidden)',
  external: 'External (identifiers hidden)',
  'raid-lead': 'Raid lead (identifiers still hidden)',
};

const formatTimestamp = (timestampMs: number): string => `${Math.floor(timestampMs / 1000)}s`;

const formatRole = (role?: string): string => (role ? role.replace('-', ' ') : 'unspecified role');

const formatAssignee = (assignee?: SharedFindingAssignee): string => {
  if (!assignee) {
    return 'Unassigned';
  }

  return assignee.role ? `${assignee.kind} (${formatRole(assignee.role)})` : assignee.kind;
};

const formatElapsedTimestamp = (timestampMs: number): string => {
  const seconds = Math.floor(timestampMs / 1000);
  return `${seconds}s into encounter`;
};

const formatLifecycleOffset = (afterAnchorMs: number): string => {
  const seconds = Math.floor(afterAnchorMs / 1000);
  return `${seconds}s after evidence anchor`;
};

const projectForPrivacy = (finding: PinnedFinding): PrivacySafeSharedPinnedFinding | undefined => {
  try {
    const shared = sharePinnedFinding(finding, { audience: 'team', allowPlayerIdentifiers: false });
    return shared.sharedWith.includesPlayerIdentifiers ? undefined : shared;
  } catch {
    return undefined;
  }
};

export const PinnedFindingsPanel = ({
  state,
  onRetry,
  onShare,
}: PinnedFindingsPanelProps): React.JSX.Element => {
  const titleId = React.useId();
  const [audience, setAudience] = useState<FindingShareRecipient['audience']>('team');
  const [shareStatus, setShareStatus] = useState<
    { severity: 'error' | 'success'; message: string } | undefined
  >();

  if (state.status === 'loading') {
    return (
      <Paper component="section" role="region" aria-labelledby={titleId} sx={{ p: 2 }}>
        <Typography id={titleId} variant="h6">
          Pinned findings
        </Typography>
        <Box
          role="status"
          aria-label="Loading pinned findings"
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}
        >
          <CircularProgress size={28} />
          <Typography variant="body2">Loading pinned findings…</Typography>
        </Box>
      </Paper>
    );
  }

  if (state.status === 'failed' || state.status === 'unavailable') {
    const isFailed = state.status === 'failed';
    return (
      <Paper component="section" role="region" aria-labelledby={titleId} sx={{ p: 2 }}>
        <Typography id={titleId} variant="h6">
          Pinned findings
        </Typography>
        <Alert severity={isFailed ? 'error' : 'warning'} role="alert" sx={{ mt: 2 }}>
          {isFailed
            ? (state.message ?? 'Pinned findings could not be loaded.')
            : (state.reason ?? 'Pinned findings are unavailable for this analysis.')}
          {onRetry ? (
            <Button onClick={onRetry} sx={{ ml: 1 }} size="small">
              Try again
            </Button>
          ) : null}
        </Alert>
      </Paper>
    );
  }

  if (state.status === 'empty' || state.findings.length === 0) {
    return (
      <Paper component="section" role="region" aria-labelledby={titleId} sx={{ p: 2 }}>
        <Typography id={titleId} variant="h6">
          Pinned findings
        </Typography>
        <Alert severity="info" role="status" sx={{ mt: 2 }}>
          No pinned findings yet. Findings can be pinned from an evidence review.
        </Alert>
      </Paper>
    );
  }

  const projected = state.findings.map((finding) => ({
    finding,
    shared: projectForPrivacy(finding),
  }));
  const unavailableCount = projected.filter(({ shared }) => !shared).length;

  const prepareShare = (finding: PinnedFinding): void => {
    if (!onShare) {
      return;
    }

    let shared: SharedPinnedFinding;
    try {
      shared = sharePinnedFinding(finding, { audience, allowPlayerIdentifiers: false });
    } catch {
      setShareStatus({
        severity: 'error',
        message: 'This finding could not be prepared for sharing because its data is invalid.',
      });
      return;
    }

    onShare(shared);
    setShareStatus({
      severity: 'success',
      message: `Share preview prepared for ${audienceLabels[audience]}. Player identifiers remain hidden.`,
    });
  };

  return (
    <Paper component="section" role="region" aria-labelledby={titleId} sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography id={titleId} variant="h6">
            Pinned findings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Durable evidence for follow-up. Shared previews omit report and player identifiers.
          </Typography>
        </Box>
        {unavailableCount > 0 ? (
          <Alert severity="warning" role="alert">
            {unavailableCount} finding{unavailableCount === 1 ? '' : 's'} unavailable because{' '}
            {unavailableCount === 1 ? 'its' : 'their'} evidence or lineage is invalid.
          </Alert>
        ) : null}
        {projected.map(({ finding, shared }, index) =>
          shared ? (
            <Paper
              key={`${finding.id}-${index}`}
              variant="outlined"
              sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle1" component="h3" sx={{ overflowWrap: 'anywhere' }}>
                    {shared.whatHappened}
                  </Typography>
                  <Chip size="small" label={`Confidence: ${shared.confidence.level}`} />
                  <Chip
                    size="small"
                    label={shared.pin.status === 'pinned' ? 'Pinned' : 'Unpinned'}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label="Player identifiers hidden"
                    color="success"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {shared.whyItMatters}
                </Typography>
                <Typography variant="subtitle2">Evidence</Typography>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                  {shared.evidence.map((evidence) => (
                    <Box component="li" key={`${evidence.timestampMs}-${evidence.observation}`}>
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        <time aria-label={formatElapsedTimestamp(evidence.timestampMs)}>
                          {formatTimestamp(evidence.timestampMs)}
                        </time>
                        {' · '}
                        {evidence.phaseName ?? 'Unspecified phase'}
                        {' · '}
                        {evidence.observation}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">Owner</Typography>
                    <Typography variant="body2">
                      {shared.ownership.current
                        ? `${shared.ownership.current.kind} (${formatRole(shared.ownership.current.role)})`
                        : 'Unassigned'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">Resolution lineage</Typography>
                    {shared.resolutionHistory.length ? (
                      <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                        {shared.resolutionHistory.map((event) => (
                          <Box component="li" key={event.id}>
                            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                              {event.previousStatus} → {event.status} ·{' '}
                              {formatLifecycleOffset(event.afterAnchorMs)} · {event.note}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2">Open · no updates yet</Typography>
                    )}
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="subtitle2">Ownership lineage</Typography>
                  {shared.ownership.history.length ? (
                    <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                      {shared.ownership.history.map((transition, transitionIndex) => (
                        <Box component="li" key={`${transition.afterAnchorMs}-${transitionIndex}`}>
                          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                            {formatAssignee(transition.from)} → {formatAssignee(transition.to)} ·{' '}
                            {formatLifecycleOffset(transition.afterAnchorMs)}
                            {transition.reason ? ` · ${transition.reason}` : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2">No ownership updates yet</Typography>
                  )}
                </Box>
                <Typography variant="body2">
                  <strong>Provenance:</strong> {shared.provenance.kind} · {shared.provenance.source}{' '}
                  · observed {formatLifecycleOffset(shared.provenance.observedAfterAnchorMs)}
                </Typography>
                <Typography variant="body2">
                  <strong>Confidence rationale:</strong> {shared.confidence.rationale}
                </Typography>
                <Typography variant="body2">
                  <strong>Recommended action:</strong> {shared.recommendedAction.action}
                </Typography>
                {shared.recommendedAction.expectedOutcome ? (
                  <Typography variant="body2" color="text.secondary">
                    Expected outcome: {shared.recommendedAction.expectedOutcome}
                  </Typography>
                ) : null}
                {onShare ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <FormControl
                      size="small"
                      sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 220 } }}
                    >
                      <InputLabel id={`recipient-label-${titleId}-${index}`}>
                        Share recipient
                      </InputLabel>
                      <Select
                        labelId={`recipient-label-${titleId}-${index}`}
                        id={`recipient-${titleId}-${index}`}
                        value={audience}
                        label="Share recipient"
                        onChange={(event) =>
                          setAudience(event.target.value as FindingShareRecipient['audience'])
                        }
                      >
                        {(Object.keys(audienceLabels) as FindingShareRecipient['audience'][]).map(
                          (option) => (
                            <MenuItem key={option} value={option}>
                              {audienceLabels[option]}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      onClick={() => prepareShare(finding)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                      aria-label={`Prepare privacy-safe share for ${shared.whatHappened}`}
                    >
                      Prepare share preview
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Paper>
          ) : null,
        )}
        {shareStatus ? (
          <Alert
            role={shareStatus.severity === 'error' ? 'alert' : 'status'}
            severity={shareStatus.severity}
          >
            {shareStatus.message}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
};
