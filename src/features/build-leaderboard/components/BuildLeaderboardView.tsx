/**
 * Presentational shell for a set of archetypes.
 *
 * Container/view split per repo convention: this file is prop-driven and is what
 * Storybook and the component tests target.
 */

import { Alert, Box, Button, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';

import { MetricPill } from '../../../components/MetricPill';
import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

import { ArchetypeCard } from './ArchetypeCard';

export interface BuildLeaderboardViewProps {
  parses: readonly DpsParse[];
  result: ClusterBuildsResult | null;
  loading: boolean;
  clustering: boolean;
  clusterProgress: number;
  error: string | null;
  tooFewParses: boolean;
  esoClass?: string;
  onRetry?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  pendingAction?: { clusterId: string; kind: 'open' | 'save' } | null;
  /** Copy shown when there is no data at all for the current selection. */
  emptyMessage?: string;
}

/**
 * Silhouette is bucketed, never shown as a raw float. It is a diagnostic, and
 * presenting "0.31" as a headline number implies a precision the metric does not
 * have.
 */
function clusterQuality(silhouette: number): { label: string; tooltip: string } {
  if (silhouette >= 0.5) {
    return {
      label: 'Strong',
      tooltip: 'These builds separate cleanly — the groupings are well defined.',
    };
  }
  if (silhouette >= 0.25) {
    return {
      label: 'Moderate',
      tooltip: 'The groupings are reasonable, but some builds sit between archetypes.',
    };
  }
  return {
    label: 'Weak',
    tooltip: 'Top players are running many similar variations, so these groups overlap a lot.',
  };
}

const SkeletonCards: React.FC = () => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
    <Skeleton variant="rounded" height={260} sx={{ flex: '1 1 100%', borderRadius: 3.5 }} />
    {[0, 1, 2].map((index) => (
      <Skeleton
        key={index}
        variant="rounded"
        height={190}
        sx={{ flex: '1 1 320px', borderRadius: 3.5 }}
      />
    ))}
  </Box>
);

export const BuildLeaderboardView: React.FC<BuildLeaderboardViewProps> = ({
  parses,
  result,
  loading,
  clustering,
  clusterProgress,
  error,
  tooFewParses,
  esoClass,
  onRetry,
  onOpenInEditor,
  onSaveBuild,
  onViewSourceLog,
  pendingAction,
  emptyMessage = 'No top parses recorded here yet.',
}) => {
  // Reset whenever the clustered result changes. Cluster ids are positional
  // ('c0', 'c1', …) and get reused across runs, so an id held over from the
  // previous encounter or class would expand a completely unrelated archetype.
  //
  // This is React's documented "adjust state when a prop changes" form, not an
  // effect: React restarts the render before painting, so the wrong card never
  // reaches the screen, whereas an effect would flash it for a frame. The
  // previous result is tracked in state rather than a ref deliberately — a ref
  // mutated during render survives a render that concurrent React discards,
  // which would desync it from the state it guards.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState(result);
  if (lastResult !== result) {
    setLastResult(result);
    setExpandedId(null);
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {error}
      </Alert>
    );
  }

  if (loading) return <SkeletonCards />;

  // Empty is not broken — an encounter with no ingested parses is a normal state,
  // so this is `info`, matching the existing leaderboard page's distinction.
  if (parses.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  // A three-way split of six points is noise dressed up as insight.
  if (tooFewParses) {
    return (
      <Alert severity="info" data-testid="too-few-parses">
        Only {parses.length} parses recorded here — not enough to identify build archetypes yet.
        Check back once more logs are ingested.
      </Alert>
    );
  }

  if (clustering || !result) {
    return (
      <Box>
        <LinearProgress
          variant={clusterProgress > 0 ? 'determinate' : 'indeterminate'}
          value={clusterProgress}
          sx={{ mb: 2, borderRadius: 1 }}
        />
        <Typography variant="body2" aria-live="polite" sx={{ mb: 2, opacity: 0.8 }}>
          Grouping {parses.length} parses into builds…
        </Typography>
        <SkeletonCards />
      </Box>
    );
  }

  const quality = clusterQuality(result.silhouette);
  const sourceUrlFor = (cluster: BuildCluster): string | undefined =>
    parses.find((parse) => parse.parse_id === cluster.medoidParseId)?.source_url;
  const recommended = result.clusters.find((c) => c.id === result.recommendedClusterId);
  const others = result.clusters.filter((c) => c.id !== result.recommendedClusterId);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
        <MetricPill label="Parses analysed" value={result.totalParses} />
        <MetricPill label="Distinct builds" value={result.uniqueSignatures} />
        <MetricPill label="Archetypes found" value={result.k} intent="info" />
        <MetricPill label="Grouping quality" value={quality.label} tooltip={quality.tooltip} />
      </Stack>

      {recommended && (
        <Box sx={{ mb: 3 }}>
          <ArchetypeCard
            cluster={recommended}
            totalParses={result.totalParses}
            featured
            esoClass={esoClass ?? recommended.esoClass}
            variations={recommended.variations}
            sourceUrl={sourceUrlFor(recommended)}
            pendingKind={pendingAction?.clusterId === recommended.id ? pendingAction.kind : null}
            actionsDisabled={Boolean(pendingAction)}
            onOpenInEditor={onOpenInEditor}
            onSaveBuild={onSaveBuild}
            onViewSourceLog={onViewSourceLog}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {others.map((cluster) => (
          <Box key={cluster.id} sx={{ flex: '1 1 340px', minWidth: 0 }}>
            <ArchetypeCard
              cluster={cluster}
              totalParses={result.totalParses}
              expanded={expandedId === cluster.id}
              onToggleExpand={() =>
                setExpandedId((current) => (current === cluster.id ? null : cluster.id))
              }
              variations={cluster.variations}
              sourceUrl={sourceUrlFor(cluster)}
              pendingKind={pendingAction?.clusterId === cluster.id ? pendingAction.kind : null}
              actionsDisabled={Boolean(pendingAction)}
              onOpenInEditor={onOpenInEditor}
              onSaveBuild={onSaveBuild}
              onViewSourceLog={onViewSourceLog}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
