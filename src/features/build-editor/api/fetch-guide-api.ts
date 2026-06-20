/**
 * Fetch-guide API client.
 * Fetches a build-guide page through the roster-hub-api Worker proxy (the
 * browser can't fetch third-party pages directly — CORS), then extracts the
 * parser-ready text client-side.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';
import { extractGuide, type ExtractedGuide } from '../utils/guideTextExtractor';

const BASE_URL = getRosterHubBaseUrl();

export interface GuideFetchResult extends ExtractedGuide {
  finalUrl: string;
}

/** Fetch a guide page by URL via the worker proxy and extract its build text. */
export async function fetchGuideByUrl(url: string): Promise<GuideFetchResult> {
  const res = await fetch(`${BASE_URL}/fetch-guide?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Couldn't fetch that link (${res.status}).`);
  }
  const data = (await res.json()) as { html?: string; finalUrl?: string };
  const finalUrl = data.finalUrl || url;
  const extracted = extractGuide(data.html ?? '', finalUrl);
  return { ...extracted, finalUrl };
}
