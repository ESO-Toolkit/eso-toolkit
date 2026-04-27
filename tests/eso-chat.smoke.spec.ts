import { expect, test } from '@playwright/test';

test.describe('ESO AI Chat', () => {
  test('chat page loads with empty state', async ({ page }) => {
    await page.goto('/chat');

    await expect(page.getByText('ESO AI Chat')).toBeVisible();
    await expect(page.getByText('Ask me about ESO builds')).toBeVisible();

    await expect(page.getByPlaceholder(/Ask about ESO builds/)).toBeVisible();
  });

  test('suggestion buttons are visible', async ({ page }) => {
    await page.goto('/chat');

    await expect(
      page.getByRole('button', { name: /best weapon traits for a DPS build/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /difference between Nirnhoned and Precise/i }),
    ).toBeVisible();
  });

  test('input accepts text and shows send button', async ({ page }) => {
    await page.goto('/chat');

    const input = page.getByPlaceholder(/Ask about ESO builds/);
    await input.fill('test message');

    await expect(input).toHaveValue('test message');
  });
});
