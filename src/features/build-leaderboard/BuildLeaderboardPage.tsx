import { InfoOutlined, KeyboardArrowDownRounded } from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Collapse,
  Container,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  bossLeaderboardPath,
  classLeaderboardPath,
  encounterKeyOf,
  getBossRouteByEncounter,
  getBossRouteBySlug,
  getClassRouteByEsoClass,
  getClassRouteBySlug,
  LEADERBOARD_BASE_PATH,
  LEADERBOARD_BOSS_ROUTES,
  LEADERBOARD_CLASS_ROUTES,
} from '@/constants/leaderboardRoutes';
import { getRouteMeta } from '@/constants/routeMeta';
import { useCanonicalUrl } from '@/hooks/useCanonicalUrl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

import { ClassIcon } from '../../components/ClassIcon';
import { PanelErrorBoundary } from '../../components/PanelErrorBoundary';

import { dpsParsesApi } from './api/dpsParsesApi';
import { BuildLeaderboardView } from './components/BuildLeaderboardView';
import { LeaderboardBrowseNav } from './components/LeaderboardBrowseNav';
import { useArchetypeBuildActions } from './hooks/useArchetypeBuildActions';
import { useBaseAbilityResolver } from './hooks/useBaseAbilityResolver';
import { useBuildClusters } from './hooks/useBuildClusters';
import { useDpsParses } from './hooks/useDpsParses';
import { getLeaderboardClassTheme } from './theme/leaderboardTheme';
import type { BuildCluster } from './types/clustering.types';
import type { DpsEncounterSummary } from './types/dpsParses.types';

type TabKey = 'encounter' | 'class';

/** Picker sentinel for the pooled (all-bosses) class view. */
const ALL_BOSSES = '__all__';

/** Legacy query params, superseded by path segments. Stripped on redirect. */
const LEGACY_PARAMS = ['tab', 'class', 'boss'] as const;

function encounterKey(encounter: Pick<DpsEncounterSummary, 'encounter_id' | 'difficulty'>): string {
  return encounterKeyOf(encounter.encounter_id, encounter.difficulty);
}

function encounterLabel(encounter: DpsEncounterSummary): string {
  return `${encounter.trial_id ? `${encounter.trial_id} · ` : ''}${encounter.encounter_name}`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  // Pin to UTC to match the parsed midnight-UTC instant — without this,
  // viewers west of UTC render the previous local day.
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        date,
      );
}

function clusterQuality(silhouette: number): { label: string; tooltip: string } {
  if (silhouette >= 0.5) {
    return { label: 'Strong', tooltip: 'These build patterns separate cleanly.' };
  }
  if (silhouette >= 0.25) {
    return { label: 'Moderate', tooltip: 'The patterns are useful, though some builds overlap.' };
  }
  return { label: 'Limited', tooltip: 'Top players are using many similar variations.' };
}

