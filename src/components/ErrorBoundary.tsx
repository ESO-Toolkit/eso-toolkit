import { ErrorOutline, Refresh, BugReport } from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Alert,
  Collapse,
  Divider,
  Chip,
  Link,
} from '@mui/material';
import React, { Component, ReactNode } from 'react';

import { reportError, addBreadcrumb } from '../utils/errorTracking';
import { Logger, LogLevel } from '../utils/logger';

// Create a logger instance for ErrorBoundary
const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'ErrorBoundary',
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  eventId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Add breadcrumb for the error
    addBreadcrumb('Error boundary caught error', 'error', {
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
      logger.error('Error Boundary caught an error', error, {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    // Report error to tracking service in production
    if (process.env.NODE_ENV === 'production') {
      reportError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        errorBoundaryName: this.constructor.name,
      });
    }
  }

  handleRetry = (): void => {
    // Add breadcrumb for retry action
    addBreadcrumb('User clicked retry in error boundary', 'user', {
      action: 'retry',
      errorMessage: this.state.error?.message,
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      eventId: null,
    });
  };

  handleReload = (): void => {
    // Add breadcrumb for reload action
    addBreadcrumb('User clicked reload in error boundary', 'user', {
      action: 'reload',
      errorMessage: this.state.error?.message,
    });

    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  handleReportBug = (): void => {
    // Add breadcrumb for manual bug report
    addBreadcrumb('User initiated bug report from error boundary', 'user', {
      action: 'report_bug',
      errorMessage: this.state.error?.message,
      eventId: this.state.eventId,
    });

    // Open issue tracker so users can file a report with the error details
    window.open('https://github.com/ESO-Toolkit/eso-toolkit/issues', '_blank', 'noopener');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, eventId } = this.state;

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="background.default"
          p={3}
        >
          <Paper elevation={3} sx={{ maxWidth: 600, width: '100%', p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <ErrorOutline color="error" sx={{ fontSize: 64 }} />

              <Typography
                variant="h4"
                component="h1"
                textAlign="center"
                color="error"
                data-testid="error-boundary-title"
              >
                Something went wrong
              </Typography>

              <Typography variant="body1" textAlign="center" color="text.secondary">
                An unexpected error occurred. This has been automatically reported to our team. You
                can try again, reload the page, or report the issue if it persists.
              </Typography>

              {/* Error message — always visible so users can reference it */}
              {error && (
                <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Error:</strong>
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.85rem">
                    {error.message || 'Unknown error'}
                  </Typography>
                </Alert>
              )}

              {/* Compact error ID chip */}
              {eventId && (
                <Chip
                  label={`Error ID: ${eventId}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace' }}
                />
              )}

              {/* Technical details — stack traces in dev, error name in prod */}
              {(error?.stack || errorInfo?.componentStack) && (
                <Box sx={{ width: '100%' }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={this.toggleDetails}
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
                        <Box sx={{ mb: errorInfo?.componentStack ? 2 : 0 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <Typography
                            variant="body2"
                            component="pre"
                            fontFamily="monospace"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: '0.7rem',
                            }}
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
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: '0.7rem',
                            }}
                          >
                            {errorInfo.componentStack}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Collapse>
                </Box>
              )}

              <Divider sx={{ width: '100%' }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
                <Button variant="outlined" color="primary" onClick={this.handleReload}>
                  Reload Page
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<BugReport />}
                  onClick={this.handleReportBug}
                >
                  Report Issue
                </Button>
              </Stack>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                If this keeps happening, please{' '}
                <Link
                  href="https://github.com/ESO-Toolkit/eso-toolkit/issues"
                  target="_blank"
                  rel="noopener"
                >
                  open an issue
                </Link>{' '}
                with the error details above.
              </Typography>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = (): ((error: Error, errorInfo?: React.ErrorInfo) => void) => {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    // Add breadcrumb for handled error
    addBreadcrumb('Error handled by useErrorHandler hook', 'error', {
      errorMessage: error.message,
      errorName: error.name,
    });

    // In development, throw the error to trigger the error boundary
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // In production, report the error
    reportError(error, {
      handledBy: 'useErrorHandler',
      componentStack: errorInfo?.componentStack,
    });
  }, []);
};

// Higher-order component that wraps components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
): React.ComponentType<P> => {
  const WrappedComponent = (props: P): React.ReactElement => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/** Top-level app error boundary with a full-page fallback UI. */
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
);
