import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BASE_URL, devWebServer, getDevServerPort } from '../../tests/utils/playwright-shared';

const playwrightArtifactWatchIgnores = [
  '**/test-results/**',
  '**/test-results-*/**',
  '**/playwright-report/**',
  '**/playwright-report-*/**',
];

describe('full Playwright suite configuration', () => {
  it('pins the dev server to the same port Playwright probes', () => {
    expect(getDevServerPort('http://localhost:3002')).toBe('3002');
    expect(getDevServerPort('https://example.test')).toBe('443');
    expect(devWebServer).toMatchObject({
      url: BASE_URL,
      env: { PORT: getDevServerPort(BASE_URL), STRICT_PORT: 'true' },
    });
  });

  it("keeps every Playwright artifact directory out of Vite's watcher", () => {
    const viteConfig = readFileSync(path.join(process.cwd(), 'vite.config.mjs'), 'utf8');

    expect(viteConfig).toMatch(/watch:\s*{\s*ignored:\s*PLAYWRIGHT_ARTIFACT_WATCH_IGNORES,\s*}/);
    playwrightArtifactWatchIgnores.forEach((artifactPath) => {
      expect(viteConfig).toContain(artifactPath);
    });
  });

  it('discovers Chromium, Firefox, and WebKit in the full suite', () => {
    const playwrightCli = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
    const playwrightEnvironment = { ...process.env };
    delete playwrightEnvironment.JEST_WORKER_ID;
    const listedTests = execFileSync(
      process.execPath,
      [playwrightCli, 'test', '--config=playwright/full.config.ts', '--list'],
      { cwd: process.cwd(), encoding: 'utf8', env: playwrightEnvironment },
    );

    expect(listedTests).toContain('[chromium]');
    expect(listedTests).toContain('[firefox]');
    expect(listedTests).toContain('[webkit]');
    expect(listedTests).not.toContain('build-editor-mobile.spec.ts');
  });

  it('keeps live-dashboard health navigation bound to the suite base URL', () => {
    const liveDashboardHealthSpec = readFileSync(
      path.join(process.cwd(), 'tests', 'live-dashboard-health.spec.ts'),
      'utf8',
    );

    expect(liveDashboardHealthSpec).toContain('page.goto(`/report/${REPORT_CODE}/dashboard`)');
    expect(liveDashboardHealthSpec).not.toMatch(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
  });

  it('keeps the mobile build-editor suite in its dedicated mobile matrix', () => {
    const playwrightCli = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
    const playwrightEnvironment = { ...process.env };
    delete playwrightEnvironment.JEST_WORKER_ID;
    const listedTests = execFileSync(
      process.execPath,
      [playwrightCli, 'test', '--config=playwright/mobile.config.ts', '--list'],
      { cwd: process.cwd(), encoding: 'utf8', env: playwrightEnvironment },
    );

    expect(listedTests).toContain('build-editor-mobile.spec.ts');
    expect(listedTests).toContain('[mobile-chrome]');
    expect(listedTests).toContain('[mobile-chrome-perf-low]');
  });
});
