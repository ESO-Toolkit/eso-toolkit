/**
 * Top DPS Builds leaderboard.
 *
 * Two views over the same ingested data: by encounter (what wins on this boss)
 * and by class (what this class runs everywhere).
 *
 * The encounter picker is driven by our own /dps-leaderboard/encounters endpoint
 * rather than the ESO Logs zone GraphQL query the sibling /leaderboards page uses.
 * That endpoint already reports exactly which encounters have ingested data, with
 * names and trial codes — so there is no second data source to reconcile, and no
 * dropdown entry that leads to an empty page.
 */

import { InsightsOutlined, PublicOutlined, TuneOutlined } from '@mui/icons-material';
import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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

/** ESO Logs class slugs, as returned by characterRankings. */
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

const CLASS_LABELS: Record<string, string> = {
  DragonKnight: 'Dragonknight',
};

/**
 * Identity of a picker entry.
 *
 * The encounters feed groups by (encounter_id, difficulty), so one boss can
 * legitimately appear more than once — normal and veteran, say. Keying on
 * encounter_id alone would collide React keys and make the second difficulty
 * unselectable, since the lookup would always resolve to the first match.
 */
function encounterKey(encounter: Pick<DpsEncounterSummary, 'encounter_id' | 'difficulty'>): string {
  return `${encounter.encounter_id}:${encounter.difficulty}`;
}

export const BuildLeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pendingAction, openInEditor, saveToMyBuilds } = useArchetypeBuildActions();

  const tab: TabKey = searchParams.get('tab') === 'class' ? 'class' : 'encounter';
  // Clamped to the known classes: an unrecognised ?class= would otherwise leave
  // the toggle group with nothing selected AND fire an API request for a class
  // that cannot exist.
  const selectedClass = isEsoClass(searchParams.get('class'))
    ? (searchParams.get('class') as EsoClass)
    : ESO_CLASSES[0];
  const encounterParam = searchParams.get('boss');

  const [encounters, setEncounters] = useState<DpsEncounterSummary[]>([]);
  const [encountersError, setEncountersError] = useState<string | null>(null);
  // Tracked so the encounter tab does not flash "No top parses recorded…" while
  // the picker feed is still in flight: until it resolves there is no encounter
  // to query, so useDpsParses sits idle and the view would read that as "empty".
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
    const fromUrl = encounters.find((e) => encounterKey(e) === encounterParam);
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
      const parse = parses.find((p) => p.parse_id === cluster.medoidParseId);
      if (!parse) return;
      navigate(`/report/${parse.report_code}/fight/${parse.fight_id}`);
    },
    [navigate, parses],
  );

  // The class tab does not consult the encounters feed, so a failure there must
  // not block it behind an error state.
  const encounterTabError = tab === 'encounter' ? encountersError : null;
  const combinedError = encounterTabError ?? error ?? clusterError;

  // Retry has to re-run whatever actually failed. Always calling `reload` left a
  // failed encounters feed unrecoverable without a full page refresh — and, for a
  // clustering failure, refetching the parses is not a retry at all: identical
  // rows produce an identical cache key, so the clustering effect never re-runs
  // and the button silently does nothing. Each failure gets its own retry.
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3.5 }, px: { xs: 1.5, sm: 3 } }}>
      <Box
        component="header"
        sx={(theme) => ({
          position: 'relative',
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 4 },
          mb: 2.5,
          pb: 2.5,
          overflow: 'hidden',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 340,
            height: 180,
            right: -80,
            top: -100,
            pointerEvents: 'none',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.11)} 0%, transparent 70%)`,
          },
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.25, sm: 1.75 } }}>
          <Box
            sx={(theme) => ({
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              borderRadius: 1.6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.primary.main,
              background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.055)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
              boxShadow: `0 0 24px ${alpha(theme.palette.primary.main, 0.09)}`,
              flexShrink: 0,
            })}
          >
            <InsightsOutlined sx={{ fontSize: { xs: 21, sm: 25 } }} />
          </Box>
          <Box>
            <Typography
              sx={{
                color: 'text.disabled',
                fontSize: '0.62rem',
                fontWeight: 750,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                mb: 0.45,
              }}
            >
              Combat intelligence
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: 'Space Grotesk, Inter, system-ui',
                fontWeight: 730,
                fontSize: { xs: '1.45rem', sm: '1.8rem' },
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
              }}
            >
              Build Leaderboard
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.75, maxWidth: 650, lineHeight: 1.55 }}
            >
              See the build patterns behind the fastest parses, which pieces define them, and how
              their real-world performance compares.
            </Typography>
          </Box>
        </Box>

        <Stack
          direction={{ xs: 'row', sm: 'column' }}
          spacing={{ xs: 1.5, sm: 0.5 }}
          sx={{
            color: 'text.secondary',
            minWidth: { md: 220 },
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PublicOutlined sx={{ fontSize: 15, color: 'text.disabled' }} />
            <Typography variant="caption">Observed top parses from ESO Logs</Typography>
          </Box>
          {tab === 'encounter' && selectedEncounter?.updated_at && (
            <Typography variant="caption" className="u-tabular" sx={{ pl: { sm: 2.75 } }}>
              Updated {selectedEncounter.updated_at.slice(0, 10)}
            </Typography>
          )}
        </Stack>
      </Box>

      <Paper
        component="section"
        aria-label="Build leaderboard filters"
        elevation={0}
        sx={(theme) => ({
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12)}`,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(15,23,42,0.62) 0%, rgba(3,7,18,0.48) 100%)'
              : 'linear-gradient(145deg, rgba(255,255,255,0.94) 0%, rgba(244,249,255,0.82) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        })}
      >
        <Box
          sx={(theme) => ({
            px: { xs: 1.25, sm: 1.75 },
            pt: 1.2,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 0.75,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
          })}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
            <TuneOutlined sx={{ fontSize: 16 }} />
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Explore builds
            </Typography>
          </Box>
          <Tabs
            value={tab}
            onChange={(_event, value: TabKey) => setParam({ tab: value })}
            aria-label="Build leaderboard view"
            sx={(theme) => ({
              minHeight: 40,
              '& .MuiTabs-indicator': { height: 2, borderRadius: '2px 2px 0 0' },
              '& .MuiTab-root': {
                minHeight: 40,
                minWidth: { xs: 0, sm: 120 },
                px: { xs: 1.25, sm: 2 },
                fontSize: '0.76rem',
                fontWeight: 650,
                color: theme.palette.text.secondary,
              },
              '& .Mui-selected': { color: `${theme.palette.text.primary} !important` },
            })}
          >
            <Tab label="By Encounter" value="encounter" />
            <Tab label="By Class" value="class" />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 1.25, sm: 1.75 } }}>
          {tab === 'encounter' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'stretch', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.25,
              }}
            >
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
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Select a boss to compare the archetypes used in its fastest recorded clears.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto', pb: 0.25 }}>
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
                    borderRadius: '8px !important',
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
                        px: 1.2,
                        py: 0.7,
                        textTransform: 'none',
                        color: theme.palette.text.secondary,
                        '&.Mui-selected': {
                          color: theme.palette.text.primary,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          borderColor: `${alpha(theme.palette.primary.main, 0.28)} !important`,
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
      </Paper>

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
          mt: 4,
          pt: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          color: 'text.disabled',
        })}
      >
        <Typography variant="caption">
          Parse data from ESO Logs. Each archetype links to the representative log it came from.
        </Typography>
      </Box>
    </Container>
  );
};
