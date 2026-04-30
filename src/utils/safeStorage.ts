/**
 * Safe storage utilities to handle SecurityError exceptions
 *
 * These utilities wrap localStorage and sessionStorage access in try-catch blocks
 * to gracefully handle SecurityError that can occur in:
 * - iframes with different origins
 * - browsers with strict security settings
 * - when users have disabled storage/cookies
 * - insecure contexts (non-HTTPS in some browsers)
 *
 * Related to Sentry issue: ESO-509
 */

/**
 * Safely get an item from localStorage
 * @param key - The key to retrieve
 * @returns The value or null if not found or inaccessible
 */
export const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to access localStorage for key "${key}":`, error);
    return null;
  }
};

/**
 * Safely set an item in localStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to set localStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Safely remove an item from localStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export const safeLocalStorageRemove = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to remove from localStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Safely get an item from sessionStorage
 * @param key - The key to retrieve
 * @returns The value or null if not found or inaccessible
 */
export const safeSessionStorageGet = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to access sessionStorage for key "${key}":`, error);
    return null;
  }
};

/**
 * Safely set an item in sessionStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export const safeSessionStorageSet = (key: string, value: string): boolean => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to set sessionStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Safely remove an item from sessionStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export const safeSessionStorageRemove = (key: string): boolean => {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to remove from sessionStorage for key "${key}":`, error);
    return false;
  }
};

/**
 * Check if localStorage is available
 * @returns true if localStorage can be accessed
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if sessionStorage is available
 * @returns true if sessionStorage can be accessed
 */
export const isSessionStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};
