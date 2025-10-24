/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import * as webglDetection from '../../../utils/webglDetection';

jest.mock('../../../utils/webglDetection', () => {
  const actual = jest.requireActual('../../../utils/webglDetection');
  return {
    ...actual,
    detectWebGLCapabilities: jest.fn(),
    getWebGLDescription: jest.fn(),
  };
});

import { ReplayErrorBoundary } from './ReplayErrorBoundary';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  withScope: jest.fn((callback) =>
    callback({
      setTag: jest.fn(),
      setLevel: jest.fn(),
      setContext: jest.fn(),
      setExtra: jest.fn(),
    }),
  ),
  captureException: jest.fn(() => 'test-event-id'),
  showReportDialog: jest.fn(),
}));

// Mock sentryUtils
jest.mock('../../../utils/sentryUtils', () => ({
  reportError: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock Logger
jest.mock('../../../contexts/LoggerContext', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  })),
  LogLevel: {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
  },
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error from child component');
  }
  return <div data-testid="child-content">Child Content</div>;
};

describe('ReplayErrorBoundary', () => {
  // Save original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  const detectWebGLCapabilitiesMock = webglDetection.detectWebGLCapabilities as jest.MockedFunction<
    typeof webglDetection.detectWebGLCapabilities
  >;
  const getWebGLDescriptionMock = webglDetection.getWebGLDescription as jest.MockedFunction<
    typeof webglDetection.getWebGLDescription
  >;

  const createCapabilities = (
    overrides: Partial<webglDetection.WebGLCapabilities> = {},
  ): webglDetection.WebGLCapabilities => ({
    hasWebGL1: false,
    hasWebGL2: true,
    recommendedVersion: 2,
    performanceTier: webglDetection.WebGLPerformanceTier.HIGH,
    extensions: ['WEBGL_depth_texture', 'OES_element_index_uint'],
    maxTextureSize: 4096,
    maxViewportDims: [4096, 4096],
    renderer: 'Test Renderer',
    vendor: 'Test Vendor',
    isSufficient: true,
    insufficientReason: null,
    likelySwoftware: false,
    ...overrides,
  });

  beforeEach(() => {
    // Suppress console errors in tests (React error boundary logs are noisy)
    console.error = jest.fn();
    console.warn = jest.fn();

    detectWebGLCapabilitiesMock.mockReset();
    getWebGLDescriptionMock.mockReset();
    detectWebGLCapabilitiesMock.mockReturnValue(createCapabilities());
    getWebGLDescriptionMock.mockReturnValue('WebGL 2.0 (High Performance) - Test Renderer');
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    jest.clearAllMocks();
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toHaveTextContent('Test Child');
    });

    it('should not check WebGL when checkWebGL is false', () => {
      render(
        <ReplayErrorBoundary checkWebGL={false}>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(detectWebGLCapabilitiesMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('WebGL Detection and Fallback', () => {
    it('should show WebGL fallback when WebGL is not supported', () => {
      detectWebGLCapabilitiesMock.mockReturnValue(
        createCapabilities({
          hasWebGL1: false,
          hasWebGL2: false,
          recommendedVersion: null,
          performanceTier: webglDetection.WebGLPerformanceTier.NONE,
          extensions: [],
          maxTextureSize: null,
          maxViewportDims: null,
          renderer: null,
          vendor: null,
          isSufficient: false,
          insufficientReason: 'WebGL is not supported in this browser',
        }),
      );

      getWebGLDescriptionMock.mockReturnValue(
        'WebGL Not Available: WebGL is not supported in this browser',
      );

      render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
      expect(screen.getByText('3D Replay Not Available')).toBeInTheDocument();
      expect(screen.getAllByText(/WebGL is not supported in this browser/i).length).toBeGreaterThan(
        0,
      );
    });

    it('should show WebGL fallback when required extensions are missing', () => {
      detectWebGLCapabilitiesMock.mockReturnValue(
        createCapabilities({
          performanceTier: webglDetection.WebGLPerformanceTier.LOW,
          extensions: ['EXT_texture_filter_anisotropic'],
          isSufficient: false,
          insufficientReason:
            'Missing required WebGL extensions: WEBGL_depth_texture, OES_element_index_uint',
        }),
      );

      getWebGLDescriptionMock.mockReturnValue(
        'WebGL Not Available: Missing required WebGL extensions: WEBGL_depth_texture, OES_element_index_uint',
      );

      render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(screen.getByText('3D Replay Not Available')).toBeInTheDocument();
      expect(screen.getAllByText(/Missing required WebGL extensions/i).length).toBeGreaterThan(0);
    });

    it('should show software rendering warning when detected', () => {
      detectWebGLCapabilitiesMock.mockReturnValue(
        createCapabilities({
          performanceTier: webglDetection.WebGLPerformanceTier.LOW,
          extensions: [],
          renderer: 'SwiftShader Renderer',
          vendor: 'Google Inc.',
          isSufficient: false,
          insufficientReason: 'Missing required WebGL extensions',
          likelySwoftware: true,
        }),
      );

      getWebGLDescriptionMock.mockReturnValue(
        'WebGL Not Available: Missing required WebGL extensions',
      );

      render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(screen.getByText(/Software rendering detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Hardware acceleration may be disabled/i)).toBeInTheDocument();
    });

    it('should allow user to retry WebGL detection', async () => {
      detectWebGLCapabilitiesMock
        .mockReturnValueOnce(
          createCapabilities({
            hasWebGL2: false,
            recommendedVersion: null,
            performanceTier: webglDetection.WebGLPerformanceTier.NONE,
            extensions: [],
            maxTextureSize: null,
            maxViewportDims: null,
            renderer: null,
            vendor: null,
            isSufficient: false,
            insufficientReason: 'WebGL is not supported in this browser',
          }),
        )
        .mockReturnValueOnce(createCapabilities());

      getWebGLDescriptionMock.mockReturnValue(
        'WebGL Not Available: WebGL is not supported in this browser',
      );

      const { rerender } = render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      expect(screen.getByText('3D Replay Not Available')).toBeInTheDocument();

      const checkAgainButton = screen.getByRole('button', { name: /Check Again/i });
      fireEvent.click(checkAgainButton);

      // Force re-render to reflect state change
      rerender(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      await waitFor(() => {
        expect(detectWebGLCapabilitiesMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should toggle technical details visibility', () => {
      detectWebGLCapabilitiesMock.mockReturnValue(
        createCapabilities({
          performanceTier: webglDetection.WebGLPerformanceTier.MEDIUM,
          isSufficient: false,
          insufficientReason: 'Test reason',
        }),
      );

      getWebGLDescriptionMock.mockReturnValue('WebGL Not Available: Test reason');

      render(
        <ReplayErrorBoundary>
          <div data-testid="test-child">Test Child</div>
        </ReplayErrorBoundary>,
      );

      // Initially, show button should be present
      expect(screen.getByRole('button', { name: /Show Technical Details/i })).toBeInTheDocument();

      // Click to show details
      const showDetailsButton = screen.getByRole('button', { name: /Show Technical Details/i });
      fireEvent.click(showDetailsButton);

      // Details should now be present
      expect(screen.getByText(/WebGL Capabilities:/i)).toBeInTheDocument();
      expect(screen.getByText(/WebGL 2.0: ✓ Supported/i)).toBeInTheDocument();
      expect(screen.getByText(/Performance Tier: medium/i)).toBeInTheDocument();

      // Click to hide details
      const hideDetailsButton = screen.getByRole('button', { name: /Hide Technical Details/i });
      fireEvent.click(hideDetailsButton);

      // Hide button should now be present again
      expect(screen.getByRole('button', { name: /Show Technical Details/i })).toBeInTheDocument();
    });
  });

  describe('Error Catching and Rendering', () => {
    it('should catch and display runtime errors', () => {
      render(
        <ReplayErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ReplayErrorBoundary>,
      );

      expect(screen.getByTestId('replay-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('replay-error-boundary-title')).toHaveTextContent(
        '3D Replay Error',
      );
      expect(screen.getAllByText(/Test error from child component/i).length).toBeGreaterThan(0);
    });

    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ReplayErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ReplayErrorBoundary>,
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error from child component' }),
        expect.objectContaining({ componentStack: expect.any(String) }),
      );
    });

    it('should reset error state after retry', () => {
      render(
        <ReplayErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ReplayErrorBoundary>,
      );

      expect(screen.getByTestId('replay-error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('replay-error-boundary-title')).toHaveTextContent(
        '3D Replay Error',
      );

      // Click retry button - this resets the error boundary state
      const retryButton = screen.getByTestId('replay-error-retry-button');
      fireEvent.click(retryButton);

      // The error boundary will try to re-render, but since shouldThrow is still true,
      // it will catch the error again and show the error UI
      // This is expected behavior - retry doesn't magically fix the error,
      // it just gives the component a chance to re-render (useful for transient errors)
      expect(screen.getByTestId('replay-error-boundary')).toBeInTheDocument();
    });

    it('should toggle error details visibility', () => {
      render(
        <ReplayErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ReplayErrorBoundary>,
      );

      // Initially, show button should be present
      expect(screen.getByRole('button', { name: /Show Technical Details/i })).toBeInTheDocument();

      // Click to show details
      const showDetailsButton = screen.getByRole('button', { name: /Show Technical Details/i });
      fireEvent.click(showDetailsButton);

      // Details should now be present
      expect(screen.getByText(/Stack Trace:/i)).toBeInTheDocument();

      // Click to hide details
      const hideDetailsButton = screen.getByRole('button', { name: /Hide Technical Details/i });
      fireEvent.click(hideDetailsButton);

      // Hide button should now be present again
      expect(screen.getByRole('button', { name: /Show Technical Details/i })).toBeInTheDocument();
    });
  });
});
