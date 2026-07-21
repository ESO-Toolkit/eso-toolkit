import {
  computePlayerPanelAnalysis,
  type PlayerPanelAnalysisInput,
  type PlayerPanelAnalysisResult,
} from '@/utils/playerPanelAnalysis';

import type { OnProgressCallback } from '../Utils';

export type { PlayerPanelAnalysisInput, PlayerPanelAnalysisResult };

/**
 * Worker entry for the Players-tab per-player analysis (class detection,
 * bar swaps, max resources, build issues). Thin wrapper — the pure logic in
 * utils/playerPanelAnalysis is shared with the panel's small-fight sync path.
 */
export function calculatePlayerPanelAnalysis(
  data: PlayerPanelAnalysisInput,
  onProgress?: OnProgressCallback,
): PlayerPanelAnalysisResult {
  onProgress?.(0);
  const result = computePlayerPanelAnalysis(data);
  onProgress?.(100);
  return result;
}
