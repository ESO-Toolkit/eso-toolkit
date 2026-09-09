import {
  Alert,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Stack,
  useTheme,
} from '@mui/material';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';
import { InsightsSkeletonLayout } from '../../../components/InsightsSkeletonLayout';
import { FightFragment } from '../../../graphql/gql/graphql';
import { KnownAbilities } from '../../../types/abilities';
import type { EvidenceDrilldownInput } from '../../analysis/evidence/evidenceDrilldownModel';
import {
  EvidenceDrilldownPanel,
  type EvidenceDrilldownDataState,
  type EvidenceDrilldownProvenance,
} from '../../analysis/evidence/EvidenceDrilldownPanel';

import { BuffUptimesPanel } from './BuffUptimesPanel';
import type { ComparisonResult } from './comparison/comparisonModel';
import { AnalysisComparisonPanel } from './comparison/components/AnalysisComparisonPanel';
import { DamageBreakdownPanel } from './DamageBreakdownPanel';
import { DamageTypeBreakdownPanel } from './DamageTypeBreakdownPanel';
import { DebuffUptimesPanel } from './DebuffUptimesPanel';
import { DecisionSummaryPanel } from './decision/components/DecisionSummaryPanel';
import { buildPrioritizedDecisionSummary, type DecisionScope } from './decision/decisionSummary';
import { PinnedFindingsPanel, type PinnedFindingsPanelState } from './findings/PinnedFindingsPanel';
import { StatusEffectUptimesPanel } from './StatusEffectUptimesPanel';

export type InsightsWorkflowState = 'loading' | 'partial' | 'stale' | 'failed' | 'unavailable';

/**
 * Evidence can only enter the workflow after an authoritative producer has
 * supplied the complete, rule-backed payload. Raw event streams alone are not
 * evidence: they do not establish expected behavior or score contribution.
 */
export type InsightsEvidenceWorkflow = Readonly<{
  input: EvidenceDrilldownInput;
  dataState?: EvidenceDrilldownDataState;
  provenance?: EvidenceDrilldownProvenance;
}>;

export interface InsightsPanelViewProps {
  fight: FightFragment;
  durationMs: number;
  abilityEquipped: Partial<Record<KnownAbilities, string[]>>;
  buffActors: Partial<Record<KnownAbilities, Set<string>>>;
  fightInitiator: string | null;
  selectedPlayerId: number | null;
  isLoading: boolean;
  /**
   * Product-completion findings require an authoritative encounter definition,
   * context-compatible baseline, and validated evidence. Until those inputs
   * exist, the shell must show an explicit state rather than deriving advice.
   */
  productWorkflowState: InsightsWorkflowState;
  productEvidence?: InsightsEvidenceWorkflow;
}

// Shared styling for the insight card wrappers (used by the header card and
// every panel card below) so the gradient/sizing lives in one place.
const insightCardWrapperSx = {
  flex: '1 1 calc(50% - 8px)',
  minWidth: { xs: '100%', sm: '300px' },
} as const;

const insightPaperSx = {
  p: 2,
  height: '100%',
  background:
    'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
} as const;

const workflowCardWrapperSx = {
  flex: '1 1 100%',
  minWidth: 0,
} as const;

const unavailableDecisionScope: DecisionScope = {
  partitionId: 'unknown',
  update: 'unknown',
  encounterId: 'unknown',
  encounterVersion: 'unknown',
  encounterKind: 'encounter',
  difficulty: 'unknown',
  role: 'unknown',
  esoClass: 'unknown',
  buildBracket: 'unknown',
};

const unavailableDecisionSummary = buildPrioritizedDecisionSummary({
  scope: unavailableDecisionScope,
  candidates: [
    {
      id: 'authoritative-analysis-unavailable',
      scope: unavailableDecisionScope,
      availability: 'unavailable',
    },
  ],
});

