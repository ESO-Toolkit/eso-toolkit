import type { CompanionSnapshot } from '@/features/loadout-manager/utils/esotkCompanionParser';

import companionReducer, {
  companionCleared,
  companionSnapshotsUploaded,
  type CompanionState,
} from './companionSlice';

const snap = (char: string): CompanionSnapshot => ({ ts: 1, char });

describe('companionSlice', () => {
  const initial: CompanionState = { snapshots: [], upload: { snapshotCount: 0 } };

  it('stores uploaded snapshots and upload meta', () => {
    const snaps = [snap('A'), snap('B')];
    const state = companionReducer(
      initial,
      companionSnapshotsUploaded({
        snapshots: snaps,
        fileName: 'ESOTKCompanion.lua',
        snapshotCount: 2,
      }),
    );
    expect(state.snapshots).toBe(snaps);
    expect(state.upload).toEqual({
      fileName: 'ESOTKCompanion.lua',
      snapshotCount: 2,
      error: undefined,
    });
  });

  it('records an error with no snapshots', () => {
    const state = companionReducer(
      initial,
      companionSnapshotsUploaded({
        snapshots: [],
        fileName: 'bad.lua',
        snapshotCount: 0,
        error: 'No ESOTK Companion snapshots found',
      }),
    );
    expect(state.snapshots).toEqual([]);
    expect(state.upload.error).toBe('No ESOTK Companion snapshots found');
  });

  it('clears back to the initial state', () => {
    const populated: CompanionState = {
      snapshots: [snap('A')],
      upload: { fileName: 'x', snapshotCount: 1 },
    };
    expect(companionReducer(populated, companionCleared())).toEqual(initial);
  });
});
