/**
 * Base calculation types and interfaces
 * Common structures for time-series calculations and data processing
 */

/**
 * Base data point interface for time-series calculations
 * Used by penetration, damage reduction, and other calculation workers
 */
export interface BaseDataPoint {
  timestamp: number;
  value: number;
  sources: string[];
}

/**
 * Base calculation task interface
 * Common structure for worker calculation tasks
 */
export interface BaseCalculationTask<TData = unknown> {
  data: TData;
  options?: Record<string, unknown>;
}

/**
 * Base calculation result interface
 * Common structure for worker calculation results
 */
export interface BaseCalculationResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  processingTimeMs?: number;
}
