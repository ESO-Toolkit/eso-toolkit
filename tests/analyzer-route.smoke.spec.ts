import { expect, test } from '@playwright/test';

import { openPopulatedAnalyzer } from './utils/analyzer-route-fixture';

test('loads a populated Analyzer history route', async ({ page }) => {
  expect(await openPopulatedAnalyzer(page)).toEqual([]);
});
