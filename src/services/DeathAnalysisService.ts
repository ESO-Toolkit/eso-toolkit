import { ReportActorFragment, ReportAbilityFragment } from '../graphql/generated';
import { DeathEvent } from '../types/combatlogEvents';
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
  FightPlayerDeaths
} from '../types/reportSummaryTypes';

export interface DeathAnalysisInput {
  deathEvents: DeathEvent[];
  fightId: number;
  fightName: string;
  fightStartTime: number;
  fightEndTime: number;
  actors: Record<string, ReportActorFragment>;
  abilities: Record<string, ReportAbilityFragment>;
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
  static analyzeReportDeaths(
    fightDeathData: DeathAnalysisInput[]
  ): ReportDeathAnalysis {
    console.log('🔍 Starting comprehensive death analysis...');
    
    // Collect all death events across fights
    const allDeathEvents: DeathEvent[] = [];
    const fightAnalyses: FightDeathAnalysis[] = [];
    
    // Analyze each fight individually first
    for (const fightData of fightDeathData) {
      const fightAnalysis = this.analyzeFightDeaths(fightData);
      fightAnalyses.push(fightAnalysis);
      allDeathEvents.push(...fightData.deathEvents);
    }
    
    // Get combined actors and abilities data
    const combinedActors = fightDeathData.reduce((acc, fight) => ({ ...acc, ...fight.actors }), {});
    const combinedAbilities = fightDeathData.reduce((acc, fight) => ({ ...acc, ...fight.abilities }), {});
    
    // Analyze deaths across all fights
    const playerAnalyses = this.analyzePlayerDeaths(allDeathEvents, fightAnalyses, combinedActors, combinedAbilities);
    const mechanicAnalyses = this.analyzeMechanicDeaths(allDeathEvents, combinedActors, combinedAbilities);
    const deathPatterns = this.identifyDeathPatterns(allDeathEvents, playerAnalyses, mechanicAnalyses);
    
    const totalDeaths = allDeathEvents.length;
    
    console.log(`📊 Death Analysis Complete:
    - Total Deaths: ${totalDeaths}
    - Players Analyzed: ${playerAnalyses.length}
    - Mechanics Identified: ${mechanicAnalyses.length}
    - Patterns Found: ${deathPatterns.length}`);
    
    return {
      totalDeaths,
      playerDeaths: playerAnalyses,
      mechanicDeaths: mechanicAnalyses,
      fightDeaths: fightAnalyses,
      deathPatterns
    };
  }
  
  /**
   * Analyze deaths within a single fight
   */
  static analyzeFightDeaths(fightData: DeathAnalysisInput): FightDeathAnalysis {
    const { deathEvents, fightId, fightName, fightStartTime, fightEndTime } = fightData;
    
    if (deathEvents.length === 0) {
      return {
        fightId,
        fightName,
        totalDeaths: 0,
        deathRate: 0,
        success: true, // No deaths = success
        mechanicBreakdown: []
      };
    }
    
    // Calculate death rate (deaths per minute)
    const durationMinutes = (fightEndTime - fightStartTime) / (1000 * 60);
    const deathRate = deathEvents.length / durationMinutes;
    
    // Group deaths by ability/mechanic
    const mechanicCounts = new Map<number, MechanicDeathCount>();
    
    for (const death of deathEvents) {
      const abilityId = death.abilityGameID;
      const abilityName = fightData.abilities[abilityId]?.name || `Unknown Ability (${abilityId})`;
      
      if (mechanicCounts.has(abilityId)) {
        mechanicCounts.get(abilityId)!.deathCount++;
      } else {
        mechanicCounts.set(abilityId, {
          mechanicId: abilityId,
          mechanicName: abilityName,
          deathCount: 1
        });
      }
    }
    
    // Convert to array and sort by death count
    const mechanicBreakdown = Array.from(mechanicCounts.values())
      .sort((a, b) => b.deathCount - a.deathCount);
    
    // Determine success (heuristic: fights with high death rates are likely wipes)
    const success = deathRate < 2.0; // Less than 2 deaths per minute = success
    
    return {
      fightId,
      fightName,
      totalDeaths: deathEvents.length,
      deathRate,
      success,
      mechanicBreakdown
    };
  }
  
