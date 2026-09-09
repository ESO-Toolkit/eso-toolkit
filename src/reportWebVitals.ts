import type { Metric } from 'web-vitals';

import { hasAnalyticsConsent } from './utils/consentManager';

export type DeviceTier = 'mobile' | 'desktop';
export type NetworkTier = 'slow' | 'standard' | 'fast' | 'unknown';

const FIELD_WEB_VITAL_NAMES = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'] as const;
const FIELD_WEB_VITAL_RATINGS = ['good', 'needs-improvement', 'poor'] as const;
const DEVICE_TIERS = ['mobile', 'desktop'] as const;
const NETWORK_TIERS = ['slow', 'standard', 'fast', 'unknown'] as const;
const FIELD_WEB_VITAL_KEYS = [
  'name',
  'value',
  'rating',
  'route',
  'deviceTier',
  'networkTier',
] as const;

/** The deliberately small, non-identifying payload allowed to leave the client. */
export interface FieldWebVitalSample {
  name: Metric['name'];
  value: number;
  rating: Metric['rating'];
  route: string;
  deviceTier: DeviceTier;
  networkTier: NetworkTier;
}

export interface FieldWebVitalsEnvironment {
  pathname: string;
  userAgent?: string;
  effectiveConnectionType?: string;
}

export interface FieldWebVitalsOptions {
  /** Sends a sample to the application's consent-aware telemetry transport. */
  onSample: (sample: FieldWebVitalSample) => void;
  /** Injectable for deterministic tests; defaults to the current browser environment. */
  getEnvironment?: () => FieldWebVitalsEnvironment;
  /** Injectable for deterministic tests; defaults to analytics-cookie consent. */
  hasConsent?: () => boolean;
}

/** Runtime guard for the fixed schema used at the telemetry transport boundary. */
export const isValidFieldWebVitalSample = (sample: unknown): sample is FieldWebVitalSample => {
  if (!sample || typeof sample !== 'object') return false;

  const candidate = sample as Record<string, unknown>;
  return (
    Object.keys(candidate).length === FIELD_WEB_VITAL_KEYS.length &&
    FIELD_WEB_VITAL_KEYS.every((key) => Object.hasOwn(candidate, key)) &&
    FIELD_WEB_VITAL_NAMES.includes(candidate.name as (typeof FIELD_WEB_VITAL_NAMES)[number]) &&
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    candidate.value >= 0 &&
    FIELD_WEB_VITAL_RATINGS.includes(
      candidate.rating as (typeof FIELD_WEB_VITAL_RATINGS)[number],
    ) &&
    typeof candidate.route === 'string' &&
    DEVICE_TIERS.includes(candidate.deviceTier as (typeof DEVICE_TIERS)[number]) &&
    NETWORK_TIERS.includes(candidate.networkTier as (typeof NETWORK_TIERS)[number])
  );
};

const STATIC_ROUTE_SEGMENTS = new Set([
  'report',
  'fight',
  'live',
  'summary',
  'dashboard',
  'replay',
  'insights',
  'my-reports',
  'latest-reports',
  'raid-dashboard',
  'build-leaderboard',
  'class',
  'boss',
  'builds',
  'build-editor',
  'roster-builder',
  'profile',
  'settings',
  'login',
  'logout',
  'u',
]);

const DYNAMIC_ROUTE_SEGMENTS: Readonly<Record<string, string>> = {
  report: 'reportId',
  fight: 'fightId',
  u: 'playerId',
};

/**
 * Produces a route template without ever retaining path values or query/hash data.
 * The report and player positions are always parameterized, even if their value
 * happens to match a static route word.
 */
export const toPrivacySafeRouteTemplate = (pathname: string): string => {
  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? '';
  const segments = pathOnly.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const template = segments.map((segment, index) => {
    const previous = segments[index - 1];
    const parameterName = previous ? DYNAMIC_ROUTE_SEGMENTS[previous] : undefined;
    return parameterName
      ? `:${parameterName}`
      : STATIC_ROUTE_SEGMENTS.has(segment)
        ? segment
        : ':segment';
  });

  return `/${template.join('/')}`;
};

