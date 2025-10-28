import { computeScribingDetectionsForFight } from '@/features/scribing/analysis/scribingDetectionAnalysis';
import type {
  CombatEventData,
  ComputeScribingDetectionsForFightOptions,
  PlayerAbilityList,
  ScribingDetectionsMap,
 DetectionLogger } from '@/features/scribing/analysis/scribingDetectionAnalysis';


import type { OnProgressCallback, OnLogCallback } from '../Utils';

export interface ScribingDetectionsTaskInput {
  fightId: number;
  combatEvents: CombatEventData;
  playerAbilities: PlayerAbilityList[];
  logger?: DetectionLogger;
  onLog?: OnLogCallback;
}

export function calculateScribingDetections(
  data: ScribingDetectionsTaskInput,
  onProgress?: OnProgressCallback,
): ScribingDetectionsMap {
  // Create a logger that uses the onLog callback if provided
  const logger: DetectionLogger | undefined = data.onLog
    ? {
        debug: (message: string, logData?: unknown) => {
          data.onLog?.({ level: 'debug', message, data: logData, timestamp: Date.now() });
        },
        info: (message: string, logData?: unknown) => {
          data.onLog?.({ level: 'info', message, data: logData, timestamp: Date.now() });
        },
        warn: (message: string, logData?: unknown) => {
          data.onLog?.({ level: 'warn', message, data: logData, timestamp: Date.now() });
        },
        error: (message: string, logData?: unknown) => {
          data.onLog?.({ level: 'error', message, data: logData, timestamp: Date.now() });
        },
      }
    : data.logger;

  const options: ComputeScribingDetectionsForFightOptions = {
    ...data,
    logger,
    onProgress: (progress) => {
      onProgress?.(progress);
    },
  };

  return computeScribingDetectionsForFight(options);
}
