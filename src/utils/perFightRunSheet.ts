/**
 * Pure helpers for the read-only "/rv" run-sheet per-fight builds view.
 *
 * Extracted from RosterViewPage so the collapsed-summary and slot-row
 * derivation can be unit-tested without React. These functions never mutate
 * the roster/override model (it is encoded into shared ?r= URLs).
 */

import type { KnownSetIDs } from '../types/abilities';
import type { RaidRoster } from '../types/roster';
import type { EncounterOverrides, PlayerOverride } from '../types/trial-encounters';

import { getSetDisplayName } from './setNameUtils';

/** One resolved player-slot row in a fight's build detail. */
export interface SlotRow {
  /** SlotKey, e.g. "tank:0" | "healer:1" | "dps:3". */
  key: string;
  /** Short role label shown to the user, e.g. "MT", "OT", "H1", "D3". */
  label: string;
  /** Resolved set display names (set1, set2, monster) in order, empties dropped. */
  sets: string[];
  /** Optional ultimate name. */
  ultimate?: string | null;
  /** Optional free-text note. */
  notes?: string;
}

/** Compact summary used to render a collapsed fight card. */
export interface FightSummary {
  /** Number of player slots that carry a real override in this fight. */
  slotCount: number;
  /** A few of the most notable set names, for a teaser line. */
  teaserSets: string[];
  /** True when there are more distinct sets than the teaser shows. */
  hasMoreSets: boolean;
}

/** Role label for a tank slot: MT, OT, then T3, T4… */
function tankLabel(index: number): string {
  if (index === 0) return 'MT';
  if (index === 1) return 'OT';
  return `T${index + 1}`;
}

/** Resolve a slot's set IDs to display names, dropping empties. */
function resolveSets(override: PlayerOverride): string[] {
  return [
    override.set1 ? getSetDisplayName(override.set1 as KnownSetIDs) : null,
    override.set2 ? getSetDisplayName(override.set2 as KnownSetIDs) : null,
    override.monsterSet ? getSetDisplayName(override.monsterSet as KnownSetIDs) : null,
  ].filter((s): s is string => Boolean(s));
}

/** Does a slot carry anything worth rendering (a set, an ultimate, or a note)? */
function slotHasContent(override: PlayerOverride): boolean {
  const sets = resolveSets(override);
  return sets.length > 0 || Boolean(override.ultimate) || Boolean(override.notes);
}

/**
 * Build the ordered, resolved slot rows for one fight: tanks (by composition),
 * then healers (by composition), then any DPS slots present in the overrides
 * (numerically by index). Only slots with real content are returned.
 */
export function buildSlotRows(
  roster: RaidRoster,
  overrides: EncounterOverrides | undefined,
): SlotRow[] {
  if (!overrides) return [];
  const rows: SlotRow[] = [];

  roster.tanks.forEach((_, i) => {
    const key = `tank:${i}`;
    const o = overrides.slots?.[key];
    if (o && slotHasContent(o)) {
      rows.push({
        key,
        label: tankLabel(i),
        sets: resolveSets(o),
        ultimate: o.ultimate,
        notes: o.notes,
      });
    }
  });

  roster.healers.forEach((_, i) => {
    const key = `healer:${i}`;
    const o = overrides.slots?.[key];
    if (o && slotHasContent(o)) {
      rows.push({
        key,
        label: `H${i + 1}`,
        sets: resolveSets(o),
        ultimate: o.ultimate,
        notes: o.notes,
      });
    }
  });

  Object.entries(overrides.slots ?? {})
    .filter(([key]) => key.startsWith('dps:'))
    .sort(([a], [b]) => parseInt(a.split(':')[1], 10) - parseInt(b.split(':')[1], 10))
    .forEach(([key, o]) => {
      if (slotHasContent(o)) {
        const dpsIdx = parseInt(key.split(':')[1], 10);
        rows.push({
          key,
          label: `D${dpsIdx + 1}`,
          sets: resolveSets(o),
          ultimate: o.ultimate,
          notes: o.notes,
        });
      }
    });

  return rows;
}

/**
 * Compute the collapsed-card summary for a fight: how many slots are populated
 * and a short, de-duplicated teaser of the most notable set names.
 */
export function summarizeFight(
  roster: RaidRoster,
  overrides: EncounterOverrides | undefined,
  teaserLimit = 3,
): FightSummary {
  const rows = buildSlotRows(roster, overrides);
  const seen = new Set<string>();
  const distinctSets: string[] = [];
  for (const row of rows) {
    for (const s of row.sets) {
      if (!seen.has(s)) {
        seen.add(s);
        distinctSets.push(s);
      }
    }
  }
  return {
    slotCount: rows.length,
    teaserSets: distinctSets.slice(0, teaserLimit),
    hasMoreSets: distinctSets.length > teaserLimit,
  };
}
