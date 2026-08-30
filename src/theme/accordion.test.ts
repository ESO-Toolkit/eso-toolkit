import {
  ACCORDION_GAP_PX,
  accordionDefaultProps,
  accordionSpacingStyleOverrides,
} from './accordion';

describe('accordionSpacingStyleOverrides', () => {
  it('disables MUI expansion gutters globally', () => {
    expect(accordionDefaultProps).toEqual({ disableGutters: true });
  });

  it('keeps consecutive accordions separated in collapsed and expanded states', () => {
    expect(accordionSpacingStyleOverrides).toEqual({
      '& + &': { marginTop: ACCORDION_GAP_PX },
      '& + &.Mui-expanded': { marginTop: ACCORDION_GAP_PX },
    });
  });
});
