import { resolveTouchPolicy } from './touchPolicy';

describe('resolveTouchPolicy', () => {
  it('keeps pan enabled on desktop (windowed and fullscreen)', () => {
    expect(resolveTouchPolicy(false, false).enablePan).toBe(true);
    expect(resolveTouchPolicy(false, true).enablePan).toBe(true);
  });

  it('keeps pan enabled on mobile while still in the inline preview (not immersive)', () => {
    // The preview canvas is non-interactive anyway (pointer-events:none), but the policy should
    // only drop pan once the overlay is open, not before.
    expect(resolveTouchPolicy(true, false).enablePan).toBe(true);
  });

  it('disables pan on mobile-immersive so two fingers are pinch-only', () => {
    expect(resolveTouchPolicy(true, true).enablePan).toBe(false);
  });

  it('always enables rotate and always leaves pinch to CanvasWheelZoom', () => {
    for (const [m, i] of [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ] as const) {
      const policy = resolveTouchPolicy(m, i);
      expect(policy.enableRotate).toBe(true);
      expect(policy.pinchOwner).toBe('CanvasWheelZoom');
    }
  });
});
