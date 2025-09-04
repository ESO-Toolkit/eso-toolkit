import { ErrorOutline, Refresh, BugReport } from '@mui/icons-material';
import { Box, Button, Paper, Typography, Stack, Alert, Collapse } from '@mui/material';
import * as Sentry from '@sentry/react';
import React, { Component, ReactNode } from 'react';

import { reportError, addBreadcrumb } from '../utils/sentryUtils';

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
      console.error('Error Boundary caught an error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }

    // Only report error to Sentry in production builds
    if (process.env.NODE_ENV === 'production') {
      // Report error to Sentry with comprehensive context
      Sentry.withScope((scope) => {
        scope.setTag('errorBoundary', true);
        scope.setLevel('error');
        scope.setContext('errorBoundary', {
          componentStack: errorInfo.componentStack,
          errorBoundaryName: this.constructor.name,
        });

        // Set error details
        scope.setExtra('errorMessage', error.message);
        scope.setExtra('errorStack', error.stack);
        scope.setExtra('componentStack', errorInfo.componentStack);

        const eventId = Sentry.captureException(error);
        this.setState({ eventId });
      });

      // Also use our custom reportError function
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

    // Only show Sentry report dialog in production builds
    if (process.env.NODE_ENV === 'production' && this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
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

              <Typography variant="h4" component="h1" textAlign="center" color="error">
                Something went wrong
              </Typography>

              <Typography variant="body1" textAlign="center" color="text.secondary">
                We're sorry, but an unexpected error occurred. The error has been automatically
                reported to our team. You can try refreshing the page or return to the previous
                state.
              </Typography>

              {eventId && (
                <Alert severity="info" sx={{ width: '100%' }}>
                  <Typography variant="body2">
                    Error ID: <code>{eventId}</code>
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    This ID can help our support team track and resolve the issue.
                  </Typography>
                </Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                {eventId && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<BugReport />}
                    onClick={this.handleReportBug}
                  >
                    Report Issue
                  </Button>
                )}
              </Stack>

              {process.env.NODE_ENV === 'development' && (
                <>
                  <Button
                    variant="text"
                    startIcon={<BugReport />}
                    onClick={this.toggleDetails}
                    color="secondary"
                  >
                    {showDetails ? 'Hide' : 'Show'} Error Details
                  </Button>

                  <Collapse in={showDetails} sx={{ width: '100%' }}>
                    <Alert severity="error" sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Error Message:
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" gutterBottom>
                        {error?.message || 'Unknown error'}
                      </Typography>

                      {error?.stack && (
                        <>
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Stack Trace:
                          </Typography>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.75rem',
                              maxHeight: 200,
                              overflow: 'auto',
                            }}
                          >
                            {error.stack}
                          </Typography>
                        </>
                      )}

                      {errorInfo?.componentStack && (
                        <>
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Component Stack:
                          </Typography>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.75rem',
                              maxHeight: 200,
                              overflow: 'auto',
                            }}
                          >
                            {errorInfo.componentStack}
                          </Typography>
                        </>
                      )}
                    </Alert>
                  </Collapse>
                </>
              )}
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

// Sentry Error Boundary (alternative implementation using Sentry's built-in component)
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError }) => (
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
            <Typography variant="h4" component="h1" textAlign="center" color="error">
              Application Error
            </Typography>
            <Typography variant="body1" textAlign="center" color="text.secondary">
              {(error as Error)?.message || 'An unexpected error occurred'}
            </Typography>
            <Button variant="contained" onClick={resetError}>
              Try Again
            </Button>
          </Stack>
        </Paper>
      </Box>
    ),
    showDialog: true,
  },
);
