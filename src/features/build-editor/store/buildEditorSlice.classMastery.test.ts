import { getClassMasteryLine } from '@/data/skill-lines/class/classMastery';

import reducer, {
  setBuildClass,
  setClassMasteryPassives,
  toggleClassMasteryPassive,
} from './buildEditorSlice';
import type { BuildEditorState } from './buildEditorSlice';

const dkIds = (getClassMasteryLine('dragonknight')?.skills ?? []).map((s) => s.id);
const sorcIds = (getClassMasteryLine('sorcerer')?.skills ?? []).map((s) => s.id);

/** Fresh state via an unknown action (initialState defaults to dragonknight). */
const freshState = (): BuildEditorState => reducer(undefined, { type: '@@test/init' });

describe('buildEditorSlice — Class Mastery', () => {
  it('exposes five passives per class in the data', () => {
    expect(dkIds).toHaveLength(5);
    expect(sorcIds).toHaveLength(5);
  });

  it('toggles a pick on and off', () => {
    let state = freshState();
    state = reducer(state, toggleClassMasteryPassive(dkIds[0]));
    expect(state.build.classMasteryPassives).toEqual([dkIds[0]]);
    expect(state.isDirty).toBe(true);
    state = reducer(state, toggleClassMasteryPassive(dkIds[0]));
    expect(state.build.classMasteryPassives).toEqual([]);
  });

  it('caps picks at 2 of 5', () => {
    let state = freshState();
    state = reducer(state, toggleClassMasteryPassive(dkIds[0]));
    state = reducer(state, toggleClassMasteryPassive(dkIds[1]));
    state = reducer(state, toggleClassMasteryPassive(dkIds[2]));
    expect(state.build.classMasteryPassives).toEqual([dkIds[0], dkIds[1]]);
  });

  it('rejects picks from another class', () => {
    let state = freshState(); // dragonknight build
    state = reducer(state, toggleClassMasteryPassive(sorcIds[0]));
    expect(state.build.classMasteryPassives).toEqual([]);
  });

  it('rejects arbitrary ability ids', () => {
    let state = freshState();
    state = reducer(state, toggleClassMasteryPassive(123456));
    expect(state.build.classMasteryPassives).toEqual([]);
  });

  it('clears picks when the base class changes', () => {
    let state = freshState();
    state = reducer(state, toggleClassMasteryPassive(dkIds[0]));
    state = reducer(state, setBuildClass('sorcerer'));
    expect(state.build.classMasteryPassives).toEqual([]);
  });

  it('setClassMasteryPassives sanitizes: dedupes, drops foreign ids, caps at 2', () => {
    let state = freshState();
    state = reducer(
      state,
      setClassMasteryPassives([dkIds[0], dkIds[0], sorcIds[0], dkIds[1], dkIds[2]]),
    );
    expect(state.build.classMasteryPassives).toEqual([dkIds[0], dkIds[1]]);
  });

  it('tolerates builds restored without the field (pre-U50 localStorage)', () => {
    // Shallow-copy first — reducer results are frozen by Immer in dev
    const fresh = freshState();
    const state: BuildEditorState = { ...fresh, build: { ...fresh.build } };
    delete state.build.classMasteryPassives;
    const next = reducer(state, toggleClassMasteryPassive(dkIds[0]));
    expect(next.build.classMasteryPassives).toEqual([dkIds[0]]);
  });
});
