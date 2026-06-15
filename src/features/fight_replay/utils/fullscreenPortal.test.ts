import { portalToFullscreen } from './fullscreenPortal';

describe('portalToFullscreen', () => {
  afterEach(() => {
    // Reset any fullscreenElement override set by a test.
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
  });

  it('returns document.body when nothing is fullscreen (default / mobile pseudo-fullscreen)', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    expect(portalToFullscreen()).toBe(document.body);
  });

  it('returns the active fullscreen element so overlays portal into the top-layer subtree', () => {
    const replayContainer = document.createElement('div');
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: replayContainer,
    });
    expect(portalToFullscreen()).toBe(replayContainer);
  });
});
