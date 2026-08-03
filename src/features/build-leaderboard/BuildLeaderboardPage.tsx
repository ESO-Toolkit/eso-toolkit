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

import {
  Box,
  Card,
  Chip,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

const CLASS_LABELS: Record<string, string> = {
  DragonKnight: 'Dragonknight',
};

export const BuildLeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pendingClusterId, openInEditor, saveToMyBuilds } = useArchetypeBuildActions();

  const tab: TabKey = searchParams.get('tab') === 'class' ? 'class' : 'encounter';
  const selectedClass = searchParams.get('class') ?? ESO_CLASSES[0];
  const encounterParam = searchParams.get('boss');

  const [encounters, setEncounters] = useState<DpsEncounterSummary[]>([]);
  const [encountersError, setEncountersError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Build Leaderboard | ESO Toolkit';
  }, []);

  useEffect(() => {
    let cancelled = false;
    dpsParsesApi
      .listEncounters()
      .then((response) => {
        if (!cancelled) setEncounters(response.encounters);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEncountersError(err instanceof Error ? err.message : 'Failed to load encounters');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEncounter = useMemo(() => {
    if (encounters.length === 0) return null;
    const fromUrl = encounters.find((e) => String(e.encounter_id) === encounterParam);
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

  const combinedError = encountersError ?? error ?? clusterError;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Card
        sx={(theme) => ({
          p: 2.5,
          mb: 3,
          borderRadius: 3.5,
          border: `1px solid ${theme.palette.divider}`,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.66) 0%, rgba(3,7,18,0.66) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        })}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Build Leaderboard
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          The builds top DPS players actually run, grouped into archetypes. Green chips are the
          pieces nearly everyone uses; amber ones have real alternatives.
        </Typography>
        {selectedEncounter?.updated_at && (
          <Chip
            size="small"
            variant="outlined"
            label={`Data as of ${selectedEncounter.updated_at.slice(0, 10)}`}
            sx={{ mt: 1.5 }}
          />
        )}
      </Card>

      <Tabs
        value={tab}
        onChange={(_event, value: TabKey) => setParam({ tab: value })}
        sx={{ mb: 2.5 }}
      >
        <Tab label="By Encounter" value="encounter" />
        <Tab label="By Class" value="class" />
      </Tabs>

      {tab === 'encounter' ? (
        <PanelErrorBoundary panelName="Encounter Builds">
          <FormControl size="small" sx={{ minWidth: 280, mb: 2.5 }}>
            <InputLabel id="dps-encounter-label">Trial &amp; boss</InputLabel>
            <Select
              labelId="dps-encounter-label"
              label="Trial & boss"
              value={selectedEncounter ? String(selectedEncounter.encounter_id) : ''}
              onChange={(event) => setParam({ boss: String(event.target.value) })}
            >
              {encounters.map((encounter) => (
                <MenuItem key={encounter.encounter_id} value={String(encounter.encounter_id)}>
                  {encounter.trial_id ? `${encounter.trial_id} — ` : ''}
                  {encounter.encounter_name} ({encounter.parse_count})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <BuildLeaderboardView
            parses={parses}
            result={result}
            loading={loading}
            clustering={clustering}
            clusterProgress={progress}
            error={combinedError}
            tooFewParses={tooFewParses}
            onRetry={reload}
            onOpenInEditor={openInEditor}
            onSaveBuild={saveToMyBuilds}
            onViewSourceLog={handleViewSourceLog}
            pendingClusterId={pendingClusterId}
            emptyMessage="No top parses recorded for this boss yet. Try another encounter."
          />
        </PanelErrorBoundary>
      ) : (
        <PanelErrorBoundary panelName="Class Archetypes">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedClass}
            onChange={(_event, value: string | null) => value && setParam({ class: value })}
            sx={{ mb: 2.5, flexWrap: 'wrap' }}
          >
            {ESO_CLASSES.map((esoClass) => (
              <ToggleButton key={esoClass} value={esoClass} sx={{ textTransform: 'none' }}>
                {CLASS_LABELS[esoClass] ?? esoClass}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <BuildLeaderboardView
            parses={parses}
            result={result}
            loading={loading}
            clustering={clustering}
            clusterProgress={progress}
            error={combinedError}
            tooFewParses={tooFewParses}
            esoClass={CLASS_LABELS[selectedClass] ?? selectedClass}
            onRetry={reload}
            onOpenInEditor={openInEditor}
            onSaveBuild={saveToMyBuilds}
            onViewSourceLog={handleViewSourceLog}
            pendingClusterId={pendingClusterId}
            emptyMessage={`No ${CLASS_LABELS[selectedClass] ?? selectedClass} parses recorded yet.`}
          />
        </PanelErrorBoundary>
      )}

      <Box sx={{ mt: 4, opacity: 0.6 }}>
        <Typography variant="caption">
          Parse data from ESO Logs. Each archetype links back to the log it came from.
        </Typography>
      </Box>
    </Container>
  );
};
