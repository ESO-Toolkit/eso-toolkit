import reducer, {
  addSetup,
  deleteSetup,
  loadBuild,
  loadDraftBuild,
  markSaved,
  renameSetup,
  setAddonImportString,
  setDlc,
  setGuideBannerUrl,
  setGuideContent,
  setGuideYoutubeUrl,
  setVisibility,
} from './buildEditorSlice';

const ORIGINAL_TIME = '2026-08-29T12:00:00.000Z';
const MUTATION_TIME = '2026-08-30T12:00:00.000Z';

describe('build editor document mutation tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const cleanState = () => {
    jest.setSystemTime(new Date(ORIGINAL_TIME));
    return reducer(reducer(undefined, { type: 'test/init' }), markSaved());
  };

  it.each([
    ['addon import', setAddonImportString('addon-data')],
    ['guide content', setGuideContent('rotation notes')],
    ['guide video', setGuideYoutubeUrl('https://youtu.be/example')],
    ['guide banner', setGuideBannerUrl('https://example.com/banner.jpg')],
    ['visibility', setVisibility('private')],
    ['DLC', setDlc('Gold Road')],
    ['setup add', addSetup()],
    ['setup rename', renameSetup({ index: 0, name: 'Boss setup' })],
  ])('marks %s changes dirty and refreshes updatedAt', (_label, action) => {
    const state = cleanState();
    jest.setSystemTime(new Date(MUTATION_TIME));

    const next = reducer(state, action);

    expect(next.isDirty).toBe(true);
    expect(next.build.updatedAt).toBe(MUTATION_TIME);
  });

  it('marks setup deletion dirty and ignores invalid setup indices', () => {
    jest.setSystemTime(new Date(ORIGINAL_TIME));
    let state = reducer(undefined, { type: 'test/init' });
    state = reducer(state, addSetup());
    state = reducer(state, markSaved());
    const beforeInvalidDelete = state.build.updatedAt;

    jest.setSystemTime(new Date(MUTATION_TIME));
    const unchanged = reducer(state, deleteSetup(99));

    expect(unchanged.isDirty).toBe(false);
    expect(unchanged.build.updatedAt).toBe(beforeInvalidDelete);

    const deleted = reducer(state, deleteSetup(1));
    expect(deleted.build.setups).toHaveLength(1);
    expect(deleted.isDirty).toBe(true);
    expect(deleted.build.updatedAt).toBe(MUTATION_TIME);
  });

  it('distinguishes durable saved builds from transient imports', () => {
    const build = { ...cleanState().build, name: 'Imported document' };

    expect(reducer(undefined, loadDraftBuild(build)).isDirty).toBe(true);
    expect(reducer(undefined, loadBuild(build)).isDirty).toBe(false);
  });
});
