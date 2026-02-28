/**
 * Granular Cookie/Privacy Consent Manager
 *
 * Manages user consent preferences for different categories of data processing:
 * - Essential: localStorage for app preferences (always allowed)
 * - Analytics: Google Analytics 4 tracking
 * - ErrorTracking: Rollbar error monitoring and performance tracking
 *
 * GDPR-compliant: No non-essential tracking occurs until explicit user consent.
 */

const CONSENT_STORAGE_KEY = 'eso-log-aggregator-cookie-consent';
const CONSENT_VERSION = '2'; // Bumped from '1' — granular categories

/** Individual consent categories */
export interface ConsentPreferences {
  /** User preferences and auth tokens — always enabled, cannot be declined */
  essential: true;
  /** Google Analytics 4 page views, events, and user properties */
  analytics: boolean;
  /** Rollbar error tracking and performance monitoring */
  errorTracking: boolean;
}

/** Persisted consent state */
export interface ConsentState {
  /** User's consent preferences per category */
  preferences: ConsentPreferences;
  /** Consent schema version — re-prompt when bumped */
  version: string;
  /** ISO 8601 timestamp of when consent was given/updated */
  timestamp: string;
}

/** Default preferences: nothing enabled except essential */
const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true,
  analytics: false,
  errorTracking: false,
};

// ─── Read helpers ─────────────────────────────────────────────

/**
 * Retrieve the persisted consent state, or null if no valid consent exists.
 */
export const getConsentState = (): ConsentState | null => {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Support legacy format (version '1' had { accepted: boolean })
    if (parsed.version === '1' || !parsed.preferences) {
      return null; // Force re-prompt on version upgrade
    }

    if (parsed.version !== CONSENT_VERSION) return null;

    return parsed as ConsentState;
  } catch {
    return null;
  }
};

/**
 * Check whether the user has responded to the consent prompt at all
 * (regardless of what they chose).
 */
export const hasRespondedToConsent = (): boolean => {
  return getConsentState() !== null;
};

/**
 * Get current consent preferences, falling back to defaults if no consent recorded.
 */
export const getConsentPreferences = (): ConsentPreferences => {
  const state = getConsentState();
  return state?.preferences ?? { ...DEFAULT_PREFERENCES };
};

/**
 * Check if user has consented to analytics tracking.
 */
export const hasAnalyticsConsent = (): boolean => {
  return getConsentPreferences().analytics;
};

/**
 * Check if user has consented to error tracking.
 */
export const hasErrorTrackingConsent = (): boolean => {
  return getConsentPreferences().errorTracking;
};

/**
 * Legacy compatibility — returns true if user accepted analytics.
 * Used by existing analytics.ts `hasUserConsented()` pattern.
 */
export const hasAcceptedCookies = (): boolean => {
  return hasAnalyticsConsent();
};

// ─── Write helpers ────────────────────────────────────────────

/**
 * Save consent preferences to localStorage.
 */
export const saveConsentPreferences = (
  preferences: Omit<ConsentPreferences, 'essential'>,
): void => {
  try {
    const state: ConsentState = {
      preferences: { essential: true, ...preferences },
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — degrade gracefully
  }
};

/**
 * Accept all consent categories.
 */
export const acceptAllConsent = (): void => {
  saveConsentPreferences({ analytics: true, errorTracking: true });
};

/**
 * Decline all optional consent categories.
 */
export const declineAllConsent = (): void => {
  saveConsentPreferences({ analytics: false, errorTracking: false });
};

/**
 * Clear consent entirely — forces re-prompt on next visit.
 */
export const clearConsent = (): void => {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Ignore
  }
};

// ─── Data management ──────────────────────────────────────────

/** All known localStorage keys used by the application */
const APP_STORAGE_KEYS = [
  'persist:root', // Redux Persist
  'access_token', // OAuth
  'refresh_token', // OAuth
  'eso_code_verifier', // PKCE
  'eso_intended_destination', // Post-login redirect
  CONSENT_STORAGE_KEY, // Consent itself
  'eso-logger-level', // Logger verbosity
] as const;

/**
 * Export all application data stored in localStorage as a JSON object.
 * GDPR Article 20 — Right to data portability.
 */
export const exportUserData = (): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  for (const key of APP_STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    } catch {
      // Skip inaccessible keys
    }
  }
  data._exportedAt = new Date().toISOString();
  data._version = CONSENT_VERSION;
  return data;
};

/**
 * Delete all application data from localStorage.
 * GDPR Article 17 — Right to erasure ("right to be forgotten").
 */
export const deleteAllUserData = (): void => {
  for (const key of APP_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

/** Current consent version, exported for tests */
export const CURRENT_CONSENT_VERSION = CONSENT_VERSION;
