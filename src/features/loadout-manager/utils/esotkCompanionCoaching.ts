/**
 * Stat-aware coaching — the headline insight ESO Logs can't produce.
 *
 * Using the companion's *exact* stats (not ESOTK's gear-based estimate), compute how
 * efficient a build is against ESO's hard caps. The big one is penetration vs the
 * 18,200 boss-resistance cap; over-pen is wasted, under-pen is lost damage.
 *
 * Penetration splits into "self" (on the character sheet, exact) and "effective"
 * (self + group armour debuffs on the boss, which are NOT on the sheet). Before a log
 * is available we approximate effective pen with an assumed group contribution; with the
 * log, ESOTK passes the real debuff value in. See research doc §11.1.1 / §26.
 */

import type { CompanionStats } from './esotkCompanionParser';

/** Boss/trial/dungeon resistance — the PvE penetration cap. */
export const PVE_PENETRATION_CAP = 18200;
/** Standard tank kit (Major+Minor Breach + gold Crusher) supplies ~this much pen to the group. */
export const STANDARD_GROUP_PEN = 11030;
/** Crit damage hard cap (percent bonus over base); total crit hit = 225%. */
export const CRIT_DAMAGE_CAP = 125;
/** Crit rating corresponding to 100 percentage points of crit chance. */
export const CRIT_RATING_FOR_100_PERCENT = 21918;

export type CoachingSeverity = 'good' | 'info' | 'warn' | 'error';

export interface CoachingInsight {
  /** Stable id, e.g. "penetration" | "critChance" | "critDamage". */
  id: string;
  label: string;
  severity: CoachingSeverity;
  detail: string;
  /** The headline number (e.g. effective pen), when relevant. */
  value?: number;
}

export interface CoachingOptions {
  /** Target resistance to test penetration against. Defaults to the PvE boss cap. */
  targetResist?: number;
  /**
   * Group armour debuffs assumed present on the target (Breach/Crusher/Alkosh).
   * 0 = self-only (default). Pass STANDARD_GROUP_PEN for a live pre-pull estimate, or the
   * exact value derived from the log for an exact effective-pen verdict.
   */
  assumedGroupPen?: number;
  /** How far over/under cap before flagging (avoids nagging over a few points). */
  slop?: number;
  /** Whether the group-pen figure is exact (from a log) or an assumption. Tunes wording. */
  groupPenIsExact?: boolean;
}

function critChancePercent(rating: number): number {
  return Math.min(100, Math.round((rating / CRIT_RATING_FOR_100_PERCENT) * 1000) / 10); // one decimal
}

function penetrationInsight(stats: CompanionStats, opts: CoachingOptions): CoachingInsight | null {
  const self = Math.max(stats.physicalPen ?? 0, stats.spellPen ?? 0);
  if (self <= 0) return null;

  const target = opts.targetResist ?? PVE_PENETRATION_CAP;
  const groupPen = opts.assumedGroupPen ?? 0;
  const slop = opts.slop ?? 100;
  const effective = self + groupPen;

  const effLabel = opts.groupPenIsExact ? 'effective' : 'estimated effective';
  const groupNote =
    groupPen > 0
      ? ` (${self.toLocaleString()} self + ${groupPen.toLocaleString()} group ${opts.groupPenIsExact ? 'debuffs' : 'debuffs assumed'})`
      : ' (self only — group debuffs add to this in combat)';

  if (effective > target + slop) {
    const over = effective - target;
    return {
      id: 'penetration',
      severity: 'warn',
      label: 'Over the penetration cap',
      value: effective,
      detail: `${effLabel} penetration ${effective.toLocaleString()}${groupNote} — ${over.toLocaleString()} over the ${target.toLocaleString()} cap is wasted. Drop a pen source for more damage.`,
    };
  }
  if (effective < target - slop) {
    const under = target - effective;
    return {
      id: 'penetration',
      severity: groupPen > 0 ? 'warn' : 'info',
      label: 'Under the penetration cap',
      value: effective,
      detail: `${effLabel} penetration ${effective.toLocaleString()}${groupNote} — ${under.toLocaleString()} under the ${target.toLocaleString()} cap is lost damage.`,
    };
  }
  return {
    id: 'penetration',
    severity: 'good',
    label: 'Penetration on cap',
    value: effective,
    detail: `${effLabel} penetration ${effective.toLocaleString()}${groupNote} — right on the ${target.toLocaleString()} cap.`,
  };
}

function critDamageInsight(stats: CompanionStats): CoachingInsight | null {
  if (stats.critDamage === undefined) return null;
  const cd = stats.critDamage;
  if (cd > CRIT_DAMAGE_CAP) {
    return {
      id: 'critDamage',
      severity: 'warn',
      label: 'Over the crit damage cap',
      value: cd,
      detail: `Crit damage ${cd}% exceeds the ${CRIT_DAMAGE_CAP}% cap by ${cd - CRIT_DAMAGE_CAP}% — that excess is wasted.`,
    };
  }
  return {
    id: 'critDamage',
    severity: 'info',
    label: 'Crit damage headroom',
    value: cd,
    detail: `Crit damage ${cd}% of the ${CRIT_DAMAGE_CAP}% cap — ${CRIT_DAMAGE_CAP - cd}% headroom.`,
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
    detail: `${pct}% crit chance (${rating.toLocaleString()} rating). Weigh more crit chance vs. weapon/spell damage against your current crit damage.`,
  };
}

/**
 * Produce coaching insights for a captured stat block. Order: penetration (headline),
 * crit damage, crit chance. Skips anything we have no data for.
 */
export function computeStatCoaching(
  stats: CompanionStats | undefined,
  opts: CoachingOptions = {},
): CoachingInsight[] {
  if (!stats) return [];
  const insights: CoachingInsight[] = [];
  const pen = penetrationInsight(stats, opts);
  if (pen) insights.push(pen);
  const cd = critDamageInsight(stats);
  if (cd) insights.push(cd);
  const cc = critChanceInsight(stats);
  if (cc) insights.push(cc);
  return insights;
}
