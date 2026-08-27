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
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ClassIcon } from '../../components/ClassIcon';
import { PanelErrorBoundary } from '../../components/PanelErrorBoundary';

import { dpsParsesApi } from './api/dpsParsesApi';
import { BuildLeaderboardView } from './components/BuildLeaderboardView';
import { useArchetypeBuildActions } from './hooks/useArchetypeBuildActions';
import { useBaseAbilityResolver } from './hooks/useBaseAbilityResolver';
import { useBuildClusters } from './hooks/useBuildClusters';
import { useDpsParses } from './hooks/useDpsParses';
import { getLeaderboardClassTheme } from './theme/leaderboardTheme';
import type { BuildCluster } from './types/clustering.types';
import type { DpsEncounterSummary } from './types/dpsParses.types';

type TabKey = 'encounter' | 'class';

const ESO_CLASSES = [
  'Arcanist',
  'DragonKnight',
  'Necromancer',
  'Nightblade',
  'Sorcerer',
  'Templar',
  'Warden',
] as const;

type EsoClass = (typeof ESO_CLASSES)[number];

function isEsoClass(value: string | null): value is EsoClass {
  return value !== null && (ESO_CLASSES as readonly string[]).includes(value);
}

const CLASS_LABELS: Record<string, string> = { DragonKnight: 'Dragonknight' };
/** Picker sentinel for the pooled (all-bosses) class view. */
const ALL_BOSSES = '__all__';

function encounterKey(encounter: Pick<DpsEncounterSummary, 'encounter_id' | 'difficulty'>): string {
  return `${encounter.encounter_id}:${encounter.difficulty}`;
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

export const BuildLeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pendingAction, openInEditor, saveToMyBuilds } = useArchetypeBuildActions();

  const tab: TabKey = searchParams.get('tab') === 'class' ? 'class' : 'encounter';
  const selectedClass = isEsoClass(searchParams.get('class'))
    ? (searchParams.get('class') as EsoClass)
    : ESO_CLASSES[0];
  const encounterParam = searchParams.get('boss');

  const [encounters, setEncounters] = useState<DpsEncounterSummary[]>([]);
  const [encountersError, setEncountersError] = useState<string | null>(null);
  const [encountersLoading, setEncountersLoading] = useState(true);
  const [encountersToken, setEncountersToken] = useState(0);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    document.title = 'Build Leaderboard | ESO Toolkit';
  }, []);

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
    return fromUrl ?? encounters[0];
  }, [encounters, encounterParam]);

  const parseQuery = useMemo(() => {
    // Class tab POOLS across bosses by default: pattern identity (gear, bars,
    // skill lines) does not require same-boss parses, and per-boss slices
    // starve minority classes (a 54%-Necromancer board left Dragonknights 2
    // parses on a boss with 201). DPS is normalized to each boss's ceiling
    // before display instead. An explicit ?boss= still narrows to one board.
    if (tab === 'class') {
      const bossFilter =
        selectedEncounter && encounterParam
          ? {
              encounterId: selectedEncounter.encounter_id,
              difficulty: selectedEncounter.difficulty,
            }
          : {};
      if (!selectedClass) return null;
      return { esoClass: selectedClass, perEncounterCap: 25, ...bossFilter };
    }
    if (!selectedEncounter) return null;
    return {
      encounterId: selectedEncounter.encounter_id,
      difficulty: selectedEncounter.difficulty,
    };
  }, [tab, selectedClass, selectedEncounter, encounterParam]);

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
      map.set(`${encounter.encounter_id}:${encounter.difficulty}`, encounter.top_amount);
    });
    return map;
  }, [encounters]);
  const clusterParses = useMemo(() => {
    if (!isPooledClass) return parses;
    return parses.map((parse) => {
      const top = topAmountByKey.get(`${parse.encounter_id}:${parse.difficulty}`);
      return top && top > 0 && parse.amount > 0 ? { ...parse, amount: parse.amount / top } : parse;
    });
  }, [isPooledClass, parses, topAmountByKey]);
  // Wait for boss ceilings before clustering a pooled view, or every parse
  // would carry its raw amount and re-cluster once ceilings arrive.
  const poolingReady = !isPooledClass || topAmountByKey.size > 0;
  const bossCount = useMemo(
    () => new Set(parses.map((parse) => `${parse.encounter_id}:${parse.difficulty}`)).size,
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

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
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

  return (
    <Container
      maxWidth={false}
      sx={{ maxWidth: 1280, px: { xs: 1.5, sm: 2.5 }, py: { xs: 1.5, sm: 2.5 } }}
    >
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
              Build Leaderboard
            </Typography>
          </Box>

          <Box
            role="tablist"
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
                ['encounter', 'By encounter'],
                ['class', 'By class'],
              ] as const
            ).map(([value, label]) => {
              const active = tab === value;
              return (
                <ButtonBase
                  key={value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam({ tab: value })}
                  sx={(theme) => ({
                    minHeight: 36,
                    flex: { xs: 1, md: '0 0 auto' },
                    minWidth: { md: 112 },
                    px: 1.6,
                    borderRadius: 1.5,
                    color: active ? 'text.primary' : 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 600,
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
          {/* The encounter picker renders on BOTH tabs: class comparisons are
              only apples-to-apples within one boss, so the class tab requires
              the same scoped selection (defaulted via selectedEncounter). */}
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
                onChange={(event) => {
                  const next = String(event.target.value);
                  setParam({ boss: next === ALL_BOSSES ? null : next });
                }}
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
                          ? `${selectedEncounter.trial_id ? `${selectedEncounter.trial_id} · ` : ''}${selectedEncounter.encounter_name}`
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
                  role="radiogroup"
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
                  {ESO_CLASSES.map((esoClass) => {
                    const label = CLASS_LABELS[esoClass] ?? esoClass;
                    const active = selectedClass === esoClass;
                    const classTheme = getLeaderboardClassTheme(esoClass);
                    return (
                      <ButtonBase
                        key={esoClass}
                        role="radio"
                        aria-checked={active}
                        aria-label={label}
                        onClick={() => setParam({ class: esoClass })}
                        sx={(theme) => ({
                          display: 'flex',
                          gap: 0.7,
                          px: 1.1,
                          minHeight: 36,
                          borderRadius: 1.5,
                          color: active ? 'text.primary' : 'text.secondary',
                          fontSize: '0.74rem',
                          fontWeight: active ? 700 : 600,
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
                        <ClassIcon className={label} size={15} alt="" />
                        {label}
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
                {tooFewParses ? (result.k === 1 ? 'build' : 'builds') : 'patterns'}
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
                  : `${result.uniqueSignatures} distinct builds were grouped into ${result.k} patterns.`}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 650 }}>
                  {/* A silhouette score describes a clustering. On the thin-data
                      path there isn't one, so quoting "Limited" would be
                      reporting the quality of an analysis we never ran. */}
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
              esoClass={CLASS_LABELS[selectedClass] ?? selectedClass}
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
              onBroadenScope={isPooledClass ? undefined : () => setParam({ boss: null })}
              broadenScopeLabel="All trial bosses"
              onRetry={handleRetry}
              onOpenInEditor={openInEditor}
              onSaveBuild={saveToMyBuilds}
              onViewSourceLog={handleViewSourceLog}
              pendingAction={pendingAction}
              emptyMessage={`No ${CLASS_LABELS[selectedClass] ?? selectedClass} parses recorded yet.`}
              hideSummary
            />
          </PanelErrorBoundary>
        )}
      </Box>

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
