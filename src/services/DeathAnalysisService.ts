import {
  AOE_ABILITY_IDS,
  STATUS_EFFECT_ABILITY_IDS,
} from '../features/report_details/insights/damageTypeCategorization';
import { ReportActorFragment, ReportAbilityFragment } from '../graphql/gql/graphql';
import { DamageTypeFlags } from '../types/abilities';
import { DamageEvent, DeathEvent } from '../types/combatlogEvents';
import {
  ReportDeathAnalysis,
  PlayerDeathAnalysis,
  MechanicDeathAnalysis,
  FightDeathAnalysis,
  CauseOfDeath,
  MechanicCategory,
  DeathPattern,
  DeathPatternType,
  MechanicDeathCount,
  FightPlayerDeaths,
} from '../types/reportSummaryTypes';
import { Logger } from '../utils/logger';

const logger = new Logger({ contextPrefix: 'DeathAnalysis' });

export interface DeathAnalysisInput {
  deathEvents: DeathEvent[];
  /** Damage events for the same fight, used to join each death to its lethal hit. */
  damageEvents: DamageEvent[];
  /** Resurrection casts for the fight (target = revived player), for time-alive math. */
  resurrectEvents: { targetID: number; timestamp: number }[];
  fightId: number;
  fightName: string;
  fightStartTime: number;
  fightEndTime: number;
  actors: Record<string, ReportActorFragment>;
  abilities: Record<string, ReportAbilityFragment>;
  /** Authoritative kill flag for the fight (ESO Logs `fight.kill`); null/undefined when unknown. */
  kill?: boolean | null;
  /** Whether this fight is a boss encounter (ESO Logs `encounterID` != 0). */
  isBoss?: boolean;
}

export interface DeathCause {
  abilityId: number;
  abilityName: string;
  sourceId: number;
  sourceName: string;
  sourceIsFriendly: boolean;
  timestamp: number;
  damage: number;
}

/**
 * Enhanced Death Analysis Service
 *
 * Analyzes death events to extract meaningful information about:
 * - What abilities caused deaths
 * - Which actors/players caused deaths
 * - Death patterns and trends
 * - Per-fight and per-player breakdowns
 */
export class DeathAnalysisService {
  /**
   * Analyze death events for a complete report summary
   */
  static analyzeReportDeaths(fightDeathData: DeathAnalysisInput[]): ReportDeathAnalysis {
    logger.info('Starting comprehensive death analysis');

    // Collect all death events across fights (filter to player deaths only)
    const allDeathEvents: DeathEvent[] = [];
    const fightAnalyses: FightDeathAnalysis[] = [];
    // Per-death true killing-blow hit size, joined from the fight's damage stream.
    const killingBlowByDeath = new Map<string, number>();

    // Analyze each fight individually first
    for (const fightData of fightDeathData) {
      const fightAnalysis = this.analyzeFightDeaths(fightData);
      fightAnalyses.push(fightAnalysis);
      // Only collect player deaths (targetIsFriendly === true)
      const playerDeaths = fightData.deathEvents.filter((d) => d.targetIsFriendly);
      allDeathEvents.push(...playerDeaths);

      // Join each death to its lethal hit (skip the sort when nothing died).
      if (playerDeaths.length > 0) {
        const sortedDamage = [...(fightData.damageEvents ?? [])].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        for (const death of playerDeaths) {
          killingBlowByDeath.set(
            this.deathKey(death),
            this.computeKillingBlowHitSize(sortedDamage, death),
          );
        }
      }
    }

    // Get combined actors and abilities data
    const combinedActors = fightDeathData.reduce((acc, fight) => ({ ...acc, ...fight.actors }), {});
    const combinedAbilities = fightDeathData.reduce(
      (acc, fight) => ({ ...acc, ...fight.abilities }),
      {},
    );

    // Analyze deaths across all fights
    const playerAnalyses = this.analyzePlayerDeaths(
      allDeathEvents,
      fightAnalyses,
      combinedActors,
      combinedAbilities,
      fightDeathData,
    );
    const mechanicAnalyses = this.analyzeMechanicDeaths(
      allDeathEvents,
      combinedActors,
      combinedAbilities,
      killingBlowByDeath,
    );
    const deathPatterns = this.identifyDeathPatterns(
      allDeathEvents,
      playerAnalyses,
      mechanicAnalyses,
    );

    const totalDeaths = allDeathEvents.length;

    logger.info('Death analysis complete', {
      totalDeaths,
      playersAnalyzed: playerAnalyses.length,
      mechanicsIdentified: mechanicAnalyses.length,
      patternsFound: deathPatterns.length,
    });

    return {
      totalDeaths,
      playerDeaths: playerAnalyses,
      mechanicDeaths: mechanicAnalyses,
      fightDeaths: fightAnalyses,
      deathPatterns,
    };
  }

