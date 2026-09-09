import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import type { ReactElement } from 'react';

import type {
  DecisionConfidence,
  DecisionSummary,
  DecisionSummaryRejectionReason,
} from '../decisionSummary';

export interface DecisionSummaryPanelProps {
  readonly summary: DecisionSummary;
  /** Explicit request lifecycle state when the summary has not completed yet. */
  readonly state?: DecisionSummaryPanelState;
}

export type DecisionSummaryPanelState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'rejected';

const DecisionPanelSurface = styled('section')(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.82),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  WebkitBackdropFilter: 'blur(12px)',
}));

const rejectionCopy: Record<DecisionSummaryRejectionReason, string> = {
  'invalid-request': 'The analysis request was invalid, so no recommendation was inferred.',
  'incomplete-evidence': 'Required evidence is incomplete, so no recommendation was inferred.',
  'invalid-evidence': 'The supplied evidence is invalid and cannot support a recommendation.',
  'unavailable-evidence': 'The supporting evidence stream is unavailable.',
  'context-mismatch':
    'The candidate belongs to a different analysis partition or encounter context.',
  'duplicate-candidate':
    'A duplicate candidate was withheld to avoid presenting the same finding twice.',
};

const rejectionLabel: Record<DecisionSummaryRejectionReason, string> = {
  'invalid-request': 'Invalid request',
  'incomplete-evidence': 'Blocked candidate',
  'invalid-evidence': 'Blocked candidate',
  'unavailable-evidence': 'Unavailable evidence',
  'context-mismatch': 'Blocked candidate',
  'duplicate-candidate': 'Withheld candidate',
};

const formatTimestamp = (timestampMs: number): string => {
  const totalSeconds = Math.floor(timestampMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatConfidence = (confidence: DecisionConfidence): string =>
  confidence.state === 'known'
    ? `Confidence: ${Math.round(confidence.score * 100)}%`
    : `Confidence unavailable: ${confidence.reason}`;

const formatScope = (summary: DecisionSummary): string => {
  const { scope } = summary;
  const parts = [
    scope.update,
    scope.partitionId,
    scope.encounterKind === 'training-dummy' ? 'Training dummy' : scope.difficulty,
    scope.role,
    scope.esoClass,
    scope.buildBracket,
  ].filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join(' · ') : 'Unavailable';
};

const inferState = (summary: DecisionSummary): DecisionSummaryPanelState => {
  if (summary.items.length > 0) return 'ready';
  if (summary.rejected.some(({ reason }) => reason === 'unavailable-evidence')) {
    return 'unavailable';
  }
  if (summary.rejected.length > 0) return 'rejected';
  return 'empty';
};

const resolveState = (
  summary: DecisionSummary,
  explicitState: DecisionSummaryPanelState | undefined,
): DecisionSummaryPanelState => {
  if (explicitState !== 'ready') {
    return explicitState ?? inferState(summary);
  }

  return summary.items.length > 0 ? 'ready' : inferState(summary);
};

const isVisibleRejection = (panelState: DecisionSummaryPanelState): boolean =>
  panelState !== 'loading' && panelState !== 'empty';

const isVisibleItem = (panelState: DecisionSummaryPanelState): boolean => panelState === 'ready';

const formatResponsibleParty = (
  responsible: DecisionSummary['items'][number]['responsible'],
): string => (responsible?.role === undefined ? 'Unassigned' : `Role ${responsible.role}`);

export const DecisionSummaryPanel = ({
  summary,
  state,
}: DecisionSummaryPanelProps): ReactElement => {
  const panelState = resolveState(summary, state);
  const isLoading = panelState === 'loading';
  const visibleItems = isVisibleItem(panelState) ? summary.items : [];
  const visibleRejections = isVisibleRejection(panelState) ? summary.rejected : [];
  const hasItems = visibleItems.length > 0;
  const hasRejected = visibleRejections.length > 0;

  return (
    <DecisionPanelSurface aria-busy={isLoading} aria-labelledby="decision-summary-title">
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" id="decision-summary-title" variant="h6">
            Decision summary
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Evidence-backed priorities for the selected analysis context.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
            Context: {formatScope(summary)}
          </Typography>
        </Box>

        {isLoading && (
          <Alert aria-atomic="true" aria-live="polite" role="status" severity="info">
            Loading decision evidence…
          </Alert>
        )}

        {!isLoading && panelState === 'empty' && (
          <Alert aria-atomic="true" aria-live="polite" role="status" severity="info">
            No decision findings were identified for this analysis context.
          </Alert>
        )}

        {!isLoading && panelState === 'unavailable' && (
          <Alert aria-atomic="true" aria-live="polite" role="status" severity="warning">
            Decision evidence is unavailable. No recommendation was inferred.
          </Alert>
        )}

        {!isLoading && panelState === 'rejected' && (
          <Alert aria-atomic="true" aria-live="polite" role="status" severity="warning">
            Decision candidates were rejected because their evidence or context could not be
            trusted. No recommendation was inferred.
          </Alert>
        )}

        {!isLoading && hasItems && hasRejected && (
          <Alert aria-atomic="true" aria-live="polite" role="status" severity="warning">
            Some candidate decisions were withheld because their evidence or context could not be
            trusted.
          </Alert>
        )}

        {visibleItems.map((item) => {
          const responsible = formatResponsibleParty(item.responsible);

          return (
            <Box component="article" key={item.id} aria-labelledby={`decision-summary-${item.id}`}>
              <Stack spacing={1.25}>
                <Box>
                  <Typography component="h3" id={`decision-summary-${item.id}`} variant="subtitle1">
                    Priority {item.priority.rank}: {item.whatHappened}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Why it matters: {item.whyItMatters}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`Timestamp ${formatTimestamp(item.evidence.timestampMs)}`}
                    size="small"
                  />
                  <Chip label={`Phase ${item.evidence.phase}`} size="small" />
                  <Chip label={formatConfidence(item.confidence)} size="small" />
                </Box>

                <Box>
                  <Typography variant="body2">
                    <strong>Evidence provenance:</strong> {item.evidence.provenance}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    <strong>Evidence context:</strong> {item.evidence.context}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2">
                    <strong>Observed behavior:</strong> {item.observedBehavior}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Expected behavior:</strong> {item.expectedBehavior}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Estimated impact:</strong>{' '}
                    {item.estimatedImpact.toLocaleString('en-US')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Owner:</strong> {responsible}
                  </Typography>
                </Box>

                <Typography variant="body1">
                  <strong>Next action:</strong> {item.recommendedNextAction}
                </Typography>
              </Stack>
            </Box>
          );
        })}

        {hasRejected && (
          <Box aria-label="Withheld decision candidates">
            {hasItems && <Divider sx={{ mb: 1.5 }} />}
            <Typography component="h3" variant="subtitle2">
              Withheld candidates
            </Typography>
            <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
              {visibleRejections.map((rejection, index) => (
                <Box
                  component="li"
                  key={`${rejection.candidateId ?? 'unknown'}-${rejection.reason}-${index}`}
                >
                  <Typography variant="body2">
                    <strong>{rejectionLabel[rejection.reason]}:</strong>{' '}
                    {rejectionCopy[rejection.reason]}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </DecisionPanelSurface>
  );
};
