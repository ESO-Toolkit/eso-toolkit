/**
 * Group round-trip test for the roster URL share pipeline.
 *
 * Exercises the real public API (encodeRosterToURL → decodeRosterFromURL) to
 * prove that multi-group memberships (`groups`) survive a full encode/decode
 * cycle on all three roles (tank / healer / dps).
 *
 * Environment note:
 * encodeRosterToURL/decodeRosterFromURL use CompressionStream/DecompressionStream
 * (Web Streams API). jsdom does not expose these and the `node` test environment
 * is incompatible with our jsdom-based setupTests (it references `window`). We
 * therefore polyfill the two stream classes from Node's `node:stream/web`, which
 * are spec-compatible with the browser globals, so the genuine async public API
 * runs unmodified under jsdom.
 */

import { CompressionStream, DecompressionStream } from 'node:stream/web';

import {
  createDefaultRoster,
  defaultTankSetup,
  defaultHealerSetup,
} from '../types/roster';

import { encodeRosterToURL, decodeRosterFromURL } from './rosterEncoding';

const g = globalThis as Record<string, unknown>;
if (typeof g.CompressionStream === 'undefined') g.CompressionStream = CompressionStream;
if (typeof g.DecompressionStream === 'undefined') g.DecompressionStream = DecompressionStream;

describe('groups survive encodeRosterToURL → decodeRosterFromURL', () => {
  it('round-trips groups on tank, healer, and dps roles', async () => {
    const roster = createDefaultRoster();
    roster.rosterName = 'Group Round-Trip';

    roster.tanks[0] = {
      ...defaultTankSetup(1),
      playerName: 'TankPlayer',
      groups: ['Left Stack', 'Portal'],
    };
    roster.healers[0] = {
      ...defaultHealerSetup(1),
      playerName: 'HealerPlayer',
      groups: ['Right Stack', 'Anchor'],
    };
    roster.dpsSlots[0] = {
      slotNumber: 1,
      playerName: 'DPSPlayer',
      groups: ['Left Stack', 'Slayer', 'Portal'],
    };

    const encoded = await encodeRosterToURL(roster);
    expect(encoded).not.toBe('');

    const decoded = await decodeRosterFromURL(encoded);
    expect(decoded).not.toBeNull();

    expect(decoded!.tanks[0].groups).toEqual(['Left Stack', 'Portal']);
    expect(decoded!.healers[0].groups).toEqual(['Right Stack', 'Anchor']);
    expect(decoded!.dpsSlots[0].groups).toEqual(['Left Stack', 'Slayer', 'Portal']);
  });

  it('round-trips a single group on each role', async () => {
    const roster = createDefaultRoster();

    roster.tanks[0] = { ...defaultTankSetup(1), groups: ['Left Stack'] };
    roster.healers[0] = { ...defaultHealerSetup(1), groups: ['Right Stack'] };
    roster.dpsSlots[0] = { slotNumber: 1, groups: ['Left Stack'] };

    const decoded = await decodeRosterFromURL(await encodeRosterToURL(roster));
    expect(decoded).not.toBeNull();
    expect(decoded!.tanks[0].groups).toEqual(['Left Stack']);
    expect(decoded!.healers[0].groups).toEqual(['Right Stack']);
    expect(decoded!.dpsSlots[0].groups).toEqual(['Left Stack']);
  });
});
