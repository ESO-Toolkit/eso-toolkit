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
// buildRef / food edge cases
// ============================================================

describe('compactifyRoster / expandCompactRoster – buildRef and food', () => {
  it('round-trips buildRef on a DPS slot', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = {
      slotNumber: 1,
      buildRef: {
        buildId: 'abc-123',
        setupIndex: 2,
        buildName: 'My DK Build',
        esoClass: 'dragonknight',
        role: 'dps',
      },
    };

    const compact = compactifyRoster(roster);
    expect(compact.dp).toBeDefined();
    expect(compact.dp!.length).toBeGreaterThanOrEqual(1);

    const expanded = expandCompactRoster(compact);
    const slot = expanded.dpsSlots[0];
    expect(slot.buildRef).toEqual({
      buildId: 'abc-123',
      setupIndex: 2,
      buildName: 'My DK Build',
      esoClass: 'dragonknight',
      role: 'dps',
    });
  });

  it('does NOT drop a DPS slot that only has a buildRef (no other fields)', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[3] = {
      slotNumber: 4,
      buildRef: { setupIndex: 0, buildName: 'Lone Build' },
    };

    const compact = compactifyRoster(roster);
    expect(compact.dp?.some((d) => d.sn === 4)).toBe(true);
  });

  it('does NOT drop a DPS slot that only has food (no other fields)', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[5] = {
      slotNumber: 6,
      food: { id: 42, name: 'Artaeum Pickled Fish Bowl' },
    };

    const compact = compactifyRoster(roster);
    expect(compact.dp?.some((d) => d.sn === 6)).toBe(true);
  });

  it('round-trips food on a tank slot', () => {
    const roster = createDefaultRoster();
    roster.tanks[0].food = { id: 99, name: 'Bewitched Sugar Skulls' };
    roster.tanks[0].buildRef = { setupIndex: 0, buildName: 'Tank Build' };

    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    expect(expanded.tanks[0].food).toEqual({ id: 99, name: 'Bewitched Sugar Skulls' });
    expect(expanded.tanks[0].buildRef).toEqual({ setupIndex: 0, buildName: 'Tank Build' });
  });

  it('round-trips buildRef on a healer slot', () => {
    const roster = createDefaultRoster();
    roster.healers[1].buildRef = {
      buildId: 'heal-456',
      setupIndex: 1,
      buildName: 'Healer Build',
      esoClass: 'templar',
      role: 'healer',
    };

    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    expect(expanded.healers[1].buildRef).toEqual({
      buildId: 'heal-456',
      setupIndex: 1,
      buildName: 'Healer Build',
      esoClass: 'templar',
      role: 'healer',
    });
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

  it('returns null for v1 payload that decodes to a JSON primitive — ESO-706 regression', async () => {
    // btoa("32") = "MzI=" — JSON.parse("32") produces a number, not a roster object
    expect(await decodeRosterFromURL(btoa('32'))).toBeNull();
    expect(await decodeRosterFromURL(btoa('"hello"'))).toBeNull();
    expect(await decodeRosterFromURL(btoa('true'))).toBeNull();
    expect(await decodeRosterFromURL(btoa('null'))).toBeNull();
    expect(await decodeRosterFromURL(btoa('[1,2,3]'))).toBeNull();
  });
});

// ============================================================
// Full mode inline data: skills, cpPoints, passives, rosterDetailLevel
// ============================================================

describe('compactifyRoster / expandCompactRoster – Full mode inline data', () => {
  it('round-trips skills on a DPS slot', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'Tester',
      skills: { 0: { 3: 100001, 4: 100002, 8: 100003 }, 1: { 3: 200001, 8: 200002 } },
    };

    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    const slot = expanded.dpsSlots[0];
    expect(slot.skills?.[0][3]).toBe(100001);
    expect(slot.skills?.[1][3]).toBe(200001);
    expect(slot.skills?.[1][8]).toBe(200002);
  });

  it('round-trips cpPoints on a tank slot', () => {
    const roster = createDefaultRoster();
    roster.tanks[0].cpPoints = {
      warfare: { slots: [111, 222, null, null], passives: { war1: 3 } },
      fitness: { slots: [333, null, null, null], passives: {} },
      craft: { slots: [null, null, null, null], passives: {} },
    };

    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    expect(expanded.tanks[0].cpPoints?.warfare.slots[0]).toBe(111);
    expect(expanded.tanks[0].cpPoints?.warfare.slots[1]).toBe(222);
    expect(expanded.tanks[0].cpPoints?.warfare.passives).toEqual({ war1: 3 });
    expect(expanded.tanks[0].cpPoints?.fitness.slots[0]).toBe(333);
  });

  it('round-trips passives on a healer slot', () => {
    const roster = createDefaultRoster();
    roster.healers[0].passives = [40001, 40002, 40003];

    const compact = compactifyRoster(roster);
    const expanded = expandCompactRoster(compact);

    expect(expanded.healers[0].passives).toEqual([40001, 40002, 40003]);
  });

  it('round-trips rosterDetailLevel', () => {
    const roster = createDefaultRoster();
    roster.rosterDetailLevel = 'full';

    const compact = compactifyRoster(roster);
    expect(compact.dl).toBe(1); // DL_MAP: simple=0, full=1

    const expanded = expandCompactRoster(compact);
    expect(expanded.rosterDetailLevel).toBe('full');
  });

  it('does not emit new fields when they are empty', () => {
    const roster = createDefaultRoster();
    roster.dpsSlots[0] = { slotNumber: 1, playerName: 'Player' };

    const compact = compactifyRoster(roster);
    const dp = compact.dp?.[0];
    expect(dp?.sk).toBeUndefined();
    expect(dp?.cp2).toBeUndefined();
    expect(dp?.pa).toBeUndefined();
    expect(compact.dl).toBeUndefined();
  });

  it('backward-compat: old roster without new fields expands with undefined inline data', () => {
    const oldCompact = { v: 2 as const, dp: [{ sn: 1, pn: 'OldPlayer' }] };
    const expanded = expandCompactRoster(oldCompact);
    const slot = expanded.dpsSlots[0];
    expect(slot.skills).toBeUndefined();
    expect(slot.cpPoints).toBeUndefined();
    expect(slot.passives).toBeUndefined();
    expect(expanded.rosterDetailLevel).toBeUndefined();
  });
});
