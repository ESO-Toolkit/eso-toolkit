import { describe, expect, it } from 'vitest';
import { decodeRosterData } from './decoder';

/**
 * Encode an object the same way the frontend does: JSON → deflate-raw → base64url.
 * Mirrors the wire format the decoder consumes.
 */
async function encodeRoster(obj: unknown): Promise<string> {
  const json = JSON.stringify(obj);
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  void writer.write(new TextEncoder().encode(json));
  void writer.close();
  const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
  let bin = '';
  for (const b of compressed) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('decodeRosterData — composition', () => {
  it('defaults a blank v3 roster to 2/2/8 even with no filled slots', async () => {
    // The encoder omits `co` when it equals the default and omits empty slot
    // arrays — exactly the "seeking signups" payload.
    const data = await encodeRoster({ v: 3 });
    const decoded = await decodeRosterData(data);
    expect(decoded.composition).toEqual({ tanks: 2, healers: 2, dps: 8 });
    expect(decoded.tanks).toHaveLength(0);
    expect(decoded.healers).toHaveLength(0);
    expect(decoded.dps).toHaveLength(0);
  });

  it('reads an explicit v3 composition that excludes a role', async () => {
    const data = await encodeRoster({ v: 3, co: [2, 0, 8] });
    const decoded = await decodeRosterData(data);
    expect(decoded.composition).toEqual({ tanks: 2, healers: 0, dps: 8 });
  });

  it('clamps an out-of-range composition to the hard caps', async () => {
    const data = await encodeRoster({ v: 3, co: [9, 9, 99] });
    const decoded = await decodeRosterData(data);
    expect(decoded.composition).toEqual({ tanks: 4, healers: 4, dps: 24 });
  });

  it('defaults a legacy v2 roster to 2/2/8', async () => {
    const data = await encodeRoster({ v: 2, t1: { pn: 'Tanky' } });
    const decoded = await decodeRosterData(data);
    expect(decoded.composition).toEqual({ tanks: 2, healers: 2, dps: 8 });
    expect(decoded.tanks[0]?.playerName).toBe('Tanky');
  });

  it('rejects unsupported roster versions', async () => {
    const data = await encodeRoster({ v: 99 });
    await expect(decodeRosterData(data)).rejects.toThrow(/Unsupported roster version/);
  });
});
