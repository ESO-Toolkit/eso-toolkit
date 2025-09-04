import type { Decorator } from '@storybook/react';
import React, { useEffect } from 'react';

// Component to prevent any real network requests
const NetworkRequestBlocker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Store original implementations
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;

    // Override fetch to prevent any real network requests
    window.fetch = (...args) => {
      console.error('🚫 Real network request blocked in Storybook:', args);
      return Promise.reject(
        new Error('Network requests are not allowed in Storybook. Use MSW mocks instead.'),
      );
    };

    // Override XMLHttpRequest to prevent any real network requests
    const BlockedXHR = class extends originalXHR {
      open(): void {
        console.error('🚫 Real XMLHttpRequest blocked in Storybook');
        throw new Error('XMLHttpRequest is not allowed in Storybook. Use MSW mocks instead.');
      }
    };

    window.XMLHttpRequest = BlockedXHR as typeof XMLHttpRequest;

    return () => {
      // Restore original implementations
      window.fetch = originalFetch;
      window.XMLHttpRequest = originalXHR;
    };
  }, []);

  return <>{children}</>;
};

// Global decorator to prevent any real network requests
export const withNoNetworkRequests: Decorator = (Story) => (
  <NetworkRequestBlocker>
    <Story />
  </NetworkRequestBlocker>
);
