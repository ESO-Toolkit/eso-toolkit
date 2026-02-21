/**
 * Fallback auth state creation for tests
 * 
 * Creates a minimal auth state file when authentication is not available
 * to prevent runtime errors during test execution.
 */

import * as fs from 'fs';
import * as path from 'path';

const AUTH_STATE_PATH = path.resolve('tests', 'auth-state.json');

/**
 * Create an empty auth state file for tests that don't have authentication
 */
export function createEmptyAuthState(): void {
  try {
    const testsDir = path.dirname(AUTH_STATE_PATH);
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    const emptyAuthState = {
      cookies: [],
      origins: []
    };
    
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(emptyAuthState, null, 2));
    console.log('✅ Created empty auth state file for unauthenticated tests');
  } catch (error) {
    console.warn('⚠️  Failed to create empty auth state:', error);
  }
}

/**
 * Check if auth state file exists
 */
export function authStateExists(): boolean {
  try {
    return fs.existsSync(AUTH_STATE_PATH);
  } catch {
    return false;
  }
}

/**
 * Ensure auth state file exists, creating empty one if needed
 */
export function ensureAuthState(): void {
  if (!authStateExists()) {
    createEmptyAuthState();
  }
}