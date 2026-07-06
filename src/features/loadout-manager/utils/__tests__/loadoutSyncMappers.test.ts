import type { SavedLoadout } from '@/store/saved_loadouts';

import type { UserLoadoutRow } from '../../types/loadout-sync.types';
import {
  contentFingerprint,
  isSyncablePayload,
  mergeLoadoutsByNewest,
  partitionByOwner,
  purgeDeleted,
  rowToSavedLoadout,
  sameLibrary,
  savedLoadoutToPayload,
  selectOutgoing,
  stampOwner,
} from '../loadoutSyncMappers';

function makeSavedLoadout(overrides: Partial<SavedLoadout> = {}): SavedLoadout {
  return {
    id: 'abc123',
    name: 'My DPS',
    description: 'Single-target',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    setup: {
      name: 'My DPS',
      disabled: false,
      condition: { boss: 'Yandir' },
      skills: { 0: { 3: 28800 }, 1: {} },
      cp: {},
      food: {},
      gear: { 0: { id: '1', link: '|H0:item:1:|h|h' } },
      code: '',
    },
    meta: { trialId: 'DSR', characterName: 'Hero' },
    ...overrides,
  };
}

describe('savedLoadoutToPayload', () => {
  it('flattens provenance into columns and serializes the rest into loadout_data', () => {
    const payload = savedLoadoutToPayload(makeSavedLoadout());
    expect(payload.id).toBe('abc123');
    expect(payload.name).toBe('My DPS');
    expect(payload.description).toBe('Single-target');
    expect(payload.trial_id).toBe('DSR');
    expect(payload.character_name).toBe('Hero');
    expect(payload.client_updated_at).toBe('2026-06-10T00:00:00.000Z');
    const blob = JSON.parse(payload.loadout_data);
    expect(blob.setup.gear[0].link).toBe('|H0:item:1:|h|h');
    expect(blob.updatedAt).toBe('2026-06-10T00:00:00.000Z');
  });

  it('defaults missing optional fields', () => {
    const payload = savedLoadoutToPayload(
      makeSavedLoadout({ description: undefined, meta: undefined }),
    );
    expect(payload.description).toBe('');
    expect(payload.trial_id).toBe('');
    expect(payload.character_name).toBe('');
  });

  it('clamps over-cap fields to the server limits so one entry cannot 400 the batch', () => {
    const payload = savedLoadoutToPayload(
      makeSavedLoadout({
        name: 'n'.repeat(250),
        description: 'd'.repeat(900),
        meta: { trialId: 't'.repeat(120), characterName: 'c'.repeat(120) },
      }),
    );
    expect(payload.name).toHaveLength(100);
    expect(payload.description).toHaveLength(500);
    expect(payload.trial_id).toHaveLength(64);
    expect(payload.character_name).toHaveLength(64);
  });

  it('carries a fixed-width hex content_fingerprint matching the helper', () => {
    const payload = savedLoadoutToPayload(makeSavedLoadout());
    expect(payload.content_fingerprint).toMatch(/^[0-9a-f]{14}$/);
    expect(payload.content_fingerprint).toBe(
      contentFingerprint(payload.name, payload.description, payload.loadout_data),
    );
  });

  it('trims name/description so the fingerprint matches what the server stores (no churn)', () => {
    // The worker stores cleanText(name) = name.trim(); fingerprinting the untrimmed value
    // would make a whitespace-padded name re-push on every sync. Trimming here keeps the
    // sent value and the fingerprint byte-identical to the server's stored row.
    const clean = savedLoadoutToPayload(makeSavedLoadout({ name: 'My DPS', description: 'x' }));
    const padded = savedLoadoutToPayload(
      makeSavedLoadout({ name: '  My DPS  ', description: '  x  ' }),
    );
    expect(padded.name).toBe('My DPS');
    expect(padded.description).toBe('x');
    expect(padded.content_fingerprint).toBe(clean.content_fingerprint);
  });

  it('normalizes a clamp-boundary space so a >cap name stays convergent', () => {
    // 99 'a's + a space at index 99 + trailing chars: clamping to 100 would leave a
    // trailing space the server's cleanText strips, re-diverging the fingerprint — the
    // trailing trim removes it so the sent value is idempotent under cleanText.
    const longName = 'a'.repeat(99) + ' ' + 'b'.repeat(20);
    const payload = savedLoadoutToPayload(makeSavedLoadout({ name: longName }));
    expect(payload.name).toBe('a'.repeat(99));
    expect(payload.name).toBe(payload.name.trim()); // idempotent under the worker's trim
    expect(payload.content_fingerprint).toBe(
      contentFingerprint(payload.name, payload.description, payload.loadout_data),
    );
  });
});