/**
 * `</script>` inside a cluster label would close the JSON-LD block early and
 * turn the remainder of the payload into markup. Labels are built from set and
 * ability names the ESO Logs API returns, so they are not ours to trust.
 */
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const BuildLeaderboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { classSlug, bossSlug } = useParams<{ classSlug?: string; bossSlug?: string }>();
  const navigate = useNavigate();
  const { pendingAction, openInEditor, saveToMyBuilds } = useArchetypeBuildActions();

  // ─── Route resolution ──────────────────────────────────────────────────────
  // Four shapes reach this component:
  //   /build-leaderboard                            encounter tab, first board
  //   /build-leaderboard/boss/:bossSlug             encounter tab, one board
  //   /build-leaderboard/class/:classSlug           class tab, pooled
  //   /build-leaderboard/class/:classSlug/:bossSlug class tab, one board
  // Plus the legacy ?tab=/?class=/?boss= form, which still works and redirects
  // to its path equivalent.
  const onSluggedPath = classSlug !== undefined || bossSlug !== undefined;
  const classRoute = getClassRouteBySlug(classSlug);
  const bossRoute = getBossRouteBySlug(bossSlug);

  const legacyBossKey = onSluggedPath ? null : searchParams.get('boss');
  const legacyClassRoute = useMemo(() => {
    if (onSluggedPath || searchParams.get('tab') !== 'class') return undefined;
    return (
      getClassRouteByEsoClass(searchParams.get('class') ?? undefined) ?? LEADERBOARD_CLASS_ROUTES[0]
    );
  }, [onSluggedPath, searchParams]);

  const activeClassRoute = classRoute ?? legacyClassRoute;
  const tab: TabKey = activeClassRoute ? 'class' : 'encounter';
  const encounterParam = bossRoute
    ? encounterKeyOf(bossRoute.encounterId, bossRoute.difficulty)
    : legacyBossKey;

  const redirectTo = useMemo(() => {
    // A slug nobody recognises is not a board, so never render an arbitrary
    // fallback under a URL that promises another. But keep whichever half of
    // the URL is still valid: renaming one boss slug should not cost all seven
    // of its class-narrowed inbound links their class board and dump them on
    // the index. Unrelated params (utm_*, embed) survive too, matching what
    // the legacy redirect below already does.
    const classSlugUnknown = classSlug !== undefined && !classRoute;
    const bossSlugUnknown = bossSlug !== undefined && !bossRoute;
    if (classSlugUnknown || bossSlugUnknown) {
      const target = classRoute
        ? classLeaderboardPath(classRoute.slug)
        : bossRoute
          ? bossLeaderboardPath(bossRoute.slug)
          : LEADERBOARD_BASE_PATH;
      const query = searchParams.toString();
      return query ? `${target}?${query}` : target;
    }
    if (onSluggedPath) return null;
    if (!LEGACY_PARAMS.some((param) => searchParams.has(param))) return null;

    const legacyBoss = legacyBossKey
      ? LEADERBOARD_BOSS_ROUTES.find(
          (entry) => encounterKeyOf(entry.encounterId, entry.difficulty) === legacyBossKey,
        )
      : undefined;
    // An encounter the slug table has no entry for cannot be expressed as a
    // path. Keep honouring the query param instead of dropping the selection.
    if (legacyBossKey && !legacyBoss) return null;

    const rest = new URLSearchParams(searchParams);
    LEGACY_PARAMS.forEach((param) => rest.delete(param));
    const query = rest.toString();

    const target = legacyClassRoute
      ? classLeaderboardPath(legacyClassRoute.slug, legacyBoss?.slug)
      : legacyBoss
        ? bossLeaderboardPath(legacyBoss.slug)
        : LEADERBOARD_BASE_PATH;
    return query ? `${target}?${query}` : target;
  }, [
    classSlug,
    classRoute,
    bossSlug,
    bossRoute,
    onSluggedPath,
    searchParams,
    legacyBossKey,
    legacyClassRoute,
  ]);

  const [encounters, setEncounters] = useState<DpsEncounterSummary[]>([]);
  const [encountersError, setEncountersError] = useState<string | null>(null);
  const [encountersLoading, setEncountersLoading] = useState(true);
  const [encountersToken, setEncountersToken] = useState(0);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // ─── Page metadata ─────────────────────────────────────────────────────────
  // The 98 class-by-boss permutations are near-duplicates of the pooled class
  // board, so they point their canonical at it and stay out of the sitemap.
  // Everything else is its own canonical and is prerendered.
  //
  // Keyed on `activeClassRoute`, not `classRoute`, so the legacy shape we
  // deliberately do NOT redirect (`?tab=class&class=X&boss=<unslugged>`, which
  // the encounter picker still mints for a boss with no slug) gets that class's
  // title and canonical rather than the generic board's.
  const canonicalPath = activeClassRoute
    ? classLeaderboardPath(activeClassRoute.slug)
    : bossRoute
      ? bossLeaderboardPath(bossRoute.slug)
      : LEADERBOARD_BASE_PATH;

  const documentTitle =
    activeClassRoute && bossRoute
      ? `Best ${activeClassRoute.label} Builds on ${bossRoute.name} | ESO Toolkit`
      : (getRouteMeta(canonicalPath)?.title ?? 'Build Leaderboard | ESO Toolkit');

  // Must match the prerendered <title> byte for byte on the 21 slugged routes,
  // which is why it is read from the same metadata the prerender stamps rather
  // than composed here.
  useDocumentTitle(documentTitle);
  useCanonicalUrl(canonicalPath);

  const headingText =
    activeClassRoute && bossRoute
      ? `Best ${activeClassRoute.label} builds on ${bossRoute.name}`
      : activeClassRoute
        ? `Best ${activeClassRoute.label} builds in ESO`
        : bossRoute
          ? `${bossRoute.name} DPS parses`
          : 'Build Leaderboard';

  const headingSubtitle =
    activeClassRoute && bossRoute
      ? `Top ${activeClassRoute.label} parses recorded on ${bossRoute.name} in ${bossRoute.zone}.`
      : activeClassRoute
        ? `Top ${activeClassRoute.label} parses from across every recorded trial boss, grouped into build archetypes.`
        : bossRoute
          ? `The highest recorded parses on ${bossRoute.name} in ${bossRoute.zone}, grouped into build archetypes.`
          : null;

  useEffect(() => {
    let cancelled = false;
    setEncountersError(null);
    setEncountersLoading(true);
    dpsParsesApi
      .listEncounters()
      .then((response) => {
        if (!cancelled) setEncounters(response.encounters);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEncountersError(err instanceof Error ? err.message : 'Failed to load encounters');
        }
      })
      .finally(() => {
        if (!cancelled) setEncountersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [encountersToken]);

  const selectedEncounter = useMemo(() => {
    if (encounters.length === 0) return null;
    const fromUrl = encounters.find((encounter) => encounterKey(encounter) === encounterParam);
    if (fromUrl) return fromUrl;
    // A slugged boss the ingest no longer serves must NOT fall back to another
    // board: the title, the h1 and the canonical all name that boss, so the
    // fallback would publish some other boss's parses under its URL.
    if (bossRoute) return null;
    return encounters[0];
  }, [encounters, encounterParam, bossRoute]);

  const parseQuery = useMemo(() => {
    // Nothing is worth fetching for a URL we are about to leave.
    if (redirectTo) return null;
    // Class tab POOLS across bosses by default: pattern identity (gear, bars,
    // skill lines) does not require same-boss parses, and per-boss slices
    // starve minority classes (a 54%-Necromancer board left Dragonknights 2
    // parses on a boss with 201). DPS is normalized to each boss's ceiling
    // before display instead. An explicit boss still narrows to one board.
    if (tab === 'class') {
      if (!activeClassRoute) return null;
      // A boss the URL names but that we cannot resolve to a real encounter
      // must NOT fall through to the pooled query. The title, h1 and JSON-LD
      // all still name that boss, so widening the query would publish
      // every-boss data under it — and because `encounterParam` is truthy,
      // `isPooledClass` stays false, so those amounts would not even be
      // normalized. This fires on the first render of every /class/x/boss URL
      // (the encounters feed has not arrived yet) as well as in the drift case
      // where the ingest stops serving a slugged boss.
      if (encounterParam && !selectedEncounter) return null;
      const bossFilter =
        selectedEncounter && encounterParam
          ? {
              encounterId: selectedEncounter.encounter_id,
              difficulty: selectedEncounter.difficulty,
            }
          : {};
      return { esoClass: activeClassRoute.esoClass, perEncounterCap: 25, ...bossFilter };
    }
    if (!selectedEncounter) return null;
    return {
      encounterId: selectedEncounter.encounter_id,
      difficulty: selectedEncounter.difficulty,
    };
  }, [redirectTo, tab, activeClassRoute, selectedEncounter, encounterParam]);

  const resolveBaseAbilityId = useBaseAbilityResolver();
  // Pooled class view: normalize each parse's DPS to its own boss's ceiling so
  // cross-boss medians mean something ("91% of what the best parse on that
  // boss achieved"). Encounter-tab amounts stay absolute.
  const isPooledClass = tab === 'class' && !encounterParam;
  const { parses, loading, error, reload } = useDpsParses(
    parseQuery,
    // Pooled views must fit EVERY board's capped rows (boards x 25) — a
    // smaller limit ordered by raw amount would drop whole low-ceiling boards
    // before normalization. The cap bounds this to realistic hundreds.
    isPooledClass ? 1000 : undefined,
  );

  const topAmountByKey = useMemo(() => {
    const map = new Map<string, number>();
    encounters.forEach((encounter) => {
      map.set(encounterKey(encounter), encounter.top_amount);
    });
    return map;
  }, [encounters]);
  const clusterParses = useMemo(() => {
    if (!isPooledClass) return parses;
    return parses.map((parse) => {
      const top = topAmountByKey.get(encounterKeyOf(parse.encounter_id, parse.difficulty));
      return top && top > 0 && parse.amount > 0 ? { ...parse, amount: parse.amount / top } : parse;
    });
  }, [isPooledClass, parses, topAmountByKey]);
  // Wait for boss ceilings before clustering a pooled view, or every parse
  // would carry its raw amount and re-cluster once ceilings arrive.
  const poolingReady = !isPooledClass || topAmountByKey.size > 0;
  const bossCount = useMemo(
    () => new Set(parses.map((parse) => encounterKeyOf(parse.encounter_id, parse.difficulty))).size,
    [parses],
  );

  const {
    result,
    loading: clustering,
    progress,
    error: clusterError,
    tooFewParses,
    recluster,
  } = useBuildClusters(poolingReady ? clusterParses : [], resolveBaseAbilityId);

  // ─── Structured data ───────────────────────────────────────────────────────
  const archetypeListLd = useMemo(() => {
    if (!result || result.clusters.length === 0) return null;

    const rawAmountById = new Map(parses.map((parse) => [parse.parse_id, parse.amount]));
    const bestRawAmount = (cluster: BuildCluster): number =>
      cluster.memberParseIds.reduce((max, id) => Math.max(max, rawAmountById.get(id) ?? 0), 0);

    // On a pooled view `cluster.dps` is NORMALIZED to each boss's ceiling, so
    // quoting its median as DPS would publish "1 DPS". Use the best raw member
    // parse there, which is exactly what the cards show.
    const amountOf = (cluster: BuildCluster): number =>
      isPooledClass ? bestRawAmount(cluster) : cluster.dps.median;

    const items = [...result.clusters]
      .sort((a, b) => amountOf(b) - amountOf(a))
      .map((cluster, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: cluster.label,
        description: `Run by ${Math.round(cluster.share * 100)}% of recorded parses. ${
          isPooledClass ? 'Best' : 'Median'
        } parse ${Math.round(amountOf(cluster)).toLocaleString('en-US')} DPS across ${
          cluster.size
        } ${cluster.size === 1 ? 'build' : 'builds'}.`,
      }))
      .filter((item) => item.position <= 25);

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: headingText,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: items.length,
      itemListElement: items,
    };
  }, [result, parses, isPooledClass, headingText]);

  // ─── Navigation targets ────────────────────────────────────────────────────
  // Pickers are anchors, not buttons: before this, the entire leaderboard was
  // reachable only by operating a Select or a ToggleButton, so a crawler could
  // discover exactly one of 21 boards.
  const encounterTabPath = bossRoute ? bossLeaderboardPath(bossRoute.slug) : LEADERBOARD_BASE_PATH;
  const classTabPath = classLeaderboardPath(
    (activeClassRoute ?? LEADERBOARD_CLASS_ROUTES[0]).slug,
    bossRoute?.slug,
  );

  const handleEncounterChange = useCallback(
    (value: string) => {
      if (value === ALL_BOSSES) {
        navigate(
          activeClassRoute ? classLeaderboardPath(activeClassRoute.slug) : LEADERBOARD_BASE_PATH,
        );
        return;
      }
      const [encounterId, difficulty] = value.split(':').map(Number);
      const entry = getBossRouteByEncounter(encounterId, difficulty);
      if (entry) {
        navigate(
          activeClassRoute
            ? classLeaderboardPath(activeClassRoute.slug, entry.slug)
            : bossLeaderboardPath(entry.slug),
        );
        return;
      }
      // An encounter the ingest has started serving but the slug table does not
      // cover yet. Fall back to the legacy query form so the board stays
      // reachable; it just is not crawlable until a slug is added.
      const params = new URLSearchParams();
      if (activeClassRoute) {
        params.set('tab', 'class');
        params.set('class', activeClassRoute.esoClass);
      }
      params.set('boss', value);
      navigate(`${LEADERBOARD_BASE_PATH}?${params.toString()}`);
    },
    [navigate, activeClassRoute],
  );

  const handleViewSourceLog = useCallback(
    (cluster: BuildCluster) => {
      const parse = parses.find((candidate) => candidate.parse_id === cluster.medoidParseId);
      if (!parse) return;
      navigate(`/report/${parse.report_code}/fight/${parse.fight_id}`);
    },
    [navigate, parses],
  );

  const combinedError = encountersError ?? error ?? clusterError;

  const handleRetry = useCallback(() => {
    if (encountersError) {
      setEncountersToken((token) => token + 1);
      return;
    }
    if (error) {
      reload();
      return;
    }
    if (clusterError) recluster();
  }, [encountersError, error, clusterError, reload, recluster]);

  // Placed below every hook so hook order stays identical across renders.
  if (redirectTo) return <Navigate to={redirectTo} replace />;

  return (
    <Container
      maxWidth={false}
      sx={{ maxWidth: 1280, px: { xs: 1.5, sm: 2.5 }, py: { xs: 1.5, sm: 2.5 } }}
    >
      {archetypeListLd && (
        <script type="application/ld+json">{serializeJsonLd(archetypeListLd)}</script>
      )}
      <Box
        component="header"
        aria-label="Build leaderboard controls"
        sx={{ mb: { xs: 2, sm: 2.5 } }}
      >
        <Box
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'minmax(180px, 1fr) auto',
            },
            minHeight: { xs: 92, sm: 66 },
            alignItems: 'center',
            columnGap: 2,
            rowGap: 0.75,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
          })}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontSize: { xs: '1.28rem', sm: '1.42rem' },
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
              }}
            >
              {headingText}
            </Typography>
            {headingSubtitle && (
              <Typography
                sx={{ mt: 0.4, color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.4 }}
              >
                {headingSubtitle}
              </Typography>
            )}
          </Box>

          <Box
            component="nav"
            aria-label="Build leaderboard view"
            sx={(theme) => ({
              display: 'inline-flex',
              gap: 0.4,
              p: 0.4,
              gridColumn: { xs: 1, sm: 2 },
              gridRow: { xs: 2, sm: 1 },
              justifySelf: { xs: 'stretch', sm: 'end' },
              width: { xs: '100%', sm: 'auto' },
              border: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.paper, 0.38),
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.035 : 0.7)}`,
            })}
          >
            {(
              [
                ['encounter', 'By encounter', encounterTabPath],
                ['class', 'By class', classTabPath],
              ] as const
            ).map(([value, label, to]) => {
              const active = tab === value;
              return (
                <ButtonBase
                  key={value}
                  component={RouterLink}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  sx={(theme) => ({
                    minHeight: 36,
                    flex: { xs: 1, md: '0 0 auto' },
                    minWidth: { md: 112 },
                    px: 1.6,
                    borderRadius: 1.5,
                    color: active ? 'text.primary' : 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 600,
                    textDecoration: 'none',
                    backgroundColor: active
                      ? alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === 'dark' ? 0.12 : 0.09,
                        )
                      : 'transparent',
                    boxShadow: active
                      ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.22)}, 0 5px 16px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.16 : 0.06)}`
                      : 'none',
                    transition:
                      'background-color 160ms ease, box-shadow 160ms ease, color 160ms ease',
                    '&:hover': {
                      color: 'text.primary',
                      backgroundColor: alpha(theme.palette.primary.main, active ? 0.14 : 0.055),
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                    },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  })}
                >
                  {label}
                </ButtonBase>
              );
            })}
          </Box>
        </Box>

        <Box
          component="section"
          aria-label="Build leaderboard filters"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 780px) minmax(260px, 1fr)' },
            minHeight: 64,
            alignItems: 'end',
            gap: { xs: 1, md: 2 },
            pt: 1.25,
          }}
        >
          {/* The encounter picker renders on BOTH tabs: the class tab defaults
              to a pooled board and this is how it narrows to a single boss. */}
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gap: { xs: 1, md: 1.25 },
              alignContent: 'start',
            }}
          >
            <Box sx={{ width: '100%' }}>
              <Typography
                id="dps-encounter-label"
                sx={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                }}
              >
                Encounter
              </Typography>
              <Select
                labelId="dps-encounter-label"
                aria-label="Encounter"
                value={
                  tab === 'class' && !encounterParam
                    ? ALL_BOSSES
                    : selectedEncounter
                      ? encounterKey(selectedEncounter)
                      : ''
                }
                onChange={(event) => handleEncounterChange(String(event.target.value))}
                IconComponent={KeyboardArrowDownRounded}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: (theme) => ({
                        mt: 0.75,
                        maxHeight: 404,
                        border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
                        borderRadius: 2,
                        backgroundColor: alpha(
                          theme.palette.background.paper,
                          theme.palette.mode === 'dark' ? 0.96 : 0.98,
                        ),
                        backgroundImage: 'none',
                        boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.42 : 0.16)}`,
                        backdropFilter: 'blur(20px) saturate(125%)',
                      }),
                    },
                    list: { sx: { py: 0.75 } },
                  },
                }}
                renderValue={() => (
                  <Box
                    sx={{
                      display: 'flex',
                      minWidth: 0,
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        minWidth: 0,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        fontSize: { xs: '0.94rem', sm: '1.04rem' },
                        fontWeight: 600,
                      }}
                    >
                      {tab === 'class' && !encounterParam
                        ? 'All trial bosses'
                        : selectedEncounter
                          ? encounterLabel(selectedEncounter)
                          : 'Choose an encounter'}
                    </Typography>
                  </Box>
                )}
                sx={(theme) => ({
                  width: '100%',
                  minHeight: 52,
                  borderRadius: 2.25,
                  backgroundColor: alpha(
                    theme.palette.background.paper,
                    theme.palette.mode === 'dark' ? 0.62 : 0.88,
                  ),
                  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.78)}`,
                  '& .MuiSelect-select': {
                    display: 'block',
                    py: 1.35,
                    pl: 1.65,
                    pr: 5.5,
                    backgroundColor: 'transparent !important',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.divider, 0.76),
                  },
                  '&:hover': {
                    transform: 'none',
                    backgroundColor: alpha(theme.palette.background.paper, 0.88),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.42),
                  },
                  '&.Mui-focused': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.96),
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.05)}`,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 1,
                    borderColor: alpha(theme.palette.primary.main, 0.72),
                  },
                  '& .MuiSelect-icon': { right: 14, color: 'text.secondary', fontSize: 21 },
                })}
              >
                {tab === 'class' && (
                  <MenuItem
                    value={ALL_BOSSES}
                    sx={(theme) => ({
                      minHeight: 40,
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                    })}
                  >
                    All trial bosses
                  </MenuItem>
                )}
                {encounters.map((encounter) => (
                  <MenuItem
                    key={encounterKey(encounter)}
                    value={encounterKey(encounter)}
                    sx={(theme) => ({
                      minHeight: 40,
                      mx: 0.75,
                      px: 1.25,
                      borderRadius: 1.1,
                      transition: 'background-color 140ms ease, box-shadow 140ms ease',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.13),
                        boxShadow: `inset 2px 0 0 ${theme.palette.primary.main}`,
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.18),
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.text.primary, 0.055),
                      },
                    })}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.84rem', fontWeight: 600 }}>
                        {encounter.trial_id ? `${encounter.trial_id} · ` : ''}
                        {encounter.encounter_name}
                      </Typography>
                      <Typography
                        className="u-tabular"
                        sx={{ color: 'text.secondary', fontSize: '0.72rem' }}
                      >
                        {encounter.parse_count} parses
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {tab === 'class' && (
              <Box sx={{ width: '100%', overflowX: 'auto', pb: 0.25 }}>
                <Box
                  component="nav"
                  aria-label="ESO class"
                  sx={(theme) => ({
                    display: 'inline-flex',
                    minWidth: 'max-content',
                    gap: 0.4,
                    p: 0.4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.paper, 0.42),
                  })}
                >
                  {LEADERBOARD_CLASS_ROUTES.map((entry) => {
                    const active = activeClassRoute?.slug === entry.slug;
                    const classTheme = getLeaderboardClassTheme(entry.esoClass);
                    return (
                      <ButtonBase
                        key={entry.slug}
                        component={RouterLink}
                        to={classLeaderboardPath(entry.slug, bossRoute?.slug)}
                        aria-current={active ? 'page' : undefined}
                        aria-label={entry.label}
                        sx={(theme) => ({
                          display: 'flex',
                          gap: 0.7,
                          px: 1.1,
                          minHeight: 36,
                          borderRadius: 1.5,
                          color: active ? 'text.primary' : 'text.secondary',
                          fontSize: '0.74rem',
                          fontWeight: active ? 700 : 600,
                          textDecoration: 'none',
                          backgroundColor: active ? alpha(classTheme.accent, 0.12) : 'transparent',
                          boxShadow: active
                            ? `inset 0 0 0 1px ${alpha(classTheme.accent, 0.34)}, 0 5px 18px ${alpha(classTheme.accent, 0.1)}`
                            : 'none',
                          '&:hover': {
                            color: 'text.primary',
                            backgroundColor: alpha(classTheme.accent, active ? 0.16 : 0.055),
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: 1,
                          },
                        })}
                      >
                        <ClassIcon className={entry.label} size={15} alt="" />
                        {entry.label}
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
          {result && (
            <Box
              sx={{
                display: 'flex',
                minWidth: 0,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                gap: 0.35,
              }}
            >
              <Typography
                className="u-tabular"
                sx={{ color: 'text.secondary', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {result.totalParses}
                </Box>{' '}
                top parses ·{' '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {result.k}
                </Box>{' '}
                {/* Thin data is listed build-by-build, not grouped — calling
                    those entries "patterns" would claim an analysis we
                    explicitly declined to run. */}
                {tooFewParses
                  ? result.k === 1
                    ? 'build'
                    : 'builds'
                  : result.k === 1
                    ? 'pattern'
                    : 'patterns'}
                {selectedEncounter?.updated_at
                  ? ` · updated ${formatUpdatedAt(selectedEncounter.updated_at)}`
                  : ' · ESO Logs data'}
              </Typography>
              <IconButton
                size="small"
                aria-label="How this leaderboard works"
                aria-controls="build-leaderboard-methodology"
                aria-expanded={methodologyOpen}
                onClick={() => setMethodologyOpen((open) => !open)}
              >
                <InfoOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
          )}
        </Box>
        {result && (
          <Collapse in={methodologyOpen} timeout="auto" unmountOnExit>
            <Box
              id="build-leaderboard-methodology"
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: { xs: 0.75, sm: 2 },
                mt: 1,
                pt: 1,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
              })}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  Scope.
                </Box>{' '}
                {tooFewParses
                  ? `${result.uniqueSignatures} distinct builds, each listed on its own.`
                  : `${result.uniqueSignatures} distinct builds were grouped into ${result.k} ${
                      result.k === 1 ? 'pattern' : 'patterns'
                    }.`}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  {/* A silhouette score describes a clustering. On the thin-data
                      path there isn't one, so quoting "Limited" would report the
                      quality of an analysis we never ran. */}
                  {tooFewParses
                    ? 'Confidence: Too early.'
                    : `Confidence: ${clusterQuality(result.silhouette).label}.`}
                </Box>{' '}
                {tooFewParses
                  ? 'Not enough parses here to tell a real pattern from one player’s preference.'
                  : clusterQuality(result.silhouette).tooltip}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  Starting point.
                </Box>{' '}
                Results vary with rotation, buffs, and group composition.
              </Typography>
            </Box>
          </Collapse>
        )}
      </Box>

      <Box key={tab} className="u-tab-enter">
        {tab === 'encounter' ? (
          <PanelErrorBoundary panelName="Encounter Builds">
            <BuildLeaderboardView
              parses={parses}
              result={result}
              loading={loading || encountersLoading}
              clustering={clustering}
              clusterProgress={progress}
              error={combinedError}
              tooFewParses={tooFewParses}
              onRetry={handleRetry}
              onOpenInEditor={openInEditor}
              onSaveBuild={saveToMyBuilds}
              onViewSourceLog={handleViewSourceLog}
              pendingAction={pendingAction}
              emptyMessage="No top parses recorded for this boss yet. Try another encounter."
              hideSummary
            />
          </PanelErrorBoundary>
        ) : (
          <PanelErrorBoundary panelName="Class Archetypes">
            <BuildLeaderboardView
              parses={parses}
              result={result}
              loading={loading || encountersLoading}
              clustering={clustering}
              clusterProgress={progress}
              error={combinedError}
              tooFewParses={tooFewParses}
              esoClass={activeClassRoute?.label}
              scopeLabel={
                isPooledClass
                  ? undefined
                  : selectedEncounter
                    ? `${encounterLabel(selectedEncounter)} parses`
                    : undefined
              }
              scopeDescription={
                isPooledClass
                  ? `across ${bossCount} trial ${bossCount === 1 ? 'boss' : 'bosses'}`
                  : selectedEncounter
                    ? `on ${encounterLabel(selectedEncounter)}`
                    : undefined
              }
              pooled={isPooledClass}
              // A class slice of one boss is where thinness actually bites (5
              // Dragonknights on a board of 200). Pooling every boss is the one
              // click that fixes it, so offer it inline rather than making the
              // reader work out that the picker has an "All trial bosses" row.
              onBroadenScope={isPooledClass ? undefined : () => handleEncounterChange(ALL_BOSSES)}
              broadenScopeLabel="All trial bosses"
              onRetry={handleRetry}
              onOpenInEditor={openInEditor}
              onSaveBuild={saveToMyBuilds}
              onViewSourceLog={handleViewSourceLog}
              pendingAction={pendingAction}
              emptyMessage={`No ${activeClassRoute?.label ?? ''} parses recorded yet.`}
              hideSummary
            />
          </PanelErrorBoundary>
        )}
      </Box>

      {/* activeClassRoute, not classRoute, so the browse nav and the class
          picker agree about which class is current on the legacy shape. */}
      <LeaderboardBrowseNav
        activeClassSlug={activeClassRoute?.slug}
        activeBossSlug={bossRoute?.slug}
      />

      <Box
        component="footer"
        sx={(theme) => ({
          mt: 3,
          pt: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
        })}
      >
        <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          Parse data from ESO Logs. Every archetype links to the representative parse it came from.
        </Typography>
      </Box>
    </Container>
  );
};