const unavailableComparison: ComparisonResult = {
  status: 'unavailable',
  reason: 'invalid-analysis',
  message:
    'A/B and cohort comparisons require an authoritative, context-compatible baseline. No comparison score is available.',
};

const toPinnedFindingsState = (state: InsightsWorkflowState): PinnedFindingsPanelState => {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'failed':
      return {
        status: 'failed',
        message:
          'Pinned findings could not be refreshed. No stale finding is presented as current.',
      };
    case 'partial':
      return {
        status: 'unavailable',
        reason:
          'Pinned findings require complete, validated evidence. The current analysis inputs are partial.',
      };
    case 'stale':
      return {
        status: 'unavailable',
        reason: 'Pinned findings are withheld while the analysis inputs are stale.',
      };
    case 'unavailable':
      return {
        status: 'unavailable',
        reason: 'No persisted, privacy-safe findings are available for this analysis context.',
      };
  }
};

const workflowStatus = (state: InsightsWorkflowState): React.ReactElement => {
  switch (state) {
    case 'loading':
      return (
        <Alert aria-live="polite" role="status" severity="info">
          Product analysis inputs are loading. Findings and comparisons are withheld until they are
          validated.
        </Alert>
      );
    case 'partial':
      return (
        <Alert aria-live="polite" role="status" severity="warning">
          Product analysis inputs are partial. No recommendation, benchmark, or progression score is
          inferred.
        </Alert>
      );
    case 'stale':
      return (
        <Alert aria-live="polite" role="status" severity="warning">
          Product analysis inputs are stale. Any refreshed finding remains withheld until the
          current data is available.
        </Alert>
      );
    case 'failed':
      return (
        <Alert aria-live="assertive" role="alert" severity="error">
          Product analysis inputs failed to load. No recommendation, score, or comparison is
          available.
        </Alert>
      );
    case 'unavailable':
      return (
        <Alert aria-live="polite" role="status" severity="info">
          This report has no authoritative encounter context, validated rule evidence, or
          context-compatible baseline for product findings yet. Unknown data is not scored as zero.
        </Alert>
      );
  }
};

const ProductWorkflow = ({
  state,
  evidence,
}: {
  state: InsightsWorkflowState;
  evidence?: InsightsEvidenceWorkflow;
}): React.ReactElement => {
  return (
    <Box component="section" aria-label="Analysis workflow" sx={workflowCardWrapperSx}>
      <Stack spacing={2}>
        {workflowStatus(state)}
        <DecisionSummaryPanel
          summary={unavailableDecisionSummary}
          state={state === 'loading' ? 'loading' : 'unavailable'}
        />
        {evidence ? (
          <EvidenceDrilldownPanel
            input={evidence.input}
            dataState={evidence.dataState}
            provenance={evidence.provenance}
            title="Evidence drilldown"
          />
        ) : (
          <Paper
            component="section"
            elevation={0}
            sx={insightPaperSx}
            aria-labelledby="evidence-drilldown-title"
            data-testid="evidence-drilldown-unavailable"
          >
            <Typography id="evidence-drilldown-title" component="h2" variant="h6">
              Evidence drilldown
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Timestamped evidence for transparent analysis decisions.
            </Typography>
            <Alert aria-live="polite" role="status" severity="info" sx={{ mt: 2 }}>
              Validated evidence and its privacy-safe provenance are unavailable. The drilldown is
              withheld rather than treating unavailable events as an empty evidence set.
            </Alert>
          </Paper>
        )}
        <PinnedFindingsPanel state={toPinnedFindingsState(state)} />
        <AnalysisComparisonPanel
          comparison={unavailableComparison}
          title="A/B and cohort comparison"
        />
        <Paper
          component="section"
          elevation={0}
          sx={insightPaperSx}
          aria-labelledby="pull-progression-title"
        >
          <Typography id="pull-progression-title" component="h2" variant="h6">
            Pull progression
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            A timestamped pull storyboard is available only for an authoritative, matching pull
            cohort.
          </Typography>
          <Alert
            aria-live="polite"
            role="status"
            severity={state === 'failed' ? 'error' : 'info'}
            sx={{ mt: 2 }}
          >
            Progression is unavailable because this report has no verified, context-compatible pull
            history. No trend or score is inferred.
          </Alert>
        </Paper>
      </Stack>
    </Box>
  );
};