export const getDeviceTier = (userAgent = ''): DeviceTier =>
  /Android|iPhone|iPad|iPod|Mobi/i.test(userAgent) ? 'mobile' : 'desktop';

export const getNetworkTier = (effectiveConnectionType?: string): NetworkTier => {
  switch (effectiveConnectionType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'standard';
    case '4g':
      return 'fast';
    default:
      return 'unknown';
  }
};

const getBrowserEnvironment = (): FieldWebVitalsEnvironment => {
  if (typeof window === 'undefined') return { pathname: '/' };

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  return {
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    effectiveConnectionType: connection?.effectiveType,
  };
};

/**
 * Builds a consent-gated field reporter. Metrics contain additional browser
 * details, so this function copies only the six allowlisted fields above.
 */
export const createFieldWebVitalsReporter = (
  options: FieldWebVitalsOptions,
): ((metric: Metric) => void) => {
  const getEnvironment = options.getEnvironment ?? getBrowserEnvironment;
  const consentCheck = options.hasConsent ?? hasAnalyticsConsent;

  return (metric: Metric): void => {
    if (!consentCheck() || !metric || typeof metric !== 'object') return;

    const environment = getEnvironment();
    if (!environment || typeof environment.pathname !== 'string') return;
    const sample: FieldWebVitalSample = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      route: toPrivacySafeRouteTemplate(environment.pathname),
      deviceTier: getDeviceTier(environment.userAgent),
      networkTier: getNetworkTier(environment.effectiveConnectionType),
    };

    if (isValidFieldWebVitalSample(sample)) options.onSample(sample);
  };
};

type FieldWebVitalsDisposer = () => void;

let observerRegistration: Promise<void> | undefined;
let activeObserverCallback: ((metric: Metric) => void) | undefined;
let activeFieldWebVitalsDisposer: FieldWebVitalsDisposer | undefined;

/**
 * Registers browser observers at most once. web-vitals v5 intentionally does
 * not expose observer cleanup, so a disposer deactivates the shared callback;
 * a later start can safely replace it without adding duplicate listeners.
 */
export const reportWebVitals = (onPerfEntry?: (metric: Metric) => void): FieldWebVitalsDisposer => {
  if (!(onPerfEntry instanceof Function)) return () => undefined;

  activeObserverCallback = onPerfEntry;
  if (!observerRegistration) {
    const observerCallback = (metric: Metric): void => activeObserverCallback?.(metric);
    observerRegistration = import('web-vitals')
      .then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        onCLS(observerCallback);
        onINP(observerCallback);
        onFCP(observerCallback);
        onLCP(observerCallback);
        onTTFB(observerCallback);
      })
      .catch(() => {
        observerRegistration = undefined;
        activeObserverCallback = undefined;
        activeFieldWebVitalsDisposer = undefined;
      });
  }

  let disposed = false;
  return (): void => {
    if (disposed) return;
    disposed = true;
    if (activeObserverCallback === onPerfEntry) activeObserverCallback = undefined;
  };
};

/** Registers each browser Web Vital with the consent-gated field collector. */
export const startFieldWebVitalsCollection = (
  options: FieldWebVitalsOptions,
): FieldWebVitalsDisposer => {
  if (activeFieldWebVitalsDisposer) return activeFieldWebVitalsDisposer;

  const reporter = createFieldWebVitalsReporter(options);
  const disposeObservers = reportWebVitals(reporter);
  const dispose = (): void => {
    disposeObservers();
    if (activeFieldWebVitalsDisposer === dispose) activeFieldWebVitalsDisposer = undefined;
  };

  activeFieldWebVitalsDisposer = dispose;
  return dispose;
};

/** Stops delivery to the current collector while retaining the one-time observers. */
export const resetFieldWebVitalsCollection = (): void => {
  activeFieldWebVitalsDisposer?.();
};
