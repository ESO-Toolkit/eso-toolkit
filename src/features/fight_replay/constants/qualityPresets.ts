import type { ReplayQualityPreset } from '../../../hooks/useReplayPrefs';

/**
 * Shared replay-quality-preset data — copy, labels, and trigger tint for the four presets
 * (Auto / High / Performance / Barebones). This used to live inside `ReplayQualityMenu.tsx`, the
 * standalone Bolt-icon menu that opened its own MUI Menu of presets. That component was folded
 * into the transport bar's `ReplayDisplaySettingsMenu` popover (desktop) and the pill-grid inside
 * `MobileReplayDock`'s Settings sheet (mobile), so nothing renders `ReplayQualityMenu` anymore —
 * but its constants are still the single source of truth three surfaces read from
 * (`ReplayDisplaySettingsMenu`, `MobileReplayControls`, `MobileReplayDock`). Moving them here
 * un-couples that shared data from the now-dead component file instead of leaving live code
 * importing from a component nothing renders.
 */

/** Menu copy per preset — labels are user-facing, keep them short. */
export const QUALITY_PRESET_OPTIONS: ReadonlyArray<{
  value: ReplayQualityPreset;
  label: string;
  description: string;
}> = [
  { value: 'auto', label: 'Auto', description: 'Full quality; reduces automatically if needed' },
  { value: 'high', label: 'High', description: 'Always full quality' },
  { value: 'performance', label: 'Performance', description: 'No shadows or effects' },
  {
    value: 'barebones',
    label: 'Barebones',
    description: 'Minimal drawing, 30 fps — for weak devices',
  },
];

export const QUALITY_PRESET_LABEL: Record<ReplayQualityPreset, string> = {
  auto: 'Auto',
  high: 'High',
  performance: 'Performance',
  barebones: 'Barebones',
};

/**
 * Trigger tint communicating preset state at a glance (amber = reduced quality). Not currently
 * imported by any live surface — the old standalone Bolt-icon trigger was the only consumer, and
 * it's gone — but it's kept alongside the labels/options as the third piece of "per-preset
 * presentation" data rather than deleted with the component, in case a future trigger (mobile
 * dock Bolt icon, etc.) wants the same amber-for-reduced grammar instead of reinventing it.
 */
export const PRESET_COLOR: Record<ReplayQualityPreset, string> = {
  auto: 'rgba(255, 255, 255, 0.55)',
  high: '#7dd3fc',
  performance: '#fcd34d',
  barebones: '#fb923c',
};
