/**
 * Tests for FPSCounter Component
 */

import React from 'react';
import { render } from '@testing-library/react';

import { FPSCounter } from './FPSCounter';

// Mock useFrame from @react-three/fiber
jest.mock('@react-three/fiber', () => ({
  useFrame: jest.fn(),
}));

describe('FPSCounter', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Build', () => {
    it('should not render in production mode', () => {
      process.env.NODE_ENV = 'production';

      const { container } = render(<FPSCounter />);

      // Should render nothing (null)
      expect(container.firstChild).toBeNull();
    });

    it('should render (invisibly) in development mode', () => {
      process.env.NODE_ENV = 'development';

      const { container } = render(<FPSCounter />);

      // Component doesn't render visible content, but should not throw error
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Props', () => {
    it('should accept onFPSUpdate callback', () => {
      process.env.NODE_ENV = 'development';

      const onFPSUpdate = jest.fn();

      expect(() => {
        render(<FPSCounter onFPSUpdate={onFPSUpdate} />);
      }).not.toThrow();
    });

    it('should accept updateInterval prop', () => {
      process.env.NODE_ENV = 'development';

      expect(() => {
        render(<FPSCounter updateInterval={1000} />);
      }).not.toThrow();
    });

    it('should accept both onFPSUpdate and updateInterval props', () => {
      process.env.NODE_ENV = 'development';

      const onFPSUpdate = jest.fn();

      expect(() => {
        render(<FPSCounter onFPSUpdate={onFPSUpdate} updateInterval={1000} />);
      }).not.toThrow();
    });
  });

  describe('Component Structure', () => {
    it('should render without crashing in development', () => {
      process.env.NODE_ENV = 'development';

      expect(() => {
        render(<FPSCounter />);
      }).not.toThrow();
    });

    it('should render without crashing in production', () => {
      process.env.NODE_ENV = 'production';

      expect(() => {
        render(<FPSCounter />);
      }).not.toThrow();
    });

    it('should not render visible content', () => {
      process.env.NODE_ENV = 'development';

      const { container } = render(<FPSCounter />);

      // Component is invisible (returns null)
      expect(container.firstChild).toBeNull();
    });
  });
});
