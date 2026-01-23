/**
 * Data structures for Report Summary Page
 *
 * This file defines TypeScript interfaces for aggregated report data
 * that will be used across all fights in a report.
 */

import { FightFragment, ReportActorFragment } from '../graphql/gql/graphql';

import { DamageEvent, DeathEvent, HealEvent } from './combatlogEvents';

// ============================================================================
// DAMAGE BREAKDOWN TYPES
// ============================================================================

export interface ReportDamageBreakdown {
  /** Total damage across all fights */
  totalDamage: number;
  /** Damage per second across all fights */
  dps: number;
  /** Breakdown by player */
  playerBreakdown: PlayerDamageBreakdown[];
  /** Breakdown by ability type */
  abilityTypeBreakdown: AbilityTypeDamageBreakdown[];
  /** Breakdown by target */
  targetBreakdown: TargetDamageBreakdown[];
}

export interface PlayerDamageBreakdown {
  /** Player ID */
  playerId: string;
  /** Player name */
  playerName: string;
  /** Player role (Tank, Healer, DPS) */
  role?: string;
  /** Total damage by this player */
  totalDamage: number;
  /** DPS by this player */
  dps: number;
  /** Percentage of total report damage */
  damagePercentage: number;
  /** Per-fight breakdown */
  fightBreakdown: FightDamageBreakdown[];
}

export interface FightDamageBreakdown {
  /** Fight ID */
  fightId: number;
  /** Fight name */
  fightName: string;
  /** Damage in this fight */
  damage: number;
  /** DPS in this fight */
  dps: number;
  /** Fight duration in milliseconds */
  duration: number;
}

export interface AbilityTypeDamageBreakdown {
  /** Ability type (Direct, DOT, etc.) */
  abilityType: string;
  /** Total damage of this type */
  totalDamage: number;
  /** Percentage of total damage */
  percentage: number;
  /** Number of hits */
  hitCount: number;
}

export interface TargetDamageBreakdown {
  /** Target ID */
  targetId: string;
  /** Target name */
  targetName: string;
  /** Total damage to this target */
  totalDamage: number;
  /** Percentage of total damage */
  percentage: number;
}

// ============================================================================
// DEATH ANALYSIS TYPES
// ============================================================================

export interface ReportDeathAnalysis {
  /** Total deaths across all fights */
  totalDeaths: number;
  /** Deaths per player */
  playerDeaths: PlayerDeathAnalysis[];
  /** Deaths by mechanic/ability */
  mechanicDeaths: MechanicDeathAnalysis[];
  /** Deaths by fight */
  fightDeaths: FightDeathAnalysis[];
  /** Death patterns and insights */
  deathPatterns: DeathPattern[];
}

export interface PlayerDeathAnalysis {
  /** Player ID */
  playerId: string;
  /** Player name */
  playerName: string;
  /** Player role */
  role?: string;
  /** Total deaths */
  totalDeaths: number;
  /** Average time alive per fight (in seconds) */
  averageTimeAlive: number;
  /** Deaths per fight breakdown */
  fightDeaths: FightPlayerDeaths[];
  /** Top causes of death */
  topCausesOfDeath: CauseOfDeath[];
}

export interface FightPlayerDeaths {
  /** Fight ID */
  fightId: number;
  /** Fight name */
  fightName: string;
  /** Number of deaths in this fight */
  deathCount: number;
  /** Time alive in this fight (seconds) */
  timeAlive: number;
  /** Death timestamps */
  deathTimestamps: number[];
}

export interface CauseOfDeath {
  /** Ability that caused death */
  abilityId: number;
  /** Ability name */
  abilityName: string;
  /** Number of deaths from this ability */
  deathCount: number;
  /** Percentage of player's total deaths */
  percentage: number;
}

export interface MechanicDeathAnalysis {
  /** Mechanic/ability ID */
  mechanicId: number;
  /** Mechanic/ability name */
  mechanicName: string;
  /** Total deaths from this mechanic */
  totalDeaths: number;
  /** Percentage of all deaths */
  percentage: number;
  /** Players affected */
  playersAffected: string[];
  /** Fights where this mechanic caused deaths */
  fightsWithDeaths: number[];
  /** Average damage of killing blow */
  averageKillingBlowDamage: number;
  /** Mechanic category (avoidable, unavoidable, etc.) */
  category: MechanicCategory;
}