  /**
   * Analyze deaths within a single fight
   */
  static analyzeFightDeaths(fightData: DeathAnalysisInput): FightDeathAnalysis {
    const { deathEvents, fightId, fightName, fightStartTime, fightEndTime, kill } = fightData;
    const isBoss = fightData.isBoss ?? true;

    // Filter to only player deaths (targetIsFriendly === true)
    const playerDeaths = deathEvents.filter((death) => death.targetIsFriendly);

    if (playerDeaths.length === 0) {
      return {
        fightId,
        fightName,
        totalDeaths: 0,
        deathRate: 0,
        success: kill ?? true, // No deaths: trust the kill flag, else assume success
        isBoss,
        mechanicBreakdown: [],
      };
    }

    // Calculate death rate (deaths per minute) - only counting player deaths.
    // Guard against a zero-duration fight: dividing by 0 yields Infinity, which
    // forces success=false (Infinity < 2.0) and renders as 'Infinity'/NaN.
    const durationMinutes = (fightEndTime - fightStartTime) / (1000 * 60);
    const deathRate = durationMinutes > 0 ? playerDeaths.length / durationMinutes : 0;

    // Group deaths by ability/mechanic, filtering out friendly sources
    const mechanicCounts = new Map<number, MechanicDeathCount>();

    for (const death of playerDeaths) {
      // Skip deaths caused by friendly sources (player abilities)
      if (death.sourceIsFriendly) {
        continue;
      }

      const abilityId = death.abilityGameID;
      const abilityName = fightData.abilities[abilityId]?.name || `Unknown Ability (${abilityId})`;

      if (mechanicCounts.has(abilityId)) {
        mechanicCounts.get(abilityId)!.deathCount++;
      } else {
        mechanicCounts.set(abilityId, {
          mechanicId: abilityId,
          mechanicName: abilityName,
          deathCount: 1,
        });
      }
    }

    // Convert to array and sort by death count
    const mechanicBreakdown = Array.from(mechanicCounts.values()).sort(
      (a, b) => b.deathCount - a.deathCount,
    );

    // Prefer the authoritative kill flag; fall back to a death-rate heuristic only
    // when the outcome is unknown (e.g. legacy logs, or trash without a kill flag).
    const success = kill != null ? kill : deathRate < 2.0;

    return {
      fightId,
      fightName,
      totalDeaths: playerDeaths.length,
      deathRate,
      success,
      isBoss,
      mechanicBreakdown,
    };
  }

