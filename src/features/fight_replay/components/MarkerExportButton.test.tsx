import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { MarkerExportButton } from './MarkerExportButton';

describe('MarkerExportButton', () => {
  it('copies in the default Elms format from the main button', () => {
    const onExport = jest.fn();
    render(<MarkerExportButton onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: /copy elms/i }));

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith('elms');
  });

  it('switches the default format when a format is chosen from the menu', () => {
    const onExport = jest.fn();
    render(<MarkerExportButton onExport={onExport} />);

    // Open the chooser and pick M0R — picking both copies and becomes the new default.
    fireEvent.click(screen.getByRole('button', { name: /choose marker export format/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /m0r/i }));

    expect(onExport).toHaveBeenLastCalledWith('mor');
    // The main button now reflects the chosen default, and re-copies in that format.
    const mainButton = screen.getByRole('button', { name: /copy m0r/i });
    fireEvent.click(mainButton);
    expect(onExport).toHaveBeenLastCalledWith('mor');
    expect(onExport).toHaveBeenCalledTimes(2);
  });

  it('marks the active format in the chooser', () => {
    const onExport = jest.fn();
    render(<MarkerExportButton onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: /choose marker export format/i }));

    // Both formats are offered, each annotated with its addon.
    expect(screen.getByRole('menuitem', { name: /elms/i })).toBeInTheDocument();
    expect(screen.getByText(/EnchantedMapsLite addon/i)).toBeInTheDocument();
    expect(screen.getByText(/M0RMarkers addon/i)).toBeInTheDocument();
  });
});
