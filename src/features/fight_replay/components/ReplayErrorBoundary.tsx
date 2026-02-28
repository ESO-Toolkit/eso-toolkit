/**
 * ReplayErrorBoundary Component
 *
 * Specialized error boundary for the 3D fight replay system that provides:
 * - WebGL capability detection and validation
 * - Graceful error handling with detailed error information
 * - Fallback UI with system requirements and troubleshooting steps
 * - Integration with Sentry for error reporting
 * - Retry mechanism for transient errors
 *
 * @module ReplayErrorBoundary
 */

import { ErrorOutline, Refresh, Info, Computer, BugReport } from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Alert,
  Collapse,
  Link,
  Divider,
  Chip,
} from '@mui/material';
import React, { Component, ReactNode } from 'react';

import { addBreadcrumb, reportError } from '../../../utils/errorTracking';
import { Logger, LogLevel } from '../../../utils/logger';
import {
  detectWebGLCapabilities,
  getWebGLDescription,
  WebGLCapabilities,
} from '../../../utils/webglDetection';

// Create a logger instance for ReplayErrorBoundary
const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'ReplayErrorBoundary',
});

interface ReplayErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  eventId: string | null;
  webglCapabilities: WebGLCapabilities | null;
}

interface ReplayErrorBoundaryProps {
  children: ReactNode;
  /** Optional callback when an error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to check WebGL capabilities on mount */
  checkWebGL?: boolean;
}

/**
 * WebGL Fallback UI Component
 *
 * Displays when WebGL is not available or insufficient for the replay system
 */
const WebGLFallbackUI: React.FC<{
  capabilities: WebGLCapabilities;
  onRetry: () => void;
}> = ({ capabilities, onRetry }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getBrowserLink = (): { name: string; url: string } => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome')) {
      return { name: 'Chrome', url: 'https://www.google.com/chrome/' };
    } else if (ua.includes('firefox')) {
      return { name: 'Firefox', url: 'https://www.mozilla.org/firefox/' };
    } else if (ua.includes('safari')) {
      return { name: 'Safari', url: 'https://www.apple.com/safari/' };
    } else if (ua.includes('edge')) {
      return { name: 'Edge', url: 'https://www.microsoft.com/edge' };
    }
    return { name: 'a modern browser', url: 'https://browsehappy.com/' };
  };

  const browser = getBrowserLink();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: 4,
        textAlign: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 600,
          width: '100%',
        }}
      >
        <Stack spacing={3}>
          {/* Icon and Title */}
          <Box>
            <Computer sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
              3D Replay Not Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {capabilities.insufficientReason || 'WebGL is required to view 3D fight replays'}
            </Typography>
          </Box>

          {/* Current Status */}
          <Alert severity="warning" sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Current Status:</strong>
            </Typography>
            <Typography variant="body2">{getWebGLDescription()}</Typography>
            {capabilities.likelySwoftware && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                ⚠️ Software rendering detected - Hardware acceleration may be disabled
              </Typography>
            )}
          </Alert>

          {/* System Requirements */}
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              <Info sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
              System Requirements
            </Typography>
            <Stack spacing={1} sx={{ ml: 4 }}>
              <Typography variant="body2">
                • <strong>WebGL:</strong> Version 1.0 or higher (2.0 recommended)
              </Typography>
              <Typography variant="body2">
                • <strong>Browser:</strong> Chrome 80+, Firefox 75+, Safari 14+, or Edge 80+
              </Typography>
              <Typography variant="body2">
                • <strong>Graphics:</strong> Hardware-accelerated GPU
              </Typography>
              <Typography variant="body2">
                • <strong>Texture Size:</strong> 2048x2048 pixels or larger
              </Typography>
            </Stack>
          </Box>

          <Divider />

          {/* Troubleshooting Steps */}
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Troubleshooting Steps
            </Typography>
            <Stack spacing={1} sx={{ ml: 2 }}>
              <Typography variant="body2">
                1. <strong>Update your browser</strong> to the latest version (
                <Link href={browser.url} target="_blank" rel="noopener">
                  Get {browser.name}
                </Link>
                )
              </Typography>
              <Typography variant="body2">
                2. <strong>Enable hardware acceleration</strong> in your browser settings
              </Typography>
              <Typography variant="body2">
                3. <strong>Update your graphics drivers</strong> from your GPU manufacturer
              </Typography>
              <Typography variant="body2">
                4. <strong>Try a different browser</strong> if the issue persists
              </Typography>
              <Typography variant="body2">
                5. <strong>Check if WebGL is blocked</strong> by browser extensions or policies
              </Typography>
            </Stack>
          </Box>

          {/* Technical Details (Collapsible) */}
          <Box>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              sx={{ textTransform: 'none' }}
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>
            <Collapse in={showDetails}>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  WebGL Capabilities:
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    WebGL 1.0: {capabilities.hasWebGL1 ? '✓ Supported' : '✗ Not Supported'}
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    WebGL 2.0: {capabilities.hasWebGL2 ? '✓ Supported' : '✗ Not Supported'}
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    Performance Tier: {capabilities.performanceTier}
                  </Typography>
                  {capabilities.maxTextureSize && (
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      Max Texture Size: {capabilities.maxTextureSize}px
                    </Typography>
                  )}
                  {capabilities.maxViewportDims && (
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      Max Viewport: {capabilities.maxViewportDims[0]}x
                      {capabilities.maxViewportDims[1]}
                    </Typography>
                  )}
                  {capabilities.renderer && (
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      Renderer: {capabilities.renderer}
                    </Typography>
                  )}
                  {capabilities.vendor && (
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      Vendor: {capabilities.vendor}
                    </Typography>
                  )}
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    Extensions: {capabilities.extensions.length} available
                  </Typography>
                </Stack>
              </Paper>
            </Collapse>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" startIcon={<Refresh />} onClick={onRetry} size="large">
              Check Again
            </Button>
            <Button
              variant="outlined"
              component="a"
              href="https://get.webgl.org/"
              target="_blank"
              rel="noopener"
              size="large"
            >
              Test WebGL
            </Button>
          </Stack>

          {/* Help Link */}
          <Typography variant="body2" color="text.secondary">
            Need help?{' '}
            <Link
              href="https://github.com/ESO-Toolkit/eso-toolkit/wiki/WebGL-Troubleshooting"
              target="_blank"
              rel="noopener"
            >
              View troubleshooting guide
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

