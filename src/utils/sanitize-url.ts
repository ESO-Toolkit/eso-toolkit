const YOUTUBE_HOST_RE = /(^|\.)youtube\.com$|^youtu\.be$|^m\.youtube\.com$/;

export function sanitizeYoutubeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      YOUTUBE_HOST_RE.test(parsed.hostname)
    ) {
      return parsed.href;
    }
  } catch {
    // invalid URL
  }
  return null;
}

/**
 * Sanitize an image URL coming from untrusted, user-shareable data (e.g. a
 * decoded `?b=` build blob). Only absolute http(s) URLs are allowed — this
 * rejects `data:`, `javascript:`, `blob:` and other schemes that could be used
 * for tracking beacons or other abuse via an <img src>.
 */
export function sanitizeImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // invalid / relative URL
  }
  return null;
}
