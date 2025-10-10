/**
 * Browser-based cache utilities that work with localStorage
 * This allows caching API responses directly in the browser during tests
 */

/**
 * Generates a cache key for localStorage
 */
export function generateBrowserCacheKey(
  operationName: string,
  variables: any = {},
  endpoint: 'client' | 'user' = 'client'
): string {
  // Sort variables to ensure consistent key generation
  const sortedVars = JSON.stringify(variables, Object.keys(variables || {}).sort());
  const content = `${operationName}:${endpoint}:${sortedVars}`;
  
  // Create a simple hash for localStorage key
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `eso-logs-cache-${Math.abs(hash).toString(16)}`;
}

/**
 * Reads cached response from localStorage
 */
export function readBrowserCache<T = any>(cacheKey: string): T | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      return null;
    }
    
    const parsedCache = JSON.parse(cached);
    
    // Check if cache has expired (optional - set to 1 hour for tests)
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (Date.now() - parsedCache.timestamp > maxAge) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsedCache.data;
  } catch (error) {
    console.warn(`Failed to read browser cache for key ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Writes response to localStorage cache
 */
export function writeBrowserCache<T = any>(cacheKey: string, response: T): void {
  try {
    const cacheData = {
      data: response,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn(`Failed to write browser cache for key ${cacheKey}:`, error);
  }
}

/**
 * Checks if caching is enabled for tests
 */
export function isCacheEnabled(): boolean {
  return localStorage.getItem('test-cache-enabled') === 'true';
}

/**
 * Clears all ESO Logs cache from localStorage
 */
export function clearBrowserCache(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('eso-logs-cache-')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Browser cache cleared successfully');
  } catch (error) {
    console.warn('Failed to clear browser cache:', error);
  }
}

/**
 * Gets cache statistics from localStorage
 */
export function getBrowserCacheStats(): { keyCount: number; estimatedSize: number; keys: string[] } {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('eso-logs-cache-'));
    let estimatedSize = 0;
    
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) {
        estimatedSize += value.length * 2; // Rough estimate (UTF-16)
      }
    }
    
    return {
      keyCount: keys.length,
      estimatedSize,
      keys
    };
  } catch (error) {
    console.warn('Failed to get browser cache stats:', error);
    return { keyCount: 0, estimatedSize: 0, keys: [] };
  }
}