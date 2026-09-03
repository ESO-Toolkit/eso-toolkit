/**
 * Structural sanity checks on the shared shortcut registry (constants/replayShortcuts.ts).
 * These pin the shape KeyboardHelpPanel derives its sections from — see
 * KeyboardHelpPanel.test.tsx for the assertion that the rendered panel matches this table exactly.
 */
import { REPLAY_SHORTCUTS, type ReplayShortcutGroup } from './replayShortcuts';

describe('REPLAY_SHORTCUTS', () => {
  it('is non-empty and every row has a group, keys label, and description', () => {
    expect(REPLAY_SHORTCUTS.length).toBeGreaterThan(0);
    for (const row of REPLAY_SHORTCUTS) {
      expect(row.id.length).toBeGreaterThan(0);
      expect(['Camera', 'Playback', 'View']).toContain(row.group);
      expect(row.keys.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = REPLAY_SHORTCUTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('groups rows contiguously, in Camera → Playback → View order', () => {
    // KeyboardHelpPanel buckets by group without re-sorting the underlying array, so a group
    // whose rows are scattered (not contiguous) would silently reorder in the rendered panel.
    const seenOrder: ReplayShortcutGroup[] = [];
    for (const row of REPLAY_SHORTCUTS) {
      if (seenOrder[seenOrder.length - 1] !== row.group) {
        seenOrder.push(row.group);
      }
    }
    expect(seenOrder).toEqual(['Camera', 'Playback', 'View']);
  });

  it('documents the camera reset row as a combined R/G binding (matches the panel copy)', () => {
    const row = REPLAY_SHORTCUTS.find((r) => r.id === 'camera-reset');
    expect(row?.keys).toBe('R');
    expect(row?.description).toBe('Reset view · G: Frame all');
  });
});
