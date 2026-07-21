import { shouldShowLandingFx } from './landingFx';

describe('shouldShowLandingFx', () => {
  it('shows effects on high and medium tiers without reduced motion', () => {
    expect(shouldShowLandingFx('high', false)).toBe(true);
    expect(shouldShowLandingFx('medium', false)).toBe(true);
  });

  it('hides effects on the low tier regardless of motion preference', () => {
    expect(shouldShowLandingFx('low', false)).toBe(false);
    expect(shouldShowLandingFx('low', true)).toBe(false);
  });

  it('hides effects under OS reduced motion regardless of tier', () => {
    expect(shouldShowLandingFx('high', true)).toBe(false);
    expect(shouldShowLandingFx('medium', true)).toBe(false);
  });
});