interface AbilityDatum {
  name: string;
  ids: string[];
  icon?: string;
  knownAbilities: KnownAbilities[];
}

const ABILITY_DATA: AbilityDatum[] = [
  {
    name: 'Colossus',
    ids: ['122388'],
    icon: 'ability_necromancer_006_a',
    knownAbilities: [KnownAbilities.GLACIAL_COLOSSUS],
  },
  {
    name: 'Atronach',
    ids: ['23495'],
    // Summon Charged Atronach (Sorc). Master data often lacks this id in a given
    // fight, so supply the canonical ESO Logs icon (verified 200 on the CDN) as a
    // fallback — otherwise AbilityIcon renders nothing.
    icon: 'ability_sorcerer_endless_atronachs',
    knownAbilities: [KnownAbilities.SUMMON_CHARGED_ATRONACH],
  },
  {
    name: 'Barrier',
    ids: ['40237', '40239', '103964'],
    icon: 'ability_ava_006_b',
    knownAbilities: [KnownAbilities.REVIVING_BARRIER, KnownAbilities.REPLENISHING_BARRIER],
  },
  {
    name: 'Horn',
    ids: ['40223'],
    // Aggressive Horn (Assault ult). Same master-data gap as Atronach above;
    // supply the canonical ESO Logs icon (verified 200 on the CDN) as a fallback.
    icon: 'ability_ava_003_a',
    knownAbilities: [KnownAbilities.AGGRESSIVE_HORN],
  },
];

const CHAMPION_POINT_DATA = [
  { name: 'Enlivening Overflow', emoji: '⚡', knownAbility: KnownAbilities.ENLIVENING_OVERFLOW },
  { name: 'From the Brink', emoji: '🛡️', knownAbility: KnownAbilities.FROM_THE_BRINK },
];

// Helper function to format duration from milliseconds into minutes and seconds
const formatDuration = (ms: number): string => {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const decimals = Math.round((totalSeconds % 1) * 10);

  if (minutes > 0) {
    return `${minutes}m ${seconds}.${decimals}s`;
  } else {
    return `${seconds}.${decimals}s`;
  }
};

