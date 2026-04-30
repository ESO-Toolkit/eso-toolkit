/**
 * CookieConsent exports
 */

export { CookieConsent } from './CookieConsent';
export {
  hasAcceptedCookies,
  getConsentState,
  clearConsent,
  hasAnalyticsConsent,
  hasErrorTrackingConsent,
  acceptAllConsent,
  declineAllConsent,
  saveConsentPreferences,
  exportUserData,
  deleteAllUserData,
} from '../../utils/consentManager';
export type { ConsentPreferences, ConsentState } from '../../utils/consentManager';
