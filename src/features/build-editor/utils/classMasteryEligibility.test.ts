import type { Build } from '../types/build.types';

import {
  CLASS_MASTERY_MAX_PICKS,
  getClassMasteryGate,
  isClassMasteryEligible,
} from './classMasteryEligibility';

type Lines = Build['classSkillLines'];

describe('classMasteryEligibility', () => {
  it('allows a pure-class build (all three own-class lines)', () => {
    const lines: Lines = ['class.ardent-flame', 'class.draconic-power', 'class.earthen-heart'];
    expect(getClassMasteryGate('dragonknight', lines)).toEqual({ eligible: true });
  });

  it('allows empty slots (own class or empty)', () => {
    expect(getClassMasteryGate('dragonknight', [null, null, null])).toEqual({ eligible: true });
    expect(getClassMasteryGate('dragonknight', ['class.ardent-flame', null, null])).toEqual({
      eligible: true,
    });
  });

  it('blocks when any slot holds another class line (subclassed)', () => {
    const lines: Lines = ['class.ardent-flame', 'class.draconic-power', 'class.dark-magic'];
    expect(getClassMasteryGate('dragonknight', lines)).toEqual({
      eligible: false,
      reason: 'subclassed',
    });
  });

  it('blocks all-foreign lines even when consistent with each other', () => {
    const lines: Lines = ['class.dark-magic', 'class.daedric-summoning', 'class.storm-calling'];
    expect(isClassMasteryEligible('dragonknight', lines)).toBe(false);
  });

  it('blocks any-class builds (no concrete class to source passives from)', () => {
    expect(getClassMasteryGate('any-class', [null, null, null])).toEqual({
      eligible: false,
      reason: 'no-class',
    });
  });

  it('matches the in-game 2-of-5 pick rule', () => {
    expect(CLASS_MASTERY_MAX_PICKS).toBe(2);
  });
});
