export const DATA_FETCH_CACHE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Freshness window for a cached report whose fights came back EMPTY. An empty
 * report is usually a just-uploaded log that ESO Logs is still parsing — it
 * heals upstream within minutes — so pinning it for the full
 * DATA_FETCH_CACHE_TIMEOUT keeps showing "Empty Log" long after the data
 * exists. Keep it just long enough to debounce rapid remounts.
 */
export const EMPTY_REPORT_CACHE_TIMEOUT = 15 * 1000; // 15 seconds

export const ERROR_TRACKING_TOKEN =
  '9eba53324bf5455db004638013efbb9064b4c8a84f605a7b0fc53cd482f4f2e2961c75a7d9d1a4a615b0536f861d8ab3';

export const APPLICATION_NAME = 'ESO Toolkit';
