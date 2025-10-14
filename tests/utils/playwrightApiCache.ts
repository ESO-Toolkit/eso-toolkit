/**
 * Playwright network intercept-based caching system for ESO Logs API
 * This intercepts network requests and serves cached responses to avoid hitting the API repeatedly
 */

import { Page, Route } from '@playwright/test';
import { EsoLogsNodeCache } from '../../src/utils/esoLogsNodeCache';

interface InterceptConfig {
  enableLogging?: boolean;
  cacheTTL?: number;
  apiBaseUrls?: string[];
}

export class PlaywrightApiCache {
  private cache: EsoLogsNodeCache;
  private config: InterceptConfig;
  private interceptCount: Map<string, number> = new Map();

  constructor(config: InterceptConfig = {}) {
    this.cache = new EsoLogsNodeCache();
    this.config = {
      enableLogging: true,
      cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      apiBaseUrls: [
        'https://www.esologs.com/api/v2/client',
        'https://www.esologs.com/api/v2/user',
      ],
      ...config,
    };
  }

  /**
   * Enable API caching for a Playwright page
   */
  async enableForPage(page: Page): Promise<void> {
    await page.route('**/*', async (route: Route) => {
      const request = route.request();
      const url = request.url();
      
      // Only intercept ESO Logs API calls
      if (!this.shouldIntercept(url)) {
        return route.continue();
      }

      const method = request.method();
      
      // Only cache GET and POST requests (GraphQL is POST)
      if (!['GET', 'POST'].includes(method)) {
        return route.continue();
      }

      try {
        // Generate cache key from URL, method, and body
        const cacheKey = await this.generateCacheKey(request);
        const operationName = this.extractOperationName(request);
        
        // Try to get from cache
        const cachedResponse = await this.cache.get(cacheKey);
        
        if (cachedResponse && this.isCacheValid(cachedResponse)) {
          // Serve from cache
          this.logCacheHit(operationName, url);
          
          await route.fulfill({
            status: cachedResponse.status || 200,
            headers: cachedResponse.headers || { 'content-type': 'application/json' },
            body: JSON.stringify(cachedResponse.data),
          });
          
          return;
        }

        // Cache miss - make real request
        this.logCacheMiss(operationName, url);
        
        const response = await route.fetch();
        const responseData = await response.json().catch(() => null);
        
        if (response.ok() && responseData) {
          // Cache successful response
          await this.cache.set(cacheKey, undefined, undefined, {
            data: responseData,
            status: response.status(),
            headers: response.headers(),
            timestamp: Date.now(),
            url: url,
            method: method,
            operationName: operationName,
          }, this.config.cacheTTL);
          
          this.logCacheStore(operationName, url);
        }
        
        // Return the response
        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: JSON.stringify(responseData),
        });
        
      } catch (error) {
        console.warn(`Cache intercept error for ${url}:`, error);
        return route.continue();
      }
    });

    if (this.config.enableLogging) {
      console.log('✅ Enabled Playwright API cache intercepts');
    }
  }

  /**
   * Disable API caching for a page
   */
  async disableForPage(page: Page): Promise<void> {
    await page.unroute('**/*');
    if (this.config.enableLogging) {
      console.log('❌ Disabled Playwright API cache intercepts');
    }
  }

  /**
   * Check if URL should be intercepted
   */
  private shouldIntercept(url: string): boolean {
    return this.config.apiBaseUrls?.some(baseUrl => url.startsWith(baseUrl)) ?? false;
  }

  /**
   * Generate cache key from request
   */
  private async generateCacheKey(request: any): Promise<string> {
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postData();
    
    // Create deterministic key from URL, method, and body
    const keyData = {
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams.entries()),
      method: method,
      body: body ? JSON.parse(body) : null,
    };
    
    // Use the existing cache key generation from NodeCache
    return JSON.stringify(keyData);
  }

  /**
   * Extract GraphQL operation name from request
   */
  private extractOperationName(request: any): string | null {
    try {
      const body = request.postData();
      if (body) {
        const parsed = JSON.parse(body);
        return parsed.operationName || this.extractOperationFromQuery(parsed.query) || 'unknown';
      }
      
      const url = new URL(request.url());
      return url.pathname.split('/').pop() || 'get';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract operation name from GraphQL query string
   */
  private extractOperationFromQuery(query?: string): string | null {
    if (!query) return null;
    
    const match = query.match(/(?:query|mutation)\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if cached response is still valid
   */
  private isCacheValid(cachedResponse: any): boolean {
    if (!cachedResponse.timestamp) return false;
    
    const age = Date.now() - cachedResponse.timestamp;
    return age < (this.config.cacheTTL ?? 0);
  }

  /**
   * Log cache hit
   */
  private logCacheHit(operationName: string | null, url: string): void {
    if (!this.config.enableLogging) return;
    
    const count = this.interceptCount.get(operationName || 'unknown') || 0;
    this.interceptCount.set(operationName || 'unknown', count + 1);
    
    console.log(`🟢 Cache HIT [${operationName}] (${count + 1}x)`);
  }

  /**
   * Log cache miss
   */
  private logCacheMiss(operationName: string | null, url: string): void {
    if (!this.config.enableLogging) return;
    
    console.log(`🔴 Cache MISS [${operationName}] - fetching from API`);
  }

  /**
   * Log cache store
   */
  private logCacheStore(operationName: string | null, url: string): void {
    if (!this.config.enableLogging) return;
    
    console.log(`💾 Cache STORED [${operationName}]`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    interceptCounts: Map<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const cacheStats = await this.cache.getStats();
    
    return {
      ...cacheStats,
      interceptCounts: this.interceptCount,
    };
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.interceptCount.clear();
    
    if (this.config.enableLogging) {
      console.log('🧹 Cleared all API cache');
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    const cleaned = await this.cache.cleanExpired();
    
    if (this.config.enableLogging && cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
    
    return cleaned;
  }
}

// Export a default instance
export const playwrightApiCache = new PlaywrightApiCache();