export interface FightDeathAnalysis {
  /** Fight ID */
  fightId: number;
  /** Fight name */
  fightName: string;
  /** Total deaths in this fight */
  totalDeaths: number;
  /** Death rate (deaths per minute) */
  deathRate: number;
  /** Fight success (true if kill, false if wipe) */
  success: boolean;
  /** Deaths by mechanic in this fight */
  mechanicBreakdown: MechanicDeathCount[];
}

export interface MechanicDeathCount {
  /** Mechanic ID */
  mechanicId: number;
  /** Mechanic name */
  mechanicName: string;
  /** Death count */
  deathCount: number;
}

export interface DeathPattern {
  /** Pattern type */
  type: DeathPatternType;
  /** Pattern description */
  description: string;
  /** Severity (High, Medium, Low) */
  severity: 'High' | 'Medium' | 'Low';
  /** Affected players */
  affectedPlayers: string[];
  /** Suggested improvement */
  suggestion: string;
  /** Supporting data */
  evidence: PatternEvidence;
}

export interface PatternEvidence {
  /** Number of occurrences */
  occurrenceCount: number;
  /** Fights where pattern was observed */
  affectedFights: number[];
  /** Related mechanic IDs */
  mechanicIds: number[];
  /** Additional context */
  context?: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum MechanicCategory {
  DIRECT_DAMAGE = 'Direct Damage',
  BURST_DAMAGE = 'Burst Damage',
  EXECUTE_PHASE = 'Execute Phase',
  AREA_EFFECT = 'Area Effect',
  DAMAGE_OVER_TIME = 'Damage Over Time',
  ENVIRONMENTAL = 'Environmental',
  PLAYER_ABILITY = 'Player Ability',
  OTHER = 'Other',
}

export enum DeathPatternType {
  RECURRING_MECHANIC = 'Recurring Mechanic',
  HIGH_DAMAGE_ABILITY = 'High Damage Ability',
  MULTI_DEATH_ENCOUNTER = 'Multi-Death Encounter',
  RESOURCE_DEPLETION = 'Resource Depletion',
  COORDINATION_FAILURE = 'Coordination Failure',
  PROGRESSIVE_DIFFICULTY = 'Progressive Difficulty',
  ROLE_SPECIFIC_PATTERN = 'Role-Specific Pattern',
}

// ============================================================================
// AGGREGATED REPORT DATA
// ============================================================================

export interface ReportSummaryData {
  /** Report metadata */
  reportInfo: ReportInfo;
  /** All fights in the report */
  fights: FightFragment[];
  /** Damage breakdown analysis */
  damageBreakdown: ReportDamageBreakdown;
  /** Death analysis */
  deathAnalysis: ReportDeathAnalysis;
  /** Data loading states */
  loadingStates: ReportDataLoadingStates;
  /** Any errors encountered */
  errors: ReportDataErrors;
}

export interface ReportInfo {
  /** Report code */
  reportId: string;
  /** Report title */
  title: string;
  /** Report start time */
  startTime: number;
  /** Report end time */
  endTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Zone name */
  zoneName?: string;
  /** Report owner */
  ownerName?: string;
}

export interface ReportDataLoadingStates {
  /** Overall loading state */
  isLoading: boolean;
  /** Individual fight data loading */
  fightDataLoading: Record<number, boolean>;
  /** Damage events loading */
  damageEventsLoading: boolean;
  /** Death events loading */
  deathEventsLoading: boolean;
  /** Player data loading */
  playerDataLoading: boolean;
  /** Master data loading */
  masterDataLoading: boolean;
}

export interface ReportDataErrors {
  /** General errors */
  generalErrors: string[];
  /** Per-fight errors */
  fightErrors: Record<number, string>;
  /** Data fetching errors */
  fetchErrors: {
    damageEvents?: string;
    deathEvents?: string;
    playerData?: string;
    masterData?: string;
  };
}

// ============================================================================
// DATA FETCHING INTERFACES
// ============================================================================

export interface FetchReportSummaryParams {
  /** Report code */
  reportCode: string;
  /** Optional fight IDs to include (if not provided, all fights) */
  fightIds?: number[];
  /** Whether to include detailed analysis */
  includeDetailedAnalysis?: boolean;
}

export interface AggregatedFightData {
  /** Fight metadata */
  fight: FightFragment;
  /** Damage events for this fight */
  damageEvents: DamageEvent[];
  /** Death events for this fight */
  deathEvents: DeathEvent[];
  /** Healing events for this fight */
  healingEvents: HealEvent[];
  /** Player data for this fight */
  playerData: ReportActorFragment[];
  /** Data loading state */
  isLoading: boolean;
  /** Any errors */
  error?: string;
}
