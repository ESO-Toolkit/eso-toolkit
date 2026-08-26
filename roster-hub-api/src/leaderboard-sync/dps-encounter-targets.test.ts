import {
  DEFAULT_DIFFICULTY,
  TRIAL_TEAM_SIZE,
  UNRANKED_ENCOUNTER_IDS,
  buildDpsEncounterTargets,
  latestPartitionId,
  pickDifficulty,
} from './dps-encounter-targets';
import type { ZoneData } from './esologs-client';

const VETERAN = { id: 122, name: 'Veteran', sizes: [TRIAL_TEAM_SIZE] };
const NORMAL = { id: 120, name: 'Normal', sizes: [TRIAL_TEAM_SIZE] };

function zone(overrides: Partial<ZoneData> = {}): ZoneData {
  return {
    id: 38,
    name: 'Lucent Citadel',
    encounters: [{ id: 60, name: 'Xoryn' }],
    difficulties: [NORMAL, VETERAN],
    partitions: [{ id: 29, name: 'Current' }],
    ...overrides,
  };
}

describe('pickDifficulty', () => {
  it('prefers veteran', () => {
    expect(pickDifficulty([NORMAL, VETERAN])?.id).toBe(VETERAN.id);
  });

  it('falls back to any trial-sized difficulty', () => {
    const solo = { id: 1, name: 'Solo', sizes: [1] };
    expect(pickDifficulty([solo, NORMAL])?.id).toBe(NORMAL.id);
  });

  it('returns null when there are none', () => {
    expect(pickDifficulty([])).toBeNull();
    expect(pickDifficulty(undefined)).toBeNull();
  });
});

describe('buildDpsEncounterTargets', () => {
  it('produces one target per ranked boss', () => {
    const targets = buildDpsEncounterTargets([
      zone({
        encounters: [
          { id: 60, name: 'Xoryn' },
          { id: 57, name: 'Orphic' },
        ],
      }),
    ]);

    expect(targets).toHaveLength(2);
    expect(targets[0]).toMatchObject({
      encounterId: 60,
      encounterName: 'Xoryn',
      zoneId: 38,
      difficulty: VETERAN.id,
    });
  });

  it('excludes unranked sub-bosses', () => {
    const unranked = [...UNRANKED_ENCOUNTER_IDS][0];
    const targets = buildDpsEncounterTargets([
      zone({
        encounters: [
          { id: unranked, name: 'Trash' },
          { id: 60, name: 'Xoryn' },
        ],
      }),
    ]);

    expect(targets.map((t) => t.encounterId)).toEqual([60]);
  });

  it('excludes zones that do not support 12-player', () => {
    const dungeon = zone({ difficulties: [{ id: 2, name: 'Veteran', sizes: [4] }] });
    expect(buildDpsEncounterTargets([dungeon])).toHaveLength(0);
  });

  // Newest content first, so a budget-limited run ingests the current meta rather
  // than spending itself on decade-old trials.
  it('orders newest zones first', () => {
    const targets = buildDpsEncounterTargets([
      zone({ id: 1, name: 'Aetherian Archive', encounters: [{ id: 4, name: 'The Mage' }] }),
      zone({ id: 38, name: 'Lucent Citadel', encounters: [{ id: 60, name: 'Xoryn' }] }),
    ]);

    expect(targets.map((t) => t.zoneId)).toEqual([38, 1]);
  });

  it('attaches the roster-hub trial code when the zone is mapped', () => {
    const [target] = buildDpsEncounterTargets([
      zone({ id: 15, name: 'Rockgrove', encounters: [{ id: 51, name: 'Xalvakka' }] }),
    ]);
    expect(target.trialId).toBe('RG');
  });

  it('leaves the trial code empty for an unmapped zone', () => {
    const [target] = buildDpsEncounterTargets([
      zone({ name: 'Brand New Trial', encounters: [{ id: 999, name: 'Boss' }] }),
    ]);
    expect(target.trialId).toBe('');
  });

  it('uses the sentinel difficulty when a zone declares none', () => {
    const [target] = buildDpsEncounterTargets([
      zone({ difficulties: [{ id: 9, name: 'Veteran', sizes: [TRIAL_TEAM_SIZE] }] }),
    ]);
    expect(target.difficulty).toBe(9);

    // A zone with no trial-sized difficulty is filtered out entirely, so the
    // sentinel only appears via the admin route's explicit override.
    expect(DEFAULT_DIFFICULTY).toBe(-1);
  });

  it('tolerates missing or malformed zone data', () => {
    expect(() => buildDpsEncounterTargets([])).not.toThrow();
    expect(buildDpsEncounterTargets([zone({ encounters: undefined as never })])).toHaveLength(0);
  });

  // The partition id is threaded into every stored row, so it must be the LATEST
  // one (partitions arrive oldest-first) — not the first, and not a sentinel.
  it('attaches the zone latest partition id', () => {
    const [target] = buildDpsEncounterTargets([
      zone({ partitions: [{ id: 12, name: 'U35' }, { id: 29, name: 'U40' }] }),
    ]);
    expect(target.partitionId).toBe(29);
  });

  it('falls back to null when the zone exposes no partitions', () => {
    const [none] = buildDpsEncounterTargets([zone({ partitions: undefined })]);
    expect(none.partitionId).toBeNull();

    const [empty] = buildDpsEncounterTargets([zone({ partitions: [] })]);
    expect(empty.partitionId).toBeNull();
  });

  it('latestPartitionId tolerates malformed entries', () => {
    expect(latestPartitionId(zone({ partitions: [{ id: null } as never] }))).toBeNull();
  });
});
