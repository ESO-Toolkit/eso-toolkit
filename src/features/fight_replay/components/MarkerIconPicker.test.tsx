import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MarkerIconPicker } from './MarkerIconPicker';

const anchor = { left: 120, top: 80 };
const noop = (): void => undefined;

/** jsdom lacks a full PointerEvent, so build a plain event carrying the pointer fields. */
function firePointer(
  element: Element,
  type: 'pointerdown' | 'pointerup',
  init: { pointerId: number; pointerType: string; clientX: number; clientY: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, init);
  fireEvent(element, event);
}

describe('MarkerIconPicker', () => {
  it('renders nothing while closed', () => {
    render(<MarkerIconPicker open={false} anchorPosition={null} onSelect={noop} onClose={noop} />);
    expect(screen.queryByText('Add marker')).not.toBeInTheDocument();
  });

  it('shows every group and option on one surface (desktop popover)', () => {
    render(<MarkerIconPicker open anchorPosition={anchor} onSelect={noop} onClose={noop} />);

    // All four groups visible at once — no nested submenu to drill into.
    expect(screen.getByText('Numbers')).toBeInTheDocument();
    expect(screen.getByText('Arrows & Chevron')).toBeInTheDocument();
    expect(screen.getByText('Squares')).toBeInTheDocument();
    expect(screen.getByText('Hexagons')).toBeInTheDocument();

    // Both hexagon variants are individually pickable (no auto-selected first option).
    expect(screen.getByRole('button', { name: 'Use icon OT Hex' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use icon MT Hex' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use icon Number 10' })).toBeInTheDocument();
  });

  it('selecting an icon reports its key', () => {
    const onSelect = jest.fn();
    render(<MarkerIconPicker open anchorPosition={anchor} onSelect={onSelect} onClose={noop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use icon MT Hex' }));
    expect(onSelect).toHaveBeenCalledWith(21);
  });

  it('commits a touch tap on pointerup and swallows the trailing synthetic click', () => {
    const onSelect = jest.fn();
    render(
      <MarkerIconPicker open mobile anchorPosition={anchor} onSelect={onSelect} onClose={noop} />,
    );

    const cell = screen.getByRole('button', { name: 'Use icon MT Hex' });
    // iOS-style sequence: pointer events, then the (sometimes-missing) synthetic click.
    firePointer(cell, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });
    firePointer(cell, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 52,
      clientY: 51,
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(21);

    // A browser that does emit the trailing click must not double-fire the pick.
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('a touch that travels (scroll over the grid) does not pick', () => {
    const onSelect = jest.fn();
    render(
      <MarkerIconPicker open mobile anchorPosition={anchor} onSelect={onSelect} onClose={noop} />,
    );

    const cell = screen.getByRole('button', { name: 'Use icon Number 1' });
    firePointer(cell, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });
    firePointer(cell, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 50,
      clientY: 90,
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('mobile bottom sheet has a title and an explicit close affordance', () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();
    render(
      <MarkerIconPicker
        open
        mobile
        anchorPosition={anchor}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Add marker')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use icon Number 3' }));
    expect(onSelect).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'Close marker picker' }));
    expect(onClose).toHaveBeenCalled();
  });
});
