/**
 * Image Upload API client.
 * Uploads images via the roster-hub-api Worker proxy (keeps ImgBB key server-side).
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';

const BASE_URL = getRosterHubBaseUrl();

export interface ImageUploadResult {
  id: string;
  url: string;
  thumb_url: string;
}

/**
 * Strip the `data:<mime>;base64,` prefix from a data-URL, returning raw base64.
 * If the string is already raw base64 it is returned unchanged.
 */
function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx !== -1 && dataUrl.startsWith('data:') ? dataUrl.slice(idx + 1) : dataUrl;
}

/**
 * Upload a screenshot to ImgBB via the authenticated Worker proxy.
 * Accepts either a raw base64 string or a full data-URL.
 */
export async function uploadScreenshot(
  imageDataUrl: string,
  token: string,
  name?: string,
): Promise<ImageUploadResult> {
  const image = stripDataUrlPrefix(imageDataUrl);

  const res = await fetch(`${BASE_URL}/images/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image, name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<ImageUploadResult>;
}

/** Report an image for inappropriate content. */
export async function reportImage(imageId: string, reason: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/images/${imageId}/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}

/** Delete an image you uploaded. */
export async function deleteImage(imageId: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/images/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}
