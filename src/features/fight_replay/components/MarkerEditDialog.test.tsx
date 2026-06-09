import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ReplayMarker } from '../types/mapMarkers';

import { MarkerEditDialog } from './MarkerEditDialog';

function marker(overrides: Partial<ReplayMarker> = {}): ReplayMarker {
  return {
    id: 'm1',
    source: 'manual',
    x: 80000,
    y: 15000,
    z: 70000,
    size: 1.5,
    colour: [1, 1, 1, 1],
    bgTexture: 'M0RMarkers/textures/blank.dds',
    text: '1',
    orientation: undefined,
    elmsIconKey: 1,
    ...overrides,
  };
}

const noop = (): void => undefined;

describe('MarkerEditDialog', () => {
  it('does not render when there is no marker', () => {
    render(<MarkerEditDialog marker={null} onClose={noop} onApply={noop} onDelete={noop} />);
    expect(screen.queryByText('Edit Marker')).not.toBeInTheDocument();
  });

  it('seeds the form from the marker and applies a label edit', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(
      <MarkerEditDialog marker={marker()} onClose={onClose} onApply={onApply} onDelete={noop} />,
    );

    const label = screen.getByLabelText('Label');
    expect(label).toHaveValue('1');

    fireEvent.change(label, { target: { value: 'Portal group' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onApply).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        iconKey: 1,
        text: 'Portal group',
        size: 1.5,
        colour: [1, 1, 1, 1],
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('picking an icon previews its template values before saving', () => {
    const onApply = jest.fn();
    render(<MarkerEditDialog marker={marker()} onClose={noop} onApply={onApply} onDelete={noop} />);

    // MT Hex (icon 21): red, text 'MT', default size 1.
    fireEvent.click(screen.getByRole('button', { name: /use icon mt hex/i }));
    expect(screen.getByLabelText('Label')).toHaveValue('MT');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onApply).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ iconKey: 21, text: 'MT', size: 1, colour: [1, 0, 0, 1] }),
    );
  });

  it('selecting a swatch changes the submitted colour while keeping the alpha', () => {
    const onApply = jest.fn();
    render(
      <MarkerEditDialog
        marker={marker({ colour: [1, 1, 1, 0.5] })}
        onClose={noop}
        onApply={onApply}
        onDelete={noop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set colour Red' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onApply).toHaveBeenCalledWith('m1', expect.objectContaining({ colour: [1, 0, 0, 0.5] }));
  });

  it('deletes the marker and closes', () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    render(
      <MarkerEditDialog marker={marker()} onClose={onClose} onApply={noop} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('m1');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('MarkerEditDialog — out-of-range sizes', () => {
  it('preserves a size outside the slider range on a label-only edit', () => {
    const onApply = jest.fn();
    render(
      <MarkerEditDialog
        marker={marker({ size: 33.5, elmsIconKey: undefined })}
        onClose={noop}
        onApply={onApply}
        onDelete={noop}
      />,
    );

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'big AoE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onApply).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ text: 'big AoE', size: 33.5 }),
    );
  });
});
