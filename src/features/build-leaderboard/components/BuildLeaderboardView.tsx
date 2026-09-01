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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { encounterKeyOf } from '@/constants/leaderboardRoutes';

import { MIN_PARSES_TO_CLUSTER } from '../clustering/clusterBuilds';
import { detectSolvedMeta } from '../clustering/solvedMeta';
import { getLeaderboardClassTheme } from '../theme/leaderboardTheme';
import type { BuildCluster, ClusterBuildsResult } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';
import { orderBuildClusters } from '../utils/clusterOrdering';
import { getClusterQuality } from '../utils/clusterQuality';

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
   * message ('on DSR · Tideborn Taleria', 'across 14 trial boards').
   */
  scopeDescription?: string;
  /**
   * Pooled class view: cluster.dps holds internal cross-boss comparison values,
   * while cards show raw DPS and top-25 board coverage.
   */
  pooled?: boolean;
  /**
   * Widens a thin selection (a class slice of one boss) to every boss. Rendered
   * as the action on the ungrouped banner, so a starved board offers a way out
   * instead of telling the reader to go find one.
   */
  onBroadenScope?: () => void;
  /** Call to action for `onBroadenScope`, e.g. 'Show all trial boards'. */
  broadenScopeLabel?: string;
  onRetry?: () => void;
  onOpenInEditor?: (cluster: BuildCluster) => void;
  onSaveBuild?: (cluster: BuildCluster) => void;
  onViewSourceLog?: (cluster: BuildCluster, sourceParseId: string) => void;
  pendingAction?: { clusterId: string; kind: 'open' | 'save' } | null;
  emptyMessage?: string;
  hideSummary?: boolean;
}

function displayLabel(cluster: BuildCluster, contextClass?: string): string {
  if (!contextClass) return cluster.label;
  const escapedClass = cluster.esoClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return cluster.label.replace(new RegExp(`\\s+${escapedClass}$`, 'i'), '').trim();
}

