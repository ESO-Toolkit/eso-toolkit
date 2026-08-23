/**
 * consentManager unit tests
 */

import {
  getConsentState,
  hasRespondedToConsent,
  getConsentPreferences,
  hasAnalyticsConsent,
  hasErrorTrackingConsent,
  hasAcceptedCookies,
  saveConsentPreferences,
  acceptAllConsent,
  declineAllConsent,
  clearConsent,
  exportUserData,
  getApplicationStorageEntries,
  deleteAllUserData,
  CURRENT_CONSENT_VERSION,
} from '../consentManager';

const CONSENT_KEY = 'eso-log-aggregator-cookie-consent';

describe('consentManager', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ─── getConsentState ──────────────────────────────────────────

  describe('getConsentState', () => {
    it('returns null when no consent has been given', () => {
      expect(getConsentState()).toBeNull();
    });

    it('returns null for legacy v1 consent format', () => {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ accepted: true, version: '1', timestamp: new Date().toISOString() }),
      );
      expect(getConsentState()).toBeNull();
    });

    it('returns null for outdated consent version', () => {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          preferences: { essential: true, analytics: true, errorTracking: true },
          version: '0',
          timestamp: new Date().toISOString(),
        }),
      );
      expect(getConsentState()).toBeNull();
    });

    it('returns consent state for current version', () => {
      const state = {
        preferences: { essential: true, analytics: true, errorTracking: false },
        version: CURRENT_CONSENT_VERSION,
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
      expect(getConsentState()).toEqual(state);
    });

    it('returns null for corrupted JSON', () => {
      localStorage.setItem(CONSENT_KEY, 'not-json');
      expect(getConsentState()).toBeNull();
    });
  });

  // ─── hasRespondedToConsent ────────────────────────────────────

  describe('hasRespondedToConsent', () => {
    it('returns false when no consent recorded', () => {
      expect(hasRespondedToConsent()).toBe(false);
    });

    it('returns true when valid consent exists', () => {
      acceptAllConsent();
      expect(hasRespondedToConsent()).toBe(true);
    });
  });

  // ─── getConsentPreferences ────────────────────────────────────

  describe('getConsentPreferences', () => {
    it('returns all-off defaults when no consent recorded', () => {
      expect(getConsentPreferences()).toEqual({
        essential: true,
        analytics: false,
        errorTracking: false,
      });
    });

    it('returns saved preferences', () => {
      saveConsentPreferences({ analytics: true, errorTracking: false });
      expect(getConsentPreferences()).toEqual({
        essential: true,
        analytics: true,
        errorTracking: false,
      });
    });
  });

  // ─── hasAnalyticsConsent / hasErrorTrackingConsent ─────────────

  describe('category consent checks', () => {
    it('hasAnalyticsConsent returns false by default', () => {
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('hasErrorTrackingConsent returns false by default', () => {
      expect(hasErrorTrackingConsent()).toBe(false);
    });

    it('hasAnalyticsConsent returns true after accepting all', () => {
      acceptAllConsent();
      expect(hasAnalyticsConsent()).toBe(true);
    });

    it('hasErrorTrackingConsent returns true after accepting all', () => {
      acceptAllConsent();
      expect(hasErrorTrackingConsent()).toBe(true);
    });

    it('returns false after declining all', () => {
      declineAllConsent();
      expect(hasAnalyticsConsent()).toBe(false);
      expect(hasErrorTrackingConsent()).toBe(false);
    });

    it('supports granular selection', () => {
      saveConsentPreferences({ analytics: true, errorTracking: false });
      expect(hasAnalyticsConsent()).toBe(true);
      expect(hasErrorTrackingConsent()).toBe(false);
    });
  });

  // ─── hasAcceptedCookies (legacy compat) ───────────────────────

  describe('hasAcceptedCookies', () => {
    it('returns false by default', () => {
      expect(hasAcceptedCookies()).toBe(false);
    });

    it('returns true when analytics is enabled', () => {
      saveConsentPreferences({ analytics: true, errorTracking: false });
      expect(hasAcceptedCookies()).toBe(true);
    });
  });

  // ─── write functions ──────────────────────────────────────────

  describe('saveConsentPreferences', () => {
    it('persists preferences with current version and timestamp', () => {
      saveConsentPreferences({ analytics: true, errorTracking: true });
      const state = getConsentState();
      expect(state).not.toBeNull();
      expect(state!.version).toBe(CURRENT_CONSENT_VERSION);
      expect(state!.preferences.essential).toBe(true);
      expect(state!.preferences.analytics).toBe(true);
      expect(state!.preferences.errorTracking).toBe(true);
      expect(state!.timestamp).toBeTruthy();
    });
  });

  describe('acceptAllConsent', () => {
    it('enables all categories', () => {
      acceptAllConsent();
      const prefs = getConsentPreferences();
      expect(prefs.analytics).toBe(true);
      expect(prefs.errorTracking).toBe(true);
    });
  });

  describe('declineAllConsent', () => {
    it('disables all optional categories', () => {
      acceptAllConsent();
      declineAllConsent();
      const prefs = getConsentPreferences();
      expect(prefs.analytics).toBe(false);
      expect(prefs.errorTracking).toBe(false);
      expect(prefs.essential).toBe(true);
    });
  });

  describe('clearConsent', () => {
    it('removes consent key from localStorage', () => {
      acceptAllConsent();
      clearConsent();
      expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
      expect(getConsentState()).toBeNull();
    });
  });

  // ─── data management ──────────────────────────────────────────

  describe('exportUserData', () => {
    it('returns object with export metadata', () => {
      const data = exportUserData();
      expect(data._exportedAt).toBeTruthy();
      expect(data._version).toBe(CURRENT_CONSENT_VERSION);
    });

    it('includes saved consent preferences', () => {
      acceptAllConsent();
      const data = exportUserData();
      expect(data[CONSENT_KEY]).toBeDefined();
      const consentData = data[CONSENT_KEY] as { preferences: { analytics: boolean } };
      expect(consentData.preferences.analytics).toBe(true);
    });

    it('includes Redux persist data if present', () => {
      localStorage.setItem('persist:root', JSON.stringify({ ui: { darkMode: true } }));
      const data = exportUserData();
      expect(data['persist:root']).toBeDefined();
    });

    it('redacts live OAuth tokens instead of exporting them', () => {
      localStorage.setItem('access_token', 'live-access-token');
      localStorage.setItem('refresh_token', 'live-refresh-token');
      sessionStorage.setItem('discord_access_token', 'live-discord-token');
      const data = exportUserData();
      expect(data.access_token).toBe('[redacted]');
      expect(data.refresh_token).toBe('[redacted]');
      expect(data.discord_access_token).toBe('[redacted]');
      expect(JSON.stringify(data)).not.toContain('live-access-token');
      expect(JSON.stringify(data)).not.toContain('live-refresh-token');
      expect(JSON.stringify(data)).not.toContain('live-discord-token');
    });

    it('includes all current app preferences and dynamic report evidence', () => {
      localStorage.setItem('eso-build-editor-v1', JSON.stringify({ build: 'test' }));
      localStorage.setItem('replay.prefs.v1', JSON.stringify({ speed: 2 }));
      localStorage.setItem('latestReports.viewMode', 'cards');
      localStorage.setItem('eso-toolkit-metrics-layout', 'wrap');
      sessionStorage.setItem('kalpa.buildEvidence.private-report', JSON.stringify({ players: [] }));

      const data = exportUserData();

      expect(data['eso-build-editor-v1']).toEqual({ build: 'test' });
      expect(data['replay.prefs.v1']).toEqual({ speed: 2 });
      expect(data['latestReports.viewMode']).toBe('cards');
      expect(data['eso-toolkit-metrics-layout']).toBe('wrap');
      expect(data['kalpa.buildEvidence.private-report']).toEqual({ players: [] });
    });

    it('reports whether app data lives in local or session storage', () => {
      sessionStorage.setItem('access_token', 'live-access-token');
      localStorage.setItem('eso-logs-dark-mode', 'true');

      const entries = getApplicationStorageEntries();

      expect(entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'access_token',
            area: 'sessionStorage',
            present: true,
          }),
          expect.objectContaining({
            key: 'eso-logs-dark-mode',
            area: 'localStorage',
            present: true,
          }),
        ]),
      );
    });
  });

  describe('deleteAllUserData', () => {
    it('removes all known app storage keys', () => {
      localStorage.setItem('persist:root', 'test');
      localStorage.setItem('access_token', 'test');
      localStorage.setItem('refresh_token', 'test');
      localStorage.setItem(CONSENT_KEY, 'test');
      sessionStorage.setItem('discord_access_token', 'test');

      deleteAllUserData();

      expect(localStorage.getItem('persist:root')).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
      expect(sessionStorage.getItem('discord_access_token')).toBeNull();
    });

    it('does not remove unrelated keys', () => {
      localStorage.setItem('unrelated-key', 'keep-me');
      deleteAllUserData();
      expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
    });

    it('removes every registered preference and dynamic report-evidence key', () => {
      localStorage.setItem('eso-build-editor-v1', 'draft');
      localStorage.setItem('replay.mapMarkers.v1', 'markers');
      localStorage.setItem('latestReports.density', 'compact');
      sessionStorage.setItem('kalpa.buildEvidence.private-report', 'evidence');

      deleteAllUserData();

      expect(localStorage.getItem('eso-build-editor-v1')).toBeNull();
      expect(localStorage.getItem('replay.mapMarkers.v1')).toBeNull();
      expect(localStorage.getItem('latestReports.density')).toBeNull();
      expect(sessionStorage.getItem('kalpa.buildEvidence.private-report')).toBeNull();
    });
  });
});
