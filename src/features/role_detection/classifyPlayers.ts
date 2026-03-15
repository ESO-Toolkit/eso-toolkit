/**
 * Role Classification
 *
 * Classifies players into one of seven roles based on extracted signals.
 * Uses a hierarchical decision tree: Tanks → Healers → DPS.
 */

import {
  BUFF_HEALER_OFFENSIVE_THRESHOLD,
  BUFF_HEALER_SET_IDS,
  HEAVY_ARMOR_THRESHOLD,
  HIGH_DAMAGE_TAKEN_THRESHOLD,
  HIGH_HEALING_SHARE_THRESHOLD,
  LOW_DPS_SHARE_THRESHOLD,
  MAIN_TANK_TAUNT_UPTIME_THRESHOLD,
  SHIELD_HEALER_SET_IDS,
  TANK_SCORE_THRESHOLD,
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

  // Gate: only players with taunt evidence are eligible for tank classification.
  // Taunt applications (debuff 38254) are the defining tank signal — gear alone
  // (shield, heavy armor) is not sufficient since tanky healers share those traits.
  //
  // Additionally, healers sometimes throw a taunt briefly (e.g., one Inner Fire
  // to grab a stray add). To prevent these healers from being claimed as tanks,
  // we compare each candidate's tank score against their healer score — if the
  // healer score is higher, they're primarily a healer, not a tank.
  const tankScores = allSignals
    .filter((s) => remaining.has(s.playerId))
    .filter((s) => s.tauntCastCount > 0)
    .map((signals) => ({
      signals,
      tankScore: computeTankScore(signals, fightDurationMs),
      healerScore: computeHealerScore(signals),
    }))
    .filter((entry) => entry.tankScore > entry.healerScore)
    .filter((entry) => entry.tankScore >= TANK_SCORE_THRESHOLD)
    .sort((a, b) => b.tankScore - a.tankScore);

  if (tankScores.length === 0) return results;

  // Highest scorer is Main Tank; all other qualifying candidates are Off Tanks
  results.push({
    playerId: tankScores[0].signals.playerId,
    playerName: tankScores[0].signals.playerName,
    role: DetectedRole.MainTank,
    confidence: clampConfidence(tankScores[0].tankScore),
    signals: tankScores[0].signals,
  });

  for (let i = 1; i < tankScores.length; i++) {
    results.push({
      playerId: tankScores[i].signals.playerId,
      playerName: tankScores[i].signals.playerName,
      role: DetectedRole.OffTank,
      confidence: clampConfidence(tankScores[i].tankScore),
      signals: tankScores[i].signals,
    });
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
  const selectedHealers = healerScores.slice(0, healerCount);

  // --- Buff Healer gate + per-fight relative tiebreak ---
  // Gate: offensiveBuffCategoryCount >= threshold (Model B).
  // If 0 pass the gate, no buff healer exists in this fight.
  // If 1 passes, that healer is Buff Healer.
  // If 2+ pass, the one with the most offensive categories wins.
  // If tied at the top, neither gets Buff Healer (ambiguous).
  const buffCandidates = selectedHealers.filter(
    (h) => h.signals.offensiveBuffCategoryCount >= BUFF_HEALER_OFFENSIVE_THRESHOLD,
  );

  let buffHealerPlayerId: number | null = null;
  if (buffCandidates.length === 1) {
    buffHealerPlayerId = buffCandidates[0].signals.playerId;
  } else if (buffCandidates.length > 1) {
    const sorted = [...buffCandidates].sort(
      (a, b) => b.signals.offensiveBuffCategoryCount - a.signals.offensiveBuffCategoryCount,
    );
    if (sorted[0].signals.offensiveBuffCategoryCount > sorted[1].signals.offensiveBuffCategoryCount) {
      buffHealerPlayerId = sorted[0].signals.playerId;
    }
  }

  for (const candidate of selectedHealers) {
    let role: DetectedRole;
    if (candidate.signals.playerId === buffHealerPlayerId) {
      role = DetectedRole.BuffHealer;
    } else if (candidate.shieldScore > 15) {
      role = DetectedRole.ShieldHealer;
    } else {
      role = DetectedRole.GroupHealer;
    }

    results.push({
      playerId: candidate.signals.playerId,
      playerName: candidate.signals.playerName,
      role,
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

function computeBuffHealerScore(signals: PlayerRoleSignals): number {
  let score = 0;

  // Buff-healer-specific sets (Jorvuld’s, Master Architect, Powerful Assault)
  const hasBuffHealerSet = signals.healerSetIds.some((id) => BUFF_HEALER_SET_IDS.has(id));
  if (hasBuffHealerSet) score += 15;

  // Buff diversity — buff healers apply many distinct buff types to others
  if (signals.uniqueBuffTypesApplied >= 8) score += 15;
  else if (signals.uniqueBuffTypesApplied >= 5) score += 10;

  // Broad group coverage — buffing many distinct allies
  if (signals.uniqueTargetsBuffed >= 10) score += 10;
  else if (signals.uniqueTargetsBuffed >= 6) score += 5;

  // Horn casts — buff healers commonly run Aggressive Horn
  if (signals.hornCasts >= 2) score += 5;

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