const SkeletonWorkspace: React.FC = () => (
  <Box role="status" aria-label="Loading build archetypes" aria-busy="true">
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
  broadenScopeLabel = 'Show all trial boards',
  onRetry,
  onOpenInEditor,
  onSaveBuild,
  onViewSourceLog,
  pendingAction,
  emptyMessage = 'No sampled top-ranked parses are available here yet.',
  hideSummary = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedId, setSelectedId] = useState<string | null>(
    result?.recommendedClusterId ?? result?.clusters[0]?.id ?? null,
  );
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  const [lastResult, setLastResult] = useState(result);
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const buildPatternsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingFocusRestoreRef = useRef(false);
  const [progressAnnouncement, setProgressAnnouncement] = useState('');

  if (lastResult !== result) {
    setLastResult(result);
    setSelectedId(result?.recommendedClusterId ?? result?.clusters[0]?.id ?? null);
    setEvidenceOpen(false);
    setSelectionAnnouncement('');
  }

  // Pooled view: the best RAW parse in each cluster heads its card ("112k @
  // DSR"). Raw amounts come from `parses`, never the normalized cluster input.
  // Lives above every early return (error/loading/too-few) — hook order must
  // stay stable across renders.
  const parsesById = useMemo(
    () => new Map(parses.map((parse) => [parse.parse_id, parse])),
    [parses],
  );

  const bestParseByCluster = useMemo(() => {
    const map = new Map<string, DpsParse>();
    if (!pooled) return map;
    result?.clusters.forEach((cluster) => {
      let best: DpsParse | undefined;
      for (const id of cluster.memberParseIds) {
        const parse = parsesById.get(id);
        if (parse && (!best || parse.amount > best.amount)) best = parse;
      }
      if (best) map.set(cluster.id, best);
    });
    return map;
  }, [parsesById, pooled, result]);

  const bossCoverage = useMemo(() => {
    const byCluster = new Map<string, number>();
    if (!pooled) return { available: 0, byCluster };

    const available = new Set(
      parses.map((parse) => encounterKeyOf(parse.encounter_id, parse.difficulty)),
    ).size;
    result?.clusters.forEach((cluster) => {
      const boards = new Set<string>();
      cluster.memberParseIds.forEach((id) => {
        const parse = parsesById.get(id);
        if (parse) boards.add(encounterKeyOf(parse.encounter_id, parse.difficulty));
      });
      byCluster.set(cluster.id, boards.size);
    });

    return { available, byCluster };
  }, [parses, parsesById, pooled, result]);

  const progressMessage =
    clustering || !result ? `Grouping ${parses.length} parses into build patterns…` : '';

  useEffect(() => {
    setProgressAnnouncement('');
    if (!progressMessage) return;
    const timer = window.setTimeout(() => setProgressAnnouncement(progressMessage), 0);
    return () => window.clearTimeout(timer);
  }, [progressMessage]);

  useEffect(() => {
    if (
      !pendingFocusRestoreRef.current ||
      error ||
      loading ||
      parses.length === 0 ||
      clustering ||
      !result ||
      result.clusters.length === 0
    )
      return;
    const heading = buildPatternsHeadingRef.current;
    if (!heading) return;
    pendingFocusRestoreRef.current = false;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }, [clustering, error, loading, parses.length, result, tooFewParses]);

  const queueFocusRestore = (action?: () => void): void => {
    pendingFocusRestoreRef.current = true;
    action?.();
  };

  if (error) {
    pendingFocusRestoreRef.current = false;
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={() => queueFocusRestore(onRetry)}>
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
            <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              {progressMessage}
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
            aria-label="Build grouping progress"
            aria-valuetext={
              clusterProgress > 0 ? `${Math.round(clusterProgress)}% complete` : 'Grouping builds'
            }
            variant={clusterProgress > 0 ? 'determinate' : 'indeterminate'}
            value={clusterProgress}
            sx={{ height: 3 }}
          />
          <Box
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="build-grouping-announcement"
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {progressAnnouncement}
          </Box>
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

  const quality = getClusterQuality(result.silhouette);
  // Null on a healthy board, which is the common case; every use below is
  // guarded so the normal archetype presentation is untouched.
  const solved = detectSolvedMeta(result);
  const solvedTheme = getLeaderboardClassTheme(solved?.dominant.esoClass ?? '');
  const recommended = result.clusters.find((cluster) => cluster.id === result.recommendedClusterId);
  const ordered = orderBuildClusters(result.clusters, result.recommendedClusterId);
  const selected =
    result.clusters.find((cluster) => cluster.id === selectedId) ??
    recommended ??
    result.clusters[0];
  const selectedClassTheme = getLeaderboardClassTheme(selected.esoClass);
  const representativeParseFor = (cluster: BuildCluster): DpsParse | undefined =>
    parsesById.get(cluster.medoidParseId);
  const selectedRepresentative = representativeParseFor(selected);
  const selectedSourceParse = pooled ? bestParseByCluster.get(selected.id) : selectedRepresentative;

  const handleSelect = (clusterId: string): void => {
    setSelectedId(clusterId);
    setEvidenceOpen(false);
    const selectedCluster = result.clusters.find((cluster) => cluster.id === clusterId);
    if (selectedCluster) {
      setSelectionAnnouncement(
        isMobile
          ? ''
          : `Selected ${displayLabel(selectedCluster, esoClass)} build pattern. Inspector updated.`,
      );
    }

    if (!isMobile) return;
    window.requestAnimationFrame?.(() => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const inspector = inspectorRef.current;
      inspector?.focus({ preventScroll: true });
      inspector?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <Box>
      <Box
        component="p"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="build-selection-announcement"
        sx={{
          position: 'absolute',
          // MUI treats numeric sizing values in the 0–1 range as percentages.
          // Use explicit pixels so this live region stays truly visually hidden
          // instead of becoming a 100%-wide off-screen overflow source.
          width: '1px',
          height: '1px',
          p: 0,
          m: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {selectionAnnouncement}
      </Box>
      {/* Thin data is a caveat, never a dead end. The builds recorded here are
          still shown — grouping them into archetypes is what we withhold, and
          the banner says so and offers a wider scope where one exists. */}
      {tooFewParses && (
        <Alert
          severity="info"
          data-testid="too-few-parses"
          action={
            onBroadenScope && (
              <Button
                color="inherit"
                size="small"
                onClick={() => queueFocusRestore(onBroadenScope)}
              >
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
          } ${scopeDescription ?? 'in this selection'} — fewer than ${MIN_PARSES_TO_CLUSTER} for grouping; builds are listed individually below.`}
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
              fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            One observed pattern dominates this sample.
          </Typography>
          <Typography
            sx={{ mt: 0.4, color: 'text.secondary', fontSize: '0.74rem', lineHeight: 1.5 }}
          >
            {`${solved.sharePercent}% of the ${solved.clusteredParses} sampled top-ranked parses ${
              scopeDescription ?? 'in this selection'
            } share one observed build pattern.`}
            {solved.outlierParses > 0 &&
              ` The other ${solved.outlierParses} ${
                solved.outlierParses === 1 ? 'sampled parse shows' : 'sampled parses show'
              } a meaningfully different pattern and ${
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
              {` sampled top-ranked ${result.totalParses === 1 ? 'parse' : 'parses'} · `}
              {solved
                ? `one observed pattern, ${solved.sharePercent}% of clustered sample`
                : `${result.k} build ${result.k === 1 ? 'pattern' : 'patterns'}`}
            </Typography>
            <IconButton
              size="small"
              aria-label="How this leaderboard works"
              aria-controls="build-leaderboard-view-methodology"
              aria-expanded={methodologyOpen}
              onClick={() => setMethodologyOpen((open) => !open)}
            >
              <InfoOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
          <Box id="build-leaderboard-view-methodology">
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
                  This view clusters the {parses.length} currently returned{' '}
                  {parses.length === 1 ? 'parse' : 'parses'} for this selection, not the full ESO
                  player population.{' '}
                  {solved
                    ? `${result.uniqueSignatures} distinct builds were observed in the returned sample, and ${solved.sharePercent}% of clustered rows share the same pattern.`
                    : `${result.uniqueSignatures} distinct builds observed in the returned sample were grouped into ${result.k} patterns.`}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                    Confidence: {solved ? 'Dominant sample' : quality.label}.
                  </Box>{' '}
                  {/* The silhouette buckets describe SEPARATION, so on a solved
                    board they report "Limited ... many similar variations",
                    which reads as a failure to distinguish archetypes rather
                    than as the finding that there is only one. */}
                  {solved
                    ? 'Most sampled top-ranked parses share one observed build pattern, so this view reports that dominant pattern without splitting similar variations into separate archetypes.'
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
              order: { xs: 1, md: 1 },
              borderBottom: {
                xs: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
                md: 'none',
              },
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
                  ref={buildPatternsHeadingRef}
                  component="h2"
                  tabIndex={-1}
                  sx={{
                    fontFamily: 'Space Grotesk Variable, Inter Variable, system-ui',
                    fontSize: '0.79rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    scrollMarginTop: 72,
                  }}
                >
                  {tooFewParses
                    ? 'Observed builds'
                    : solved
                      ? 'Observed build pattern'
                      : 'Build patterns'}
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
                {pooled ? 'Boards' : 'Parses'}
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
                {pooled ? 'Sampled high' : 'Typical'}
              </Typography>
            </Box>
            <Box component="ol" role="list" sx={{ m: 0, p: 0, listStyle: 'none' }}>
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
                  pooled={pooled}
                  ungrouped={tooFewParses}
                  onSelect={() => handleSelect(cluster.id)}
                />
              ))}
            </Box>
          </Box>

          <Box
            ref={inspectorRef}
            role="region"
            tabIndex={-1}
            aria-labelledby={`build-inspector-${selected.id}`}
            data-testid="build-inspector-focus-target"
            sx={(theme) => ({
              display: 'flex',
              minWidth: 0,
              order: { xs: 2, md: 2 },
              scrollMarginTop: 72,
              background:
                theme.palette.mode === 'dark'
                  ? `radial-gradient(circle at 92% 2%, ${alpha(selectedClassTheme.accent, 0.13)}, transparent 34%), linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.62)}, ${alpha(theme.palette.background.default, 0.2)})`
                  : `radial-gradient(circle at 92% 2%, ${alpha(selectedClassTheme.accent, 0.09)}, transparent 36%), linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.54)}, transparent)`,
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
              },
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
              sourceUrl={selectedSourceParse?.source_url}
              representativeSourceUrl={selectedRepresentative?.source_url}
              representativeDps={selectedRepresentative?.amount}
              bestParse={bestParseByCluster.get(selected.id)}
              pooled={pooled}
              ungrouped={tooFewParses}
              coveredBosses={bossCoverage.byCluster.get(selected.id)}
              availableBosses={pooled ? bossCoverage.available : undefined}
              pendingKind={pendingAction?.clusterId === selected.id ? pendingAction.kind : null}
              actionsDisabled={Boolean(pendingAction)}
              onOpenInEditor={onOpenInEditor}
              onSaveBuild={onSaveBuild}
              onViewSourceLog={
                selectedSourceParse?.report_code && onViewSourceLog
                  ? (cluster) => onViewSourceLog(cluster, selectedSourceParse.parse_id)
                  : undefined
              }
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
