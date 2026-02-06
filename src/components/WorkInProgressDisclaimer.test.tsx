/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { WorkInProgressDisclaimer } from './WorkInProgressDisclaimer';

describe('WorkInProgressDisclaimer', () => {
  it('renders default message when no props are provided', () => {
    render(<WorkInProgressDisclaimer />);
    expect(screen.getByText(/Under Active Development/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /This feature is currently being developed and tested. Features may change, and some functionality may be incomplete. Please report any issues or suggestions!/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders with feature name', () => {
    render(<WorkInProgressDisclaimer featureName="Raid Dashboard" />);
    expect(screen.getByText(/Under Active Development/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /This Raid Dashboard is currently being developed and tested. Features may change, and some functionality may be incomplete. Please report any issues or suggestions!/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    const customMessage = 'This is a custom test message.';
    const { container } = render(<WorkInProgressDisclaimer message={customMessage} />);
    expect(screen.getByText(/Under Active Development/i)).toBeInTheDocument();
    // Check that the custom message is present in the rendered output
    expect(container.textContent).toContain(customMessage);
  });

  it('applies custom sx styling', () => {
    const { container } = render(<WorkInProgressDisclaimer sx={{ marginBottom: 4 }} />);
    const alert = container.querySelector('.MuiAlert-root');
    expect(alert).toBeInTheDocument();
  });
});
