import { Logger } from './logger';

const logger = new Logger({ contextPrefix: 'SafeClipboard' });

/**
 * Copy text to the clipboard with graceful fallbacks.
 *
 * Tries the async Clipboard API first, then falls back to a hidden textarea +
 * `document.execCommand('copy')` for insecure contexts or browsers that do not
 * support `navigator.clipboard`. Returns `false` only when every strategy fails,
 * so callers can surface an error to the user.
 *
 * @param text - The text to place on the clipboard
 * @returns true if the copy succeeded, false otherwise
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // Preferred path: async Clipboard API (requires a secure context + permission).
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      logger.warn('navigator.clipboard.writeText failed, falling back to execCommand', { error });
    }
  }

  // Fallback: hidden textarea + document.execCommand('copy').
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Keep it off-screen and out of the layout/focus flow.
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  } catch (error) {
    logger.warn('execCommand copy fallback failed', { error });
    return false;
  }
};
