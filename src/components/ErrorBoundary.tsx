import { ErrorOutline, Refresh, BugReport } from '@mui/icons-material';
import { Box, Button, Paper, Typography, Stack, Alert, Collapse } from '@mui/material';
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
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

    // In production, you might want to log to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  toggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

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
                We're sorry, but an unexpected error occurred. You can try refreshing the page or
                return to the previous state.
              </Typography>

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
    // In development, throw the error to trigger the error boundary
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // In production, log the error (could integrate with error reporting service)
    console.error('Handled error:', error);
    if (errorInfo) {
      console.error('Error info:', errorInfo);
    }
  }, []);
};

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
): React.ComponentType<P> {
  const WrappedComponent = (props: P): JSX.Element => (
    <ErrorBoundary onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
