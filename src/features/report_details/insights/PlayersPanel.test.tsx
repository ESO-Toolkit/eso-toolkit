import {
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
  KnownAbilities,
} from '../../../types/abilities';

describe('Champion Points Constants', () => {
  it('should have the correct champion point ability IDs', () => {
    // Red Champion Points
    expect(RED_CHAMPION_POINTS.has(KnownAbilities.SLIPPERY)).toBe(true);
    expect(RED_CHAMPION_POINTS.has(KnownAbilities.SPRINTER)).toBe(true);

    // Blue Champion Points
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.EXPLOITER)).toBe(true);
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.BULWARK)).toBe(true);
    expect(BLUE_CHAMPION_POINTS.has(KnownAbilities.REAVING_BLOWS)).toBe(true);

    // Green Champion Points
    expect(GREEN_CHAMPION_POINTS.has(KnownAbilities.GILDED_FINGERS)).toBe(true);
  });

  it('should have no overlapping champion points between colors', () => {
    const redIds = Array.from(RED_CHAMPION_POINTS);
    const blueIds = Array.from(BLUE_CHAMPION_POINTS);

    // No overlap between red and blue
    expect(redIds.some((id) => BLUE_CHAMPION_POINTS.has(id))).toBe(false);

    // No overlap between red and green
    expect(redIds.some((id) => GREEN_CHAMPION_POINTS.has(id))).toBe(false);

    // No overlap between blue and green
    expect(blueIds.some((id) => GREEN_CHAMPION_POINTS.has(id))).toBe(false);
  });
});
