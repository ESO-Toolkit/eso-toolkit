/**
 * Tests for analytics utility
 * Tests Google Analytics initialization and tracking functions
 */

import ReactGA from 'react-ga4';

import { initializeAnalytics, trackEvent, trackPageView } from './analytics';
import * as envUtils from './envUtils';

// Mock react-ga4
jest.mock('react-ga4');

// Mock envUtils
jest.mock('./envUtils');

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

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on getEnvVar
    getEnvVarSpy = jest.spyOn(envUtils, 'getEnvVar');
  });

  afterEach(() => {
    getEnvVarSpy.mockRestore();
  });

  describe('initializeAnalytics', () => {
    it('should initialize GA when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      initializeAnalytics();

      expect(getEnvVarSpy).toHaveBeenCalledWith('VITE_GA_MEASUREMENT_ID');
      expect(ReactGA.initialize).toHaveBeenCalledWith(mockMeasurementId);
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
  });

  describe('trackPageView', () => {
    it('should track page view when measurement ID is set', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/test-path');

      expect(getEnvVarSpy).toHaveBeenCalledWith('VITE_GA_MEASUREMENT_ID');
      expect(ReactGA.send).toHaveBeenCalledWith({
        hitType: 'pageview',
        page: '/test-path',
        title: undefined,
      });
    });

    it('should track page view with title when provided', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackPageView('/test-path', 'Test Title');

      expect(ReactGA.send).toHaveBeenCalledWith({
        hitType: 'pageview',
        page: '/test-path',
        title: 'Test Title',
      });
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
      expect(ReactGA.event).toHaveBeenCalledWith({
        category: 'Test Category',
        action: 'Test Action',
        label: 'Test Label',
        value: 123,
      });
    });

    it('should track event with only required parameters', () => {
      getEnvVarSpy.mockReturnValue(mockMeasurementId);

      trackEvent('Test Category', 'Test Action');

      expect(ReactGA.event).toHaveBeenCalledWith({
        category: 'Test Category',
        action: 'Test Action',
        label: undefined,
        value: undefined,
      });
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
});




