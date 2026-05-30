/**
 * Guard: every `icon:` in the skill-line data must resolve to a real ESO icon.
 *
 * Regression origin: the Magma Fist skill referenced
 * `ability_dragonknight_013_stonefist_b`, which exists in neither bundled icon
 * dataset and 403s on the rpglogs CDN, so the skill rendered with no icon.
 * abilities.json maps its ability ids (31816 / 133027) to
 * `ability_dragonknight_013_a`.
 *
 * This test runs scripts/check-skill-line-icons.cjs — the same offline
 * validator usable standalone in CI — and asserts a clean exit, so the script
 * and this guard can never drift apart.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('skill-line icons', () => {
  it('all skill-line icons resolve to a known game icon', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const script = path.join(repoRoot, 'scripts', 'check-skill-line-icons.cjs');

    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      // Surface the validator's report (lists each offending icon + location).
      throw new Error(
        `Skill-line icon validator failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`,
      );
    }

    expect(result.status).toBe(0);
  });
});
