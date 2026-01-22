/**
 * CookieConsent Component Tests
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

import { CookieConsent, hasAcceptedCookies, getConsentState, clearConsent } from '../CookieConsent';

const COOKIE_CONSENT_KEY = 'eso-log-aggregator-cookie-consent';
const COOKIE_CONSENT_VERSION = '1';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should show banner when no consent has been given', () => {
    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();
  });

  it('should not show banner when consent has been accepted', async () => {
    const consent = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    const { container } = render(<CookieConsent />);

    // Component should not render the banner
    await waitFor(
      () => {
        expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('should show banner when consent version is outdated', () => {
    const consent = {
      accepted: true,
      version: '0', // Old version
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();
  });

  it('should hide banner when user accepts consent', async () => {
    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();

    const acceptButton = screen.getByRole('button', { name: /^accept$/i });

    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
    });

    // Check localStorage was updated
    await waitFor(() => {
      const consentStr = localStorage.getItem(COOKIE_CONSENT_KEY);
      expect(consentStr).toBeTruthy();
      if (consentStr) {
        const consent = JSON.parse(consentStr);
        expect(consent.accepted).toBe(true);
        expect(consent.version).toBe(COOKIE_CONSENT_VERSION);
      }
    });
  });

  it('should hide banner when user declines consent', async () => {
    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();

    const declineButton = screen.getByRole('button', { name: /^decline$/i });

    await act(async () => {
      fireEvent.click(declineButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
    });

    // Check localStorage was updated
    await waitFor(() => {
      const consentStr = localStorage.getItem(COOKIE_CONSENT_KEY);
      expect(consentStr).toBeTruthy();
      if (consentStr) {
        const consent = JSON.parse(consentStr);
        expect(consent.accepted).toBe(false);
        expect(consent.version).toBe(COOKIE_CONSENT_VERSION);
      }
    });
  });

  it('should open details dialog when clicking Learn more', async () => {
    render(<CookieConsent />);

    const learnMoreLink = screen.getByRole('button', { name: /learn more/i });

    await act(async () => {
      fireEvent.click(learnMoreLink);
    });

    await waitFor(() => {
      expect(screen.getByText('Privacy & Cookie Policy')).toBeInTheDocument();
    });
  });

  it('should close details dialog when clicking Close', async () => {
    render(<CookieConsent />);

    // Open dialog
    const learnMoreLink = screen.getByRole('button', { name: /learn more/i });

    await act(async () => {
      fireEvent.click(learnMoreLink);
    });

    await waitFor(() => {
      expect(screen.getByText('Privacy & Cookie Policy')).toBeInTheDocument();
    });

    // Close dialog
    const closeButtons = screen.getAllByRole('button', { name: /close/i });

    await act(async () => {
      fireEvent.click(closeButtons[0]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Privacy & Cookie Policy')).not.toBeInTheDocument();
    });
  });

  it('should accept from details dialog', async () => {
    render(<CookieConsent />);

    // Open dialog
    const learnMoreLink = screen.getByRole('button', { name: /learn more/i });

    await act(async () => {
      fireEvent.click(learnMoreLink);
    });

    await waitFor(() => {
      expect(screen.getByText('Privacy & Cookie Policy')).toBeInTheDocument();
    });

    // Accept from dialog (last Accept button)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    const dialogAcceptButton = acceptButtons[acceptButtons.length - 1];

    await act(async () => {
      fireEvent.click(dialogAcceptButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
      expect(screen.queryByText('Privacy & Cookie Policy')).not.toBeInTheDocument();
    });
  });
});

describe('hasAcceptedCookies', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return false when no consent has been given', () => {
    expect(hasAcceptedCookies()).toBe(false);
  });

  it('should return true when consent has been accepted', () => {
    const consent = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    // Verify it was stored correctly
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    expect(stored).toBeTruthy();

    const result = hasAcceptedCookies();
    expect(result).toBe(true);
  });

  it('should return false when consent has been declined', () => {
    const consent = {
      accepted: false,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    expect(hasAcceptedCookies()).toBe(false);
  });

  it('should return false when consent version is outdated', () => {
    const consent = {
      accepted: true,
      version: '0',
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    expect(hasAcceptedCookies()).toBe(false);
  });
});

describe('getConsentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when no consent has been given', () => {
    expect(getConsentState()).toBeNull();
  });

  it('should return consent state when it exists', () => {
    const consent = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    // Verify storage worked
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    expect(stored).toBeTruthy();

    const result = getConsentState();
    expect(result).toEqual(consent);
  });
});

describe('clearConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear consent from localStorage', () => {
    const consent = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    clearConsent();

    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
  });
});
