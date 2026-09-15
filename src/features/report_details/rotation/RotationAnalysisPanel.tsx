import React from 'react';
import { useSelector } from 'react-redux';

import { ReportActorFragment } from '../../../graphql/gql/graphql';
import { useCastEvents, useResolvedReportFightContext, useResourceEvents } from '../../../hooks';
import { selectEventPlayers } from '../../../store/events_data/actions';
import { selectCombinedMasterData } from '../../../store/master_data/masterDataSelectors';
import { selectResourceEventsEntryForContext } from '../../../store/selectors/eventsSelectors';
import type { RootState } from '../../../store/storeWithHistory';
import { ResourceChangeEvent, UnifiedCastEvent } from '../../../types/combatlogEvents';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';
import {
  AnalyzerPanelState,
  resolveAnalyzerPanelState,
  type AnalyzerPanelStateKind,
} from '../AnalyzerPanelState';

import { RotationAnalysisPanelView } from './RotationAnalysisPanelView';

interface RotationAnalysisPanelProps {
  fight: { startTime?: number; endTime?: number; friendlyPlayers?: (number | null)[] | null };
}

type FightWithResolvedWindow = RotationAnalysisPanelProps['fight'] & {
  endTime: number;
  startTime: number;
};

export const hasRotationFightWindow = (
  fight: RotationAnalysisPanelProps['fight'],
): fight is FightWithResolvedWindow =>
  fight.startTime !== undefined &&
  fight.endTime !== undefined &&
  Number.isFinite(fight.startTime) &&
  Number.isFinite(fight.endTime) &&
  fight.endTime > fight.startTime;

