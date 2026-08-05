/**
 * Builds the canonical-id maps the clustering needs.
 *
 * MAIN THREAD ONLY. This module reaches into the app's set and skill registries,
 * which the worker must not import:
 *  - `skillLineSkills` eagerly pulls in scribing-complete.json plus every
 *    skill-line module (multiple MB).
 *  - `getSetDisplayName` reports unknown set ids to Rollbar, and ingested top
 *    parses reliably contain ids that predate our tables.
 *
 * The output is plain `Record<number, number>`, so it crosses the worker boundary
 * by structured clone and the worker stays pure arithmetic.
 */

import { SET_DISPLAY_NAMES } from '../../../utils/setNameUtils';
import type { DpsParse } from '../types/dpsParses.types';

import type { CanonicalMaps } from './featureExtraction';

/** Normalized set name used to group perfected and non-perfected variants. */
function normalizeSetName(name: string): string {
  return name
    .replace(/^perfected\s+/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Perfected set id → base set id.
 *
 * A player mixing 3 perfected and 2 non-perfected pieces is wearing one five-piece
 * set, and two players who differ only in perfection are running the same build.
 * Grouping by normalized name catches both, and canonicalizing on the LOWEST id
 * picks the non-perfected original deterministically.
 *
 * The ingest already applies this to piece counts; doing it again here also covers
 * rows written before that landed, and set ids the server did not have names for.
 */
export function buildSetAliasMap(): Record<number, number> {
  const byName = new Map<string, number[]>();

  for (const [rawId, name] of Object.entries(SET_DISPLAY_NAMES)) {
    const id = Number(rawId);
    if (!Number.isFinite(id) || typeof name !== 'string') continue;

    const key = normalizeSetName(name);
    const ids = byName.get(key);
    if (ids) ids.push(id);
    else byName.set(key, [id]);
  }

  const aliases: Record<number, number> = {};
  for (const ids of byName.values()) {
    if (ids.length < 2) continue;
    const canonical = Math.min(...ids);
    for (const id of ids) {
      if (id !== canonical) aliases[id] = canonical;
    }
  }
  return aliases;
}

/**
 * Ability id → base skill id, so morph siblings get partial credit.
 *
 * Built from the ids actually present in the data rather than from the full skill
 * registry: only a few hundred abilities appear across a page of parses, and this
 * avoids loading the entire skill dataset to answer a handful of lookups.
 *
 * Deliberately conservative — an id with no known base maps to itself, which the
 * distance function treats as "no partial credit" rather than a wrong merge.
 */
export function buildAbilityAliasMap(
  parses: readonly DpsParse[],
  resolveBaseAbilityId?: (abilityId: number) => number | undefined,
): Record<number, number> {
  if (!resolveBaseAbilityId) return {};

  const aliases: Record<number, number> = {};
  const seen = new Set<number>();

  for (const parse of parses) {
    const bars = parse.build?.bars;
    if (!bars) continue;

    for (const abilityId of [...bars.front, ...bars.back]) {
      if (seen.has(abilityId)) continue;
      seen.add(abilityId);

      const base = resolveBaseAbilityId(abilityId);
      if (base !== undefined && base !== abilityId) aliases[abilityId] = base;
    }
  }

  return aliases;
}

export function buildCanonicalMaps(
  parses: readonly DpsParse[],
  resolveBaseAbilityId?: (abilityId: number) => number | undefined,
): CanonicalMaps {
  return {
    sets: buildSetAliasMap(),
    abilities: buildAbilityAliasMap(parses, resolveBaseAbilityId),
  };
}

/**
 * Display name for a set id.
 *
 * Prefers our own table but NEVER calls `getSetDisplayName`, which reports unknown
 * ids to Rollbar — ingested top parses routinely contain sets newer than our data,
 * and that would be a steady stream of false error reports.
 */
export function setDisplayName(setId: number, fallbackName?: string): string {
  const known = (SET_DISPLAY_NAMES as Record<number, string | undefined>)[setId];
  return known ?? fallbackName ?? `Set ${setId}`;
}
