import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import { useId, type ReactElement } from 'react';

import type {
  DecisionConfidence,
  DecisionEvidenceProvenance,
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
  'incomplete-evidence': 'Required evidence is incomplete, so no recommendation was inferred.',
  'invalid-evidence': 'The supplied evidence is invalid and cannot support a recommendation.',
  'unavailable-evidence': 'The supporting evidence stream is unavailable.',
  'context-mismatch':
    'The candidate belongs to a different analysis partition or encounter context.',
  'duplicate-candidate':
    'A duplicate candidate was withheld to avoid presenting the same finding twice.',
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

const formatProvenance = (provenance: DecisionEvidenceProvenance): string => {
  switch (provenance.kind) {
    case 'game-rule':
      return `Game rule: ${provenance.ruleId} (${provenance.source})`;
    case 'fixed-heuristic':
      return `Fixed heuristic: ${provenance.heuristicId} (${provenance.source})`;
    case 'peer-benchmark':
      return [
        `Peer benchmark: ${provenance.baselineSource}`,
        `period ${provenance.baselinePeriod}`,
        `sample ${provenance.sampleSize}`,
        `distribution ${provenance.distribution}`,
        `refreshed ${provenance.refreshedAt}`,
        formatConfidence(provenance.confidence),
        provenance.provisional ? 'provisional' : 'current',
      ].join(' · ');
  }
};

const formatScope = (summary: DecisionSummary): string => {
  const { scope } = summary;
  return [
    scope.update,
    scope.partitionId,
    scope.encounterKind === 'training-dummy' ? 'Training dummy' : scope.difficulty,
    scope.role,
    scope.esoClass,
    scope.buildBracket,
  ].join(' · ');
};

const formatRejectionLabel = (
  reason: DecisionSummaryRejectionReason,
  outcome: 'blocked' | 'warning',
): string => {
  if (reason === 'unavailable-evidence') {
    return 'Unavailable evidence';
  }

  return outcome === 'blocked' ? 'Blocked candidate' : 'Withheld candidate';
};

const inferState = (summary: DecisionSummary): DecisionSummaryPanelState => {
  if (summary.items.length > 0) return 'ready';
  if (summary.rejected.some(({ reason }) => reason === 'unavailable-evidence')) {
    return 'unavailable';
  }
  if (summary.rejected.length > 0) return 'rejected';
  return 'empty';
};

export const DecisionSummaryPanel = ({
  summary,
  state,
}: DecisionSummaryPanelProps): ReactElement => {
  const titleId = `decision-summary-title-${useId()}`;
  const hasItems = summary.items.length > 0;
  const hasRejected = summary.rejected.length > 0;
  const panelState = state ?? inferState(summary);
  const isLoading = panelState === 'loading';

  return (
    <DecisionPanelSurface aria-busy={isLoading} aria-labelledby={titleId}>
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" id={titleId} variant="h6">
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
          <Alert aria-live="polite" role="status" severity="info">
            Loading decision evidence…
          </Alert>
        )}

        {!isLoading && panelState === 'empty' && (
          <Alert aria-live="polite" role="status" severity="info">
            No decision findings were identified for this analysis context.
          </Alert>
        )}

        {!isLoading && panelState === 'unavailable' && (
          <Alert aria-live="polite" role="status" severity="warning">
            Decision evidence is unavailable. No recommendation was inferred.
          </Alert>
        )}

        {!isLoading && panelState === 'rejected' && (
          <Alert aria-live="polite" role="status" severity="warning">
            Decision candidates were rejected because their evidence or context could not be
            trusted. No recommendation was inferred.
          </Alert>
        )}

        {!isLoading && hasItems && hasRejected && (
          <Alert aria-live="polite" role="status" severity="warning">
            Some candidate decisions were withheld because their evidence or context could not be
            trusted.
          </Alert>
        )}

        {!isLoading &&
          summary.items.map((item) => (
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
                    <strong>Evidence provenance:</strong>{' '}
                    {formatProvenance(item.evidence.provenance)}
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
                  {item.responsible && (
                    <Typography variant="body2">
                      <strong>Owner:</strong>{' '}
                      {[item.responsible.actorName, item.responsible.role]
                        .filter((value): value is string => value !== undefined)
                        .join(' · ')}
                    </Typography>
                  )}
                </Box>

                <Typography variant="body1">
                  <strong>Next action:</strong> {item.recommendedNextAction}
                </Typography>
              </Stack>
            </Box>
          ))}

        {!isLoading && hasRejected && (
          <Box aria-label="Withheld decision candidates">
            {hasItems && <Divider sx={{ mb: 1.5 }} />}
            <Typography component="h3" variant="subtitle2">
              Withheld candidates
            </Typography>
            <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
              {summary.rejected.map((rejection, index) => (
                <Box
                  component="li"
                  key={`${rejection.candidateId ?? 'unknown'}-${rejection.reason}-${index}`}
                >
                  <Typography variant="body2">
                    <strong>{formatRejectionLabel(rejection.reason, rejection.outcome)}:</strong>{' '}
                    {rejectionCopy[rejection.reason]}
                    {rejection.candidateId && ` Candidate: ${rejection.candidateId}.`}
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
