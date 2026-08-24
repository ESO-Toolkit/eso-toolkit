import { InfoOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  Skeleton,
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
  emptyMessage?: string;
}

function clusterQuality(silhouette: number): { label: string; tooltip: string } {
  if (silhouette >= 0.5) {
    return {
      label: 'Strong',
      tooltip: 'These builds separate cleanly—the archetypes are well defined.',
    };
  }
  if (silhouette >= 0.25) {
    return {
      label: 'Moderate',
      tooltip: 'The groupings are useful, but some builds sit between archetypes.',
    };
  }
  return {
    label: 'Weak',
    tooltip: 'Top players are running many similar variations, so the groups overlap.',
  };
}

const SkeletonLedger: React.FC = () => (
  <Box aria-label="Loading build archetypes">
    <Skeleton variant="rectangular" height={232} sx={{ mb: 2.5 }} />
    {[0, 1, 2, 3].map((row) => (
      <Skeleton key={row} variant="text" height={58} sx={{ borderRadius: 0 }} />
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

  if (loading) return <SkeletonLedger />;

  if (parses.length === 0) return <Alert severity="info">{emptyMessage}</Alert>;

  if (tooFewParses) {
    return (
      <Alert severity="info" data-testid="too-few-parses">
        Only {parses.length} parses recorded here—not enough to identify build archetypes yet. Check
        back once more logs are ingested.
      </Alert>
    );
  }

  if (clustering || !result) {
    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
            <Typography aria-live="polite" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              Grouping {parses.length} parses into build archetypes…
            </Typography>
            {clusterProgress > 0 && (
              <Typography className="u-tabular" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                {Math.round(clusterProgress)}%
              </Typography>
            )}
          </Box>
          <LinearProgress
            variant={clusterProgress > 0 ? 'determinate' : 'indeterminate'}
            value={clusterProgress}
            sx={{ height: 3 }}
          />
        </Box>
        <SkeletonLedger />
      </Box>
    );
  }

  const quality = clusterQuality(result.silhouette);
  const sourceUrlFor = (cluster: BuildCluster): string | undefined =>
    parses.find((parse) => parse.parse_id === cluster.medoidParseId)?.source_url;
  const recommended = result.clusters.find((cluster) => cluster.id === result.recommendedClusterId);
  const ordered = recommended
    ? [recommended, ...result.clusters.filter((cluster) => cluster.id !== recommended.id)]
    : result.clusters;
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
          mb: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
        })}
      >
        <Box sx={{ display: 'flex', minHeight: 34, alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ flex: 1, color: 'text.secondary', fontSize: '0.72rem' }}>
            <Box component="span" className="u-tabular">
              {result.totalParses}
            </Box>{' '}
            parses · {result.uniqueSignatures} distinct builds · {result.k} archetypes · Grouping
            quality {quality.label.toLowerCase()}
          </Typography>
          <IconButton
            size="small"
            aria-label="How this leaderboard works"
            aria-expanded={methodologyOpen}
            onClick={() => setMethodologyOpen((open) => !open)}
          >
            <InfoOutlined sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Collapse in={methodologyOpen} timeout="auto" unmountOnExit>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: { xs: 0.75, sm: 2 },
              pb: 1.25,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.42)}`,
              pt: 1,
            })}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.45 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Core and common.
              </Box>{' '}
              Core pieces appear in at least 80%; common options appear in 35–79%.
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.45 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Grouping quality: {quality.label}.
              </Box>{' '}
              {quality.tooltip}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.45 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Recommendation.
              </Box>{' '}
              Highest median DPS among broadly adopted groups; actions open a real observed parse.
            </Typography>
          </Box>
        </Collapse>
      </Box>

      <DpsDistributionRail
        clusters={result.clusters}
        recommendedClusterId={result.recommendedClusterId}
        selectedClusterId={expandedId ?? result.recommendedClusterId}
        onSelect={handleComparisonSelect}
      />

      <Box
        sx={(theme) => ({
          display: 'flex',
          minHeight: 32,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.86)}`,
        })}
      >
        <Typography
          id="archetypes-heading"
          sx={{
            fontSize: '0.66rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Archetypes
        </Typography>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
          sorted by share
        </Typography>
      </Box>

      <Box
        component="ol"
        aria-labelledby="archetypes-heading"
        sx={{ m: 0, p: 0, listStyle: 'none' }}
      >
        {ordered.map((cluster) => {
          const featured = cluster.id === result.recommendedClusterId;
          return (
            <Box component="li" key={cluster.id}>
              <ArchetypeCard
                cluster={cluster}
                rank={rankFor(cluster)}
                totalParses={result.totalParses}
                featured={featured}
                expanded={featured || expandedId === cluster.id}
                onToggleExpand={
                  featured
                    ? undefined
                    : () => setExpandedId((current) => (current === cluster.id ? null : cluster.id))
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
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
