import {
  DROPDOWN_MENU_ORIGINS_DOWN,
  DROPDOWN_MENU_ORIGINS_UP,
  computeMenuPlacement,
  dropdownMenuOrigins,
  shouldFlipMenuUp,
} from './dropdownMenu';

describe('dropdownMenuOrigins', () => {
  it('opens downward by default (anchor bottom → transform top)', () => {
    expect(dropdownMenuOrigins(false)).toBe(DROPDOWN_MENU_ORIGINS_DOWN);
    expect(DROPDOWN_MENU_ORIGINS_DOWN.anchorOrigin).toEqual({
      vertical: 'bottom',
      horizontal: 'left',
    });
    expect(DROPDOWN_MENU_ORIGINS_DOWN.transformOrigin).toEqual({
      vertical: 'top',
      horizontal: 'left',
    });
  });

  it('opens upward when flipped (anchor top → transform bottom)', () => {
    expect(dropdownMenuOrigins(true)).toBe(DROPDOWN_MENU_ORIGINS_UP);
    expect(DROPDOWN_MENU_ORIGINS_UP.anchorOrigin).toEqual({ vertical: 'top', horizontal: 'left' });
    expect(DROPDOWN_MENU_ORIGINS_UP.transformOrigin).toEqual({
      vertical: 'bottom',
      horizontal: 'left',
    });
  });
});

describe('computeMenuPlacement', () => {
  const makeAnchor = (top: number, bottom: number): HTMLElement =>
    ({
      getBoundingClientRect: () => ({ top, bottom }) as DOMRect,
    }) as HTMLElement;

  const setViewportHeight = (height: number): void => {
    Object.defineProperty(window, 'innerHeight', {
      value: height,
      configurable: true,
      writable: true,
    });
  };

  it('opens downward and caps to the room below when there is ample room', () => {
    setViewportHeight(1000);
    // spaceBelow = 1000 - 130 - 20 = 850
    const placement = computeMenuPlacement(makeAnchor(100, 130));
    expect(placement.menuUp).toBe(false);
    expect(placement.maxHeight).toBe(850);
  });

  it('caps a tall menu to the room below rather than letting it overflow', () => {
    setViewportHeight(690);
    // field high on the page: spaceBelow = 690 - 302 - 20 = 368; a 535px menu must
    // be capped to 368 so it scrolls below the field instead of shifting up over it.
    const placement = computeMenuPlacement(makeAnchor(269, 302));
    expect(placement.menuUp).toBe(false);
    expect(placement.maxHeight).toBe(368);
  });

  it('flips up and caps to the room above when room below is cramped', () => {
    setViewportHeight(800);
    // spaceBelow = 800 - 760 - 20 = 20 (< 220), spaceAbove = 730 - 20 = 710
    const placement = computeMenuPlacement(makeAnchor(730, 760));
    expect(placement.menuUp).toBe(true);
    expect(placement.maxHeight).toBe(710);
  });

  it('does NOT flip when below is tight but above is even tighter (short viewport)', () => {
    setViewportHeight(200);
    // spaceBelow = 200 - 180 - 20 = 0, spaceAbove = 10 - 20 = -10 (not greater)
    const placement = computeMenuPlacement(makeAnchor(10, 180));
    expect(placement.menuUp).toBe(false);
  });

  it('never caps below the minimum usable menu height', () => {
    setViewportHeight(200);
    // spaceBelow floors to 0 → clamped up to the 120px minimum
    expect(computeMenuPlacement(makeAnchor(10, 180)).maxHeight).toBe(120);
  });

  it('treats the flip threshold as exclusive around 220px of room below', () => {
    setViewportHeight(1000);
    // spaceBelow = 1000 - 760 - 20 = 220, which is not < 220 ⇒ no flip
    expect(computeMenuPlacement(makeAnchor(700, 760)).menuUp).toBe(false);
    // one px tighter: spaceBelow = 219 (< 220) and spaceAbove = 680 > 219 ⇒ flip
    expect(computeMenuPlacement(makeAnchor(700, 761)).menuUp).toBe(true);
  });

  it('shouldFlipMenuUp mirrors computeMenuPlacement.menuUp', () => {
    setViewportHeight(800);
    expect(shouldFlipMenuUp(makeAnchor(730, 760))).toBe(true);
    setViewportHeight(1000);
    expect(shouldFlipMenuUp(makeAnchor(100, 130))).toBe(false);
  });
});
