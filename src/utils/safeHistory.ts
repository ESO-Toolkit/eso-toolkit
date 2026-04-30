/**
 * Safe history utilities to handle SecurityError exceptions
 *
 * These utilities wrap window.history methods in try-catch blocks
 * to gracefully handle SecurityError that can occur in:
 * - iframes with different origins
 * - browsers with strict security settings (e.g., Firefox with tracking protection)
 * - private browsing mode with enhanced privacy features
 * - insecure contexts (non-HTTPS in some browsers)
 *
 * Related to Sentry issue: ESO-LOGS-82 (ESO-536)
 */

/**
 * Safely call window.history.replaceState
 * @param data - The state object
 * @param unused - The title parameter (unused in most browsers)
 * @param url - The new URL
 * @returns true if successful, false otherwise
 */
export const safeHistoryReplaceState = (
  data: unknown,
  unused: string,
  url?: string | URL | null,
): boolean => {
  try {
    window.history.replaceState(data, unused, url);
    return true;
  } catch (error) {
    // SecurityError can occur in Firefox with tracking protection,
    // iframes, or other restricted contexts
    // eslint-disable-next-line no-console
    console.warn('Unable to call history.replaceState:', error);
    return false;
  }
};

/**
 * Safely call window.history.pushState
 * @param data - The state object
 * @param unused - The title parameter (unused in most browsers)
 * @param url - The new URL
 * @returns true if successful, false otherwise
 */
export const safeHistoryPushState = (
  data: unknown,
  unused: string,
  url?: string | URL | null,
): boolean => {
  try {
    window.history.pushState(data, unused, url);
    return true;
  } catch (error) {
    // SecurityError can occur in Firefox with tracking protection,
    // iframes, or other restricted contexts
    // eslint-disable-next-line no-console
    console.warn('Unable to call history.pushState:', error);
    return false;
  }
};
