/**
 * SkillSelector adoption / parity test (Section B3b).
 *
 * Verifies the loadout skill editor now delegates to the shared SkillBarPicker
 * (src/components/skills) and that an edit flows back into an `updateSkills`
 * dispatch carrying the full SkillsConfig — so the persisted skills (and the
 * Wizard's Wardrobe export) are unaffected by the editor swap.
 */
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';

import loadoutReducer, { updateSkills } from '../store/loadoutSlice';
import type { SkillsConfig } from '../types/loadout.types';

import { SkillSelector } from './SkillSelector';

// Stub the shared bar editor: expose its onChange so we can drive an edit
// deterministically while asserting the real prop contract (skills /
// selectedClassLineIds / onChange) the wrapper passes.
const NEXT_SKILLS: SkillsConfig = { 0: { 3: 12345 }, 1: {} };
let capturedProps: {
  skills: SkillsConfig;
  selectedClassLineIds: readonly (string | null)[];
} | null = null;
jest.mock('@/components/skills/SkillBarPicker', () => ({
  SkillBarPicker: ({
    skills,
    selectedClassLineIds,
    onChange,
  }: {
    skills: SkillsConfig;
    selectedClassLineIds: readonly (string | null)[];
    onChange: (updated: SkillsConfig) => void;
  }) => {
    capturedProps = { skills, selectedClassLineIds };
    return (
      <button type="button" data-testid="skillbar-change" onClick={() => onChange(NEXT_SKILLS)}>
        edit skills
      </button>
    );
  },
}));

const renderSkillSelector = (skills: SkillsConfig = { 0: {}, 1: {} }) => {
  const store = configureStore({ reducer: { loadout: loadoutReducer } });
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  const utils = render(
    <Provider store={store}>
      <SkillSelector skills={skills} trialId="GEN" pageIndex={0} setupIndex={0} />
    </Provider>,
  );
  return { store, dispatchSpy, ...utils };
};

describe('SkillSelector — shared SkillBarPicker adoption', () => {
  beforeEach(() => {
    capturedProps = null;
  });

  it('renders the shared SkillBarPicker with the setup skills and no class context', () => {
    const skills: SkillsConfig = { 0: { 3: 999 }, 1: {} };
    renderSkillSelector(skills);
    expect(screen.getByTestId('skillbar-change')).toBeInTheDocument();
    expect(capturedProps?.skills).toEqual(skills);
    // Loadout setups carry no class info → all three class-line slots are null.
    expect(capturedProps?.selectedClassLineIds).toEqual([null, null, null]);
  });

  it('dispatches updateSkills with the full SkillsConfig on edit (WW export parity)', () => {
    const { dispatchSpy } = renderSkillSelector();

    fireEvent.click(screen.getByTestId('skillbar-change'));

    expect(dispatchSpy).toHaveBeenCalledWith(
      updateSkills({ trialId: 'GEN', pageIndex: 0, setupIndex: 0, skills: NEXT_SKILLS }),
    );
  });
});
