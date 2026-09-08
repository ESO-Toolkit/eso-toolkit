import buildEditorReducer from '@/features/build-editor/store/buildEditorSlice';

import savedBuildsReducer, { clearSavedBuilds, upsertSavedBuild } from './savedBuildsSlice';

describe('savedBuilds upsert', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates an existing saved build in place instead of duplicating it', () => {
    const build = { ...buildEditorReducer(undefined, { type: 'test/initial' }).build, name: 'One' };
    const created = savedBuildsReducer(undefined, upsertSavedBuild({ id: 'saved-1', build }));

    jest.setSystemTime(new Date('2026-08-30T12:05:00.000Z'));
    const updatedBuild = { ...build, name: 'Two' };
    const updated = savedBuildsReducer(
      created,
      upsertSavedBuild({ id: 'saved-1', build: updatedBuild }),
    );

    expect(updated.builds).toHaveLength(1);
    expect(updated.builds[0]).toEqual({
      id: 'saved-1',
      savedAt: '2026-08-30T12:05:00.000Z',
      build: updatedBuild,
    });
  });

  it('creates a saved-build id when the editor has no existing target', () => {
    const build = buildEditorReducer(undefined, { type: 'test/initial' }).build;
    const state = savedBuildsReducer(undefined, upsertSavedBuild({ build }));

    expect(state.builds).toHaveLength(1);
    expect(state.builds[0]?.id).toEqual(expect.any(String));
    expect(state.builds[0]?.savedAt).toBe('2026-08-30T12:00:00.000Z');
  });

  it('clears account-bound builds while leaving durable cleanup retryable', () => {
    const build = buildEditorReducer(undefined, { type: 'test/initial' }).build;
    const saved = savedBuildsReducer(undefined, upsertSavedBuild({ build }));
    const cleared = savedBuildsReducer({ ...saved, hydrated: true }, clearSavedBuilds());

    expect(cleared).toEqual({ builds: [], hydrated: false });
  });
});
