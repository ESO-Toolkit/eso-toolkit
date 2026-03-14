/**
 * Role Classification
 *
 * Classifies players into one of six roles based on extracted signals.
 * Uses a hierarchical decision tree: Tanks → Healers → DPS.
 */

import {
  HEAVY_ARMOR_THRESHOLD,
  HIGH_DAMAGE_TAKEN_THRESHOLD,
  HIGH_HEALING_SHARE_THRESHOLD,
  LOW_DPS_SHARE_THRESHOLD,
  MAIN_TANK_TAUNT_UPTIME_THRESHOLD,
  SHIELD_HEALER_SET_IDS,
} from './constants';
import { DetectedRole, PlayerRoleResult, PlayerRoleSignals } from './types';

/**
 * Classify all players in a fight given their extracted signals.
 * The algorithm is hierarchical: identify tanks first, then healers, then DPS.
 */
export function classifyPlayers(
  allSignals: PlayerRoleSignals[],
  fightDurationMs: number,
): PlayerRoleResult[] {
  const remaining = new Set(allSignals.map((s) => s.playerId));
  const results: PlayerRoleResult[] = [];
  const signalMap = new Map(allSignals.map((s) => [s.playerId, s]));

  // --- Step 1: Identify Tanks ---
  const tankResults = identifyTanks(allSignals, remaining, fightDurationMs);
  for (const result of tankResults) {
    results.push(result);
    remaining.delete(result.playerId);
  }

  // --- Step 2: Identify Healers ---
  const remainingSignals = allSignals.filter((s) => remaining.has(s.playerId));
  const healerResults = identifyHealers(remainingSignals, remaining);
  for (const result of healerResults) {
    results.push(result);
    remaining.delete(result.playerId);
  }

  // --- Step 3: Classify remaining as DPS ---
  for (const playerId of remaining) {
    const signals = signalMap.get(playerId)!;
    results.push(classifyDps(signals));
  }

  return results;
}

// ============================================================
// Tank Identification
// ============================================================