  /**
   * Analyze deaths by player across all fights
   */
  static analyzePlayerDeaths(
    deathEvents: DeathEvent[],
    fightAnalyses: FightDeathAnalysis[],
    actors: Record<string, ReportActorFragment>,
    abilities: Record<string, ReportAbilityFragment>,
    fightDeathData: DeathAnalysisInput[],
  ): PlayerDeathAnalysis[] {
    const playerDeathMap = new Map<
      number,
      {
        deaths: DeathEvent[];
        fightDeaths: Map<number, DeathEvent[]>;
      }
    >();

    // Group deaths by player
    for (const death of deathEvents) {
      const targetId = death.targetID;

      if (!playerDeathMap.has(targetId)) {
        playerDeathMap.set(targetId, {
          deaths: [],
          fightDeaths: new Map(),
        });
      }

      const playerData = playerDeathMap.get(targetId)!;
      playerData.deaths.push(death);

      // Group by fight
      const fightId = death.fight;
      if (!playerData.fightDeaths.has(fightId)) {
        playerData.fightDeaths.set(fightId, []);
      }
      playerData.fightDeaths.get(fightId)!.push(death);
    }

    const analyses: PlayerDeathAnalysis[] = [];

    for (const [targetId, playerData] of playerDeathMap) {
      const actor = actors[targetId];

      // Only analyze actual players, not NPCs or pets
      if (!actor || actor.type?.toLowerCase() !== 'player') {
        continue;
      }

      const playerName = actor?.name || `Player ${targetId}`;

      // Calculate causes of death, filtering out friendly sources (player abilities)
      const causeCounts = new Map<number, number>();
      for (const death of playerData.deaths) {
        // Skip deaths caused by friendly sources (player abilities)
        if (death.sourceIsFriendly) {
          continue;
        }

        const abilityId = death.abilityGameID;
        causeCounts.set(abilityId, (causeCounts.get(abilityId) || 0) + 1);
      }

      // Divide by the hostile-death population (the same set the numerator
      // counts), not total deaths — otherwise self/ally-caused deaths inflate
      // the denominator and the percentages don't sum to 100%.
      const hostileDeathCount = Array.from(causeCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      );
      const topCausesOfDeath: CauseOfDeath[] = Array.from(causeCounts.entries())
        .map(([abilityId, count]) => ({
          abilityId,
          abilityName: abilities[abilityId]?.name || `Unknown (${abilityId})`,
          deathCount: count,
          percentage: hostileDeathCount > 0 ? (count / hostileDeathCount) * 100 : 0,
        }))
        .sort((a, b) => b.deathCount - a.deathCount);

      // Calculate fight-specific deaths
      const fightDeaths: FightPlayerDeaths[] = [];
      for (const [fightId, deaths] of playerData.fightDeaths) {
        const fightAnalysis = fightAnalyses.find((f) => f.fightId === fightId);
        const fightName = fightAnalysis?.fightName || `Fight ${fightId}`;

        // Fight bounds for the alive-interval math.
        const fightData = fightDeathData.find((f) => f.fightId === fightId);
        const fightStartTime = fightData?.fightStartTime || 0;
        const fightEndTime = fightData?.fightEndTime ?? fightStartTime;

        const deathTimes = deaths.map((d) => d.timestamp).sort((a, b) => a - b);

        // Time alive is from fight start to first death.
        const timeAlive = Math.max(0, deathTimes[0] - fightStartTime);

        // True time alive sums every alive interval, resuming at each resurrection.
        const rezTimes = (fightData?.resurrectEvents ?? [])
          .filter((r) => r.targetID === targetId)
          .map((r) => r.timestamp)
          .sort((a, b) => a - b);
        const timeAliveTotal = this.computeTimeAliveTotal(
          fightStartTime,
          fightEndTime,
          deathTimes,
          rezTimes,
        );

        fightDeaths.push({
          fightId,
          fightName,
          deathCount: deaths.length,
          timeAlive,
          timeAliveTotal,
          deathTimestamps: deaths.map((d) => d.timestamp),
        });
      }

      // Averages across the fights this player died in.
      const averageTimeAlive =
        fightDeaths.length > 0
          ? fightDeaths.reduce((sum, fight) => sum + fight.timeAlive, 0) / fightDeaths.length
          : 0;
      const averageTimeAliveTotal =
        fightDeaths.length > 0
          ? fightDeaths.reduce((sum, fight) => sum + fight.timeAliveTotal, 0) / fightDeaths.length
          : 0;

      analyses.push({
        playerId: targetId.toString(),
        playerName,
        role: this.guessPlayerRole(actor, playerData.deaths), // Simple role guessing
        totalDeaths: playerData.deaths.length,
        averageTimeAlive,
        averageTimeAliveTotal,
        fightDeaths,
        topCausesOfDeath,
      });
    }

    return analyses.sort((a, b) => b.totalDeaths - a.totalDeaths);
  }

