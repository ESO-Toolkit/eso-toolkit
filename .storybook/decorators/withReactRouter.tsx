import React from 'react';
import { Decorator } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Custom React Router decorator for Storybook that provides routing context
 * without external dependencies that have React 19 compatibility issues.
 * 
 * This decorator wraps stories with MemoryRouter and supports:
 * - Initial location/URL via story parameters
 * - Search params and URL state
 * - useNavigate, useLocation, useSearchParams hooks
 */
export const withReactRouter: Decorator = (Story, context) => {
  // Extract router configuration from story parameters
  const routerParams = context.parameters.router || context.parameters.remix || {};
  
  // Determine initial location
  const initialLocation = routerParams.location || '/';
  
  // Create initial entries array for MemoryRouter
  const initialEntries = Array.isArray(initialLocation) ? initialLocation : [initialLocation];
  
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Story />
    </MemoryRouter>
  );
};