function identifyTanks(
  allSignals: PlayerRoleSignals[],
  remaining: Set<number>,
  fightDurationMs: number,
): PlayerRoleResult[] {
  const results: PlayerRoleResult[] = [];

  // Score all remaining players for "tankiness"
  const tankScores = allSignals
    .filter((s) => remaining.has(s.playerId))
    .map((signals) => ({
      signals,
      score: computeTankScore(signals, fightDurationMs),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (tankScores.length === 0) return results;

  // The highest-scoring tank candidate is Main Tank if they have taunt evidence
  const mainTankCandidate = tankScores[0];
  if (mainTankCandidate.score >= 20) {
    results.push({
      playerId: mainTankCandidate.signals.playerId,
      playerName: mainTankCandidate.signals.playerName,
      role: DetectedRole.MainTank,
      confidence: clampConfidence(mainTankCandidate.score),
      signals: mainTankCandidate.signals,
    });

    // Second-highest is Off Tank if they also have tank signals
    if (tankScores.length >= 2 && tankScores[1].score >= 15) {
      results.push({
        playerId: tankScores[1].signals.playerId,
        playerName: tankScores[1].signals.playerName,
        role: DetectedRole.OffTank,
        confidence: clampConfidence(tankScores[1].score),
        signals: tankScores[1].signals,
      });
    }
  }

  return results;
}

function computeTankScore(signals: PlayerRoleSignals, fightDurationMs: number): number {
  let score = 0;

  // Taunt signals — the strongest indicator
  const tauntUptimeRatio = fightDurationMs > 0 ? signals.tauntUptimeOnBossMs / fightDurationMs : 0;

  if (tauntUptimeRatio >= MAIN_TANK_TAUNT_UPTIME_THRESHOLD) {
    score += 40;
  } else if (signals.tauntCastCount > 0) {
    score += 20;
  }

  if (signals.tauntedUniqueEnemies > 0) {
    score += Math.min(signals.tauntedUniqueEnemies * 3, 10);
  }

  // Gear signals
  if (signals.hasShieldWeapon) score += 15;
  if (signals.hasFrostStaff) score += 5;
  if (signals.heavyArmorCount >= HEAVY_ARMOR_THRESHOLD) score += 15;
  if (signals.tankSetIds.length > 0) score += 15;

  // Defensive signals
  if (signals.damageTakenShareOfGroup >= HIGH_DAMAGE_TAKEN_THRESHOLD) score += 10;
  if (signals.totalHitsTaken > 0 && signals.blockedHitCount / signals.totalHitsTaken > 0.1) {
    score += 5;
  }

  // Low DPS as confirming signal (tanks shouldn't be high DPS)
  if (signals.damageShareOfGroup < LOW_DPS_SHARE_THRESHOLD) score += 5;

  // Horn casts — tanks often run horn
  if (signals.hornCasts > 0) score += 5;

  return score;
}

// ============================================================
// Healer Identification
// ============================================================

function identifyHealers(
  remainingSignals: PlayerRoleSignals[],
  remaining: Set<number>,
): PlayerRoleResult[] {
  const results: PlayerRoleResult[] = [];

  const healerScores = remainingSignals
    .filter((s) => remaining.has(s.playerId))
    .map((signals) => ({
      signals,
      score: computeHealerScore(signals),
      shieldScore: computeShieldHealerScore(signals),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // Pick up to 2 healers from the top candidates
  const healerCount = Math.min(2, healerScores.filter((h) => h.score >= 20).length);

  for (let i = 0; i < healerCount; i++) {
    const candidate = healerScores[i];

    // Decide Group Healer vs Shield Healer
    const isShieldHealer = candidate.shieldScore > 15;

    results.push({
      playerId: candidate.signals.playerId,
      playerName: candidate.signals.playerName,
      role: isShieldHealer ? DetectedRole.ShieldHealer : DetectedRole.GroupHealer,
      confidence: clampConfidence(candidate.score),
      signals: candidate.signals,
    });
  }

  return results;
}

function computeHealerScore(signals: PlayerRoleSignals): number {
  let score = 0;

  // Healing output — strongest signal
  if (signals.healingShareOfGroup >= HIGH_HEALING_SHARE_THRESHOLD) {
    score += 30;
  } else if (signals.healingShareOfGroup >= 0.08) {
    score += 15;
  }

  // Healer gear sets
  if (signals.healerSetIds.length > 0) score += 25;
  if (signals.healerSetIds.length >= 2) score += 10;

  // Major Courage application
  if (signals.majorCourageTargets >= 4) score += 15;
  else if (signals.majorCourageTargets >= 1) score += 5;

  // Low DPS confirms healer role
  if (signals.damageShareOfGroup < LOW_DPS_SHARE_THRESHOLD) score += 5;

  // Horn from healer (common in organized groups)
  if (signals.hornCasts > 0) score += 5;

  // Barrier from healer
  if (signals.barrierCasts > 0) score += 5;

  return score;
}

function computeShieldHealerScore(signals: PlayerRoleSignals): number {
  let score = 0;

  // Shield-specific sets
  const hasShieldHealerSet = signals.healerSetIds.some((id) => SHIELD_HEALER_SET_IDS.has(id));
  if (hasShieldHealerSet) score += 15;

  // Barrier ultimate — strong shield healer signal
  if (signals.barrierCasts > 0) score += 15;

  // High absorb applied to others
  if (signals.shieldAppliedToOthers > 0) score += 10;

  return score;
}

// ============================================================
// DPS Classification
// ============================================================

function classifyDps(signals: PlayerRoleSignals): PlayerRoleResult {
  const isSupportDps = signals.supportDpsSetIds.length > 0;

  let confidence = 50;

  if (isSupportDps) {
    confidence += 20;
    if (signals.damageShareOfGroup >= LOW_DPS_SHARE_THRESHOLD) confidence += 10;
    // Support DPS sometimes applies group buffs
    if (signals.majorCourageTargets > 0) confidence += 5;
  } else {
    // Parse DPS
    if (signals.dpsSetIds.length > 0) confidence += 20;
    if (signals.dpsSetIds.length >= 2) confidence += 10;
    if (signals.damageShareOfGroup >= 0.08) confidence += 10;
  }

  return {
    playerId: signals.playerId,
    playerName: signals.playerName,
    role: isSupportDps ? DetectedRole.SupportDPS : DetectedRole.ParseDPS,
    confidence: clampConfidence(confidence),
    signals,
  };
}

// ============================================================
// Utilities
// ============================================================

function clampConfidence(score: number): number {
  return Math.max(0, Math.min(100, score));
}
