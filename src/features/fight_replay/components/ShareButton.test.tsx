import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { ShareButton } from './ShareButton';

describe('ShareButton', () => {
  const originalClipboard = navigator.clipboard;
  const originalShare = (navigator as Navigator & { share?: unknown }).share;

  beforeEach(() => {
    // Force the clipboard branch (no Web Share API, secure context).
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    // Ensure the Web Share API path is not taken.
    delete (navigator as Navigator & { share?: unknown }).share;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
    if (originalShare !== undefined) {
      (navigator as Navigator & { share?: unknown }).share = originalShare;
    }
    jest.clearAllMocks();
  });

  it('renders nothing without reportId/fightId', () => {
    const { container } = render(<ShareButton currentTime={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a labelled share button when ids are provided', () => {
    render(<ShareButton reportId="r1" fightId="1" currentTime={0} />);
    expect(screen.getByRole('button', { name: /share current replay time/i })).toBeInTheDocument();
  });

  it('announces copy success via a bottom-anchored, polite live region', async () => {
    render(<ShareButton reportId="r1" fightId="1" currentTime={12_000} />);

    fireEvent.click(screen.getByRole('button', { name: /share current replay time/i }));

    // The success Alert should appear with assistive-tech announcement semantics.
    const alert = await screen.findByText(/copied to clipboard/i);
    const alertRoot = alert.closest('.MuiAlert-root');
    expect(alertRoot).toHaveAttribute('role', 'status');
    expect(alertRoot).toHaveAttribute('aria-live', 'polite');

    // Snackbar stays bottom-anchored to avoid colliding with the global AppBar.
    await waitFor(() => {
      const snackbar = document.querySelector('.MuiSnackbar-root');
      expect(snackbar?.className).toMatch(/MuiSnackbar-anchorOriginBottom/);
    });
  });
});
