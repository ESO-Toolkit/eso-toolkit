/**
 * ReplayGestureHint: the mobile-immersive equivalent of KeyboardHelpPanel — a one-time,
 * auto-dismissing gesture legend. Mirrors ReplayZoomHint's localStorage-gated pattern; these tests
 * pin the "shows once, remembers dismissal" contract and the exact gesture text (verified against
 * the real touch-handling utilities — see the component's module doc for why "pinch" says "zoom +
 * pan", not just "zoom").
 */
import { render, screen, act } from '@testing-library/react';
import React from 'react';

import { ReplayGestureHint } from './ReplayGestureHint';

const STORAGE_KEY = 'replay.gestureHintSeen.v1';

describe('ReplayGestureHint', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the real gesture set when active and not yet seen', () => {
    render(<ReplayGestureHint active bottomOffset={140} />);
    expect(
      screen.getByText('Drag: rotate · Pinch: zoom + pan · Tap an actor: follow'),
    ).toBeInTheDocument();
  });

  it('does not render at all when inactive', () => {
    render(<ReplayGestureHint active={false} bottomOffset={140} />);
    expect(
      screen.queryByText('Drag: rotate · Pinch: zoom + pan · Tap an actor: follow'),
    ).not.toBeInTheDocument();
  });

  it('auto-dismisses and marks itself seen in localStorage', () => {
    render(<ReplayGestureHint active bottomOffset={140} />);
    expect(screen.getByText(/Drag: rotate/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('never shows again once the dismissal flag is already set', () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    render(<ReplayGestureHint active bottomOffset={140} />);
    expect(screen.queryByText(/Drag: rotate/)).not.toBeInTheDocument();
  });
});
