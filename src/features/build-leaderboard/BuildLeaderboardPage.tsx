import { KeyboardArrowDownRounded } from '@mui/icons-material';
import { Box, ButtonBase, Container, MenuItem, Select, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ClassIcon } from '../../components/ClassIcon';
import { PanelErrorBoundary } from '../../components/PanelErrorBoundary';

import { dpsParsesApi } from './api/dpsParsesApi';
import { BuildLeaderboardView } from './components/BuildLeaderboardView';
import { useArchetypeBuildActions } from './hooks/useArchetypeBuildActions';
import { useBuildClusters } from './hooks/useBuildClusters';
import { useDpsParses } from './hooks/useDpsParses';
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

function encounterKey(encounter: Pick<DpsEncounterSummary, 'encounter_id' | 'difficulty'>): string {
  return `${encounter.encounter_id}:${encounter.difficulty}`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
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
    if (tab === 'class') return { esoClass: selectedClass };
    if (!selectedEncounter) return null;
    return {
      encounterId: selectedEncounter.encounter_id,
      difficulty: selectedEncounter.difficulty,
    };
  }, [tab, selectedClass, selectedEncounter]);

  const { parses, loading, error, reload } = useDpsParses(parseQuery);
  const {
    result,
    loading: clustering,
    progress,
    error: clusterError,
    tooFewParses,
    recluster,
  } = useBuildClusters(parses);

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

  const encounterTabError = tab === 'encounter' ? encountersError : null;
  const combinedError = encounterTabError ?? error ?? clusterError;

  const handleRetry = useCallback(() => {
    if (encounterTabError) {
      setEncountersToken((token) => token + 1);
      return;
    }
    if (error) {
      reload();
      return;
    }
    if (clusterError) recluster();
  }, [encounterTabError, error, clusterError, reload, recluster]);

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 } }}>
      <Box
        component="header"
        aria-label="Build leaderboard controls"
        sx={{ mb: { xs: 2, sm: 2.5 } }}
      >
        <Box
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr auto',
              md: 'minmax(180px, 1fr) auto minmax(180px, 1fr)',
            },
            minHeight: 48,
            alignItems: 'center',
            columnGap: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
          })}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Space Grotesk, Inter, system-ui',
              fontSize: '1.125rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
            }}
          >
            Build Leaderboard
          </Typography>

          <Box
            role="tablist"
            aria-label="Build leaderboard view"
            sx={(theme) => ({
              display: 'inline-flex',
              gap: 0.4,
              p: 0.4,
              gridColumn: { xs: '1 / -1', md: 2 },
              gridRow: { xs: 2, md: 1 },
              justifySelf: { xs: 'stretch', md: 'center' },
              width: { xs: '100%', md: 'auto' },
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

          <Typography
            className="u-tabular"
            sx={{ justifySelf: 'end', color: 'text.secondary', fontSize: '0.7rem' }}
          >
            {tab === 'encounter' && selectedEncounter?.updated_at
              ? `Updated ${formatUpdatedAt(selectedEncounter.updated_at)}`
              : 'ESO Logs data'}
          </Typography>
        </Box>

        <Box
          component="section"
          aria-label="Build leaderboard filters"
          sx={{ display: 'flex', minHeight: 64, alignItems: 'center', pt: 1.25 }}
        >
          {tab === 'encounter' ? (
            <Box sx={{ width: '100%', maxWidth: 720 }}>
              <Typography
                id="dps-encounter-label"
                sx={{ mb: 0.55, color: 'text.secondary', fontSize: '0.68rem', fontWeight: 650 }}
              >
                Encounter
              </Typography>
              <Select
                labelId="dps-encounter-label"
                aria-label="Trial & boss"
                value={selectedEncounter ? encounterKey(selectedEncounter) : ''}
                onChange={(event) => setParam({ boss: String(event.target.value) })}
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
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        minWidth: 0,
                        fontSize: { xs: '0.92rem', sm: '1rem' },
                        fontWeight: 650,
                      }}
                    >
                      {selectedEncounter
                        ? `${selectedEncounter.trial_id ? `${selectedEncounter.trial_id} · ` : ''}${selectedEncounter.encounter_name}`
                        : 'Choose an encounter'}
                    </Typography>
                    {selectedEncounter && (
                      <Typography
                        className="u-tabular"
                        sx={{ flex: '0 0 auto', color: 'text.secondary', fontSize: '0.72rem' }}
                      >
                        {selectedEncounter.parse_count} parses
                      </Typography>
                    )}
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
          ) : (
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
                        backgroundColor: active
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        boxShadow: active
                          ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.22)}`
                          : 'none',
                        '&:hover': {
                          color: 'text.primary',
                          backgroundColor: alpha(theme.palette.primary.main, active ? 0.13 : 0.05),
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
            />
          </PanelErrorBoundary>
        ) : (
          <PanelErrorBoundary panelName="Class Archetypes">
            <BuildLeaderboardView
              parses={parses}
              result={result}
              loading={loading}
              clustering={clustering}
              clusterProgress={progress}
              error={combinedError}
              tooFewParses={tooFewParses}
              esoClass={CLASS_LABELS[selectedClass] ?? selectedClass}
              onRetry={handleRetry}
              onOpenInEditor={openInEditor}
              onSaveBuild={saveToMyBuilds}
              onViewSourceLog={handleViewSourceLog}
              pendingAction={pendingAction}
              emptyMessage={`No ${CLASS_LABELS[selectedClass] ?? selectedClass} parses recorded yet.`}
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