/**
 * Error Fallback UI Component
 *
 * Displays when a runtime error occurs in the 3D replay system
 */
const ErrorFallbackUI: React.FC<{
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onRetry: () => void;
  onReload: () => void;
  onReportBug: () => void;
}> = ({
  error,
  errorInfo,
  eventId,
  showDetails,
  onToggleDetails,
  onRetry,
  onReload,
  onReportBug,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: 4,
        textAlign: 'center',
      }}
      data-testid="replay-error-boundary"
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 700,
          width: '100%',
        }}
      >
        <Stack spacing={3}>
          {/* Icon and Title */}
          <Box>
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              fontWeight="bold"
              data-testid="replay-error-boundary-title"
            >
              3D Replay Error
            </Typography>
            <Typography variant="body1" color="text.secondary">
              An error occurred while rendering the 3D fight replay. You can try reloading the
              replay or report this issue.
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Error:</strong>
              </Typography>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.85rem">
                {error.message}
              </Typography>
            </Alert>
          )}

          {/* Event ID (if available) */}
          {eventId && (
            <Box>
              <Chip
                label={`Error ID: ${eventId}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
            </Box>
          )}

          {/* Error Details (Collapsible) */}
          {(error?.stack || errorInfo?.componentStack) && (
            <Box>
              <Button
                variant="text"
                size="small"
                onClick={onToggleDetails}
                sx={{ textTransform: 'none' }}
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
              <Collapse in={showDetails}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 1,
                    textAlign: 'left',
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {error?.stack && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Stack Trace:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="pre"
                        fontFamily="monospace"
                        fontSize="0.7rem"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {error.stack}
                      </Typography>
                    </Box>
                  )}
                  {errorInfo?.componentStack && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Component Stack:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="pre"
                        fontFamily="monospace"
                        fontSize="0.7rem"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {errorInfo.componentStack}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Collapse>
            </Box>
          )}

          <Divider />

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={1}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
              size="large"
              data-testid="replay-error-retry-button"
            >
              Try Again
            </Button>
            <Button variant="outlined" onClick={onReload} size="large">
              Reload Page
            </Button>
            {process.env.NODE_ENV === 'production' && (
              <Button
                variant="outlined"
                startIcon={<BugReport />}
                onClick={onReportBug}
                size="large"
                color="error"
              >
                Report Bug
              </Button>
            )}
          </Stack>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary">
            If this problem persists, please{' '}
            <Link
              href="https://github.com/ESO-Toolkit/eso-toolkit/issues"
              target="_blank"
              rel="noopener"
            >
              report an issue
            </Link>{' '}
            with the error details above.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

/**
 * ReplayErrorBoundary Class Component
 *
 * React Error Boundary specifically designed for the 3D fight replay system.
 * Handles both runtime errors and WebGL capability issues.
 */
export class ReplayErrorBoundary extends Component<
  ReplayErrorBoundaryProps,
  ReplayErrorBoundaryState
> {
  constructor(props: ReplayErrorBoundaryProps) {
    super(props);

    // Check WebGL capabilities on initialization if requested
    const webglCapabilities = props.checkWebGL !== false ? detectWebGLCapabilities() : null;

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      eventId: null,
      webglCapabilities,
    };

    // Log WebGL status if checking
    if (webglCapabilities && !webglCapabilities.isSufficient) {
      logger.warn('WebGL capabilities insufficient for 3D replay', {
        reason: webglCapabilities.insufficientReason,
        tier: webglCapabilities.performanceTier,
      });

      addBreadcrumb('WebGL capabilities insufficient', 'info', {
        reason: webglCapabilities.insufficientReason,
        tier: webglCapabilities.performanceTier,
      });
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ReplayErrorBoundaryState> {
    addBreadcrumb('ReplayErrorBoundary caught error', 'error', {
      errorMessage: error.message,
      errorName: error.name,
    });

    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('ReplayErrorBoundary caught an error', error, {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    // Report to error tracking in production
    if (process.env.NODE_ENV === 'production') {
      reportError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'replay',
        feature: '3d_replay',
        ...(this.state.webglCapabilities && {
          webgl: {
            hasWebGL1: this.state.webglCapabilities.hasWebGL1,
            hasWebGL2: this.state.webglCapabilities.hasWebGL2,
            performanceTier: this.state.webglCapabilities.performanceTier,
            isSufficient: this.state.webglCapabilities.isSufficient,
            insufficientReason: this.state.webglCapabilities.insufficientReason,
          },
        }),
      });
    }
  }

  handleRetry = (): void => {
    addBreadcrumb('User clicked retry in ReplayErrorBoundary', 'user', {
      action: 'retry',
      errorMessage: this.state.error?.message,
    });

    // Re-check WebGL capabilities on retry
    const webglCapabilities = this.props.checkWebGL !== false ? detectWebGLCapabilities() : null;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      eventId: null,
      webglCapabilities,
    });
  };

  handleReload = (): void => {
    addBreadcrumb('User clicked reload in ReplayErrorBoundary', 'user', {
      action: 'reload',
      errorMessage: this.state.error?.message,
    });

    window.location.reload();
  };

  handleToggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  handleReportBug = (): void => {
    addBreadcrumb('User initiated bug report from ReplayErrorBoundary', 'user', {
      action: 'report_bug',
      errorMessage: this.state.error?.message,
      eventId: this.state.eventId,
    });

    // Open issue tracker for bug reports
    window.open('https://github.com/ESO-Toolkit/eso-toolkit/issues', '_blank', 'noopener');
  };

  render(): ReactNode {
    // Check WebGL capabilities first (if enabled and insufficient)
    if (
      this.props.checkWebGL !== false &&
      this.state.webglCapabilities &&
      !this.state.webglCapabilities.isSufficient
    ) {
      return (
        <WebGLFallbackUI capabilities={this.state.webglCapabilities} onRetry={this.handleRetry} />
      );
    }

    // Then check for runtime errors
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          eventId={this.state.eventId}
          showDetails={this.state.showDetails}
          onToggleDetails={this.handleToggleDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onReportBug={this.handleReportBug}
        />
      );
    }

    // No errors, render children normally
    return this.props.children;
  }
}
