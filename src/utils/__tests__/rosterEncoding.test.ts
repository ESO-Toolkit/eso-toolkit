/**
 * Tests for rosterEncoding utilities
 * ESO-687: DPS gear fields (set1/set2/monsterSet/additionalSets) must survive
 *   compactify → expand and encode → decode round-trips so share links show the
 *   correct gear on RosterViewPage.
 * ESO-698: inflateBytes must return null (not crash) for invalid compressed data.
 */

// Polyfill stream APIs for jest+jsdom — Node.js has CompressionStream/ReadableStream
// on the process-level global but jsdom's globalThis doesn't expose them.
// All three must come from the SAME module (node:stream/web) to be compatible.
import {
  CompressionStream as NodeCS,
  DecompressionStream as NodeDCS,
  ReadableStream as NodeRS,
} from 'node:stream/web';
if (typeof globalThis.CompressionStream === 'undefined') {
  Object.assign(globalThis, {
    ReadableStream: NodeRS,
    CompressionStream: NodeCS,
    DecompressionStream: NodeDCS,
  });
}

import { KnownSetIDs } from '../../types/abilities';
import { createDefaultRoster } from '../../types/roster';
import {
  compactifyRoster,
  decodeRosterFromURL,
  encodeRosterToURL,
  expandCompactRoster,
  type CompactDPS,
} from '../rosterEncoding';

// ============================================================
// Helpers
// ============================================================

function makeRosterWithDPS() {
  const roster = createDefaultRoster();
  roster.dpsSlots[0] = {
    slotNumber: 1,
    playerName: 'Tester',
    roleLabel: 'DD1',
    set1: KnownSetIDs.POWERFUL_ASSAULT,
    set2: KnownSetIDs.MASTER_ARCHITECT,
    monsterSet: KnownSetIDs.VALKYN_SKORIA,
    additionalSets: [KnownSetIDs.EARTHGORE],
    championPoint: 'Slottable',
    ultimate: 'Some Ult',
  };
  return roster;
}

// ============================================================
// compactifyRoster / expandCompactRoster (synchronous)
// ============================================================

describe('compactifyRoster / expandCompactRoster – DPS gear fields', () => {
  it('round-trips set1, set2, monsterSet, additionalSets', () => {
    const roster = makeRosterWithDPS();
    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    const slot = expanded.dpsSlots[0];
    expect(slot.set1).toBe(KnownSetIDs.POWERFUL_ASSAULT);
    expect(slot.set2).toBe(KnownSetIDs.MASTER_ARCHITECT);
    expect(slot.monsterSet).toBe(KnownSetIDs.VALKYN_SKORIA);
    expect(slot.additionalSets).toEqual([KnownSetIDs.EARTHGORE]);
  });

  it('round-trips roleLabel, championPoint, ultimate', () => {
    const roster = makeRosterWithDPS();
    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    const slot = expanded.dpsSlots[0];
    expect(slot.roleLabel).toBe('DD1');
    expect(slot.championPoint).toBe('Slottable');
    expect(slot.ultimate).toBe('Some Ult');
  });

  it('includes DPS slot in compact output when only gear fields are set', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[2] = {
      slotNumber: 3,
      set1: KnownSetIDs.POWERFUL_ASSAULT,
    };

    const compact = compactifyRoster(roster);
    expect(compact.dp).toBeDefined();
    expect(compact.dp?.some((d) => d.sn === 3)).toBe(true);
  });

  it('uses s1/s2/ms/as keys in the compact representation', () => {
    const roster = makeRosterWithDPS();
    const compact = compactifyRoster(roster);

    const dpSlot = compact.dp?.[0] as CompactDPS;
    expect(dpSlot.s1).toBe(KnownSetIDs.POWERFUL_ASSAULT as number);
    expect(dpSlot.s2).toBe(KnownSetIDs.MASTER_ARCHITECT as number);
    expect(dpSlot.ms).toBe(KnownSetIDs.VALKYN_SKORIA as number);
    expect(dpSlot.as).toEqual([KnownSetIDs.EARTHGORE as number]);
  });

  it('does not emit s1/s2/ms/as keys when no new gear is set', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = { slotNumber: 1, playerName: 'Player' };

    const compact = compactifyRoster(roster);
    const dpSlot = compact.dp?.[0] as CompactDPS;
    expect(dpSlot.s1).toBeUndefined();
    expect(dpSlot.s2).toBeUndefined();
    expect(dpSlot.ms).toBeUndefined();
    expect(dpSlot.as).toBeUndefined();
  });

  it('backward-compat: legacy gs field is migrated into set1/set2 on the expanded slot', () => {
    // Simulate a compact payload from before the new fields were added
    const legacyCompact = {
      v: 2 as const,
      dp: [
        {
          sn: 1,
          gs: [KnownSetIDs.POWERFUL_ASSAULT as number, KnownSetIDs.MASTER_ARCHITECT as number],
        },
      ],
    };

    const expanded = expandCompactRoster(legacyCompact);
    const slot = expanded.dpsSlots[0];
    // Legacy gs[] is migrated to the new structured fields (set1/set2) for display
    expect(slot.set1).toBe(KnownSetIDs.POWERFUL_ASSAULT);
    expect(slot.set2).toBe(KnownSetIDs.MASTER_ARCHITECT);
    expect(slot.gearSets).toBeUndefined();
  });
});

// ============================================================
// encodeRosterToURL / decodeRosterFromURL (async, needs Web Streams)
// ============================================================

const canUseStreams = typeof globalThis.CompressionStream !== 'undefined';
// eslint-disable-next-line jest/no-disabled-tests
const describeWithStreams = canUseStreams ? describe : describe.skip;

describeWithStreams('encodeRosterToURL / decodeRosterFromURL – DPS gear round-trip', () => {
  it('DPS set1/set2/monsterSet survive encode → decode', async () => {
    const roster = makeRosterWithDPS();
    const encoded = await encodeRosterToURL(roster);
    const decoded = await decodeRosterFromURL(encoded);

    expect(decoded).not.toBeNull();
    const slot = decoded!.dpsSlots[0];
    expect(slot.set1).toBe(KnownSetIDs.POWERFUL_ASSAULT);
    expect(slot.set2).toBe(KnownSetIDs.MASTER_ARCHITECT);
    expect(slot.monsterSet).toBe(KnownSetIDs.VALKYN_SKORIA);
    expect(slot.additionalSets).toEqual([KnownSetIDs.EARTHGORE]);
  });

  it('returns null (no crash) for invalid compressed data — ESO-687/ESO-698 regression', async () => {
    // Garbage base64 that is not valid deflate-raw data
    const result = await decodeRosterFromURL('notValidBase64OrCompressedData!!!');
    expect(result).toBeNull();
  });

  it('returns null for empty string', async () => {
    const result = await decodeRosterFromURL('');
    expect(result).toBeNull();
  });
});