interface RotationPanelLifecycleInput {
  castEventsError: string | null;
  castEventsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  hasData: boolean;
  resourceEventsError: string | null;
  resourceEventsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

export const resolveRotationAnalysisPanelState = ({
  castEventsError,
  castEventsStatus,
  hasData,
  resourceEventsError,
  resourceEventsStatus,
}: RotationPanelLifecycleInput): AnalyzerPanelStateKind =>
  resolveAnalyzerPanelState({
    error:
      castEventsError ??
      resourceEventsError ??
      (castEventsStatus === 'failed'
        ? 'Cast event data failed to load.'
        : resourceEventsStatus === 'failed'
          ? 'Resource event data failed to load.'
          : null),
    hasData,
    isComplete: castEventsStatus === 'succeeded' && resourceEventsStatus === 'succeeded',
    isLoading: castEventsStatus === 'loading' || resourceEventsStatus === 'loading',
  });

export type RotationAnalysisDataState = 'ready' | 'partial' | 'unavailable' | 'invalid';

export interface RotationAnalysis {
  playerId: string;
  playerName: string;
  abilities: AbilityUsage[];
  /** Null means the event stream cannot support an APM measurement. */
  averageAPM: number | null;
  resourceEfficiency: ResourceEfficiencyData;
  dataState: RotationAnalysisDataState;
  rotationPattern: string[];
  skillPriorities: SkillPriority[];
  spammableSkills: SpammableSkill[];
  generalRotation: GeneralRotation;
}

export interface AbilityUsage {
  abilityId: number | string;
  abilityName: string;
  useCount: number;
  averageCastTime: number;
  resourceCost: number;
  averageTimeBetweenCasts: number;
  timestamps: number[]; // Track when each cast occurred
}

export interface SkillPriority {
  higherPrioritySkill: string;
  lowerPrioritySkill: string;
  interruptionCount: number; // How many times the higher priority skill interrupted the lower priority one
  confidence: number; // 0-1 confidence score based on frequency
}

export interface SpammableSkill {
  abilityName: string;
  averageInterval: number; // Average time between casts in seconds
  burstCount: number; // Number of times cast in quick succession (< 3 seconds apart)
  spammableScore: number; // 0-1 score indicating how spammable this skill is
}

export interface GeneralRotation {
  commonSequences: RotationSequence[];
  openerSequence: string[]; // Most common opening sequence
  fillerAbilities: string[]; // Abilities used to fill gaps
}

export interface RotationSequence {
  sequence: string[];
  frequency: number;
  averageInterval: number; // Average time between abilities in this sequence
}

export interface ResourceMetric {
  /** Null means no valid samples were received for this resource. */
  averageLevel: number | null;
  wastePercentage: number | null;
  lowestPoint: number | null;
}

export interface ResourceEfficiencyData {
  magicka: ResourceMetric;
  stamina: ResourceMetric;
}

interface ResourcePlayerData {
  magickaLevels: number[];
  staminaLevels: number[];
  magickaWaste: number;
  staminaWaste: number;
}

export interface RotationAnalysisResult {
  state: RotationAnalysisDataState;
  message: string;
  rotationAnalyses: RotationAnalysis[];
}

export interface RotationAnalysisInput {
  fight: RotationAnalysisPanelProps['fight'] | null | undefined;
  castEvents: readonly UnifiedCastEvent[] | null | undefined;
  resourceEvents: readonly ResourceChangeEvent[] | null | undefined;
  playersById: Record<string, ReportActorFragment>;
  abilitiesById: Record<number | string, { name?: string | null } | undefined>;
}

/**
 * Analyzes player skill rotations and resource management from cast and resource events
 */

// Helper function to analyze skill priorities based on interrupt patterns
const analyzeSkillPriorities = (abilities: AbilityUsage[]): SkillPriority[] => {
  const priorities: SkillPriority[] = [];

  // Sort abilities by usage frequency for priority analysis
  const sortedAbilities = [...abilities].sort((a, b) => b.useCount - a.useCount);

  // Analyze interruption patterns between abilities
  for (let i = 0; i < sortedAbilities.length - 1; i++) {
    for (let j = i + 1; j < sortedAbilities.length; j++) {
      const higherFreqAbility = sortedAbilities[i];
      const lowerFreqAbility = sortedAbilities[j];

      // Calculate interruption count based on timestamp patterns
      let interruptionCount = 0;
      const timeThreshold = 5000; // 5 seconds

      higherFreqAbility.timestamps.forEach((timestamp) => {
        const nearbyLowerCasts = lowerFreqAbility.timestamps.filter(
          (t) => Math.abs(t - timestamp) < timeThreshold && t < timestamp,
        );
        interruptionCount += nearbyLowerCasts.length;
      });

      if (interruptionCount > 0) {
        const confidence = Math.min(interruptionCount / Math.max(lowerFreqAbility.useCount, 1), 1);

        priorities.push({
          higherPrioritySkill: higherFreqAbility.abilityName,
          lowerPrioritySkill: lowerFreqAbility.abilityName,
          interruptionCount,
          confidence,
        });
      }
    }
  }

  // Return top 5 most significant priorities
  return priorities.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
};

// Helper function to identify spammable skills
const identifySpammableSkills = (abilities: AbilityUsage[]): SpammableSkill[] => {
  const spammableSkills: SpammableSkill[] = [];

  abilities.forEach((ability) => {
    if (ability.timestamps.length < 3) return; // Need at least 3 casts to determine spammability

    // Calculate intervals between casts
    const intervals: number[] = [];
    let burstCount = 0;

    for (let i = 1; i < ability.timestamps.length; i++) {
      const interval = (ability.timestamps[i] - ability.timestamps[i - 1]) / 1000;
      intervals.push(interval);

      // Count bursts (casts within 3 seconds of each other)
      if (interval < 3) {
        burstCount++;
      }
    }

    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Calculate spammable score based on:
    // - Low average interval (more spammable if cast frequently)
    // - High burst count (more spammable if cast in quick succession)
    // - High usage count (more likely to be a primary rotation ability)
    const frequencyScore = Math.min(ability.useCount / 20, 1); // Normalize to 0-1
    const intervalScore = Math.max(0, 1 - averageInterval / 10); // Lower interval = higher score
    const burstScore = Math.min(burstCount / (ability.useCount - 1), 1); // Normalize burst frequency

    const spammableScore = frequencyScore * 0.4 + intervalScore * 0.4 + burstScore * 0.2;

    // Only include abilities with a significant spammable score
    if (spammableScore > 0.3) {
      spammableSkills.push({
        abilityName: ability.abilityName,
        averageInterval,
        burstCount,
        spammableScore,
      });
    }
  });

  // Return top spammable skills sorted by score
  return spammableSkills.sort((a, b) => b.spammableScore - a.spammableScore).slice(0, 3);
};

// Helper function to analyze general rotation patterns
const analyzeGeneralRotation = (
  abilities: AbilityUsage[],
  playerCastEventsInput: UnifiedCastEvent[],
): GeneralRotation => {
  // Cast events are already scoped to this player; sort by timestamp
  const playerCastEvents = [...playerCastEventsInput].sort((a, b) => a.timestamp - b.timestamp);

  if (playerCastEvents.length < 5) {
    return {
      commonSequences: [],
      openerSequence: [],
      fillerAbilities: [],
    };
  }

  // Precompute abilityId → name once (O(1) lookups instead of abilities.find per event)
  const abilityNameById = new Map<number | string, string>();
  abilities.forEach((a) => abilityNameById.set(a.abilityId, a.abilityName));
  const nameFor = (event: UnifiedCastEvent): string =>
    abilityNameById.get(event.abilityGameID) || 'Unknown';

  // Find common sequences of 3 abilities, accumulating timing in the same single pass
  const sequences: {
    [key: string]: { frequency: number; totalInterval: number; intervalCount: number };
  } = {};
  const sequenceLength = 3;

  for (let i = 0; i <= playerCastEvents.length - sequenceLength; i++) {
    const window = playerCastEvents.slice(i, i + sequenceLength);
    const sequenceKey = window.map(nameFor).join(' → ');

    const entry = (sequences[sequenceKey] ||= {
      frequency: 0,
      totalInterval: 0,
      intervalCount: 0,
    });
    entry.frequency++;
    if (window.length > 1) {
      entry.totalInterval += (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
      entry.intervalCount++;
    }
  }

  // Find opener sequence (first 5 abilities used most commonly at fight start)
  const openerSequence = playerCastEvents
    .slice(0, Math.min(5, playerCastEvents.length))
    .map(nameFor);

  // Identify filler abilities (low-priority abilities used between main rotation)
  const sortedAbilities = [...abilities].sort((a, b) => b.useCount - a.useCount);
  const mainRotationAbilities = sortedAbilities.slice(
    0,
    Math.max(3, Math.floor(sortedAbilities.length * 0.6)),
  );
  const fillerAbilities = sortedAbilities
    .slice(mainRotationAbilities.length)
    .filter(
      (ability) => ability.averageTimeBetweenCasts > 0 && ability.averageTimeBetweenCasts < 15,
    ) // Short cooldowns
    .map((ability) => ability.abilityName)
    .slice(0, 3);

  // Convert sequences to common sequences with frequency and timing data
  // (timing was accumulated in the single sliding-window pass above)
  const commonSequences: RotationSequence[] = Object.entries(sequences)
    .filter(([_, data]) => data.frequency >= 2) // Only sequences that occurred multiple times
    .map(([sequenceKey, data]) => ({
      sequence: sequenceKey.split(' → '),
      frequency: data.frequency,
      averageInterval: data.intervalCount > 0 ? data.totalInterval / data.intervalCount : 0,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  return {
    commonSequences,
    openerSequence,
    fillerAbilities,
  };
};

const MAX_FIGHT_DURATION_MS = 24 * 60 * 60 * 1000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const emptyResourceMetric = (): ResourceMetric => ({
  averageLevel: null,
  wastePercentage: null,
  lowestPoint: null,
});

const createAnalysis = (
  playerId: string,
  playersById: RotationAnalysisInput['playersById'],
): RotationAnalysis => {
  const playerInfo = playersById[playerId] as { displayName?: string; name?: string } | undefined;
  return {
    playerId,
    playerName: playerInfo?.displayName || playerInfo?.name || `Player ${playerId}`,
    abilities: [],
    averageAPM: null,
    resourceEfficiency: { magicka: emptyResourceMetric(), stamina: emptyResourceMetric() },
    dataState: 'unavailable',
    rotationPattern: [],
    skillPriorities: [],
    spammableSkills: [],
    generalRotation: { commonSequences: [], openerSequence: [], fillerAbilities: [] },
  };
};

const percentage = (current: unknown, maximum: unknown): number | null => {
  if (!isFiniteNumber(current) || !isFiniteNumber(maximum) || current < 0 || maximum <= 0) {
    return null;
  }
  return Math.min(100, (current / maximum) * 100);
};

const resourceMetric = (levels: number[], waste: number): ResourceMetric => {
  if (!levels.length) return emptyResourceMetric();

  const totalLevels = levels.reduce((sum, level) => sum + level, 0);
  const wasteDenominator = waste + totalLevels;
  return {
    averageLevel: totalLevels / levels.length,
    lowestPoint: Math.min(...levels),
    wastePercentage: wasteDenominator > 0 ? (waste / wasteDenominator) * 100 : null,
  };
};

/**
 * Produces only measurements supported by valid fight and event data. Null metrics are
 * intentionally distinct from measured zeroes so consumers never manufacture a score.
 */
export const calculateRotationAnalysis = ({
  fight,
  castEvents,
  resourceEvents,
  playersById,
  abilitiesById,
}: RotationAnalysisInput): RotationAnalysisResult => {
  if (!fight || !isFiniteNumber(fight.startTime) || !isFiniteNumber(fight.endTime)) {
    return {
      state: 'invalid',
      message: 'Rotation analysis is unavailable: invalid fight timing or duration.',
      rotationAnalyses: [],
    };
  }

  const fightDurationMs = fight.endTime - fight.startTime;
  if (fightDurationMs <= 0 || fightDurationMs > MAX_FIGHT_DURATION_MS) {
    return {
      state: 'invalid',
      message: 'Rotation analysis is unavailable: invalid fight timing or duration.',
      rotationAnalyses: [],
    };
  }

  const hasCastStream = Array.isArray(castEvents);
  const hasResourceStream = Array.isArray(resourceEvents);
  if (!hasCastStream && !hasResourceStream) {
    return {
      state: 'unavailable',
      message: 'Rotation analysis is unavailable: event streams have not loaded.',
      rotationAnalyses: [],
    };
  }

  const friendlyPlayerIds = new Set(
    (fight.friendlyPlayers || [])
      .filter((id: number | null): id is number => id !== null && id !== undefined)
      .map((id) => String(id)),
  );
  const analysisMap: Record<string, RotationAnalysis> = {};
  const castEventsByPlayer: Record<string, UnifiedCastEvent[]> = {};
  const resourceDataByPlayer: Record<string, ResourcePlayerData> = {};
  const analysisFor = (playerId: string): RotationAnalysis =>
    (analysisMap[playerId] ||= createAnalysis(playerId, playersById));
  const resourceDataFor = (playerId: string): ResourcePlayerData =>
    (resourceDataByPlayer[playerId] ||= {
      magickaLevels: [],
      staminaLevels: [],
      magickaWaste: 0,
      staminaWaste: 0,
    });

  castEvents?.forEach((castEvent) => {
    if (
      !castEvent.sourceIsFriendly ||
      castEvent.type !== 'cast' ||
      !isFiniteNumber(castEvent.timestamp) ||
      castEvent.sourceID === undefined ||
      castEvent.sourceID === null
    )
      return;
    const playerId = String(castEvent.sourceID);
    if (!friendlyPlayerIds.has(playerId)) return;

    const analysis = analysisFor(playerId);
    (castEventsByPlayer[playerId] ||= []).push(castEvent);
    const abilityId = castEvent.abilityGameID ?? 'unknown';
    const abilityName = abilitiesById[abilityId]?.name || `Ability ${abilityId}`;
    let abilityUsage = analysis.abilities.find((ability) => ability.abilityId === abilityId);
    if (!abilityUsage) {
      abilityUsage = {
        abilityId,
        abilityName,
        useCount: 0,
        averageCastTime: 0,
        resourceCost: 0,
        averageTimeBetweenCasts: 0,
        timestamps: [],
      };
      analysis.abilities.push(abilityUsage);
    }
    abilityUsage.useCount++;
    abilityUsage.timestamps.push(castEvent.timestamp);
    analysis.rotationPattern.push(abilityName);
    if (analysis.rotationPattern.length > 10) analysis.rotationPattern.shift();
  });

  resourceEvents?.forEach((resourceEvent) => {
    if (
      resourceEvent.type !== 'resourcechange' ||
      !isFiniteNumber(resourceEvent.timestamp) ||
      resourceEvent.targetID === undefined ||
      resourceEvent.targetID === null
    )
      return;
    const playerId = String(resourceEvent.targetID);
    if (!friendlyPlayerIds.has(playerId)) return;

    analysisFor(playerId);
    const data = resourceDataFor(playerId);
    const resources = resourceEvent.targetResources;
    if (!resources) return;

    const magickaLevel = percentage(resources.magicka, resources.maxMagicka);
    const staminaLevel = percentage(resources.stamina, resources.maxStamina);
    if (magickaLevel !== null) data.magickaLevels.push(magickaLevel);
    if (staminaLevel !== null) data.staminaLevels.push(staminaLevel);

    if (!isFiniteNumber(resourceEvent.resourceChange) || resourceEvent.resourceChange <= 0) return;
    if (resourceEvent.resourceChangeType === 0 && magickaLevel === 100) {
      data.magickaWaste += resourceEvent.resourceChange;
    } else if (resourceEvent.resourceChangeType === 6 && staminaLevel === 100) {
      data.staminaWaste += resourceEvent.resourceChange;
    }
  });

  Object.values(analysisMap).forEach((analysis) => {
    const totalCasts = analysis.abilities.reduce((sum, ability) => sum + ability.useCount, 0);
    if (totalCasts > 0) {
      analysis.averageAPM = (totalCasts / (fightDurationMs / 1000)) * 60;
      analysis.skillPriorities = analyzeSkillPriorities(analysis.abilities);
      analysis.spammableSkills = identifySpammableSkills(analysis.abilities);
      analysis.generalRotation = analyzeGeneralRotation(
        analysis.abilities,
        castEventsByPlayer[analysis.playerId] || [],
      );
    }
    analysis.abilities.forEach((ability) => {
      if (ability.timestamps.length > 1) {
        const intervals = ability.timestamps
          .slice(1)
          .map((timestamp, index) => (timestamp - ability.timestamps[index]) / 1000);
        ability.averageTimeBetweenCasts =
          intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      }
    });

    const resourceData = resourceDataByPlayer[analysis.playerId];
    if (resourceData) {
      analysis.resourceEfficiency.magicka = resourceMetric(
        resourceData.magickaLevels,
        resourceData.magickaWaste,
      );
      analysis.resourceEfficiency.stamina = resourceMetric(
        resourceData.staminaLevels,
        resourceData.staminaWaste,
      );
    }
    const hasAnyResourceMetric =
      analysis.resourceEfficiency.magicka.averageLevel !== null ||
      analysis.resourceEfficiency.stamina.averageLevel !== null;
    const hasAllResourceMetrics =
      analysis.resourceEfficiency.magicka.averageLevel !== null &&
      analysis.resourceEfficiency.stamina.averageLevel !== null;
    analysis.dataState =
      analysis.averageAPM !== null && hasAllResourceMetrics
        ? 'ready'
        : analysis.averageAPM !== null || hasAnyResourceMetric
          ? 'partial'
          : 'unavailable';
  });

  const rotationAnalyses = Object.values(analysisMap);
  if (!rotationAnalyses.length) {
    return {
      state: 'unavailable',
      message: 'No valid cast or resource data is available for this fight.',
      rotationAnalyses,
    };
  }
  if (rotationAnalyses.every((analysis) => analysis.dataState === 'unavailable')) {
    return {
      state: 'unavailable',
      message: 'No valid rotation measurements are available for this fight.',
      rotationAnalyses,
    };
  }
  const state: RotationAnalysisDataState =
    !hasCastStream ||
    !hasResourceStream ||
    rotationAnalyses.some((analysis) => analysis.dataState !== 'ready')
      ? 'partial'
      : 'ready';
  const message =
    state === 'partial'
      ? 'Rotation analysis is partial. Unavailable measurements are not scored.'
      : 'Rotation analysis is based on available cast and resource events.';
  return { state, message, rotationAnalyses };
};

export const RotationAnalysisPanel: React.FC<RotationAnalysisPanelProps> = ({ fight }) => {
  const { castEvents, castEventsError, castEventsStatus } = useCastEvents();
  const { resourceEvents } = useResourceEvents();
  const context = useResolvedReportFightContext();
  const resourceEventsEntry = useSelector((state: RootState) =>
    selectResourceEventsEntryForContext(state, context),
  );
  const playersArray = useSelector(selectEventPlayers);
  const masterData = useSelector(selectCombinedMasterData);

  const playersById = React.useMemo(() => {
    const result: Record<string, ReportActorFragment> = {};
    playersArray.forEach((player) => {
      if (player && player.id !== undefined && player.id !== null)
        result[String(player.id)] = player;
    });
    return result;
  }, [playersArray]);

  const rotationResult = React.useMemo(
    () =>
      calculateRotationAnalysis({
        fight,
        castEvents,
        resourceEvents,
        playersById,
        abilitiesById: masterData.abilitiesById,
      }),
    [fight, castEvents, resourceEvents, masterData.abilitiesById, playersById],
  );

  const sourcePanelState = resolveRotationAnalysisPanelState({
    castEventsError,
    castEventsStatus,
    hasData: rotationResult.rotationAnalyses.length > 0,
    resourceEventsError: resourceEventsEntry?.error ?? null,
    resourceEventsStatus: resourceEventsEntry?.status ?? 'idle',
  });
  const panelState: AnalyzerPanelStateKind =
    sourcePanelState === 'ready' || sourcePanelState === 'empty'
      ? rotationResult.state === 'invalid'
        ? 'failed'
        : rotationResult.state === 'unavailable'
          ? 'empty'
          : rotationResult.state === 'partial'
            ? 'partial'
            : sourcePanelState
      : sourcePanelState;
  const sourceError = castEventsError ?? resourceEventsEntry?.error ?? undefined;
  const detail = sourceError ?? (panelState === 'ready' ? undefined : rotationResult.message);

  return (
    <AnalyzerPanelState
      title="Rotation analysis"
      state={panelState}
      detail={detail}
      loadingFallback={getSkeletonForTab(TabId.ROTATION_ANALYSIS, false, false)}
      emptyFallback={<RotationAnalysisPanelView rotationAnalyses={[]} fight={fight} />}
    >
      {rotationResult.rotationAnalyses.length > 0 && (
        <RotationAnalysisPanelView
          rotationAnalyses={rotationResult.rotationAnalyses}
          dataState={rotationResult.state}
          dataMessage={rotationResult.message}
          fight={fight}
        />
      )}
    </AnalyzerPanelState>
  );
};
