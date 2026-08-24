import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
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
        sx={(theme) => ({
          mb: 2.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
        })}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr auto',
              md: 'minmax(180px, 1fr) auto minmax(180px, 1fr)',
            },
            minHeight: 44,
            alignItems: 'center',
            columnGap: 2,
          }}
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

          <Tabs
            value={tab}
            onChange={(_event, value: TabKey) => setParam({ tab: value })}
            aria-label="Build leaderboard view"
            sx={{
              minHeight: 44,
              gridColumn: { xs: '1 / -1', md: 2 },
              gridRow: { xs: 2, md: 1 },
              justifySelf: { xs: 'stretch', md: 'center' },
              '& .MuiTabs-flexContainer': { justifyContent: { xs: 'flex-start', md: 'center' } },
              '& .MuiTabs-indicator': { height: 2 },
              '& .MuiTab-root': {
                minHeight: 44,
                minWidth: 104,
                px: 1.5,
                fontSize: '0.74rem',
                fontWeight: 650,
                textTransform: 'none',
              },
            }}
          >
            <Tab label="By encounter" value="encounter" />
            <Tab label="By class" value="class" />
          </Tabs>

          <Typography
            className="u-tabular"
            sx={{ justifySelf: 'end', color: 'text.secondary', fontSize: '0.7rem' }}
          >
            {tab === 'encounter' && selectedEncounter?.updated_at
              ? `Updated ${selectedEncounter.updated_at.slice(0, 10)}`
              : 'ESO Logs data'}
          </Typography>
        </Box>

        <Box
          component="section"
          aria-label="Build leaderboard filters"
          sx={(theme) => ({
            display: 'flex',
            minHeight: 52,
            alignItems: 'center',
            py: 0.75,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.48)}`,
          })}
        >
          {tab === 'encounter' ? (
            <FormControl size="small" fullWidth sx={{ maxWidth: 560 }}>
              <InputLabel id="dps-encounter-label">Trial &amp; boss</InputLabel>
              <Select
                labelId="dps-encounter-label"
                label="Trial & boss"
                value={selectedEncounter ? encounterKey(selectedEncounter) : ''}
                onChange={(event) => setParam({ boss: String(event.target.value) })}
              >
                {encounters.map((encounter) => (
                  <MenuItem key={encounterKey(encounter)} value={encounterKey(encounter)}>
                    {encounter.trial_id ? `${encounter.trial_id} — ` : ''}
                    {encounter.encounter_name} ({encounter.parse_count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto', pb: 0.25 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={selectedClass}
                aria-label="ESO class"
                onChange={(_event, value: string | null) => value && setParam({ class: value })}
                sx={(theme) => ({
                  minWidth: 'max-content',
                  gap: 0.5,
                  '& .MuiToggleButtonGroup-grouped': {
                    m: 0,
                    border: `1px solid ${alpha(theme.palette.divider, 0.75)} !important`,
                    borderRadius: '6px !important',
                  },
                })}
              >
                {ESO_CLASSES.map((esoClass) => {
                  const label = CLASS_LABELS[esoClass] ?? esoClass;
                  return (
                    <ToggleButton
                      key={esoClass}
                      value={esoClass}
                      aria-label={label}
                      sx={(theme) => ({
                        display: 'flex',
                        gap: 0.7,
                        px: 1.1,
                        py: 0.65,
                        color: theme.palette.text.secondary,
                        textTransform: 'none',
                        '&.Mui-selected': {
                          color: theme.palette.text.primary,
                          backgroundColor: alpha(theme.palette.primary.main, 0.09),
                          borderColor: `${alpha(theme.palette.primary.main, 0.3)} !important`,
                        },
                      })}
                    >
                      <ClassIcon className={label} size={15} alt="" />
                      {label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
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
