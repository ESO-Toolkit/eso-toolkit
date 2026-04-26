import { test, expect } from '@playwright/test';

// E2E Tests for the Roster Hub marketplace feature.
// Route mocks use a domain-agnostic glob so they fire against whatever
// VITE_ROSTER_HUB_API_URL is baked into the bundle at build time.
// Playwright registers route handlers LIFO, so test-local routes win over beforeEach.

const MOCK_ROSTER = {
  id: 'test-roster-1',
  author_id: 'user-123',
  author_name: 'TestPlayer',
  title: 'Optimized SS Roster',
  description: 'A great Sunspire roster for score pushing.',
  trial_id: 'SS',
  roster_data: 'abc123encodeddata',
  vote_count: 42,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  tags: ['score-push', '#1'],
  user_voted: false,
  is_anonymous: false,
};

test.describe('Roster Hub', () => {
  test.beforeEach(async ({ page }) => {
    // Domain-agnostic intercept: matches the production Workers URL baked into the bundle.
    // A single handler dispatches by URL shape so sub-paths (comments, vote) are handled.
    await page.route('**/rosters**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/comments')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ comments: [] }),
        });
        return;
      }

      if (url.includes('/vote') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ voted: true, voteCount: 43 }),
        });
        return;
      }

      // Single roster: path ends with /rosters/<id> (no further segments)
      if (/\/rosters\/[^/?]+$/.test(url) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ roster: MOCK_ROSTER }),
        });
        return;
      }

      // Default: roster list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rosters: [MOCK_ROSTER], page: 1, sort: 'votes' }),
      });
    });
  });

  test('should load the Roster Hub page', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Roster Hub' })).toBeVisible();
  });

  test('should display the filter bar with trial dropdown and tag chips', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    // MUI Select renders as role="combobox" — no accessible label on this select
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // PRESET_TAGS chips use component="button" role="checkbox"
    await expect(page.getByRole('checkbox', { name: 'beginner' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'score-push' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: '#1' })).toBeVisible();
  });

  test('should display sort toggle buttons', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Top' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recent' })).toBeVisible();
  });

  test('should render roster card from API response', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Optimized SS Roster')).toBeVisible();
    await expect(page.getByText('SS').first()).toBeVisible();
    await expect(page.getByText('A great Sunspire roster for score pushing.')).toBeVisible();
    await expect(page.getByText(/TestPlayer/)).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
    await expect(page.getByText('score-push').first()).toBeVisible();
  });

  test('should show upvote button (disabled for unauthenticated users)', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    const voteButton = page.getByRole('button', { name: /vote/i }).first();
    await expect(voteButton).toBeVisible();
    await expect(voteButton).toBeDisabled();
  });

  test('should open preview dialog when card is clicked', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    // CardActionArea has aria-label="Preview <title>"
    await page.getByRole('button', { name: /Preview Optimized SS Roster/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Optimized SS Roster')).toBeVisible();
  });

  test('should show Load into Builder button in preview dialog', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    // Open the preview dialog
    await page.getByRole('button', { name: /Preview Optimized SS Roster/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Verify the Load into Builder button is present, visible, and enabled
    const loadBtn = page.getByRole('button', { name: /Load into Builder/i });
    await expect(loadBtn).toBeVisible();
    await expect(loadBtn).toBeEnabled();
  });

  test('should show empty state when no rosters returned', async ({ page }) => {
    // Registered after beforeEach — LIFO ordering means this handler wins
    await page.route('**/rosters**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rosters: [], page: 1, sort: 'votes' }),
      });
    });

    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No rosters yet')).toBeVisible();
  });

  test('should show "Load more" button when page is full', async ({ page }) => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({
      ...MOCK_ROSTER,
      id: `roster-${i}`,
      title: `Roster ${i}`,
    }));

    await page.route('**/rosters**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rosters: fullPage, page: 1, sort: 'votes' }),
      });
    });

    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    // aria-label="Load more rosters" — match loosely
    await expect(page.getByRole('button', { name: /Load more/i })).toBeVisible();
  });

  test('should filter by trial when trial dropdown changes', async ({ page }) => {
    await page.route('**/rosters**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rosters: [], page: 1, sort: 'votes' }),
      });
    });

    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    // waitForRequest is registered before the click so the event is never missed
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('trial=SS')),
      (async () => {
        await page.getByRole('combobox').first().click();
        // force:true bypasses the MUI backdrop that intercepts pointer events when the Select is open
        await page.getByRole('option', { name: 'Sunspire' }).click({ force: true });
      })(),
    ]);

    expect(req.url()).toContain('trial=SS');
  });

  test('should show info alert to log in for unauthenticated users', async ({ page }) => {
    await page.goto('/roster-hub');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Log in with your ESO Logs account to vote/i)).toBeVisible();
  });

  test('should not show Publish button when not logged in', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const publishButton = page.getByRole('button', { name: /Publish/i }).first();
    await expect(publishButton).not.toBeVisible();
  });

  test('should be accessible at /roster-hub route', async ({ page }) => {
    const response = await page.goto('/roster-hub');
    expect(response?.status()).not.toBe(404);
    await expect(page.getByRole('heading', { name: 'Roster Hub' })).toBeVisible();
  });
});
