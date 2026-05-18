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
