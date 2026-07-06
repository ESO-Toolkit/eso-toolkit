import type { ClassAnalysisResult } from '@/utils/classDetectionUtils';

import { getClassMasteryPicks, getCompanionClassMasteryPicks } from '../classMasteryPicks';

// Canonical Class Mastery ability ids (from classSkillIds.ts / classMastery.ts).
const NB_AN_EYE = 263604; // "An Eye for Exploitation"
const NB_ABOVE_AND_BEYOND = 263605; // "Above and Beyond"
const SORC_CONSERVATION = 263870; // "Conservation of Energy"
const SORC_FONT = 263871; // "Font of Power"
const SORC_STATIC = 263872; // "Static Reverberation"
const SORC_CALCULATED = 263873; // "Calculated Defense"
// Effect/proc ids the live detection name-matches into the Class Mastery line
// but that are NOT canonical passive ids (the real over-detection seen on
// Showers-in-Petals). They must be filtered out, never rendered.
const NOISE_A = 264991;
const NOISE_B = 268274;

type SkillLineEntry = ClassAnalysisResult['skillLines'][number];

const cmEntry = (className: string, ids: number[]): SkillLineEntry => ({
  skillLine: 'Class Mastery',
  className,
  count: ids.length,
  skillIds: new Set(ids),
});

const analysis = (lines: SkillLineEntry[]): ClassAnalysisResult => ({
  primary: lines[0]?.skillLine ?? null,
  skillLines: lines,
});

describe('getClassMasteryPicks', () => {
  it('resolves two picks to their named passives (Bögyike: Nightblade)', () => {
    const result = getClassMasteryPicks(
      analysis([cmEntry('Nightblade', [NB_ABOVE_AND_BEYOND, NB_AN_EYE])]),
    );

    expect(result.className).toBe('Nightblade');
    expect(result.picks.map((p) => p.name)).toEqual([
      'Above and Beyond',
      'An Eye for Exploitation',
    ]);
    // Each pick carries the renderable fields the card needs.
    expect(result.picks[0]).toMatchObject({
      id: NB_ABOVE_AND_BEYOND,
      name: 'Above and Beyond',
    });
    expect(result.picks[0].icon).toBeTruthy();
    expect(result.picks[0].description).toBeTruthy();
  });

  it('handles a single surfaced pick gracefully', () => {
    const result = getClassMasteryPicks(analysis([cmEntry('Nightblade', [NB_AN_EYE])]));

    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].name).toBe('An Eye for Exploitation');
  });

  it('caps over-detection at 2 — three valid ids resolve to exactly two picks', () => {
    const result = getClassMasteryPicks(
      analysis([cmEntry('Sorcerer', [SORC_CONSERVATION, SORC_FONT, SORC_STATIC])]),
    );

    expect(result.picks).toHaveLength(2);
    expect(result.picks.map((p) => p.id)).toEqual([SORC_CONSERVATION, SORC_FONT]);
  });

  it('drops name-matched effect ids that are not canonical picks (Showers-in-Petals shape)', () => {
    // Detection returns [263873, 264991, 268274]; only 263873 is a real pick.
    const result = getClassMasteryPicks(
      analysis([cmEntry('Sorcerer', [SORC_CALCULATED, NOISE_A, NOISE_B])]),
    );

    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].name).toBe('Calculated Defense');
  });

  it('never resolves more than two even with noise mixed into valid ids', () => {
    const result = getClassMasteryPicks(
      analysis([
        cmEntry('Sorcerer', [SORC_CONSERVATION, NOISE_A, SORC_FONT, NOISE_B, SORC_STATIC]),
      ]),
    );

    expect(result.picks.length).toBeLessThanOrEqual(2);
    expect(result.picks).toHaveLength(2);
  });

  it('returns nothing when there is no Class Mastery line (subclassed player)', () => {
    const subclassed = analysis([
      { skillLine: 'Assassination', className: 'Nightblade', count: 4, skillIds: new Set([1, 2]) },
      { skillLine: 'Daedric Summoning', className: 'Sorcerer', count: 3, skillIds: new Set([3]) },
    ]);

    expect(getClassMasteryPicks(subclassed)).toEqual({ className: '', picks: [] });
  });

  it('returns nothing for missing analysis', () => {
    expect(getClassMasteryPicks(undefined)).toEqual({ className: '', picks: [] });
  });

  it('returns nothing when the Class Mastery line holds only foreign/noise ids', () => {
    expect(getClassMasteryPicks(analysis([cmEntry('Sorcerer', [NOISE_A, NOISE_B])])).picks).toEqual(
      [],
    );
  });

  it('drops ids that belong to a different class than the detected owner', () => {
    // Nightblade ids under a Sorcerer Class Mastery entry are not Sorcerer picks.
    const result = getClassMasteryPicks(
      analysis([cmEntry('Sorcerer', [NB_ABOVE_AND_BEYOND, NB_AN_EYE])]),
    );

    expect(result.picks).toEqual([]);
  });
});

describe('getCompanionClassMasteryPicks (live-client capture, preferred over the log)', () => {
  it('resolves the true two purchased picks, deriving the class from the ids alone', () => {
    const result = getCompanionClassMasteryPicks([SORC_STATIC, SORC_CALCULATED]);

    expect(result.className).toBe('Sorcerer');
    expect(result.picks.map((p) => p.name)).toEqual(['Static Reverberation', 'Calculated Defense']);
    expect(result.picks[0].icon).toBeTruthy();
    expect(result.picks[0].description).toBeTruthy();
  });

  it('recovers the full pair the encounter log under-reports (log often surfaces only one)', () => {
    const result = getCompanionClassMasteryPicks([NB_AN_EYE, NB_ABOVE_AND_BEYOND]);

    expect(result.picks).toHaveLength(2);
    expect(result.picks.map((p) => p.id)).toEqual([NB_AN_EYE, NB_ABOVE_AND_BEYOND]);
  });

  it('caps at two and drops non-canonical noise ids', () => {
    const result = getCompanionClassMasteryPicks([
      SORC_CONSERVATION,
      NOISE_A,
      SORC_FONT,
      SORC_STATIC,
    ]);

    expect(result.picks).toHaveLength(2);
    expect(result.picks.map((p) => p.id)).toEqual([SORC_CONSERVATION, SORC_FONT]);
  });

  it('returns nothing for empty, undefined, or all-noise input', () => {
    expect(getCompanionClassMasteryPicks(undefined)).toEqual({ className: '', picks: [] });
    expect(getCompanionClassMasteryPicks([])).toEqual({ className: '', picks: [] });
    expect(getCompanionClassMasteryPicks([NOISE_A, NOISE_B])).toEqual({ className: '', picks: [] });
  });
});