  /**
   * Total time a player was alive in a fight: sum the intervals from fight start
   * (and from each resurrection) to the next death or to fight end. `deathTimes`
   * and `rezTimes` must be sorted ascending.
   */
  private static computeTimeAliveTotal(
    fightStartTime: number,
    fightEndTime: number,
    deathTimes: number[],
    rezTimes: number[],
  ): number {
    let total = 0;
    let aliveStart: number | null = fightStartTime;
    for (const deathTs of deathTimes) {
      if (aliveStart === null || deathTs < aliveStart) continue;
      total += deathTs - aliveStart;
      // Resume the next alive interval at the first resurrection after this death.
      const rez = rezTimes.find((r) => r > deathTs);
      aliveStart = rez ?? null;
    }
    // Survived to fight end after the last revive (no trailing death).
    if (aliveStart !== null) total += Math.max(0, fightEndTime - aliveStart);
    return total;
  }

  /** Stable identity for a death event (one per victim per timestamp per fight). */
  private static deathKey(death: DeathEvent): string {
    return `${death.fight}:${death.targetID}:${death.timestamp}`;
  }

  /**
   * True killing-blow hit size for a death: the most-recent damage dealt to the
   * victim within the second before death, summed with any simultaneous (<=50ms)
   * hits. Mirrors the per-death join used by the per-fight Death panel. Returns 0
   * when no matching damage was loaded.
   */
  private static computeKillingBlowHitSize(sortedDamage: DamageEvent[], death: DeathEvent): number {
    const TIME_WINDOW_MS = 1000;
    const SIMULTANEOUS_MS = 50;
    const deathTs = death.timestamp;

    // Binary-search the first index with timestamp >= deathTs - window.
    let lo = 0;
    let hi = sortedDamage.length - 1;
    const lowerTarget = deathTs - TIME_WINDOW_MS;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sortedDamage[mid].timestamp >= lowerTarget) hi = mid - 1;
      else lo = mid + 1;
    }

    const recent: DamageEvent[] = [];
    for (let i = lo; i < sortedDamage.length; i++) {
      const ev = sortedDamage[i];
      if (ev.timestamp > deathTs) break;
      if (ev.targetID === death.targetID && (ev.amount || 0) > 0) recent.push(ev);
    }
    if (recent.length === 0) return 0;

    // Most-recent hit plus everything within the simultaneous window of it.
    const latestTs = recent[recent.length - 1].timestamp;
    return recent
      .filter((ev) => latestTs - ev.timestamp <= SIMULTANEOUS_MS)
      .reduce((sum, ev) => sum + (ev.amount || 0), 0);
  }

  /**
   * Analyze deaths by ability/mechanic
   */
  static analyzeMechanicDeaths(
    deathEvents: DeathEvent[],
    actors: Record<string, ReportActorFragment>,
    abilities: Record<string, ReportAbilityFragment>,
    killingBlowByDeath: Map<string, number> = new Map(),
  ): MechanicDeathAnalysis[] {
    const mechanicMap = new Map<
      number,
      {
        deaths: DeathEvent[];
        playersAffected: Set<number>;
        fightsAffected: Set<number>;
      }
    >();

    // Group deaths by ability, filtering out friendly sources (player-cast abilities)
    // Note: deathEvents should already be filtered to player deaths only at this point
    for (const death of deathEvents) {
      // Skip deaths caused by friendly sources (player abilities)
      // We only want to show enemy/hostile abilities that killed players
      if (death.sourceIsFriendly) {
        continue;
      }

      const abilityId = death.abilityGameID;

      if (!mechanicMap.has(abilityId)) {
        mechanicMap.set(abilityId, {
          deaths: [],
          playersAffected: new Set(),
          fightsAffected: new Set(),
        });
      }

      const mechanicData = mechanicMap.get(abilityId)!;
      mechanicData.deaths.push(death);
      mechanicData.playersAffected.add(death.targetID);
      mechanicData.fightsAffected.add(death.fight);
    }

    // Match the population the loop above actually counts (it skips
    // friendly-source deaths), so mechanic percentages are coherent.
    const totalDeaths = deathEvents.filter((death) => !death.sourceIsFriendly).length;
    const analyses: MechanicDeathAnalysis[] = [];

    for (const [abilityId, mechanicData] of mechanicMap) {
      const ability = abilities[abilityId];
      const mechanicName = ability?.name || `Unknown Ability (${abilityId})`;

      // Calculate average killing blow damage
      const averageKillingBlowDamage =
        mechanicData.deaths.length > 0
          ? mechanicData.deaths.reduce((sum, death) => sum + (death.amount || 0), 0) /
            mechanicData.deaths.length
          : 0;

      // True killing-blow hit size, averaged from the per-death damage-event join.
      const averageKillingBlowHitSize =
        mechanicData.deaths.length > 0
          ? mechanicData.deaths.reduce(
              (sum, death) => sum + (killingBlowByDeath.get(this.deathKey(death)) ?? 0),
              0,
            ) / mechanicData.deaths.length
          : 0;

      // Get affected player names
      const playersAffected = Array.from(mechanicData.playersAffected)
        .map((playerId) => actors[playerId]?.name || `Player ${playerId}`)
        .sort();

      const fightsWithDeaths = Array.from(mechanicData.fightsAffected).sort();

      analyses.push({
        mechanicId: abilityId,
        mechanicName,
        totalDeaths: mechanicData.deaths.length,
        percentage: (mechanicData.deaths.length / totalDeaths) * 100,
        playersAffected,
        fightsWithDeaths,
        averageKillingBlowDamage,
        averageKillingBlowHitSize,
        category: this.categorizeAbility(ability, mechanicData.deaths),
      });
    }

    return analyses.sort((a, b) => b.totalDeaths - a.totalDeaths);
  }

  /**
   * Identify death patterns and trends
   */
  static identifyDeathPatterns(
    deathEvents: DeathEvent[],
    playerAnalyses: PlayerDeathAnalysis[],
    mechanicAnalyses: MechanicDeathAnalysis[],
  ): DeathPattern[] {
    const patterns: DeathPattern[] = [];

    // Pattern 1: Recurring mechanics
    const recurringMechanics = mechanicAnalyses.filter(
      (m) => m.totalDeaths >= 2 && (m.playersAffected.length > 1 || m.fightsWithDeaths.length > 1),
    );

    for (const mechanic of recurringMechanics) {
      patterns.push({
        type: DeathPatternType.RECURRING_MECHANIC,
        description: `"${mechanic.mechanicName}" occurred ${mechanic.totalDeaths} times across ${mechanic.fightsWithDeaths.length} fight(s), affecting ${mechanic.playersAffected.length} player(s).`,
        severity: 'Medium',
        affectedPlayers: mechanic.playersAffected.slice(0, 5),
        suggestion: `${mechanic.mechanicName} accounted for ${mechanic.percentage.toFixed(1)}% of total deaths.`,
        evidence: {
          occurrenceCount: mechanic.totalDeaths,
          affectedFights: mechanic.fightsWithDeaths,
          mechanicIds: [mechanic.mechanicId],
          context: `Recurring mechanic across multiple encounters`,
        },
      });
    }

    // Pattern 2: High-damage abilities
    const highDamageMechanics = mechanicAnalyses.filter((m) => m.averageKillingBlowDamage > 50000);

    if (highDamageMechanics.length > 0) {
      patterns.push({
        type: DeathPatternType.HIGH_DAMAGE_ABILITY,
        description: `High-damage abilities detected: ${highDamageMechanics.map((m) => m.mechanicName).join(', ')}.`,
        severity: 'Medium',
        affectedPlayers: [],
        suggestion: `Average damage: ${Math.round(highDamageMechanics[0]?.averageKillingBlowDamage || 0)} per killing blow.`,
        evidence: {
          occurrenceCount: highDamageMechanics.reduce((sum, m) => sum + m.totalDeaths, 0),
          affectedFights: Array.from(
            new Set(highDamageMechanics.flatMap((m) => m.fightsWithDeaths)),
          ),
          mechanicIds: highDamageMechanics.map((m) => m.mechanicId),
          context: `High-damage mechanics present`,
        },
      });
    }

    // Pattern 3: Multi-death encounters
    const multiDeathFights = playerAnalyses.filter((p) => p.totalDeaths >= 2);
    if (multiDeathFights.length > 0) {
      patterns.push({
        type: DeathPatternType.MULTI_DEATH_ENCOUNTER,
        description: `${multiDeathFights.length} player(s) died multiple times during the encounter.`,
        severity: 'Low',
        affectedPlayers: multiDeathFights.map((p) => p.playerName),
        suggestion: `Total deaths: ${multiDeathFights.reduce((sum, p) => sum + p.totalDeaths, 0)} across affected players.`,
        evidence: {
          occurrenceCount: multiDeathFights.reduce((sum, p) => sum + p.totalDeaths, 0),
          affectedFights: [],
          mechanicIds: [],
          context: `Multiple deaths per player observed`,
        },
      });
    }

    return patterns;
  }

  /**
   * Simple role guessing based on actor info and death patterns
   */
  private static guessPlayerRole(
    actor: ReportActorFragment | undefined,
    _deaths: DeathEvent[],
  ): string | undefined {
    // Role is not derivable from death events alone (it needs cast/buff/debuff
    // signals — see features/role_detection). Return undefined rather than guess.
    if (!actor) return undefined;
    return undefined;
  }

  /**
   * Categorize abilities based on their characteristics
   */
  private static categorizeAbility(
    ability: ReportAbilityFragment | undefined,
    deaths: DeathEvent[],
  ): MechanicCategory {
    if (!ability) return MechanicCategory.OTHER;

    // Categorize by stable game data (ability id + damage-type bitmask) rather
    // than English name substrings, which mislabel abilities and break on
    // localized clients.
    const abilityId = deaths[0]?.abilityGameID;
    if (abilityId != null && AOE_ABILITY_IDS.has(abilityId)) {
      return MechanicCategory.AREA_EFFECT;
    }
    if (abilityId != null && STATUS_EFFECT_ABILITY_IDS.has(abilityId)) {
      return MechanicCategory.DAMAGE_OVER_TIME;
    }

    const typeNum = ability.type != null ? Number(ability.type) : 0;
    const hasFlag = (flag: DamageTypeFlags): boolean => {
      const f = Number(flag);
      return (typeNum & f) === f;
    };

    // Bleed / Poison / Disease read as damage-over-time mechanics.
    if (
      hasFlag(DamageTypeFlags.BLEED) ||
      hasFlag(DamageTypeFlags.POISON) ||
      hasFlag(DamageTypeFlags.DISEASE)
    ) {
      return MechanicCategory.DAMAGE_OVER_TIME;
    }

    return typeNum !== 0 ? MechanicCategory.DIRECT_DAMAGE : MechanicCategory.OTHER;
  }
}
