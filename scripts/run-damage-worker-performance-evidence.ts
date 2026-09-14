/**
 * Produces the reproducible post-worker evidence for the supported damage-event caps.
 *
 * Run:
 *   npm run script -- scripts/run-damage-worker-performance-evidence.ts
 *
 * The command deliberately builds first, then captures calculation-core CPU/memory and
 * bundle evidence, then runs the real-worker browser probe on a populated Calculator route.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function run(command: string, args: string[], windowsShell = false): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    // Windows executes npm through its .cmd shim, which requires a shell.
    shell: windowsShell && process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status ?? 'unknown'}.`,
    );
  }
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

run(npmCommand, ['run', 'build'], true);
run(
  npmCommand,
  ['run', 'script', '--', 'scripts/benchmark-damage-statistics-worker.ts', '--require-build'],
  true,
);
run(process.execPath, [
  join(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js'),
  'test',
  '--config=playwright/performance.config.ts',
  '--project=desktop-performance',
  '--grep',
  'records reproducible worker evidence',
  '--reporter=line',
]);
