/**
 * CookieConsent Component Tests (GDPR granular consent)
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

import {
  acceptAllConsent,
  clearConsent,
  getConsentPreferences,
  getConsentState,
  CURRENT_CONSENT_VERSION,
} from '../../../utils/consentManager';
import { CookieConsent } from '../CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should show banner when no consent has been given', () => {
    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();
  });

  it('should not show banner when valid consent exists', async () => {
    acceptAllConsent();

    await act(async () => {
      render(<CookieConsent />);
    });

    await waitFor(
      () => {
        expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('should show banner when consent version is outdated', () => {
    // Legacy v1 format
    localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({ accepted: true, version: '1', timestamp: new Date().toISOString() }),
    );

    render(<CookieConsent />);
    expect(screen.getByText('We Value Your Privacy')).toBeInTheDocument();
  });

  it('should hide banner and save all-accepted when Accept All is clicked', async () => {
    await act(async () => {
      render(<CookieConsent />);
    });

    const acceptButton = screen.getByRole('button', { name: /accept all/i });

    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
    });

    const prefs = getConsentPreferences();
    expect(prefs.analytics).toBe(true);
    expect(prefs.errorTracking).toBe(true);
  });

  it('should hide banner and save all-declined when Decline All is clicked', async () => {
    await act(async () => {
      render(<CookieConsent />);
    });

    const declineButton = screen.getByRole('button', { name: /decline all/i });

    await act(async () => {
      fireEvent.click(declineButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
    });

    const prefs = getConsentPreferences();
    expect(prefs.analytics).toBe(false);
    expect(prefs.errorTracking).toBe(false);
    expect(prefs.essential).toBe(true);
  });

  it('should open preferences dialog when Customize is clicked', async () => {
    render(<CookieConsent />);

    // There are two "Customize" buttons in the banner — the link and the button.
    // Use getAllByRole and pick the standalone button (not the inline link).
    const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
    const customizeButton = customizeButtons[customizeButtons.length - 1];

    await act(async () => {
      fireEvent.click(customizeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Privacy Preferences')).toBeInTheDocument();
    });
  });

  it('should show Essential as always active in preferences dialog', async () => {
    render(<CookieConsent />);

    const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
    const customizeButton = customizeButtons[customizeButtons.length - 1];

    await act(async () => {
      fireEvent.click(customizeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Always Active')).toBeInTheDocument();
    });
  });

  it('should save granular preferences when Save Preferences is clicked', async () => {
    render(<CookieConsent />);

    // Open customization dialog
    const customizeButtons = screen.getAllByRole('button', { name: /customize/i });
    const customizeButton = customizeButtons[customizeButtons.length - 1];
    await act(async () => {
      fireEvent.click(customizeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Privacy Preferences')).toBeInTheDocument();
    });

    // Toggle analytics on (find the first switch)
    const switches = screen.getAllByRole('switch');
    // First switch = analytics, second = error tracking
    await act(async () => {
      fireEvent.click(switches[0]); // Enable analytics
    });

    // Save
    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Check saved state
    const prefs = getConsentPreferences();
    expect(prefs.analytics).toBe(true);
    expect(prefs.errorTracking).toBe(false);
  });

  it('should dispatch consent-changed event on accept', async () => {
    const handler = jest.fn();
    window.addEventListener('consent-changed', handler);

    render(<CookieConsent />);

    const acceptButton = screen.getByRole('button', { name: /accept all/i });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener('consent-changed', handler);
  });

  it('should hide banner when close button is clicked (equals decline)', async () => {
    render(<CookieConsent />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('We Value Your Privacy')).not.toBeInTheDocument();
    });

    const prefs = getConsentPreferences();
    expect(prefs.analytics).toBe(false);
  });

  it('should include Privacy Policy link in banner', () => {
    render(<CookieConsent />);
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });
});

describe('consentManager re-exports (via index)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clearConsent removes consent', () => {
    acceptAllConsent();
    clearConsent();
    expect(getConsentState()).toBeNull();
  });

  it('getConsentState returns current version', () => {
    acceptAllConsent();
    const state = getConsentState();
    expect(state?.version).toBe(CURRENT_CONSENT_VERSION);
  });
});
