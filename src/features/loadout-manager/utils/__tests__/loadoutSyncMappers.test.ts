import type { SavedLoadout } from '@/store/saved_loadouts';

import type { UserLoadoutRow } from '../../types/loadout-sync.types';
import {
  mergeLoadoutsByNewest,
  purgeDeleted,
  rowToSavedLoadout,
  sameLibrary,
  savedLoadoutToPayload,
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
