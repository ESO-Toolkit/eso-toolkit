/**
 * Unit tests for useReplayShortcuts — the shared window-keydown contract that replaced three
 * independently hand-rolled listeners (Arena3D's N/J, CameraResetControls' R/G, FightReplay3D's
 * transport keys). These tests pin the guard (text-entry / defaultPrevented / OS-chord exclusion),
 * the case-insensitive single-character key matching, and the Space-on-a-button opt-out contract
 * that FightReplay3D's play/pause binding depends on.
 */
import { renderHook, act } from '@testing-library/react';

import {
  isTextEntryTarget,
  useReplayShortcuts,
  type ReplayShortcutBinding,
} from './useReplayShortcuts';

function dispatchKeydown(init: KeyboardEventInit & { target?: EventTarget }): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  if (init.target) {
    Object.defineProperty(event, 'target', { value: init.target, writable: false });
  }
  window.dispatchEvent(event);
  return event;
}

describe('isTextEntryTarget', () => {
  it('is false for a plain element (e.g. the canvas or window)', () => {
    expect(isTextEntryTarget(document.createElement('div'))).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });

  it('is true for INPUT and TEXTAREA elements', () => {
    expect(isTextEntryTarget(document.createElement('input'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('textarea'))).toBe(true);
  });

  it('is true for a contentEditable element', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'isContentEditable', { value: true });
    expect(isTextEntryTarget(el)).toBe(true);
  });
});

describe('useReplayShortcuts', () => {
  it('fires the matching binding on a lowercase letter key', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['n'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'n' });
    });

    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it('matches a single-character key case-insensitively (Shift+n → "N")', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['n'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'N', shiftKey: true });
    });

    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it('matches multi-character keys (arrows) exactly, with no case folding', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['ArrowLeft'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'ArrowLeft' });
    });

    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault after a matched binding by default', () => {
    const bindings: ReplayShortcutBinding[] = [{ keys: ['f'], onMatch: () => undefined }];
    renderHook(() => useReplayShortcuts(bindings));

    const event = dispatchKeydown({ key: 'f' });
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not preventDefault when the binding returns false (Space-on-a-button contract)', () => {
    const onMatch = jest.fn(() => false as const);
    const bindings: ReplayShortcutBinding[] = [{ keys: [' '], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    const event = dispatchKeydown({ key: ' ' });
    expect(onMatch).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys typed into an input/textarea/contentEditable target', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['n'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      dispatchKeydown({ key: 'n', target: input });
    });
    document.body.removeChild(input);

    expect(onMatch).not.toHaveBeenCalled();
  });

  it('ignores a keydown a focused widget already consumed (defaultPrevented)', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['ArrowLeft'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
      event.preventDefault();
      window.dispatchEvent(event);
    });

    expect(onMatch).not.toHaveBeenCalled();
  });

  it('ignores OS/browser modifier chords (Ctrl/Cmd/Alt)', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['f'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'f', ctrlKey: true });
      dispatchKeydown({ key: 'f', metaKey: true });
      dispatchKeydown({ key: 'f', altKey: true });
    });

    expect(onMatch).not.toHaveBeenCalled();
  });

  it('does NOT exclude Shift (used deliberately by ±10s seek / sprint)', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['ArrowLeft'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'ArrowLeft', shiftKey: true });
    });

    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it('stops at the first matching binding and does not fall through to a later one', () => {
    const first = jest.fn();
    const second = jest.fn();
    const bindings: ReplayShortcutBinding[] = [
      { keys: ['h'], onMatch: first },
      { keys: ['h'], onMatch: second },
    ];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      dispatchKeydown({ key: 'h' });
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('accepts a synthetic event dispatched at window with no element target (MobileReplayControls)', () => {
    // MobileReplayControls bridges touch buttons to these shortcuts by dispatching
    // `new KeyboardEvent('keydown', { key, bubbles: true })` at `window` — its `target` resolves
    // to `window` itself, not an HTMLElement, so isTextEntryTarget must safely say "not text
    // entry" rather than throwing on a non-Element target.
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['r'], onMatch }];
    renderHook(() => useReplayShortcuts(bindings));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    });

    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const onMatch = jest.fn();
    const bindings: ReplayShortcutBinding[] = [{ keys: ['n'], onMatch }];
    const { unmount } = renderHook(() => useReplayShortcuts(bindings));

    unmount();
    act(() => {
      dispatchKeydown({ key: 'n' });
    });

    expect(onMatch).not.toHaveBeenCalled();
  });
});
