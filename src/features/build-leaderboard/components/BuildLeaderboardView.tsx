import { InfoOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useRef, useState } from 'react';

import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

import { ArchetypeRow } from './ArchetypeRow';
import { BuildInspector } from './BuildInspector';

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
    return { label: 'Strong', tooltip: 'These build patterns separate cleanly.' };
  }
  if (silhouette >= 0.25) {
    return {
      label: 'Moderate',
      tooltip: 'The patterns are useful, though some builds overlap.',
    };
  }
  return { label: 'Limited', tooltip: 'Top players are using many similar variations.' };
}

function displayLabel(cluster: BuildCluster, contextClass?: string): string {
  if (!contextClass) return cluster.label;
  const escapedClass = cluster.esoClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return cluster.label.replace(new RegExp(`\\s+${escapedClass}$`, 'i'), '').trim();
}

const SkeletonWorkspace: React.FC = () => (
  <Box aria-label="Loading build archetypes">
    <Skeleton variant="text" width={280} height={28} sx={{ mb: 1 }} />
    <Skeleton variant="rectangular" height={430} sx={{ borderRadius: 3.5 }} />
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
  const [selectedId, setSelectedId] = useState<string | null>(
    result?.recommendedClusterId ?? result?.clusters[0]?.id ?? null,
  );
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [lastResult, setLastResult] = useState(result);
  const inspectorRef = useRef<HTMLDivElement | null>(null);

  if (lastResult !== result) {
    setLastResult(result);
    setSelectedId(result?.recommendedClusterId ?? result?.clusters[0]?.id ?? null);
    setEvidenceOpen(false);
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

  if (loading) return <SkeletonWorkspace />;

  if (parses.length === 0) return <Alert severity="info">{emptyMessage}</Alert>;

  if (tooFewParses) {
    return (
      <Alert severity="info" data-testid="too-few-parses">
        Only {parses.length} parses are recorded here—not enough to identify reliable build patterns
        yet.
      </Alert>
    );
  }

  if (clustering || !result) {
    return (
      <Box>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
            <Typography aria-live="polite" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              Grouping {parses.length} parses into build patterns…
            </Typography>
            {clusterProgress > 0 && (
              <Typography
                className="u-tabular"
                sx={{ color: 'text.secondary', fontSize: '0.72rem' }}
              >
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
        <SkeletonWorkspace />
      </Box>
    );
  }

  const quality = clusterQuality(result.silhouette);
  const recommended = result.clusters.find((cluster) => cluster.id === result.recommendedClusterId);
  const ordered = recommended
    ? [recommended, ...result.clusters.filter((cluster) => cluster.id !== recommended.id)]
    : result.clusters;
  const selected =
    result.clusters.find((cluster) => cluster.id === selectedId) ??
    recommended ??
    result.clusters[0];
  const sourceUrlFor = (cluster: BuildCluster): string | undefined =>
    parses.find((parse) => parse.parse_id === cluster.medoidParseId)?.source_url;

  const handleSelect = (clusterId: string): void => {
    setSelectedId(clusterId);
    setEvidenceOpen(false);

    const mobile = window.matchMedia?.('(max-width: 899px)').matches ?? false;
    if (!mobile) return;
    window.requestAnimationFrame?.(() => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      inspectorRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', minHeight: 32, alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ flex: 1, color: 'text.secondary', fontSize: '0.76rem' }}>
            <Box
              component="span"
              className="u-tabular"
              sx={{ color: 'text.primary', fontWeight: 650 }}
            >
              {result.totalParses}
            </Box>{' '}
            top-ranked parses · {result.k} build patterns
          </Typography>
          <IconButton
            size="small"
            aria-label="How this leaderboard works"
            aria-expanded={methodologyOpen}
            onClick={() => setMethodologyOpen((open) => !open)}
          >
            <InfoOutlined sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
        <Collapse in={methodologyOpen} timeout="auto" unmountOnExit>
          <Box
            sx={(theme) => ({
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: { xs: 0.75, sm: 2 },
              mt: 0.5,
              pt: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
            })}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Scope.
              </Box>{' '}
              {result.uniqueSignatures} distinct builds were grouped into {result.k} patterns.
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Confidence: {quality.label}.
              </Box>{' '}
              {quality.tooltip}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                Starting point.
              </Box>{' '}
              Results vary with rotation, buffs, and group composition.
            </Typography>
          </Box>
        </Collapse>
      </Box>

      <Paper
        component="section"
        aria-label="Build pattern workspace"
        elevation={0}
        sx={(theme) => ({
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
          borderRadius: 2.5,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(8,13,26,0.98) 100%)'
              : theme.palette.background.paper,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 22px 55px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.045)'
              : '0 12px 34px rgba(15,23,42,0.09), inset 0 1px 0 rgba(255,255,255,0.84)',
        })}
      >
        <Box
          sx={{
            display: 'grid',
            alignItems: 'stretch',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(340px, 0.9fr) minmax(0, 1.35fr)' },
          }}
        >
          <Box
            component="section"
            aria-labelledby="build-patterns-heading"
            sx={(theme) => ({
              minWidth: 0,
              order: { xs: 2, md: 1 },
              borderTop: { xs: `1px solid ${alpha(theme.palette.divider, 0.78)}`, md: 'none' },
              borderRight: { xs: 'none', md: `1px solid ${alpha(theme.palette.divider, 0.62)}` },
              backgroundColor: alpha(
                theme.palette.background.default,
                theme.palette.mode === 'dark' ? 0.14 : 0.24,
              ),
            })}
          >
            <Box
              sx={{
                display: 'grid',
                minHeight: 48,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'minmax(0, 1fr) 64px 52px 18px',
                },
                alignItems: 'center',
                columnGap: 1,
                px: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography id="build-patterns-heading" sx={{ fontSize: '0.76rem', fontWeight: 700 }}>
                Build patterns
              </Typography>
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                Typical
              </Typography>
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                Parses
              </Typography>
            </Box>
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {ordered.map((cluster) => (
                <ArchetypeRow
                  key={cluster.id}
                  cluster={cluster}
                  label={displayLabel(cluster, cluster.esoClass)}
                  selected={cluster.id === selected.id}
                  recommended={cluster.id === result.recommendedClusterId}
                  showClassIcon={!esoClass}
                  onSelect={() => handleSelect(cluster.id)}
                />
              ))}
            </Box>
          </Box>

          <Box
            ref={inspectorRef}
            sx={(theme) => ({
              display: 'flex',
              minWidth: 0,
              order: { xs: 1, md: 2 },
              scrollMarginTop: 72,
              background:
                theme.palette.mode === 'dark'
                  ? `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, 0.055)}, transparent 38%)`
                  : `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, 0.035)}, transparent 42%)`,
            })}
          >
            <BuildInspector
              key={selected.id}
              cluster={selected}
              label={displayLabel(selected, esoClass)}
              totalParses={result.totalParses}
              recommended={selected.id === result.recommendedClusterId}
              evidenceOpen={evidenceOpen}
              onToggleEvidence={() => setEvidenceOpen((open) => !open)}
              variations={selected.variations}
              sourceUrl={sourceUrlFor(selected)}
              pendingKind={pendingAction?.clusterId === selected.id ? pendingAction.kind : null}
              actionsDisabled={Boolean(pendingAction)}
              onOpenInEditor={onOpenInEditor}
              onSaveBuild={onSaveBuild}
              onViewSourceLog={onViewSourceLog}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