describe('contentFingerprint', () => {
  it('is deterministic and fixed-width (14-char) hex', () => {
    const a = contentFingerprint('name', 'desc', '{"x":1}');
    const b = contentFingerprint('name', 'desc', '{"x":1}');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{14}$/);
  });

  it('changes when any compared field changes', () => {
    const base = contentFingerprint('name', 'desc', '{"x":1}');
    expect(contentFingerprint('NAME', 'desc', '{"x":1}')).not.toBe(base);
    expect(contentFingerprint('name', 'DESC', '{"x":1}')).not.toBe(base);
    expect(contentFingerprint('name', 'desc', '{"x":2}')).not.toBe(base);
  });

  it('is not fooled by shifting a field boundary (fields are JSON-encoded)', () => {
    // A naive concatenation would make ("ab","c") and ("a","bc") collide; JSON.stringify
    // keeps the boundaries unambiguous.
    expect(contentFingerprint('ab', 'c', 'd')).not.toBe(contentFingerprint('a', 'bc', 'd'));
  });
});

describe('isSyncablePayload', () => {
  const now = Date.parse('2026-06-10T00:00:00.000Z');
  const base = () =>
    savedLoadoutToPayload(makeSavedLoadout({ updatedAt: '2026-06-09T00:00:00.000Z' }));

  it('accepts a normal payload', () => {
    expect(isSyncablePayload(base(), now)).toBe(true);
  });

  it('rejects a future client_updated_at beyond clock skew', () => {
    expect(
      isSyncablePayload({ ...base(), client_updated_at: '2026-06-10T01:00:00.000Z' }, now),
    ).toBe(false);
  });

  it('accepts a slightly-future timestamp within clock skew', () => {
    expect(
      isSyncablePayload({ ...base(), client_updated_at: '2026-06-10T00:04:00.000Z' }, now),
    ).toBe(true);
  });

  it('rejects a malformed timestamp', () => {
    expect(isSyncablePayload({ ...base(), client_updated_at: 'not-a-date' }, now)).toBe(false);
  });

  it('rejects oversized loadout_data', () => {
    expect(isSyncablePayload({ ...base(), loadout_data: 'x'.repeat(20_001) }, now)).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(isSyncablePayload({ ...base(), name: '   ' }, now)).toBe(false);
  });
});

describe('rowToSavedLoadout', () => {
  function rowFrom(loadout: SavedLoadout): UserLoadoutRow {
    const p = savedLoadoutToPayload(loadout);
    return {
      id: p.id,
      user_id: 'u1',
      name: p.name,
      description: p.description,
      trial_id: p.trial_id,
      character_name: p.character_name,
      loadout_data: p.loadout_data,
      client_updated_at: p.client_updated_at,
      content_fingerprint: p.content_fingerprint,
      created_at: '2026-06-01 00:00:00',
      updated_at: '2026-06-10 00:00:00',
    };
  }

  it('round-trips a payload back to an equivalent SavedLoadout', () => {
    const original = makeSavedLoadout();
    const restored = rowToSavedLoadout(rowFrom(original));
    expect(restored).not.toBeNull();
    expect(restored).toEqual(original);
  });

  it('returns null for an unparseable blob', () => {
    const row = rowFrom(makeSavedLoadout());
    expect(rowToSavedLoadout({ ...row, loadout_data: 'not json' })).toBeNull();
  });

  it('returns null when the blob has no setup', () => {
    const row = rowFrom(makeSavedLoadout());
    expect(rowToSavedLoadout({ ...row, loadout_data: JSON.stringify({ meta: {} }) })).toBeNull();
  });
});

