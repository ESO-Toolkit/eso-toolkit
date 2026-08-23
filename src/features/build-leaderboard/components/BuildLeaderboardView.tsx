/**
 * Presentational shell for clustered build archetypes.
 *
 * The page leads with the shared-scale performance comparison, then renders
 * full-width archetype rows whose build composition is always visible.
 */

import { ExpandMore, InfoOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Collapse,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useState } from 'react';

import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

import { ArchetypeCard } from './ArchetypeCard';
import { DpsDistributionRail } from './DpsDistributionRail';

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

/** Silhouette is bucketed, never shown as a raw float. */
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
  <Stack spacing={2} aria-label="Loading build archetypes">
    <Skeleton variant="rounded" height={190} sx={{ borderRadius: 3.5 }} />
    <Skeleton variant="rounded" height={470} sx={{ borderRadius: 3.5 }} />
    <Skeleton variant="rounded" height={390} sx={{ borderRadius: 3.5 }} />
  </Stack>
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
  // Cluster ids are positional and reused across queries. Reset all disclosure
  // state during render so a different encounter cannot inherit stale UI state.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [lastResult, setLastResult] = useState(result);
  if (lastResult !== result) {
    setLastResult(result);
    setExpandedId(null);
    setMethodologyOpen(false);
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

  if (parses.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

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
        <Box
          sx={(theme) => ({
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.045),
          })}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
            <Typography variant="body2" aria-live="polite" sx={{ color: 'text.secondary' }}>
              Grouping {parses.length} parses into build archetypes…
            </Typography>
            {clusterProgress > 0 && (
              <Typography className="u-tabular" variant="caption" sx={{ color: 'text.disabled' }}>
                {Math.round(clusterProgress)}%
              </Typography>
            )}
          </Box>
          <LinearProgress
            variant={clusterProgress > 0 ? 'determinate' : 'indeterminate'}
            value={clusterProgress}
            sx={{ borderRadius: 999, height: 4 }}
          />
        </Box>
        <SkeletonCards />
      </Box>
    );
  }

  const quality = clusterQuality(result.silhouette);
  const sourceUrlFor = (cluster: BuildCluster): string | undefined =>
    parses.find((parse) => parse.parse_id === cluster.medoidParseId)?.source_url;
  const recommended = result.clusters.find((cluster) => cluster.id === result.recommendedClusterId);
  const others = result.clusters.filter((cluster) => cluster.id !== result.recommendedClusterId);
  const rankFor = (cluster: BuildCluster): number =>
    result.clusters.findIndex((candidate) => candidate.id === cluster.id) + 1;

  const handleComparisonSelect = (clusterId: string): void => {
    if (clusterId !== result.recommendedClusterId) setExpandedId(clusterId);

    const target = document.getElementById(`build-archetype-${clusterId}`);
    if (!target?.scrollIntoView) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  };

  return (
    <Box>
      <Box
        component="section"
        aria-label="Leaderboard data notes"
        sx={(theme) => ({
          mb: 2.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
        })}
      >
        <Button
          variant="text"
          size="small"
          startIcon={<InfoOutlined />}
          endIcon={
            <ExpandMore
              sx={{
                transition: 'transform 160ms ease',
                transform: methodologyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          }
          aria-expanded={methodologyOpen}
          onClick={() => setMethodologyOpen((open) => !open)}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            px: 0,
            py: 1,
            color: 'text.secondary',
          }}
        >
          {result.totalParses} parses · {result.uniqueSignatures} distinct builds · {result.k}{' '}
          archetypes · grouping quality {quality.label.toLowerCase()}
        </Button>
        <Collapse in={methodologyOpen} timeout="auto" unmountOnExit>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
              pb: 1.5,
              color: 'text.secondary',
              '& > div': {
                pl: 1.25,
                borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.22)}`,
              },
            })}
          >
            <Box>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                Core vs common options
              </Typography>
              <Typography variant="caption">
                Core pieces appear in at least 80% of the archetype; common options appear in
                35–79%.
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                Grouping quality: {quality.label}
              </Typography>
              <Typography variant="caption">{quality.tooltip}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                Representative builds
              </Typography>
              <Typography variant="caption">
                Every action opens a real observed parse. Race, CP, mundus, and food are omitted
                when the source does not provide them.
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Box>

      <DpsDistributionRail
        clusters={result.clusters}
        recommendedClusterId={result.recommendedClusterId}
        onSelect={handleComparisonSelect}
      />

      {recommended && (
        <Box component="section" aria-labelledby="recommended-build-heading" sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography
              id="recommended-build-heading"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Recommended starting point
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              balanced for adoption and median performance
            </Typography>
          </Box>
          <ArchetypeCard
            cluster={recommended}
            rank={rankFor(recommended)}
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

      {others.length > 0 && (
        <Box component="section" aria-labelledby="other-builds-heading">
          <Box
            sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography
              id="other-builds-heading"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Other observed archetypes
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {others.length} alternative{others.length === 1 ? '' : 's'}
            </Typography>
          </Box>
          <Stack spacing={1.5}>
            {others.map((cluster) => (
              <ArchetypeCard
                key={cluster.id}
                cluster={cluster}
                rank={rankFor(cluster)}
                totalParses={result.totalParses}
                expanded={expandedId === cluster.id}
                onToggleExpand={() =>
                  setExpandedId((current) => (current === cluster.id ? null : cluster.id))
                }
                esoClass={esoClass ?? cluster.esoClass}
                variations={cluster.variations}
                sourceUrl={sourceUrlFor(cluster)}
                pendingKind={pendingAction?.clusterId === cluster.id ? pendingAction.kind : null}
                actionsDisabled={Boolean(pendingAction)}
                onOpenInEditor={onOpenInEditor}
                onSaveBuild={onSaveBuild}
                onViewSourceLog={onViewSourceLog}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
