/**
 * Tests for the SINGLE-TRIAL → MULTI-TRIAL per-fight overrides migration.
 *
 * Covers the load-bearing invariants from the design brief:
 *  - Multi-trial round-trip: encode (tom) → decode → re-encode preserves every
 *    trial's encounterBuilds and per-slot data.
 *  - Backward compat (HARD GATE): a legacy single-trial `?r=` payload (compact
 *    `to`) decodes to a one-entry map with the right trialId + intact builds,
 *    and re-encodes to the new `tom` form (never `to`).
 *  - sa fail-safe: a populated trial decodes with useSameBuildForAll === false
 *    even if the `sa` flag is missing/stale, so a slip can't silently hide builds.
 *  - Sparse encoding: same-build-only trials are omitted from the URL.
 */

/**
 * @jest-environment node
 *
 * rosterEncoding uses CompressionStream/DecompressionStream (Web Streams API),
 * which jsdom does not ship; the `node` environment provides spec-compatible globals.
 */

import { deflateRawSync, inflateRawSync } from 'zlib';

import { createDefaultRoster } from '../types/roster';
import type { RaidRoster } from '../types/roster';
import type { TrialBuildOverrides } from '../types/trial-encounters';

import {
  type CompactRoster,
  type CompactRosterV3,
  type CompactTrialOverrides,
  compactifyRoster,
  expandCompactRoster,
  toBase64Url,
  fromBase64Url,
} from './rosterEncoding';

// Plain numeric set IDs — encoding stores raw numbers, so exact ids are irrelevant
// to these tests; we only assert they survive the round-trip unchanged.
const SET_A = 172621; // Pearlescent Ward
const SET_B = 154716; // a Sul-Xan set
const SET_C = 185; // Spell Power Cure

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A trial overrides object with real per-encounter, per-slot data. */
function trialWithBuilds(trialId: string): TrialBuildOverrides {
  return {
    trialId,
    useSameBuildForAll: false,
    encounterBuilds: {
      boss_1: {
        slots: {
          'tank:0': { set1: SET_A, ultimate: 'Warhorn', notes: 'shield' },
          'dps:3': { set1: SET_B },
        },
      },
      boss_2: {
        slots: {
          'healer:1': { set1: SET_C, notes: 'group heals' },
        },
      },
    },
  };
}

function rosterWithTrials(map: Record<string, TrialBuildOverrides>): RaidRoster {
  const roster = createDefaultRoster();
  roster.trials = Object.keys(map);
  roster.trialOverrides = map;
  return roster;
}

/**
 * URL round-trip via Node zlib — CompressionStream/DecompressionStream are not
 * available in jest's vm sandbox, so we use the same deflate-raw format that
 * encodeRosterToURL/decodeRosterFromURL use in the browser. (Mirrors the helper
 * pattern in rosterEncoding.test.ts.)
 */
function encodeViaZlib(roster: RaidRoster): string {
  const compact = compactifyRoster(roster);
  const compressed = deflateRawSync(Buffer.from(JSON.stringify(compact), 'utf-8'));
  return toBase64Url(new Uint8Array(compressed));
}
function decodeViaZlib(encoded: string): RaidRoster {
  const bytes = fromBase64Url(encoded);
  const json = inflateRawSync(Buffer.from(bytes)).toString('utf-8');
  const parsed = JSON.parse(json) as CompactRoster;
  return expandCompactRoster(parsed);
}

// ── Multi-trial round-trip ─────────────────────────────────────────────────────

describe('multi-trial per-fight overrides — round-trip', () => {
  it('preserves every trial’s encounterBuilds through encode → decode', () => {
    const map = {
      rockgrove: trialWithBuilds('rockgrove'),
      kynes_aegis: trialWithBuilds('kynes_aegis'),
    };
    const roster = rosterWithTrials(map);

    const compact = compactifyRoster(roster) as CompactRosterV3;
    // New form only: tom present, legacy to absent.
    expect(compact.tom).toBeDefined();
    expect(compact.to).toBeUndefined();
    expect(Object.keys(compact.tom!)).toEqual(['rockgrove', 'kynes_aegis']);
    // Map key is the trialId — `ti` is dropped inside each entry.
    expect((compact.tom!.rockgrove as Record<string, unknown>).ti).toBeUndefined();

    const decoded = expandCompactRoster(compact);
    expect(Object.keys(decoded.trialOverrides ?? {})).toEqual(['rockgrove', 'kynes_aegis']);
    expect(decoded.trialOverrides?.rockgrove.encounterBuilds.boss_1.slots['tank:0'].set1).toBe(
      SET_A,
    );
    expect(decoded.trialOverrides?.rockgrove.encounterBuilds.boss_1.slots['tank:0'].ultimate).toBe(
      'Warhorn',
    );
    expect(decoded.trialOverrides?.kynes_aegis.encounterBuilds.boss_2.slots['healer:1'].notes).toBe(
      'group heals',
    );
  });

  it('survives a full URL round-trip (deflate-raw + base64url) with no data loss', () => {
    const map = {
      rockgrove: trialWithBuilds('rockgrove'),
      dreadsail_reef: trialWithBuilds('dreadsail_reef'),
    };
    const roster = rosterWithTrials(map);

    const encoded = encodeViaZlib(roster);
    expect(encoded).toBeTruthy();
    const decoded = decodeViaZlib(encoded);
    expect(Object.keys(decoded.trialOverrides ?? {}).sort()).toEqual([
      'dreadsail_reef',
      'rockgrove',
    ]);
    expect(decoded.trialOverrides?.dreadsail_reef.encounterBuilds.boss_1.slots['dps:3'].set1).toBe(
      SET_B,
    );
  });
});

