import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import type { ReactElement } from 'react';

import {
  createEvidenceDrilldownSnapshot,
  type EvidenceDrilldownSnapshot,
} from './evidenceDrilldownModel';

export type EvidenceDrilldownProvenance = Readonly<{
  source: string;
  period: string;
  refreshedAt: string;
}>;

/**
 * Fetch lifecycle supplied by the integration layer. A snapshot is never
 * promoted to `ready` when its payload is invalid.
 */
export type EvidenceDrilldownDataState = 'loading' | 'partial' | 'stale' | 'failed';

export type EvidenceDrilldownPanelProps = Readonly<{
  input: unknown;
  /**
   * Optional fetch lifecycle for an otherwise valid snapshot. Omit for a
   * freshly calculated result.
   */
  dataState?: EvidenceDrilldownDataState;
  provenance?: EvidenceDrilldownProvenance;
  title?: string;
}>;

const Panel = styled('section')(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 14,
  border: `1px solid ${theme.palette.divider}`,
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
      : theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 30px rgba(0, 0, 0, 0.25)'
      : '0 4px 12px rgba(15, 23, 42, 0.06)',
}));

const formatTimestamp = (timestamp: number): string => `${timestamp} ms`;

const formatConfidence = (
  confidence: EvidenceDrilldownSnapshot['entries'][number]['confidence'],
): string =>
  confidence === 'unknown' ? 'Confidence unknown' : `Confidence ${Math.round(confidence * 100)}%`;

const StateNotice = ({
  dataState,
  hasSnapshot,
}: {
  dataState?: EvidenceDrilldownDataState;
  hasSnapshot: boolean;
}): ReactElement | null => {
  // Invalid inputs have a more specific message below. Avoid announcing the
  // same failure twice while keeping the panel's data-state machine honest.
  if (dataState === 'failed' && !hasSnapshot) {
    return null;
  }

  switch (dataState) {
    case 'loading':
      return (
        <Alert aria-live="polite" role="status" severity="info">
          Evidence is loading. {hasSnapshot ? 'The current evidence may be replaced.' : ''}
        </Alert>
      );
    case 'partial':
      return (
        <Alert aria-live="polite" role="status" severity="warning">
          Evidence is partial. Some events could not be included in this result.
        </Alert>
      );
    case 'stale':
      return (
        <Alert aria-live="polite" role="status" severity="warning">
          Evidence is stale and may not include the newest fight events.
        </Alert>
      );
    case 'failed':
      return (
        <Alert aria-live="assertive" role="alert" severity="error">
          Evidence refresh failed.{' '}
          {hasSnapshot ? 'The evidence below is not current.' : 'No evidence is available.'}
        </Alert>
      );
    default:
      return null;
  }
};

const Provenance = ({ provenance }: { provenance?: EvidenceDrilldownProvenance }): ReactElement =>
  provenance ? (
    <Box component="section" aria-labelledby="evidence-provenance-heading">
      <Typography id="evidence-provenance-heading" variant="subtitle2">
        Source provenance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {provenance.source} | {provenance.period} | refreshed {provenance.refreshedAt}
      </Typography>
    </Box>
  ) : (
    <Alert aria-live="polite" role="status" severity="warning">
      Source provenance is unavailable for this evidence.
    </Alert>
  );

const Entry = ({
  entry,
  position,
}: {
  entry: EvidenceDrilldownSnapshot['entries'][number];
  position: number;
}): ReactElement => (
  <Box
    component="article"
    aria-label={`Evidence item ${position}`}
    sx={(theme) => ({
      p: 1.5,
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    })}
  >
    <Stack spacing={1}>
      <Stack
        spacing={1}
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2">Evidence item {position}</Typography>
        <Chip
          size="small"
          label={formatConfidence(entry.confidence)}
          color={entry.confidence === 'unknown' ? 'warning' : 'info'}
          variant="outlined"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {formatTimestamp(entry.timestamp)} | phase {entry.scope.phaseId} | role {entry.scope.role}
        {entry.timestampWasClipped
          ? ` | reported timestamp ${formatTimestamp(entry.originalTimestamp)} | clipped to fight bounds`
          : ''}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Observed behavior
          </Typography>
          <Typography>{entry.behavior.observed}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Expected behavior and next step
          </Typography>
          <Typography>{entry.behavior.expected}</Typography>
        </Box>
      </Box>
      <Typography variant="body2">
        Why it matters — estimated impact (producer-provided):{' '}
        <strong>{entry.estimatedImpact}</strong> | score contribution: {entry.scoreContribution}
      </Typography>
    </Stack>
  </Box>
);

export const EvidenceDrilldownPanel = ({
  input,
  dataState,
  provenance,
  title = 'Evidence drilldown',
}: EvidenceDrilldownPanelProps): ReactElement => {
  const snapshot = createEvidenceDrilldownSnapshot(input);
  const resolvedDataState = snapshot ? (dataState ?? 'ready') : 'failed';

  return (
    <Panel
      aria-labelledby="evidence-drilldown-heading"
      data-state={resolvedDataState}
      data-testid="evidence-drilldown-panel"
    >
      <Stack spacing={2}>
        <Box>
          <Typography id="evidence-drilldown-heading" variant="h6">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Timestamped evidence for transparent analysis decisions.
          </Typography>
        </Box>
        <Provenance provenance={provenance} />
        <StateNotice dataState={snapshot ? dataState : 'failed'} hasSnapshot={snapshot !== null} />
        {!snapshot ? (
          <Alert aria-live="assertive" severity="error" role="alert">
            Evidence is unavailable because the supplied evidence payload is invalid.
          </Alert>
        ) : snapshot.entries.length === 0 ? (
          <Alert aria-live="polite" role="status" severity="info">
            No evidence was recorded for this fight.
          </Alert>
        ) : (
          <Stack component="div" aria-label="Evidence entries" spacing={1.5}>
            {snapshot.entries.map((entry, index) => (
              <Entry key={entry.id} entry={entry} position={index + 1} />
            ))}
          </Stack>
        )}
        {snapshot && <Divider />}
        {snapshot && (
          <Typography variant="body2" color="text.secondary">
            Fight window: {formatTimestamp(snapshot.fight.startTimestamp)} -{' '}
            {formatTimestamp(snapshot.fight.endTimestamp)} | total score contribution:{' '}
            {snapshot.scoreContributionTotal}
          </Typography>
        )}
      </Stack>
    </Panel>
  );
};
