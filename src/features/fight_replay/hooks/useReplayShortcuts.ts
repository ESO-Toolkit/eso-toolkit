import { useEffect } from 'react';

/**
 * True when a keyboard event originated in a text-entry surface (an input, a textarea, or any
 * contentEditable region) and replay shortcuts should therefore stay out of the way.
 *
 * This used to be reimplemented slightly differently in each of the three replay keydown
 * listeners: FightReplay3D checked `isContentEditable` too, Arena3D and CameraResetControls only
 * checked `instanceof HTMLInputElement / HTMLTextAreaElement`. That divergence is exactly the kind
 * of bug the shared hook below exists to close — a shortcut ADDED to the wrong listener silently
 * inherited the weaker guard. Every `useReplayShortcuts` caller now goes through this one function.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true
  );
}

export interface ReplayShortcutBinding {
  /**
   * `event.key` values this binding fires on. Give single letters lowercase (e.g. 'n', 'r') —
   * matching is case-insensitive for any single-character key (letters AND symbols; lower-casing
   * a symbol is a no-op, so '+', ',', '<' etc. all work the same way). Multi-character keys
   * (`'ArrowLeft'`, …) must match exactly as given — there's no case folding to apply.
   */
  keys: readonly string[];
  /**
   * Invoked once a bound key passes the shared guard below. Return `false` to suppress this
   * press's `event.preventDefault()` (used by Space: a press landing on a focused `<button>` must
   * fall through to the button's native Space-activates-it behavior instead of being swallowed as
   * play/pause — see FightReplay3D's binding). Any other return value (including `void`)
   * prevents default, matching every other shortcut's existing behavior.
   */
  onMatch: (event: KeyboardEvent) => void | false;
}

/** Case-insensitive-for-single-chars key match; see `ReplayShortcutBinding.keys`' doc. */
function matchesKey(bindingKey: string, eventKey: string): boolean {
  if (bindingKey === eventKey) return true;
  return (
    eventKey.length === 1 &&
    bindingKey.length === 1 &&
    eventKey.toLowerCase() === bindingKey.toLowerCase()
  );
}

/**
 * ONE shared `window` keydown contract for the replay's shortcut listeners.
 *
 * Three components each still own their own physical listener — CameraResetControls (R/G),
 * Arena3D (N/J), and FightReplay3D (everything else) — because two of them need something this
 * hook can't provide on its own: CameraResetControls needs the three.js camera/controls handle
 * (only reachable inside `<Canvas>`, where it lives), and Arena3D needs the toggle callbacks it
 * already receives as controlled props. Forcing those into one physical listener in
 * FightReplay3D would mean threading a camera ref and toggle callbacks through props that would
 * otherwise have no reason to exist on that component. WASD/Shift camera movement is a fourth,
 * SEPARATE listener (KeyboardCameraControls) that this refactor deliberately does not touch — it
 * isn't in this feature's owned-files list and isn't part of the divergence being fixed here.
 *
 * What this hook DOES fix: every one of those three listeners previously hand-rolled its own
 * text-entry guard (with real differences — see `isTextEntryTarget`'s doc) and its own dispatch
 * loop. They now all call this hook, so the guard — text-entry, already-handled
 * (`defaultPrevented`), and OS/browser modifier chords (Ctrl/Cmd/Alt) — is applied identically
 * everywhere, and a shortcut added to any one of the three call sites automatically gets the same
 * protection as the other two.
 *
 * `bindings` should be referentially stable (built with `useMemo`, matching the real
 * dependencies) — a fresh array identity every render tears down and re-adds the `window`
 * listener on every render. That stays functionally correct (the listener always reflects the
 * latest closures either way) but churns needlessly; see the original three effects' own
 * comments about why they were careful to keep their dependency lists minimal.
 */
export function useReplayShortcuts(bindings: readonly ReplayShortcutBinding[]): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // A focused widget that already consumed this key (roving tab-stop focus, a slider's own
      // arrow-key handling) called preventDefault() first — yield, so one press can't both move
      // widget focus AND fire a replay shortcut.
      if (event.defaultPrevented) return;
      // Don't interfere with text input (marker labels, search boxes, …).
      if (isTextEntryTarget(event.target)) return;
      // Never shadow OS/browser chords (Ctrl+F find, Cmd+R reload, Ctrl+= page zoom, …). Shift is
      // deliberately NOT excluded here — Shift+arrow (±10s seek) and Shift (sprint, documentation
      // only) are legitimate shortcuts in their own right.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      for (const binding of bindings) {
        if (binding.keys.some((k) => matchesKey(k, event.key))) {
          const result = binding.onMatch(event);
          if (result !== false) {
            event.preventDefault();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings]);
}
