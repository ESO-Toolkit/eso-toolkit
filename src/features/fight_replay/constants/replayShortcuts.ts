/**
 * Single source of truth for the fight-replay keyboard shortcut TABLE.
 *
 * Before this file existed, "what shortcuts exist" was answered three different ways that could
 * (and did) drift out of sync:
 *   1. Arena3D's own `window` keydown listener (N, J)
 *   2. CameraResetControls' own `window` keydown listener (R, G)
 *   3. FightReplay3D's own `window` keydown listener (everything else)
 *   4. KeyboardHelpPanel's hand-typed `SECTIONS` table, describing what (1)-(3) are SUPPOSED to do
 *
 * This is now the thing KeyboardHelpPanel renders FROM (see that component), so the on-screen
 * table can never describe a shortcut that doesn't exist without also changing what's documented.
 * The physical key-handling itself still lives in three places for a real reason — see
 * `useReplayShortcuts`'s module doc — but every one of those handlers can point at an entry here
 * for its label, and `KeyboardHelpPanel.consistency.test.tsx` asserts the registry and the panel
 * agree.
 *
 * A few rows document a binding that is NOT wired through `useReplayShortcuts` at all:
 *   - WASD / Shift / Drag: WASD+Shift movement lives in KeyboardCameraControls (a different
 *     in-canvas component, out of scope for this refactor) and Drag is a pointer gesture, not a
 *     keyboard binding — neither can attach to a `keydown` registry entry, so they exist here as
 *     pure documentation with no corresponding binding anywhere.
 *   - `[` / `]` (prev/next boss): bound in FightReplay.tsx (the page-level shell one level up
 *     from this feature's owned components), which already has its own copy of the text-entry
 *     guard. Out of scope to move here — documented anyway so the help panel stays complete.
 *
 * Correctness beats purity: a row that can't physically move still belongs in the table a user
 * reads, even if wiring it through the shared hook isn't possible or isn't this change's job.
 *
 * @module replayShortcuts
 */

/** The three sections KeyboardHelpPanel renders, in display order. */
export type ReplayShortcutGroup = 'Camera' | 'Playback' | 'View';

export interface ReplayShortcutDoc {
  /** Stable identifier — NOT necessarily a single physical key (the 'camera-reset' row documents
   *  both R and G under one line, matching the help panel's existing compact phrasing). */
  id: string;
  group: ReplayShortcutGroup;
  /** Exact text rendered in the key chip. */
  keys: string;
  /** Exact text rendered as the row's description. */
  description: string;
}

/**
 * Ordered exactly as KeyboardHelpPanel's old private `SECTIONS` table was (grouped Camera /
 * Playback / View, rows in the same order within each group) — this is a lossless extraction,
 * not a content change. Every user-visible string below is copied verbatim from that table.
 */
export const REPLAY_SHORTCUTS: readonly ReplayShortcutDoc[] = [
  // ---- Camera — WASD/Shift/Drag are documentation-only (see module doc); R/G are wired via
  // CameraResetControls' useReplayShortcuts call. ----
  { id: 'camera-move', group: 'Camera', keys: 'WASD', description: 'Move camera' },
  { id: 'camera-sprint', group: 'Camera', keys: 'Shift', description: 'Sprint' },
  { id: 'camera-drag', group: 'Camera', keys: 'Drag', description: 'Rotate · Ctrl+scroll: Zoom' },
  {
    id: 'camera-reset',
    group: 'Camera',
    keys: 'R',
    description: 'Reset view · G: Frame all',
  },
  // ---- Playback — all wired via FightReplay3D's useReplayShortcuts call, except boss-skip
  // ([ / ]), which is bound in FightReplay.tsx (see module doc). ----
  { id: 'playback-play-pause', group: 'Playback', keys: 'Space', description: 'Play / pause' },
  { id: 'playback-seek', group: 'Playback', keys: '← →', description: 'Seek ±1s · Shift: ±10s' },
  { id: 'playback-speed', group: 'Playback', keys: '+ −', description: 'Speed up / down' },
  { id: 'playback-frame-step', group: 'Playback', keys: ', .', description: 'Frame step' },
  { id: 'playback-jump-event', group: 'Playback', keys: '< >', description: 'Prev / next event' },
  {
    id: 'playback-loop',
    group: 'Playback',
    keys: 'I O',
    description: 'Set loop in / out · U: Clear',
  },
  {
    id: 'playback-boss-skip',
    group: 'Playback',
    keys: '[ ]',
    description: 'Prev / next boss',
  },
  // ---- View — N/J wired via Arena3D's useReplayShortcuts call; P/T/F/C/H wired via
  // FightReplay3D's. ----
  { id: 'view-player-list', group: 'View', keys: 'P', description: 'Player list' },
  { id: 'view-trails', group: 'View', keys: 'T', description: 'Player trails' },
  { id: 'view-names', group: 'View', keys: 'N', description: 'Name cards' },
  {
    id: 'view-locked-stats',
    group: 'View',
    keys: 'J',
    description: 'Player stats (when locked)',
  },
  { id: 'view-fullscreen', group: 'View', keys: 'F', description: 'Fullscreen' },
  { id: 'view-collapse', group: 'View', keys: 'C', description: 'Collapse controls' },
] as const;