  /**
   * Analyze deaths by player across all fights
   */
  static analyzePlayerDeaths(
    deathEvents: DeathEvent[],
    fightAnalyses: FightDeathAnalysis[],
    actors: Record<string, ReportActorFragment>,
    abilities: Record<string, ReportAbilityFragment>
  ): PlayerDeathAnalysis[] {
    const playerDeathMap = new Map<number, {
      deaths: DeathEvent[];
      fightDeaths: Map<number, DeathEvent[]>;
    }>();
    
    // Group deaths by player
    for (const death of deathEvents) {
      const targetId = death.targetID;
      
      if (!playerDeathMap.has(targetId)) {
        playerDeathMap.set(targetId, {
          deaths: [],
          fightDeaths: new Map()
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
      const playerName = actor?.name || `Player ${targetId}`;
      
      // Calculate causes of death
      const causeCounts = new Map<number, number>();
      for (const death of playerData.deaths) {
        const abilityId = death.abilityGameID;
        causeCounts.set(abilityId, (causeCounts.get(abilityId) || 0) + 1);
      }
      
      const topCausesOfDeath: CauseOfDeath[] = Array.from(causeCounts.entries())
        .map(([abilityId, count]) => ({
          abilityId,
          abilityName: abilities[abilityId]?.name || `Unknown (${abilityId})`,
          deathCount: count,
          percentage: (count / playerData.deaths.length) * 100
        }))
        .sort((a, b) => b.deathCount - a.deathCount);
      
      // Calculate fight-specific deaths
      const fightDeaths: FightPlayerDeaths[] = [];
      for (const [fightId, deaths] of playerData.fightDeaths) {
        const fightAnalysis = fightAnalyses.find(f => f.fightId === fightId);
        const fightName = fightAnalysis?.fightName || `Fight ${fightId}`;
        
        // Calculate time alive (simplified - assume they lived until first death)
        const firstDeathTime = Math.min(...deaths.map(d => d.timestamp));
        const fightStart = deaths[0]?.timestamp || 0; // Approximate
        const timeAlive = Math.max(0, (firstDeathTime - fightStart) / 1000); // Convert to seconds
        
        fightDeaths.push({
          fightId,
          fightName,
          deathCount: deaths.length,
          timeAlive,
          deathTimestamps: deaths.map(d => d.timestamp)
        });
      }
      
      // Calculate average time alive
      const averageTimeAlive = fightDeaths.length > 0 
        ? fightDeaths.reduce((sum, fight) => sum + fight.timeAlive, 0) / fightDeaths.length
        : 0;
      
      analyses.push({
        playerId: targetId.toString(),
        playerName,
        role: this.guessPlayerRole(actor, playerData.deaths), // Simple role guessing
        totalDeaths: playerData.deaths.length,
        averageTimeAlive,
        fightDeaths,
        topCausesOfDeath
      });
    }
    
    return analyses.sort((a, b) => b.totalDeaths - a.totalDeaths);
  }
  
  /**
   * Analyze deaths by ability/mechanic
   */
  static analyzeMechanicDeaths(
    deathEvents: DeathEvent[],
    actors: Record<string, ReportActorFragment>,
    abilities: Record<string, ReportAbilityFragment>
  ): MechanicDeathAnalysis[] {
    const mechanicMap = new Map<number, {
      deaths: DeathEvent[];
      playersAffected: Set<number>;
      fightsAffected: Set<number>;
    }>();
    
    // Group deaths by ability
    for (const death of deathEvents) {
      const abilityId = death.abilityGameID;
      
      if (!mechanicMap.has(abilityId)) {
        mechanicMap.set(abilityId, {
          deaths: [],
          playersAffected: new Set(),
          fightsAffected: new Set()
        });
      }
      
      const mechanicData = mechanicMap.get(abilityId)!;
      mechanicData.deaths.push(death);
      mechanicData.playersAffected.add(death.targetID);
      mechanicData.fightsAffected.add(death.fight);
    }
    
    const totalDeaths = deathEvents.length;
    const analyses: MechanicDeathAnalysis[] = [];
    
    for (const [abilityId, mechanicData] of mechanicMap) {
      const ability = abilities[abilityId];
      const mechanicName = ability?.name || `Unknown Ability (${abilityId})`;
      
      // Calculate average killing blow damage
      const averageKillingBlowDamage = mechanicData.deaths.length > 0
        ? mechanicData.deaths.reduce((sum, death) => sum + (death.amount || 0), 0) / mechanicData.deaths.length
        : 0;
      
      // Get affected player names
      const playersAffected = Array.from(mechanicData.playersAffected)
        .map(playerId => actors[playerId]?.name || `Player ${playerId}`)
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
        category: this.categorizeAbility(ability, mechanicData.deaths)
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
    mechanicAnalyses: MechanicDeathAnalysis[]
  ): DeathPattern[] {
    const patterns: DeathPattern[] = [];
    
    // Pattern 1: Recurring mechanics
    const recurringMechanics = mechanicAnalyses.filter(m => 
      m.totalDeaths >= 2 && (m.playersAffected.length > 1 || m.fightsWithDeaths.length > 1)
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
          context: `Recurring mechanic across multiple encounters`
        }
      });
    }
    
    // Pattern 2: High-damage abilities
    const highDamageMechanics = mechanicAnalyses.filter(m => 
      m.averageKillingBlowDamage > 50000
    );
    
    if (highDamageMechanics.length > 0) {
      patterns.push({
        type: DeathPatternType.HIGH_DAMAGE_ABILITY,
        description: `High-damage abilities detected: ${highDamageMechanics.map(m => m.mechanicName).join(', ')}.`,
        severity: 'Medium',
        affectedPlayers: [],
        suggestion: `Average damage: ${Math.round(highDamageMechanics[0]?.averageKillingBlowDamage || 0)} per killing blow.`,
        evidence: {
          occurrenceCount: highDamageMechanics.reduce((sum, m) => sum + m.totalDeaths, 0),
          affectedFights: Array.from(new Set(highDamageMechanics.flatMap(m => m.fightsWithDeaths))),
          mechanicIds: highDamageMechanics.map(m => m.mechanicId),
          context: `High-damage mechanics present`
        }
      });
    }
    
    // Pattern 3: Multi-death encounters
    const multiDeathFights = playerAnalyses.filter(p => p.totalDeaths >= 2);
    if (multiDeathFights.length > 0) {
      patterns.push({
        type: DeathPatternType.MULTI_DEATH_ENCOUNTER,
        description: `${multiDeathFights.length} player(s) died multiple times during the encounter.`,
        severity: 'Low',
        affectedPlayers: multiDeathFights.map(p => p.playerName),
        suggestion: `Total deaths: ${multiDeathFights.reduce((sum, p) => sum + p.totalDeaths, 0)} across affected players.`,
        evidence: {
          occurrenceCount: multiDeathFights.reduce((sum, p) => sum + p.totalDeaths, 0),
          affectedFights: [],
          mechanicIds: [],
          context: `Multiple deaths per player observed`
        }
      });
    }
    
    return patterns;
  }
  
  /**
   * Simple role guessing based on actor info and death patterns
   */
  private static guessPlayerRole(
    actor: ReportActorFragment | undefined, 
    deaths: DeathEvent[]
  ): string | undefined {
    // This is a simplified heuristic - in reality you'd use more sophisticated logic
    if (!actor) return undefined;
    
    // Could analyze gear, abilities used, etc. to determine role
    // For now, return undefined to avoid incorrect assumptions
    return undefined;
  }
  
  /**
   * Categorize abilities based on their characteristics
   */
  private static categorizeAbility(
    ability: ReportAbilityFragment | undefined,
    deaths: DeathEvent[]
  ): MechanicCategory {
    if (!ability || !ability.name) return MechanicCategory.OTHER;
    
    const abilityName = ability.name.toLowerCase();
    
    // Area effect abilities
    if (abilityName.includes('aoe') || abilityName.includes('area') || 
        abilityName.includes('blast') || abilityName.includes('explosion')) {
      return MechanicCategory.AREA_EFFECT;
    }
    
    // Execute phase abilities
    if (abilityName.includes('execute') || abilityName.includes('enrage')) {
      return MechanicCategory.EXECUTE_PHASE;
    }
    
    // Damage over time effects
    if (abilityName.includes('dot') || abilityName.includes('bleed') ||
        abilityName.includes('poison') || abilityName.includes('burn')) {
      return MechanicCategory.DAMAGE_OVER_TIME;
    }
    
    // Environmental damage
    if (abilityName.includes('fall') || abilityName.includes('lava') ||
        abilityName.includes('environmental')) {
      return MechanicCategory.ENVIRONMENTAL;
    }
    
    // High damage abilities
    const avgDamage = deaths.reduce((sum, d) => sum + (d.amount || 0), 0) / deaths.length;
    if (avgDamage > 50000) {
      return MechanicCategory.BURST_DAMAGE;
    }
    
    return MechanicCategory.DIRECT_DAMAGE;
  }
}