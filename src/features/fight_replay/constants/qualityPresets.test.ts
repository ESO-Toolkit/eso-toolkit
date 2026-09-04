import { PRESET_COLOR, QUALITY_PRESET_LABEL, QUALITY_PRESET_OPTIONS } from './qualityPresets';

/**
 * Data-only coverage for the shared quality-preset constants — moved here from
 * ReplayQualityMenu.test.tsx when that component (and its render-focused assertions) was deleted
 * as dead code. The three surfaces that actually render these presets today (ReplayDisplaySettingsMenu,
 * MobileReplayControls, MobileReplayDock) each have their own component tests; this file guards the
 * shared data those tests build on — all four presets present, labels/descriptions consistent, and
 * every preset covered by every lookup table — so a future edit can't silently drop a preset from one
 * table while leaving it in another.
 */
describe('qualityPresets constants', () => {
  const expectedValues = ['auto', 'high', 'performance', 'barebones'] as const;

  it('has all four presets in QUALITY_PRESET_OPTIONS, in order', () => {
    expect(QUALITY_PRESET_OPTIONS.map((o) => o.value)).toEqual(expectedValues);
  });

  it('gives every preset a non-empty label and description', () => {
    for (const { label, description } of QUALITY_PRESET_OPTIONS) {
      expect(label.length).toBeGreaterThan(0);
      expect(description.length).toBeGreaterThan(0);
    }
  });

  it('carries the exact labels/descriptions surfaces render', () => {
    expect(QUALITY_PRESET_OPTIONS).toEqual([
      {
        value: 'auto',
        label: 'Auto',
        description: 'Full quality; reduces automatically if needed',
      },
      { value: 'high', label: 'High', description: 'Always full quality' },
      { value: 'performance', label: 'Performance', description: 'No shadows or effects' },
      {
        value: 'barebones',
        label: 'Barebones',
        description: 'Minimal drawing, 30 fps — for weak devices',
      },
    ]);
  });

  it('has a QUALITY_PRESET_LABEL entry matching QUALITY_PRESET_OPTIONS for every preset', () => {
    for (const { value, label } of QUALITY_PRESET_OPTIONS) {
      expect(QUALITY_PRESET_LABEL[value]).toBe(label);
    }
  });

  it('has a PRESET_COLOR entry for every preset', () => {
    for (const value of expectedValues) {
      expect(PRESET_COLOR[value]).toMatch(/^(#|rgba)/);
    }
  });
});
