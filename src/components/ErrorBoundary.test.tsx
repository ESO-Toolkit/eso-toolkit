import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ErrorBoundary, useErrorHandler } from './ErrorBoundary';

const theme = createTheme();

// Test component that throws an error
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Test component that uses the error handler hook
const UseErrorHandlerComponent: React.FC = () => {
  const handleError = useErrorHandler();

  const triggerError = (): void => {
    handleError(new Error('Hook error'));
  };

  return <button onClick={triggerError}>Trigger Error</button>;
};

const renderWithTheme = (component: React.ReactElement): ReturnType<typeof render> => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithTheme(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Show Error Details')).toBeInTheDocument();

    // Click to show details
    fireEvent.click(screen.getByText('Show Error Details'));
    expect(screen.getByText('Error Message:')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle try again functionality', () => {
    let throwError = true;

    const TestComponent: React.FC = () => {
      if (throwError) {
        throw new Error('Test error message');
      }
      return <div>No error</div>;
    };

    renderWithTheme(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error initially
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Set the component to not throw on next render
    throwError = false;

    // Click try again
    fireEvent.click(screen.getByText('Try Again'));

    // Should show the recovered component
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const onErrorCallback = jest.fn();

    renderWithTheme(
      <ErrorBoundary onError={onErrorCallback}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(onErrorCallback).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    renderWithTheme(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  it('should provide error handler function', () => {
    renderWithTheme(<UseErrorHandlerComponent />);
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
  });
});
