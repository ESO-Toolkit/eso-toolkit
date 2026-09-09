import type { Metric } from 'web-vitals';
import * as webVitals from 'web-vitals';

jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onINP: jest.fn(),
  onFCP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

import {
  createFieldWebVitalsReporter,
  getDeviceTier,
  getNetworkTier,
  resetFieldWebVitalsCollection,
  startFieldWebVitalsCollection,
  toPrivacySafeRouteTemplate,
} from './reportWebVitals';

const metric = (value: number): Metric => ({ name: 'INP', value, rating: 'good' }) as Metric;

describe('field Web Vitals telemetry', () => {
  it('templates report routes and removes report codes, player identifiers, queries, and hashes', () => {
    const route = toPrivacySafeRouteTemplate(
      '/report/SECRET_REPORT/fight/42/insights?player=Lady%20Ardent&token=do-not-send#damage',
    );

    expect(route).toBe('/report/:reportId/fight/:fightId/insights');
    expect(route).not.toContain('SECRET_REPORT');
    expect(route).not.toContain('Lady');
    expect(route).not.toContain('token');
  });

  it('does not preserve public profile names or unknown path values', () => {
    expect(toPrivacySafeRouteTemplate('/u/Player-Name')).toBe('/u/:playerId');
    expect(toPrivacySafeRouteTemplate('/experimental/unique-player-value')).toBe(
      '/:segment/:segment',
    );
  });

  it('does not collect a payload without analytics consent', () => {
    const onSample = jest.fn();
    const report = createFieldWebVitalsReporter({
      onSample,
      hasConsent: () => false,
      getEnvironment: () => ({
        pathname: '/report/SECRET_REPORT/fight/42/insights?player=Lady%20Ardent',
        userAgent: 'Mozilla/5.0 (iPhone)',
        effectiveConnectionType: '4g',
      }),
    });

    report(metric(120));
    expect(onSample).not.toHaveBeenCalled();
  });

  it('defaults to no collection when analytics consent has not been recorded', () => {
    localStorage.clear();
    const onSample = jest.fn();

    createFieldWebVitalsReporter({
      onSample,
      getEnvironment: () => ({ pathname: '/report/SECRET_REPORT/fight/42/insights' }),
    })(metric(120));

    expect(onSample).not.toHaveBeenCalled();
  });

  it('registers observers once, suppresses duplicates, and supports a fresh start after reset', async () => {
    const onSample = jest.fn();
    const firstDisposer = startFieldWebVitalsCollection({ onSample, hasConsent: () => false });
    const duplicateDisposer = startFieldWebVitalsCollection({
      onSample: jest.fn(),
      hasConsent: () => true,
    });

    expect(duplicateDisposer).toBe(firstDisposer);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const observer = webVitals as unknown as Record<string, jest.Mock>;
    expect(observer.onCLS).toHaveBeenCalledWith(expect.any(Function));
    expect(observer.onINP).toHaveBeenCalledWith(expect.any(Function));
    expect(observer.onFCP).toHaveBeenCalledWith(expect.any(Function));
    expect(observer.onLCP).toHaveBeenCalledWith(expect.any(Function));
    expect(observer.onTTFB).toHaveBeenCalledWith(expect.any(Function));

    const observerCallback = observer.onINP.mock.calls[0][0] as (value: Metric) => void;
    observerCallback(metric(120));
    expect(onSample).not.toHaveBeenCalled();

    firstDisposer();
    const freshSample = jest.fn();
    const freshDisposer = startFieldWebVitalsCollection({
      onSample: freshSample,
      hasConsent: () => true,
      getEnvironment: () => ({ pathname: '/dashboard' }),
    });

    expect(freshDisposer).not.toBe(firstDisposer);
    expect(observer.onCLS).toHaveBeenCalledTimes(1);
    observerCallback(metric(240));
    expect(freshSample).toHaveBeenCalledWith({
      name: 'INP',
      value: 240,
      rating: 'good',
      route: '/dashboard',
      deviceTier: 'desktop',
      networkTier: 'unknown',
    });

    resetFieldWebVitalsCollection();
    observerCallback(metric(360));
    expect(freshSample).toHaveBeenCalledTimes(1);
  });

  it('emits only allowlisted, coarse fields after consent', () => {
    const onSample = jest.fn();
    createFieldWebVitalsReporter({
      onSample,
      hasConsent: () => true,
      getEnvironment: () => ({
        pathname: '/report/SECRET_REPORT/fight/42/insights?player=Lady%20Ardent',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        effectiveConnectionType: '4g',
      }),
    })(metric(120));

    expect(onSample).toHaveBeenCalledWith({
      name: 'INP',
      value: 120,
      rating: 'good',
      route: '/report/:reportId/fight/:fightId/insights',
      deviceTier: 'mobile',
      networkTier: 'fast',
    });
    expect(Object.keys(onSample.mock.calls[0][0]).sort()).toEqual([
      'deviceTier',
      'name',
      'networkTier',
      'rating',
      'route',
      'value',
    ]);
  });

  it('uses only coarse mobile/desktop and connection categories', () => {
    expect(getDeviceTier('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(getDeviceTier('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('mobile');
    expect(getNetworkTier('2g')).toBe('slow');
    expect(getNetworkTier('3g')).toBe('standard');
    expect(getNetworkTier('4g')).toBe('fast');
    expect(getNetworkTier('wifi')).toBe('unknown');
  });

  it('retries observer registration after a rejected web-vitals import', async () => {
    jest.resetModules();
    let shouldRejectImport = true;
    const importedObservers = {
      onCLS: jest.fn(),
      onINP: jest.fn(),
      onFCP: jest.fn(),
      onLCP: jest.fn(),
      onTTFB: jest.fn(),
    };

    jest.doMock('web-vitals', () => {
      if (shouldRejectImport) throw new Error('web-vitals unavailable');
      return importedObservers;
    });

    let isolatedReportWebVitals!: typeof import('./reportWebVitals');
    await jest.isolateModulesAsync(async () => {
      isolatedReportWebVitals = await import('./reportWebVitals');
    });

    const firstDisposer = isolatedReportWebVitals.startFieldWebVitalsCollection({
      onSample: jest.fn(),
      hasConsent: () => true,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    shouldRejectImport = false;
    const retryDisposer = isolatedReportWebVitals.startFieldWebVitalsCollection({
      onSample: jest.fn(),
      hasConsent: () => true,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(retryDisposer).not.toBe(firstDisposer);
    expect(importedObservers.onCLS).toHaveBeenCalledTimes(1);
    retryDisposer();
  });
});