// ── Backward compatibility (HARD GATE) ─────────────────────────────────────────

describe('legacy single-trial decode (backward compat)', () => {
  /** Build + encode a legacy `?r=` payload the OLD encoder produced: compact `to` with ti/sa/eb. */
  function makeLegacyUrl(trialId: string): string {
    const legacyTo: CompactTrialOverrides = {
      ti: trialId,
      sa: false,
      eb: {
        boss_1: { sk: { 'tank:0': { s1: SET_A, ul: 'Warhorn' } } },
        boss_2: { sk: { 'healer:1': { no: 'group heals' } } },
      },
    };
    const legacyCompact = { v: 3, ts: [{}, {}], hs: [{}, {}], dl: 1, to: legacyTo };
    const compressed = deflateRawSync(Buffer.from(JSON.stringify(legacyCompact), 'utf-8'));
    return toBase64Url(new Uint8Array(compressed));
  }

  it('decodes a legacy single-trial URL into a one-entry map with intact builds', () => {
    const decoded = decodeViaZlib(makeLegacyUrl('rockgrove'));
    expect(Object.keys(decoded.trialOverrides ?? {})).toEqual(['rockgrove']);
    const rg = decoded.trialOverrides?.rockgrove;
    expect(rg?.trialId).toBe('rockgrove');
    expect(rg?.encounterBuilds.boss_1.slots['tank:0'].set1).toBe(SET_A);
    expect(rg?.encounterBuilds.boss_1.slots['tank:0'].ultimate).toBe('Warhorn');
    expect(rg?.encounterBuilds.boss_2.slots['healer:1'].notes).toBe('group heals');
  });

  it('re-encodes a decoded legacy roster to the new tom form (never to)', () => {
    const decoded = decodeViaZlib(makeLegacyUrl('kynes_aegis'));
    const recompact = compactifyRoster(decoded) as CompactRosterV3;
    expect(recompact.tom).toBeDefined();
    expect(recompact.to).toBeUndefined();
    expect(Object.keys(recompact.tom!)).toEqual(['kynes_aegis']);
  });
});

// ── sa fail-safe + sparse rules ────────────────────────────────────────────────

describe('sa fail-safe and sparse encoding', () => {
  it('forces useSameBuildForAll=false when a trial has real builds (even if sa was true)', () => {
    // Construct a tom entry with a stale sa=true alongside populated eb.
    const compact: CompactRosterV3 = {
      v: 3,
      ts: [{}, {}],
      hs: [{}, {}],
      tom: {
        rockgrove: { sa: true, eb: { boss_1: { sk: { 'tank:0': { s1: 1 } } } } },
      },
    };
    const decoded = expandCompactRoster(compact);
    expect(decoded.trialOverrides?.rockgrove.useSameBuildForAll).toBe(false);
    expect(decoded.trialOverrides?.rockgrove.encounterBuilds.boss_1.slots['tank:0'].set1).toBe(1);
  });

  it('omits a same-build-for-all trial with no real builds from the URL', () => {
    const roster = rosterWithTrials({
      rockgrove: { trialId: 'rockgrove', useSameBuildForAll: true, encounterBuilds: {} },
      kynes_aegis: trialWithBuilds('kynes_aegis'),
    });
    const compact = compactifyRoster(roster) as CompactRosterV3;
    // Empty same-build trial is dropped; only the populated one survives.
    expect(Object.keys(compact.tom ?? {})).toEqual(['kynes_aegis']);
  });

  it('produces no tom key when nothing is populated', () => {
    const roster = rosterWithTrials({
      rockgrove: { trialId: 'rockgrove', useSameBuildForAll: true, encounterBuilds: {} },
    });
    const compact = compactifyRoster(roster) as CompactRosterV3;
    expect(compact.tom).toBeUndefined();
  });
});
