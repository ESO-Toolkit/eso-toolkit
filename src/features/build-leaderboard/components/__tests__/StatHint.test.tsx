import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { StatHint } from '../StatHint';

const theme = createTheme();
const originalMatchMedia = window.matchMedia;

function mockHoverSupport(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * These assert `aria-expanded`, NOT that the explanation text is in the DOM.
 * MUI's Tooltip animates out, so the popper survives a render or two after
 * closing — a `getByText` assertion passes against a tooltip that is on its way
 * out, which is exactly how the tap-closes-it-again bug slipped through the
 * first time this component was tested.
 */
function renderHint() {
  render(
    <ThemeProvider theme={theme}>
      <StatHint data-testid="hint" text="Half land 118k–129k" explanation="Explained here." />
    </ThemeProvider>,
  );
  return screen.getByTestId('hint');
}

describe('StatHint', () => {
  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('starts closed', () => {
    expect(renderHint()).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * The regression pin. A real tap delivers focus BEFORE click (touchend ->
   * mousedown -> focus -> mouseup -> click). Opening on plain focus let the
   * click toggle it straight back shut, so a tap opened nothing — the "no
   * tooltip on mobile" complaint this component was built to fix.
   *
   * focusIn, not focus: React delegates onFocus from the bubbling focusin
   * event, so fireEvent.focus never reaches the handler.
   */
  it('opens on tap even though focus arrives first', () => {
    const hint = renderHint();

    fireEvent.focusIn(hint);
    fireEvent.click(hint);

    expect(hint).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on a second tap', () => {
    const hint = renderHint();

    fireEvent.focusIn(hint);
    fireEvent.click(hint);
    fireEvent.click(hint);

    expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['Enter', ' '])('keyboard %s toggles on hover-capable desktops', (key) => {
    mockHoverSupport();
    const hint = renderHint();

    fireEvent.keyDown(hint, { key });
    fireEvent.click(hint);
    expect(hint).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(hint, { key });
    fireEvent.click(hint);
    expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not let a blurred activation marker affect a later pointer click', () => {
    mockHoverSupport();
    const hint = renderHint();

    fireEvent.keyDown(hint, { key: 'Enter' });
    fireEvent.blur(hint);
    fireEvent.mouseEnter(hint);
    fireEvent.click(hint);

    expect(hint).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles touch taps on hybrid devices that also advertise hover support', () => {
    mockHoverSupport();
    const hint = renderHint();

    fireEvent.pointerDown(hint, { pointerType: 'touch' });
    fireEvent.focusIn(hint);
    fireEvent.pointerUp(hint, { pointerType: 'touch' });
    fireEvent.click(hint);
    expect(hint).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerDown(hint, { pointerType: 'touch' });
    fireEvent.pointerUp(hint, { pointerType: 'touch' });
    fireEvent.click(hint);
    expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * The other half of the fix: focus alone must NOT open it. If it did, the
   * click that follows every tap would toggle it shut again. There is no focus
   * handler at all now — keyboard users open it with Enter, which routes
   * through the same click path as a tap.
   */
  it('does not open on pointer focus alone', () => {
    const hint = renderHint();

    fireEvent.focusIn(hint);

    expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes the explanation to assistive tech without opening anything', () => {
    const hint = renderHint();
    expect(hint).toHaveAttribute('aria-label', expect.stringContaining('Explained here.'));
  });
});
