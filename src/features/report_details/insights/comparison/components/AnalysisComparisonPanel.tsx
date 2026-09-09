import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import type {
  CohortComparisonResult,
  ComparisonResult,
  IdentifiedProvenance,
  MetricComparison,
  SampleDistribution,
} from '../comparisonModel';

export interface AnalysisComparisonPanelProps {
  readonly comparison: ComparisonResult | CohortComparisonResult;
  readonly title?: string;
}

type AvailableComparison =
  | Extract<ComparisonResult, { readonly status: 'available' }>
  | Extract<CohortComparisonResult, { readonly status: 'available' }>;

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const formatNumber = (value: number | null): string =>
  value === null ? 'Unknown' : numberFormatter.format(value);

const formatDelta = (value: number): string => {
  const formatted = formatNumber(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return '0';
};

const formatContextValue = (value: string): string => value.replaceAll('-', ' ');

const isCohortComparison = (
  comparison: AvailableComparison,
): comparison is Extract<CohortComparisonResult, { readonly status: 'available' }> =>
  'cohortSize' in comparison;

const DistributionEvidence: React.FC<{ readonly distribution: SampleDistribution }> = ({
  distribution,
}) => {
  const observed = `${distribution.observedSampleCount}/${distribution.sampleCount} observed`;
  const range =
    distribution.minimum === null || distribution.maximum === null
      ? 'Range unknown'
      : `Range ${formatNumber(distribution.minimum)}–${formatNumber(distribution.maximum)}`;

  const qualityDetails = [
    distribution.unknownSampleCount > 0 ? `${distribution.unknownSampleCount} unknown` : null,
    distribution.invalidSampleCount > 0 ? `${distribution.invalidSampleCount} invalid` : null,
  ].filter((detail): detail is string => detail !== null);

  return (
    <Box component="span">
      <Typography component="span" variant="body2" color="text.secondary">
        {observed}; {range}
      </Typography>
      {qualityDetails.length > 0 && (
        <Typography component="span" variant="body2" color="text.secondary">
          {' '}
          ({qualityDetails.join('; ')})
        </Typography>
      )}
    </Box>
  );
};

const MetricRow: React.FC<{
  readonly metric: MetricComparison;
}> = ({ metric }) => {
  if (metric.status === 'available') {
    return (
      <TableRow>
        <TableCell component="th" scope="row">
          {metric.metric}
        </TableCell>
        <TableCell align="right">{formatNumber(metric.candidate)}</TableCell>
        <TableCell align="right">{formatNumber(metric.baseline)}</TableCell>
        <TableCell align="right">
          <Typography component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDelta(metric.delta)}
          </Typography>
        </TableCell>
        <TableCell>
          <DistributionEvidence distribution={metric.baselineDistribution} />
        </TableCell>
      </TableRow>
    );
  }

  const unavailableMessage =
    metric.status === 'unavailable'
      ? `Unavailable: ${metric.observedBaselineSamples} observed baseline samples; ${metric.requiredObservedSamples} required.`
      : `Unknown: ${metric.reason}`;

  return (
    <TableRow>
      <TableCell component="th" scope="row">
        {metric.metric}
      </TableCell>
      <TableCell colSpan={3}>
        <Typography color="text.secondary">{unavailableMessage}</Typography>
      </TableCell>
      <TableCell>
        <DistributionEvidence distribution={metric.baselineDistribution} />
      </TableCell>
    </TableRow>
  );
};

