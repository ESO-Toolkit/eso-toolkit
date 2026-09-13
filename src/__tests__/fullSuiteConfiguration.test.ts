import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const playwrightArtifactWatchIgnores = [
  '**/test-results/**',
  '**/test-results-*/**',
  '**/playwright-report/**',
  '**/playwright-report-*/**',
];

describe('full Playwright suite configuration', () => {
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
  });
});
