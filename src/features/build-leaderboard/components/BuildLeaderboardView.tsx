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
import React, { useMemo, useRef, useState } from 'react';

import { detectSolvedMeta } from '../clustering/solvedMeta';
import { getLeaderboardClassTheme } from '../theme/leaderboardTheme';
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
  /** Encounter context the parses were scoped to, shown with the card list. */
  scopeLabel?: string;
  /**
   * Human phrase for WHERE the parses come from, used by the too-few-parses
   * message ('on DSR · Tideborn Taleria', 'across 14 trial bosses').
   */
  scopeDescription?: string;
  /**
   * Pooled class view: cluster.dps holds internal cross-boss comparison values,
   * while cards show raw DPS and top-25 boss coverage.
   */
  pooled?: boolean;
  /**
   * Widens a thin selection (a class slice of one boss) to every boss. Rendered
   * as the action on the ungrouped banner, so a starved board offers a way out
   * instead of telling the reader to go find one.
   */
  onBroadenScope?: () => void;
  /** Call to action for `onBroadenScope`, e.g. 'Show all trial bosses'. */
  broadenScopeLabel?: string;
  onRetry?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster) => void;
  pendingAction?: { clusterId: string; kind: 'open' | 'save' } | null;
  emptyMessage?: string;
  hideSummary?: boolean;
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
  scopeLabel,
  scopeDescription,
  pooled = false,
  onBroadenScope,
  broadenScopeLabel = 'Show all trial bosses',
  onRetry,
  onOpenInEditor,
  onSaveBuild,
  onViewSourceLog,
  pendingAction,
  emptyMessage = 'No top parses recorded here yet.',
  hideSummary = false,
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

  // Pooled view: the best RAW parse in each cluster heads its card ("112k @
  // DSR"). Raw amounts come from `parses`, never the normalized cluster input.
  // Lives above every early return (error/loading/too-few) — hook order must
  // stay stable across renders.
  const bestParseByCluster = useMemo(() => {
    const map = new Map<string, DpsParse>();
    if (!pooled) return map;
    const byId = new Map(parses.map((parse) => [parse.parse_id, parse]));
    result?.clusters.forEach((cluster) => {
      let best: DpsParse | undefined;
      for (const id of cluster.memberParseIds) {
        const parse = byId.get(id);
        if (parse && (!best || parse.amount > best.amount)) best = parse;
      }
      if (best) map.set(cluster.id, best);
    });
    return map;
  }, [pooled, parses, result]);

  const bossCoverage = useMemo(() => {
    const byCluster = new Map<string, number>();
    if (!pooled) return { available: 0, byCluster };

    const byId = new Map(parses.map((parse) => [parse.parse_id, parse]));
    const available = new Set(parses.map((parse) => parse.encounter_id)).size;
    result?.clusters.forEach((cluster) => {
      const bosses = new Set<number>();
      cluster.memberParseIds.forEach((id) => {
        const parse = byId.get(id);
        if (parse) bosses.add(parse.encounter_id);
      });
      byCluster.set(cluster.id, bosses.size);
    });

    return { available, byCluster };
  }, [pooled, parses, result]);

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

  // All parses carrying null builds cluster into nothing. Dereferencing
  // `clusters[0]` below would throw, so guard before any selection logic runs.
  if (result.clusters.length === 0) {
    return (
      <Alert severity="info" data-testid="no-build-data">
        No build data available for this selection
      </Alert>
    );
  }

  const quality = clusterQuality(result.silhouette);
  // Null on a healthy board, which is the common case; every use below is
  // guarded so the normal archetype presentation is untouched.
  const solved = detectSolvedMeta(result);
  const solvedTheme = getLeaderboardClassTheme(solved?.dominant.esoClass ?? '');
  const recommended = result.clusters.find((cluster) => cluster.id === result.recommendedClusterId);
  const ordered = recommended
    ? [recommended, ...result.clusters.filter((cluster) => cluster.id !== recommended.id)]
    : result.clusters;
  const selected =
    result.clusters.find((cluster) => cluster.id === selectedId) ??
    recommended ??
    result.clusters[0];
  const selectedClassTheme = getLeaderboardClassTheme(selected.esoClass);
  const representativeParseFor = (cluster: BuildCluster): DpsParse | undefined =>
    parses.find((parse) => parse.parse_id === cluster.medoidParseId);

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
      {/* Thin data is a caveat, never a dead end. The builds recorded here are
          still shown — grouping them into archetypes is what we withhold, and
          the banner says so and offers a wider scope where one exists. */}
      {tooFewParses && (
        <Alert
          severity="info"
          data-testid="too-few-parses"
          action={
            onBroadenScope && (
              <Button color="inherit" size="small" onClick={onBroadenScope}>
                {broadenScopeLabel}
              </Button>
            )
          }
          sx={{ mb: 1.5, alignItems: 'center' }}
        >
          {/* Say WHERE the thinness is: on the pooled class view the boss count
              matters; on a single boss the class slice does. Without the scope,
              "Only 2 parses are recorded" reads like the boss is empty. */}
          {`Only ${parses.length} ${esoClass ? `${esoClass} ` : ''}${
            parses.length === 1 ? 'parse' : 'parses'
          } ${scopeDescription ?? 'in this selection'} — too few to group into reliable build patterns (10+ needed), so each build is listed on its own below.`}
        </Alert>
      )}

      {/* Stated as a measured result, in the page's own visual language, and
          never as a caveat. "Only one archetype was found" would read as a
          shortfall of the tool; the truth is a fact about the class, and for a
          player it is more actionable than three invented archetypes. */}
      {solved && !tooFewParses && (
        <Paper
          elevation={0}
          data-testid="solved-meta"
          sx={(theme) => ({
            mb: 1.5,
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            border: `1px solid ${alpha(solvedTheme.accent, 0.42)}`,
            borderRadius: 1.5,
            background: `linear-gradient(135deg, ${alpha(solvedTheme.accent, 0.13)}, ${alpha(theme.palette.background.paper, 0.35)})`,
          })}
        >
          <Typography
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            One build. Nearly everyone runs it.
          </Typography>
          <Typography
            sx={{ mt: 0.4, color: 'text.secondary', fontSize: '0.74rem', lineHeight: 1.5 }}
          >
            {`${solved.sharePercent}% of the ${solved.clusteredParses} top parses ${
              scopeDescription ?? 'in this selection'
            } converge on a single build. Where other boards split into competing archetypes, this one has settled on one answer.`}
            {solved.outlierParses > 0 &&
              ` The other ${solved.outlierParses} ${
                solved.outlierParses === 1 ? 'parse runs' : 'parses run'
              } something meaningfully different and ${
                solved.outlierParses === 1 ? 'is' : 'are'
              } listed below.`}
          </Typography>
        </Paper>
      )}

      {!hideSummary && (
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
              top-ranked parses ·{' '}
              {solved
                ? `one build, ${solved.sharePercent}% of parses`
                : `${result.k} build patterns`}
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
                {solved
                  ? `${result.uniqueSignatures} distinct builds were recorded, and ${solved.sharePercent}% of parses run the same one.`
                  : `${result.uniqueSignatures} distinct builds were grouped into ${result.k} patterns.`}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  Confidence: {solved ? 'Converged' : quality.label}.
                </Box>{' '}
                {/* The silhouette buckets describe SEPARATION, so on a solved
                    board they report "Limited ... many similar variations",
                    which reads as a failure to distinguish archetypes rather
                    than as the finding that there is only one. */}
                {solved
                  ? 'Nearly every top parse runs the same build, so this board reports the consensus instead of splitting it into archetypes.'
                  : quality.tooltip}
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
      )}

      <Paper
        component="section"
        aria-label="Build pattern workspace"
        elevation={0}
        sx={(theme) => ({
          position: 'relative',
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
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 0 auto 0',
            zIndex: 2,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${alpha(selectedClassTheme.accent, 0.72)} 38%, ${alpha(theme.palette.primary.main, 0.52)} 72%, transparent)`,
            pointerEvents: 'none',
          },
        })}
      >
        <Box
          sx={{
            display: 'grid',
            alignItems: 'stretch',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(360px, 420px) minmax(0, 1fr)' },
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
                theme.palette.mode === 'dark' ? 0.58 : 0.34,
              ),
            })}
          >
            <Box
              sx={{
                display: 'grid',
                minHeight: 54,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'minmax(0, 1fr) 64px 52px 18px',
                },
                alignItems: 'center',
                columnGap: 1,
                px: { xs: 1.5, sm: 2 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  id="build-patterns-heading"
                  sx={{
                    fontFamily: 'Space Grotesk, Inter, system-ui',
                    fontSize: '0.79rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tooFewParses ? 'Recorded builds' : solved ? 'Consensus build' : 'Build patterns'}
                </Typography>
                {scopeLabel && (
                  <Typography noWrap sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                    {scopeLabel}
                  </Typography>
                )}
              </Box>
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.045em',
                  textTransform: 'uppercase',
                }}
              >
                {pooled ? 'Bosses' : 'Parses'}
              </Typography>
              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.045em',
                  textTransform: 'uppercase',
                }}
              >
                {pooled ? 'Best log' : 'Typical'}
              </Typography>
            </Box>
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {ordered.map((cluster) => (
                <ArchetypeRow
                  key={cluster.id}
                  cluster={cluster}
                  label={displayLabel(cluster, esoClass)}
                  selected={cluster.id === selected.id}
                  recommended={cluster.id === result.recommendedClusterId}
                  showClassIcon={!esoClass}
                  medoidParse={representativeParseFor(cluster)}
                  bestParse={bestParseByCluster.get(cluster.id)}
                  coveredBosses={bossCoverage.byCluster.get(cluster.id)}
                  availableBosses={pooled ? bossCoverage.available : undefined}
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
                  ? `radial-gradient(circle at 92% 2%, ${alpha(selectedClassTheme.accent, 0.13)}, transparent 34%), linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.62)}, ${alpha(theme.palette.background.default, 0.2)})`
                  : `radial-gradient(circle at 92% 2%, ${alpha(selectedClassTheme.accent, 0.09)}, transparent 36%), linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.54)}, transparent)`,
            })}
            data-class-accent={selectedClassTheme.accent}
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
              sourceUrl={representativeParseFor(selected)?.source_url}
              representativeDps={representativeParseFor(selected)?.amount}
              pooled={pooled}
              ungrouped={tooFewParses}
              coveredBosses={bossCoverage.byCluster.get(selected.id)}
              availableBosses={pooled ? bossCoverage.available : undefined}
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
