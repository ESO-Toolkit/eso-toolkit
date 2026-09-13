import { expect, test, type Page } from '@playwright/test';

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
  // Encoded output from createDefaultRoster() with a populated rosterName and
  // tank player, generated through the production encoder. RosterViewPage
  // decodes this when the card navigates to /rv.
  roster_data:
    'q1YqU7Iy1lHKU7JS8i8oyczNrEpNUQgOVgjKLy5JLVLSUSopVrKKrlYqAKkISczL9kgtyleq1amujdVRygDLgTm1AA',
  vote_count: 42,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  tags: ['score-push', '#1'],
  user_voted: false,
  is_anonymous: false,
};

async function openRosterHub(page: Page, expectedRosterTitle?: string): Promise<void> {
  const response = await page.goto('/roster-hub', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/roster-hub(?:[/?#]|$)/);
  await expect(page.getByRole('heading', { name: 'Roster Hub' })).toBeVisible();
  await expect(page.locator('.MuiSkeleton-root:visible')).toHaveCount(0);

  if (expectedRosterTitle) {
    await expect(page.getByText(expectedRosterTitle, { exact: true })).toBeVisible();
  }
}

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
    await openRosterHub(page, MOCK_ROSTER.title);
  });

  test('should display the filter bar with trial dropdown and tag chips', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    // MUI Select renders as role="combobox" — no accessible label on this select
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Preset tags are button controls with aria-pressed state.
    await expect(page.getByRole('button', { name: 'beginner' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'score-push' })).toBeVisible();
    await expect(page.getByRole('button', { name: '#1' })).toBeVisible();
  });

  test('should display sort toggle buttons', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    await expect(page.getByRole('button', { name: 'Top', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recent', exact: true })).toBeVisible();
  });

  test('should render roster card from API response', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    await expect(page.getByText('Optimized SS Roster')).toBeVisible();
    await expect(page.getByText('SS').first()).toBeVisible();
    await expect(page.getByText('A great Sunspire roster for score pushing.')).toBeVisible();
    await expect(page.getByText(/TestPlayer/)).toBeVisible();
    await expect(page.getByText('42')).toBeVisible();
    await expect(page.getByText('score-push').first()).toBeVisible();
  });

  test('should show upvote button (disabled for unauthenticated users)', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    const voteButton = page.getByRole('button', { name: /vote/i }).first();
    await expect(voteButton).toBeVisible();
    await expect(voteButton).toBeDisabled();
  });

  test('should navigate to a populated read-only view when a card is clicked', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    await page.getByRole('button', { name: /View Optimized SS Roster/i }).click();

    await expect(page).toHaveURL(/\/rv\?id=test-roster-1$/);
    await expect(page.getByRole('heading', { name: 'Optimized SS Roster' })).toBeVisible();
    await expect(page.getByText('Roster (Read-Only)')).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root:visible')).toHaveCount(0);
  });

  test('should show Edit Roster button in the populated read-only view', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    await page.getByRole('button', { name: /View Optimized SS Roster/i }).click();
    await expect(page.getByRole('heading', { name: 'Optimized SS Roster' })).toBeVisible();

    const editButton = page.getByRole('button', { name: /Edit Roster/i });
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
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

    await openRosterHub(page);

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

    await openRosterHub(page, 'Roster 0');

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

    await openRosterHub(page);

    // Register the request assertion before changing the select so the event is never missed.
    // Keyboard selection avoids the cookie dialog backdrop obscuring lower menu options.
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('trial=SS')),
      (async () => {
        const trialSelect = page.getByRole('combobox').first();
        await trialSelect.click();
        await trialSelect.press('End');
        await trialSelect.press('Enter');
      })(),
    ]);

    expect(req.url()).toContain('trial=SS');
  });

  test('should show info alert to log in for unauthenticated users', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);

    await expect(page.getByText(/Log in with your ESO Logs account to vote/i)).toBeVisible();
  });

  test('should not show Publish button when not logged in', async ({ page }) => {
    const response = await page.goto('/roster-builder', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/roster-builder(?:[/?#]|$)/);
    await expect(page.getByRole('heading', { name: 'Roster Builder' })).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root:visible')).toHaveCount(0);

    const publishButton = page.getByRole('button', { name: /Publish/i }).first();
    await expect(publishButton).not.toBeVisible();
  });

  test('should be accessible at /roster-hub route', async ({ page }) => {
    await openRosterHub(page, MOCK_ROSTER.title);
  });
});
