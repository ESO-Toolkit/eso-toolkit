/**
 * Service Worker Cache Management
 * Handles cache invalidation based on version changes
 */

/// <reference lib="webworker" />

import { getBuildInfo, getCacheBustingQuery } from '../utils/cacheBusting';
import { getBaseUrl } from '../utils/envUtils';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME_PREFIX = 'eso-log-aggregator';
const CURRENT_VERSION = getBuildInfo().buildId;
const CACHE_NAME = `${CACHE_NAME_PREFIX}-${CURRENT_VERSION}`;

// Assets that should always be cached
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.ico', '/robots.txt'];

// Assets that should be cached with version checking
const VERSIONED_ASSETS = [`${getBaseUrl()}version.json`];

/**
 * Check if a cache should be invalidated based on version
 */
async function shouldInvalidateCache(): Promise<boolean> {
  try {
    // Try to fetch the current version from the server, respecting BASE_URL
    const baseUrl = getBaseUrl();
    const versionUrl = `${baseUrl}version.json?${getCacheBustingQuery()}`;
    const response = await fetch(versionUrl);
    if (!response.ok) return false;

    const serverVersion = await response.json();
    const localVersion = getBuildInfo();

    // Invalidate if server version is different
    return serverVersion.buildId !== localVersion.buildId;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Could not check version for cache invalidation:', error);
    return false;
  }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches(): Promise<void> {
  const cacheNames = await caches.keys();

  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(CACHE_NAME_PREFIX) && cacheName !== CACHE_NAME)
      .map((cacheName) => {
        // eslint-disable-next-line no-console
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }),
  );
}

/**
 * Preload essential assets
 */
async function preloadAssets(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Add cache-busting parameters to versioned assets
    const versionedUrls = VERSIONED_ASSETS.map((url) => `${url}?${getCacheBustingQuery()}`);

    await cache.addAll([...STATIC_ASSETS, ...versionedUrls]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to preload some assets:', error);
  }
}

/**
 * Handle fetch requests with caching strategy
 */
async function handleFetch(event: FetchEvent): Promise<Response> {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return fetch(request);
  }

  // For navigation requests, always try network first
  if (request.mode === 'navigate') {
    try {
      const response = await fetch(request);
      // Cache successful navigation responses
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // Fallback to cache for offline scenarios
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  // For other requests, try cache first, then network
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // For versioned assets, check if we need to update
    if (VERSIONED_ASSETS.some((asset) => url.pathname.endsWith(asset))) {
      // Fetch in background to update cache
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
        })
        .catch(() => {
          // Ignore background fetch errors
        });
    }

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // For asset requests, we might want to provide a fallback
    throw error;
  }
}

// Service Worker Event Listeners
self.addEventListener('install', (event: ExtendableEvent) => {
  // eslint-disable-next-line no-console
  console.log('Service Worker installing, version:', CURRENT_VERSION);

  event.waitUntil(
    Promise.all([
      preloadAssets(),
      self.skipWaiting(), // Activate immediately
    ]),
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  // eslint-disable-next-line no-console
  console.log('Service Worker activating, version:', CURRENT_VERSION);

  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      self.clients.claim(), // Take control of all pages
    ]),
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleFetch(event));
});

// Listen for messages from the main thread
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_VERSION') {
    shouldInvalidateCache().then((shouldInvalidate) => {
      event.ports[0]?.postMessage({
        type: 'VERSION_CHECK_RESULT',
        shouldInvalidate,
        currentVersion: CURRENT_VERSION,
      });
    });
  }
});

export {};
