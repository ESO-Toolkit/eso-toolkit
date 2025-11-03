/**
 * Tests for analytics utility
 * Tests Google Analytics initialization and tracking functions
 */

import { waitFor } from '@testing-library/react';
import ReactGA from 'react-ga4';

import {
  initializeAnalytics,
  setAnalyticsUserId,
  setUserProperties,
  trackConversion,
  trackEvent,
  trackPageView,
} from './analytics';
import * as cacheBusting from './cacheBusting';
import * as envUtils from './envUtils';

// Mock react-ga4
jest.mock('react-ga4');

// Mock envUtils
jest.mock('./envUtils');

jest.mock('./cacheBusting', () => ({
  getBuildInfo: jest.fn(),
  getBuildInfoAsync: jest.fn(),
}));

// Mock logger - use a simple inline mock
jest.mock('./logger', () => {
  const actualLogger = jest.requireActual('./logger');
  return {
    ...actualLogger,
    Logger: jest.fn().mockImplementation(() => ({
      error: jest.fn(),
    })),
  };
});

describe('analytics', () => {
  const mockMeasurementId = 'G-XXXXXXXXXX';
  let getEnvVarSpy: jest.SpyInstance;
  const mockBuildInfo = {
    version: '1.2.3',
    buildTime: '2025-10-01T00:00:00Z',
    gitCommit: 'abcdef1234567890abcdef1234567890abcdef12',
    shortCommit: 'abcdef1',
    buildId: 'build-123',
    timestamp: 1696118400000,
    cacheBuster: 'v=build-123',
  } as const;
  const mockGetBuildInfo = cacheBusting.getBuildInfo as jest.Mock;
  const mockGetBuildInfoAsync = cacheBusting.getBuildInfoAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (ReactGA as unknown as { gtag: jest.Mock }).gtag = jest.fn();
    // Spy on getEnvVar
    getEnvVarSpy = jest.spyOn(envUtils, 'getEnvVar');
    mockGetBuildInfo.mockReturnValue(mockBuildInfo);
    mockGetBuildInfoAsync.mockResolvedValue(mockBuildInfo);
  });

  afterEach(() => {
    getEnvVarSpy.mockRestore();
  });

  describe('initializeAnalytics', () => {
    it('should initialize GA when measurement ID is set', async () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      initializeAnalytics();

      expect(getEnvVarSpy).toHaveBeenCalledWith('VITE_GA_MEASUREMENT_ID');
      expect(ReactGA.initialize).toHaveBeenCalledWith(mockMeasurementId, {
        gtagOptions: {
          send_page_view: false,
        },
      });

      await waitFor(() => {
        expect(ReactGA.gtag).toHaveBeenCalledWith(
          'set',
          'user_properties',
          expect.objectContaining({
            app_version: mockBuildInfo.version,
            app_build_id: mockBuildInfo.buildId,
            app_commit: mockBuildInfo.shortCommit,
          }),
        );
      });
    });

    it('should not initialize GA when measurement ID is not set', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      initializeAnalytics();

      expect(ReactGA.initialize).not.toHaveBeenCalled();
    });

    it('should not initialize GA when measurement ID is empty string', () => {
      getEnvVarSpy.mockReturnValue('');

      initializeAnalytics();

      expect(ReactGA.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      // Mock initialize to throw error
      (ReactGA.initialize as jest.Mock).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      initializeAnalytics();

      // We can't easily verify the logger.error call due to mock limitations
      // But the function should complete without throwing
    });
    it('hydrates build metadata when not immediately available', async () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);
      mockGetBuildInfo.mockReturnValue(undefined);

      initializeAnalytics();

      await waitFor(() => {
        expect(mockGetBuildInfoAsync).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(ReactGA.gtag).toHaveBeenCalledWith(
          'set',
          'user_properties',
          expect.objectContaining({ app_version: mockBuildInfo.version }),
        );
      });
    });
  });

  describe('trackPageView', () => {
    it('should track page view when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/test-path');

      expect(getEnvVarSpy).toHaveBeenCalledWith('VITE_GA_MEASUREMENT_ID');
      expect(ReactGA.send).toHaveBeenCalledWith(
        expect.objectContaining({
          hitType: 'pageview',
          page: '/test-path',
          title: undefined,
          location: expect.stringContaining('/test-path'),
        }),
      );
    });

    it('should normalize report paths and extract report code', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/report/abc123/insights');

      expect(ReactGA.send).toHaveBeenCalledWith(
        expect.objectContaining({
          hitType: 'pageview',
          page: '/report/[code]/insights',
          report_code: 'abc123',
          location: expect.stringContaining('/report/[code]/insights'),
        }),
      );
    });

    it('should normalize report and fight paths', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/report/xyz789/fight/5/damage');

      expect(ReactGA.send).toHaveBeenCalledWith(
        expect.objectContaining({
          hitType: 'pageview',
          page: '/report/[code]/fight/[fightId]/damage',
          report_code: 'xyz789',
          fight_id: '5',
          location: expect.stringContaining('/report/[code]/fight/[fightId]/damage'),
        }),
      );
    });

    it('should handle report path without trailing segments', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/report/test123');

      expect(ReactGA.send).toHaveBeenCalledWith(
        expect.objectContaining({
          hitType: 'pageview',
          page: '/report/[code]',
          report_code: 'test123',
        }),
      );
    });

    it('should track page view with title when provided', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/test-path', 'Test Title');

      expect(ReactGA.send).toHaveBeenCalledWith(
        expect.objectContaining({
          hitType: 'pageview',
          page: '/test-path',
          title: 'Test Title',
          location: expect.stringContaining('/test-path'),
        }),
      );
    });

    it('should not track page view when measurement ID is not set', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      trackPageView('/test-path');

      expect(ReactGA.send).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      // Mock send to throw error
      (ReactGA.send as jest.Mock).mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      trackPageView('/test-path');

      // We can't easily verify the logger.error call due to mock limitations
      // But the function should complete without throwing
    });
  });

  describe('trackEvent', () => {
    it('should track event with all parameters', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackEvent('Test Category', 'Test Action', 'Test Label', 123);

      expect(getEnvVarSpy).toHaveBeenCalledWith('VITE_GA_MEASUREMENT_ID');
      expect(ReactGA.event).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Test Category',
          action: 'Test Action',
          label: 'Test Label',
          value: 123,
        }),
      );
    });

    it('should track event with only required parameters', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackEvent('Test Category', 'Test Action');

      expect(ReactGA.event).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Test Category',
          action: 'Test Action',
        }),
      );
      expect((ReactGA.event as jest.Mock).mock.calls[0][0]).not.toHaveProperty('label');
      expect((ReactGA.event as jest.Mock).mock.calls[0][0]).not.toHaveProperty('value');
    });

    it('should merge additional event parameters', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackEvent('Test Category', 'Test Action', undefined, undefined, {
        report_id: 'abc',
        fight_id: '123',
      });

      expect(ReactGA.event).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Test Category',
          action: 'Test Action',
          report_id: 'abc',
          fight_id: '123',
        }),
      );
    });

    it('should not track event when measurement ID is not set', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      trackEvent('Test Category', 'Test Action');

      expect(ReactGA.event).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      // Mock event to throw error
      (ReactGA.event as jest.Mock).mockImplementation(() => {
        throw new Error('Event tracking failed');
      });

      trackEvent('Test Category', 'Test Action');

      // We can't easily verify the logger.error call due to mock limitations
      // But the function should complete without throwing
    });
  });

  describe('trackConversion', () => {
    it('should track conversion event when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackConversion('report_export', { reportId: 'ABC123' });

      expect(ReactGA.event).toHaveBeenCalledWith('report_export', { reportId: 'ABC123' });
    });

    it('should not track conversion when measurement ID is not set', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      trackConversion('report_export', { reportId: 'ABC123' });

      expect(ReactGA.event).not.toHaveBeenCalled();
    });
  });

  describe('setAnalyticsUserId', () => {
    it('should set user id when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      setAnalyticsUserId('42');

      expect(ReactGA.gtag).toHaveBeenCalledWith('set', { user_id: '42' });
    });

    it('should clear user id when null provided', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      setAnalyticsUserId(null);

      expect(ReactGA.gtag).toHaveBeenCalledWith('set', { user_id: undefined });
    });

    it('should not set user id when measurement ID is missing', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      setAnalyticsUserId('42');

      expect(ReactGA.gtag).not.toHaveBeenCalled();
    });
  });

  describe('setUserProperties', () => {
    it('should set user properties when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      setUserProperties({ cohort_role: 'authenticated', ban_status: 'active' });

      expect(ReactGA.gtag).toHaveBeenCalledWith('set', 'user_properties', {
        cohort_role: 'authenticated',
        ban_status: 'active',
      });
    });

    it('should filter out nullish properties', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      setUserProperties({ cohort_role: 'guest', ban_status: null });

      expect(ReactGA.gtag).toHaveBeenCalledWith('set', 'user_properties', {
        cohort_role: 'guest',
      });
    });

    it('should not set user properties when measurement ID is missing', () => {
      getEnvVarSpy.mockReturnValue(undefined);

      setUserProperties({ cohort_role: 'guest' });

      expect(ReactGA.gtag).not.toHaveBeenCalled();
    });
  });
});
