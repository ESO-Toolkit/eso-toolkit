import {
  REVIEW_TARGET_HEIGHT_RATIO,
  getReviewCameraPosition,
  type ViewName,
} from './replayModelViewerCamera';

const HEIGHT = 2;

describe('getReviewCameraPosition', () => {
  it('puts the camera in front of the model for the front view and behind it for the back', () => {
    const [, , frontZ] = getReviewCameraPosition('front', HEIGHT);
    const [, , backZ] = getReviewCameraPosition('back', HEIGHT);
    expect(frontZ).toBeGreaterThan(0);
    expect(backZ).toBeLessThan(0);
    expect(frontZ).toBeCloseTo(-backZ);
  });

  it('mirrors the left and right views so both flanks are reviewed identically', () => {
    const [leftX, leftY] = getReviewCameraPosition('left', HEIGHT);
    const [rightX, rightY] = getReviewCameraPosition('right', HEIGHT);
    expect(leftX).toBeLessThan(0);
    expect(rightX).toBeGreaterThan(0);
    expect(leftX).toBeCloseTo(-rightX);
    expect(leftY).toBeCloseTo(rightY);
  });

  it('offsets the three-quarter view on both horizontal axes', () => {
    const [x, , z] = getReviewCameraPosition('three-quarter', HEIGHT);
    expect(Math.abs(x)).toBeGreaterThan(0.1);
    expect(Math.abs(z)).toBeGreaterThan(0.1);
  });

  it('always keeps the eye above the floor so the model is never viewed from below', () => {
    const views: ViewName[] = ['front', 'back', 'left', 'right', 'three-quarter'];
    for (const view of views) {
      const [, y] = getReviewCameraPosition(view, HEIGHT);
      expect(y).toBeGreaterThan(HEIGHT * REVIEW_TARGET_HEIGHT_RATIO * 0.5);
    }
  });

  it('scales the framing with model height so tall and short assets frame alike', () => {
    const short = getReviewCameraPosition('front', 1);
    const tall = getReviewCameraPosition('front', 4);
    expect(tall[2] / short[2]).toBeCloseTo(4);
    expect(tall[1] / short[1]).toBeCloseTo(4);
  });

  it('keeps a constant distance from the origin across the axis-aligned views', () => {
    const distance = (view: ViewName): number => {
      const [x, , z] = getReviewCameraPosition(view, HEIGHT);
      return Math.hypot(x, z);
    };
    expect(distance('front')).toBeCloseTo(distance('back'));
    expect(distance('front')).toBeCloseTo(distance('left'));
    expect(distance('front')).toBeCloseTo(distance('right'));
  });
});
