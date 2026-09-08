export const MAX_SCREENSHOTS_PER_SETUP = 8;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const SUPPORTED_SCREENSHOT_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const SCREENSHOT_FILE_ACCEPT = [...SUPPORTED_SCREENSHOT_MIME_TYPES].join(',');

export const isSupportedScreenshotMimeType = (mimeType: string): boolean =>
  SUPPORTED_SCREENSHOT_MIME_TYPES.has(mimeType.toLowerCase());

const dataUrlPattern = /^data:(image\/(?:avif|gif|jpeg|png|webp));base64,([a-z\d+/]*={0,2})$/i;

/** Validate the same screenshot boundary for uploads and imported documents. */
export const isSupportedScreenshot = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
  } catch {
    // Uploaded screenshots use data URLs, which URL intentionally rejects here.
  }

  const match = dataUrlPattern.exec(value);
  if (!match || !isSupportedScreenshotMimeType(match[1])) return false;

  const payload = match[2];
  if (payload.length % 4 !== 0) return false;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const decodedBytes = (payload.length / 4) * 3 - padding;
  return decodedBytes <= MAX_SCREENSHOT_BYTES;
};