describe('mergeLoadoutsByNewest', () => {
  it('keeps the newer side for shared ids and unions disjoint ids', () => {
    const localOld = makeSavedLoadout({
      id: 'shared',
      name: 'Local',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
    const remoteNew = makeSavedLoadout({
      id: 'shared',
      name: 'Remote',
      updatedAt: '2026-06-09T00:00:00.000Z',
    });
    const localOnly = makeSavedLoadout({ id: 'local-only', updatedAt: '2026-06-05T00:00:00.000Z' });
    const remoteOnly = makeSavedLoadout({
      id: 'remote-only',
      updatedAt: '2026-06-08T00:00:00.000Z',
    });

    const merged = mergeLoadoutsByNewest([localOld, localOnly], [remoteNew, remoteOnly]);

    const byId = new Map(merged.map((l) => [l.id, l]));
    expect(byId.get('shared')?.name).toBe('Remote'); // newer remote wins
    expect(byId.size).toBe(3);
    // sorted newest-first
    expect(merged[0].id).toBe('shared');
  });

  it('local wins when it is strictly newer', () => {
    const localNew = makeSavedLoadout({
      id: 's',
      name: 'Local',
      updatedAt: '2026-06-20T00:00:00.000Z',
    });
    const remoteOld = makeSavedLoadout({
      id: 's',
      name: 'Remote',
      updatedAt: '2026-06-10T00:00:00.000Z',
    });
    const merged = mergeLoadoutsByNewest([localNew], [remoteOld]);
    expect(merged[0].name).toBe('Local');
  });

  it('breaks an exact-timestamp tie deterministically by content (convergent both ways)', () => {
    const ts = '2026-06-10T00:00:00.000Z';
    const a = makeSavedLoadout({ id: 'x', name: 'AAA', updatedAt: ts });
    const b = makeSavedLoadout({ id: 'x', name: 'zzz', updatedAt: ts });
    // The greater content fingerprint (the exact value the server compares) survives,
    // and it's the same winner regardless of argument order — so two devices that
    // diverged at the same millisecond converge instead of one silently dropping its edit.
    const expected =
      savedLoadoutToPayload(b).content_fingerprint >= savedLoadoutToPayload(a).content_fingerprint
        ? 'zzz'
        : 'AAA';
    expect(mergeLoadoutsByNewest([a], [b])[0].name).toBe(expected);
    expect(mergeLoadoutsByNewest([b], [a])[0].name).toBe(expected);
  });
});

describe('selectOutgoing', () => {
  it('drops rows identical to the just-pulled server slice (pull-only sync pushes nothing)', () => {
    const server = [
      makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' }),
      makeSavedLoadout({ id: 'b', updatedAt: '2026-06-11T00:00:00.000Z' }),
    ];
    // merged === server (new device: no local rows, library is the pulled set)
    expect(selectOutgoing(server, server)).toEqual([]);
  });

  it('keeps locally new ids and rows strictly newer than the server copy', () => {
    const server = [makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' })];
    const newer = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-20T00:00:00.000Z' });
    const brandNew = makeSavedLoadout({ id: 'c', updatedAt: '2026-06-05T00:00:00.000Z' });
    const out = selectOutgoing([newer, brandNew], server);
    expect(out.map((l) => l.id).sort()).toEqual(['a', 'c']);
  });

  it('drops a local row older than the server copy (server already has newer)', () => {
    const server = [makeSavedLoadout({ id: 'a', updatedAt: '2026-06-20T00:00:00.000Z' })];
    const stale = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-01T00:00:00.000Z' });
    expect(selectOutgoing([stale], server)).toEqual([]);
  });

  it('does not push an equal-timestamp row with identical content (already synced)', () => {
    const server = [makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' })];
    const identical = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' });
    expect(selectOutgoing([identical], server)).toEqual([]);
  });

  it('pushes an equal-timestamp divergent edit only when its content wins the tie-break', () => {
    const ts = '2026-06-10T00:00:00.000Z';
    const a = makeSavedLoadout({ id: 'a', name: 'AAA', updatedAt: ts });
    const b = makeSavedLoadout({ id: 'a', name: 'zzz', updatedAt: ts });
    // The greater fingerprint is the deterministic winner the server keeps. The winning
    // local row is pushed (so the server adopts it); the losing local row is not (the
    // server already holds the winner) — no ping-pong, devices converge.
    const [winner, loser] =
      savedLoadoutToPayload(a).content_fingerprint > savedLoadoutToPayload(b).content_fingerprint
        ? [a, b]
        : [b, a];
    expect(selectOutgoing([winner], [loser]).map((l) => l.id)).toEqual(['a']);
    expect(selectOutgoing([loser], [winner])).toEqual([]);
  });
});

describe('purgeDeleted', () => {
  it('removes a loadout older-or-equal to its tombstone (delete wins)', () => {
    const a = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' });
    const b = makeSavedLoadout({ id: 'b', updatedAt: '2026-06-10T00:00:00.000Z' });
    const tombstones = new Map([['b', '2026-06-12T00:00:00.000Z']]);
    expect(purgeDeleted([a, b], tombstones).map((l) => l.id)).toEqual(['a']);
  });
  it('keeps a local edit strictly newer than its tombstone (revive)', () => {
    const b = makeSavedLoadout({ id: 'b', updatedAt: '2026-06-20T00:00:00.000Z' });
    const tombstones = new Map([['b', '2026-06-12T00:00:00.000Z']]);
    expect(purgeDeleted([b], tombstones).map((l) => l.id)).toEqual(['b']);
  });
  it('returns the same list when there are no tombstones', () => {
    const list = [makeSavedLoadout({ id: 'a' })];
    expect(purgeDeleted(list, new Map())).toBe(list);
  });
});

describe('stampOwner / partitionByOwner', () => {
  it('stamps owner and is identity-preserving when unchanged', () => {
    const a = makeSavedLoadout({ id: 'a' });
    const stamped = stampOwner([a], 'u1');
    expect(stamped[0].ownerUserId).toBe('u1');
    // already-owned entries are returned as-is (no needless new object)
    const again = stampOwner(stamped, 'u1');
    expect(again[0]).toBe(stamped[0]);
  });

  it('partitions into the current user (own + unowned) vs other accounts', () => {
    const unowned = makeSavedLoadout({ id: 'g' });
    const mineOwned = makeSavedLoadout({ id: 'm', ownerUserId: 'u1' });
    const other = makeSavedLoadout({ id: 'o', ownerUserId: 'u2' });
    const { mine, others } = partitionByOwner([unowned, mineOwned, other], 'u1');
    expect(mine.map((l) => l.id).sort()).toEqual(['g', 'm']);
    expect(others.map((l) => l.id)).toEqual(['o']);
  });

  it('leaves unowned loadouts out of "mine" when claimUnowned is false', () => {
    const unowned = makeSavedLoadout({ id: 'g' });
    const mineOwned = makeSavedLoadout({ id: 'm', ownerUserId: 'u1' });
    const { mine, others } = partitionByOwner([unowned, mineOwned], 'u1', false);
    expect(mine.map((l) => l.id)).toEqual(['m']);
    expect(others.map((l) => l.id)).toEqual(['g']);
  });
});

describe('sameLibrary', () => {
  it('is true for the same ids + updatedAt regardless of order', () => {
    const a = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' });
    const b = makeSavedLoadout({ id: 'b', updatedAt: '2026-06-11T00:00:00.000Z' });
    expect(sameLibrary([a, b], [b, a])).toBe(true);
  });
  it('is false when an updatedAt changed (an edit happened)', () => {
    const a1 = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-10T00:00:00.000Z' });
    const a2 = makeSavedLoadout({ id: 'a', updatedAt: '2026-06-12T00:00:00.000Z' });
    expect(sameLibrary([a1], [a2])).toBe(false);
  });
  it('is false when the set of ids differs', () => {
    expect(sameLibrary([makeSavedLoadout({ id: 'a' })], [])).toBe(false);
  });
});
