/**
 * Stat-aware coaching — build context the ESOTK Companion captures that ESO Logs can't.
 *
 * Uses the companion's captured character sheet to surface a couple of plain readings:
 * self penetration and crit chance. These are point-in-time values, read once on leaving
 * combat with buffs already fading, so they are not comparable across players.
 *
 * Penetration in particular is reported as a plain character-sheet number only. It excludes
 * the group armour debuffs applied to a target in combat, so it is NOT compared to the
 * 18,200 resistance cap — we make no over/under-cap verdict here. A real effective-penetration
 * verdict needs the log's target armour-debuff uptimes (the log-derived penetration engine).
 * See research doc §11.1.1 / §26.
 */

import type { CompanionStats } from './esotkCompanionParser';

/** Boss/trial/dungeon resistance — the PvE penetration cap. Reference only; no verdict is issued from the snapshot. */
export const PVE_PENETRATION_CAP = 18200;
/** Crit rating corresponding to 100 percentage points of crit chance. */
export const CRIT_RATING_FOR_100_PERCENT = 21918;

export type CoachingSeverity = 'good' | 'info' | 'warn' | 'error';

export interface CoachingInsight {
  /** Stable id, e.g. "penetration" | "critChance". */
  id: string;
  label: string;
  severity: CoachingSeverity;
  detail: string;
  /** The headline number (e.g. self penetration), when relevant. */
  value?: number;
}

function critChancePercent(rating: number): number {
  return Math.min(100, Math.round((rating / CRIT_RATING_FOR_100_PERCENT) * 1000) / 10); // one decimal
}

/**
 * Self penetration as read from the character sheet at capture. This is a point-in-time,
 * self-only figure: group armour debuffs on the target are NOT included and buffs were
 * already fading when the sheet was read, so it is not comparable across players and we
 * make no over/under-cap verdict here (the log-derived penetration engine does that).
 */
function penetrationInsight(stats: CompanionStats): CoachingInsight | null {
  const self = Math.max(stats.physicalPen ?? 0, stats.spellPen ?? 0);
  if (self <= 0) return null;

  return {
    id: 'penetration',
    severity: 'info',
    label: 'Penetration (character sheet)',
    value: self,
    detail: `Character-sheet penetration ${self.toLocaleString()} at capture — a point-in-time reading (buffs fading) that excludes the group armour debuffs applied to a target in combat, so it is not comparable to the resistance cap.`,
  };
}

function critChanceInsight(stats: CompanionStats): CoachingInsight | null {
  const rating = Math.max(stats.weaponCrit ?? 0, stats.spellCrit ?? 0);
  if (rating <= 0) return null;
  const pct = critChancePercent(rating);
  return {
    id: 'critChance',
    severity: 'info',
    label: 'Crit chance',
    value: pct,
    detail: `${pct}% crit chance (${rating.toLocaleString()} rating). Weigh more crit chance vs. weapon/spell damage against the crit damage shown on this card.`,
  };
}

/**
 * Produce coaching insights for a captured stat block. Order: penetration (headline),
 * crit chance. Skips anything we have no data for.
 */
export function computeStatCoaching(stats: CompanionStats | undefined): CoachingInsight[] {
  if (!stats) return [];
  const insights: CoachingInsight[] = [];
  const pen = penetrationInsight(stats);
  if (pen) insights.push(pen);
  const cc = critChanceInsight(stats);
  if (cc) insights.push(cc);
  return insights;
}