const ContextDetails: React.FC<{
  readonly comparison: AvailableComparison;
  readonly headingId: string;
}> = ({ comparison, headingId }) => {
  const { context } = comparison;
  const items = [
    ['ESO partition', context.partition],
    ['ESO update', context.esoUpdate],
    ['Analysis type', formatContextValue(context.encounterKind)],
    ['Encounter', context.encounterId],
    ['Encounter definition', context.encounterVersion],
    ['Difficulty', context.difficulty],
    ['Role', context.role],
    ['Class', context.classId],
    ['Build bracket', context.buildBracket],
  ] as const;

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} component="h3" variant="subtitle2" gutterBottom>
        Comparison context
      </Typography>
      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
          gap: 1,
          m: 0,
        }}
      >
        {items.map(([label, value]) => (
          <Box key={label}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const ProvenanceDetails: React.FC<{
  readonly comparison: AvailableComparison;
  readonly cohort: boolean;
  readonly headingId: string;
}> = ({ comparison, cohort, headingId }) => {
  const candidate = cohort
    ? (comparison as Extract<CohortComparisonResult, { readonly status: 'available' }>).provenance
        .candidate
    : (comparison as Extract<ComparisonResult, { readonly status: 'available' }>).provenance
        .candidate;
  const baseline = cohort
    ? (comparison as Extract<CohortComparisonResult, { readonly status: 'available' }>).provenance
        .cohort
    : [
        (comparison as Extract<ComparisonResult, { readonly status: 'available' }>).provenance
          .baseline,
      ];
  const sources = [...new Set(baseline.map((entry) => entry.provenance.source))].join(', ');
  const firstBaseline = baseline[0] as IdentifiedProvenance;

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} component="h3" variant="subtitle2" gutterBottom>
        Provenance
      </Typography>
      <Box component="dl" sx={{ display: 'grid', gap: 0.5, m: 0 }}>
        <Typography component="div" variant="body2">
          <Box component="dt" sx={{ display: 'inline', fontWeight: 700 }}>
            Candidate pull:{' '}
          </Box>
          <Box component="dd" sx={{ display: 'inline', m: 0 }}>
            {candidate.pullId} at {candidate.occurredAt}
          </Box>
        </Typography>
        <Typography component="div" variant="body2">
          <Box component="dt" sx={{ display: 'inline', fontWeight: 700 }}>
            {cohort ? 'Cohort baseline source:' : 'Baseline pull:'}{' '}
          </Box>
          <Box component="dd" sx={{ display: 'inline', m: 0 }}>
            {cohort ? sources : `${firstBaseline.pullId} at ${firstBaseline.occurredAt}`}
          </Box>
        </Typography>
        {cohort && (
          <Box component="div">
            <Typography component="div" variant="body2" sx={{ fontWeight: 700 }}>
              Cohort baseline pulls ({baseline.length}):
            </Typography>
            <Box
              component="ul"
              aria-label="Cohort baseline pulls"
              sx={{ m: 0, pl: 2.5, overflowWrap: 'anywhere' }}
            >
              {baseline.map((entry) => (
                <Box component="li" key={entry.pullId}>
                  <Typography variant="body2">
                    {entry.pullId} at {entry.occurredAt}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Typography component="div" variant="body2">
          <Box component="dt" sx={{ display: 'inline', fontWeight: 700 }}>
            Baseline period:{' '}
          </Box>
          <Box component="dd" sx={{ display: 'inline', m: 0 }}>
            {firstBaseline.provenance.baselinePeriod.startAt} to{' '}
            {firstBaseline.provenance.baselinePeriod.endAt}
          </Box>
        </Typography>
        <Typography component="div" variant="body2">
          <Box component="dt" sx={{ display: 'inline', fontWeight: 700 }}>
            Refreshed:{' '}
          </Box>
          <Box component="dd" sx={{ display: 'inline', m: 0 }}>
            {candidate.provenance.refreshedAt}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

type UnavailableComparisonResult = Extract<
  ComparisonResult | CohortComparisonResult,
  { readonly status: 'unavailable' }
>;

const isContextIncompatibility = (reason: UnavailableComparisonResult['reason']): boolean =>
  reason.startsWith('cross-');

const UnavailableComparison: React.FC<{
  readonly comparison: UnavailableComparisonResult;
}> = ({ comparison }) => {
  const incompatible = isContextIncompatibility(comparison.reason);

  return (
    <Alert severity="warning" role="alert">
      <AlertTitle>{incompatible ? 'Comparison incompatible' : 'Comparison unavailable'}</AlertTitle>
      {comparison.message}{' '}
      {incompatible
        ? 'No metric or score is shown because these analyses have incompatible comparison context.'
        : 'No metric or score is shown because a valid comparison baseline is unavailable.'}
      {incompatible && <Chip label="Incompatible context" size="small" sx={{ ml: 1 }} />}
    </Alert>
  );
};

/**
 * Presents a model-validated pull or cohort comparison without fabricating a score for unavailable
 * data. The input is intentionally the comparison model result, not raw pulls, so context guards
 * remain the model's single source of truth.
 */
export const AnalysisComparisonPanel: React.FC<AnalysisComparisonPanelProps> = ({
  comparison,
  title = 'Analysis comparison',
}) => {
  const headingId = React.useId();
  const contextHeadingId = `${headingId}-context`;
  const provenanceHeadingId = `${headingId}-provenance`;
  const metricsHeadingId = `${headingId}-metrics`;

  if (comparison.status === 'unavailable') {
    return (
      <Paper
        component="section"
        aria-labelledby={headingId}
        elevation={0}
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Typography id={headingId} component="h2" variant="h6" gutterBottom>
          {title}
        </Typography>
        <UnavailableComparison comparison={comparison} />
      </Paper>
    );
  }

  const cohort = isCohortComparison(comparison);
  const baselineLabel = cohort ? 'Cohort average' : 'Baseline pull';
  const description = cohort
    ? `${comparison.cohortSize} context-compatible baseline pulls; ${comparison.minimumObservedBaselineSamples} observed samples required per metric.`
    : 'One context-compatible baseline pull.';
  const hasIncompleteEvidence = comparison.metrics.some((metric) => metric.status !== 'available');
  const provisional =
    hasIncompleteEvidence || comparison.confidence === 'low' || comparison.confidence === 'unknown';

  return (
    <Paper
      component="section"
      aria-labelledby={headingId}
      elevation={0}
      sx={(theme) => ({
        p: { xs: 2, sm: 3 },
        overflow: 'hidden',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)'
            : theme.palette.background.paper,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 14,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 8px 30px rgba(0, 0, 0, 0.25)'
            : '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
      })}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography id={headingId} component="h2" variant="h6">
              {title}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <Chip label={cohort ? 'Cohort comparison' : 'A/B pull comparison'} color="primary" />
            <Tooltip title="The lowest confidence supplied by the analyses in this comparison.">
              <Chip
                icon={<InfoOutlinedIcon aria-hidden="true" />}
                label={`Confidence: ${comparison.confidence}`}
                variant="outlined"
              />
            </Tooltip>
          </Stack>
        </Stack>

        {provisional && (
          <Alert severity="info" role="status" aria-live="polite">
            <AlertTitle>Provisional comparison</AlertTitle>
            {hasIncompleteEvidence
              ? 'Some metrics have incomplete or insufficient evidence. Numeric deltas are shown only where both sides have sufficient observed data.'
              : 'The lowest analysis confidence is low or unknown. Treat this comparison as directional.'}
          </Alert>
        )}

        <ContextDetails comparison={comparison} headingId={contextHeadingId} />
        <ProvenanceDetails
          comparison={comparison}
          cohort={cohort}
          headingId={provenanceHeadingId}
        />

        <Box component="section" aria-labelledby={metricsHeadingId}>
          <Typography id={metricsHeadingId} component="h3" variant="subtitle2" gutterBottom>
            Metric evidence
          </Typography>
          {comparison.metrics.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>No metric evidence</AlertTitle>
              No metric or score is available for this comparison.
            </Alert>
          )}
          <TableContainer
            sx={{ overflowX: 'auto' }}
            tabIndex={0}
            role="region"
            aria-labelledby={metricsHeadingId}
            aria-label="Scrollable comparison metrics"
          >
            <Table size="small" aria-label="Comparison metrics" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">
                    Metric
                  </TableCell>
                  <TableCell component="th" scope="col" align="right">
                    Candidate
                  </TableCell>
                  <TableCell component="th" scope="col" align="right">
                    {baselineLabel}
                  </TableCell>
                  <TableCell component="th" scope="col" align="right">
                    Delta
                  </TableCell>
                  <TableCell component="th" scope="col">
                    Evidence
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparison.metrics.length > 0 ? (
                  comparison.metrics.map((metric) => (
                    <MetricRow key={metric.metric} metric={metric} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>No metric evidence is available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Paper>
  );
};
