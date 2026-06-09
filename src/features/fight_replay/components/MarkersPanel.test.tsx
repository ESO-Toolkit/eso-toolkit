import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';

import { MarkersPanel } from './MarkersPanel';

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

function stateOf(markers: ReplayMarker[]): MapMarkersState {
  return { format: 'elms', zoneId: 636, markers };
}

const noop = (): void => undefined;

function renderPanel(
  markersState: MapMarkersState | null,
  overrides: Partial<React.ComponentProps<typeof MarkersPanel>> = {},
): ReturnType<typeof render> {
  return render(
    <MarkersPanel
      markersState={markersState}
      editMode={true}
      canUndo={false}
      canRedo={false}
      onUndo={noop}
      onRedo={noop}
      onEditMarker={noop}
      onRemoveMarker={noop}
      onClearMarkers={noop}
      {...overrides}
    />,
  );
}

describe('MarkersPanel', () => {
  it('renders nothing with no markers, no history, and edit mode off', () => {
    const { container } = renderPanel(null, { editMode: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the empty-state guidance while edit mode is on', () => {
    renderPanel(null, { editMode: true });
    expect(screen.getByText(/no markers yet/i)).toBeInTheDocument();
  });

  it('lists markers with their label and position summary', () => {
    renderPanel(stateOf([marker(), marker({ id: 'm2', text: 'Kite here', elmsIconKey: 21 })]));

    expect(screen.getByText('Markers (2)')).toBeInTheDocument();
    expect(screen.getByText('Kite here')).toBeInTheDocument();
    // 80000cm/100 = 800m, 70000cm/100 = 700m, size 1.5m
    expect(screen.getAllByText('800m, 700m · 1.5m')).toHaveLength(2);
  });

  it('fires edit/remove callbacks with the marker id', () => {
    const onEditMarker = jest.fn();
    const onRemoveMarker = jest.fn();
    renderPanel(stateOf([marker()]), { onEditMarker, onRemoveMarker });

    fireEvent.click(screen.getByRole('button', { name: /edit 1/i }));
    expect(onEditMarker).toHaveBeenCalledWith('m1');

    fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));
    expect(onRemoveMarker).toHaveBeenCalledWith('m1');
  });

  it('wires undo/redo buttons to their callbacks and disables them when unavailable', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    renderPanel(stateOf([marker()]), { canUndo: true, canRedo: false, onUndo, onRedo });

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect(redoButton).toBeDisabled();
    fireEvent.click(undoButton);
    expect(onUndo).toHaveBeenCalled();
  });

  it('clears all markers via the Clear all action', () => {
    const onClearMarkers = jest.fn();
    renderPanel(stateOf([marker()]), { onClearMarkers });

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClearMarkers).toHaveBeenCalled();
  });

  it('labels markers without text by their source', () => {
    renderPanel(stateOf([marker({ text: undefined, elmsIconKey: undefined, source: 'imported' })]));
    expect(screen.getByText('Imported marker')).toBeInTheDocument();
  });
});
