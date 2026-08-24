/**
 * Granular Cookie/Privacy Consent Manager
 *
 * Manages user consent preferences for different categories of data processing:
 * - Essential: browser storage for app preferences (always allowed)
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

export type BrowserStorageArea = 'localStorage' | 'sessionStorage';

export interface ApplicationStorageKeyDefinition {
  key: string;
  label: string;
  description: string;
  areas: readonly BrowserStorageArea[];
}

const localOnly = ['localStorage'] as const;
const sessionFirst = ['sessionStorage', 'localStorage'] as const;

/**
 * Central registry for every fixed browser-storage key owned by the app.
 * Authentication entries include localStorage solely for migration/cleanup of
 * older releases; current credentials are session-scoped.
 */
export const APP_STORAGE_KEY_DEFINITIONS: readonly ApplicationStorageKeyDefinition[] = [
  {
    key: 'persist:root',
    label: 'App state',
    description: 'Saved builds, dashboard state, and UI preferences',
    areas: localOnly,
  },
  {
    key: 'access_token',
    label: 'ESO Logs access token',
    description: 'Session-scoped API credential (redacted from exports)',
    areas: sessionFirst,
  },
  {
    key: 'refresh_token',
    label: 'ESO Logs refresh token',
    description: 'Session-scoped renewal credential (redacted from exports)',
    areas: sessionFirst,
  },
  {
    key: 'eso_code_verifier',
    label: 'OAuth PKCE verifier',
    description: 'Temporary ESO Logs sign-in value',
    areas: sessionFirst,
  },
  {
    key: 'eso_oauth_state',
    label: 'OAuth state',
    description: 'Temporary sign-in forgery protection value',
    areas: sessionFirst,
  },
  {
    key: 'app_auth_port',
    label: 'Desktop OAuth callback',
    description: 'Temporary desktop callback port and state binding',
    areas: sessionFirst,
  },
  {
    key: 'discord_access_token',
    label: 'Discord access token',
    description: 'Session-scoped Discord credential (redacted from exports)',
    areas: sessionFirst,
  },
  {
    key: 'discord_token_expires_at',
    label: 'Discord token expiry',
    description: 'Expiry time for the current Discord session',
    areas: sessionFirst,
  },
  {
    key: 'discord_oauth_state',
    label: 'Discord OAuth state',
    description: 'Temporary Discord sign-in forgery protection value',
    areas: sessionFirst,
  },
  {
    key: 'discord_oauth_return_path',
    label: 'Discord return path',
    description: 'Page restored after Discord sign-in',
    areas: sessionFirst,
  },
  {
    key: 'redirectPath',
    label: 'Route restoration path',
    description: 'Temporary path used by static-host SPA routing',
    areas: ['sessionStorage'],
  },
  {
    key: 'eso_intended_destination',
    label: 'Post-login destination',
    description: 'Page restored after ESO Logs sign-in',
    areas: localOnly,
  },
  {
    key: 'eso_intended_destination_protected',
    label: 'Protected-route marker',
    description: 'Whether the post-login destination requires authentication',
    areas: localOnly,
  },
  {
    key: 'dev_preview_oauth_return_path',
    label: 'Preview OAuth return path',
    description: 'Development-preview route restored after sign-in',
    areas: localOnly,
  },
  {
    key: CONSENT_STORAGE_KEY,
    label: 'Consent preferences',
    description: 'Analytics and error-tracking choices',
    areas: localOnly,
  },
  {
    key: 'eso-logger-level',
    label: 'Logger level',
    description: 'Local diagnostic verbosity preference',
    areas: localOnly,
  },
  {
    key: 'eso-build-editor-v1',
    label: 'Build editor draft',
    description: 'Locally saved character build and active setup',
    areas: localOnly,
  },
  {
    key: 'replay.prefs.v1',
    label: 'Fight replay preferences',
    description: 'Viewer display, path, speed, and performance choices',
    areas: localOnly,
  },
  {
    key: 'replay.mapMarkers.v1',
    label: 'Fight replay map markers',
    description: 'Locally created replay markers by zone',
    areas: localOnly,
  },
  {
    key: 'replay.zoomHintDismissed.v1',
    label: 'Replay zoom hint',
    description: 'Whether the replay zoom hint was dismissed',
    areas: localOnly,
  },
  {
    key: 'latestReports.viewMode',
    label: 'Latest reports view',
    description: 'Table or card layout preference',
    areas: localOnly,
  },
  {
    key: 'latestReports.density',
    label: 'Latest reports density',
    description: 'Comfortable or compact row density',
    areas: localOnly,
  },
  {
    key: 'eso-logs-dark-mode',
    label: 'Color theme',
    description: 'Light or dark appearance preference',
    areas: localOnly,
  },
  {
    key: 'eso-toolkit-whats-new-last-seen',
    label: "What's new status",
    description: 'Timestamp of the latest viewed release update',
    areas: localOnly,
  },
  {
    key: 'eso-toolkit-metrics-layout',
    label: 'Metrics layout',
    description: 'Wrap or horizontal-scroll metrics preference',
    areas: localOnly,
  },
  {
    key: 'eso-toolkit-stat-chip-preferences',
    label: 'Stat chip preferences',
    description: 'Visible player-stat fields',
    areas: localOnly,
  },
  {
    key: 'eso-toolkit-stat-chip-preferences:native-evidence-defaults-v1',
    label: 'Stat preference migration',
    description: 'Internal marker for applied stat defaults',
    areas: localOnly,
  },
  {
    key: 'lastVersionCheck',
    label: 'Last update check',
    description: 'Timestamp of the latest version check',
    areas: localOnly,
  },
  {
    key: 'availableVersion',
    label: 'Available version',
    description: 'Build identifier found during an update check',
    areas: localOnly,
  },
  {
    key: 'dismissedVersion',
    label: 'Dismissed update',
    description: 'Build identifier for a dismissed update notice',
    areas: localOnly,
  },
  {
    key: 'activeTab',
    label: 'Calculator tab',
    description: 'Active calculator tab preference',
    areas: localOnly,
  },
  {
    key: 'calcMode',
    label: 'Calculator mode',
    description: 'Selected calculator display mode',
    areas: localOnly,
  },
  {
    key: 'liteMode',
    label: 'Calculator lite mode',
    description: 'Reduced calculator presentation preference',
    areas: localOnly,
  },
] as const;

