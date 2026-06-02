import { decidePreviewMode } from './previewMode';

describe('decidePreviewMode', () => {
  it('returns static when reduced motion is preferred, regardless of tier', () => {
    expect(decidePreviewMode('high', true)).toBe('static');
    expect(decidePreviewMode('medium', true)).toBe('static');
    expect(decidePreviewMode('low', true)).toBe('static');
  });

  it('returns static on a low GPU tier even when motion is allowed', () => {
    expect(decidePreviewMode('low', false)).toBe('static');
  });

  it('returns animated on a capable device with motion allowed', () => {
    expect(decidePreviewMode('medium', false)).toBe('animated');
    expect(decidePreviewMode('high', false)).toBe('animated');
  });
});
