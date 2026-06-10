import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MarkerIconPicker } from './MarkerIconPicker';

const anchor = { left: 120, top: 80 };
const noop = (): void => undefined;

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