const APP_STORAGE_PREFIX_DEFINITIONS = [
  {
    prefix: 'kalpa.buildEvidence.',
    label: 'Report build evidence',
    description: 'Temporary companion build evidence for the current report',
    areas: ['sessionStorage'] as const,
  },
] as const;

/**
 * Live credentials that must never be written into the downloadable export —
 * a leaked OAuth token is an account-takeover vector, not portable user data.
 */
const REDACTED_EXPORT_KEYS: ReadonlySet<string> = new Set([
  'access_token',
  'refresh_token',
  'discord_access_token',
]);
const SESSION_STORAGE_KEYS: ReadonlySet<string> = new Set([
  'access_token',
  'refresh_token',
  'eso_code_verifier',
  'eso_oauth_state',
  'app_auth_port',
  'discord_access_token',
  'discord_token_expires_at',
  'discord_oauth_state',
  'discord_oauth_return_path',
]);

const getStorage = (area: BrowserStorageArea): Storage =>
  area === 'sessionStorage' ? sessionStorage : localStorage;

const getDynamicStorageKeys = (area: BrowserStorageArea): string[] => {
  try {
    const storage = getStorage(area);
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key &&
        APP_STORAGE_PREFIX_DEFINITIONS.some(
          (definition) =>
            definition.areas.some((candidateArea) => candidateArea === area) &&
            key.startsWith(definition.prefix),
        )
      ) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
};

export interface ApplicationStorageEntry {
  key: string;
  label: string;
  description: string;
  area: BrowserStorageArea;
  present: boolean;
  size: number;
}

/** Return the app-owned Web Storage inventory used by the privacy UI. */
export const getApplicationStorageEntries = (): ApplicationStorageEntry[] => {
  const entries = APP_STORAGE_KEY_DEFINITIONS.map((definition) => {
    let area = definition.areas[0];
    let value: string | null = null;
    for (const candidateArea of definition.areas) {
      try {
        const candidateValue = getStorage(candidateArea).getItem(definition.key);
        if (candidateValue !== null) {
          area = candidateArea;
          value = candidateValue;
          break;
        }
      } catch {
        // Try the next legacy/current storage area.
      }
    }

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      area,
      present: value !== null,
      size: value === null ? 0 : new Blob([value]).size,
    };
  });

  APP_STORAGE_PREFIX_DEFINITIONS.forEach((definition) => {
    definition.areas.forEach((area) => {
      getDynamicStorageKeys(area).forEach((key) => {
        try {
          const value = getStorage(area).getItem(key);
          entries.push({
            key,
            label: definition.label,
            description: definition.description,
            area,
            present: value !== null,
            size: value === null ? 0 : new Blob([value]).size,
          });
        } catch {
          // Skip inaccessible dynamic entries.
        }
      });
    });
  });

  return entries;
};

/**
 * Export all application data stored in browser storage as a JSON object.
 * GDPR Article 20 — Right to data portability.
 */
export const exportUserData = (): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  const keys = new Set([
    ...APP_STORAGE_KEY_DEFINITIONS.map(({ key }) => key),
    ...getDynamicStorageKeys('localStorage'),
    ...getDynamicStorageKeys('sessionStorage'),
  ]);
  for (const key of keys) {
    try {
      const value = SESSION_STORAGE_KEYS.has(key)
        ? (sessionStorage.getItem(key) ?? localStorage.getItem(key))
        : (localStorage.getItem(key) ?? sessionStorage.getItem(key));
      if (value !== null) {
        if (REDACTED_EXPORT_KEYS.has(key)) {
          data[key] = '[redacted]';
          continue;
        }
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
 * Delete all application data from browser storage.
 * GDPR Article 17 — Right to erasure ("right to be forgotten").
 */
export const deleteAllUserData = (): void => {
  const keys = new Set([
    ...APP_STORAGE_KEY_DEFINITIONS.map(({ key }) => key),
    ...getDynamicStorageKeys('localStorage'),
    ...getDynamicStorageKeys('sessionStorage'),
  ]);
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

/** Current consent version, exported for tests */
export const CURRENT_CONSENT_VERSION = CONSENT_VERSION;
