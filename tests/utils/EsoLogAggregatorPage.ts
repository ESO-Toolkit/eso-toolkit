import { Page } from '@playwright/test';
import { createSkeletonDetector, SkeletonDetector } from './skeleton-detector';

// Default timeouts matching the existing test configuration
const DEFAULT_TIMEOUTS = {
  navigation: 30000,
  networkIdle: 15000,
};

/**
 * Page Object Model for ESO Log Aggregator application
 * Centralizes URL construction and navigation logic for all test files
 */
export class EsoLogAggregatorPage {
  public readonly skeletons: SkeletonDetector;

  constructor(private page: Page) {
    this.skeletons = createSkeletonDetector(page);
  }

  /**
   * Navigate to the login page
   */
  async goToLogin() {
    await this.page.goto('/login', { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to the my reports page
   */
  async goToMyReports() {
    await this.page.goto('/my-reports', { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to the latest reports page
   */
  async goToLatestReports() {
    await this.page.goto('/latest-reports', { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to the calculator page
   */
  async goToCalculator() {
    await this.page.goto('/calculator', { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to a specific report
   * @param reportId - The report ID to navigate to
   */
  async goToReport(reportId: string) {
    await this.page.goto(`/report/${reportId}`, { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to a report's live view
   * @param reportId - The report ID to navigate to
   */
  async goToReportLive(reportId: string) {
    await this.page.goto(`/report/${reportId}/live`, { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to a specific fight within a report
   * @param reportId - The report ID
   * @param fightId - The fight ID
   */
  async goToFight(reportId: string, fightId: string) {
    await this.page.goto(`/report/${reportId}/fight/${fightId}`, { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to a specific tab within a fight
   * @param reportId - The report ID
   * @param fightId - The fight ID
   * @param tab - The tab name (e.g., 'insights', 'replay', 'players', 'damage-done', etc.)
   */
  async goToFightTab(reportId: string, fightId: string, tab: string) {
    await this.page.goto(`/report/${reportId}/fight/${fightId}/${tab}`, { 
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUTS.navigation,
    });
  }

  /**
   * Navigate to the insights tab of a fight
   * @param reportId - The report ID
   * @param fightId - The fight ID
   */
  async goToFightInsights(reportId: string, fightId: string) {
    await this.goToFightTab(reportId, fightId, 'insights');
  }

  /**
   * Navigate to the replay tab of a fight
   * @param reportId - The report ID
   * @param fightId - The fight ID
   */
  async goToFightReplay(reportId: string, fightId: string) {
    await this.goToFightTab(reportId, fightId, 'replay');
  }

  /**
   * Navigate to the players tab of a fight
   * @param reportId - The report ID
   * @param fightId - The fight ID
   */
  async goToFightPlayers(reportId: string, fightId: string) {
    await this.goToFightTab(reportId, fightId, 'players');
  }

  /**
   * Navigate to the damage-done tab of a fight
   * @param reportId - The report ID
   * @param fightId - The fight ID
   */
  async goToFightDamageDone(reportId: string, fightId: string) {
    await this.goToFightTab(reportId, fightId, 'damage-done');
  }

  /**
   * Navigate to an invalid report (for testing error handling)
   * @param invalidReportId - An invalid report ID
   */
  async goToInvalidReport(invalidReportId: string = 'INVALID_REPORT_ID') {
    await this.page.goto(`/report/${invalidReportId}`, { waitUntil: 'networkidle' });
  }

  /**
   * Build a URL for a specific route without navigating
   * @param route - The route path
   * @returns The complete URL
   */
  buildUrl(route: string): string {
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    return cleanRoute;
  }

  /**
   * Navigate to a custom route
   * @param route - The route to navigate to
   */
  async goToRoute(route: string) {
    const url = this.buildUrl(route);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Get the current URL path (route)
   * @returns The current route path
   */
  async getCurrentRoute(): Promise<string> {
    return await this.page.evaluate(() => window.location.pathname);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUTS.networkIdle });
  }

  /**
   * Wait for navigation and loading to complete (no skeletons)
   */
  async waitForPageLoad(options?: { 
    expectSkeletons?: boolean;
    timeout?: number;
  }) {
    await this.waitForNavigation();
    
    if (options?.expectSkeletons !== false) {
      await this.skeletons.waitForSkeletonsToDisappear({ 
        timeout: options?.timeout 
      });
    }
  }

  /**
   * Navigate and wait for loading to complete
   */
  async navigateAndWaitForLoad(
    url: string, 
    options?: { 
      expectSkeletons?: boolean;
      timeout?: number;
      navigationTimeout?: number;
    }
  ) {
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: options?.navigationTimeout ?? DEFAULT_TIMEOUTS.navigation,
    });
    
    await this.waitForPageLoad(options);
  }
}

/**
 * Helper function to create an EsoLogAggregatorPage instance
 * @param page - The Playwright page instance
 * @returns A new EsoLogAggregatorPage instance
 */
export function createEsoPage(page: Page): EsoLogAggregatorPage {
  return new EsoLogAggregatorPage(page);
}