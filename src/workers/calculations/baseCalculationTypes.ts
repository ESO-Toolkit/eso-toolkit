/**
 * Base interfaces for worker calculations to reduce code duplication
 * These provide common patterns used across different calculation workers
 */

import { PlayerDetailsWithRole } from '../../store/player_data/playerDataSlice';
import {
  BaseDataPoint,
  BaseCalculationTask,
  BaseCalculationResult,
} from '../../types/calculations';
import { CombatantInfoEvent } from '../../types/combatlogEvents';
import { BuffLookupData } from '../../utils/BuffLookupUtils';

/**
 * Standard fight context for calculations
 */
export interface CalculationFightContext {
  startTime: number;
  endTime: number;
}

/**
 * Base calculation task with common required data
 */
export interface BaseWorkerCalculationTask<TAdditionalData = Record<string, unknown>>
  extends BaseCalculationTask<TAdditionalData> {
  fight: CalculationFightContext;
  players: Record<number, PlayerDetailsWithRole>;
}

/**
 * Extended calculation task that includes combat info and buff lookups
 */
export interface ExtendedWorkerCalculationTask<TAdditionalData = Record<string, unknown>>
  extends BaseWorkerCalculationTask<TAdditionalData> {
  combatantInfoEvents?: Record<number, CombatantInfoEvent>;
  friendlyBuffsLookup?: BuffLookupData;
  debuffsLookup?: BuffLookupData;
}

/**
 * Base data point for time-series calculations
 */
export interface TimeSeriesDataPoint extends BaseDataPoint {
  relativeTime: number; // Time since fight start in seconds
}

/**
 * Base player data result
 */
export interface BasePlayerData {
  playerId: string | number;
  playerName: string;
  dataPoints: TimeSeriesDataPoint[];
}

/**
 * Base calculation result with player data
 */
export interface BasePlayerCalculationResult<TPlayerData extends BasePlayerData>
  extends BaseCalculationResult<Record<string, TPlayerData>> {
  /** Number of players processed in the calculation */
  playerCount?: number;
}

/**
 * Source information for calculation results
 */
export interface CalculationSource {
  source: string;
  name: string;
  isActive: boolean;
  value: number;
}

/**
 * Result with source tracking
 */
export interface SourceTrackedPlayerData extends BasePlayerData {
  sources: CalculationSource[];
  staticValue?: number;
  dynamicValue?: number;
  maxValue?: number;
  averageValue?: number;
}

/**
 * Generic progress callback type
 */
export type CalculationProgressCallback = (progress: {
  completed: number;
  total: number;
  message?: string;
}) => void;