export const InsightsPanelView: React.FC<InsightsPanelViewProps> = ({
  fight,
  durationMs,
  abilityEquipped,
  buffActors,
  fightInitiator,
  selectedPlayerId,
  isLoading,
  productWorkflowState,
  productEvidence,
}) => {
  const theme = useTheme();
  if (isLoading) {
    return <InsightsSkeletonLayout />;
  }
  return (
    <>
      {/* Main insights grid layout */}
      <Box
        data-testid="insights-panel"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          opacity: 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {/* Fight Insights Header - Full Width */}
        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.25rem' },
              }}
            >
              Fight Insights
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                aria-hidden
                sx={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(15, 23, 42, 0.08)',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                ⏱️
              </Box>
              <Typography
                sx={{
                  '& strong': { fontWeight: 600 },
                  '& span': { fontWeight: 400 },
                  fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
                }}
              >
                <strong>Duration: </strong>
                <span>{formatDuration(durationMs)}</span>
              </Typography>
            </Box>

            {fightInitiator && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(15, 23, 42, 0.08)',
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  🎯
                </Box>
                <Typography
                  sx={{
                    '& strong': { fontWeight: 600 },
                    '& span': { fontWeight: 400 },
                    fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
                  }}
                >
                  <strong>Fight initiator: </strong>
                  <span>{fightInitiator}</span>
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1,
                  fontWeight: 300,
                  fontSize: { xs: '0.95rem', sm: '1rem', md: '1.0625rem' },
                }}
              >
                Key Group Abilities:
              </Typography>
              <Box
                role="list"
                aria-label="Key group abilities"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 1,
                  overflow: 'hidden',
                }}
              >
                {ABILITY_DATA.map((ability) => {
                  // Collect all equipped players from all known abilities for this entry
                  const allEquippedBy = ability.knownAbilities.reduce(
                    (acc: string[], knownAbility) => {
                      const players = abilityEquipped[knownAbility] || [];
                      return [...acc, ...players];
                    },
                    [],
                  );

                  // Remove duplicates in case a player has multiple variants equipped
                  const equippedBy = [...new Set(allEquippedBy)];
                  const hasPlayers = equippedBy.length > 0;

                  return (
                    <Box
                      key={ability.name}
                      role="listitem"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.75,
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(15, 23, 42, 0.04)',
                        borderRadius: 1,
                        border:
                          theme.palette.mode === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '1px solid rgba(15, 23, 42, 0.1)',
                        minHeight: 56,
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? 'rgba(0, 0, 0, 0.3)'
                              : 'rgba(15, 23, 42, 0.08)',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <AbilityIcon
                          abilityId={ability.ids[0]}
                          fallbackIcon={ability.icon}
                          fallbackName={ability.name}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 400,
                            color: theme.palette.text.primary,
                            lineHeight: 1.1,
                            mb: 0.25,
                            fontSize: '0.75rem',
                          }}
                        >
                          {ability.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          // Full list on hover: the line truncates with an ellipsis
                          // when many players share an ultimate (e.g. a 12-player raid).
                          title={hasPlayers ? equippedBy.join(', ') : undefined}
                          sx={{
                            display: 'block',
                            color: hasPlayers
                              ? theme.palette.text.secondary
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.5)'
                                : 'rgba(15, 23, 42, 0.4)',
                            fontSize: { xs: '0.6rem', sm: '0.625rem', md: '0.65rem' },
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {hasPlayers ? equippedBy.join(', ') : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 0,
                  fontWeight: 300,
                  fontSize: { xs: '0.95rem', sm: '1rem', md: '1.0625rem' },
                }}
              >
                Key Champion Points:
              </Typography>
              <List dense>
                {CHAMPION_POINT_DATA.map((cp) => (
                  <ListItem
                    key={cp.name}
                    sx={{ pl: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {cp.emoji}
                    </Box>
                    <ListItemText
                      primary={cp.name}
                      slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      secondary={
                        buffActors[cp.knownAbility] && buffActors[cp.knownAbility]?.size
                          ? Array.from(buffActors[cp.knownAbility] as Set<string>).join(', ')
                          : '—'
                      }
                      sx={{
                        '& .MuiListItemText-secondary': {
                          fontSize: { xs: '0.7rem', sm: '0.725rem', md: '0.75rem' },
                          color: theme.palette.text.secondary,
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Box>
        {/* All panels in flexbox with 2 items per row */}

        <ProductWorkflow evidence={productEvidence} state={productWorkflowState} />

        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <StatusEffectUptimesPanel fight={fight} selectedPlayerId={selectedPlayerId} />
          </Paper>
        </Box>

        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <BuffUptimesPanel fight={fight} selectedPlayerId={selectedPlayerId} />
          </Paper>
        </Box>

        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <DebuffUptimesPanel fight={fight} selectedPlayerId={selectedPlayerId} />
          </Paper>
        </Box>

        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <DamageBreakdownPanel fight={fight} selectedPlayerId={selectedPlayerId} />
          </Paper>
        </Box>

        <Box sx={insightCardWrapperSx}>
          <Paper elevation={2} sx={insightPaperSx}>
            <DamageTypeBreakdownPanel fight={fight} selectedPlayerId={selectedPlayerId} />
          </Paper>
        </Box>
      </Box>
    </>
  );
};
