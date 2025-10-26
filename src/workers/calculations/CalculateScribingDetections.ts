import type {
  CombatEventData,
  ComputeScribingDetectionsForFightOptions,
  PlayerAbilityList,
  ScribingDetectionsMap,
} from '@/features/scribing/analysis/scribingDetectionAnalysis';
import { computeScribingDetectionsForFight } from '@/features/scribing/analysis/scribingDetectionAnalysis';

import type { DetectionLogger } from '@/features/scribing/analysis/scribingDetectionAnalysis';
import type { OnProgressCallback } from '../Utils';

export interface ScribingDetectionsTaskInput {
  fightId: number;
  combatEvents: CombatEventData;
  playerAbilities: PlayerAbilityList[];
  logger?: DetectionLogger;
}

export function calculateScribingDetections(
  data: ScribingDetectionsTaskInput,
  onProgress?: OnProgressCallback,
): ScribingDetectionsMap {
  const options: ComputeScribingDetectionsForFightOptions = {
    ...data,
    onProgress: (progress) => {
      onProgress?.(progress);
    },
  };

  return computeScribingDetectionsForFight(options);
}
